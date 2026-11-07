'use client';

import { useState } from 'react';
import type { DigitalDelivery, PaymentTransaction } from '@/lib/admin-data';
import { ModalShell, formatBDT } from '@/components/admin/ui/primitives';

export type RefundRequest = {
  orderId: string;
  paymentIds: string[];
  revokeDeliveryIds: string[];
  reason: string;
  /** Amount actually returned; less than the selected payments = partial refund. */
  amountBdt: number;
};

export function RefundModal({
  orderId,
  units,
  payments,
  onClose,
  onConfirm,
}: {
  orderId: string;
  units: DigitalDelivery[];
  payments: PaymentTransaction[];
  onClose: () => void;
  onConfirm: (req: RefundRequest) => void;
}) {
  const refundable = units.filter(
    (u) => u.status !== 'refunded' && u.status !== 'revoked',
  );
  const [payIds, setPayIds] = useState<string[]>(() => payments.map((p) => p.id));
  const [unitIds, setUnitIds] = useState<string[]>(() =>
    refundable.map((u) => u.id),
  );
  const [reason, setReason] = useState('');
  const [amountText, setAmountText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const maxAmount = payments
    .filter((p) => payIds.includes(p.id))
    .reduce((n, p) => n + p.amountBDT, 0);
  const amount =
    amountText === null ? maxAmount : Math.min(maxAmount, Number(amountText) || 0);
  const isPartial = maxAmount > 0 && amount > 0 && amount < maxAmount;
  const reasonOk = reason.trim().length >= 3;
  const canSubmit =
    (payIds.length > 0 || unitIds.length > 0) &&
    reasonOk &&
    (payIds.length === 0 || amount > 0);

  const lineIndex = (u: DigitalDelivery) =>
    units
      .filter((x) => x.productId === u.productId && x.variantId === u.variantId)
      .indexOf(u) + 1;

  const setPays = (ids: string[]) => {
    setPayIds(ids);
    setAmountText(null);
  };

  const submit = () => {
    if (!reasonOk) {
      setError('Add a short reason (audit trail).');
      return;
    }
    if (payIds.length === 0 && unitIds.length === 0) {
      setError('Select at least one payment or unit.');
      return;
    }
    setError('');
    onConfirm({
      orderId,
      paymentIds: payIds,
      revokeDeliveryIds: unitIds,
      reason: reason.trim(),
      amountBdt: amount,
    });
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      title={`Refund · ${orderId}`}
      subtitle="Select what to refund. Partial amount is allowed."
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-sm font-medium m-0">
              Payments to refund
              <span className="ml-1.5 font-normal text-slate-500">
                {payIds.length}/{payments.length}
              </span>
            </legend>
            {payments.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setPays(
                    payIds.length === payments.length
                      ? []
                      : payments.map((p) => p.id),
                  )
                }
                className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer border-0 bg-transparent p-0"
              >
                {payIds.length === payments.length ? 'Clear' : 'Select all'}
              </button>
            ) : null}
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500 m-0">No verified payments.</p>
          ) : (
            <ul className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-slate-200/90 dark:border-slate-800">
              {payments.map((p) => {
                const trx =
                  p.trxId?.trim() && p.trxId !== '—' ? p.trxId.trim() : '';
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-rose-600"
                        checked={payIds.includes(p.id)}
                        onChange={() => setPays(toggle(payIds, p.id))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono font-semibold tabular-nums">
                            {formatBDT(p.amountBDT)}
                          </span>
                          <span className="text-slate-500">
                            {p.gateway}
                            {p.kind === 'renewal' ? ' · renewal' : ''}
                          </span>
                        </span>
                        {trx ? (
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-500 truncate">
                            TrxID {trx}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {p.createdAt}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        {refundable.length > 0 ? (
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-medium m-0">
                End access for
                <span className="ml-1.5 font-normal text-slate-500">
                  {unitIds.length}/{refundable.length}
                </span>
              </legend>
              <button
                type="button"
                onClick={() =>
                  setUnitIds(
                    unitIds.length === refundable.length
                      ? []
                      : refundable.map((u) => u.id),
                  )
                }
                className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer border-0 bg-transparent p-0"
              >
                {unitIds.length === refundable.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <ul className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-slate-200/90 dark:border-slate-800">
              {refundable.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-rose-600"
                      checked={unitIds.includes(u.id)}
                      onChange={() => setUnitIds((l) => toggle(l, u.id))}
                    />
                    <span className="min-w-0 truncate">
                      {u.productName} · {u.variantName} #{lineIndex(u)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        {maxAmount > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="refund-amount">
                Refund amount (৳)
              </label>
              <button
                type="button"
                onClick={() => setAmountText(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent p-0"
              >
                Full {formatBDT(maxAmount)}
              </button>
            </div>
            <input
              id="refund-amount"
              type="text"
              inputMode="numeric"
              value={amountText ?? String(maxAmount)}
              onChange={(e) =>
                setAmountText(e.target.value.replace(/[^0-9]/g, ''))
              }
              className="w-full h-10 px-3 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[11px] text-slate-500 m-0">
              {isPartial
                ? `Partial refund — ${formatBDT(maxAmount - amount)} stays recorded on selected payments.`
                : 'Caps at the selected payments total. Lower it for a partial refund.'}
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="refund-reason">
            Reason <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="refund-reason"
            rows={2}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Customer requested cancellation"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-rose-600 m-0">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {formatBDT(amount)}
              {isPartial ? (
                <span className="ml-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  partial
                </span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">
              {payIds.length} payment{payIds.length === 1 ? '' : 's'}
              {unitIds.length > 0
                ? ` · ${unitIds.length} unit${unitIds.length === 1 ? '' : 's'} revoked`
                : ''}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-slate-200 px-4 text-sm dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="h-9 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              Confirm refund
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
