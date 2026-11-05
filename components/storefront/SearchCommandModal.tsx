'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { products, startingAmount, type Product } from '@/lib/products';
import { useStoreNav } from './StoreNavContext';

export function SearchCommandModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { navigateTo } = useStoreNav();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const planText = p.plans.map((pl) => pl.label).join(' ');
      return `${p.name} ${p.platform} ${p.code} ${planText}`
        .toLowerCase()
        .includes(q);
    });
  }, [query]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const safeActiveIndex =
    filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0;

  const handleSelectProduct = (product: Product) => {
    navigateTo('product', { productId: product.id });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
    } else if (e.key === 'Enter' && filtered[safeActiveIndex]) {
      e.preventDefault();
      handleSelectProduct(filtered[safeActiveIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-[2px] flex items-start justify-center pt-14 sm:pt-24 px-3.5 sm:px-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-xl border border-slate-200 shadow-2xl shadow-slate-950/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Clean Search Input Header */}
        <div className="flex items-center gap-3 px-4 h-13 border-b border-slate-100 bg-white">
          <Search size={17} className="text-slate-400 shrink-0" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search products..."
            style={{ outline: 'none', boxShadow: 'none' }}
            className="w-full h-full bg-transparent text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 placeholder:font-normal border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0 cursor-pointer border-0 bg-transparent"
              aria-label="Clear search"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0 cursor-pointer border-0 bg-transparent"
              aria-label="Close search"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* Clean, Uncluttered Results List */}
        <div className="max-h-[340px] overflow-y-auto p-1.5 divide-y divide-slate-100/70">
          {filtered.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <p className="text-xs font-semibold text-slate-500 m-0">
                No products found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            filtered.map((p, idx) => {
              const isHighlighted = idx === safeActiveIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelectProduct(p)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer border-0 ${
                    isHighlighted ? 'bg-slate-100/90' : 'bg-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200/90 shrink-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[#0F172A] truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                        {p.platform}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white border border-white/10 shadow-xs whitespace-nowrap"
                      lang="bn"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] shrink-0" />
                      <span className="font-sans text-xs font-extrabold text-[#FACC15] tabular-nums tracking-tight">
                        ৳{startingAmount(p)}
                      </span>
                      <span className="text-[10.5px] font-semibold text-slate-100 leading-none">
                        থেকে শুরু
                      </span>
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
