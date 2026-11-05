'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useStoreNav, type StorefrontVariant } from './StoreNavContext';

const VARIANTS: Array<{
  id: StorefrontVariant;
  label: string;
  dot: string;
}> = [
  { id: 'pop', label: 'Tactile Pop UI', dot: 'bg-[#8B5CF6]' },
  { id: 'classic', label: 'Classic (Tactile Coral)', dot: 'bg-[#FF5E5B]' },
];

export function VariantSwitcherBar() {
  const { variant, setVariant, navigateTo } = useStoreNav();

  return (
    <div className="bg-[#0F172A] text-white border-b border-slate-800 px-3 sm:px-6 py-2 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {VARIANTS.map((v) => {
            const active = variant === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#0F172A] font-bold shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigateTo('admin')}
          className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <SlidersHorizontal size={13} />
          <span>Admin Console</span>
        </button>
      </div>
    </div>
  );
}
