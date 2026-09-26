'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fullName, formatTime } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookingDetails } from '@/components/booking-actions';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Sun,
} from 'lucide-react';
import { LiceoLoader } from '@/components/ui/liceo-loader';
import { cn } from '@/lib/utils';

type View = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [current, setCurrent] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const year = current.getFullYear();
    const month = current.getMonth();

    const start = new Date(year, month - 1, 1)
      .toISOString()
      .slice(0, 10);

    const end = new Date(year, month + 2, 0)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from('bookings')
      .select(`*, teacher:teachers(*), laboratory:laboratories(*)`)
      .gte('booking_date', start)
      .lte('booking_date', end)
      .order('booking_date', { ascending: true });

    if (!error) {
      setBookings((data || []) as unknown as Booking[]);
    }

    setLoading(false);
  }, [current]);

  useEffect(() => {
    load();
  }, [load]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};

    bookings.forEach((b) => {
      const d = b.booking_date;

      if (!map[d]) {
        map[d] = [];
      }

      map[d].push(b);
    });

    return map;
  }, [bookings]);

  const navigate = (dir: number) => {
    const d = new Date(current);

    if (view === 'month') {
      d.setMonth(d.getMonth() + dir);
    } else if (view === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setDate(d.getDate() + dir);
    }

    setCurrent(d);
  };

  const goToToday = () => {
    setCurrent(new Date());
    setView('month');
  };

  const monthDays = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const startWd = first.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startWd; i++) {
      days.push(null);
    }

    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [current]);

  const weekDays = useMemo(() => {
    const start = new Date(current);

    start.setDate(start.getDate() - start.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [current]);

  const dateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const today = new Date();

  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const legend = [
    { color: 'bg-emerald-500', label: 'Approved' },
    { color: 'bg-amber-500', label: 'Pending' },
    { color: 'bg-rose-500', label: 'Rejected' },
    { color: 'bg-primary', label: 'Completed' },
    { color: 'bg-gray-400', label: 'Cancelled' },
  ];

  return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <PageHeader
        title="Booking Calendar"
        description="View all bookings in calendar format"
      >
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto" role="group" aria-label="Calendar view">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                role="tab"
                aria-selected={view === v}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors touch-target',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToToday}
            aria-label="Go to today"
            className="btn-responsive w-full sm:w-auto"
          >
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Today</span>
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Previous"
                className="touch-target"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(1)}
                aria-label="Next"
                className="touch-target"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="btn-responsive"
              >
                <Sun className="mr-1 h-4 w-4" />
                Today
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <h2 className="text-lg font-semibold">
                {view === 'month' &&
                  current.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}

                {view === 'week' &&
                  `Week of ${weekDays[0].toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}`}

                {view === 'day' &&
                  current.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
              </h2>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs" role="group" aria-label="Booking status legend">
                {legend.map((l) => (
                  <span
                    key={l.label}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        l.color
                      )}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <LiceoLoader size="lg" fullScreen />
          ) : view === 'month' ? (
            <div>
              <div className="mb-1 grid grid-cols-7 gap-1" role="row">
                {[
                  'Sun',
                  'Mon',
                  'Tue',
                  'Wed',
                  'Thu',
                  'Fri',
                  'Sat',
                ].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-semibold text-muted-foreground touch-target"
                    role="columnheader"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1" role="grid">
                {monthDays.map((d, i) => {
                  if (!d) {
                    return <div key={i} role="gridcell" />;
                  }

                  const key = dateKey(d);
                  const dayBookings = bookingsByDate[key] || [];

                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-[120px] cursor-pointer rounded-lg border p-1.5 transition-shadow hover:shadow-sm',
                        key === todayKey &&
                        'border-2 border-primary'
                      )}
                      role="gridcell"
                    >
                      <p
                        className={cn(
                          'mb-1 text-xs font-medium',
                          key === todayKey
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {d.getDate()}
                      </p>

                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setSelected(b)}
                            className={cn(
                              'w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] text-white touch-target',
                              {
                                'bg-emerald-500':
                                  b.status === 'approved',
                                'bg-amber-500':
                                  b.status === 'pending',
                                'bg-rose-500':
                                  b.status === 'rejected',
                                'bg-primary':
                                  b.status === 'completed',
                                'bg-gray-400':
                                  b.status === 'cancelled',
                              }
                            )}
                          >
                            {formatTime(b.start_time)} {b.class_name}
                          </button>
                        ))}

                        {dayBookings.length > 3 && (
                          <p className="px-1.5 text-[10px] text-muted-foreground">
                            +{dayBookings.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid">
              {weekDays.map((d) => {
                const key = dateKey(d);
                const dayBookings = bookingsByDate[key] || [];

                return (
                  <div
                    key={key}
                    className={cn(
                      'min-h-40 rounded-lg border p-2',
                      key === todayKey &&
                      'border-2 border-primary'
                    )}
                    role="gridcell"
                  >
                    <p className="mb-2 text-center text-xs font-semibold">
                      {d.toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                      <br />
                      <span className="text-lg">
                        {d.getDate()}
                      </span>
                    </p>

                    <div className="space-y-1">
                      {dayBookings.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setSelected(b)}
                          className={cn(
                            'w-full truncate rounded px-1.5 py-1 text-left text-[10px] text-white touch-target',
                            {
                              'bg-emerald-500':
                                b.status === 'approved',
                              'bg-amber-500':
                                b.status === 'pending',
                              'bg-rose-500':
                                b.status === 'rejected',
                              'bg-primary':
                                b.status === 'completed',
                              'bg-gray-400':
                                b.status === 'cancelled',
                            }
                          )}
                        >
                          {formatTime(b.start_time)} {b.class_name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2" role="list">
              {(bookingsByDate[dateKey(current)] || []).length ===
                0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No bookings"
                  description="There are no bookings for this day."
                />
              ) : (
                (bookingsByDate[dateKey(current)] || []).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-shadow hover:shadow-md touch-target"
                    role="listitem"
                  >
                    <div
                      className={cn(
                        'h-10 w-1.5 rounded-full shrink-0',
                        {
                          'bg-emerald-500':
                            b.status === 'approved',
                          'bg-amber-500':
                            b.status === 'pending',
                          'bg-rose-500':
                            b.status === 'rejected',
                          'bg-primary':
                            b.status === 'completed',
                          'bg-gray-400':
                            b.status === 'cancelled',
                        }
                      )}
                    />

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.class_name} &middot; {b.subject}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {b.laboratory?.name} &middot;{' '}
                        {b.teacher
                          ? fullName(b.teacher)
                          : '—'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {formatTime(b.start_time)} -{' '}
                        {formatTime(b.end_time)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <BookingDetails
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}