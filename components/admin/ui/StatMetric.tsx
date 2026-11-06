'use client';

import React from 'react';

export function StatMetric({
  label,
  value,
  badge,
  hint,
  tone = 'emerald',
}: {
  label: string;
  value: string | number;
  /** Optional status chip — omit fake trends like "↑ 18%". */
  badge?: string;
  /** Quiet helper under the value (e.g. "across 9 products"). */
  hint?: string;
  tone?: 'emerald' | 'amber' | 'slate';
}) {
  const badgeClasses = {
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    slate:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  const isMoney = typeof value === 'string' && value.includes('৳');

  return (
    <div className="p-3 sm:p-5">
      <div className="text-[11px] sm:text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </div>
      <div
        className={`mt-1 sm:mt-1.5 tracking-tight text-slate-900 dark:text-slate-50 tabular-nums ${
          isMoney
            ? 'admin-price text-base sm:text-2xl font-semibold'
            : 'font-display text-lg sm:text-2xl font-bold'
        }`}
      >
        {value}
      </div>
      {hint || badge ? (
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {hint ? <span>{hint}</span> : null}
          {badge ? (
            <span
              className={`px-1.5 py-0.5 rounded-[4px] text-xs font-semibold tabular-nums ${badgeClasses[tone]}`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
