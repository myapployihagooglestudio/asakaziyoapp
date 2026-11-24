import React from 'react';
import { triggerTactileHaptic } from '../../utils/motionSystem';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'secondary' | 'outline' | 'ghost' | 'champagne' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  onClick,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow,filter] duration-150 rounded-2xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F4EC] dark:focus-visible:ring-offset-[#030706] disabled:opacity-45 disabled:pointer-events-none active:scale-[0.97] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] px-4 py-2 gap-1.5 rounded-xl',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-[15px] min-h-[50px] px-6 py-3 gap-2.5',
  };

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#064E3B] text-[#F7F4EC] hover:bg-[#053E2F] dark:bg-[#C8A85E] dark:text-[#050C09] dark:hover:bg-[#D8BC78] font-bold shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_12px_28px_-10px_rgba(6,78,59,0.5)] dark:shadow-[0_1px_0_rgba(255,255,255,0.48)_inset,0_14px_30px_-10px_rgba(200,168,94,0.48)]',
    champagne:
      'bg-[#C8A85E] text-[#050C09] hover:bg-[#D8BC78] font-bold shadow-[0_1px_0_rgba(255,255,255,0.48)_inset,0_12px_26px_-10px_rgba(200,168,94,0.5)]',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.34)_inset,0_12px_26px_-8px_rgba(16,185,129,0.5)]',
    glass:
      'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:brightness-105',
    secondary:
      'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-[#064E3B]/28 dark:hover:border-white/28',
    outline:
      'backdrop-blur-md bg-white/40 dark:bg-white/[0.04] border border-[#064E3B]/18 text-[#064E3B] hover:bg-white/68 dark:border-white/[0.16] dark:text-[#ECE8DD] dark:hover:bg-white/[0.09] dark:hover:border-white/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    ghost:
      'text-[#2B463E] hover:text-[#091813] hover:bg-white/60 hover:backdrop-blur-md dark:text-[#A3B8B0] dark:hover:text-[#F7F4EC] dark:hover:bg-white/[0.08]',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerTactileHaptic(8);
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
