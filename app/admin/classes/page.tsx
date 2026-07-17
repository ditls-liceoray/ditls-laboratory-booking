'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchTeachers, fullName, formatTime, formatDate } from '@/lib/api';
import type { Booking, Teacher } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge, ConfirmDialog, TableSkeleton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { BookingDetails, updateBookingStatus } from '@/components/booking-actions';
import {
  Search, CheckCircle, XCircle, CalendarCheck, Eye, Printer, Loader2, BookOpen, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ViewClassesPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
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
        supabase
          .from('bookings')
          .select(`*, teacher:teachers(*), laboratory:laboratories(*)`)
          .order('created_at', { ascending: false }),
        fetchTeachers(),
      ]);
      if (error) throw error;
      setBookings((data || []) as unknown as Booking[]);
      setTeachers(t);
    } catch {
      toast.error('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.class_name.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.reference_no.toLowerCase().includes(q) ||
        (b.teacher && fullName(b.teacher).toLowerCase().includes(q)) ||
        (b.laboratory && b.laboratory.name.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') result = result.filter((b) => b.status === statusFilter);
    if (teacherFilter !== 'all') result = result.filter((b) => b.teacher_id === teacherFilter);
    if (dateFilter) result = result.filter((b) => b.booking_date === dateFilter);
    return result;
  }, [bookings, search, statusFilter, teacherFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActing(true);
    const statusMap: Record<string, 'approved' | 'rejected' | 'completed' | 'cancelled'> = {
      approve: 'approved', reject: 'rejected', complete: 'completed', cancel: 'cancelled',
    };
    const status = statusMap[actionTarget.action];
    const ok = await updateBookingStatus(actionTarget.booking, status, adminNotes || undefined);
    if (ok) {
      setActionTarget(null);
      setAdminNotes('');
      load();
    }
    setActing(false);
  };

  const printBooking = (b: Booking) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Booking Slip - ${b.reference_no}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: auto; }
        h1 { color: #2563eb; } .ref { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        td:first-child { font-weight: bold; width: 40%; color: #555; }
      </style></head><body>
      <h1>Computer Laboratory Booking System</h1>
      <p>Booking Slip</p>
      <p class="ref">${b.reference_no}</p>
      <table>
        <tr><td>Teacher</td><td>${b.teacher ? fullName(b.teacher) : '—'}</td></tr>
        <tr><td>Class Name</td><td>${b.class_name}</td></tr>
        <tr><td>Subject</td><td>${b.subject}</td></tr>
        <tr><td>Laboratory</td><td>${b.laboratory?.name || '—'}</td></tr>
        <tr><td>Date</td><td>${formatDate(b.booking_date)}</td></tr>
        <tr><td>Time</td><td>${formatTime(b.start_time)} - ${formatTime(b.end_time)}</td></tr>
        <tr><td>Purpose</td><td>${b.purpose}</td></tr>
        <tr><td>Expected Students</td><td>${b.expected_students}</td></tr>
        <tr><td>Status</td><td>${b.status}</td></tr>
        <tr><td>Remarks</td><td>${b.remarks || '—'}</td></tr>
      </table>
      <p style="margin-top:40px;color:#999;font-size:12px;">Printed on ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="View Classes" description="All laboratory bookings across the system" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by class, subject, reference, teacher, or lab..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}>
              <option value="all">All Teachers</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
            </select>
            <Input type="date" className="lg:w-44" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} />
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : paged.length === 0 ? (
            <EmptyState icon={BookOpen} title="No classes found" description="Try adjusting your filters or wait for teachers to submit bookings." />
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
                        <TableCell>
                          <p className="font-medium">{b.class_name}</p>
                          <p className="text-xs text-muted-foreground">{b.subject}</p>
                        </TableCell>
                        <TableCell className="text-sm">{b.teacher ? fullName(b.teacher) : '—'}</TableCell>
                        <TableCell className="text-sm">{b.laboratory?.name || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <p>{formatDate(b.booking_date)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                        </TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelected(b)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400" title="View Details">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => printBooking(b)} className="p-1.5 rounded-md hover:bg-accent" title="Print">
                              <Printer className="h-4 w-4" />
                            </button>
                            {b.status === 'pending' && (
                              <>
                                <button onClick={() => setActionTarget({ booking: b, action: 'approve' })} className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" title="Approve">
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button onClick={() => setActionTarget({ booking: b, action: 'reject' })} className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400" title="Reject">
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {b.status === 'approved' && (
                              <button onClick={() => setActionTarget({ booking: b, action: 'complete' })} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400" title="Mark Completed">
                                <CalendarCheck className="h-4 w-4" />
                              </button>
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

      {/* Action confirmation with notes */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setActionTarget(null)}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 capitalize">{actionTarget.action} Booking</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to {actionTarget.action} booking <span className="font-mono font-semibold">{actionTarget.booking.reference_no}</span>?
            </p>
            <textarea
              className="w-full min-h-20 rounded-md border border-input bg-background p-3 text-sm mb-4"
              placeholder="Add admin notes (optional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setActionTarget(null); setAdminNotes(''); }}>Cancel</Button>
              <Button
                variant={actionTarget.action === 'reject' || actionTarget.action === 'cancel' ? 'destructive' : 'default'}
                onClick={handleAction}
                disabled={acting}
              >
                {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionTarget.action === 'approve' ? 'Approve' : actionTarget.action === 'reject' ? 'Reject' : actionTarget.action === 'complete' ? 'Mark Completed' : 'Cancel Booking'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
