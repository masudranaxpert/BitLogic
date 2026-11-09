'use client';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, KeyRound, Zap, ClipboardList, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SourcingValue = 'own' | 'supplier_auto' | 'supplier_manual' | 'own_then_supplier';

export interface SourcingOptionConfig {
  value: SourcingValue;
  label: string;
  sublabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: {
    bg: string;
    text: string;
    border: string;
    icon: string;
  };
}

export const SOURCING_OPTIONS: SourcingOptionConfig[] = [
  {
    value: 'own',
    label: 'Vault Stock',
    sublabel: 'Manual / Vault',
    description: 'Deliver accounts directly stored in your Credentials Vault.',
    icon: KeyRound,
    color: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200/80 dark:border-amber-800/60',
      icon: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    value: 'supplier_auto',
    label: 'Supplier Auto-Buy',
    sublabel: 'Instant API',
    description: 'Automatic instant purchase via API as soon as payment verifies.',
    icon: Zap,
    color: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-200/80 dark:border-emerald-800/60',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
  },
  {
    value: 'supplier_manual',
    label: 'Supplier Manual',
    sublabel: 'Click to Buy',
    description: 'Purchase manually with 1-click on order fulfillment screen.',
    icon: ClipboardList,
    color: {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-800 dark:text-sky-300',
      border: 'border-sky-200/80 dark:border-sky-800/60',
      icon: 'text-sky-600 dark:text-sky-400',
    },
  },
  {
    value: 'own_then_supplier',
    label: 'Vault First → Supplier Auto',
    sublabel: 'Fallback to supplier',
    description: 'Uses vault credentials first, auto buys from supplier when empty.',
    icon: RefreshCw,
    color: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-200/80 dark:border-indigo-800/60',
      icon: 'text-indigo-600 dark:text-indigo-400',
    },
  },
];

interface SourcingSelectProps {
  value: SourcingValue | string;
  onChange: (value: SourcingValue) => void;
  className?: string;
  disabled?: boolean;
}

export function SourcingSelect({
  value,
  onChange,
  className,
  disabled = false,
}: SourcingSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = useMemo(() => {
    return SOURCING_OPTIONS.find((opt) => opt.value === value) || SOURCING_OPTIONS[0];
  }, [value]);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, 320),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const handleScrollOrResize = () => updateCoords();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const SelectedIcon = selected.icon;

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-left shadow-xs transition-all',
          'hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-emerald-600 ring-2 ring-emerald-600/20 dark:border-emerald-500',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
              selected.color.bg,
              selected.color.border,
            )}
          >
            <SelectedIcon className={cn('h-3.5 w-3.5', selected.color.icon)} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 truncate">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {selected.label}
            </span>
            <span className="ml-1.5 text-[11px] font-normal text-slate-400 dark:text-slate-500">
              ({selected.sublabel})
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180 text-emerald-600 dark:text-emerald-400',
          )}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <div className="space-y-1">
              {SOURCING_OPTIONS.map((opt) => {
                const isSelected = opt.value === selected.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'group flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors',
                      isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-transform group-hover:scale-105',
                        opt.color.bg,
                        opt.color.border,
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', opt.color.icon)} strokeWidth={2.2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          ({opt.sublabel})
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {opt.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
