import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  variant?: 'default' | 'elevated' | 'emerald' | 'ivory' | 'glass' | string;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  interactive = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const isEmerald = variant === 'emerald';
  const isGlass = variant === 'glass';

  const surfaceStyles = isEmerald
    ? 'bg-gradient-to-br from-[#063D32] via-[#075747] to-[#042B25] text-[#F8F5EC] border-[#C6A45C]/35 shadow-[0_20px_45px_-12px_rgba(4,43,37,0.35)]'
    : isGlass
    ? 'surface-luxury-glass shadow-[0_12px_32px_-8px_rgba(4,43,37,0.1)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)]'
    : elevated || variant === 'elevated'
    ? 'bg-white dark:bg-[#06241E] border-[#063D32]/12 dark:border-[#C6A45C]/24 shadow-[0_8px_28px_-6px_rgba(4,43,37,0.07)] dark:shadow-[0_14px_34px_-8px_rgba(0,0,0,0.58)]'
    : 'bg-[#F1EBDD]/75 dark:bg-[#041D18]/95 border-[#063D32]/10 dark:border-[#075747]/40';

  return (
    <div
      className={`relative rounded-[22px] border transition-all duration-300 overflow-hidden ${surfaceStyles} ${
        interactive
          ? 'hover:border-[#C6A45C]/65 dark:hover:border-[#C6A45C]/65 hover:-translate-y-1 hover:shadow-[0_18px_38px_-10px_rgba(6,61,50,0.14)] dark:hover:shadow-[0_20px_44px_-10px_rgba(0,0,0,0.72)] active:translate-y-0 cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
