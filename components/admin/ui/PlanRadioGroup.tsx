'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type PlanRadioOption = {
  value: string;
  label: string;
  hint?: string;
};

export function PlanRadioGroup({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: PlanRadioOption[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn('grid gap-2', className)}
    >
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-md border px-3 text-left text-xs transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
              checked
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                checked
                  ? 'border-emerald-600'
                  : 'border-slate-300 dark:border-slate-600',
              )}
              aria-hidden
            >
              {checked ? (
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              ) : null}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                checked
                  ? 'font-semibold text-slate-900 dark:text-slate-50'
                  : 'font-medium text-slate-700 dark:text-slate-300',
              )}
            >
              {opt.label}
            </span>
            {opt.hint ? (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
