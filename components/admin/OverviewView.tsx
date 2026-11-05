'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Calendar,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import {
  AdminTab,
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  PaymentTransaction,
  REVENUE_CHART_DATA,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  ShadcnCheckbox,
  EmptyTableState,
} from '@/components/ui/primitives';

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
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '6m' | 'Max'>('6m');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [txSearch, setTxSearch] = useState('');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);

  const totalMonthlyRevenue = products.reduce((sum, p) => sum + p.monthlyRevenueBDT, 0);
  const totalSalesCount = products.reduce((sum, p) => sum + p.totalSales, 0);
  const totalVariantsCount = products.reduce((sum, p) => sum + p.variants.length, 0);
  const availableVaultCount = vault.filter((v) => v.status === 'available').length;
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending_dispatch');
  const warrantyClaims = deliveries.filter((d) => d.status === 'warranty_claim');
  const pendingPayments = payments.filter((p) => p.status === 'pending_verification');
  const queueTotal = pendingDeliveries.length + warrantyClaims.length;

  const filteredRecentDeliveries = deliveries.filter(
    (d) =>
      d.orderId.toLowerCase().includes(txSearch.toLowerCase()) ||
      d.productName.toLowerCase().includes(txSearch.toLowerCase()) ||
      d.buyerName.toLowerCase().includes(txSearch.toLowerCase())
  );

  const toggleRowSelect = (id: string) => {
    setSelectedDeliveryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-lg text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="tabular-nums">Oct 2026</span>
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
          badge={`+ ${products.length} products`}
        />
        <StatMetric
          label="Product Revenue"
          value={formatBDT(totalMonthlyRevenue)}
          badge="↑ 24%"
        />
        <StatMetric
          label="Product Sold"
          value={totalSalesCount.toLocaleString()}
          badge="↑ 12%"
        />
        <StatMetric
          label="Vault Stock"
          value={availableVaultCount}
          badge="↑ 8%"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-8 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Sales Report
              </h2>

              <div className="surface-pill-segment inline-flex items-center p-1 rounded-[10px] text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                    chartType === 'area'
                      ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                    chartType === 'bar'
                      ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="font-display text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                  {formatBDT(totalMonthlyRevenue)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                    +৳2,45,300 (+24.2%)
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1 overflow-x-auto max-w-full">
                {(['1d', '7d', '30d', '6m', 'Max'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeRange(t)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                      timeRange === t
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-56 sm:h-60 w-full mt-5">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cleanEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.35} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `৳${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [formatBDT(Number(val ?? 0)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenueBDT"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cleanEmerald)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.35} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="orders" name="Total Orders" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="autoDelivered" name="Auto-Vault" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Payment Gateways
              </h2>
              <span className="font-mono text-xs text-slate-400">Oct 2026</span>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-[13px] mt-1">
              <div className="py-3 flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  bKash Merchant
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  ৳6,84,200
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Nagad Wallet
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  ৳3,42,600
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Binance Pay &amp; Stripe
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  ৳2,49,000
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending TrxID</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {pendingPayments.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap"
            >
              View Payments ({pendingPayments.length})
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-8 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Deliveries
              </h2>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 w-full sm:w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('deliveries')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-600 cursor-pointer whitespace-nowrap shrink-0"
                >
                  View All
                </button>
              </div>
            </div>

            {filteredRecentDeliveries.length === 0 ? (
              <EmptyTableState
                title="No matching orders"
                description="Clear the search filter to view recent deliveries."
                onReset={() => setTxSearch('')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs text-slate-500 font-medium">
                      <th className="py-3 px-4 w-8">
                        <ShadcnCheckbox
                          checked={
                            filteredRecentDeliveries.length > 0 &&
                            selectedDeliveryIds.length === filteredRecentDeliveries.length
                          }
                          onChange={(checked) =>
                            setSelectedDeliveryIds(
                              checked ? filteredRecentDeliveries.map((d) => d.id) : []
                            )
                          }
                        />
                      </th>
                      <th className="py-3 px-3 whitespace-nowrap">Order ID</th>
                      <th className="py-3 px-3 whitespace-nowrap">Product</th>
                      <th className="py-3 px-3 whitespace-nowrap">Type</th>
                      <th className="py-3 px-3 whitespace-nowrap">Warranty</th>
                      <th className="py-3 px-3 whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                    {filteredRecentDeliveries.slice(0, 6).map((del) => {
                      const checked = selectedDeliveryIds.includes(del.id);
                      return (
                        <tr
                          key={del.id}
                          className={`transition-colors whitespace-nowrap ${
                            checked
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/25'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <ShadcnCheckbox
                              checked={checked}
                              onChange={() => toggleRowSelect(del.id)}
                            />
                          </td>
                          <td className="py-3 px-3 font-mono text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
                            {del.orderId}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {del.productName} <span className="text-slate-400 font-normal">· {del.variantName}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {getCredentialTypeLabel(del.credentialType)}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                            {del.hasWarranty ? `${del.warrantyRemainingDays}d` : '—'}
                          </td>
                          <td className="py-3 px-3">
                            {del.status === 'delivered' && (
                              <StatusIndicator tone="emerald" label="Delivered" />
                            )}
                            {del.status === 'pending_dispatch' && (
                              <StatusIndicator tone="amber" label="Pending" />
                            )}
                            {del.status === 'warranty_claim' && (
                              <StatusIndicator tone="red" label="Claim" />
                            )}
                            {del.status === 'replaced' && (
                              <StatusIndicator tone="blue" label="Replaced" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onNavigate('deliveries')}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              {del.status === 'pending_dispatch'
                                ? 'Dispatch'
                                : del.status === 'warranty_claim'
                                ? 'Swap'
                                : 'View'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Action Queue
              </h2>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs mt-1">
              {warrantyClaims.map((claim) => (
                <div key={claim.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] text-slate-900 dark:text-slate-100 truncate">
                      {claim.productName} · {claim.variantName}
                    </div>
                    <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                      Warranty Claim · {claim.buyerName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('deliveries')}
                    className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Swap
                  </button>
                </div>
              ))}

              {pendingPayments.map((pay) => (
                <div key={pay.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] text-slate-900 dark:text-slate-100 truncate">
                      {pay.gateway} · {formatBDT(pay.amountBDT)}
                    </div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5 truncate">
                      {pay.trxId} · {pay.buyerName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onVerifyPayment(pay.id)}
                    className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-800 dark:text-slate-200 font-semibold rounded-md shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    Approve
                  </button>
                </div>
              ))}

              <div className="pt-3 space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Vault Stock
                </div>
                {products.slice(0, 3).map((prod) => {
                  const firstVar = prod.variants[0];
                  if (!firstVar) return null;
                  const vStock = vault.filter(
                    (v) =>
                      v.productId === prod.id &&
                      v.variantId === firstVar.id &&
                      v.status === 'available'
                  ).length;

                  return (
                    <div
                      key={firstVar.id}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <span className="font-medium text-[13px] text-slate-800 dark:text-slate-200 truncate pr-2">
                        {prod.name} <span className="text-slate-400 font-normal">· {firstVar.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenQuickRestock(prod.id, firstVar.id)}
                        className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 font-mono text-[11px] shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        {vStock} · +Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="w-full mt-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
          >
            All Products
          </button>
        </Card>
      </div>
    </div>
  );
}
