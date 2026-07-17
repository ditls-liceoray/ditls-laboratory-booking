'use client';

import { supabase } from '@/lib/supabase/client';
import { logActivity, createNotification, formatTime, formatDate, fullName } from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/types';
import { toast } from 'sonner';

export async function updateBookingStatus(
  booking: Booking,
  status: BookingStatus,
  adminNotes?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status, admin_notes: adminNotes ?? null })
    .eq('id', booking.id);
  if (error) {
    toast.error('Failed to update booking: ' + error.message);
    return false;
  }

  // Notify the teacher
  if (booking.teacher?.profile_id) {
    const messages: Record<string, { title: string; message: string; type: 'success' | 'warning' | 'error' | 'info' }> = {
      approved: { title: 'Booking Approved', message: `Your booking ${booking.reference_no} has been approved.`, type: 'success' },
      rejected: { title: 'Booking Rejected', message: `Your booking ${booking.reference_no} has been rejected.`, type: 'error' },
      completed: { title: 'Booking Completed', message: `Your booking ${booking.reference_no} has been marked completed.`, type: 'info' },
      cancelled: { title: 'Booking Cancelled', message: `Your booking ${booking.reference_no} has been cancelled.`, type: 'warning' },
    };
    const m = messages[status];
    if (m) {
      await createNotification(booking.teacher.profile_id, m.title, m.message, m.type, booking.id);
    }
  }

  await logActivity(`${status}_booking`, `Booking ${booking.reference_no} marked as ${status}`);
  toast.success(`Booking ${status} successfully.`);
  return true;
}

export function BookingDetails({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Booking Details</h2>
              <p className="text-sm text-muted-foreground font-mono">{booking.reference_no}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Teacher" value={booking.teacher ? fullName(booking.teacher) : '—'} />
            <Detail label="Department" value={booking.teacher?.department || '—'} />
            <Detail label="Class Name" value={booking.class_name} />
            <Detail label="Subject" value={booking.subject} />
            <Detail label="Course" value={booking.course || '—'} />
            <Detail label="Year / Section" value={`${booking.year_level || '—'} / ${booking.section || '—'}`} />
            <Detail label="Laboratory" value={booking.laboratory?.name || '—'} />
            <Detail label="Location" value={booking.laboratory?.location || '—'} />
            <Detail label="Date" value={formatDate(booking.booking_date)} />
            <Detail label="Time" value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`} />
            <Detail label="Expected Students" value={String(booking.expected_students)} />
            <Detail label="Status" value={booking.status} />
            <Detail label="Purpose" value={booking.purpose} />
            <Detail label="Equipment" value={booking.equipment_needed || '—'} />
            <div className="col-span-2">
              <Detail label="Description" value={booking.description || '—'} />
            </div>
            <div className="col-span-2">
              <Detail label="Remarks" value={booking.remarks || '—'} />
            </div>
            {booking.admin_notes && (
              <div className="col-span-2">
                <Detail label="Admin Notes" value={booking.admin_notes} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5 capitalize">{value}</p>
    </div>
  );
}
