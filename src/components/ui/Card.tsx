import React from 'react';
import { ArabesqueCornerOrnaments } from './GeometricPattern';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  ornamental?: boolean;
  variant?: 'default' | 'elevated' | 'emerald' | 'ivory' | 'glass' | 'obsidian' | string;
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

  const surfaceStyles = isEmerald
    ? 'bg-[radial-gradient(circle_at_50%_15%,#092E1F_0%,#041D13_55%,#010906_100%)] text-[#FFF8E8] border-[#DFBD69]/45 shadow-[0_24px_54px_-12px_rgba(1,9,6,0.62),inset_0_1px_0_rgba(255,246,200,0.22)]'
    : isGlass
    ? 'surface-luxury-glass shadow-[0_14px_36px_-8px_rgba(3,23,15,0.12)] dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.72)]'
    : elevated || variant === 'elevated'
    ? 'bg-[#FFF8E8] dark:bg-[linear-gradient(155deg,rgba(4,29,19,0.88)_0%,rgba(9,46,31,0.72)_50%,rgba(3,23,15,0.94)_100%)] backdrop-blur-xl border-[#8A6621]/22 dark:border-[#DFBD69]/34 shadow-[0_12px_34px_-6px_rgba(3,23,15,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_18px_44px_-8px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,246,200,0.14)]'
    : 'bg-[#F8F5EC]/90 dark:bg-[#03170F]/92 border-[#063D32]/14 dark:border-[#DFBD69]/24 shadow-[inset_0_1px_0_rgba(255,246,200,0.08)]';

  return (
    <div
      className={`relative rounded-[24px] border transition-all duration-300 overflow-hidden az-card-specular ${surfaceStyles} ${
        interactive
          ? 'hover:border-[#DFBD69]/80 dark:hover:border-[#FFF6C8]/70 hover:-translate-y-1 hover:shadow-[0_22px_46px_-10px_rgba(6,61,50,0.18),0_0_20px_rgba(223,189,105,0.18)] dark:hover:shadow-[0_24px_54px_-10px_rgba(0,0,0,0.82),0_0_24px_rgba(223,189,105,0.22)] active:translate-y-0 active:scale-[0.99] cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {(ornamental || isEmerald) && <ArabesqueCornerOrnaments size={22} />}
      {children}
    </div>
  );
};

