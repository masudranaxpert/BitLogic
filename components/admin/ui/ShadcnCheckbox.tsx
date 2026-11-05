'use client';

import React from 'react';
import { Check } from 'lucide-react';

export function ShadcnCheckbox({
  checked,
  onChange,
  ariaLabel = 'Select row',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
        checked
          ? 'bg-emerald-600 text-white shadow-2xs'
          : 'bg-white dark:bg-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] hover:shadow-[inset_0_0_0_1px_#059669]'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
    </button>
  );
}
