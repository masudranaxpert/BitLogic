'use client';

import { useStoreSettings } from '@/context/StoreSettingsContext';
import React, { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Phone, User, AlertCircle, Loader2 } from 'lucide-react';
import type { Plan, Product } from '@/lib/products';
import { formatPrice } from '@/lib/products';
import { useCustomerSession } from '@/hooks/use-customer-session';
import { rememberOrderId, writeCustomer } from '@/lib/customerSession';
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
  const session = useCustomerSession();
  const [selectedMethod, setSelectedMethod] = useState<StorePaymentMethodId>('bkash');
  const [trxId, setTrxId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponNote, setCouponNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { ordersPaused, ordersPausedMessage } = useStoreSettings();
  const [errorMessage, setErrorMessage] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [phone, setPhone] = useState(session?.phone || '');
  const [email, setEmail] = useState(session?.email || '');
  const [name, setName] = useState(session?.name || '');

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          gateway: selectedMethod === 'nagad' ? 'Nagad' : selectedMethod === 'rocket' ? 'Rocket' : 'bKash',
          trxId: trxId.trim(),
          couponCode: couponDiscount > 0 ? coupon.trim() : undefined,
          items: [
            {
              productId: product.id,
              planId: plan.id,
              qty,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      writeCustomer({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      rememberOrderId(data.orderId, data.accessToken);
      setPlacedOrderId(data.orderId);

      // Redirect directly to the seamless Payment Gateway screen
      window.location.href = `/payment/${data.orderId}?method=${selectedMethod}`;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Checkout failed');
      setIsSubmitting(false);
    }
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

      {errorMessage && (
        <div
          className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
          role="alert"
        >
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {placedOrderId && (
        <div
          className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
          role="status"
        >
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>Order placed! ID: <strong className="font-mono">{placedOrderId}</strong></span>
        </div>
      )}

      {ordersPaused ? (

        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs font-bold text-amber-900">

          {ordersPausedMessage}

        </p>

      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || Boolean(placedOrderId) || ordersPaused}
        className="w-full h-11 px-4 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Placing order...</span>
          </>
        ) : placedOrderId ? (
          'Order confirmed'
        ) : ordersPaused ? (
          'Ordering is paused'
        ) : (
          `Place order — ${formatPrice(finalTotal)}`
        )}
      </button>
    </form>
  );
}
