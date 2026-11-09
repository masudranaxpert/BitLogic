'use client';

import { toStamp, warrantyState } from '@/lib/warranty';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import type {
  DigitalDelivery,
  DigitalProduct,
  PaymentTransaction,
} from '@/lib/admin-data';
import {
  Card,
  ModalShell,
  SearchableSelect,
  StatusIndicator,
  SwitchToggle,
  formatBDT,
  getCredentialTypeLabel,
} from '@/components/admin/ui/primitives';
import { allCountries, findCountry } from '@/lib/countries';
import type { DeliveriesViewState } from './useDeliveriesViewState';
import { DeliveryChatPanel } from './DeliveryChatPanel';
import { OrderNotesPanel, ADMIN_RELOAD_EVENT } from './OrderNotesPanel';
import {
  RefundModal,
  type RefundRequest,
} from './RefundModal';
export type { RefundRequest };
import {
  ActivityFeed,
  CoverageTimeline,
  WarrantySummary,
  daysBetween,
  fmtDay,
  fmtStamp,
  periodsByPayment,
  seatPeriods,
  ymdOf,
  type ActivityEvent,
  type Period,
  type TimelineRow,
} from './OrderInsights';
import {
  OrderBillingTab,
  OrderPaymentCard,
  paymentForLabel,
  type OrderBillingAmounts,
} from './OrderBillingPanel';

type OrderTab = 'overview' | 'credentials' | 'billing' | 'activity';

const COUNTRY_OPTIONS = allCountries().map((c) => ({
  value: c.name,
  label: `${c.name} (${c.code})`,
}));

type OrderMeta = {
  order: {
    totalBdt: number;
    paidBdt: number;
    paymentStatus: string;
    source: string;
  } | null;
  items: Array<{
    productId: string;
    planId: string;
    qty: number;
    unitPriceBdt: number;
    listPriceBdt: number;
  }>;
};

type Props = {
  /** Any unit of the order (from ?id=). */
  delivery: DigitalDelivery;
  units: DigitalDelivery[];
  products: DigitalProduct[];
  payments: PaymentTransaction[];
  state: DeliveriesViewState;
  onBack: () => void;
  onTogglePinOrder?: (deliveryId: string) => void;
  onVerifyPayment?: (paymentId: string) => void;
  onRejectPayment?: (paymentId: string) => void;
  onRefundOrder?: (req: RefundRequest) => void;
  onMarkChatRead?: (orderId: string) => void;
  onSetWarrantyStart?: (deliveryIds: string[], startsAt: string) => void;
  onUpdateDeliveryVpn?: (
    deliveryIds: string[],
    patch: { vpnRequired: boolean; vpnRegionNote: string },
  ) => void;
};

const CHAT_PREF = 'bitlogic-admin-order-chat-open';

const hasSecret = (u: DigitalDelivery) =>
  Boolean(u.credentialPayload.secretValue?.trim());

function unitStatus(u: DigitalDelivery): {
  tone: 'emerald' | 'amber' | 'red' | 'blue' | 'zinc';
  label: string;
} {
  if (u.status === 'refunded') return { tone: 'zinc', label: 'Refunded' };
  if (u.status === 'revoked') return { tone: 'zinc', label: 'Revoked' };
  if (u.status === 'warranty_claim') return { tone: 'red', label: 'Claim' };
  if (u.renewalPending && !isServed(u))
    return { tone: 'amber', label: 'Pending assign' };
  if (u.renewalPending) return { tone: 'blue', label: 'Renewed' };
  if (u.status === 'pending_dispatch')
    return { tone: 'amber', label: 'Pending assign' };
  if (u.status === 'replaced') return { tone: 'blue', label: 'Replaced' };
  return { tone: 'emerald', label: 'Delivered' };
}

/** Unit still needs a credential from the admin. */
/** A supplier purchase in flight is not "open": nobody should send a credential by hand meanwhile. */
export const isOpenUnit = (u: DigitalDelivery) =>
  u.supplierState !== 'processing' &&
  (u.status === 'pending_dispatch' || (Boolean(u.renewalPending) && !isServed(u)));

/** Has a credential, or was delivered without one (set up on the buyer's device). */
function isServed(u: DigitalDelivery) {
  return hasSecret(u) || (u.status === 'delivered' && Boolean(u.deliveredAt) && !u.credentialClearedAt);
}

