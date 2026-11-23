import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  ornamental?: boolean;
  variant?: 'default' | 'elevated' | 'emerald' | 'ivory' | 'glass' | 'obsidian' | 'subtle' | string;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  interactive = false,
  ornamental = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const isEmerald = variant === 'emerald' || variant === 'obsidian';
  const isGlass = variant === 'glass';
  const isSubtle = variant === 'subtle';

  const surfaceStyles = isEmerald
    ? 'bg-gradient-to-br from-[#062C22] via-[#071E17] to-[#05110D] text-[#F7F5F0] border-emerald-400/20 shadow-[0_20px_50px_-14px_rgba(3,15,11,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]'
    : isGlass
    ? 'surface-luxury-glass text-[#0B1B16] dark:text-[#F7F5F0]'
    : isSubtle
    ? 'bg-[#F2EFE9]/80 dark:bg-[#0D1714]/80 text-[#0B1B16] dark:text-[#F7F5F0] border-[#064E3B]/8 dark:border-white/[0.06]'
    : elevated || variant === 'elevated'
    ? 'bg-white dark:bg-[#0C1512] text-[#0B1B16] dark:text-[#F7F5F0] border-[#064E3B]/10 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(6,24,18,0.04),0_12px_32px_-12px_rgba(6,24,18,0.08)] dark:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-white/90 dark:bg-[#0A1210]/95 text-[#0B1B16] dark:text-[#F7F5F0] border-[#064E3B]/9 dark:border-white/[0.07] shadow-[0_1px_2px_rgba(6,24,18,0.03)]';

  return (
    <div
      className={`az-container relative rounded-[24px] border transition-[transform,border-color,box-shadow,background-color] duration-200 overflow-hidden ${surfaceStyles} ${
        interactive
          ? 'hover:border-[#064E3B]/28 dark:hover:border-emerald-400/35 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-14px_rgba(6,78,59,0.14)] dark:hover:shadow-[0_22px_48px_-14px_rgba(0,0,0,0.75)] active:translate-y-0 active:scale-[0.992] cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {ornamental && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A85E]/55 to-transparent"
        />
      )}
      {children}
    </div>
  );
};
