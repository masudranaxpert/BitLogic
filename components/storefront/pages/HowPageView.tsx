'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useStoreNav } from '@/context/StoreNavContext';

const STEPS = [
  {
    step: '1',
    title: 'Select a product & option',
    desc: 'Choose your product and select the option and duration that fits your needs.',
  },
  {
    step: '2',
    title: 'Review warranty & guidelines',
    desc: 'Check the warranty badge and account instructions displayed for your selected option.',
  },
  {
    step: '3',
    title: 'Complete payment',
    desc: 'Pay via bKash or Nagad and submit your Transaction ID at checkout.',
  },
];

export function HowPageView() {
  const { navigateTo } = useStoreNav();

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight m-0">
          How to Order
        </h1>
      </div>

      <div className="space-y-3">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="flex gap-4 p-4 rounded-lg bg-white border border-slate-200/90 items-start"
          >
            <div className="w-8 h-8 rounded-md bg-[#0F172A] text-white font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
              {item.step}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A] m-0">{item.title}</h3>
              <p className="text-xs text-slate-600 m-0 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => navigateTo('shop', { code: 'ALL' })}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs transition-colors cursor-pointer border-0"
        >
          <span>Browse products</span>
          <ArrowRight size={14} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
