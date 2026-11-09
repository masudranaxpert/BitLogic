'use client';

import React, { useEffect, useMemo } from 'react';
import { useStoreSettings } from '@/context/StoreSettingsContext';

export const STORE_PAYMENT_METHODS = [
  { id: 'bkash', label: 'bKash', icon: '/payments/bkash-icon.svg' },
  { id: 'nagad', label: 'Nagad', icon: '/payments/nagad-icon.png' },
  { id: 'rocket', label: 'Rocket', icon: '/payments/bkash-icon.svg' },
] as const;

export type StorePaymentMethodId = 'bkash' | 'nagad' | 'rocket';

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
  const settings = useStoreSettings();

  const availableMethods = useMemo(() => {
    const list: Array<{
      id: StorePaymentMethodId;
      label: string;
      icon: string;
      number: string;
      type: string;
      instructions: string;
    }> = [];

    if (settings.bkashEnabled !== false) {
      list.push({
        id: 'bkash',
        label: 'bKash',
        icon: '/payments/bkash-icon.svg',
        number: settings.bkashNumber || '01700-123456',
        type: settings.bkashType || 'Personal',
        instructions:
          settings.bkashInstructions ||
          'Send Money to our personal bKash number and enter TrxID below.',
      });
    }

    if (settings.nagadEnabled !== false) {
      list.push({
        id: 'nagad',
        label: 'Nagad',
        icon: '/payments/nagad-icon.svg',
        number: settings.nagadNumber || '01700-123456',
        type: settings.nagadType || 'Personal',
        instructions:
          settings.nagadInstructions ||
          'Send Money to our personal Nagad number and enter TrxID below.',
      });
    }

    if (settings.rocketEnabled) {
      list.push({
        id: 'rocket',
        label: 'Rocket',
        icon: '/payments/rocket.png',
        number: settings.rocketNumber || '',
        type: settings.rocketType || 'Personal',
        instructions:
          settings.rocketInstructions ||
          'Send Money to our Rocket number and enter TrxID below.',
      });
    }

    return list.length > 0
      ? list
      : [
          {
            id: 'bkash' as StorePaymentMethodId,
            label: 'bKash',
            icon: '/payments/bkash-icon.svg',
            number: settings.bkashNumber || '01700-123456',
            type: 'Personal',
            instructions: 'Send Money and enter TrxID below.',
          },
        ];
  }, [settings]);

  // Keep selection synchronized with available methods
  useEffect(() => {
    if (!availableMethods.some((m) => m.id === selectedMethod) && availableMethods.length > 0) {
      onSelectMethod(availableMethods[0].id);
    }
  }, [availableMethods, selectedMethod, onSelectMethod]);

  const activeMethod =
    availableMethods.find((m) => m.id === selectedMethod) || availableMethods[0];

  return (
    <div className="space-y-2.5 pt-0.5">
      <label className="block text-xs font-bold text-slate-700">
        Payment method
      </label>
      <div
        className={`grid gap-2.5 ${
          availableMethods.length === 1
            ? 'grid-cols-1'
            : availableMethods.length === 2
            ? 'grid-cols-2'
            : 'grid-cols-3'
        }`}
      >
        {availableMethods.map((m) => {
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
        <span className="font-mono font-bold text-[#0F172A]">
          {activeMethod.number || '(not configured)'}
        </span>{' '}
        ({activeMethod.label} - {activeMethod.type}) and enter the Transaction ID:
        {activeMethod.instructions && (
          <p className="mt-1 text-[11px] text-slate-500 m-0">
            {activeMethod.instructions}
          </p>
        )}
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
