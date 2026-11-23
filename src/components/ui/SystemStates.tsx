import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div
    aria-hidden="true"
    className={`rounded-xl bg-[#064E3B]/8 dark:bg-white/[0.06] animate-pulse ${className}`}
  />
);

export const CardSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-[#064E3B]/10 dark:border-white/[0.08] bg-white dark:bg-[#0B1411] p-6 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-8 w-8 rounded-full" />
    </div>
    <SkeletonBlock className="h-7 w-3/4" />
    <SkeletonBlock className="h-4 w-full" />
    <SkeletonBlock className="h-4 w-2/3" />
  </div>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="rounded-3xl border border-dashed border-[#064E3B]/15 dark:border-white/[0.12] bg-white/70 dark:bg-[#0B1411]/70 px-6 py-12 text-center flex flex-col items-center justify-center gap-3">
    <div className="w-12 h-12 rounded-2xl bg-[#064E3B]/8 dark:bg-emerald-500/10 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center">
      {icon || <Inbox className="w-5 h-5" />}
    </div>
    <h3 className="text-base font-bold text-[#0B1B16] dark:text-[#F7F5F0]">{title}</h3>
    <p className="text-xs sm:text-sm text-[#4A635B] dark:text-[#9AB0A7] max-w-md leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
        {actionLabel}
      </Button>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Maʼlumotni yuklashda xatolik',
  message,
  onRetry,
}) => (
  <div
    role="alert"
    className="rounded-3xl border border-rose-500/25 bg-rose-50/70 dark:bg-rose-950/25 px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
  >
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100">{title}</h3>
        <p className="text-xs text-rose-800/80 dark:text-rose-200/80 mt-0.5 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Qayta urinish</span>
      </Button>
    )}
  </div>
);
