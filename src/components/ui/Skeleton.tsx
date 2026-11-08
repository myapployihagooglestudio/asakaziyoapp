import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'banner';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'card' }) => {
  if (variant === 'circle') {
    return (
      <div
        className={`rounded-full bg-stone-200/80 dark:bg-[#0B1F1C] border border-stone-300/60 dark:border-[#c5a869]/20 shimmer-gold ${className}`}
      />
    );
  }

  if (variant === 'text') {
    return (
      <div
        className={`h-4 rounded-lg bg-stone-200/80 dark:bg-[#0B1F1C] border border-stone-300/50 dark:border-[#c5a869]/15 shimmer-gold ${className}`}
      />
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`rounded-3xl h-48 bg-stone-200/70 dark:bg-[#0B1F1C] border border-stone-300/60 dark:border-[#c5a869]/25 shimmer-gold ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 bg-white/80 dark:bg-[#0B1F1C]/80 border border-stone-200/80 dark:border-[#c5a869]/20 shimmer-gold space-y-3 ${className}`}
    >
      <div className="h-5 w-1/3 rounded-md bg-stone-200/80 dark:bg-emerald-950/80" />
      <div className="h-4 w-2/3 rounded-md bg-stone-200/60 dark:bg-emerald-950/60" />
      <div className="h-10 w-full rounded-xl bg-stone-200/50 dark:bg-emerald-950/40 mt-2" />
    </div>
  );
};
