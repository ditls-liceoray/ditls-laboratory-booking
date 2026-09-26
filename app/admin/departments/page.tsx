'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/api';
import type { Department } from '@/lib/types';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Edit, Save, X } from 'lucide-react';
import { LiceoLoader } from '@/components/ui/liceo-loader';
import { toast } from 'sonner';

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setDepts((data || []) as Department[]);
    } catch {
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Department name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({
      name: '',
      code: '',
      is_active: true,
    });
    setErrors({});
    setEditingDept(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      code: dept.code || '',
      is_active: dept.is_active,
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
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: form.name.trim(),
            code: form.code.trim() || null,
            is_active: form.is_active,
          })
          .eq('id', editingDept.id);
        if (error) {
          if (error.code === '23505') {
            throw new Error('A department with this name already exists (case-insensitive).');
          }
          throw error;
        }
        await logActivity('update_department', `Updated department "${form.name}"`);
        toast.success('Department updated successfully.');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            name: form.name.trim(),
            code: form.code.trim() || null,
            is_active: form.is_active,
          });
        if (error) {
          if (error.code === '23505') {
            throw new Error('A department with this name already exists (case-insensitive).');
          }
          throw error;
        }
        await logActivity('create_department', `Created department "${form.name}"`);
        toast.success('Department created successfully.');
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

  const toggleActive = async (dept: Department) => {
    const newActive = !dept.is_active;
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: newActive })
        .eq('id', dept.id);
      if (error) throw error;
      await logActivity(
        newActive ? 'activate_department' : 'deactivate_department',
        `${newActive ? 'Activated' : 'Deactivated'} department "${dept.name}"`
      );
      toast.success(`Department ${newActive ? 'activated' : 'deactivated'} successfully.`);
      load();
    } catch {
      toast.error(`Failed to ${newActive ? 'activate' : 'deactivate'} department.`);
    }
  };

  if (loading) {
    return <LiceoLoader size="lg" fullScreen />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage department master data"
      >
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          {depts.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No departments found"
              description="Add your first department to get started."
              action={<Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Add Department</Button>}
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depts.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dept.code || '—'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={dept.is_active}
                          onCheckedChange={() => toggleActive(dept)}
                          disabled={saving}
                          aria-label={dept.is_active ? 'Deactivate' : 'Activate'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                          disabled={saving}
                          aria-label="Edit department"
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editingDept
                ? 'Update the department information below.'
                : 'Create a new department for teacher assignments.'}
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
                  placeholder="e.g. Department of Computer Science"
                  disabled={saving}
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. DCS"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">Optional short code</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="is_active">Active for Selection</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    disabled={saving}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.is_active ? 'Visible in teacher forms' : 'Hidden from teacher forms'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Building({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h8" />
      <path d="M8 12h8" />
    </svg>
  );
}