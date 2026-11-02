import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}) => {
  const btnLabel = action?.label || actionLabel;
  const btnOnClick = action?.onClick || onAction;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-emerald-950/80 bg-stone-50/50 dark:bg-[#091a18]/40">
      {icon && (
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-stone-100 dark:bg-emerald-950/60 text-[#c5a869] mb-4">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
        {title}
      </h4>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {btnLabel && btnOnClick && (
        <Button variant="outline" size="sm" onClick={btnOnClick}>
          {btnLabel}
        </Button>
      )}
    </div>
  );
};
