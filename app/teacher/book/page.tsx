'use client';

import { useEffect, useState, FormEvent, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { fetchLaboratories, fullName, logActivity } from '@/lib/api';
import { COURSES, YEAR_LEVELS, EQUIPMENT_OPTIONS } from '@/lib/constants';
import type { Laboratory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, X, RotateCcw, Calendar, Clock, Monitor, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BookLaboratoryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { teacher } = useAuth();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    min_booking_duration_minutes: 30,
    max_booking_duration_hours: 4,
    booking_start_hour: '07:00',
    booking_end_hour: '22:00',
    time_slot_interval_minutes: 30,
  });

  const [form, setForm] = useState({
    class_name: '', subject: '', course: COURSES[0], year_level: YEAR_LEVELS[0], section: '',
    laboratory_id: '', purpose: '', description: '', booking_date: '', start_time: '08:00', end_time: '09:00',
    expected_students: 30, equipment_needed: '', remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showReminder, setShowReminder] = useState(true);
  const conflictCheckId = useRef(0);
  const isSubmittingRef = useRef(false);

  // Fetch booking policy settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('key, value').in('key', [
        'min_booking_duration_minutes',
        'max_booking_duration_hours',
        'booking_start_hour',
        'booking_end_hour',
        'time_slot_interval_minutes',
      ]);
      if (data) {
        const s: Record<string, string> = {};
        data.forEach((item) => { s[item.key] = item.value; });
        setSettings((prev) => ({ ...prev, ...s }));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const l = await fetchLaboratories();
      const available = l.filter((lab) => lab.status === 'available');
      setLabs(available);
      const preselect = params.get('lab');
      if (preselect && available.find((x) => x.id === preselect)) {
        setForm((prev) => ({ ...prev, laboratory_id: preselect }));
      } else if (available[0]) {
        setForm((prev) => ({ ...prev, laboratory_id: available[0].id }));
      }
      setLoading(false);
    })();
  }, [params]);

  // Check for conflicts on the fly (with debounce and race condition protection)
  useEffect(() => {
    if (!form.laboratory_id || !form.booking_date || !form.start_time || !form.end_time) {
      setConflict(null);
      return;
    }
    const currentCheckId = ++conflictCheckId.current;

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc(
        'check_booking_conflict',
        {
          p_laboratory_id: form.laboratory_id,
          p_booking_date: form.booking_date,
          p_start_time: form.start_time,
          p_end_time: form.end_time,
        }
      );

      // Ignore stale responses
      if (currentCheckId !== conflictCheckId.current) return;

      if (error) {
        console.error('Booking conflict check error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setConflict('Unable to verify laboratory availability. Please try again.');
        return;
      }

      if (data) {
        setConflict('Conflict detected: This laboratory is already booked for the selected time.');
      } else {
        setConflict(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.laboratory_id, form.booking_date, form.start_time, form.end_time]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.class_name.trim()) e.class_name = 'Class name is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.laboratory_id) e.laboratory_id = 'Please select a laboratory';
    if (!form.purpose.trim()) e.purpose = 'Purpose is required';
    if (!form.booking_date) e.booking_date = 'Date is required';
    if (!form.start_time) e.start_time = 'Start time is required';
    if (!form.end_time) e.end_time = 'End time is required';
    if (form.start_time >= form.end_time) e.end_time = 'End time must be after start time';

    // Duration validation
    if (form.start_time && form.end_time) {
      const start = new Date(`2000-01-01T${form.start_time}`);
      const end = new Date(`2000-01-01T${form.end_time}`);
      const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      const minDuration = settings.min_booking_duration_minutes;
      const maxDuration = settings.max_booking_duration_hours * 60;

      if (diffMinutes < minDuration) {
        e.end_time = `Minimum booking duration is ${minDuration} minutes`;
      }
      if (diffMinutes > maxDuration) {
        e.end_time = `Maximum booking duration is ${settings.max_booking_duration_hours} hours`;
      }
    }

    // Booking hours validation
    if (form.start_time && form.end_time) {
      const startHour = parseInt(form.start_time.split(':')[0], 10);
      const endHour = parseInt(form.end_time.split(':')[0], 10);
      const bookingStart = parseInt(settings.booking_start_hour.split(':')[0], 10);
      const bookingEnd = parseInt(settings.booking_end_hour.split(':')[0], 10);

      if (startHour < bookingStart || endHour > bookingEnd) {
        e.end_time = `Bookings only allowed between ${settings.booking_start_hour} and ${settings.booking_end_hour}`;
      }
    }

    if (form.expected_students < 1) e.expected_students = 'Must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (isSubmittingRef.current) return;
    if (!validate()) { toast.error('Please fix the errors.'); return; }
    if (conflict) { toast.error('Schedule conflict detected. Please choose a different time.'); return; }
    if (!teacher) { toast.error('Teacher profile not found.'); return; }

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          teacher_id: teacher.id,
          laboratory_id: form.laboratory_id,
          class_name: form.class_name,
          subject: form.subject,
          course: form.course,
          year_level: form.year_level,
          section: form.section || null,
          purpose: form.purpose,
          description: form.description || null,
          booking_date: form.booking_date,
          start_time: form.start_time,
          end_time: form.end_time,
          expected_students: form.expected_students,
          equipment_needed: form.equipment_needed || null,
          remarks: form.remarks || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        // Handle database trigger conflict error
        if (error.message.includes('Schedule conflict') || error.code === 'P0001') {
          throw new Error('This laboratory is no longer available for the selected schedule. Another booking was created for this time.');
        } else if (error.message.includes('Booking duration is below the minimum allowed')) {
          throw new Error('Booking duration is below the minimum allowed. Please check the booking policy settings.');
        } else if (error.message.includes('Booking duration exceeds the maximum allowed')) {
          throw new Error('Booking duration exceeds the maximum allowed. Please check the booking policy settings.');
        } else if (error.message.includes('Booking start time is before the allowed laboratory opening hour')) {
          throw new Error('Booking start time is before the allowed laboratory opening hour. Please check the booking policy settings.');
        } else if (error.message.includes('Booking end time is after the allowed laboratory closing hour')) {
          throw new Error('Booking end time is after the allowed laboratory closing hour. Please check the booking policy settings.');
        } else if (error.message.includes('Booking start time must align with the configured time slot interval') || error.message.includes('Booking end time must align with the configured time slot interval')) {
          throw new Error('Booking time must align with the configured time slot interval. Please check the booking policy settings.');
        }
        throw error;
      }

      // Notify admin
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins) {
        for (const a of admins) {
          await supabase.from('notifications').insert({
            user_id: a.id,
            title: 'New Booking Request',
            message: `${fullName(teacher)} submitted booking ${data.reference_no} for ${form.class_name}.`,
            type: 'info',
            booking_id: data.id,
          });
        }
      }

      await logActivity('create_booking', `Created booking ${data.reference_no}`);
      toast.success('Booking submitted successfully! Awaiting admin approval.');
      router.push('/teacher/appointments');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to submit booking.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const reset = () => {
    setForm({ class_name: '', subject: '', course: COURSES[0], year_level: YEAR_LEVELS[0], section: '', laboratory_id: labs[0]?.id || '', purpose: '', description: '', booking_date: '', start_time: settings.booking_start_hour, end_time: settings.booking_end_hour, expected_students: 30, equipment_needed: '', remarks: '' });
    setErrors({});
    setConflict(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <main id="main-content" className="container-responsive" role="main">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-balance">Book Laboratory</h1>
            <p className="text-muted-foreground text-sm mt-1">Submit a new laboratory booking request</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="btn-responsive w-full sm:w-auto"><X className="h-4 w-4 mr-2" /> Cancel</Button>
            <Button type="button" variant="outline" onClick={reset} className="btn-responsive w-full sm:w-auto"><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
            <Button type="submit" disabled={submitting || !!conflict} className="btn-responsive w-full sm:w-auto h-12 text-lg">
              {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
              Submit Booking
            </Button>
          </div>
        </div>

        {/* Teacher info (auto-filled) */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Teacher Information</CardTitle><CardDescription>Auto-filled from your profile</CardDescription></CardHeader>
          <CardContent className="card-responsive">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>Teacher Name</Label>
                <Input value={teacher ? fullName(teacher) : ''} disabled className="input-responsive" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={teacher?.department || ''} disabled className="input-responsive" />
              </div>
              <div className="space-y-2">
                <Label>Teacher ID</Label>
                <Input value={teacher?.teacher_id || ''} disabled className="input-responsive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Class Information</CardTitle></CardHeader>
          <CardContent className="card-responsive">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>Class Name <span className="text-rose-500">*</span></Label>
                <Input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. CS101 - Intro to Programming" className="input-responsive" />
                {errors.class_name && <p className="text-xs text-rose-500">{errors.class_name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Subject <span className="text-rose-500">*</span></Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Data Structures" className="input-responsive" />
                {errors.subject && <p className="text-xs text-rose-500">{errors.subject}</p>}
              </div>
              <div className="space-y-2">
                <Label>Strand</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm input-responsive" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                  {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Year Level</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm input-responsive" value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })}>
                  {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" className="input-responsive" />
              </div>
              <div className="space-y-2">
                <Label>Laboratory <span className="text-rose-500">*</span></Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm input-responsive" value={form.laboratory_id} onChange={(e) => setForm({ ...form, laboratory_id: e.target.value })}>
                  {labs.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.location || '—'})</option>)}
                </select>
                {errors.laboratory_id && <p className="text-xs text-rose-500">{errors.laboratory_id}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Schedule</CardTitle></CardHeader>
          <CardContent className="card-responsive">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>Booking Date <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-10 input-responsive" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} min={new Date().toISOString().slice(0, 10)} />
                </div>
                {errors.booking_date && <p className="text-xs text-rose-500">{errors.booking_date}</p>}
              </div>
              <div className="space-y-2">
                <Label>Start Time <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    className="pl-10 h-12 text-lg input-responsive"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    step={settings.time_slot_interval_minutes * 60}
                    min={settings.booking_start_hour}
                    max={settings.booking_end_hour}
                    inputMode="numeric"
                  />
                </div>
                {errors.start_time && <p className="text-xs text-rose-500">{errors.start_time}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Time <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    className="pl-10 h-12 text-lg input-responsive"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    step={settings.time_slot_interval_minutes * 60}
                    min={settings.booking_start_hour}
                    max={settings.booking_end_hour}
                    inputMode="numeric"
                  />
                </div>
                {errors.end_time && <p className="text-xs text-rose-500">{errors.end_time}</p>}
              </div>
            </div>

            {conflict && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm animate-fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {conflict}
              </div>
            )}
            {!conflict && form.booking_date && form.start_time && form.end_time && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm animate-fade-in">
                <Monitor className="h-4 w-4 shrink-0" />
                No conflicts detected for this time slot.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Booking Details</CardTitle></CardHeader>
          <CardContent className="card-responsive">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>Purpose <span className="text-rose-500">*</span></Label>
                <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Laboratory exercise, exam, project" className="input-responsive" />
                {errors.purpose && <p className="text-xs text-rose-500">{errors.purpose}</p>}
              </div>
              <div className="space-y-2">
                <Label>Expected Number of Students</Label>
                <Input type="number" min={1} value={form.expected_students} onChange={(e) => setForm({ ...form, expected_students: parseInt(e.target.value) || 1 })} className="input-responsive" />
                {errors.expected_students && <p className="text-xs text-rose-500">{errors.expected_students}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Equipment Needed</Label>
                <Input value={form.equipment_needed} onChange={(e) => setForm({ ...form, equipment_needed: e.target.value })} placeholder={`Available: ${EQUIPMENT_OPTIONS.join(', ')}`} className="input-responsive" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details about the booking..." className="input-responsive min-h-[100px]" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Remarks</Label>
                <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Any special requests or remarks..." className="input-responsive min-h-[100px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Booking Reminder Modal */}
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              Booking Reminder
            </DialogTitle>
          </DialogHeader>
          {/* <DialogDescription className="space-y-4 text-sm leading-relaxed">
            <p className="font-medium">Before submitting a laboratory booking, please make sure that <strong>all required fields are completely filled out</strong> and that the information provided is <strong>correct and accurate</strong>.</p>
            <p className="font-medium">Please carefully check the following:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li><strong>Class Information</strong> – Make sure the class name, subject, strand, year level, and section are correct.</li>
              <li><strong>Laboratory</strong> – Select the correct laboratory where the class will be conducted.</li>
              <li><strong>Date and Time</strong> – Double-check the booking date, start time, and end time.</li>
              <li><strong>Purpose / Activity</strong> – Clearly indicate the activity or purpose of the laboratory booking.</li>
              <li><strong>Additional Details</strong> – Provide any required information or notes that may help the laboratory custodian understand the request.</li>
            </ul>
            <p className="pt-2 border-t border-border">
              <strong className="text-destructive">Important:</strong> Incomplete or incorrect information may cause your booking request to be <strong>returned for correction or delayed for processing</strong>.
            </p>
            <p className="pb-2">
              Before clicking <strong>Submit</strong>, please take a moment to review your booking details and make sure everything is complete.
            </p>
            <p className="text-muted-foreground text-sm">
              Thank you for helping us maintain <strong>accurate, organized, and conflict-free laboratory reservations</strong>.
            </p>
          </DialogDescription> */}

          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-medium">
              Before submitting a laboratory booking, please make sure that{" "}
              <strong>all required fields are completely filled out</strong> and that
              the information provided is <strong>correct and accurate</strong>.
            </p>

            <p className="font-medium">
              Please carefully check the following:
            </p>

            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>
                <strong>Class Information</strong> – Make sure the class name, subject,
                strand, year level, and section are correct.
              </li>

              <li>
                <strong>Laboratory</strong> – Select the correct laboratory where the
                class will be conducted.
              </li>

              <li>
                <strong>Date and Time</strong> – Double-check the booking date, start
                time, and end time.
              </li>

              <li>
                <strong>Purpose / Activity</strong> – Clearly indicate the activity or
                purpose of the laboratory booking.
              </li>

              <li>
                <strong>Additional Details</strong> – Provide any required information
                or notes that may help the laboratory custodian understand the request.
              </li>
            </ul>

            <p className="pt-2 border-t border-border">
              <strong className="text-destructive">Important:</strong> Incomplete or
              incorrect information may cause your booking request to{" "}
              <strong>be returned for correction or delayed for processing</strong>.
            </p>

            <p className="font-semibold">
              <strong>Do not enter or select &quot;None&quot;</strong> for any required
              field during the booking process. Please provide the appropriate and relevant
              information for every required field.
            </p>

            <p className="pb-2">
              Before clicking <strong>Submit</strong>, please take a moment to review
              your booking details and make sure everything is complete.
            </p>

            <p className="text-muted-foreground text-sm">
              Thank you for helping us maintain{" "}
              <strong>
                accurate, organized, and conflict-free laboratory reservations
              </strong>
              .
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowReminder(false)}
              className="w-full sm:w-auto"
            >
              Got it, I understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
