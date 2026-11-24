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

  // Apple 2026/2027 Liquid Glass as the universal default material across all ASAKA ZIYO cards
  const surfaceStyles = isEmerald
    ? 'az-aurora-surface text-[#F7F5F0] border-emerald-400/22 shadow-[0_24px_58px_-16px_rgba(3,15,11,0.62),inset_0_1px_0_rgba(255,255,255,0.16)]'
    : isGlass
    ? 'az-liquid-glass-elevated text-[#0B1B16] dark:text-[#F7F5F0]'
    : isSubtle
    ? 'az-liquid-glass !bg-[#F4F1EA]/55 dark:!bg-[#0D1714]/52 text-[#0B1B16] dark:text-[#F7F5F0]'
    : elevated || variant === 'elevated'
    ? 'az-liquid-glass-elevated text-[#0B1B16] dark:text-[#F7F5F0]'
    : 'az-liquid-glass-card text-[#0B1B16] dark:text-[#F7F5F0]';

  return (
    <div
      className={`az-container relative rounded-[26px] transition-[transform,border-color,box-shadow,background-color] duration-200 overflow-hidden ${surfaceStyles} ${
        interactive
          ? 'hover:border-[#064E3B]/28 dark:hover:border-emerald-400/38 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-14px_rgba(6,78,59,0.18)] dark:hover:shadow-[0_26px_58px_-14px_rgba(0,0,0,0.82)] active:translate-y-0 active:scale-[0.99] cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {/* Subtle Apple Liquid Glass top specular gleam */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-4 top-0 h-px ${
          ornamental
            ? 'bg-gradient-to-r from-transparent via-[#C8A85E]/70 to-transparent'
            : 'bg-gradient-to-r from-transparent via-white/75 dark:via-white/25 to-transparent'
        }`}
      />
      {children}
    </div>
  );
};
