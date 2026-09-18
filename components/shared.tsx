'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
import type { BookingStatus } from '@/lib/types';

export function StatusBadge({ status, className }: { status: BookingStatus | string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
        status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        status === 'approved' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        status === 'rejected' && 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        status === 'completed' && 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
        status === 'cancelled' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-amber-500': status === 'pending',
        'bg-emerald-500': status === 'approved',
        'bg-rose-500': status === 'rejected',
        'bg-primary-500': status === 'completed',
        'bg-gray-400': status === 'cancelled',
      })} />
      {status}
    </span>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color, trend }: { icon: React.ElementType; label: string; value: string | number; color: string; trend?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400')}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel, confirmLabel, destructive }: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onCancel}>
      <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 h-9 rounded-md border bg-background hover:bg-accent text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 h-9 rounded-md text-sm font-medium text-white transition-colors',
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90',
            )}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ActionConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  destructive?: boolean;
  showNotes?: boolean;
  notesPlaceholder?: string;
  notesValue?: string;
  onNotesChange?: (value: string) => void;
  loading?: boolean;
}

export function ActionConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel,
  destructive,
  showNotes = false,
  notesPlaceholder = 'Admin notes (optional)...',
  notesValue = '',
  onNotesChange,
  loading = false,
}: ActionConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onCancel}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {showNotes && (
          <textarea
            className="w-full min-h-20 rounded-md border border-input bg-background p-3 text-sm mb-4"
            placeholder={notesPlaceholder}
            value={notesValue}
            onChange={(e) => onNotesChange?.(e.target.value)}
            disabled={loading}
          />
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 h-9 rounded-md border bg-background hover:bg-accent text-sm font-medium transition-colors" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 h-9 rounded-md text-sm font-medium text-white transition-colors',
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90',
              loading && 'opacity-50 cursor-not-allowed',
            )}
            disabled={loading}
          >
            {loading && <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-white border-t-transparent rounded-full" />}
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 h-8 rounded-md border text-sm disabled:opacity-50 hover:bg-accent transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-8 h-8 px-2 rounded-md text-sm border transition-colors',
                p === page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent',
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 h-8 rounded-md border text-sm disabled:opacity-50 hover:bg-accent transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export interface ContentDetailsModalProps {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  date?: string;
}

export function ContentDetailsModal({ open, title, content, onClose, date }: ContentDetailsModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="content-details-title">
      <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col">
          <div className="flex items-start justify-between p-4 border-b">
            <div className="flex-1 min-w-0">
              <h3 id="content-details-title" className="text-lg font-semibold truncate">{title}</h3>
              {date && <p className="text-xs text-muted-foreground mt-0.5">{date}</p>}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh] whitespace-pre-wrap text-sm text-foreground">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
