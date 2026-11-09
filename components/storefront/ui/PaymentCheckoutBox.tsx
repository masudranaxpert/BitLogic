'use client';

import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useStoreSettings } from '@/context/StoreSettingsContext';

export type StorePaymentMethodId = 'bkash' | 'nagad' | 'rocket' | 'upay';

type PaymentMethodSelectorProps = {
  selectedMethod: StorePaymentMethodId;
  onSelectMethod: (method: StorePaymentMethodId) => void;
  formattedTotal: string;
};

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
}: PaymentMethodSelectorProps) {
  const settings = useStoreSettings();

  const methods: Array<{ id: StorePaymentMethodId; label: string; icon: string }> = [];

  if (settings.bkashEnabled !== false) {
    methods.push({ id: 'bkash', label: 'bKash', icon: '/payments/bkash-icon.svg' });
  }
  if (settings.nagadEnabled !== false) {
    methods.push({ id: 'nagad', label: 'Nagad', icon: '/payments/nagad.svg' });
  }
  if (settings.rocketEnabled === true) {
    methods.push({ id: 'rocket', label: 'Rocket', icon: '/payments/rocket.png' });
  }

  // Fallback if admin accidentally disabled all
  if (methods.length === 0) {
    methods.push({ id: 'bkash', label: 'bKash', icon: '/payments/bkash-icon.svg' });
  }

  // Auto-switch if current selection is not in enabled list
  useEffect(() => {
    if (!methods.some((m) => m.id === selectedMethod) && methods[0]) {
      onSelectMethod(methods[0].id);
    }
  }, [methods, selectedMethod, onSelectMethod]);

  return (
    <div className="space-y-2 pt-1">
      <label className="block text-xs font-bold text-slate-700">
        Payment method
      </label>

      {/* Clean Branded Gateway Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {methods.map((m) => {
          const active = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMethod(m.id)}
              className={`h-11 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-md bg-white border border-slate-100 p-0.5 flex items-center justify-center shrink-0">
                  <img src={m.icon} alt={m.label} className="w-full h-full object-contain" />
                </span>
                <span className="truncate">{m.label}</span>
              </div>

              {active && (
                <div className="w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type CouponInputBoxProps = {
  coupon: string;
  onChangeCoupon: (val: string) => void;
  onApply: () => void;
  message?: string;
  isApplied?: boolean;
};

export function CouponInputBox({
  coupon,
  onChangeCoupon,
  onApply,
  message,
  isApplied = false,
}: CouponInputBoxProps) {
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={coupon}
          onChange={(e) => onChangeCoupon(e.target.value)}
          placeholder="Coupon code"
          aria-label="Coupon code"
          className="flex-1 h-9.5 px-3 rounded-md border border-slate-200 text-xs font-mono text-[#0F172A] placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B] focus:ring-2 focus:ring-[#FF5E5B]/15 transition-all"
        />
        <button
          type="button"
          onClick={onApply}
          className="h-9.5 px-4 rounded-md bg-slate-200 hover:bg-slate-300 text-[#0F172A] font-extrabold text-xs border border-slate-300 cursor-pointer transition-colors shrink-0"
        >
          Apply
        </button>
      </div>
      {message && (
        <p
          className={`text-[11px] font-bold mt-1 m-0 ${
            isApplied ? 'text-emerald-600' : 'text-[#FF5E5B]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
