'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { fetchActivityLogs, formatTime, formatDate, formatDateTime, fullName } from '@/lib/api';
import { StatCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Users, CalendarCheck, CalendarDays, Clock, CheckCircle, XCircle,
  UserPlus, BookOpen, Activity, ArrowRight, Server, Bell,
  CheckCircle2, AlertTriangle, Info, Monitor, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { ActivityLog, Booking, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ teachers: 0, classes: 0, todayAppointments: 0, pending: 0, approved: 0, rejected: 0 });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [statsResults, logsData, upData] = await Promise.all([
          Promise.all([
            supabase.from('teachers').select('*', { count: 'exact', head: true }),
            supabase.from('bookings').select('*', { count: 'exact', head: true }),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
          ]),
          fetchActivityLogs(8),
          supabase
            .from('bookings')
            .select(`*, teacher:teachers(*), laboratory:laboratories(*)`)
            .in('status', ['approved', 'pending'])
            .gte('booking_date', today)
            .order('booking_date', { ascending: true })
            .limit(5),
        ]);

        const [teachers, classes, todayCount, pending, approved, rejected] = statsResults;
        setStats({
          teachers: teachers?.count || 0,
          classes: classes?.count || 0,
          todayAppointments: todayCount?.count || 0,
          pending: pending?.count || 0,
          approved: approved?.count || 0,
          rejected: rejected?.count || 0,
        });
        setLogs(logsData);
        setUpcoming((upData.data || []) as unknown as Booking[]);
        setError(null);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [now]);

  const quickActions = [
    { label: 'Add Teacher', href: '/admin/teachers/add', icon: UserPlus, color: 'bg-primary' },
    { label: 'View Teachers', href: '/admin/teachers', icon: Users, color: 'bg-primary' },
    { label: 'View Classes', href: '/admin/classes', icon: BookOpen, color: 'bg-primary' },
    { label: 'View Appointments', href: '/admin/appointments', icon: CalendarCheck, color: 'bg-primary' },
  ];

  const logIcon = (action: string) => {
    if (action.includes('login')) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (action.includes('delete')) return <XCircle className="h-4 w-4 text-rose-500" />;
    if (action.includes('reject')) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (action.includes('approve')) return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    return <Info className="h-4 w-4 text-slate-400" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, Administrator.</p>
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
    <main id="main-content" className="container-responsive space-y-6" role="main">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, Administrator. Here&apos;s what&apos;s happening today.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" role="region" aria-label="Statistics">
        <StatCard icon={Users} label="Total Teachers" value={stats.teachers} color="bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400" />
        <StatCard icon={BookOpen} label="Total Classes" value={stats.classes} color="bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400" />
        <StatCard icon={CalendarDays} label="Today's Appts" value={stats.todayAppointments} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}>
                <div className="rounded-xl border p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group h-full touch-target flex flex-col items-center justify-center text-center">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', a.color, 'text-white')}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors text-balance">{a.label}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Calendar widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-lg">Calendar</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-sm text-muted-foreground">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <Link href="/admin/calendar" className="text-sm text-primary hover:underline flex items-center gap-1 btn-responsive">
                  <ChevronRight className="h-3.5 w-3.5" /> View All
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="card-responsive">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setNow(new Date(now.setMonth(now.getMonth() - 1)))} aria-label="Previous month" className="touch-target"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium text-muted-foreground">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <Button variant="outline" size="icon" onClick={() => setNow(new Date(now.setMonth(now.getMonth() + 1)))} aria-label="Next month" className="touch-target"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2" role="row">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-xs font-semibold text-muted-foreground py-1 touch-target" role="columnheader">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" role="grid">
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors touch-target',
                    d === null ? '' : 'hover:bg-accent cursor-pointer',
                    d === now.getDate() ? 'bg-primary text-primary-foreground font-bold' : d ? 'text-foreground' : '',
                  )}
                  role="gridcell"
                  aria-selected={d === now.getDate()}
                  aria-label={d ? `${now.toLocaleDateString('en-US', { month: 'long' })} ${d}` : ''}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Approved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Pending</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" />Rejected</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />Completed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming reservations */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-lg">Upcoming Reservations</CardTitle>
              <Link href="/admin/appointments" className="text-sm text-primary hover:underline flex items-center gap-1 btn-responsive">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="card-responsive">
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No upcoming reservations</p>
              </div>
            ) : (
              <div className="space-y-3" role="list">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors touch-target" role="listitem">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.class_name} &middot; {b.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.laboratory?.name} &middot; {formatDate(b.booking_date)} &middot; {formatTime(b.start_time)} - {formatTime(b.end_time)}
                      </p>
                    </div>
                    <span className={cn('h-2 w-2 rounded-full shrink-0', b.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500')} aria-label={b.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-lg">Recent Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="card-responsive">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1" role="list">
                {logs.map((log, i) => (
                  <div key={log.id} className="flex items-start gap-3 py-2 touch-target" role="listitem">
                    <div className="mt-0.5 shrink-0">{logIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System status */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold">System Status</p>
                <p className="text-sm text-muted-foreground">All systems operational</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-center sm:text-left">
              <div>
                <p className="text-muted-foreground">Database</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Connected</p>
              </div>
              <div>
                <p className="text-muted-foreground">API</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Active</p>
              </div>
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">v2.0.0</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
