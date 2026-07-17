'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { fetchTeacherBookings, formatTime, formatDate, fullName } from '@/lib/api';
import type { Booking, Notification } from '@/lib/types';
import { StatCard, StatusBadge, EmptyState } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck, Clock, CheckCircle, XCircle, CalendarDays, Plus, Bell, Monitor, ArrowRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { teacher, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!teacher) return;
    (async () => {
      try {
        const [b, { data: notifs }] = await Promise.all([
          fetchTeacherBookings(teacher.id),
          supabase.from('notifications').select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false }).limit(5),
        ]);
        setBookings(b);
        setNotifications((notifs || []) as Notification[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [teacher, user]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      approved: bookings.filter((b) => b.status === 'approved').length,
      rejected: bookings.filter((b) => b.status === 'rejected').length,
      today: bookings.filter((b) => b.booking_date === today && (b.status === 'approved' || b.status === 'completed')).length,
    };
  }, [bookings]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return bookings
      .filter((b) => b.booking_date >= today && (b.status === 'approved' || b.status === 'pending'))
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date))
      .slice(0, 5);
  }, [bookings]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {teacher ? fullName(teacher) : 'Teacher'}. Here&apos;s your booking overview.
          </p>
        </div>
        <div className="glass-card rounded-xl px-5 py-3 flex items-center gap-4">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-muted-foreground font-mono">{now.toLocaleTimeString('en-US')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={CalendarCheck} label="My Appointments" value={stats.total} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" />
        <StatCard icon={CalendarDays} label="Today's Schedule" value={stats.today} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push('/teacher/search')}>
          <Plus className="h-4 w-4 mr-2" /> Quick Book
        </Button>
        <Button variant="outline" onClick={() => router.push('/teacher/appointments')}>
          <CalendarCheck className="h-4 w-4 mr-2" /> My Appointments
        </Button>
        <Button variant="outline" onClick={() => router.push('/teacher/notifications')}>
          <Bell className="h-4 w-4 mr-2" /> Notifications
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
              <Link href="/teacher/appointments" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming bookings" description="Book a laboratory to get started." />
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.class_name} &middot; {b.subject}</p>
                      <p className="text-xs text-muted-foreground">{b.laboratory?.name} &middot; {formatDate(b.booking_date)} &middot; {formatTime(b.start_time)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Latest Notifications</CardTitle>
              <Link href="/teacher/notifications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" description="You'll be notified when your bookings are updated." />
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className={cn('p-3 rounded-lg border', !n.read && 'bg-blue-50/50 dark:bg-blue-950/20')}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
