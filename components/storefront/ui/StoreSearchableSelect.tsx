'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  StatusBadge,
  getOrderStatusTone,
  type StatusBadgeTone,
} from './StoreBadge';

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: StatusBadgeTone;
  meta?: string;
};

type StoreSearchableSelectProps = {
  label?: string;
  required?: boolean;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
};

export function StoreSearchableSelect({
  label,
  required = false,
  options,
  value,
  onChange,
  placeholder = 'Select order...',
  searchPlaceholder = 'Search order...',
  className = '',
}: StoreSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
      (o.badge && o.badge.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-[#FF5E5B]">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full min-h-9.5 px-3 py-2 rounded border bg-white text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
          open
            ? 'border-[#FF5E5B]'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {selected ? (
          <div className="min-w-0 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-bold text-slate-900">{selected.value}</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-900">
              {selected.label}
            </span>
            {selected.sublabel && (
              <span className="font-medium text-slate-600">
                ({selected.sublabel})
              </span>
            )}
            {selected.badge && (
              <StatusBadge
                tone={selected.badgeTone || getOrderStatusTone(selected.badge)}
              >
                {selected.badge}
              </StatusBadge>
            )}
          </div>
        ) : (
          <span className="text-[13px] text-slate-400">{placeholder}</span>
        )}

        <ChevronDown
          size={14}
          className={`text-slate-500 shrink-0 transition-transform ${
            open ? 'rotate-180 text-slate-900' : ''
          }`}
        />
      </button>

      {open && (
        <div className="surface-elevated absolute left-0 right-0 z-40 mt-1 rounded-md border border-slate-200 bg-white overflow-hidden">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full h-8 pl-8 pr-3 rounded border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B]"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs font-medium text-slate-500">
                No matching order found
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = item.value === value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 cursor-pointer border-0 transition-colors ${
                      isSelected ? 'bg-slate-100/80' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 text-xs flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {item.value}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="font-medium text-slate-600">
                          · {item.sublabel}
                        </span>
                      )}
                      {item.badge && (
                        <StatusBadge
                          tone={
                            item.badgeTone || getOrderStatusTone(item.badge)
                          }
                        >
                          {item.badge}
                        </StatusBadge>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-[#FF5E5B] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
