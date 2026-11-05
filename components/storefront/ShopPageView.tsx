'use client';

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { products, type Category } from '@/lib/products';
import { useStoreNav } from './StoreNavContext';

const filters: Array<{ code: Category | 'ALL'; label: string }> = [
  { code: 'ALL', label: 'All' },
  { code: 'AI', label: 'AI Tools' },
  { code: 'STREAM', label: 'Streaming' },
  { code: 'WORK', label: 'Work' },
  { code: 'CREATE', label: 'Creative' },
];

export function ShopPageView() {
  const { categoryCode, searchQuery, navigateTo } = useStoreNav();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return products.filter((p) => {
      const codeOk = categoryCode === 'ALL' || p.code === categoryCode;
      const text = `${p.name} ${p.platform} ${p.code}`.toLowerCase();
      const queryOk = !q || text.includes(q);
      return codeOk && queryOk;
    });
  }, [categoryCode, localSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Compact Header & Toolbar — Zero Slop */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {categoryCode === 'ALL'
              ? 'All Products'
              : `${filters.find((f) => f.code === categoryCode)?.label ?? 'Catalog'}`}
          </h1>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {filtered.length}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0 w-full md:w-auto">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-0.5 p-1 bg-slate-200/60 rounded-lg w-full sm:w-auto overflow-x-auto">
            {filters.map((f) => {
              const isActive = categoryCode === f.code;
              return (
                <button
                  key={f.code}
                  type="button"
                  onClick={() => navigateTo('shop', { code: f.code })}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-8 pr-7 bg-white border border-slate-200/90 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B] focus:ring-2 focus:ring-[#FF5E5B]/15 shadow-2xs transition-colors"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Clear"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="product-grid pt-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 mt-5 bg-white rounded-xl border border-slate-200/80 p-6">
          <p className="font-display text-sm font-bold text-slate-800">
            No products found
          </p>
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              navigateTo('shop', { code: 'ALL' });
            }}
            className="mt-3 h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
