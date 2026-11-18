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
    'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBD69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F5EC] dark:focus-visible:ring-offset-[#010906] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs min-h-[38px] px-3.5 py-2 gap-1.5',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-base min-h-[50px] px-6 py-3 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[linear-gradient(135deg,#8A6621_0%,#DFBD69_25%,#FFF6C8_50%,#D4AF37_75%,#7A5818_100%)] text-[#010906] font-extrabold hover:brightness-105 hover:shadow-[0_8px_24px_-4px_rgba(223,189,105,0.55)] shadow-[0_4px_16px_-2px_rgba(212,175,55,0.42),inset_0_1px_0_rgba(255,255,255,0.65)] border border-[#FFF6C8]/65',
    emerald:
      'bg-[linear-gradient(135deg,#092E1F_0%,#063D32_50%,#075747_100%)] text-[#FFF8E8] hover:brightness-110 border border-[#DFBD69]/45 shadow-[0_6px_20px_-4px_rgba(3,23,15,0.5),inset_0_1px_0_rgba(255,246,200,0.2)]',
    secondary:
      'bg-[#FFF8E8] text-[#03170F] hover:bg-[#F1EBDD] border border-[#063D32]/18 dark:bg-[#041D13] dark:text-[#FFF8E8] dark:hover:bg-[#092E1F] dark:border-[#DFBD69]/32 shadow-xs',
    outline:
      'border border-[#DFBD69]/65 text-[#063D32] dark:text-[#DFBD69] hover:bg-[#DFBD69]/15 hover:border-[#FFF6C8] shadow-[inset_0_1px_0_rgba(255,246,200,0.12)]',
    ghost:
      'text-[#1E3F35] hover:text-[#03170F] hover:bg-[#063D32]/8 dark:text-[#E6DFCE] dark:hover:text-[#FFF8E8] dark:hover:bg-white/8',
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

