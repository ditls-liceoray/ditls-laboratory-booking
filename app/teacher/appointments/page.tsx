'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { fetchTeacherBookings, fullName, formatTime, formatDate, logActivity } from '@/lib/api';
import { printBooking as printBookingUtil } from '@/lib/print';
import type { Booking, BookingStatus } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge, ConfirmDialog, TableSkeleton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { BookingDetails, updateBookingStatus } from '@/components/booking-actions';
import { Search, Eye, Printer, XCircle, Loader2, CalendarCheck, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MyAppointmentsPage() {
  const params = useSearchParams();
  const { teacher } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('q') || '');
  const [tab, setTab] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const isCancellingRef = useRef(false);
  const pageSize = 8;

  const load = useCallback(async () => {
    if (!teacher) return;
    setLoading(true);
    try {
      const b = await fetchTeacherBookings(teacher.id);
      setBookings(b);
    } catch {
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [teacher]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.class_name.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.reference_no.toLowerCase().includes(q) ||
        (b.laboratory && b.laboratory.name.toLowerCase().includes(q))
      );
    }
    if (tab !== 'all') result = result.filter((b) => b.status === tab);
    if (dateFrom) result = result.filter((b) => b.booking_date >= dateFrom);
    if (dateTo) result = result.filter((b) => b.booking_date <= dateTo);
    return result;
  }, [bookings, tab, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCancel = async () => {
    if (!cancelTarget || isCancellingRef.current) return;
    isCancellingRef.current = true;
    setCancelling(true);
    try {
      const ok = await updateBookingStatus(cancelTarget, 'cancelled');
      if (ok) { setCancelTarget(null); load(); }
    } finally {
      setCancelling(false);
      isCancellingRef.current = false;
    }
  };

  const printBooking = (b: Booking) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Booking Slip - ${b.reference_no}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:auto}h1{color:#2563eb}.ref{font-size:24px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:8px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:40%;color:#555}</style>
      </head><body><h1>Computer and Robotics Booking Slip</h1><p class="ref">${b.reference_no}</p><table>
      <tr><td>Teacher</td><td>${teacher ? fullName(teacher) : '—'}</td></tr>
      <tr><td>Class</td><td>${b.class_name}</td></tr><tr><td>Subject</td><td>${b.subject}</td></tr>
      <tr><td>Laboratory</td><td>${b.laboratory?.name || '—'}</td></tr>
      <tr><td>Date</td><td>${formatDate(b.booking_date)}</td></tr>
      <tr><td>Time</td><td>${formatTime(b.start_time)} - ${formatTime(b.end_time)}</td></tr>
      <tr><td>Purpose</td><td>${b.purpose}</td></tr>
      <tr><td>Status</td><td>${b.status}</td></tr>
      </table></body></html>`);
    w.document.close(); w.print();
  };

  const exportCSV = () => {
    const headers = ['Reference', 'Class', 'Subject', 'Laboratory', 'Date', 'Start', 'End', 'Status'];
    const rows = filtered.map((b) => [b.reference_no, b.class_name, b.subject, b.laboratory?.name || '', b.booking_date, b.start_time, b.end_time, b.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `my-appointments-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV.');
  };

  const handlePrint = (b: Booking) => {
    printBookingUtil(b, {
      title: 'Computer and Robotics Booking Slip',
      includeTeacher: true,
      includePurpose: true,
    });
  };

return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <PageHeader title="My Appointments" description="View and manage your laboratory bookings">
        <Button variant="outline" onClick={exportCSV} className="btn-responsive"><Download className="h-4 w-4 mr-2" /> Export</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search your appointments..." className="pl-10 input-responsive" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input type="date" className="w-full sm:w-44 input-responsive" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} placeholder="From" />
              <Input type="date" className="w-full sm:w-44 input-responsive" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} placeholder="To" />
              <select className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm input-responsive" value={tab} onChange={(e) => { setTab(e.target.value); setPage(1); }}>
                {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : paged.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No appointments" description="You haven't made any bookings yet. Search for a laboratory to get started." />
          ) : (
            <>
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Reference</TableHead>
                      <TableHead>Class / Subject</TableHead>
                      <TableHead>Laboratory</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.reference_no}</TableCell>
                        <TableCell><p className="font-medium">{b.class_name}</p><p className="text-xs text-muted-foreground">{b.subject}</p></TableCell>
                        <TableCell className="text-sm">{b.laboratory?.name || '—'}</TableCell>
                        <TableCell className="text-sm"><p>{formatDate(b.booking_date)}</p><p className="text-xs text-muted-foreground">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p></TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelected(b)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 touch-target" aria-label="View booking details"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => handlePrint(b)} className="p-1.5 rounded-md hover:bg-accent touch-target" aria-label="Print booking slip"><Printer className="h-4 w-4" /></button>
                            {b.status === 'pending' && (
                              <button onClick={() => setCancelTarget(b)} className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 touch-target" aria-label="Cancel booking"><XCircle className="h-4 w-4" /></button>
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
      <ConfirmDialog open={!!cancelTarget} title="Cancel Booking" description={`Cancel booking ${cancelTarget?.reference_no}? This cannot be undone.`} onConfirm={handleCancel} onCancel={() => setCancelTarget(null)} confirmLabel={cancelling ? 'Cancelling...' : 'Cancel Booking'} destructive />
    </main>
  );
}
