'use client';

import { useEffect, useState, FormEvent } from 'react';
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
import { Loader2, Save, X, RotateCcw, Calendar, Clock, Monitor, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function BookLaboratoryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { teacher } = useAuth();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const [form, setForm] = useState({
    class_name: '', subject: '', course: COURSES[0], year_level: YEAR_LEVELS[0], section: '',
    laboratory_id: '', purpose: '', description: '', booking_date: '', start_time: '08:00', end_time: '09:00',
    expected_students: 30, equipment_needed: '', remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Check for conflicts on the fly
  useEffect(() => {
    if (!form.laboratory_id || !form.booking_date || !form.start_time || !form.end_time) {
      setConflict(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('reference_no, start_time, end_time')
        .eq('laboratory_id', form.laboratory_id)
        .eq('booking_date', form.booking_date)
        .in('status', ['pending', 'approved'])
        .lt('start_time', form.end_time)
        .gt('end_time', form.start_time);
      if (data && data.length > 0) {
        setConflict(`Conflict detected: ${data.length} booking(s) already exist for this time slot.`);
      } else {
        setConflict(null);
      }
    })();
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
    if (form.expected_students < 1) e.expected_students = 'Must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix the errors.'); return; }
    if (conflict) { toast.error('Schedule conflict detected. Please choose a different time.'); return; }
    if (!teacher) { toast.error('Teacher profile not found.'); return; }

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

      if (error) throw error;

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
    }
  };

  const reset = () => {
    setForm({ class_name: '', subject: '', course: COURSES[0], year_level: YEAR_LEVELS[0], section: '', laboratory_id: labs[0]?.id || '', purpose: '', description: '', booking_date: '', start_time: '08:00', end_time: '09:00', expected_students: 30, equipment_needed: '', remarks: '' });
    setErrors({});
    setConflict(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Book Laboratory</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit a new laboratory booking request</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}><X className="h-4 w-4 mr-2" /> Cancel</Button>
          <Button type="button" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
          <Button type="submit" disabled={submitting || !!conflict}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Submit Booking
          </Button>
        </div>
      </div>

      {/* Teacher info (auto-filled) */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Teacher Information</CardTitle><CardDescription>Auto-filled from your profile</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Teacher Name</Label>
              <Input value={teacher ? fullName(teacher) : ''} disabled />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={teacher?.department || ''} disabled />
            </div>
            <div>
              <Label>Teacher ID</Label>
              <Input value={teacher?.teacher_id || ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Class Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class Name <span className="text-rose-500">*</span></Label>
              <Input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. CS101 - Intro to Programming" />
              {errors.class_name && <p className="text-xs text-rose-500">{errors.class_name}</p>}
            </div>  
            <div className="space-y-2">
              <Label>Subject <span className="text-rose-500">*</span></Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Data Structures" />
              {errors.subject && <p className="text-xs text-rose-500">{errors.subject}</p>}
            </div>
            <div className="space-y-2">
              <Label>Strand</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Year Level</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })}>
                {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
            </div>
            <div className="space-y-2">
              <Label>Laboratory <span className="text-rose-500">*</span></Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.laboratory_id} onChange={(e) => setForm({ ...form, laboratory_id: e.target.value })}>
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Booking Date <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" className="pl-10" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} min={new Date().toISOString().slice(0, 10)} />
              </div>
              {errors.booking_date && <p className="text-xs text-rose-500">{errors.booking_date}</p>}
            </div>
            <div className="space-y-2">
              <Label>Start Time <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" className="pl-10" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              {errors.start_time && <p className="text-xs text-rose-500">{errors.start_time}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Time <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" className="pl-10" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purpose <span className="text-rose-500">*</span></Label>
              <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Laboratory exercise, exam, project" />
              {errors.purpose && <p className="text-xs text-rose-500">{errors.purpose}</p>}
            </div>
            <div className="space-y-2">
              <Label>Expected Number of Students</Label>
              <Input type="number" min={1} value={form.expected_students} onChange={(e) => setForm({ ...form, expected_students: parseInt(e.target.value) || 1 })} />
              {errors.expected_students && <p className="text-xs text-rose-500">{errors.expected_students}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Equipment Needed</Label>
              <Input value={form.equipment_needed} onChange={(e) => setForm({ ...form, equipment_needed: e.target.value })} placeholder={`Available: ${EQUIPMENT_OPTIONS.join(', ')}`} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details about the booking..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Any special requests or remarks..." />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
