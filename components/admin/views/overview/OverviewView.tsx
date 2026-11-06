'use client';

import React from 'react';
import {
  Calendar,
  Plus,
  Send,
} from 'lucide-react';
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
  const totalMonthlyRevenue = products.reduce((sum, p) => sum + p.monthlyRevenueBDT, 0);
  const totalSalesCount = products.reduce((sum, p) => sum + p.totalSales, 0);
  const totalVariantsCount = products.reduce((sum, p) => sum + p.variants.length, 0);
  const availableVaultCount = vault.filter((v) => v.status === 'available').length;
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending_dispatch');
  const warrantyClaims = deliveries.filter((d) => d.status === 'warranty_claim');
  const pendingPayments = payments.filter((p) => p.status === 'pending_verification');
  const queueTotal = pendingDeliveries.length + warrantyClaims.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-lg text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            <span className="tabular-nums">This month</span>
          </div>

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

      <Card className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
        <StatMetric
          label="Total Options"
          value={totalVariantsCount}
          hint={`${products.length} products`}
        />
        <StatMetric
          label="Product Revenue"
          value={formatBDT(totalMonthlyRevenue)}
        />
        <StatMetric
          label="Product Sold"
          value={totalSalesCount.toLocaleString()}
        />
        <StatMetric label="Credentials" value={availableVaultCount} />
      </Card>

      <OverviewChartsSection
        totalMonthlyRevenue={totalMonthlyRevenue}
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
