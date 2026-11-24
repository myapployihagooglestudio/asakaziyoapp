import React from 'react';

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
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow,filter] duration-150 rounded-2xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F0] dark:focus-visible:ring-offset-[#060B09] disabled:opacity-45 disabled:pointer-events-none active:scale-[0.97] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] px-3.5 py-2 gap-1.5 rounded-xl',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-[15px] min-h-[50px] px-6 py-3 gap-2.5',
  };

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#064E3B]/92 backdrop-blur-md text-[#F7F5F0] hover:bg-[#053E2F] dark:bg-[#C8A85E] dark:text-[#07110D] dark:hover:bg-[#D6B974] font-bold shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_12px_28px_-10px_rgba(6,78,59,0.48)] dark:shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_12px_28px_-10px_rgba(200,168,94,0.45)]',
    champagne:
      'bg-[#C8A85E] text-[#07110D] hover:bg-[#D6B974] font-bold shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_10px_24px_-10px_rgba(200,168,94,0.48)]',
    emerald:
      'bg-emerald-600/92 backdrop-blur-md text-white hover:bg-emerald-500 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.32)_inset,0_10px_24px_-8px_rgba(16,185,129,0.48)]',
    glass:
      'az-liquid-glass-pill text-[#0B1B16] dark:text-[#F7F5F0] hover:brightness-105',
    secondary:
      'az-liquid-glass-pill text-[#0B1B16] dark:text-[#F7F5F0] hover:border-[#064E3B]/25 dark:hover:border-white/25',
    outline:
      'backdrop-blur-md bg-white/35 dark:bg-white/[0.04] border border-[#064E3B]/18 text-[#064E3B] hover:bg-white/60 dark:border-white/[0.16] dark:text-[#E8E4DA] dark:hover:bg-white/[0.09] dark:hover:border-white/[0.26] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    ghost:
      'text-[#334F46] hover:text-[#0B1B16] hover:bg-white/55 hover:backdrop-blur-md dark:text-[#A3B8B0] dark:hover:text-[#F7F5F0] dark:hover:bg-white/[0.08]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
