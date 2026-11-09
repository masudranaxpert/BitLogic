'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export type StoreFilterOption<T extends string = string> = {
  id: T;
  label: string;
  count?: number;
};

type StoreSearchBarProps<T extends string = string> = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: StoreFilterOption<T>[];
  activeFilter?: T;
  onFilterChange?: (filter: T) => void;
  className?: string;
};

export function StoreSearchBar<T extends string = string>({
  value,
  onChange,
  placeholder = 'Search...',
  filters,
  activeFilter,
  onFilterChange,
  className = '',
}: StoreSearchBarProps<T>) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${className}`}
    >
      <div className="relative w-full sm:max-w-xs md:max-w-sm lg:max-w-md min-w-0">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-8 rounded border border-slate-300 bg-white text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B] transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {filters && filters.length > 0 && onFilterChange && (
        <div className="flex items-center gap-1 p-1 rounded bg-slate-100 border border-slate-200 overflow-x-auto shrink-0">
          {filters.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`h-7 px-2.5 rounded-xs text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {typeof f.count === 'number' && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      active ? 'text-[#FF5E5B] font-bold' : 'text-slate-500'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
