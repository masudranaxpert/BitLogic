'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type StorePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function StorePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: StorePaginationProps) {
  if (totalItems <= pageSize || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 ${className}`}
    >
      <div className="text-xs font-semibold text-slate-600 tabular-nums">
        Showing <span className="text-slate-900 font-bold">{startItem}</span>–
        <span className="text-slate-900 font-bold">{endItem}</span> of{' '}
        <span className="text-slate-900 font-bold">{totalItems}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ChevronLeft size={13} />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p) => {
            const active = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded text-xs font-bold tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border border-slate-900'
                    : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="h-8 px-2.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
