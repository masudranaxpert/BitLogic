'use client';

import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { useStoreNav } from './StoreNavContext';

export function MoreProductsCard() {
  const { navigateTo } = useStoreNav();

  return (
    <article className="group bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between transition-all duration-150 shadow-[0_0_0_1px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)] hover:bg-slate-800">
      <div className="space-y-2">
        <div className="w-9 h-9 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center">
          <Layers size={18} />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 pt-1">
          Full Catalog
        </div>
        <h3 className="font-display text-lg font-bold text-white tracking-tight leading-snug">
          View all digital passes
        </h3>
      </div>

      <button
        type="button"
        onClick={() => navigateTo('shop', { code: 'ALL' })}
        className="mt-6 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
      >
        <span>Browse Catalog</span>
        <ArrowRight size={14} strokeWidth={2.2} />
      </button>
    </article>
  );
}
