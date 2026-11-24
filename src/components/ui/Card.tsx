import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  ornamental?: boolean;
  variant?: 'default' | 'elevated' | 'emerald' | 'ivory' | 'glass' | 'obsidian' | 'subtle' | 'editorial' | string;
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
  const isEditorial = variant === 'editorial';

  const surfaceStyles = isEmerald
    ? 'az-aurora-surface text-[#F7F4EC] border-emerald-400/20 shadow-[0_26px_62px_-18px_rgba(2,12,8,0.72),inset_0_1px_0_rgba(255,255,255,0.16)]'
    : isEditorial
    ? 'az-editorial-sheet text-[#091813] dark:text-[#F7F4EC]'
    : isGlass
    ? 'az-liquid-glass-elevated text-[#091813] dark:text-[#F7F4EC]'
    : isSubtle
    ? 'az-liquid-glass !bg-[#F4F1E8]/58 dark:!bg-[#0B1512]/58 text-[#091813] dark:text-[#F7F4EC]'
    : elevated || variant === 'elevated'
    ? 'az-liquid-glass-elevated text-[#091813] dark:text-[#F7F4EC]'
    : 'az-liquid-glass-card text-[#091813] dark:text-[#F7F4EC]';

  return (
    <div
      className={`az-container relative rounded-[26px] transition-[transform,border-color,box-shadow,background-color] duration-200 overflow-hidden ${surfaceStyles} ${
        interactive
          ? 'hover:border-[#064E3B]/28 dark:hover:border-emerald-400/38 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-16px_rgba(6,78,59,0.2)] dark:hover:shadow-[0_28px_64px_-16px_rgba(0,0,0,0.88)] active:translate-y-0 active:scale-[0.99] cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {/* Apple Pro Liquid Glass top specular edge gleam */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-5 top-0 h-px ${
          ornamental
            ? 'bg-gradient-to-r from-transparent via-[#C8A85E]/65 to-transparent'
            : 'bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent'
        }`}
      />
      {children}
    </div>
  );
};
