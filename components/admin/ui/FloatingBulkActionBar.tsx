'use client';

import React from 'react';
import { X } from 'lucide-react';

export function FloatingBulkActionBar({
  selectedCount,
  onClear,
  actions,
}: {
  selectedCount: number;
  onClear: () => void;
  actions: { label: string; icon?: React.ReactNode; onClick: () => void; destructive?: boolean }[];
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk selection actions"
      className="surface-elevated fixed bottom-18 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 pl-3 rounded-xl max-w-[calc(100vw-1.5rem)] overflow-x-auto"
    >
      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 pr-2.5 border-r border-slate-200 dark:border-slate-700 font-mono tabular-nums whitespace-nowrap shrink-0">
        {selectedCount} Selected
      </span>
      <div className="flex items-center gap-1.5">
        {actions.map((act, i) => (
          <button
            key={i}
            type="button"
            onClick={act.onClick}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-[6px] border inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              act.destructive
                ? 'border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-[6px] cursor-pointer shrink-0"
        aria-label="Clear selection"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
