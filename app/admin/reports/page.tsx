'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchTeachers, fetchLaboratories, formatDate } from '@/lib/api';
import type { Booking, Teacher, Laboratory } from '@/lib/types';
import { PageHeader, EmptyState, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Users, CalendarCheck, Monitor, BookOpen, TrendingUp, ArrowDownUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [labFilter, setLabFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bks, tchs, labs] = await Promise.all([
        supabase.from('bookings').select(`*, teacher:teachers(*), laboratory:laboratories(*)`).order('booking_date', { ascending: false }),
        fetchTeachers(),
        fetchLaboratories(),
      ]);
      setBookings((bks.data || []) as unknown as Booking[]);
      setTeachers(tchs);
      setLaboratories(labs);
    } catch {
      toast.error('Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = [...bookings];
    if (dateFrom) result = result.filter((b) => b.booking_date >= dateFrom);
    if (dateTo) result = result.filter((b) => b.booking_date <= dateTo);
    if (labFilter !== 'all') result = result.filter((b) => b.laboratory_id === labFilter);
    if (teacherFilter !== 'all') result = result.filter((b) => b.teacher_id === teacherFilter);
    return result;
  }, [bookings, dateFrom, dateTo, labFilter, teacherFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((b) => b.status === 'pending').length;
    const approved = filtered.filter((b) => b.status === 'approved').length;
    const rejected = filtered.filter((b) => b.status === 'rejected').length;
    const completed = filtered.filter((b) => b.status === 'completed').length;
    const cancelled = filtered.filter((b) => b.status === 'cancelled').length;

    const byLab = filtered.reduce((acc, b) => {
      const labName = b.laboratory?.name || 'Unknown';
      acc[labName] = (acc[labName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTeacher = filtered.reduce((acc, b) => {
      const teacherName = b.teacher ? `${b.teacher.first_name} ${b.teacher.last_name}` : 'Unknown';
      acc[teacherName] = (acc[teacherName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byMonth = filtered.reduce((acc, b) => {
      const month = b.booking_date.slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, pending, approved, rejected, completed, cancelled, byLab, byTeacher, byMonth };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Reference', 'Teacher', 'Class', 'Subject', 'Laboratory', 'Date', 'Start', 'End', 'Status', 'Duration (min)'];
    const rows = filtered.map((b) => {
      const start = new Date(`2000-01-01T${b.start_time}`);
      const end = new Date(`2000-01-01T${b.end_time}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      return [
        b.reference_no,
        b.teacher ? `${b.teacher.first_name} ${b.teacher.last_name}` : '',
        b.class_name,
        b.subject,
        b.laboratory?.name || '',
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        duration,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `booking-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported to CSV.');
  };

  const exportSummaryCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Bookings', stats.total],
      ['Pending', stats.pending],
      ['Approved', stats.approved],
      ['Rejected', stats.rejected],
      ['Completed', stats.completed],
      ['Cancelled', stats.cancelled],
      ['', ''],
      ['By Laboratory', ''],
      ...Object.entries(stats.byLab).map(([lab, count]) => [lab, count]),
      ['', ''],
      ['By Teacher', ''],
      ...Object.entries(stats.byTeacher).map(([teacher, count]) => [teacher, count]),
      ['', ''],
      ['By Month', ''],
      ...Object.entries(stats.byMonth).sort().map(([month, count]) => [month, count]),
    ];
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `booking-summary-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Summary report exported to CSV.');
  };

return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <PageHeader title="Reports" description="Booking analytics and summaries">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={exportCSV} className="btn-responsive w-full sm:w-auto"><Download className="h-4 w-4 mr-2" /> Export Detailed CSV</Button>
          <Button variant="outline" onClick={exportSummaryCSV} className="btn-responsive w-full sm:w-auto"><Download className="h-4 w-4 mr-2" /> Export Summary CSV</Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="form-grid">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-responsive" />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-responsive" />
            </div>
            <div className="space-y-2">
              <Label>Laboratory</Label>
              <Select value={labFilter} onValueChange={setLabFilter}>
                <SelectTrigger className="input-responsive"><SelectValue placeholder="All Laboratories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Laboratories</SelectItem>
                  {laboratories.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="input-responsive"><SelectValue placeholder="All Teachers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="card-grid gap-4" role="region" aria-label="Summary statistics">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-balance">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <Loader2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-balance">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-balance">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-balance">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <CalendarCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-balance">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <ArrowDownUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-balance">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Bookings by Laboratory</CardTitle></CardHeader>
          <CardContent className="card-responsive">
            {Object.entries(stats.byLab).length === 0 ? (
              <EmptyState icon={Monitor} title="No data" description="No bookings match the current filters." />
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.byLab)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lab, count]) => (
                    <div key={lab} className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 p-3 rounded-lg border touch-target">
                      <span className="font-medium text-balance">{lab}</span>
                      <span className="text-2xl font-bold text-primary text-balance">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Bookings by Teacher</CardTitle></CardHeader>
          <CardContent className="card-responsive">
            {Object.entries(stats.byTeacher).length === 0 ? (
              <EmptyState icon={Users} title="No data" description="No bookings match the current filters." />
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.byTeacher)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([teacher, count]) => (
                    <div key={teacher} className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 p-3 rounded-lg border touch-target">
                      <span className="font-medium text-balance">{teacher}</span>
                      <span className="text-2xl font-bold text-primary text-balance">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Monthly Booking Trends</CardTitle></CardHeader>
        <CardContent className="card-responsive">
          {Object.keys(stats.byMonth).length === 0 ? (
            <EmptyState icon={TrendingUp} title="No data" description="No bookings match the current filters." />
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.byMonth)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([month, count]) => (
                  <div key={month} className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 p-3 rounded-lg border touch-target">
                    <span className="font-medium text-balance">{month}</span>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <span className="font-bold text-balance">{count}</span>
                      <div className="h-4 w-full sm:w-32 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(count / Math.max(...Object.values(stats.byMonth))) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
