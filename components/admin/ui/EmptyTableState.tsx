'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

export function EmptyTableState({
  title = 'No matching records',
  description = 'Try clearing your search or switching tabs.',
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="py-12 px-4 text-center">
      <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        {description}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3.5 pl-3 pr-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
