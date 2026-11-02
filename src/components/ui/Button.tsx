import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
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
    'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a869] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#c5a869] to-[#b38f46] text-[#071614] font-semibold hover:from-[#d4af37] hover:to-[#c5a869] shadow-sm',
    secondary:
      'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/60 border border-emerald-700/30 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/50',
    outline:
      'border border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/10 hover:border-[#c5a869]',
    ghost:
      'text-stone-300 hover:text-stone-100 hover:bg-white/5 dark:text-stone-400 dark:hover:text-stone-200',
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
