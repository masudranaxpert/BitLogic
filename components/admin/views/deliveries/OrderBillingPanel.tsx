'use client';

import React from 'react';
import { Check, Copy } from 'lucide-react';
import type { DigitalDelivery, PaymentTransaction } from '@/lib/admin-data';
import {
  Card,
  GatewayBadge,
  StatusIndicator,
  formatBDT,
} from '@/components/admin/ui/primitives';
import {
  BillingChart,
  fmtDay,
  fmtStamp,
  periodMonths,
  periodsByPayment,
} from './OrderInsights';

export type PaymentPeriodByPayId = ReturnType<typeof periodsByPayment>;

export type OrderBillingLine = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  units: DigitalDelivery[];
};

export type PaymentBadge = {
  tone: 'emerald' | 'amber' | 'red' | 'zinc';
  label: string;
};

export type OrderBillingAmounts = {
  total: number;
  paid: number;
  renewalsPaid: number;
  verifiedRenewalCount: number;
  pendingAmount: number;
  refunded: number;
  due: number;
  lifetime: number;
};

type PaymentForContext = {
  lines: OrderBillingLine[];
  units: DigitalDelivery[];
};

const seatLabel = (u: DigitalDelivery, lines: OrderBillingLine[]) => {
  const line = lines.find((l) => l.productId === u.productId && l.variantId === u.variantId);
  const n = line ? line.units.indexOf(u) + 1 : 1;
  return { name: `${u.productName} · ${u.variantName}`, n, multi: (line?.units.length || 1) > 1 };
};

/** What a payment paid for, in words: "ChatGPT Plus · Shared — seat #1". */
export function paymentForLabel(p: PaymentTransaction, ctx: PaymentForContext) {
  const { lines, units } = ctx;
  if (p.kind !== 'renewal') {
    return lines
      .map(
        (l) =>
          `${l.productName} · ${l.variantName}${l.units.length > 1 ? ` ×${l.units.length}` : ''}`,
      )
      .join(', ');
  }
  const ids = p.renewDeliveryIds?.length
    ? p.renewDeliveryIds
    : p.deliveryId
      ? [p.deliveryId]
      : units.filter((u) => u.status !== 'refunded' && u.status !== 'revoked').map((u) => u.id);
  const groups = new Map<string, number[]>();
  for (const id of ids) {
    const u = units.find((x) => x.id === id);
    if (!u) continue;
    const s = seatLabel(u, lines);
    const list = groups.get(s.name) || [];
    if (s.multi) list.push(s.n);
    groups.set(s.name, list);
  }
  const text = Array.from(groups.entries())
    .map(([name, seats]) =>
      seats.length ? `${name} — seat ${seats.sort((a, b) => a - b).map((n) => `#${n}`).join(', ')}` : name,
    )
    .join('; ');
  return text || p.productSummary.replace(/^Renewal · /, '');
}

const payStatus = (p: PaymentTransaction) =>
  p.status === 'verified'
    ? { tone: 'emerald' as const, label: 'Verified' }
    : p.status === 'pending_verification'
      ? { tone: 'amber' as const, label: 'To verify' }
      : p.status === 'refunded'
        ? { tone: 'zinc' as const, label: 'Refunded' }
        : { tone: 'red' as const, label: 'Rejected' };

type PaymentActionHandlers = {
  onVerifyPayment?: (paymentId: string) => void;
  onRejectPayment?: (paymentId: string) => void;
};

type CopyHandlers = {
  handleCopy: (key: string, text: string) => void;
  copiedId: string | null;
};

function PayActions({
  p,
  onVerifyPayment,
  onRejectPayment,
}: { p: PaymentTransaction } & PaymentActionHandlers) {
  if (p.status !== 'pending_verification' || (!onVerifyPayment && !onRejectPayment)) return null;
  return (
    <div className="flex gap-1.5">
      {onVerifyPayment ? (
        <button
          type="button"
          onClick={() => onVerifyPayment(p.id)}
          className="h-8 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          Verify
        </button>
      ) : null}
      {onRejectPayment ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reject this payment?')) onRejectPayment(p.id);
          }}
          className="h-8 rounded-md border border-slate-200 px-3 text-sm font-medium text-rose-600 hover:border-rose-400 dark:border-slate-700 cursor-pointer"
        >
          Reject
        </button>
      ) : null}
    </div>
  );
}

