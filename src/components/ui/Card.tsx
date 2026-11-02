import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
        elevated
          ? 'bg-white dark:bg-[#0d211e] border-stone-200 dark:border-[#c5a869]/20 shadow-sm'
          : 'bg-stone-50/80 dark:bg-[#091a18]/90 border-stone-200/80 dark:border-emerald-950/80'
      } ${
        interactive
          ? 'hover:border-[#c5a869]/40 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
