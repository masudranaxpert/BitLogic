import React, { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import type { Plan, Product } from '@/lib/products';
import { formatPrice } from '@/lib/products';
import { PlanWarrantyCard } from '@/components/storefront/ui';
import { QoPlanChips } from './QoPlanChips';
import { QoQtyControl } from './QoQtyControl';

type QoPlanSelectStepProps = {
  product: Product;
  plan: Plan | null;
  qty?: number;
  onChangeQty?: (qty: number) => void;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
};

export function QoPlanSelectStep({
  product,
  plan,
  qty = 1,
  onChangeQty,
  onSelectPlan,
  onContinue,
}: QoPlanSelectStepProps) {
  const [showError, setShowError] = useState(false);

  const prices = product.plans.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRangeLabel =
    minPrice === maxPrice
      ? formatPrice(minPrice)
      : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;

  const isLoginOnly = plan?.warrantyType === 'login-only';
  const warrantyBadgeText = plan?.warrantyBadge || '25D Warranty';
  const warrantyHeadline =
    plan?.warrantyHeadline ||
    (isLoginOnly
      ? 'No Warranty — Login Warranty Only'
      : '25 Days Replacement Warranty');
  const planDetails = plan?.details || [
    'Ready-made account with login credentials provided.',
    'Log in using the provided email & password.',
    'Change the password after your first login.',
  ];

  const handleSelectPlan = (id: string) => {
    if (id) setShowError(false);
    onSelectPlan(id);
  };

  const handleContinueClick = () => {
    if (!plan) {
      setShowError(true);
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-4">
      {/* Compact Product Header */}
      <header className="flex items-center gap-3.5 pr-9 pb-3.5 border-b border-slate-200/90">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-50 border border-slate-200 p-0.5 shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-xs"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-[#FF5E5B] leading-none">
            {product.platform}
          </div>
          <h2 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight truncate m-0 mt-1">
            {product.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {plan ? (
              <>
                <span className="font-mono text-base font-extrabold text-[#0F172A] tabular-nums leading-none">
                  {formatPrice(plan.price)}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-extrabold text-[#0F172A]">
                  {plan.duration}
                </span>
              </>
            ) : (
              <span className="font-mono text-sm sm:text-base font-extrabold text-[#FF5E5B] tabular-nums leading-none">
                {priceRangeLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Plan Option Selector */}
      <QoPlanChips
        groupLabel={product.platform}
        plans={product.plans}
        selectedId={plan?.id ?? ''}
        onSelect={handleSelectPlan}
        hasError={showError && !plan}
      />

      {showError && !plan && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-300 text-red-700 shadow-2xs transition-all animate-in fade-in slide-in-from-top-1">
          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle size={12} strokeWidth={2.8} />
          </span>
          <p className="text-xs font-bold leading-tight m-0 text-red-700">
            Please select an option above to continue.
          </p>
        </div>
      )}

      {/* Selected Plan Warranty & Instructions Card */}
      {plan && (
        <PlanWarrantyCard
          headline={warrantyHeadline}
          details={planDetails}
          isLoginOnly={isLoginOnly}
          badgeText={warrantyBadgeText}
          arrowBullets
        />
      )}

      {/* Quantity Selector when plan is chosen */}
      {plan && onChangeQty && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-700">Quantity</span>
          <QoQtyControl value={qty} onChange={onChangeQty} />
        </div>
      )}

      {/* Low-Radius Primary Button */}
      <button
        type="button"
        onClick={handleContinueClick}
        className="w-full h-11 px-4 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-xs"
      >
        <span>
          {plan ? `Continue — ${formatPrice(plan.price * qty)}` : 'Continue'}
        </span>
        <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
