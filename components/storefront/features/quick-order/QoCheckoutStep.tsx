'use client';

import React, { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Phone, User } from 'lucide-react';
import type { Plan, Product } from '@/lib/products';
import { formatPrice } from '@/lib/products';
import {
  CouponInputBox,
  DurationBadge,
  PaymentMethodSelector,
  StoreInputField,
  WarrantyBadge,
  type StorePaymentMethodId,
} from '@/components/storefront/ui';
import { QoQtyControl } from './QoQtyControl';

type QoCheckoutStepProps = {
  product: Product;
  plan: Plan;
  qty: number;
  onChangeQty: (qty: number) => void;
  onBack: () => void;
  onPlaced: () => void;
};

export function QoCheckoutStep({
  product,
  plan,
  qty,
  onChangeQty,
  onBack,
  onPlaced,
}: QoCheckoutStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<StorePaymentMethodId>('bkash');
  const [trxId, setTrxId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponNote, setCouponNote] = useState('');
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const subtotal = plan.price * qty;
  const finalTotal = Math.max(0, subtotal - couponDiscount);
  const warrantyBadgeText = plan.warrantyBadge || '25D Warranty';
  const isLoginOnly = plan.warrantyType === 'login-only';

  const applyCoupon = () => {
    if (!coupon.trim()) {
      setCouponNote('Enter a coupon code.');
      return;
    }
    if (coupon.trim().toUpperCase() === 'BITLOGIC' || coupon.trim().toUpperCase() === 'SPECIAL') {
      setCouponDiscount(Math.round(subtotal * 0.1));
      setCouponNote('10% discount applied.');
    } else {
      setCouponNote('Invalid coupon code.');
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(true);
    window.setTimeout(() => onPlaced(), 1200);
  };

  return (
    <form className="space-y-3.5" onSubmit={onSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#FF5E5B] border-0 bg-transparent p-0 cursor-pointer transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2.3} />
        <span>Change option</span>
      </button>

      {/* Selected Plan Card */}
      <div className="p-3 rounded-md border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-white border border-slate-200 p-0.5 shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover rounded-xs"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-[#0F172A] truncate m-0">
              {plan.label}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <DurationBadge>{plan.duration}</DurationBadge>
              <WarrantyBadge label={warrantyBadgeText} isLoginOnly={isLoginOnly} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <strong className="font-mono text-sm font-extrabold text-[#0F172A] tabular-nums">
            {formatPrice(subtotal)}
          </strong>
          <QoQtyControl value={qty} onChange={onChangeQty} />
        </div>
      </div>

      {/* Customer Information — Reusable StoreInputField */}
      <div className="space-y-2.5">
        <StoreInputField
          id="qo-name"
          name="name"
          type="text"
          label="Full name"
          icon={User}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />

        <StoreInputField
          id="qo-phone"
          name="phone"
          type="tel"
          label="Phone number"
          icon={Phone}
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
        />

        <StoreInputField
          id="qo-email"
          name="email"
          type="email"
          label="Email address"
          icon={Mail}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
      </div>

      {/* Payment Method: Reusable PaymentMethodSelector */}
      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onSelectMethod={setSelectedMethod}
        formattedTotal={formatPrice(finalTotal)}
        trxId={trxId}
        onChangeTrxId={setTrxId}
      />

      {/* Coupon: Reusable CouponInputBox */}
      <CouponInputBox
        coupon={coupon}
        onChangeCoupon={setCoupon}
        onApply={applyCoupon}
        message={couponNote}
        isApplied={couponDiscount > 0}
      />

      {/* Order Total */}
      <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 font-bold">
            <span>Discount</span>
            <span className="font-mono tabular-nums">-{formatPrice(couponDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm font-extrabold text-[#0F172A]">
          <span>Total</span>
          <span className="font-mono text-base tabular-nums">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      {done && (
        <div
          className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
          role="status"
        >
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Order placed successfully.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={done}
        className="w-full h-11 px-4 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 disabled:opacity-50"
      >
        {done ? 'Processing...' : `Place order — ${formatPrice(finalTotal)}`}
      </button>
    </form>
  );
}
