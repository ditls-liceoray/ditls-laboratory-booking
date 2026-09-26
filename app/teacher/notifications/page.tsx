'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatRelativeTime } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { PageHeader, EmptyState, Pagination } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LiceoLoader } from '@/components/ui/liceo-loader';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    if (!error) {
      setNotifications((data || []) as Notification[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [user, page]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read.');
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const iconFor = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount]);

  return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <PageHeader title="Notifications" description="Stay updated on your booking status">
        <Button variant="outline" onClick={markAllRead} className="btn-responsive"><CheckCheck className="h-4 w-4 mr-2" /> Mark all read</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <LiceoLoader size="md" />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="You'll receive notifications when your bookings are approved, rejected, or updated." />
          ) : (
            <>
              <div className="space-y-2" role="list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn('flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 touch-target', !n.read && 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800')}
                    onClick={() => !n.read && markRead(n.id)}
                    role="listitem"
                  >
                    <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
  {n.message}
</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
