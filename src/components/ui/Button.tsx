import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'secondary' | 'outline' | 'ghost' | 'champagne';
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
    'inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-150 rounded-2xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F0] dark:focus-visible:ring-offset-[#060B09] disabled:opacity-45 disabled:pointer-events-none active:scale-[0.975] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] px-3.5 py-2 gap-1.5 rounded-xl',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-[15px] min-h-[50px] px-6 py-3 gap-2.5',
  };

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#064E3B] text-[#F7F5F0] hover:bg-[#053E2F] dark:bg-[#C8A85E] dark:text-[#07110D] dark:hover:bg-[#D6B974] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.12),0_10px_24px_-10px_rgba(6,78,59,0.45)] dark:shadow-[0_10px_24px_-10px_rgba(200,168,94,0.42)]',
    champagne:
      'bg-[#C8A85E] text-[#07110D] hover:bg-[#D6B974] font-bold shadow-[0_8px_22px_-10px_rgba(200,168,94,0.45)]',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-[0_8px_20px_-8px_rgba(16,185,129,0.45)]',
    secondary:
      'bg-[#F2EFE9] text-[#0B1B16] hover:bg-[#E7E2D8] border border-[#064E3B]/10 dark:bg-white/[0.06] dark:text-[#F7F5F0] dark:hover:bg-white/[0.11] dark:border-white/[0.08]',
    outline:
      'border border-[#064E3B]/18 text-[#064E3B] hover:bg-[#064E3B]/6 dark:border-white/[0.14] dark:text-[#E8E4DA] dark:hover:bg-white/[0.07] dark:hover:border-white/[0.24]',
    ghost:
      'text-[#334F46] hover:text-[#0B1B16] hover:bg-[#064E3B]/6 dark:text-[#A3B8B0] dark:hover:text-[#F7F5F0] dark:hover:bg-white/[0.07]',
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
