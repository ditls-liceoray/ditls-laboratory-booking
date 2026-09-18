'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchTeachers, fullName, formatTime, formatDate } from '@/lib/api';
import { printBooking as printBookingUtil } from '@/lib/print';
import type { Booking, Teacher } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge, ConfirmDialog, TableSkeleton, ActionConfirmDialog } from '@/components/shared';
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
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const isActingRef = useRef(false);
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
    if (!actionTarget || isActingRef.current) return;
    isActingRef.current = true;
    setActing(true);
    try {
      const statusMap: Record<string, 'approved' | 'rejected' | 'completed' | 'cancelled'> = {
        approve: 'approved', reject: 'rejected', complete: 'completed', cancel: 'cancelled',
      };
      const status = statusMap[actionTarget.action];
      const ok = await updateBookingStatus(actionTarget.booking, status, adminNotes || undefined);
      if (ok) {
        setActionTarget(null);
        setAdminNotes('');
        setActionDialogOpen(false);
        load();
      }
    } finally {
      setActing(false);
      isActingRef.current = false;
    }
  };

  const openActionDialog = (booking: Booking, action: string) => {
    setActionTarget({ booking, action });
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const handlePrint = (b: Booking) => {
    printBookingUtil(b, {
      title: 'Computer and Robotics Laboratory Booking System',
      includeTeacher: true,
      includePurpose: true,
      includeExpectedStudents: true,
      includeRemarks: true,
      includePrintDate: true,
    });
  };

return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <PageHeader title="View Classes" description="All laboratory bookings across the system" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by class, subject, reference, teacher, or lab..."
                className="pl-10 input-responsive"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm input-responsive" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm input-responsive" value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}>
              <option value="all">All Teachers</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
            </select>
            <Input type="date" className="w-full sm:w-auto lg:w-44 input-responsive" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} />
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : paged.length === 0 ? (
            <EmptyState icon={BookOpen} title="No classes found" description="Try adjusting your filters or wait for teachers to submit bookings." />
          ) : (
            <>
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Reference</TableHead>
                      <TableHead>Class / Subject</TableHead>
                      <TableHead>Teacher</TableHead>
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
                            <button onClick={() => setSelected(b)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 touch-target" aria-label="View details"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => handlePrint(b)} className="p-1.5 rounded-md hover:bg-accent touch-target" aria-label="Print"><Printer className="h-4 w-4" /></button>
                            {b.status === 'pending' && (
                              <>
                                <button onClick={() => openActionDialog(b, 'approve')} className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 touch-target" aria-label="Approve"><CheckCircle className="h-4 w-4" /></button>
                                <button onClick={() => openActionDialog(b, 'reject')} className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 touch-target" aria-label="Reject"><XCircle className="h-4 w-4" /></button>
                              </>
                            )}
                            {b.status === 'approved' && (
                              <button onClick={() => openActionDialog(b, 'complete')} className="p-1.5 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 touch-target" aria-label="Mark completed"><CalendarCheck className="h-4 w-4" /></button>
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

      <ActionConfirmDialog
        open={actionDialogOpen}
        title={`${actionTarget?.action} Booking`}
        description={`Are you sure you want to ${actionTarget?.action} booking <span className="font-mono font-semibold">{actionTarget?.booking.reference_no}</span>?`}
        onConfirm={handleAction}
        onCancel={() => { setActionTarget(null); setAdminNotes(''); setActionDialogOpen(false); }}
        confirmLabel={actionTarget?.action === 'approve' ? 'Approve' : actionTarget?.action === 'reject' ? 'Reject' : actionTarget?.action === 'complete' ? 'Mark Completed' : 'Cancel Booking'}
        destructive={actionTarget?.action === 'reject' || actionTarget?.action === 'cancel'}
        showNotes
        notesValue={adminNotes}
        onNotesChange={(v) => setAdminNotes(v)}
        loading={acting}
      />
    </main>
  );
}
