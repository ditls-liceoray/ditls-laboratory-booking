'use client';

import { supabase } from '@/lib/supabase/client';
import type { ActivityLog, Booking, Laboratory, Teacher } from '@/lib/types';

export async function logActivity(action: string, description?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action,
    description: description || action,
  });
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  bookingId?: string,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    booking_id: bookingId || null,
  });
}

export async function fetchBookingsWithDetails(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*,
      teacher:teachers(*),
      laboratory:laboratories(*)`,
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Booking[];
}

export async function fetchTeacherBookings(teacherId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*,
      teacher:teachers(*),
      laboratory:laboratories(*)`,
    )
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Booking[];
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Teacher[];
}

export async function fetchLaboratories(): Promise<Laboratory[]> {
  const { data, error } = await supabase
    .from('laboratories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Laboratory[];
}

export async function fetchActivityLogs(limit = 10): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as ActivityLog[];
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${period}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fullName(t: { first_name: string; middle_name?: string | null; last_name: string }): string {
  return [t.first_name, t.middle_name, t.last_name].filter(Boolean).join(' ');
}
