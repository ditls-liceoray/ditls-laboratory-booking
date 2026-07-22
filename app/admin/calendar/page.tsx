'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fullName, formatTime } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookingDetails } from '@/components/booking-actions';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Monitor } from 'lucide-react';
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
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 2, 0).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, teacher:teachers(*), laboratory:laboratories(*)`)
      .gte('booking_date', start)
      .lte('booking_date', end)
      .order('booking_date', { ascending: true });
    if (!error) setBookings((data || []) as unknown as Booking[]);
    setLoading(false);
  }, [current]);

  useEffect(() => { load(); }, [load]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const d = b.booking_date;
      if (!map[d]) map[d] = [];
      map[d].push(b);
    });
    return map;
  }, [bookings]);

  const navigate = (dir: number) => {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  };

  const monthDays = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWd = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWd; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
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

  /* const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10); */

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
    { color: 'bg-blue-500', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Booking Calendar" description="View all bookings in calendar format">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(['month', 'week', 'day'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors', view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              {v}
            </button>
          ))}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
            </div>
            <h2 className="text-lg font-semibold">
              {view === 'month' && current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {view === 'week' && `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              {view === 'day' && current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-3 text-xs">
              {legend.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', l.color)} />{l.label}</span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : view === 'month' ? (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const key = dateKey(d);
                  const dayBookings = bookingsByDate[key] || [];
                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-24 rounded-lg border p-1.5 hover:shadow-sm transition-shadow cursor-pointer',
                        key === todayKey && 'border-primary border-2',
                      )}
                    >
                      <p className={cn('text-xs font-medium mb-1', key === todayKey ? 'text-primary' : 'text-muted-foreground')}>{d.getDate()}</p>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setSelected(b)}
                            className={cn('w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate text-white', {
                              'bg-emerald-500': b.status === 'approved',
                              'bg-amber-500': b.status === 'pending',
                              'bg-rose-500': b.status === 'rejected',
                              'bg-blue-500': b.status === 'completed',
                              'bg-gray-400': b.status === 'cancelled',
                            })}
                          >
                            {formatTime(b.start_time)} {b.class_name}
                          </button>
                        ))}
                        {dayBookings.length > 3 && <p className="text-[10px] text-muted-foreground px-1.5">+{dayBookings.length - 3} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const key = dateKey(d);
                const dayBookings = bookingsByDate[key] || [];
                return (
                  <div key={key} className={cn('rounded-lg border p-2 min-h-40', key === todayKey && 'border-primary border-2')}>
                    <p className="text-xs font-semibold text-center mb-2">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}<br />
                      <span className="text-lg">{d.getDate()}</span>
                    </p>
                    <div className="space-y-1">
                      {dayBookings.map((b) => (
                        <button key={b.id} onClick={() => setSelected(b)} className={cn('w-full text-left text-[10px] px-1.5 py-1 rounded text-white truncate', {
                          'bg-emerald-500': b.status === 'approved', 'bg-amber-500': b.status === 'pending',
                          'bg-rose-500': b.status === 'rejected', 'bg-blue-500': b.status === 'completed', 'bg-gray-400': b.status === 'cancelled',
                        })}>
                          {formatTime(b.start_time)} {b.class_name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {(bookingsByDate[dateKey(current)] || []).length === 0 ? (
                <EmptyState icon={Calendar} title="No bookings" description="There are no bookings for this day." />
              ) : (
                (bookingsByDate[dateKey(current)] || []).map((b) => (
                  <button key={b.id} onClick={() => setSelected(b)} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow text-left">
                    <div className={cn('h-10 w-1.5 rounded-full', { 'bg-emerald-500': b.status === 'approved', 'bg-amber-500': b.status === 'pending', 'bg-rose-500': b.status === 'rejected', 'bg-blue-500': b.status === 'completed', 'bg-gray-400': b.status === 'cancelled' })} />
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Monitor className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{b.class_name} &middot; {b.subject}</p>
                      <p className="text-xs text-muted-foreground">{b.laboratory?.name} &middot; {b.teacher ? fullName(b.teacher) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
