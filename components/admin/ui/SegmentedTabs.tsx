'use client';

import React from 'react';

function TabButton<T extends string>({
  opt,
  active,
  onChange,
  dense,
  segmented,
}: {
  opt: { value: T; label: string; count?: number };
  active: boolean;
  onChange: (next: T) => void;
  dense?: boolean;
  /** Pill-strip style (clear selected fill). */
  segmented?: boolean;
}) {
  const base =
    dense
      ? `h-9 px-2 inline-flex items-center justify-center text-xs font-medium whitespace-nowrap rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
          active
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold border border-slate-200 dark:border-slate-700 shadow-sm'
            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
        }`
      : segmented
        ? `h-7 px-3 rounded font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            active
              ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
              : 'text-slate-600 dark:text-slate-400'
          }`
        : `h-9 px-3 inline-flex items-center text-xs font-medium whitespace-nowrap shrink-0 rounded-md border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            active
              ? 'bg-white dark:bg-slate-900 border-emerald-600 text-slate-900 dark:text-slate-100 font-semibold'
              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          }`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onChange(opt.value)}
      className={base}
    >
      <span className="truncate">{opt.label}</span>
      {typeof opt.count === 'number' && (
        <span
          className={`ml-1.5 font-mono tabular-nums text-[11px] shrink-0 ${
            active
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {opt.count}
        </span>
      )}
    </button>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  layout = 'row',
  pinCount = 3,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  /**
   * `wrap` — mobile: 3-col chips; desktop: 2–3 quick tabs + select.
   * `row` — classic pill strip.
   */
  layout?: 'row' | 'wrap';
  /** How many quick tabs to pin on desktop when layout=wrap. */
  pinCount?: number;
}) {
  if (layout === 'wrap') {
    const pin = Math.max(1, pinCount);
    const pinned = options.slice(0, pin);
    const more = options.slice(pin);
    const selectShowsExtra = !pinned.some((o) => o.value === value);
    const selectedMore = more.find((o) => o.value === value);

    return (
      <>
        {/* Mobile: 3-up grid */}
        <div role="tablist" className="grid grid-cols-3 gap-1.5 w-full lg:hidden">
          {options.map((opt) => (
            <TabButton
              key={opt.value}
              opt={opt}
              active={opt.value === value}
              onChange={onChange}
              dense
            />
          ))}
        </div>

        {/* Desktop: quick tabs + More select */}
        <div className="hidden lg:flex items-center gap-2">
          <div
            role="tablist"
            className="surface-pill-segment inline-flex items-center h-9 p-0.5 rounded-md text-xs shrink-0"
          >
            {pinned.map((opt) => (
              <TabButton
                key={opt.value}
                opt={opt}
                active={opt.value === value}
                onChange={onChange}
                segmented
              />
            ))}
          </div>

          {more.length > 0 ? (
            <select
              value={selectShowsExtra ? value : ''}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) {
                  onChange(pinned[0].value);
                  return;
                }
                onChange(next as T);
              }}
              className={`h-9 min-w-[7.5rem] max-w-[11rem] pl-3 pr-8 text-xs rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600/40 ${
                selectShowsExtra
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-600 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium'
              }`}
              aria-label="More filters"
              title={selectedMore?.label ?? 'More filters'}
            >
              <option value="">More…</option>
              {more.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {typeof opt.count === 'number' ? ` (${opt.count})` : ''}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div
      role="tablist"
      className="surface-pill-segment inline-flex items-center p-0.5 rounded-md h-9 max-w-full overflow-x-auto gap-0.5"
    >
      {options.map((opt) => (
        <TabButton
          key={opt.value}
          opt={opt}
          active={opt.value === value}
          onChange={onChange}
          segmented
        />
      ))}
    </div>
  );
}
