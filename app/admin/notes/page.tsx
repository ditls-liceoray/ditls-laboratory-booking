'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity, formatDateTime } from '@/lib/api';
import type { Note, NoteType } from '@/lib/types';
import { PageHeader, EmptyState, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StickyNote, Plus, Pin, Trash2, Pencil, Loader2, Megaphone, Wrench, CalendarOff, Info, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TYPE_META: Record<NoteType, { icon: typeof Megaphone; color: string; label: string }> = {
  announcement: { icon: Megaphone, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', label: 'Announcement' },
  maintenance: { icon: Wrench, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400', label: 'Maintenance' },
  holiday: { icon: CalendarOff, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400', label: 'Holiday' },
  system: { icon: Info, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'System' },
  pinned: { icon: Pin, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Pinned' },
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'announcement' as NoteType, title: '', content: '', pinned: false });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (!error) setNotes((data || []) as Note[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('notes').update({ type: form.type, title: form.title, content: form.content, pinned: form.pinned }).eq('id', editing.id);
        if (error) throw error;
        await logActivity('update_note', `Updated note: ${form.title}`);
        toast.success('Note updated.');
      } else {
        const { error } = await supabase.from('notes').insert({ type: form.type, title: form.title, content: form.content, pinned: form.pinned });
        if (error) throw error;
        await logActivity('create_note', `Created note: ${form.title}`);
        toast.success('Note created.');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ type: 'announcement', title: '', content: '', pinned: false });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('notes').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Failed to delete.'); return; }
    await logActivity('delete_note', `Deleted note: ${deleteTarget.title}`);
    toast.success('Note deleted.');
    setDeleteTarget(null);
    load();
  };

  const togglePin = async (n: Note) => {
    await supabase.from('notes').update({ pinned: !n.pinned }).eq('id', n.id);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notes" description="Announcements, maintenance notices, and system messages">
        <Button onClick={() => { setEditing(null); setForm({ type: 'announcement', title: '', content: '', pinned: false }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Note
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="animate-slide-up">
          <CardHeader><CardTitle className="text-lg">{editing ? 'Edit Note' : 'New Note'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NoteType })}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Note title" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea min-h-24 className="min-h-24" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your note content here..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="rounded" />
              Pin this note
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {editing ? 'Update' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : notes.length === 0 ? (
        <Card><CardContent><EmptyState icon={StickyNote} title="No notes yet" description="Create announcements, maintenance notices, or holiday messages." /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((n) => {
            const meta = TYPE_META[n.type];
            return (
              <Card key={n.id} className={cn('animate-slide-up', n.pinned && 'ring-2 ring-primary/30')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', meta.color)}>
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{n.title}</h3>
                        {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{meta.label} &middot; {formatDateTime(n.created_at)}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
                      <div className="flex gap-1 mt-3">
                        <button onClick={() => togglePin(n)} className={cn('p-1.5 rounded-md hover:bg-accent', n.pinned && 'text-primary')} title="Toggle pin"><Pin className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setEditing(n); setForm({ type: n.type, title: n.title, content: n.content, pinned: n.pinned }); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-accent" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteTarget(n)} className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Note" description={`Delete "${deleteTarget?.title}"? This cannot be undone.`} onConfirm={del} onCancel={() => setDeleteTarget(null)} confirmLabel="Delete" destructive />
    </div>
  );
}
