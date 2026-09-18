'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { fetchTeacherBookings, formatTime, formatDate, formatDateTime, fullName } from '@/lib/api';
import type { Booking, Notification } from '@/lib/types';
import { StatCard, StatusBadge, EmptyState, ContentDetailsModal } from '@/components/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  Plus,
  Bell,
  Monitor,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { teacher, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);

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
        setError(null);
      } catch {
        setError('Failed to load dashboard data.');
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back.</p>
          </div>
        </div>
        <Card className="border-rose-200 dark:border-rose-900">
          <CardContent className="p-6 text-center">
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <main id="main-content" className="container-responsive space-y-6" role="main">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {teacher ? fullName(teacher) : 'Teacher'}. Here&apos;s your booking overview.
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" role="region" aria-label="Statistics">
        <StatCard icon={CalendarCheck} label="My Appointments" value={stats.total} color="bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" />
        <StatCard icon={CalendarDays} label="Today's Schedule" value={stats.today} color="bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Quick actions">
        <Button onClick={() => router.push('/teacher/search')} className="btn-responsive w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Quick Book
        </Button>
        <Button variant="outline" onClick={() => router.push('/teacher/appointments')} className="btn-responsive w-full sm:w-auto">
          <CalendarCheck className="h-4 w-4 mr-2" /> My Appointments
        </Button>
        <div className="w-full sm:w-auto relative">
          <Button variant="outline" onClick={() => router.push('/teacher/notifications')} className="btn-responsive w-full">
            <Bell className="h-4 w-4 mr-2" /> Notifications
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
              <Link href="/teacher/appointments" className="text-sm text-primary hover:underline flex items-center gap-1 btn-responsive">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="card-responsive">
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming bookings" description="Book a laboratory to get started." action={
                <Button className="mt-4 btn-responsive" onClick={() => router.push('/teacher/search')}>
                  <Plus className="h-4 w-4 mr-2" /> Book a Lab
                </Button>
              } />
            ) : (
              <div className="space-y-3" role="list">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors touch-target" role="listitem">
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
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-lg">Latest Notifications</CardTitle>
              <Link href="/teacher/notifications" className="text-sm text-primary hover:underline flex items-center gap-1 btn-responsive">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="card-responsive">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" description="You&apos;ll be notified when your bookings are updated." />
            ) : (
              <div className="space-y-2" role="list">
                {notifications.map((n) => {
                  const messagePreview = n.message.length > 100 ? n.message.slice(0, 100) + '...' : n.message;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors touch-target cursor-pointer hover:bg-accent/50',
                        !n.read && 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                      )}
                      onClick={() => setViewNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewNotification(n);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${n.title} notification`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        {n.type === 'error' && <XCircle className="h-5 w-5 text-rose-500" />}
                        {n.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                        {n.type === 'info' && <Info className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{n.title}</p>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{messagePreview}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
      {viewNotification && (
        <ContentDetailsModal
          open={!!viewNotification}
          title={viewNotification?.title || ''}
          content={viewNotification?.message || ''}
          date={viewNotification ? formatDateTime(viewNotification.created_at) : undefined}
          onClose={() => setViewNotification(null)}
        />
      )}
    </>
  );
}