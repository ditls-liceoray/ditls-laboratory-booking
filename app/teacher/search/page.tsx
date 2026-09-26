'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchLaboratories, formatTime, formatDate } from '@/lib/api';
import type { Laboratory, Booking } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge } from '@/components/shared';
import { LaboratorySchedule } from '@/components/booking-actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Monitor,
  MapPin,
  Users,
  Plus,
  Calendar,
  Clock,
} from 'lucide-react';
import { LiceoLoader } from '@/components/ui/liceo-loader';
import { cn } from '@/lib/utils';

export default function SearchClassPage() {
  const router = useRouter();

  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [labFilter, setLabFilter] = useState('all');
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const [settings, setSettings] = useState({
    booking_start_hour: '07:00',
    booking_end_hour: '22:00',
    time_slot_interval_minutes: '30',
  });

  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Cross-faculty schedule data loaded through the SECURITY DEFINER RPC.
  const [scheduleData, setScheduleData] = useState<Booking[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Request ID for race condition protection when loading schedules for date change
  const scheduleRequestId = useRef(0);

  // Fetch booking policy settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'booking_start_hour',
          'booking_end_hour',
          'time_slot_interval_minutes',
        ]);

      if (data) {
        const s: Record<string, string> = {};

        data.forEach((item) => {
          s[item.key] = item.value;
        });

        setSettings((prev) => ({
          ...prev,
          ...s,
        }));
      }
    })();
  }, []);

  // Load laboratories and the current teacher's own bookings.
  // The own-bookings query remains unchanged because the RPC is used
  // specifically for cross-faculty schedule visibility.
  const load = useCallback(async () => {
    setLoading(true);

    const [l, { data: b }] = await Promise.all([
      fetchLaboratories(),
      supabase
        .from('bookings')
        .select(
          `*, laboratory:laboratories(*), teacher:teachers(*)`
        )
        .order('booking_date', { ascending: true }),
    ]);

    setLabs(l);
    setBookings((b || []) as unknown as Booking[]);
    setLoading(false);
  }, []);

