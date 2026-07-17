'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity, fullName } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Save, User, Mail, Phone, Lock, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { teacher, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: '', contact_number: '', profile_picture: '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (teacher) {
      setForm({ email: teacher.email, contact_number: teacher.contact_number || '', profile_picture: teacher.profile_picture || '' });
    }
  }, [teacher]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('teachers').update({
        email: form.email,
        contact_number: form.contact_number || null,
        profile_picture: form.profile_picture || null,
      }).eq('id', teacher.id);
      if (error) throw error;
      await logActivity('update_profile', 'Updated profile information');
      await refreshProfile();
      toast.success('Profile updated successfully.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) { toast.error('New passwords do not match.'); return; }
    if (pwd.next.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw error;
      await logActivity('change_password', 'Changed account password');
      toast.success('Password changed successfully.');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setChangingPwd(false);
    }
  };

  if (!teacher) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account information</p>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              {form.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.profile_picture} alt="Profile" className="h-full w-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                  {teacher.first_name[0]}{teacher.last_name[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{fullName(teacher)}</h2>
              <p className="text-sm text-muted-foreground">{teacher.position} &middot; {teacher.department}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{teacher.teacher_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>Update your contact details. Username cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.email?.replace('@clbs.local', '') || ''} disabled />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName(teacher)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Profile Picture URL</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={form.profile_picture} onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
          <CardDescription>Set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-10" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-10" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changingPwd}>
                {changingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
