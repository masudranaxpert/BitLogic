'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  AdminTab,
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin-data';
import {
  Card,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  ShadcnCheckbox,
  EmptyTableState,
} from '@/components/admin/ui/primitives';

interface OverviewActivitySectionProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  warrantyClaims: DigitalDelivery[];
  pendingPayments: PaymentTransaction[];
  onNavigate: (tab: AdminTab) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
}

export function OverviewActivitySection({
  products,
  vault,
  deliveries,
  warrantyClaims,
  pendingPayments,
  onNavigate,
  onOpenQuickRestock,
  onVerifyPayment,
}: OverviewActivitySectionProps) {
  const [txSearch, setTxSearch] = useState('');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <Card className="lg:col-span-8 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Deliveries
            </h2>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {deliveries.length > 0 ? (
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search…"
                    className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 w-full sm:w-44"
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onNavigate('deliveries')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-600 cursor-pointer whitespace-nowrap shrink-0"
              >
                View All
              </button>
            </div>
          </div>

          {deliveries.length === 0 ? (
            <EmptyTableState title="No deliveries" />
          ) : filteredRecentDeliveries.length === 0 ? (
            <EmptyTableState
              title="No matches"
              onReset={() => setTxSearch('')}
              resetLabel="Clear search"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left border-collapse">
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
                Credentials
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
  );
}
