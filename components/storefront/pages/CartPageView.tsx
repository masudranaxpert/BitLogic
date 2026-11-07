'use client';

import { useStoreSettings } from '@/context/StoreSettingsContext';
import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Trash2, CheckCircle2, ArrowLeft, Minus, Plus, AlertCircle } from 'lucide-react';
import { formatPrice, getProduct } from '@/lib/products';
import { useCatalog } from '@/context/CatalogContext';
import { useCart } from '@/context/CartContext';
import { useCustomerSession } from '@/hooks/use-customer-session';
import { rememberOrderId, writeCustomer } from '@/lib/customerSession';
import {
  CouponInputBox,
  DurationBadge,
  PaymentMethodSelector,
  StoreInputField,
  type StorePaymentMethodId,
} from '@/components/storefront/ui';
import { useStoreNav } from '@/context/StoreNavContext';

export function CartPageView() {
  const { items, total, count, remove, updateQty, clear } = useCart();
  const { products } = useCatalog();
  const { navigateTo } = useStoreNav();
  const session = useCustomerSession();

  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<StorePaymentMethodId>('bkash');
  const [customerName, setCustomerName] = useState(session?.name || '');
  const [customerPhone, setCustomerPhone] = useState(session?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(session?.email || '');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { ordersPaused, ordersPausedMessage } = useStoreSettings();
  const [errorMessage, setErrorMessage] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const empty = items.length === 0;

  const handleApplyCoupon = () => {
    if (!coupon.trim()) return;
    if (coupon.trim().toUpperCase() === 'BITLOGIC' || coupon.trim().toUpperCase() === 'SPECIAL') {
      const discount = Math.round(total * 0.1);
      setCouponDiscount(discount);
      setCouponMsg('10% discount applied.');
    } else {
      setCouponMsg('Invalid coupon code.');
    }
  };

  const finalTotal = Math.max(0, total - couponDiscount);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      setErrorMessage('Please enter the transaction ID');
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          gateway: selectedMethod === 'nagad' ? 'Nagad' : 'bKash',
          trxId: trxId.trim(),
          couponCode: couponDiscount > 0 ? coupon.trim() : undefined,
          items: items.map((i) => ({
            productId: i.productId,
            planId: i.plan.id,
            qty: i.qty,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      writeCustomer({
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
      });

      rememberOrderId(data.orderId, data.accessToken);
      setPlacedOrderId(data.orderId);
      clear();
      setTimeout(() => {
        navigateTo('account', { accountTab: 'orders' });
      }, 1600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Checkout failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[980px] mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
      <header className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/90">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight m-0">
            Cart
          </h1>
          {!empty && (
            <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
              ({count})
            </span>
          )}
        </div>

        {!empty && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFF1F0] text-[#FF5E5B] hover:bg-[#FF5E5B] hover:text-white border border-[#FF5E5B]/25 text-xs font-extrabold transition-colors cursor-pointer"
          >
            <Trash2 size={12} strokeWidth={2.4} />
            <span>Clear</span>
          </button>
        )}
      </header>

      {empty && placedOrderId ? (
        <div className="text-center py-12 px-5 bg-white rounded-lg border border-emerald-200" role="status">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <h2 className="font-display text-base font-extrabold text-[#0F172A] m-0">
            Order placed — <span className="font-mono">{placedOrderId}</span>
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-slate-600">Taking you to your orders…</p>
        </div>
      ) : empty ? (
        <div className="text-center py-12 px-5 bg-white rounded-lg border border-slate-200/90">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3 border border-slate-200/80">
            <ShoppingBag size={20} strokeWidth={2.2} />
          </div>
          <h2 className="font-display text-base font-extrabold text-[#0F172A] m-0">
            Your cart is empty
          </h2>
          <button
            type="button"
            onClick={() => navigateTo('shop', { code: 'ALL' })}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-[#0F172A] hover:bg-[#FF5E5B] text-white font-extrabold text-xs transition-colors cursor-pointer border-0"
          >
            <span>Browse products</span>
            <ArrowRight size={14} strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Compact Cart Items List */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="bg-white rounded-lg border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
              {items.map((item) => {
                const product = getProduct(item.productId, products);
                return (
                  <div
                    key={`${item.productId}-${item.plan.id}`}
                    className="p-3 sm:px-4 sm:py-3 flex gap-3 items-center"
                  >
                    {/* Compact Thumbnail */}
                    <div className="w-13 h-13 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0 p-0.5">
                      <img
                        src={product?.image || '/products/chatgpt.jpg'}
                        alt={item.name}
                        className="w-full h-full rounded-xs object-cover"
                      />
                    </div>

                    {/* Compact 2-Row Content + Single-Line Bottom Controls */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Title + Total Price */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-extrabold text-[#0F172A] text-xs sm:text-sm leading-tight truncate m-0">
                          {item.name}
                        </h3>
                        <span className="font-mono font-extrabold text-xs sm:text-sm text-[#0F172A] tabular-nums shrink-0">
                          {formatPrice(item.plan.price * item.qty)}
                        </span>
                      </div>

                      {/* Row 2: Plan Label + Duration Badge Inline */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 leading-tight truncate">
                          {item.plan.label}
                        </span>
                        <DurationBadge>{item.plan.duration}</DurationBadge>
                      </div>

                      {/* Row 3: Compact Stepper + Unit Price + Remove on ONE horizontal row */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex items-center h-7 p-0.5 rounded bg-slate-100 border border-slate-200/90"
                            role="group"
                            aria-label="Quantity"
                          >
                            <button
                              type="button"
                              disabled={item.qty <= 1}
                              onClick={() =>
                                updateQty(item.productId, item.plan.id, Math.max(1, item.qty - 1))
                              }
                              className="w-6 h-6 rounded-xs bg-white text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center border-0 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span className="min-w-[22px] text-center font-mono text-xs font-extrabold text-[#0F172A] tabular-nums">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              disabled={item.qty >= 20}
                              onClick={() =>
                                updateQty(item.productId, item.plan.id, Math.min(20, item.qty + 1))
                              }
                              className="w-6 h-6 rounded-xs bg-white text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center border-0 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>

                          <span className="font-mono text-[11px] font-semibold text-slate-400 tabular-nums whitespace-nowrap">
                            {formatPrice(item.plan.price)} × {item.qty}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(item.productId, item.plan.id)}
                          className="w-7 h-7 rounded-md hover:bg-[#FFF1F0] text-[#FF5E5B] flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors shrink-0"
                          aria-label={`Remove ${item.name}`}
                          title="Remove item"
                        >
                          <Trash2 size={14} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => navigateTo('shop', { code: 'ALL' })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#FF5E5B] cursor-pointer border-0 bg-transparent p-0 transition-colors"
              >
                <ArrowLeft size={13} strokeWidth={2.3} />
                <span>Continue shopping</span>
              </button>
            </div>
          </div>

          {/* Right: Clean Checkout Form */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCheckout}
              className="bg-white rounded-lg border border-slate-200/90 p-4 sm:p-5 space-y-3.5"
            >
              <h2 className="font-display text-base font-extrabold text-[#0F172A] pb-2.5 border-b border-slate-100 m-0">
                Checkout
              </h2>

              {/* Customer Inputs — Reusable StoreInputField */}
              <div className="space-y-2.5">
                <StoreInputField
                  type="text"
                  label="Full name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                />
                <StoreInputField
                  type="email"
                  label="Email address"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                <StoreInputField
                  type="tel"
                  label="Phone number"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
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
              <div className="pt-0.5">
                <CouponInputBox
                  coupon={coupon}
                  onChangeCoupon={setCoupon}
                  onApply={handleApplyCoupon}
                  message={couponMsg}
                  isApplied={couponDiscount > 0}
                />
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-1.5 pt-2.5 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-[#0F172A] tabular-nums">
                    {formatPrice(total)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span className="font-mono tabular-nums">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#0F172A] font-extrabold text-sm pt-2 border-t border-slate-200/80">
                  <span>Total</span>
                  <span className="font-mono text-base tabular-nums">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {errorMessage && (
                <div
                  className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs font-bold flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {placedOrderId && (
                <div
                  className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-bold flex items-center gap-2"
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
                className="w-full h-10.5 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Placing order...'
                  : placedOrderId
                    ? 'Order confirmed'
                    : ordersPaused
              ? 'Ordering is paused'
              : `Place order — ${formatPrice(finalTotal)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
