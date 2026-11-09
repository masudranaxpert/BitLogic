'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

type DurationBadgeProps = {
  children: React.ReactNode;
  inverted?: boolean;
  className?: string;
};

export function DurationBadge({
  children,
  inverted = false,
  className = '',
}: DurationBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
        inverted
          ? 'bg-[#FF5E5B] text-white'
          : 'bg-[#FFF1F0] text-[#e04845] border border-[#FF5E5B]/25'
      } ${className}`}
    >
      {children}
    </span>
  );
}

type WarrantyBadgeProps = {
  label: string;
  isLoginOnly?: boolean;
  expired?: boolean;
  showIcon?: boolean;
  solid?: boolean;
  className?: string;
};

export function WarrantyBadge({
  label,
  isLoginOnly = false,
  expired = false,
  showIcon = false,
  solid = false,
  className = '',
}: WarrantyBadgeProps) {
  if (solid) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 ${
          expired
            ? 'bg-slate-200 text-slate-700'
            : isLoginOnly
              ? 'bg-[#FF5E5B] text-white'
              : 'bg-[#0F172A] text-white'
        } ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            expired
              ? 'bg-slate-500'
              : isLoginOnly
                ? 'bg-amber-200'
                : 'bg-emerald-400'
          }`}
        />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
        expired
          ? 'bg-slate-100 text-slate-600 border border-slate-200'
          : isLoginOnly
            ? 'bg-[#FFF1F0] text-[#e04845] border border-[#FF5E5B]/25'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      } ${className}`}
    >
      {showIcon && !isLoginOnly && !expired && <ShieldCheck size={12} />}
      <span>{label}</span>
    </span>
  );
}

export type StatusBadgeTone =
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'coral'
  | 'slate';

export function getOrderStatusTone(status: string): StatusBadgeTone {
  switch (status) {
    case 'Active':
      return 'emerald';
    case 'Delivered':
      return 'blue';
    case 'Pending (10–24h)':
    case 'Pending Verification':
      return 'amber';
    case 'Payment Rejected':
      return 'rose';
    case 'Expired':
      return 'rose';
    case 'Refunded':
      return 'violet';
    case 'Warranty Claim':
      return 'rose';
    default:
      return 'slate';
  }
}

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  dot?: boolean;
  className?: string;
};

export function StatusBadge({
  children,
  tone = 'emerald',
  dot = true,
  className = '',
}: StatusBadgeProps) {
  const tones: Record<StatusBadgeTone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    coral: 'bg-[#FFF1F0] text-[#e04845] border-[#FF5E5B]/30',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors: Record<StatusBadgeTone, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    coral: 'bg-[#FF5E5B]',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold shrink-0 ${tones[tone]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[tone]}`} />
      )}
      <span>{children}</span>
    </span>
  );
}
