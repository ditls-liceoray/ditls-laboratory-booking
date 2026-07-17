'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchTeachers, fullName, formatTime, formatDate } from '@/lib/api';
import type { Booking, Teacher, BookingStatus } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge, TableSkeleton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { BookingDetails, updateBookingStatus } from '@/components/booking-actions';
import {
  Search, CheckCircle, XCircle, CalendarCheck, Eye, Printer, Loader2, CalendarClock, Download,
} from 'lucide-react';
import { toast } from 'sonner';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(initialStatus);
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [actionTarget, setActionTarget] = useState<{ booking: Booking; action: string } | null>(null);
  const [acting, setActing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const pageSize = 8;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, error }, t] = await Promise.all([
        supabase.from('bookings').select(`*, teacher:teachers(*), laboratory:laboratories(*)`).order('created_at', { ascending: false }),
        fetchTeachers(),
      ]);
      if (error) throw error;
      setBookings((data || []) as unknown as Booking[]);
      setTeachers(t);
    } catch {
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = [...bookings];
    if (tab !== 'all') result = result.filter((b) => b.status === tab);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.class_name.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.reference_no.toLowerCase().includes(q) ||
        (b.teacher && fullName(b.teacher).toLowerCase().includes(q))
      );
    }
    if (teacherFilter !== 'all') result = result.filter((b) => b.teacher_id === teacherFilter);
    return result;
  }, [bookings, tab, search, teacherFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActing(true);
    const statusMap: Record<string, BookingStatus> = {
      approve: 'approved', reject: 'rejected', complete: 'completed', cancel: 'cancelled',
    };
    const ok = await updateBookingStatus(actionTarget.booking, statusMap[actionTarget.action], adminNotes || undefined);
    if (ok) { setActionTarget(null); setAdminNotes(''); load(); }
    setActing(false);
  };

  const printBooking = (b: Booking) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Booking Slip - ${b.reference_no}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:auto}h1{color:#2563eb}.ref{font-size:24px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:8px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:40%;color:#555}</style>
      </head><body><h1>CLBS Booking Slip</h1><p class="ref">${b.reference_no}</p><table>
      <tr><td>Teacher</td><td>${b.teacher ? fullName(b.teacher) : '—'}</td></tr>
      <tr><td>Class</td><td>${b.class_name}</td></tr><tr><td>Subject</td><td>${b.subject}</td></tr>
      <tr><td>Laboratory</td><td>${b.laboratory?.name || '—'}</td></tr>
      <tr><td>Date</td><td>${formatDate(b.booking_date)}</td></tr>
      <tr><td>Time</td><td>${formatTime(b.start_time)} - ${formatTime(b.end_time)}</td></tr>
      <tr><td>Status</td><td>${b.status}</td></tr>
      </table></body></html>`);
    w.document.close(); w.print();
  };

  const exportCSV = () => {
    const headers = ['Reference', 'Teacher', 'Class', 'Subject', 'Laboratory', 'Date', 'Start', 'End', 'Status'];
    const rows = filtered.map((b) => [
      b.reference_no, b.teacher ? fullName(b.teacher) : '', b.class_name, b.subject,
      b.laboratory?.name || '', b.booking_date, b.start_time, b.end_time, b.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `appointments-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV (Excel-compatible).');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Manage all booking appointments">
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export Excel</Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search appointments..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}>
              <option value="all">All Teachers</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
            </select>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : paged.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No appointments found" description="No appointments match your current filters." />
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Reference</TableHead>
                      <TableHead>Class / Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Laboratory</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.reference_no}</TableCell>
                        <TableCell><p className="font-medium">{b.class_name}</p><p className="text-xs text-muted-foreground">{b.subject}</p></TableCell>
                        <TableCell className="text-sm">{b.teacher ? fullName(b.teacher) : '—'}</TableCell>
                        <TableCell className="text-sm">{b.laboratory?.name || '—'}</TableCell>
                        <TableCell className="text-sm"><p>{formatDate(b.booking_date)}</p><p className="text-xs text-muted-foreground">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p></TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelected(b)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400" title="View"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => printBooking(b)} className="p-1.5 rounded-md hover:bg-accent" title="Print"><Printer className="h-4 w-4" /></button>
                            {b.status === 'pending' && (
                              <>
                                <button onClick={() => setActionTarget({ booking: b, action: 'approve' })} className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                                <button onClick={() => setActionTarget({ booking: b, action: 'reject' })} className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400" title="Reject"><XCircle className="h-4 w-4" /></button>
                              </>
                            )}
                            {b.status === 'approved' && (
                              <button onClick={() => setActionTarget({ booking: b, action: 'complete' })} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400" title="Complete"><CalendarCheck className="h-4 w-4" /></button>
                            )}
                            {(b.status === 'pending' || b.status === 'approved') && (
                              <button onClick={() => setActionTarget({ booking: b, action: 'cancel' })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400" title="Cancel"><XCircle className="h-4 w-4" /></button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setActionTarget(null)}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 capitalize">{actionTarget.action} Booking</h3>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to {actionTarget.action} booking <span className="font-mono font-semibold">{actionTarget.booking.reference_no}</span>?</p>
            <textarea className="w-full min-h-20 rounded-md border border-input bg-background p-3 text-sm mb-4" placeholder="Admin notes (optional)..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setActionTarget(null); setAdminNotes(''); }}>Cancel</Button>
              <Button variant={actionTarget.action === 'reject' || actionTarget.action === 'cancel' ? 'destructive' : 'default'} onClick={handleAction} disabled={acting}>
                {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionTarget.action === 'approve' ? 'Approve' : actionTarget.action === 'reject' ? 'Reject' : actionTarget.action === 'complete' ? 'Complete' : 'Cancel Booking'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
