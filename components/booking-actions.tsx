'use client';

import { supabase } from '@/lib/supabase/client';
import {
  logActivity,
  createNotification,
  formatTime,
  formatDate,
  fullName,
} from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/types';
import { toast } from 'sonner';
import { Calendar, Clock, User, BookOpen, X } from 'lucide-react';
import { StatusBadge } from '@/components/shared';

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
    // Handle database trigger errors with user-friendly messages
    if (
      error.message.includes('Schedule conflict') ||
      error.code === 'P0001'
    ) {
      toast.error(
        'This booking cannot be approved: the laboratory now has a conflicting booking for this time slot.',
      );
    } else if (
      error.message.includes('Invalid status transition') ||
      error.message.includes('Teachers can only cancel') ||
      error.message.includes('Unauthorized status transition')
    ) {
      toast.error('This status change is not allowed.');
    } else if (
      error.message.includes(
        'Booking duration is below the minimum allowed',
      )
    ) {
      toast.error(
        'Booking duration is below the minimum allowed. Please check the booking policy settings.',
      );
    } else if (
      error.message.includes(
        'Booking duration exceeds the maximum allowed',
      )
    ) {
      toast.error(
        'Booking duration exceeds the maximum allowed. Please check the booking policy settings.',
      );
    } else if (
      error.message.includes(
        'Booking start time is before the allowed laboratory opening hour',
      )
    ) {
      toast.error(
        'Booking start time is before the allowed laboratory opening hour. Please check the booking policy settings.',
      );
    } else if (
      error.message.includes(
        'Booking end time is after the allowed laboratory closing hour',
      )
    ) {
      toast.error(
        'Booking end time is after the allowed laboratory closing hour. Please check the booking policy settings.',
      );
    } else if (
      error.message.includes(
        'Booking start time must align with the configured time slot interval',
      ) ||
      error.message.includes(
        'Booking end time must align with the configured time slot interval',
      )
    ) {
      toast.error(
        'Booking time must align with the configured time slot interval. Please check the booking policy settings.',
      );
    } else {
      toast.error('Failed to update booking: ' + error.message);
    }

    return false;
  }

  // Notify the teacher
  if (booking.teacher?.profile_id) {
    const messages: Record<
      string,
      {
        title: string;
        message: string;
        type: 'success' | 'warning' | 'error' | 'info';
      }
    > = {
      approved: {
        title: 'Booking Approved',
        message: `Your booking ${ booking.reference_no } has been approved.`,
        type: 'success',
      },
      rejected: {
        title: 'Booking Rejected',
        message: `Your booking ${ booking.reference_no } has been rejected.`,
        type: 'error',
      },
      completed: {
        title: 'Booking Completed',
        message: `Your booking ${ booking.reference_no } has been marked completed.`,
        type: 'info',
      },
      cancelled: {
        title: 'Booking Cancelled',
        message: `Your booking ${ booking.reference_no } has been cancelled.`,
        type: 'warning',
      },
    };

    const m = messages[status];

    if (m) {
      await createNotification(
        booking.teacher.profile_id,
        m.title,
        m.message,
        m.type,
        booking.id,
      );
    }
  }

  await logActivity(
    `${ status } _booking`,
    `Booking ${ booking.reference_no } marked as ${ status } `,
  );

  toast.success(`Booking ${ status } successfully.`);

  return true;
}

