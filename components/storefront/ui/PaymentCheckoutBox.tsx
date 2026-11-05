'use client';

import React from 'react';

export const STORE_PAYMENT_METHODS = [
  { id: 'bkash', label: 'bKash', icon: '/payments/bkash-icon.svg' },
  { id: 'nagad', label: 'Nagad', icon: '/payments/nagad-icon.png' },
] as const;

export type StorePaymentMethodId = (typeof STORE_PAYMENT_METHODS)[number]['id'];

type PaymentMethodSelectorProps = {
  selectedMethod: StorePaymentMethodId;
  onSelectMethod: (method: StorePaymentMethodId) => void;
  formattedTotal: string;
  trxId: string;
  onChangeTrxId: (val: string) => void;
};

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  formattedTotal,
  trxId,
  onChangeTrxId,
}: PaymentMethodSelectorProps) {
  const activeLabel =
    STORE_PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label || 'bKash';

  return (
    <div className="space-y-2.5 pt-0.5">
      <label className="block text-xs font-bold text-slate-700">
        Payment method
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        {STORE_PAYMENT_METHODS.map((m) => {
          const active = selectedMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMethod(m.id)}
              className={`h-10 px-3 rounded-md border font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                active
                  ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-xs'
                  : 'border-slate-200 bg-white text-[#0F172A] hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="w-6 h-6 rounded bg-white p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src={m.icon}
                  alt={m.label}
                  className="w-full h-full object-contain"
                />
              </span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
        Send <strong className="text-[#0F172A]">{formattedTotal}</strong> to{' '}
        <span className="font-mono font-bold text-[#0F172A]">01700-123456</span> (
        {activeLabel}) and enter the Transaction ID:
      </div>

      <input
        type="text"
        required
        value={trxId}
        onChange={(e) => onChangeTrxId(e.target.value)}
        placeholder="Transaction ID (TrxID)"
        className="w-full h-9.5 px-3 rounded-md border border-[#FF5E5B]/65 bg-white text-xs font-mono text-[#0F172A] placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B] focus:ring-2 focus:ring-[#FF5E5B]/15 transition-all"
      />
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
