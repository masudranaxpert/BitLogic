'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/products';

export function OfferRail({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const move = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 300), behavior: 'smooth' });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            aria-label="Next"
            onClick={() => move(1)}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[240px] sm:w-[260px] shrink-0 snap-start"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
