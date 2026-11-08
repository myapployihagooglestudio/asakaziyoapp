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
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-stone-300/90 dark:border-emerald-950/90 bg-[#F6F2E9]/50 dark:bg-[#081815]/50">
      {icon && (
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-[#0B1F1C] border border-stone-200/80 dark:border-[#c5a869]/25 text-[#9e7f3c] dark:text-[#c5a869] mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-[#14221B] dark:text-[#F4F1EA] mb-1.5 headline-balance">
        {title}
      </h4>
      <p className="text-sm text-[#4A5B52] dark:text-[#8FA199] max-w-sm mb-6 leading-relaxed">
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
