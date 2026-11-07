'use client';

import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy, ExternalLink, RotateCcw, Search, X } from 'lucide-react';
import type {
  DigitalDelivery,
  PaymentTransaction,
  SubscriberUser,
} from '@/lib/admin-data';
import { gatewayStyle } from '@/lib/admin/gateways';
import {
  Card,
  formatBDT,
  StatusIndicator,
  SegmentedTabs,
  EmptyTableState,
  GatewayBadge,
  PaginationFooter,
  RowMenu,
} from '@/components/admin/ui/primitives';

type StatusFilter = 'all' | 'pending_verification' | 'verified' | 'closed';

interface PaymentsViewProps {
  payments: PaymentTransaction[];
  deliveries: DigitalDelivery[];
  subscribers: SubscriberUser[];
  onVerifyPayment: (paymentId: string) => void;
  onRejectOrRefundPayment: (paymentId: string, nextStatus: 'rejected' | 'refunded') => void;
  onOpenOrder: (orderId: string) => void;
  onOpenCustomer: (email: string) => void;
}


const STATUS: Record<
  PaymentTransaction['status'],
  { tone: 'emerald' | 'amber' | 'blue' | 'red'; label: string }
> = {
  verified: { tone: 'emerald', label: 'Verified' },
  pending_verification: { tone: 'amber', label: 'Awaiting check' },
  refunded: { tone: 'blue', label: 'Refunded' },
  rejected: { tone: 'red', label: 'Rejected' },
};

function itemsFor(pay: PaymentTransaction, byOrder: Map<string, DigitalDelivery[]>) {
  // A renewal pays for specific lines only — show just those.
  const scope = pay.renewDeliveryIds?.length ? new Set(pay.renewDeliveryIds) : null;
  const units = byOrder.get(pay.orderId)?.filter((u) => !scope || scope.has(u.id));
  if (units && units.length > 0) {
    const lines = new Map<string, { label: string; plan: string; n: number }>();
    for (const u of units) {
      const k = `${u.productId}|${u.variantId}`;
      const cur = lines.get(k);
      if (cur) cur.n += 1;
      else lines.set(k, { label: u.productName, plan: u.variantName, n: 1 });
    }
    return Array.from(lines.values());
  }
  return pay.productSummary
    .split(/,\s+/)
    .filter(Boolean)
    .map((s) => {
      const m = /^(.*?)(?:\s*\((.*?)\))?(?:\s*[×x]\s*(\d+))?$/.exec(s.trim());
      return { label: m?.[1] || s, plan: m?.[2] || '', n: Number(m?.[3] || 1) };
    });
}