export function BookingDetails({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Booking Details</h2>

              <p className="text-sm text-muted-foreground font-mono">
                {booking.reference_no}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-accent"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail
              label="Teacher"
              value={
                booking.teacher
                  ? fullName(booking.teacher)
                  : '—'
              }
            />

            <Detail
              label="Department"
              value={booking.teacher?.department || '—'}
            />

            <Detail
              label="Class Name"
              value={booking.class_name}
            />

            <Detail
              label="Subject"
              value={booking.subject}
            />

            <Detail
              label="Strand"
              value={booking.course || '—'}
            />

            <Detail
              label="Year / Section"
              value={`${ booking.year_level || '—' } / ${
booking.section || '—'
              }`}
            />

            <Detail
              label="Laboratory"
              value={booking.laboratory?.name || '—'}
            />

            <Detail
              label="Location"
              value={booking.laboratory?.location || '—'}
            />

            <Detail
              label="Date"
              value={formatDate(booking.booking_date)}
            />

            <Detail
              label="Time"
              value={`${
  formatTime(
    booking.start_time,
  )
} - ${ formatTime(booking.end_time) } `}
            />

            <Detail
              label="Expected Students"
              value={String(booking.expected_students)}
            />

            <Detail
              label="Status"
              value={booking.status}
            />

            <Detail
              label="Purpose"
              value={booking.purpose}
            />

            <Detail
              label="Equipment"
              value={booking.equipment_needed || '—'}
            />

            <div className="col-span-2">
              <Detail
                label="Description"
                value={booking.description || '—'}
              />
            </div>

            <div className="col-span-2">
              <Detail
                label="Remarks"
                value={booking.remarks || '—'}
              />
            </div>

            {booking.admin_notes && (
              <div className="col-span-2">
                <Detail
                  label="Admin Notes"
                  value={booking.admin_notes}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>

      <p className="text-sm font-medium mt-0.5 capitalize">
        {value}
      </p>
    </div>
  );
}

export function LaboratorySchedule({
  laboratory,
  bookings,
  dateFilter,
  onClose,
}: {
  laboratory: {
    id: string;
    name: string;
    location?: string | null;
  };
  bookings: Booking[];
  dateFilter: string;
  onClose: () => void;
}) {
  /*
   * IMPORTANT:
   *
   * When this component receives data from the
   * get_lab_schedule SECURITY DEFINER RPC, the RPC already
   * filters by:
   *
   *   laboratory_id
   *   booking_date
   *   pending / approved
   *
   * The RPC intentionally returns teacher_display_name instead
   * of the full teacher object.
   *
   * Therefore, do not filter using:
   *
   *   b.laboratory_id === laboratory.id
   *
   * because laboratory_id is not part of the RPC return shape.
   */

  const labBookings = bookings.filter((b) => {
    const matchesDate = dateFilter
      ? b.booking_date === dateFilter
      : true;

    const validStatus =
      b.status === 'approved' ||
      b.status === 'pending';

    return matchesDate && validStatus;
  });

  // Sort bookings by start time
  labBookings.sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                Laboratory Schedule
              </h2>

              <p className="text-sm text-muted-foreground">
                {laboratory.name}
              </p>

              {laboratory.location && (
                <p className="text-xs text-muted-foreground">
                  {laboratory.location}
                </p>
              )}

              {dateFilter && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Showing bookings for{' '}
                  {formatDate(dateFilter)}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded hover:bg-accent touch-target"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {labBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />

              <p className="text-muted-foreground">
                No bookings for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {labBookings.map((b) => {
                /*
                 * Cross-faculty RPC returns teacher_display_name.
                 * Normal booking queries may still return teacher.
                 *
                 * Prefer teacher_display_name when available,
                 * otherwise fall back to the existing teacher object.
                 */
                const teacherDisplayName =
                  (
                    b as Booking & {
                      teacher_display_name?: string | null;
                    }
                  ).teacher_display_name ||
                  (b.teacher ? fullName(b.teacher) : '—');

                return (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />

                        <p className="font-medium text-sm">
                          {teacherDisplayName}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        <BookOpen className="inline h-3.5 w-3.5 mr-1" />

                        {b.class_name || '—'} /{' '}
                        {b.subject || '—'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end sm:justify-center gap-1 text-right sm:text-left">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />

                        <span className="font-medium">
                          {formatDate(b.booking_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />

                        <span className="font-medium">
                          {formatTime(b.start_time)} -{' '}
                          {formatTime(b.end_time)}
                        </span>
                      </div>

                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}