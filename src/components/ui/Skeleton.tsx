import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'banner';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'card' }) => {
  if (variant === 'circle') {
    return (
      <div className={`rounded-full bg-stone-800/60 border border-[#c5a869]/20 shimmer-gold ${className}`} />
    );
  }

  if (variant === 'text') {
    return (
      <div className={`h-4 rounded-lg bg-stone-800/60 border border-[#c5a869]/20 shimmer-gold ${className}`} />
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`rounded-3xl h-48 bg-stone-900/80 border border-[#c5a869]/30 shimmer-gold ${className}`} />
    );
  }

  return (
    <div className={`rounded-2xl p-5 bg-stone-900/60 border border-[#c5a869]/25 shimmer-gold space-y-3 ${className}`}>
      <div className="h-5 w-1/3 rounded-md bg-stone-800/80" />
      <div className="h-4 w-2/3 rounded-md bg-stone-800/60" />
      <div className="h-10 w-full rounded-xl bg-stone-800/50 mt-2" />
    </div>
  );
};