export default function PaymentsView({
  payments,
  deliveries,
  subscribers,
  onVerifyPayment,
  onRejectOrRefundPayment,
  onOpenOrder,
  onOpenCustomer,
}: PaymentsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copied, setCopied] = useState<string | null>(null);

  const byOrder = useMemo(() => {
    const m = new Map<string, DigitalDelivery[]>();
    for (const d of deliveries) {
      const list = m.get(d.orderId) || [];
      list.push(d);
      m.set(d.orderId, list);
    }
    return m;
  }, [deliveries]);

  const customerEmails = useMemo(
    () => new Set(subscribers.map((s) => s.email.toLowerCase())),
    [subscribers],
  );

  const sorted = useMemo(
    () => [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments],
  );

  const gatewaysInUse = useMemo(
    () => Array.from(new Set(payments.map((p) => p.gateway))).sort(),
    [payments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((p) => {
      if (statusFilter === 'closed' && p.status !== 'refunded' && p.status !== 'rejected') return false;
      if (statusFilter !== 'all' && statusFilter !== 'closed' && p.status !== statusFilter) return false;
      if (gatewayFilter && p.gateway !== gatewayFilter) return false;
      if (!q) return true;
      return (
        p.orderId.toLowerCase().includes(q) ||
        p.trxId.toLowerCase().includes(q) ||
        p.buyerName.toLowerCase().includes(q) ||
        p.buyerEmail.toLowerCase().includes(q) ||
        p.productSummary.toLowerCase().includes(q)
      );
    });
  }, [sorted, statusFilter, gatewayFilter, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  // ----- stats -----
  const monthKey = new Date().toISOString().slice(0, 7);
  const verified = payments.filter((p) => p.status === 'verified');
  const refunds = payments.filter((p) => p.status === 'refunded');
  const pending = payments.filter((p) => p.status === 'pending_verification');
  const sum = (list: PaymentTransaction[]) => list.reduce((n, p) => n + p.amountBDT, 0);
  const netCollected = sum(verified) - sum(refunds.filter((p) => p.kind === 'manual' && p.trxId === 'REFUND'));
  const thisMonth = sum(verified.filter((p) => p.createdAt.startsWith(monthKey)));
  const byGateway = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== 'verified') continue;
      m.set(p.gateway, (m.get(p.gateway) || 0) + p.amountBDT);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const copy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1400);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setGatewayFilter('');
    setQuery('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <h1>Payments</h1>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Collected', value: formatBDT(netCollected), sub: `${verified.length} verified payments` },
            { label: 'This month', value: formatBDT(thisMonth), sub: new Date().toLocaleString('en', { month: 'long', year: 'numeric' }) },
            {
              label: 'Awaiting check',
              value: String(pending.length),
              sub: pending.length ? `${formatBDT(sum(pending))} to verify` : 'Nothing waiting',
              warn: pending.length > 0,
              onClick: pending.length ? () => { setStatusFilter('pending_verification'); setPage(1); } : undefined,
            },
            { label: 'Refunded', value: formatBDT(sum(refunds)), sub: `${refunds.length} refund${refunds.length === 1 ? '' : 's'}` },
          ].map((t, i) => {
            const body = (
              <>
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.warn ? <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> : null}
                  {t.label}
                </span>
                <span className="mt-2 block font-display text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
                  {t.value}
                </span>
                <span className={`mt-1 block text-sm ${t.warn ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>
                  {t.sub}
                </span>
              </>
            );
            const cls = `block p-4 sm:p-5 text-left border-slate-200/80 dark:border-slate-800 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`;
            return t.onClick ? (
              <button key={t.label} type="button" onClick={t.onClick} className={`${cls} hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer`}>
                {body}
              </button>
            ) : (
              <div key={t.label} className={cls}>{body}</div>
            );
          })}
        </div>
        {byGateway.length > 0 ? (() => {
          const total = byGateway.reduce((n, [, v]) => n + v, 0) || 1;
          return (
            <div className="border-t border-slate-200/80 px-4 py-4 sm:px-5 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Verified by gateway</span>
                <span className="text-slate-500 tabular-nums">{formatBDT(total)}</span>
              </div>
              <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label="Share of verified revenue by gateway">
                {byGateway.map(([g, v]) => (
                  <span key={g} style={{ width: `${(v / total) * 100}%`, backgroundColor: gatewayStyle(g).tile }} className="h-full first:rounded-l-full last:rounded-r-full" />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {byGateway.map(([g, v]) => (
                  <li key={g} className="flex items-center gap-2 text-sm">
                    <GatewayBadge gateway={g} size="sm" />
                    <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatBDT(v)}</span>
                    <span className="text-slate-500 tabular-nums">{Math.round((v / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })() : null}
      </Card>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs
          layout="wrap"
          options={[
            { value: 'all', label: 'All', count: payments.length },
            { value: 'pending_verification', label: 'Awaiting', count: pending.length },
            { value: 'verified', label: 'Verified', count: verified.length },
            {
              value: 'closed',
              label: 'Refunded',
              count: payments.filter((p) => p.status === 'refunded' || p.status === 'rejected').length,
            },
          ]}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Order, customer or TrxID"
              aria-label="Search payments"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by gateway"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="">All gateways</option>
            {gatewaysInUse.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {payments.length === 0 ? (
          <EmptyTableState title="No payments yet" />
        ) : filtered.length === 0 ? (
          <EmptyTableState title="No matching payments" onReset={resetFilters} resetLabel="Clear filters" />
        ) : (
          <>
            <div className="admin-th hidden lg:grid grid-cols-[minmax(8rem,1fr)_minmax(10rem,1.2fr)_minmax(13rem,2fr)_minmax(9rem,1.1fr)_7rem_8.5rem_5.5rem] gap-4 border-b border-slate-200/80 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
              <span>Order</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Payment</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {rows.map((pay) => {
                const items = itemsFor(pay, byOrder);
                const st = STATUS[pay.status];
                const hasOrder = byOrder.has(pay.orderId);
                const isCustomer = customerEmails.has(pay.buyerEmail.toLowerCase());
                const trx = pay.trxId && pay.trxId !== '—' ? pay.trxId : '';
                return (
                  <li
                    key={pay.id}
                    className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1.2fr)_minmax(13rem,2fr)_minmax(9rem,1.1fr)_7rem_8.5rem_5.5rem] lg:items-start lg:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  >
                    {/* Order */}
                    <div className="min-w-0">
                      {hasOrder ? (
                        <button
                          type="button"
                          onClick={() => onOpenOrder(pay.orderId)}
                          className="font-mono text-sm font-semibold text-emerald-700 hover:underline underline-offset-2 dark:text-emerald-400 cursor-pointer"
                        >
                          {pay.orderId}
                        </button>
                      ) : (
                        <span className="font-mono text-sm font-semibold">{pay.orderId}</span>
                      )}
                      <div className="mt-0.5 text-xs text-slate-500">
                        {pay.createdAt}
                        {pay.kind === 'renewal' ? ' · Renewal' : pay.kind === 'manual' ? ' · Manual' : ''}
                      </div>
                    </div>

                    {/* Amount (mobile: top-right) */}
                    <div className="admin-price text-right text-base lg:hidden">{formatBDT(pay.amountBDT)}</div>

                    {/* Customer */}
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      {isCustomer ? (
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(pay.buyerEmail)}
                          className="text-left font-medium text-slate-900 hover:text-emerald-700 hover:underline underline-offset-2 dark:text-slate-100 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          {pay.buyerName}
                        </button>
                      ) : (
                        <span className="font-medium">{pay.buyerName}</span>
                      )}
                      <div className="truncate text-xs text-slate-500">{pay.buyerEmail}</div>
                    </div>

                    {/* Items */}
                    <ul className="col-span-2 min-w-0 space-y-1 lg:col-span-1">
                      {items.map((it, i) => (
                        <li key={`${it.label}-${it.plan}-${i}`} className="text-sm leading-snug">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{it.label}</span>
                          {it.plan ? <span className="text-slate-500"> · {it.plan}</span> : null}
                          {it.n > 1 ? <span className="ml-1 font-mono text-xs text-slate-500">×{it.n}</span> : null}
                        </li>
                      ))}
                    </ul>

                    {/* Gateway + Trx */}
                    <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 lg:col-span-1 lg:block">
                      <GatewayBadge gateway={pay.gateway} />
                      {trx ? (
                        <button
                          type="button"
                          onClick={() => copy(pay.id, trx)}
                          title="Copy TrxID"
                          className="group inline-flex max-w-full items-center gap-1 font-mono text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 lg:mt-1.5 lg:flex cursor-pointer"
                        >
                          <span className="truncate">{trx}</span>
                          {copied === pay.id ? (
                            <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                          ) : (
                            <ClipboardCopy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" aria-hidden />
                          )}
                        </button>
                      ) : null}
                    </div>

                    {/* Amount (desktop) */}
                    <div className="admin-price hidden text-right text-sm lg:block">{formatBDT(pay.amountBDT)}</div>

                    {/* Status + actions */}
                    <div className="flex items-center lg:block">
                      <StatusIndicator tone={st.tone} label={st.label} />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      {pay.status === 'pending_verification' ? (
                        <button
                          type="button"
                          onClick={() => onVerifyPayment(pay.id)}
                          aria-label={`Verify payment for ${pay.orderId}`}
                          title="Verify"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          <Check className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                      <RowMenu
                        label={`Actions for ${pay.orderId}`}
                        items={[
                          { label: 'Open order', icon: ExternalLink, onSelect: () => onOpenOrder(pay.orderId), hidden: !hasOrder },
                          { label: 'Open customer', icon: ExternalLink, onSelect: () => onOpenCustomer(pay.buyerEmail), hidden: !isCustomer },
                          { label: 'Copy TrxID', icon: ClipboardCopy, onSelect: () => copy(pay.id, trx), hidden: !trx },
                          {
                            label: 'Reject payment',
                            icon: X,
                            tone: 'danger',
                            hidden: pay.status !== 'pending_verification',
                            onSelect: () => {
                              if (window.confirm(`Reject ${formatBDT(pay.amountBDT)} from ${pay.buyerName}?`)) {
                                onRejectOrRefundPayment(pay.id, 'rejected');
                              }
                            },
                          },
                          {
                            label: 'Mark refunded',
                            icon: RotateCcw,
                            tone: 'danger',
                            hidden: pay.status !== 'verified',
                            onSelect: () => {
                              if (window.confirm(`Mark ${formatBDT(pay.amountBDT)} as refunded?`)) {
                                onRejectOrRefundPayment(pay.id, 'refunded');
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationFooter
              totalItems={filtered.length}
              pageSize={pageSize}
              currentPage={current}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
