'use client';

import React from 'react';

type StoreButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | 'primary'
    | 'dark'
    | 'blue'
    | 'emerald'
    | 'soft-red'
    | 'secondary'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export function StoreButton({
  variant = 'dark',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: StoreButtonProps) {
  const variantClasses = {
    primary:
      'bg-[#FF5E5B] hover:bg-[#e04845] text-white border border-[#e04845] shadow-2xs',
    dark: 'bg-[#0F172A] hover:bg-[#1e293b] text-white border border-[#0F172A] shadow-2xs',
    blue: 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-700 shadow-2xs',
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 shadow-2xs',
    'soft-red':
      'bg-[#FFF1F0] hover:bg-[#FF5E5B] text-[#e04845] hover:text-white border border-[#FF5E5B]/30 shadow-2xs',
    secondary:
      'bg-slate-100 hover:bg-slate-200/80 text-[#0F172A] border border-slate-300 shadow-2xs',
    outline:
      'bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 shadow-2xs',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs rounded gap-1.5',
    md: 'h-9 px-3.5 text-xs rounded gap-1.5',
    lg: 'h-10 px-4 text-[13px] rounded gap-2',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition-all active:translate-y-[0.5px] cursor-pointer disabled:opacity-50 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
