'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, Loader2, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  }, [user]);

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

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Stay updated on your booking status">
        <Button variant="outline" onClick={markAllRead}><CheckCheck className="h-4 w-4 mr-2" /> Mark all read</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="You'll receive notifications when your bookings are approved, rejected, or updated." />
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn('flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50', !n.read && 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900')}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
