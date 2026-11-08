import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'secondary' | 'outline' | 'ghost';
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
    'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A45C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5EC] dark:focus-visible:ring-offset-[#031814] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] px-3.5 py-2 gap-1.5',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-base min-h-[50px] px-6 py-3 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#C6A45C] via-[#D4B46E] to-[#B38F45] text-[#042B25] font-bold hover:brightness-105 shadow-[0_4px_14px_-2px_rgba(198,164,92,0.4)] border border-[#DCC58C]/50',
    emerald:
      'bg-gradient-to-r from-[#063D32] to-[#075747] text-[#F8F5EC] hover:from-[#075747] hover:to-[#063D32] border border-[#C6A45C]/35 shadow-sm',
    secondary:
      'bg-[#F1EBDD] text-[#042B25] hover:bg-[#E6DEC8] border border-[#063D32]/15 dark:bg-[#082E26] dark:text-[#F8F5EC] dark:hover:bg-[#0A382E] dark:border-[#C6A45C]/25',
    outline:
      'border border-[#C6A45C]/55 text-[#063D32] dark:text-[#DCC58C] hover:bg-[#C6A45C]/12 hover:border-[#C6A45C]',
    ghost:
      'text-[#2C4A42] hover:text-[#042B25] hover:bg-[#063D32]/8 dark:text-[#D4CFC3] dark:hover:text-[#F8F5EC] dark:hover:bg-white/8',
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
