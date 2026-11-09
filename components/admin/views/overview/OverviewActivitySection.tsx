'use client';

import React, { useMemo, useState } from 'react';
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
  GatewayBadge,
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

  const recentGroupedOrders = useMemo(() => {
    const map = new Map<string, DigitalDelivery[]>();
    for (const del of deliveries) {
      const list = map.get(del.orderId) || [];
      list.push(del);
      map.set(del.orderId, list);
    }
    const q = txSearch.trim().toLowerCase();
    const list = Array.from(map.entries()).map(([orderId, units]) => ({
      orderId,
      primary: units[0],
      units,
      totalUnits: units.length,
      allDelivered: units.every((u) => u.status === 'delivered'),
      anyClaim: units.some((u) => u.status === 'warranty_claim'),
      anyPending: units.some((u) => u.status === 'pending_dispatch'),
    }));
    if (!q) return list;
    return list.filter(
      (grp) =>
        grp.orderId.toLowerCase().includes(q) ||
        grp.primary.productName.toLowerCase().includes(q) ||
        grp.primary.buyerName.toLowerCase().includes(q),
    );
  }, [deliveries, txSearch]);

  const toggleRowSelect = (id: string) => {
    setSelectedDeliveryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <Card className="lg:col-span-8 overflow-hidden">
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
          ) : recentGroupedOrders.length === 0 ? (
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
                          recentGroupedOrders.length > 0 &&
                          selectedDeliveryIds.length === recentGroupedOrders.length
                        }
                        onChange={(checked) =>
                          setSelectedDeliveryIds(
                            checked ? recentGroupedOrders.map((g) => g.primary.id) : []
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
                  {recentGroupedOrders.slice(0, 6).map((grp) => {
                    const checked = selectedDeliveryIds.includes(grp.primary.id);
                    const del = grp.primary;
                    return (
                      <tr
                        key={grp.orderId}
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
                          {grp.orderId}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {del.productName}{' '}
                          <span className="text-slate-400 font-normal">· {del.variantName}</span>
                          {grp.totalUnits > 1 ? (
                            <span className="ml-1.5 font-sans text-xs font-bold text-slate-500 dark:text-slate-400">
                              × {grp.totalUnits}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {getCredentialTypeLabel(del.credentialType)}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                          {del.hasWarranty ? `${del.warrantyRemainingDays}d` : '—'}
                        </td>
                        <td className="py-3 px-3">
                          {grp.anyClaim ? (
                            <StatusIndicator tone="red" label="Claim" />
                          ) : grp.allDelivered ? (
                            <StatusIndicator
                              tone="emerald"
                              label={grp.totalUnits > 1 ? `Delivered (${grp.totalUnits}/${grp.totalUnits})` : 'Delivered'}
                            />
                          ) : (
                            <StatusIndicator
                              tone="amber"
                              label={grp.totalUnits > 1 ? `Pending (${grp.units.filter(u => u.status === 'delivered').length}/${grp.totalUnits})` : 'Pending'}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('deliveries')}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {grp.anyPending
                              ? 'Dispatch'
                              : grp.anyClaim
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

      <Card className="lg:col-span-4 p-5 space-y-5">
        <h2>Needs attention</h2>

        {(() => {
          const claimOrders = Array.from(
            new Map(warrantyClaims.map((c) => [c.orderId, c])).values(),
          );
          const lowStock = products
            .flatMap((prod) =>
              prod.variants
                .filter((v) => v.deliveryMode === 'auto_vault')
                .map((v) => ({
                  prod,
                  v,
                  stock: vault.filter(
                    (x) => x.productId === prod.id && x.variantId === v.id && x.status === 'available',
                  ).length,
                })),
            )
            .filter((r) => r.stock <= 2)
            .sort((x, y) => x.stock - y.stock);
          const empty = claimOrders.length === 0 && pendingPayments.length === 0 && lowStock.length === 0;
          if (empty) return <p className="text-sm text-slate-500">All clear.</p>;
          return (
            <>
              {pendingPayments.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3>Payments to check <span className="font-normal text-slate-500">({pendingPayments.length})</span></h3>
                    <button type="button" onClick={() => onNavigate('payments')} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer">View all</button>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingPayments.slice(0, 4).map((pay) => (
                      <li key={pay.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <GatewayBadge gateway={pay.gateway} size="sm" />
                            <span className="admin-price text-sm">{formatBDT(pay.amountBDT)}</span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{pay.buyerName} · {pay.orderId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onVerifyPayment(pay.id)}
                          className="h-8 shrink-0 rounded-md border border-slate-200 px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
                        >
                          Verify
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {claimOrders.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3>Warranty claims <span className="font-normal text-slate-500">({claimOrders.length})</span></h3>
                    <button type="button" onClick={() => onNavigate('warranty-claims')} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer">View all</button>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {claimOrders.slice(0, 4).map((claim) => (
                      <li key={claim.orderId} className="py-2.5">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {claim.productName} · {claim.variantName}
                        </div>
                        <div className="truncate text-xs text-slate-500">{claim.buyerName} · {claim.orderId}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {lowStock.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3>Low stock <span className="font-normal text-slate-500">({lowStock.length})</span></h3>
                    <button type="button" onClick={() => onNavigate('vault')} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer">Inventory</button>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lowStock.slice(0, 4).map(({ prod, v, stock }) => (
                      <li key={prod.id + v.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0 truncate text-sm">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{prod.name}</span>
                          <span className="text-slate-500"> · {v.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenQuickRestock(prod.id, v.id)}
                          className={`h-8 shrink-0 rounded-md border px-3 text-sm font-medium cursor-pointer ${stock === 0 ? 'border-rose-200 text-rose-700 hover:border-rose-400 dark:border-rose-900 dark:text-rose-400' : 'border-slate-200 hover:border-emerald-600 dark:border-slate-700'}`}
                        >
                          {stock === 0 ? 'Empty · Add' : `${stock} left · Add`}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          );
        })()}
      </Card>
    </div>
  );
}
