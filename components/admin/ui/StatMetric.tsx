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

  return (
    <div className="p-5">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums mt-1.5">
        {value}
      </div>
      {hint || badge ? (
        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400 dark:text-slate-500">
          {hint ? <span>{hint}</span> : null}
          {badge ? (
            <span
              className={`px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold tabular-nums ${badgeClasses[tone]}`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
