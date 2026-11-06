'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

export function EmptyTableState({
  title,
  description,
  onReset,
  resetLabel = 'Reset',
}: {
  title: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <div className="py-14 px-4 text-center">
      <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
        {title}
      </p>
      {description ? (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-sm mx-auto m-0">
          {description}
        </p>
      ) : null}
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 pl-3 pr-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          <span>{resetLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
