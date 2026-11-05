'use client';

import React from 'react';

export function SwitchToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md h-9 px-1"
    >
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-[6px] p-0.5 transition-colors duration-150 ${
          checked
            ? 'bg-emerald-600'
            : 'bg-slate-200 dark:bg-slate-800 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-[4px] bg-white shadow-2xs transition-transform duration-150 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