export function OrderDetailView({
  delivery,
  units,
  products,
  payments,
  state,
  onBack,
  onTogglePinOrder,
  onVerifyPayment,
  onRejectPayment,
  onRefundOrder,
  onMarkChatRead,
  onSetWarrantyStart,
  onUpdateDeliveryVpn,
}: Props) {
  const { openActionModal, handleCopy, copiedId } = state;
  const orderId = delivery.orderId;

  const [tab, setTab] = useState<OrderTab>('overview');
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    try {
      setChatOpen(localStorage.getItem(CHAT_PREF) === '1');
    } catch {
      /* ignore */
    }
  }, []);
  const toggleChat = () => {
    setChatOpen((v) => {
      try {
        localStorage.setItem(CHAT_PREF, v ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  const [meta, setMeta] = useState<OrderMeta>({ order: null, items: [] });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/orders?orderId=${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : { order: null, items: [] }))
      .then((d: OrderMeta) => {
        if (!cancelled) setMeta(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  // Supplier purchases (reseller APIs) for units of supplier-sourced options.
  const [supBusy, setSupBusy] = useState<string | null>(null);
  const [supMsg, setSupMsg] = useState<Record<string, string>>({});
  const sourcingOf = (u: DigitalDelivery) =>
    products.find((p) => p.id === u.productId)?.variants.find((v) => v.id === u.variantId)?.sourcing || 'own';
  const supplierAct = async (u: DigitalDelivery, action: 'retry' | 'buy_anyway') => {
    if (action === 'buy_anyway' && !window.confirm('Buy at the supplier’s current price even if it is more than this sale allows?')) return;
    setSupBusy(u.id);
    try {
      const res = await fetch('/api/admin/suppliers/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deliveryId: u.id }),
      });
      const data = await res.json().catch(() => ({}));
      const r = (data.results || [])[0] as { outcome: string; message: string } | undefined;
      setSupMsg((m) => ({
        ...m,
        [u.id]: !res.ok
          ? data.error || 'Could not reach the supplier.'
          : r
            ? r.outcome === 'delivered'
              ? 'Delivered by the supplier.'
              : r.outcome === 'processing'
                ? 'Sent. Waiting for the supplier to deliver.'
                : r.message || r.outcome
            : 'Nothing to buy for this unit.',
      }));
      window.dispatchEvent(new Event(ADMIN_RELOAD_EVENT));
    } finally {
      setSupBusy(null);
    }
  };
  const [noCredUnit, setNoCredUnit] = useState<DigitalDelivery | null>(null);
  const [noCredNote, setNoCredNote] = useState('');
  const [noCredBusy, setNoCredBusy] = useState(false);
  const [noCredError, setNoCredError] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [warrantyEdit, setWarrantyEdit] = useState<{ ids: string[]; label: string; current: string | null } | null>(null);
  const [warrantyAt, setWarrantyAt] = useState('');

  // ----- derived -----
  const lines = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        productId: string;
        variantId: string;
        productName: string;
        variantName: string;
        credentialType: DigitalDelivery['credentialType'];
        units: DigitalDelivery[];
      }
    >();
    for (const u of units) {
      const key = `${u.productId}|${u.variantId}`;
      const cur = map.get(key);
      if (cur) cur.units.push(u);
      else
        map.set(key, {
          key,
          productId: u.productId,
          variantId: u.variantId,
          productName: u.productName,
          variantName: u.variantName,
          credentialType: u.credentialType,
          units: [u],
        });
    }
    return Array.from(map.values());
  }, [units]);

  /** End date, warranty and renew state for one line (live units only). */
  const lineMeta = (lineUnits: DigitalDelivery[]) => {
    const live = lineUnits.filter((u) => u.status !== 'refunded' && u.status !== 'revoked');
    const pool = live.length ? live : lineUnits;
    const endsAt = pool.map((u) => u.orderExpiresAt).filter(Boolean).sort()[0] || null;
    const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
    const daysLeft = endsAt ? Math.round((new Date(endsAt).getTime() - today) / 86_400_000) : null;
    const product = products.find((p) => p.id === pool[0]?.productId);
    const variant = product?.variants.find((v) => v.id === pool[0]?.variantId);
    const ids = new Set(pool.map((u) => u.id));
    const renewalPending = payments.some(
      (p) =>
        p.kind === 'renewal' &&
        p.status === 'pending_verification' &&
        (!p.renewDeliveryIds?.length || p.renewDeliveryIds.some((id) => ids.has(id))),
    );
    return {
      endsAt,
      daysLeft,
      hasWarranty: pool.some((u) => u.hasWarranty),
      warranty: warrantyState(pool[0] || {}),
      liveIds: pool.map((u) => u.id),
      warrantyLeft: Math.max(0, ...pool.map((u) => u.warrantyRemainingDays || 0)),
      warrantyDays: Math.max(0, ...pool.map((u) => u.warrantyDays || 0)),
      renewable: variant ? variant.renewable !== false : true,
      renewalPending,
    };
  };

  const priceFor = (productId: string, variantId: string) => {
    const item = meta.items.find(
      (i) => i.productId === productId && i.planId === variantId,
    );
    if (item) return { unit: item.unitPriceBdt, list: item.listPriceBdt };
    const list =
      products
        .find((p) => p.id === productId)
        ?.variants.find((v) => v.id === variantId)?.priceBDT ?? 0;
    return { unit: list, list };
  };

  const subtotal = lines.reduce(
    (n, l) => n + priceFor(l.productId, l.variantId).unit * l.units.length,
    0,
  );
  // The order total covers the first purchase; renewals are tracked on their own.
  const purchasePays = payments.filter((p) => p.kind !== 'renewal');
  const renewalPays = payments.filter((p) => p.kind === 'renewal');
  const verifiedPaid = purchasePays
    .filter((p) => p.status === 'verified')
    .reduce((n, p) => n + p.amountBDT, 0);
  const renewalsPaid = renewalPays
    .filter((p) => p.status === 'verified')
    .reduce((n, p) => n + p.amountBDT, 0);
  const refunded = payments
    .filter((p) => p.status === 'refunded')
    .reduce((n, p) => n + p.amountBDT, 0);
  const total = meta.order?.totalBdt ?? subtotal;
  const paid = verifiedPaid;
  const pendingAmount = payments
    .filter((p) => p.status === 'pending_verification')
    .reduce((n, p) => n + p.amountBDT, 0);
  const pendingPurchase = purchasePays
    .filter((p) => p.status === 'pending_verification')
    .reduce((n, p) => n + p.amountBDT, 0);
  const refundedPurchase = purchasePays
    .filter((p) => p.status === 'refunded')
    .reduce((n, p) => n + p.amountBDT, 0);
  const due = Math.max(0, total - paid - pendingPurchase - refundedPurchase);
  const discount = Math.max(0, subtotal - total);

  const unreadTotal = units.reduce((n, u) => n + (u.unreadChatCount || 0), 0);
  useEffect(() => {
    if (chatOpen && unreadTotal > 0) onMarkChatRead?.(orderId);
  }, [chatOpen, unreadTotal, orderId, onMarkChatRead]);

  const deliveredCount = units.filter(
    (u) =>
      (u.status === 'delivered' || u.status === 'replaced') &&
      (hasSecret(u) || Boolean(u.deliveredAt)) &&
      !(u.renewalPending && !isServed(u)),
  ).length;
  const openUnits = units.filter(isOpenUnit);
  const closedCount = units.filter((u) => u.status === 'refunded' || u.status === 'revoked').length;
  const activeCount = units.length - closedCount;
  const unread = units.reduce((n, u) => n + (u.unreadChatCount || 0), 0);
  const pinned = units.some((u) => u.pinned);
  const anyRefunded = units.some((u) => u.status === 'refunded');

  const paymentBadge: { tone: 'emerald' | 'amber' | 'red' | 'zinc'; label: string } =
    refunded > 0 && (paid === 0 || refunded >= paid)
      ? { tone: 'zinc', label: 'Refunded' }
      : refunded > 0
        ? { tone: 'amber', label: 'Partly refunded' }
      : pendingAmount > 0 && paid === 0
        ? { tone: 'amber', label: 'Payment pending' }
        : paid >= total && total > 0
          ? { tone: 'emerald', label: 'Paid' }
          : paid > 0
            ? { tone: 'amber', label: 'Partially paid' }
            : total === 0
              ? { tone: 'emerald', label: 'Free' }
              : { tone: 'red', label: 'Unpaid' };

  // Chat lives on the primary unit (first one) — storefront mirrors to every unit.
  const chatUnit = units[0] ?? delivery;

  const submitNoCred = async () => {
    if (!noCredUnit) return;
    if (!noCredNote.trim()) {
      setNoCredError('Note is required.');
      return;
    }
    setNoCredBusy(true);
    setNoCredError('');
    try {
      const res = await fetch('/api/admin/orders/deliver-without-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: noCredUnit.id, note: noCredNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNoCredError(data.error || 'Could not update.');
        return;
      }
      setNoCredUnit(null);
      setNoCredNote('');
      window.dispatchEvent(new Event(ADMIN_RELOAD_EVENT));
    } finally {
      setNoCredBusy(false);
    }
  };

  // ----- sections -----
  const header = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to orders"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <h1 className="font-mono text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-xl">
          {orderId}
        </h1>
        <StatusIndicator tone={paymentBadge.tone} label={paymentBadge.label} />
        <StatusIndicator
          tone={
            activeCount === 0
              ? 'zinc'
              : deliveredCount === activeCount
                ? 'emerald'
                : deliveredCount > 0
                  ? 'blue'
                  : 'amber'
          }
          label={
            activeCount === 0
              ? 'Access ended'
              : activeCount > 1
                ? `Delivered ${deliveredCount}/${activeCount}`
                : deliveredCount === 1
                  ? 'Delivered'
                  : 'Not delivered'
          }
        />
        <span className="text-sm text-slate-500" title={delivery.createdAt}>
          Placed {fmtStamp(delivery.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleChat}
          aria-pressed={chatOpen}
          className={`relative inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium cursor-pointer ${
            chatOpen
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          {chatOpen ? 'Hide chat' : 'Chat'}
          {unread > 0 ? (
            <span className="ml-0.5 rounded-full bg-rose-600 px-1.5 text-xs font-semibold text-white">
              {unread}
            </span>
          ) : null}
        </button>
        {onTogglePinOrder ? (
          <button
            type="button"
            onClick={() => onTogglePinOrder(units[0]?.id ?? delivery.id)}
            aria-label={pinned ? 'Unpin order' : 'Pin order'}
            title={pinned ? 'Unpin' : 'Pin'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
          >
            {pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
          </button>
        ) : null}
        {openUnits.length > 0 ? (
          <button
            type="button"
            onClick={() => openActionModal(openUnits[0], false)}
            className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
          >
            Send credentials ({openUnits.length})
          </button>
        ) : null}
      </div>
    </div>
  );

  const itemsCard = (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
        <h2 className="font-display text-base font-semibold">Items</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
            <th className="px-5 py-2.5 font-medium">Product</th>
            <th className="px-3 py-2.5 font-medium text-right">Qty</th>
            <th className="hidden px-3 py-2.5 font-medium text-right sm:table-cell">Price</th>
            <th className="px-5 py-2.5 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((l) => {
            const p = priceFor(l.productId, l.variantId);
            return (
              <tr key={l.key}>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {l.productName}
                  </div>
                  <div className="text-slate-500">
                    {l.variantName}
                    <span className="hidden sm:inline"> · {getCredentialTypeLabel(l.credentialType)}</span>
                    <span className="sm:hidden"> · {formatBDT(p.unit)} each</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{l.units.length}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums sm:table-cell">
                  {formatBDT(p.unit)}
                  {p.unit !== p.list ? (
                    <div className="text-xs text-slate-400 line-through">{formatBDT(p.list)}</div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums font-semibold">
                  {formatBDT(p.unit * l.units.length)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <dl className="space-y-1.5 border-t border-slate-200/80 px-5 py-4 text-sm dark:border-slate-800">
        {discount > 0 ? (
          <>
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-mono tabular-nums">{formatBDT(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-mono tabular-nums">−{formatBDT(discount)}</dd></div>
          </>
        ) : null}
        <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="font-mono tabular-nums">{formatBDT(total)}</dd></div>
      </dl>
    </Card>
  );

  const credentialsCard = (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
        <h2 className="font-display text-base font-semibold">Credentials</h2>
        <span className="text-sm tabular-nums text-slate-500">
          {deliveredCount}/{activeCount} delivered
          {closedCount > 0 ? ` · ${closedCount} ended` : ''}
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {lines.map((l) => {
          const lineIds = l.units.map((u) => u.id);
          const lineVpn = l.units.some((u) => u.vpnRequired);
          const lineRegion =
            l.units.find((u) => u.vpnRegionNote?.trim())?.vpnRegionNote?.trim() ||
            '';
          const regionValue = findCountry(lineRegion)?.name || lineRegion;
          const m = lineMeta(l.units);
          return (
          <section key={l.key} className="space-y-2.5 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {l.productName}
                  <span className="font-normal text-slate-500"> · {l.variantName}</span>
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {m.renewable ? 'Renewable' : 'One-time'}
                  </span>
                  {m.hasWarranty ? (
                    <span className="text-slate-500">{m.warrantyDays}d warranty</span>
                  ) : (
                    <span className="text-slate-500">No warranty</span>
                  )}
                  {m.hasWarranty && onSetWarrantyStart ? (
                    <button
                      type="button"
                      onClick={() =>
                        setWarrantyEdit({
                          ids: m.liveIds,
                          label: `${l.productName} · ${l.variantName}`,
                          current: m.warranty.startsAt,
                        })
                      }
                      className="font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
                    >
                      Change warranty start
                    </button>
                  ) : null}
                  {m.renewalPending ? (
                    <StatusIndicator tone="amber" label="Renew pending" />
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-slate-500">
                × {l.units.length}
              </span>
            </div>
            <ul className="space-y-2">
              {l.units.map((u, i) => {
                const st = unitStatus(u);
                const secret = u.credentialPayload.secretValue?.trim();
                const audit = u.credentialAudit || [];
                const open = historyOpen === u.id;
                const closed = u.status === 'refunded' || u.status === 'revoked';
                const end = (u.orderExpiresAt || u.credentialExpiresAt || '').slice(0, 10);
                const left = end ? daysBetween(ymdOf(new Date()), end) : null;
                return (
                  <li key={u.id} className="rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3.5 py-3">
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                          #{i + 1}
                        </span>
                        <StatusIndicator tone={st.tone} label={st.label} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {secret ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate rounded bg-slate-100 px-2 py-1 font-mono text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                              {secret}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`od-${u.id}`, secret)}
                              aria-label="Copy credential"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 cursor-pointer"
                            >
                              {copiedId === `od-${u.id}` ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {u.status === 'delivered' && u.deliveredAt
                              ? 'Delivered without credential'
                              : u.credentialClearedAt
                                ? 'Cleared after window ended'
                                : 'No credential yet'}
                          </span>
                        )}
                        {end ? (
                          <div className="mt-1 text-xs tabular-nums text-slate-500">
                            {closed || (left !== null && left < 0) ? (
                              <span>
                                Access ended{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {fmtDay(end, true)}
                                </span>
                              </span>
                            ) : (
                              <span>
                                Until{' '}
                                <span
                                  className={
                                    left !== null && left <= 3
                                      ? 'font-semibold text-amber-700 dark:text-amber-400'
                                      : 'font-semibold text-slate-800 dark:text-slate-100'
                                  }
                                >
                                  {fmtDay(end, true)}
                                </span>
                                <span className="text-slate-400"> · </span>
                                {left === 0 ? 'last day' : `${left}d left`}
                              </span>
                            )}
                            {u.credentialPayload.profilePin ? (
                              <span>
                                {' '}
                                · PIN{' '}
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                  {u.credentialPayload.profilePin}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {u.hasWarranty && !closed ? (
                          <div className="mt-1.5">
                            <WarrantySummary fields={u} compact />
                          </div>
                        ) : null}
                        {u.supplierState && !closed ? (
                          <div className="mt-1.5 text-xs">
                            {u.supplierState === 'processing' ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-400">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden /> Buying from supplier…
                              </span>
                            ) : u.supplierState === 'delivered' ? (
                              <span className="text-slate-500">Bought from supplier</span>
                            ) : u.supplierState === 'needs_review' ? (
                              <span className="font-medium text-amber-700 dark:text-amber-400">Supplier price is higher than this sale allows — buy anyway, or refund.</span>
                            ) : u.supplierState === 'failed' && !secret ? (
                              <span className="font-medium text-rose-700 dark:text-rose-400">Supplier purchase failed (retries every 30 min). See Suppliers → Purchases.</span>
                            ) : null}
                          </div>
                        ) : null}
                        {supMsg[u.id] ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{supMsg[u.id]}</div> : null}
                      </div>
                      {!closed && u.supplierState === 'processing' ? null : !closed ? (
                        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5 self-center">
                          {secret ? (
                            <button
                              type="button"
                              onClick={() => openActionModal(u, true)}
                              className="h-8 rounded-md border border-slate-200 px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
                            >
                              Replace
                            </button>
                          ) : (
                            <>
                              {isOpenUnit(u) && sourcingOf(u) !== 'own' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={supBusy === u.id}
                                    onClick={() => void supplierAct(u, 'retry')}
                                    className="h-8 rounded-md bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
                                  >
                                    {supBusy === u.id ? 'Buying…' : u.supplierState === 'failed' ? 'Retry supplier' : 'Buy from supplier'}
                                  </button>
                                  {u.supplierState === 'needs_review' ? (
                                    <button
                                      type="button"
                                      disabled={supBusy === u.id}
                                      onClick={() => void supplierAct(u, 'buy_anyway')}
                                      className="h-8 rounded-md border border-amber-300 px-3 text-sm font-medium text-amber-800 hover:border-amber-500 dark:border-amber-800 dark:text-amber-300 cursor-pointer"
                                    >
                                      Buy anyway
                                    </button>
                                  ) : null}
                                </>
                              ) : null}
                              {isOpenUnit(u) ? (
                                <button
                                  type="button"
                                  onClick={() => openActionModal(u, false)}
                                  className="h-8 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                  Send
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openActionModal(u, false)}
                                  className="h-8 rounded-md border border-slate-200 px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
                                >
                                  Add credential
                                </button>
                              )}
                              {u.status === 'pending_dispatch' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoCredUnit(u);
                                    setNoCredNote('');
                                    setNoCredError('');
                                  }}
                                  className="h-8 rounded-md border border-slate-200 px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
                                >
                                  No credential
                                </button>
                              ) : null}
                            </>
                          )}
                          {audit.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setHistoryOpen(open ? null : u.id)}
                              aria-expanded={open}
                              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            >
                              History{' '}
                              {open ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {open ? (
                      <ol className="space-y-2 border-t border-slate-100 px-3.5 py-3 dark:border-slate-800">
                        {audit.map((a) => (
                          <li key={a.id} className="text-sm">
                            <span className="font-medium capitalize">{a.action}</span>
                            <span className="text-slate-500">
                              {' '}
                              · {a.at} ·{' '}
                              {a.source === 'vault'
                                ? 'Stock'
                                : a.source === 'system'
                                  ? 'System'
                                  : 'Manual'}
                            </span>
                            {a.secretValue ? (
                              <div className="break-all font-mono text-xs text-slate-600 dark:text-slate-400">
                                {a.secretValue}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {u.warrantyClaimReason && u.status === 'warranty_claim' ? (
                      <div className="border-t border-rose-100 bg-rose-50 px-3.5 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                        {u.warrantyClaimReason}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900/40">
              <SwitchToggle
                checked={lineVpn}
                label="VPN"
                onChange={(next) =>
                  onUpdateDeliveryVpn?.(lineIds, {
                    vpnRequired: next,
                    vpnRegionNote: next ? regionValue : '',
                  })
                }
              />
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 ${
                  lineVpn ? '' : 'pointer-events-none opacity-50'
                }`}
              >
                <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Region
                </span>
                <SearchableSelect
                  value={regionValue}
                  onChange={(name) =>
                    onUpdateDeliveryVpn?.(lineIds, {
                      vpnRequired: true,
                      vpnRegionNote: name,
                    })
                  }
                  options={COUNTRY_OPTIONS}
                  placeholder="Search country…"
                  searchPlaceholder="Type country name…"
                  emptyText="No country found"
                  disabled={!lineVpn || !onUpdateDeliveryVpn}
                  className="min-w-0 flex-1"
                />
              </div>
            </div>
          </section>
          );
        })}
      </div>
    </Card>
  );

  const customerCard = (
    <Card className="p-5 space-y-3">
      <h2 className="font-display text-base font-semibold">Customer</h2>
      <div>
        <div className="font-medium text-slate-900 dark:text-slate-100">{delivery.buyerName}</div>
        <div className="text-sm text-slate-600 dark:text-slate-300 break-all">{delivery.buyerEmail}</div>
        {delivery.buyerPhone ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">{delivery.buyerPhone}</div>
        ) : null}
      </div>
      <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">Source</dt><dd>{meta.order?.source === 'admin' ? 'Manual' : 'Storefront'}</dd></div>
      </dl>
    </Card>
  );

  // ----- billing (timeline + activity still use seat history) -----
  const orderDate = (delivery.createdAt || '').slice(0, 10) || ymdOf(new Date());
  const seatHistory = useMemo(() => {
    const m = new Map<string, Period[]>();
    for (const u of units) m.set(u.id, seatPeriods(u, payments, orderDate));
    return m;
  }, [units, payments, orderDate]);
  const payPeriods = useMemo(() => periodsByPayment(seatHistory), [seatHistory]);
  const verifiedRenewals = renewalPays.filter((p) => p.status === 'verified');
  const pendingPays = payments.filter((p) => p.status === 'pending_verification');
  const lifetime = paid + renewalsPaid - refunded;
  const paymentForCtx = { lines, units };
  const billingAmounts: OrderBillingAmounts = {
    total,
    paid,
    renewalsPaid,
    verifiedRenewalCount: verifiedRenewals.length,
    pendingAmount,
    refunded,
    due,
    lifetime,
  };
  const openRefund =
    onRefundOrder && payments.some((p) => p.status === 'verified')
      ? () => setRefundOpen(true)
      : undefined;
  const paymentCard = (
    <OrderPaymentCard
      paymentBadge={paymentBadge}
      amounts={billingAmounts}
      payments={payments}
      pendingPays={pendingPays}
      lines={lines}
      units={units}
      onGoToBilling={() => setTab('billing')}
      onVerifyPayment={onVerifyPayment}
      onRejectPayment={onRejectPayment}
      onRefund={openRefund}
      handleCopy={handleCopy}
      copiedId={copiedId}
    />
  );

  // ----- subscriptions (one card per product line, one row per seat) -----
  const today = ymdOf(new Date());
  const subscriptionsCard = (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3 dark:border-slate-800">
        <h2 className="font-display text-base font-semibold">Subscriptions</h2>
        <span className="text-xs tabular-nums text-slate-500">
          {activeCount} live
          {closedCount > 0 ? ` · ${closedCount} ended` : ''}
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {lines.map((l) => {
          const m = lineMeta(l.units);
          const price = priceFor(l.productId, l.variantId);
          return (
            <section key={l.key} className="px-5 py-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {l.productName}
                  <span className="font-normal text-slate-500"> · {l.variantName}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                    {formatBDT(price.unit)}
                    <span className="font-sans font-normal text-slate-400"> / seat</span>
                  </span>
                  <span aria-hidden className="text-slate-300">·</span>
                  <span>
                    {l.units.length} seat{l.units.length === 1 ? '' : 's'}
                  </span>
                  {!m.renewable ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      One-time
                    </span>
                  ) : null}
                  {m.renewalPending ? (
                    <StatusIndicator tone="amber" label="Renew pending" />
                  ) : null}
                </div>
              </div>

              <ul className="space-y-2">
                {l.units.map((u, i) => {
                  const closed = u.status === 'refunded' || u.status === 'revoked';
                  const hist = seatHistory.get(u.id) || [];
                  const paidPeriods = hist.filter((p) => p.kind !== 'pending');
                  const renewCount = paidPeriods.filter(
                    (p) => p.kind === 'renewal',
                  ).length;
                  const current =
                    paidPeriods.find((p) => p.from <= today && p.to >= today) ||
                    paidPeriods[paidPeriods.length - 1];
                  const end = (u.orderExpiresAt || '').slice(0, 10);
                  const left = end ? daysBetween(today, end) : null;
                  const curLen = current
                    ? Math.max(1, daysBetween(current.from, current.to) + 1)
                    : 1;
                  const used = current
                    ? Math.min(
                        curLen,
                        Math.max(0, daysBetween(current.from, today) + 1),
                      )
                    : 0;
                  const pct =
                    closed || (left !== null && left < 0)
                      ? 100
                      : Math.round((used / curLen) * 100);
                  const st = unitStatus(u);
                  return (
                    <li
                      key={u.id}
                      className={`rounded-md border border-slate-200/90 px-3 py-2.5 dark:border-slate-800 ${
                        closed ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            #{i + 1}
                          </span>
                          <StatusIndicator tone={st.tone} label={st.label} />
                          {renewCount > 0 ? (
                            <span className="text-[11px] tabular-nums text-slate-500">
                              {renewCount} renew
                              {renewCount === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs tabular-nums">
                          {closed ? (
                            <span className="text-slate-500">Ended</span>
                          ) : left === null ? (
                            <span className="text-slate-400">—</span>
                          ) : left < 0 ? (
                            <span className="font-medium text-rose-600 dark:text-rose-400">
                              Ended {fmtDay(end, true)}
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              <span
                                className={
                                  left <= 3
                                    ? 'font-semibold text-amber-700 dark:text-amber-400'
                                    : 'font-semibold text-slate-800 dark:text-slate-100'
                                }
                              >
                                {fmtDay(end, true)}
                              </span>
                              <span className="text-slate-400"> · </span>
                              {left === 0 ? 'today' : `${left}d left`}
                            </span>
                          )}
                        </div>
                      </div>

                      {current && !closed ? (
                        <div className="mt-2">
                          <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                left !== null && left <= 3
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-400">
                            <span>{fmtDay(current.from, true)}</span>
                            <span>{fmtDay(current.to, true)}</span>
                          </div>
                        </div>
                      ) : null}

                      {u.hasWarranty && !closed ? (
                        <div className="mt-2">
                          <WarrantySummary fields={u} compact />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );

  const timelineRows: TimelineRow[] = lines.flatMap((l) =>
    l.units.map((u, i) => ({
      id: u.id,
      label: `${l.productName}${l.units.length > 1 ? ` #${i + 1}` : ''}`,
      sub: l.variantName,
      closed: u.status === 'refunded' || u.status === 'revoked',
      periods: seatHistory.get(u.id) || [],
    })),
  );
  const timelineCard = (
    <Card className="p-5">
      <h2 className="font-display mb-4 text-base font-semibold">Timeline</h2>
      <CoverageTimeline rows={timelineRows} />
    </Card>
  );

  // ----- activity -----
  const activity: ActivityEvent[] = useMemo(() => {
    const ev: ActivityEvent[] = [];
    const firstStamp = units.map((u) => u.createdAt).filter(Boolean).sort()[0] || delivery.createdAt;
    if (firstStamp) {
      ev.push({
        at: firstStamp,
        kind: 'order',
        title: `Order placed${meta.order?.source === 'admin' ? ' by admin' : ''}`,
        detail: `${lines.map((l) => `${l.productName} · ${l.variantName} ×${l.units.length}`).join(', ')} · ${formatBDT(total)}`,
      });
    }
    for (const p of payments) {
      const what = p.kind === 'renewal' ? 'Renewal payment' : 'Payment';
      const per = payPeriods.get(p.id);
      // Refund rows are money-out — don't also count them as "payment received".
      if (p.status !== 'refunded' || p.trxId !== 'REFUND') {
        ev.push({
          at: p.createdAt,
          kind: 'payment',
          title: `${what} received · ${formatBDT(p.amountBDT)} via ${p.gateway}`,
          detail: [paymentForLabel(p, paymentForCtx), p.trxId && p.trxId !== '—' ? `TrxID ${p.trxId}` : '']
            .filter(Boolean)
            .join(' · '),
        });
      }
      if (p.status === 'verified' && p.verifiedAt) {
        ev.push({
          at: p.verifiedAt,
          kind: p.kind === 'renewal' ? 'renewal' : 'verified',
          title: p.kind === 'renewal' ? 'Renewal verified' : 'Payment verified',
          detail: p.kind === 'renewal' && per ? `Access extended to ${fmtDay(per.to)}` : undefined,
        });
      }
      if (p.status === 'rejected') {
        ev.push({
          at: p.verifiedAt || p.createdAt,
          kind: 'rejected',
          title: `${what} rejected`,
          detail: formatBDT(p.amountBDT),
        });
      }
      if (p.status === 'refunded') {
        ev.push({
          at: p.verifiedAt || p.createdAt,
          kind: 'refund',
          title: `Refund · ${formatBDT(p.amountBDT)}`,
          detail: paymentForLabel(p, paymentForCtx) || p.productSummary,
        });
      }
    }
    for (const l of lines) {
      l.units.forEach((u, i) => {
        const who = `${l.productName}${l.units.length > 1 ? ` #${i + 1}` : ''}`;
        const audits = u.credentialAudit || [];
        for (const a of audits) {
          ev.push({
            at: a.at,
            kind: 'credential',
            title: `Credential ${a.action} · ${who}`,
            detail: a.source === 'vault' ? 'From stock' : a.source === 'system' ? 'Automatic' : 'Entered by admin',
          });
        }
        if (u.deliveredAt && !audits.some((a) => a.action === 'assigned')) {
          ev.push({
            at: u.deliveredAt,
            kind: 'delivered',
            title: `Delivered · ${who}`,
            detail: hasSecret(u) ? undefined : 'Without a credential',
          });
        }
        if (u.status === 'refunded') {
          const refundPay = payments
            .filter((p) => p.status === 'refunded')
            .sort((a, b) =>
              (b.verifiedAt || b.createdAt).localeCompare(a.verifiedAt || a.createdAt),
            )[0];
          const chatHit = (u.chatMessages || [])
            .filter((m) => /refund of BDT|has been cancelled/i.test(m.text))
            .sort((a, b) => b.time.localeCompare(a.time))[0];
          ev.push({
            at: refundPay?.verifiedAt || refundPay?.createdAt || chatHit?.time || u.createdAt,
            kind: 'refund',
            title: `Access ended · ${who}`,
            detail: 'Refunded',
          });
        }
        if (u.hasWarranty && u.warrantyStartsAt && u.warrantyStartsAt <= toStamp(new Date())) {
          ev.push({
            at: u.warrantyStartsAt,
            kind: 'warranty',
            title: `Warranty started · ${who}`,
            detail: `Until ${fmtStamp(u.warrantyEndsAt)}`,
          });
        }
      });
    }
    return ev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, payments, payPeriods, meta.order?.source, total]);

  const notesCard = (
    <OrderNotesPanel
      key={orderId}
      orderId={orderId}
      deliveryId={units[0]?.id ?? delivery.id}
      canDeliverWithoutCredential={false}
    />
  );

  const chatCard = (
    <div className="xl:sticky xl:top-4">
      <div className="mb-2 flex items-center justify-between xl:hidden">
        <h2 className="font-display text-base font-semibold">Chat</h2>
        <button type="button" onClick={toggleChat} aria-label="Hide chat" className="p-1.5 text-slate-500 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>
      <DeliveryChatPanel chatOnly delivery={chatUnit} state={state} />
    </div>
  );

  // ----- summary strip -----
  const liveSeats = units.filter((u) => u.status !== 'refunded' && u.status !== 'revoked');
  const nextEnd = liveSeats
    .map((u) => ({ u, end: (u.orderExpiresAt || '').slice(0, 10) }))
    .filter((x) => x.end)
    .sort((a, b) => a.end.localeCompare(b.end))[0];
  const nextLeft = nextEnd ? daysBetween(today, nextEnd.end) : null;
  const lastRenewal = [...verifiedRenewals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const pendingRenewals = renewalPays.filter((p) => p.status === 'pending_verification').length;
  const kpis: Array<{ label: string; value: string; sub: string; tone?: string }> = [
    {
      label: 'Order value',
      value: formatBDT(total),
      sub: due > 0 ? `${formatBDT(due)} due` : paymentBadge.label,
      tone: due > 0 ? 'text-rose-700 dark:text-rose-400' : undefined,
    },
    {
      label: 'Renewals',
      value: verifiedRenewals.length ? `${verifiedRenewals.length} · ${formatBDT(renewalsPaid)}` : '—',
      sub: pendingRenewals
        ? `${pendingRenewals} pending`
        : lastRenewal
          ? `Last ${fmtDay(lastRenewal.createdAt, true)}`
          : 'None',
      tone: pendingRenewals ? 'text-amber-700 dark:text-amber-400' : undefined,
    },
    {
      label: 'Received',
      value: formatBDT(lifetime),
      sub: refunded > 0 ? `−${formatBDT(refunded)} refund` : 'Buy + renew',
    },
    {
      label: 'Next end',
      value: nextEnd ? fmtDay(nextEnd.end, true) : '—',
      sub: !nextEnd
        ? activeCount === 0
          ? 'Ended'
          : '—'
        : nextLeft !== null && nextLeft < 0
          ? `Ended · ${nextEnd.u.productName}`
          : `${nextLeft === 0 ? 'Today' : `${nextLeft}d left`} · ${nextEnd.u.productName}`,
      tone: nextLeft !== null && nextLeft <= 3 ? 'text-amber-700 dark:text-amber-400' : undefined,
    },
  ];
  const kpiStrip = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label} className="px-4 py-3.5">
          <div className="text-xs font-medium text-slate-500">{k.label}</div>
          <div className="mt-1 font-display text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">{k.value}</div>
          <div className={`mt-0.5 truncate text-xs ${k.tone || 'text-slate-500'}`}>{k.sub}</div>
        </Card>
      ))}
    </div>
  );

  const TABS: Array<{ id: OrderTab; label: string; count?: number; alert?: boolean }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'credentials', label: 'Credentials', count: openUnits.length || undefined, alert: openUnits.length > 0 },
    { id: 'billing', label: 'Payments', count: payments.length, alert: pendingPays.length > 0 },
    { id: 'activity', label: 'Activity' },
  ];
  const tabBar = (
    <div role="tablist" aria-label="Order sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {TABS.map((t) => {
        const on = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium cursor-pointer ${
              on
                ? 'border-emerald-600 text-slate-900 dark:text-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  t.alert
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const billingTab = (
    <OrderBillingTab
      payments={payments}
      paid={paid}
      renewalsPaid={renewalsPaid}
      refunded={refunded}
      payPeriods={payPeriods}
      lines={lines}
      units={units}
      onVerifyPayment={onVerifyPayment}
      onRejectPayment={onRejectPayment}
      onRefund={openRefund}
      handleCopy={handleCopy}
      copiedId={copiedId}
    />
  );

  const activityTab = (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Activity</h2>
        <ActivityFeed events={activity} />
      </Card>
      {notesCard}
    </div>
  );

  const mainContent =
    tab === 'overview' ? (
      <>
        {subscriptionsCard}
        {timelineCard}
        {itemsCard}
      </>
    ) : tab === 'credentials' ? (
      credentialsCard
    ) : tab === 'billing' ? (
      billingTab
    ) : (
      activityTab
    );
  const sideContent = (
    <>
      {paymentCard}
      {customerCard}
      {tab === 'overview' || tab === 'credentials' ? notesCard : null}
    </>
  );

  return (
    <div className="space-y-5">
      {header}
      {kpiStrip}
      {tabBar}

      {chatOpen ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
          <div className="order-2 space-y-5 xl:order-1 xl:col-span-7">
            {mainContent}
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">{sideContent}</div>
          </div>
          <div className="order-1 xl:order-2 xl:col-span-5">{chatCard}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          <div className="space-y-5 lg:col-span-8">{mainContent}</div>
          <div className="space-y-5 lg:col-span-4">{sideContent}</div>
        </div>
      )}

      <ModalShell
        open={Boolean(warrantyEdit)}
        onClose={() => setWarrantyEdit(null)}
        title="Warranty start"
        maxWidth="max-w-md"
      >
        {warrantyEdit ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {warrantyEdit.label}
              {warrantyEdit.current ? ` · now starts ${warrantyEdit.current}` : ' · not started yet'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Now', h: 0 },
                { label: '+12 hours', h: 12 },
                { label: '+24 hours', h: 24 },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => {
                    onSetWarrantyStart?.(warrantyEdit.ids, toStamp(new Date(Date.now() + o.h * 3_600_000)));
                    setWarrantyEdit(null);
                  }}
                  className="h-10 rounded-md border border-slate-200 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1.5">
                <span className="text-sm font-medium">Exact date &amp; time</span>
                <input
                  type="datetime-local"
                  value={warrantyAt}
                  onChange={(e) => setWarrantyAt(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                />
              </label>
              <button
                type="button"
                disabled={!warrantyAt}
                onClick={() => {
                  onSetWarrantyStart?.(warrantyEdit.ids, warrantyAt.replace('T', ' '));
                  setWarrantyEdit(null);
                  setWarrantyAt('');
                }}
                className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                Set
              </button>
            </div>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={Boolean(noCredUnit)}
        onClose={() => setNoCredUnit(null)}
        title="Deliver without credential"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          {noCredUnit ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {noCredUnit.productName} · {noCredUnit.variantName}
            </p>
          ) : null}
          <textarea
            rows={3}
            maxLength={2000}
            value={noCredNote}
            onChange={(e) => setNoCredNote(e.target.value)}
            placeholder="How it was delivered (required)"
            aria-label="Delivery note"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
          />
          {noCredError ? <p role="alert" className="text-sm text-rose-600">{noCredError}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNoCredUnit(null)} className="h-9 rounded-md border border-slate-200 px-4 text-sm dark:border-slate-700 cursor-pointer">Cancel</button>
            <button type="button" disabled={noCredBusy} onClick={submitNoCred} className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer">Mark delivered</button>
          </div>
        </div>
      </ModalShell>

      {refundOpen && onRefundOrder ? (
        <RefundModal
          orderId={orderId}
          units={units}
          payments={payments.filter((p) => p.status === 'verified')}
          onClose={() => setRefundOpen(false)}
          onConfirm={(req) => {
            onRefundOrder(req);
            setRefundOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

