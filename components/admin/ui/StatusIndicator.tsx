'use client';

import React from 'react';

export function StatusIndicator({
  tone,
  label,
  detail,
}: {
  tone: 'emerald' | 'amber' | 'red' | 'zinc' | 'blue' | 'purple';
  label: string;
  detail?: string;
  dot?: boolean;
}) {
  const toneClasses = {
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    red:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
    blue:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    purple:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
    zinc:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-xs font-medium whitespace-nowrap shrink-0 ${toneClasses[tone]}`}
    >
      <span>{label}</span>
      {detail && (
        <span className="font-mono tabular-nums text-[11px] opacity-80">
          · {detail}
        </span>
      )}
    </span>
  );
}
