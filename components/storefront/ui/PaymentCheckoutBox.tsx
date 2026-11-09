'use client';

import React from 'react';
import { ShieldCheck, Smartphone, Check } from 'lucide-react';
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
  formattedTotal,
}: PaymentMethodSelectorProps) {
  const settings = useStoreSettings();

  const methods: Array<{ id: StorePaymentMethodId; label: string; icon: string }> = [
    { id: 'bkash', label: 'bKash', icon: '/payments/bkash-icon.svg' },
    { id: 'nagad', label: 'Nagad', icon: '/payments/nagad.svg' },
  ];

  if (settings.rocketEnabled) {
    methods.push({ id: 'rocket', label: 'Rocket', icon: '/payments/rocket.png' });
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-900">Payment Gateway</span>
        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Automated Instant Verification
        </span>
      </div>

      {/* Branded Gateway Cards Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {methods.map((m) => {
          const active = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMethod(m.id)}
              className={`h-12 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs ring-1 ring-indigo-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-white border border-slate-100 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img src={m.icon} alt={m.label} className="w-full h-full object-contain" />
                </span>
                <span className="truncate">{m.label}</span>
              </div>

              {active && (
                <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Gateway Transition Notice */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-500">
            Clicking <strong>Place Order</strong> will redirect directly to the secure <strong>{selectedMethod.toUpperCase()}</strong> gateway.
          </span>
        </div>
        <span className="font-mono text-xs font-black text-slate-900 shrink-0 ml-2">
          {formattedTotal}
        </span>
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
