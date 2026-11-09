import React from 'react';
import { Check } from 'lucide-react';
import type { Plan } from '@/lib/products';
import { formatPrice } from '@/lib/products';

type QoPlanChipsProps = {
  groupLabel: string;
  plans: Plan[];
  selectedId: string;
  onSelect: (planId: string) => void;
  hasError?: boolean;
};

export function QoPlanChips({
  plans,
  selectedId,
  onSelect,
  hasError = false,
}: QoPlanChipsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-[#0F172A]">
            Select option
          </span>
          {hasError && !selectedId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-2xs">
              Required
            </span>
          )}
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className="text-[11px] font-bold text-[#FF5E5B] hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1.5" role="radiogroup" aria-label="Choose a plan">
        {plans.map((plan) => {
          const active = plan.id === selectedId;
          const soldOut = plan.canOrder === false;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={soldOut}
              onClick={() => onSelect(plan.id)}
              className={`w-full px-3.5 py-2.5 rounded-lg border flex items-center justify-between gap-3 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                  : hasError && !selectedId
                    ? 'bg-red-50/40 border-red-400 hover:border-red-500 text-[#0F172A] ring-1 ring-red-400/50'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-[#0F172A]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    active
                      ? 'border-[#FF5E5B] bg-[#FF5E5B] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {active && <Check size={10} strokeWidth={3} />}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-[13px] font-bold leading-snug break-words">
                    {plan.label}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-tight shrink-0 ${
                      active
                        ? 'bg-[#FF5E5B] text-white'
                        : 'bg-[#FFF1F0] text-[#FF5E5B] border border-[#FF5E5B]/20'
                    }`}
                  >
                    {plan.duration}
                  </span>
                  {soldOut ? (
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Out of stock</span>
                  ) : plan.inStock === false ? (
                    <span className="text-[10px] font-extrabold uppercase text-amber-600">Pre-order</span>
                  ) : null}
                </div>
              </div>

              <span
                className={`font-mono text-xs font-extrabold tabular-nums shrink-0 ${
                  active ? 'text-[#FACC15]' : 'text-slate-600'
                }`}
              >
                {formatPrice(plan.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
