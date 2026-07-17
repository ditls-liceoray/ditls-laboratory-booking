'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchTeachers, fetchLaboratories, fullName, formatDate, logActivity } from '@/lib/api';
import { DEPARTMENTS } from '@/lib/constants';
import type { Teacher, Laboratory } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, ConfirmDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Search, UserPlus, Eye, Pencil, Trash2, Users, ChevronUp, ChevronDown, ArrowLeft, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SortKey = 'teacher_id' | 'first_name' | 'department' | 'position' | 'created_at';

export default function ViewTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 8;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, l] = await Promise.all([fetchTeachers(), fetchLaboratories()]);
      setTeachers(t);
      setLabs(l);
    } catch {
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = [...teachers];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        fullName(t).toLowerCase().includes(q) ||
        t.teacher_id.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.teacher_id.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'all') result = result.filter((t) => t.department === deptFilter);
    result.sort((a, b) => {
      let av = '', bv = '';
      if (sortKey === 'first_name') { av = fullName(a).toLowerCase(); bv = fullName(b).toLowerCase(); }
      else { av = String(a[sortKey] || '').toLowerCase(); bv = String(b[sortKey] || '').toLowerCase(); }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [teachers, search, deptFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          teacher_id: deleteTarget.id,
          profile_id: deleteTarget.profile_id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete (${response.status})`);
      }

      await logActivity('delete_teacher', `Deleted teacher ${fullName(deleteTarget)}`);
      toast.success('Teacher deleted successfully.');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete teacher.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="View Teachers" description="Manage all teacher accounts">
        <Button onClick={() => router.push('/admin/teachers/add')}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Teacher
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email, or username..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teachers found"
              description={search || deptFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first teacher to get started.'}
              action={!search && deptFilter === 'all' ? (
                <Button onClick={() => router.push('/admin/teachers/add')}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Teacher
                </Button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('teacher_id')}>
                          Teacher ID
                          {sortKey === 'teacher_id' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </button>
                      </TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('first_name')}>
                          Full Name
                          {sortKey === 'first_name' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('department')}>
                          Department
                          {sortKey === 'department' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </button>
                      </TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('created_at')}>
                          Created
                          {sortKey === 'created_at' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.teacher_id}</TableCell>
                        <TableCell>
                          <Avatar className="h-9 w-9">
                            {t.profile_picture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.profile_picture} alt={fullName(t)} className="h-full w-full object-cover rounded-full" />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {t.first_name[0]}{t.last_name[0]}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{fullName(t)}</p>
                          <p className="text-xs text-muted-foreground">{t.email}</p>
                        </TableCell>
                        <TableCell className="text-sm">{t.department}</TableCell>
                        <TableCell className="text-sm">{t.position}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                            t.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', t.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400')} />
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/teachers/edit/${t.id}`}>
                              <button className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${deleteTarget ? fullName(deleteTarget) : ''}? This action cannot be undone and will remove their account.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        destructive
      />
    </div>
  );
}
