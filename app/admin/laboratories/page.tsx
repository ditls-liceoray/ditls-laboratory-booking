'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/api';
import type { Laboratory } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Edit, Save, X } from 'lucide-react';
import { LiceoLoader } from '@/components/ui/liceo-loader';
import { toast } from 'sonner';

export default function LaboratoriesPage() {
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    capacity: 30,
    status: 'available' as 'available' | 'maintenance' | 'closed',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('laboratories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setLabs((data || []) as Laboratory[]);
    } catch {
      toast.error('Failed to load laboratories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Laboratory name is required';
    if (form.capacity < 1) e.capacity = 'Capacity must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({
      name: '',
      location: '',
      capacity: 30,
      status: 'available',
      description: '',
      is_active: true,
    });
    setErrors({});
    setEditingLab(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (lab: Laboratory) => {
    setEditingLab(lab);
    setForm({
      name: lab.name,
      location: lab.location || '',
      capacity: lab.capacity,
      status: lab.status,
      description: lab.description || '',
      is_active: lab.is_active,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    setSaving(true);
    try {
      if (editingLab) {
        const { error } = await supabase
          .from('laboratories')
          .update({
            name: form.name.trim(),
            location: form.location.trim() || null,
            capacity: form.capacity,
            status: form.status,
            description: form.description.trim() || null,
            is_active: form.is_active,
          })
          .eq('id', editingLab.id);
        if (error) {
          if (error.code === '23505') {
            throw new Error('A laboratory with this name already exists.');
          }
          throw error;
        }
        await logActivity('update_laboratory', `Updated laboratory "${form.name}"`);
        toast.success('Laboratory updated successfully.');
      } else {
        const { error } = await supabase
          .from('laboratories')
          .insert({
            name: form.name.trim(),
            location: form.location.trim() || null,
            capacity: form.capacity,
            status: form.status,
            description: form.description.trim() || null,
            is_active: form.is_active,
          });
        if (error) {
          if (error.code === '23505') {
            throw new Error('A laboratory with this name already exists.');
          }
          throw error;
        }
        await logActivity('create_laboratory', `Created laboratory "${form.name}"`);
        toast.success('Laboratory created successfully.');
      }
      setIsDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (lab: Laboratory) => {
    const newActive = !lab.is_active;
    try {
      const { error } = await supabase
        .from('laboratories')
        .update({ is_active: newActive })
        .eq('id', lab.id);
      if (error) throw error;
      await logActivity(
        newActive ? 'activate_laboratory' : 'deactivate_laboratory',
        `${newActive ? 'Activated' : 'Deactivated'} laboratory "${lab.name}"`
      );
      toast.success(`Laboratory ${newActive ? 'activated' : 'deactivated'} successfully.`);
      load();
    } catch {
      toast.error(`Failed to ${newActive ? 'activate' : 'deactivate'} laboratory.`);
    }
  };

  if (loading) {
    return <LiceoLoader size="lg" fullScreen />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laboratories"
        description="Manage laboratory master data"
      >
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Laboratory
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          {labs.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No laboratories found"
              description="Add your first laboratory to get started."
              action={<Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Add Laboratory</Button>}
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lab.location || '—'}</TableCell>
                      <TableCell className="text-sm">{lab.capacity}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          lab.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          lab.status === 'maintenance' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {lab.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={lab.is_active}
                          onCheckedChange={() => toggleActive(lab)}
                          disabled={saving}
                          aria-label={lab.is_active ? 'Deactivate' : 'Activate'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lab)}
                          disabled={saving}
                          aria-label="Edit laboratory"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLab ? 'Edit Laboratory' : 'Add Laboratory'}</DialogTitle>
            <DialogDescription>
              {editingLab
                ? 'Update the laboratory information below.'
                : 'Create a new laboratory for booking.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-rose-500">*</span></Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Computer Lab 1"
                  disabled={saving}
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity <span className="text-rose-500">*</span></Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                  disabled={saving}
                />
                {errors.capacity && <p className="text-xs text-rose-500">{errors.capacity}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Ground Floor, Room 101"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status <span className="text-rose-500">*</span></Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as 'available' | 'maintenance' | 'closed' })}
                  disabled={saving}
                >
                  <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Active for Bookings</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.is_active ? 'Visible in booking forms' : 'Hidden from booking forms'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                  disabled={saving}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingLab ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlaskConical({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31" />
      <path d="M14 2v7.31" />
      <path d="M6 14H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M6 20h12" />
    </svg>
  );
}