'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/api';
import type { Setting } from '@/lib/types';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Settings as SettingsIcon, Clock, Sun, Moon, Timer, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*');
    const map: Record<string, string> = {};
    (data || []).forEach((s: Setting) => { map[s.key] = s.value; });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      }
      await logActivity('update_settings', 'Updated system settings');
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="Configure system-wide parameters">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> General Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>System Name</Label>
              <Input value={settings.system_name || ''} onChange={(e) => setSettings({ ...settings, system_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>System Version</Label>
              <Input value={settings.system_version || ''} onChange={(e) => setSettings({ ...settings, system_version: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>University</Label>
              <Input value={settings.university || ''} onChange={(e) => setSettings({ ...settings, university: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" value={settings.session_timeout_minutes || '60'} onChange={(e) => setSettings({ ...settings, session_timeout_minutes: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" /> Booking Policy</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Booking Duration (minutes)</Label>
              <Input type="number" min={5} max={120} value={settings.min_booking_duration_minutes || '30'} onChange={(e) => setSettings({ ...settings, min_booking_duration_minutes: e.target.value })} />
              <p className="text-xs text-muted-foreground">Minimum allowed duration for a booking. Users cannot book slots shorter than this.</p>
            </div>
            <div className="space-y-2">
              <Label>Maximum Booking Duration (hours)</Label>
              <Input type="number" min={1} max={24} value={settings.max_booking_duration_hours || '4'} onChange={(e) => setSettings({ ...settings, max_booking_duration_hours: e.target.value })} />
              <p className="text-xs text-muted-foreground">Maximum allowed duration for a single booking. Longer bookings will be rejected.</p>
            </div>
            <div className="space-y-2">
              <Label>Booking Start Hour</Label>
              <Input type="time" value={settings.booking_start_hour || '07:00'} onChange={(e) => setSettings({ ...settings, booking_start_hour: e.target.value })} />
              <p className="text-xs text-muted-foreground">Earliest time a booking can start. Bookings before this time will be rejected.</p>
            </div>
            <div className="space-y-2">
              <Label>Booking End Hour</Label>
              <Input type="time" value={settings.booking_end_hour || '22:00'} onChange={(e) => setSettings({ ...settings, booking_end_hour: e.target.value })} />
              <p className="text-xs text-muted-foreground">Latest time a booking can end. Bookings ending after this time will be rejected.</p>
            </div>
            <div className="space-y-2">
              <Label>Time Slot Interval (minutes)</Label>
              <Input type="number" min={5} max={60} value={settings.time_slot_interval_minutes || '30'} onChange={(e) => setSettings({ ...settings, time_slot_interval_minutes: e.target.value })} />
              <p className="text-xs text-muted-foreground">Granularity of time slots in the booking form. Users can only select start/end times at this interval.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Security Information</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="font-medium">Password Hashing</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">bcrypt (Supabase Auth)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="font-medium">Row Level Security</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Enabled on all tables</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="font-medium">Protected Routes</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Role-based access control</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="font-medium">SQL Injection Protection</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Parameterized queries (Supabase)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="font-medium">XSS Protection</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">React auto-escaping</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
