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
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-600',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-amber-500': status === 'pending',
        'bg-emerald-500': status === 'approved',
        'bg-rose-500': status === 'rejected',
        'bg-blue-500': status === 'completed',
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
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', color)}>
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
