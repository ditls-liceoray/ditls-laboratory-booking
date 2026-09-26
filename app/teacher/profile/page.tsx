'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity, fullName } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, Mail, Phone, Lock, Image as ImageIcon, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LiceoLoader } from '@/components/ui/liceo-loader';

export default function ProfilePage() {
  const { teacher, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: '', contact_number: '', profile_picture: '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const uploadProfilePicture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !teacher) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be 5MB or smaller.');
      return;
    }

    setUploadingPicture(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${teacher.profile_id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('teacher-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('teacher-profiles')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('teachers')
        .update({
          profile_picture: imageUrl,
        })
        .eq('id', teacher.id);

      if (updateError) throw updateError;

      setForm((prev) => ({
        ...prev,
        profile_picture: imageUrl,
      }));

      await refreshProfile();

      toast.success('Profile picture updated successfully.');
    } catch (e: unknown) {
      console.error('Profile picture upload error:', e);
      toast.error(
        e instanceof Error
          ? e.message
          : 'Failed to upload profile picture.'
      );
    } finally {
      setUploadingPicture(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!teacher) {
    return <LiceoLoader size="lg" fullScreen />;
  }

  return (
    <main id="main-content" className="container-responsive space-y-6" role="main">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account information</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Teacher ID: </span>
          <span className="text-sm font-mono font-medium">{teacher.teacher_id}</span>
        </div>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-4 sm:items-start sm:flex-col sm:flex-1">
              <Avatar className="h-28 w-28">
                {form.profile_picture ? (
                  <img
                    src={form.profile_picture}
                    alt="Profile"
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                    {teacher.first_name[0]}{teacher.last_name[0]}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{fullName(teacher)}</h2>
                <p className="text-sm text-muted-foreground">{teacher.position} &middot; {teacher.department}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{teacher.teacher_id}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadProfilePicture}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingPicture}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-responsive w-full sm:w-auto"
                >
                  {uploadingPicture ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Change Picture
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Remove profile picture?')) {
                      // Handle remove picture
                    }
                  }}
                  className="btn-responsive w-full sm:w-auto"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold sm:hidden">{fullName(teacher)}</h2>
              <p className="text-sm text-muted-foreground sm:hidden">{teacher.position} &middot; {teacher.department}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1 sm:hidden">{teacher.teacher_id}</p>
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
        <CardContent className="card-responsive">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.email?.replace('@clbs.local', '') || ''} disabled className="input-responsive" />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName(teacher)} disabled className="input-responsive" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 input-responsive" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 input-responsive" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
                </div>
              </div>
              {/* <div className="space-y-2 md:col-span-2">
                <Label>Profile Picture URL</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" value={form.profile_picture} onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} placeholder="https://..." />
                </div>
              </div> */}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="btn-responsive">
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
        <CardContent className="card-responsive">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="form-grid">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-10 input-responsive" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-10 input-responsive" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changingPwd} className="btn-responsive">
                {changingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
