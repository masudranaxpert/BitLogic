'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

/** 1 … 4 5 [6] 7 8 … 20 — always shows first, last and two neighbours. */
function pageList(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) { start = 2; end = 4; }
  if (current >= total - 2) { start = total - 3; end = total - 1; }
  const out: Array<number | 'gap'> = [1];
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('gap');
  out.push(total);
  return out;
}

const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer';

export function PaginationFooter({
  totalItems,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  sizes = [10, 25, 50, 100],
}: {
  totalItems: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sizes?: number[];
}) {
  const controlled = Boolean(onPageChange);
  const [internalPage, setInternalPage] = useState(currentPage);
  const [internalSize, setInternalSize] = useState(pageSize);

  const size = onPageSizeChange ? pageSize : internalSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const page = Math.min(totalPages, Math.max(1, controlled ? currentPage : internalPage));
  const startItem = totalItems === 0 ? 0 : (page - 1) * size + 1;
  const endItem = Math.min(totalItems, page * size);

  const go = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setInternalPage(clamped);
    onPageChange?.(clamped);
  };

  if (totalItems === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-slate-200/80 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800 dark:text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular-nums">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {startItem}–{endItem}
          </span>{' '}
          of <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItems}</span>
        </span>
        <label className="flex items-center gap-2 text-slate-500">
          <span>Rows</span>
          <select
            value={size}
            onChange={(e) => {
              const n = Number(e.target.value);
              setInternalSize(n);
              setInternalPage(1);
              onPageSizeChange?.(n);
              onPageChange?.(1);
            }}
            aria-label="Rows per page"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 tabular-nums text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            {sizes.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <button type="button" onClick={() => go(1)} disabled={page <= 1} aria-label="First page" className={`${iconBtn} hidden sm:inline-flex`}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page" className={iconBtn}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageList(page, totalPages).map((n, i) =>
            n === 'gap' ? (
              <span key={`gap-${i}`} className="inline-flex h-9 w-6 items-end justify-center pb-2 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => go(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 font-medium tabular-nums cursor-pointer ${
                  n === page
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={iconBtn}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Last page" className={`${iconBtn} hidden sm:inline-flex`}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
