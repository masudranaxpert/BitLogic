'use client';

import React from 'react';
import { Plus, Send } from 'lucide-react';
import {
  AdminTab,
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
} from '@/components/admin/ui/primitives';
import { OverviewChartsSection } from './OverviewChartsSection';
import { OverviewActivitySection } from './OverviewActivitySection';

interface OverviewViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  onNavigate: (tab: AdminTab) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
}

export default function OverviewView({
  products,
  vault,
  deliveries,
  payments,
  onNavigate,
  onOpenQuickRestock,
  onVerifyPayment,
}: OverviewViewProps) {
  const month = new Date().toISOString().slice(0, 7);
  const monthRevenue = payments
    .filter((p) => p.status === 'verified' && p.createdAt.startsWith(month))
    .reduce((n, p) => n + p.amountBDT, 0);
  const monthOrders = new Set(
    deliveries.filter((d) => d.createdAt.startsWith(month)).map((d) => d.orderId),
  ).size;
  const unitsToDeliver = deliveries.filter((d) => d.status === 'pending_dispatch').length;
  const pendingOrdersCount = new Set(
    deliveries.filter((d) => d.status === 'pending_dispatch').map((d) => d.orderId),
  ).size;
  const warrantyClaimsCount = new Set(
    deliveries.filter((d) => d.status === 'warranty_claim').map((d) => d.orderId),
  ).size;
  const warrantyClaims = deliveries.filter((d) => d.status === 'warranty_claim');
  const pendingPayments = payments.filter((p) => p.status === 'pending_verification');
  const queueTotal = pendingOrdersCount + warrantyClaimsCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1>
          Dashboard
        </h1>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => onNavigate('deliveries')}
            className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_#059669] text-slate-700 dark:text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>Queue</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] tabular-nums">
              {queueTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('product-add')}
            className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <Card className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
        <StatMetric label="Revenue this month" value={formatBDT(monthRevenue)} />
        <StatMetric label="Orders this month" value={monthOrders} />
        <StatMetric
          label="To deliver"
          value={unitsToDeliver}
          hint={`${pendingOrdersCount} orders`}
          badge={unitsToDeliver > 0 ? 'Queue' : undefined}
          tone="amber"
        />
        <StatMetric
          label="Payments to check"
          value={pendingPayments.length}
          badge={pendingPayments.length > 0 ? 'Review' : undefined}
          tone="amber"
        />
      </Card>

      <OverviewChartsSection
        payments={payments}
        deliveries={deliveries}
        pendingPaymentsCount={pendingPayments.length}
        onNavigate={onNavigate}
      />

      <OverviewActivitySection
        products={products}
        vault={vault}
        deliveries={deliveries}
        warrantyClaims={warrantyClaims}
        pendingPayments={pendingPayments}
        onNavigate={onNavigate}
        onOpenQuickRestock={onOpenQuickRestock}
        onVerifyPayment={onVerifyPayment}
      />
    </div>
  );
}
