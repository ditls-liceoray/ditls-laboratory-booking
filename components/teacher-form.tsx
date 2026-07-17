'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { logActivity, fullName } from '@/lib/api';
import { DEPARTMENTS, POSITIONS } from '@/lib/constants';
import type { Teacher } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Save, X, RotateCcw, User, Mail, Phone, Building, Briefcase, Lock, Image as ImageIcon } from 'lucide-react';

export default function TeacherForm({ teacher }: { teacher?: Teacher }) {
  const router = useRouter();
  const isEdit = !!teacher;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    department: DEPARTMENTS[0],
    position: POSITIONS[0],
    username: '',
    password: '',
    confirm_password: '',
    status: 'active' as 'active' | 'inactive',
    profile_picture: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (teacher) {
      setForm((prev) => ({
        ...prev,
        first_name: teacher.first_name,
        middle_name: teacher.middle_name || '',
        last_name: teacher.last_name,
        email: teacher.email,
        contact_number: teacher.contact_number || '',
        department: teacher.department,
        position: teacher.position,
        username: '',
        password: '',
        confirm_password: '',
        status: teacher.status,
        profile_picture: teacher.profile_picture || '',
      }));
    }
  }, [teacher]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.department) e.department = 'Department is required';
    if (!form.position) e.position = 'Position is required';
    if (!isEdit) {
      if (!form.username.trim()) e.username = 'Username is required';
      else if (form.username.length < 3) e.username = 'Username must be at least 3 characters';
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    } else {
      if (form.password && form.password.length < 6) e.password = 'Password must be at least 6 characters';
      if (form.password && form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && teacher) {
        const { error: tError } = await supabase
          .from('teachers')
          .update({
            first_name: form.first_name,
            middle_name: form.middle_name || null,
            last_name: form.last_name,
            email: form.email,
            contact_number: form.contact_number || null,
            department: form.department,
            position: form.position,
            status: form.status,
            profile_picture: form.profile_picture || null,
          })
          .eq('id', teacher.id);
        if (tError) throw tError;

        await logActivity('edit_teacher', `Updated teacher ${fullName(form)}`);
        toast.success('Teacher updated successfully.');
        router.push('/admin/teachers');
      } else {
        // Create auth user via edge function (needs service role key)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
        const response = await fetch(`${supabaseUrl}/functions/v1/create-teacher`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
          },
          body: JSON.stringify({
            username: form.username.trim().toLowerCase(),
            password: form.password,
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            email: form.email,
            contact_number: form.contact_number,
            department: form.department,
            position: form.position,
            status: form.status,
            profile_picture: form.profile_picture,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to create teacher (${response.status})`);
        }

        await logActivity('create_teacher', `Created teacher ${fullName(form)}`);
        toast.success('Teacher created successfully.');
        router.push('/admin/teachers');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({
      first_name: '', middle_name: '', last_name: '', email: '', contact_number: '',
      department: DEPARTMENTS[0], position: POSITIONS[0], username: '', password: '',
      confirm_password: '', status: 'active', profile_picture: '',
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Teacher' : 'Add Teacher'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isEdit ? 'Update teacher information' : 'Create a new teacher account'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          {!isEdit && (
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Picture</CardTitle>
          <CardDescription>Enter an image URL for the teacher&apos;s profile picture (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {form.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.profile_picture} alt="Profile" className="h-full w-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {(form.first_name[0] || '?') + (form.last_name[0] || '')}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://example.com/photo.jpg"
                  className="pl-10"
                  value={form.profile_picture}
                  onChange={(e) => setForm({ ...form, profile_picture: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Paste a direct image URL</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>First Name <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              {errors.first_name && <p className="text-xs text-rose-500">{errors.first_name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name <span className="text-rose-500">*</span></Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              {errors.last_name && <p className="text-xs text-rose-500">{errors.last_name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email Address <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Professional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Position <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                >
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Credentials</CardTitle>
          <CardDescription>
            {isEdit ? 'Leave password fields blank to keep current password. Username cannot be changed.' : 'Set the login credentials for this teacher.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username {!isEdit && <span className="text-rose-500">*</span>}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={isEdit}
                  placeholder={isEdit ? 'Cannot be changed' : 'e.g. jdoe'}
                />
              </div>
              {errors.username && <p className="text-xs text-rose-500">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password {!isEdit && <span className="text-rose-500">*</span>}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                />
              </div>
              {errors.password && <p className="text-xs text-rose-500">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirm Password {!isEdit && <span className="text-rose-500">*</span>}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-10"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                />
              </div>
              {errors.confirm_password && <p className="text-xs text-rose-500">{errors.confirm_password}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
