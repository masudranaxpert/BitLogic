'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export function PaginationFooter({
  totalItems,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
}: {
  totalItems: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const [internalPage, setInternalPage] = useState(currentPage);
  const [internalSize, setInternalSize] = useState(pageSize);

  const activePage = onPageChange ? currentPage : internalPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / internalSize));
  const startItem = totalItems === 0 ? 0 : (activePage - 1) * internalSize + 1;
  const endItem = Math.min(totalItems, activePage * internalSize);

  const handlePage = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setInternalPage(clamped);
    onPageChange?.(clamped);
  };

  if (totalItems === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/40 rounded-b-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <span>Showing per page</span>
        <select
          value={internalSize}
          onChange={(e) => {
            setInternalSize(Number(e.target.value));
            setInternalPage(1);
          }}
          aria-label="Rows per page"
          className="px-2 py-1 text-xs font-mono tabular-nums font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <span className="font-mono tabular-nums">
          <strong className="text-slate-900 dark:text-slate-100">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-slate-900 dark:text-slate-100">{totalItems}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => handlePage(1)}
          disabled={activePage <= 1}
          aria-label="First page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handlePage(activePage - 1)}
          disabled={activePage <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold font-mono text-xs tabular-nums">
          {activePage}
        </span>
        {totalPages > 1 && (
          <button
            type="button"
            onClick={() => handlePage(activePage === 1 ? 2 : 1)}
            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-mono text-xs tabular-nums cursor-pointer"
          >
            {activePage === 1 ? 2 : 1}
          </button>
        )}
        <button
          type="button"
          onClick={() => handlePage(activePage + 1)}
          disabled={activePage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handlePage(totalPages)}
          disabled={activePage >= totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