useEffect(() => {
    load();
  }, [load]);

  // Load the selected laboratory's schedule for the selected date.
  // This RPC returns pending/approved bookings from ALL faculty,
  // regardless of the currently logged-in teacher.
  const loadLabSchedule = useCallback(
    async (laboratoryId: string, date: string, requestId?: number) => {
      if (!laboratoryId || !date) {
        setScheduleData([]);
        return;
      }

      setScheduleLoading(true);

      const currentRequestId = requestId ?? scheduleRequestId.current;

      const { data, error } = await supabase.rpc('get_lab_schedule', {
        p_laboratory_id: laboratoryId,
        p_booking_date: date,
      });

      // Ignore stale responses
      if (requestId !== undefined && currentRequestId !== scheduleRequestId.current) {
        return;
      }

      if (error) {
        console.error('Failed to load laboratory schedule:', error);
        setScheduleData((prev) => {
          // Only clear if this was the latest request
          if (requestId === undefined || currentRequestId === scheduleRequestId.current) {
            return [];
          }
          return prev;
        });
      } else {
        const newData = (data || []) as unknown as Booking[];
        setScheduleData((prev) => {
          // Only update if this is the latest request
          if (requestId !== undefined && currentRequestId !== scheduleRequestId.current) {
            return prev;
          }
          // For single lab loading (openLaboratorySchedule), replace the data
          if (requestId === undefined) {
            return newData;
          }
          // For date-change loading, merge with existing data
          const existingIds = new Set(prev.map((b) => b.id));
          const merged = [...prev, ...newData.filter((b) => !existingIds.has(b.id))];
          return merged;
        });
      }

      setScheduleLoading(false);
    },
    []
  );

  // Build availability: for each lab, show available slots.
  const availableLabs = useMemo(() => {
    let result = labs.filter((l) => l.is_active && l.status === 'available');

    if (search) {
      const q = search.toLowerCase();

      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.location || '').toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q)
      );
    }

    if (labFilter !== 'all') {
      result = result.filter((l) => l.id === labFilter);
    }

    return result;
  }, [labs, search, labFilter]);

  // Show booked slots for the selected date.
  //
  // IMPORTANT:
  // scheduleData contains cross-faculty bookings for the selected
  // laboratory/date. bookings remains the fallback for the normal
  // current-teacher booking query.
  const bookedSlots = useMemo(() => {
    // When dateFilter is set, prefer scheduleData (cross-faculty),
    // but fall back to bookings (own bookings) if scheduleData is empty
    const source = dateFilter
      ? (scheduleData.length > 0 ? scheduleData : bookings)
      : bookings;

    let result = [...source];

    if (dateFilter) {
      result = result.filter(
        (b) => b.booking_date === dateFilter
      );
    } else {
      result = result.filter(
        (b) =>
          b.booking_date >=
          new Date().toISOString().slice(0, 10)
      );
    }

    return result.filter(
      (b) =>
        b.status === 'approved' ||
        b.status === 'pending'
    );
  }, [bookings, scheduleData, dateFilter]);

  // Generate available time slots for a lab on a given date.
  const getAvailableSlots = useCallback(
    (labId: string, date: string) => {
      const labBookings = bookedSlots.filter(
        (b) =>
          b.laboratory_id === labId &&
          b.booking_date === date
      );

      const slots: {
        start: string;
        end: string;
        available: boolean;
      }[] = [];

      const startHour = parseInt(
        settings.booking_start_hour.split(':')[0],
        10
      );

      const endHour = parseInt(
        settings.booking_end_hour.split(':')[0],
        10
      );

      const interval = parseInt(
        settings.time_slot_interval_minutes,
        10
      );

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += interval) {
          const startTime = `${String(hour).padStart(
            2,
            '0'
          )}:${String(min).padStart(2, '0')}`;

          const endTime =
            min + interval < 60
              ? `${String(hour).padStart(
                2,
                '0'
              )}:${String(min + interval).padStart(
                2,
                '0'
              )}`
              : `${String(hour + 1).padStart(
                2,
                '0'
              )}:${String(
                min + interval - 60
              ).padStart(2, '0')}`;

          if (
            parseInt(endTime.split(':')[0], 10) >
            endHour
          ) {
            continue;
          }

          const hasConflict = labBookings.some(
            (b) =>
              b.start_time < endTime &&
              startTime < b.end_time
          );

          slots.push({
            start: startTime,
            end: endTime,
            available: !hasConflict,
          });
        }
      }

      return slots;
    },
    [bookedSlots, settings]
  );

  // Reload schedules for all visible labs when dateFilter changes
  useEffect(() => {
    if (!dateFilter) {
      setScheduleData([]);
      return;
    }

    const currentRequestId = ++scheduleRequestId.current;
    setScheduleData([]);
    setScheduleLoading(true);

    // Load schedules for all currently visible labs
    const labsToLoad = availableLabs;

    if (labsToLoad.length === 0) {
      setScheduleLoading(false);
      return;
    }

    // Fire all requests simultaneously
    const promises = labsToLoad.map((lab) =>
      loadLabSchedule(lab.id, dateFilter, currentRequestId)
    );

    // Wait for all to complete (or fail)
    Promise.allSettled(promises).then((results) => {
      // Only update loading state if this is still the latest request
      if (currentRequestId === scheduleRequestId.current) {
        setScheduleLoading(false);
      }
    });

    return () => {
      // Cleanup on date change - next effect will increment requestId
    };
  }, [dateFilter, availableLabs, loadLabSchedule]);

  const totalPages = Math.ceil(
    availableLabs.length / pageSize
  );

  const paged = availableLabs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Open the selected laboratory schedule.
  const openLaboratorySchedule = async (
    lab: Laboratory
  ) => {
    setSelectedLab(lab);
    setScheduleOpen(true);

    if (dateFilter) {
      await loadLabSchedule(lab.id, dateFilter);
    } else {
      setScheduleData([]);
    }
  };

  return (
    <main
      id="main-content"
      className="container-responsive space-y-6"
      role="main"
    >
      <PageHeader
        title="Search Class"
        description="Find available laboratories and book a slot"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Search by lab name, location, or description..."
                className="pl-10 input-responsive"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm input-responsive"
              value={labFilter}
              onChange={(e) => {
                setLabFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Laboratories</option>

              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <Input
              type="date"
              className="w-full sm:w-44 input-responsive"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setScheduleData([]);
              }}
            />
          </div>

          {dateFilter && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Calendar className="h-4 w-4" />

                Showing availability for{' '}
                {formatDate(dateFilter)}
              </p>

              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Green = Available &nbsp;

                <span className="inline-block w-3 h-3 rounded bg-emerald-500"></span>

                &nbsp; Red = Booked &nbsp;

                <span className="inline-block w-3 h-3 rounded bg-rose-500"></span>
              </p>
            </div>
          )}

          {loading ? (
            <LiceoLoader size="lg" fullScreen />
          ) : paged.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title="No laboratories found"
              description="Try adjusting your search filters."
            />
          ) : (
            <>
              <div className="card-grid gap-4">
                {paged.map((lab) => {
                  const labBookings = bookedSlots.filter(
                    (b) => b.laboratory_id === lab.id
                  );

                  const availableSlots = dateFilter
                    ? getAvailableSlots(
                      lab.id,
                      dateFilter
                    )
                    : [];

                  return (
                    <Card
                      key={lab.id}
                      className="hover:shadow-lg transition-shadow animate-slide-up cursor-pointer"
                      onClick={() =>
                        openLaboratorySchedule(lab)
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' ||
                          e.key === ' '
                        ) {
                          e.preventDefault();
                          openLaboratorySchedule(lab);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View schedule for ${lab.name}`}
                    >
                      <CardContent className="card-responsive">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Monitor className="h-5 w-5 text-primary" />
                          </div>

                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              lab.status === 'available'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {lab.status}
                          </span>
                        </div>

                        <h3 className="font-semibold">
                          {lab.name}
                        </h3>

                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />

                            {lab.location || '—'}
                          </p>

                          <p className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />

                            Capacity: {lab.capacity}
                          </p>
                        </div>

                        {lab.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {lab.description}
                          </p>
                        )}

                        {dateFilter &&
                          availableSlots.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />

                                Available time slots on{' '}
                                {formatDate(dateFilter)}:
                              </p>

                              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {availableSlots.map(
                                  (slot) => (
                                    <span
                                      key={`${slot.start}-${slot.end}`}
                                      className={cn(
                                        'px-3 py-2 text-sm rounded font-medium transition-colors touch-target min-h-[44px] min-w-[44px] flex items-center',
                                        slot.available
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 cursor-pointer hover:bg-emerald-200'
                                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 cursor-not-allowed'
                                      )}
                                    >
                                      {formatTime(
                                        slot.start
                                      )}{' '}
                                      -{' '}
                                      {formatTime(
                                        slot.end
                                      )}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {labBookings.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Booked slots
                              {dateFilter
                                ? ` on ${formatDate(
                                  dateFilter
                                )}`
                                : ''}
                              :
                            </p>

                            <div className="space-y-1">
                              {labBookings
                                .slice(0, 3)
                                .map((b) => (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span>
                                      {formatTime(
                                        b.start_time
                                      )}{' '}
                                      -{' '}
                                      {formatTime(
                                        b.end_time
                                      )}
                                    </span>

                                    <StatusBadge
                                      status={b.status}
                                    />
                                  </div>
                                ))}

                              {labBookings.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +
                                  {labBookings.length -
                                    3}{' '}
                                  more
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full mt-3 btn-responsive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();

                            router.push(
                              `/teacher/book?lab=${lab.id}`
                            );
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />

                          Book This Lab
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {scheduleOpen && selectedLab && (
        <LaboratorySchedule
          laboratory={selectedLab}
          bookings={scheduleData}
          dateFilter={dateFilter}
          onClose={() => {
            setScheduleOpen(false);
            setSelectedLab(null);
            setScheduleData([]);
          }}
        />
      )}
    </main>
  );
}