function TrxButton({ p, handleCopy, copiedId }: { p: PaymentTransaction } & CopyHandlers) {
  const trx = p.trxId?.trim() && p.trxId !== '—' ? p.trxId.trim() : '';
  if (!trx) return <span className="text-xs text-slate-400">No TrxID</span>;
  const copyKey = `pay-trx-${p.id}`;
  return (
    <button
      type="button"
      onClick={() => handleCopy(copyKey, trx)}
      title="Copy TrxID"
      className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 cursor-pointer"
    >
      <span className="truncate">{trx}</span>
      {copiedId === copyKey ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      )}
    </button>
  );
}

function RefundButton({ onRefund }: { onRefund?: () => void }) {
  if (!onRefund) return null;
  return (
    <button
      type="button"
      onClick={onRefund}
      className="h-9 rounded-md border border-slate-200 px-4 text-sm font-medium text-rose-600 hover:border-rose-400 dark:border-slate-700 cursor-pointer"
    >
      Refund
    </button>
  );
}

function BillingSummaryRows({ amounts }: { amounts: OrderBillingAmounts }) {
  const {
    total,
    paid,
    renewalsPaid,
    verifiedRenewalCount,
    pendingAmount,
    refunded,
    due,
    lifetime,
  } = amounts;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Order total</dt>
        <dd className="font-mono tabular-nums">{formatBDT(total)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">Paid for order</dt>
        <dd className="font-mono tabular-nums">{formatBDT(paid)}</dd>
      </div>
      {renewalsPaid > 0 ? (
        <div className="flex justify-between">
          <dt className="text-slate-500">Renewals ({verifiedRenewalCount})</dt>
          <dd className="font-mono tabular-nums">{formatBDT(renewalsPaid)}</dd>
        </div>
      ) : null}
      {pendingAmount > 0 ? (
        <div className="flex justify-between text-amber-700 dark:text-amber-400">
          <dt>Pending</dt>
          <dd className="font-mono tabular-nums">{formatBDT(pendingAmount)}</dd>
        </div>
      ) : null}
      {refunded > 0 ? (
        <div className="flex justify-between">
          <dt className="text-slate-500">Refunded</dt>
          <dd className="font-mono tabular-nums">−{formatBDT(refunded)}</dd>
        </div>
      ) : null}
      {due > 0 ? (
        <div className="flex justify-between font-semibold text-rose-700 dark:text-rose-400">
          <dt>Due</dt>
          <dd className="font-mono tabular-nums">{formatBDT(due)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold dark:border-slate-800">
        <dt>Total received</dt>
        <dd className="font-mono tabular-nums">{formatBDT(lifetime)}</dd>
      </div>
    </dl>
  );
}

export type OrderPaymentCardProps = {
  paymentBadge: PaymentBadge;
  amounts: OrderBillingAmounts;
  payments: PaymentTransaction[];
  pendingPays: PaymentTransaction[];
  lines: OrderBillingLine[];
  units: DigitalDelivery[];
  onGoToBilling: () => void;
  onRefund?: () => void;
} & PaymentActionHandlers &
  CopyHandlers;

export function OrderPaymentCard({
  paymentBadge,
  amounts,
  payments,
  pendingPays,
  lines,
  units,
  onGoToBilling,
  onVerifyPayment,
  onRejectPayment,
  onRefund,
  handleCopy,
  copiedId,
}: OrderPaymentCardProps) {
  const payCtx = { lines, units };
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Payment</h2>
        <StatusIndicator tone={paymentBadge.tone} label={paymentBadge.label} />
      </div>
      <BillingSummaryRows amounts={amounts} />
      {pendingPays.length > 0 ? (
        <ul className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {pendingPays.map((p) => (
            <li
              key={p.id}
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GatewayBadge gateway={p.gateway} />
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatBDT(p.amountBDT)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Needs verify
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {paymentForLabel(p, payCtx)}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TrxButton p={p} handleCopy={handleCopy} copiedId={copiedId} />
                <PayActions p={p} onVerifyPayment={onVerifyPayment} onRejectPayment={onRejectPayment} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onGoToBilling}
          className="h-9 flex-1 rounded-md border border-slate-200 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
        >
          All payments ({payments.length})
        </button>
        <RefundButton onRefund={onRefund} />
      </div>
    </Card>
  );
}

const TX_COLS = 'md:grid-cols-[96px_minmax(0,1fr)_150px_96px_120px]';

export type OrderTransactionsCardProps = {
  payments: PaymentTransaction[];
  payPeriods: PaymentPeriodByPayId;
  lines: OrderBillingLine[];
  units: DigitalDelivery[];
  onRefund?: () => void;
} & PaymentActionHandlers &
  CopyHandlers;

export function OrderTransactionsCard({
  payments,
  payPeriods,
  lines,
  units,
  onVerifyPayment,
  onRejectPayment,
  onRefund,
  handleCopy,
  copiedId,
}: OrderTransactionsCardProps) {
  const payCtx = { lines, units };
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
        <h2 className="font-display text-base font-semibold">Transactions</h2>
        <RefundButton onRefund={onRefund} />
      </div>
      {payments.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No payment recorded.</p>
      ) : (
        <>
          <div
            className={`hidden gap-4 border-b border-slate-100 px-5 py-2.5 text-xs font-medium text-slate-500 md:grid dark:border-slate-800 ${TX_COLS}`}
          >
            <span>Date</span>
            <span>Paid for</span>
            <span>Method</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...payments]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((p) => {
                const st = payStatus(p);
                const per = payPeriods.get(p.id);
                const sender =
                  p.senderNumberOrRef?.trim() && p.senderNumberOrRef !== '—'
                    ? p.senderNumberOrRef.trim()
                    : '';
                return (
                  <li
                    key={p.id}
                    className={`grid grid-cols-1 gap-2 px-5 py-3.5 md:items-start md:gap-4 ${TX_COLS}`}
                  >
                    <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {fmtDay(p.createdAt, true)}
                      <span className="ml-1 text-xs font-normal text-slate-400 md:ml-0 md:block">
                        {fmtStamp(p.createdAt).split(', ')[1] || ''}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            p.kind === 'renewal'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : p.kind === 'manual'
                                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {p.kind === 'renewal' ? 'Renew' : p.kind === 'manual' ? 'Manual' : 'Buy'}
                        </span>
                        {p.kind === 'renewal' && per ? (
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {periodMonths(per.from, per.to)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {paymentForLabel(p, payCtx)}
                      </div>
                      {p.kind === 'renewal' && per ? (
                        <div className="mt-0.5 text-xs tabular-nums text-slate-500">
                          {fmtDay(per.from, true)} – {fmtDay(per.to, true)}
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <GatewayBadge gateway={p.gateway} />
                      <div>
                        <TrxButton p={p} handleCopy={handleCopy} copiedId={copiedId} />
                      </div>
                      {sender ? (
                        <div className="font-mono text-xs text-slate-500">{sender}</div>
                      ) : null}
                    </div>
                    <div
                      className={`font-mono text-sm font-semibold tabular-nums md:text-right ${
                        p.status === 'refunded' ? 'text-rose-700 dark:text-rose-400' : ''
                      }`}
                    >
                      {p.status === 'refunded' ? '−' : ''}
                      {formatBDT(p.amountBDT)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                      <StatusIndicator tone={st.tone} label={st.label} />
                      {p.verifiedAt && p.status === 'verified' ? (
                        <span className="text-[11px] text-slate-400">{fmtStamp(p.verifiedAt)}</span>
                      ) : null}
                      <PayActions
                        p={p}
                        onVerifyPayment={onVerifyPayment}
                        onRejectPayment={onRejectPayment}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </Card>
  );
}

export type OrderBillingTabProps = {
  payments: PaymentTransaction[];
  paid: number;
  renewalsPaid: number;
  refunded: number;
} & OrderTransactionsCardProps;

export function OrderBillingTab({
  payments,
  paid,
  renewalsPaid,
  refunded,
  ...transactionsProps
}: OrderBillingTabProps) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-base font-semibold">By month</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-900 dark:bg-slate-200" />
              <span className="font-medium">Buy</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatBDT(paid)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="font-medium">Renew</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatBDT(renewalsPaid)}
              </span>
            </span>
            {refunded > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                <span className="font-medium">Refund</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatBDT(refunded)}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <BillingChart payments={payments} />
      </Card>
      <OrderTransactionsCard payments={payments} {...transactionsProps} />
    </div>
  );
}
