'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { getOrderAccessToken } from '@/lib/customerSession';

type Line = {
  key: string;
  productName: string;
  planName: string;
  units: number;
  unitPriceBdt: number;
  amountBdt: number;
  endsAt: string | null;
  canRenew: boolean;
  pending: boolean;
  reason?: string;
  window?: 'open' | 'not_yet' | 'closed' | 'unknown';
  opensOn?: string | null;
};

const PAY_NUMBER = '01700-123456';
const DAY = 86_400_000;
const daysUntil = (d: string | null) =>
  d ? Math.round((new Date(d).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / DAY) : null;
const money = (n: number) => `৳${n.toLocaleString('en-US')}`;
const dayAfter = (d: string) => {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
};

/**
 * Renew per product line. Each line has its own price, end date and window,
 * and the buyer can keep fewer seats than they bought (e.g. 2 → 1).
 */
export function RenewOrderCard({ orderId, email }: { orderId: string; email: string }) {
  const [lines, setLines] = useState<Line[] | null>(null);
  /** key → how many units to renew (0 = not renewing this line) */
  const [qty, setQty] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [gateway, setGateway] = useState<'bKash' | 'Nagad'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneAt, setDoneAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const token = getOrderAccessToken(orderId) || '';
    const qs = new URLSearchParams({ orderId, email });
    if (token) qs.set('accessToken', token);
    fetch(`/api/orders/renew?${qs}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { lines?: Line[] }) => {
        if (cancelled) return;
        const list = d.lines || [];
        setLines(list);
        setQty(Object.fromEntries(list.filter((l) => l.canRenew).map((l) => [l.key, l.units])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [orderId, email, doneAt]);

  const total = useMemo(
    () => (lines || []).reduce((n, l) => n + (qty[l.key] || 0) * l.unitPriceBdt, 0),
    [lines, qty],
  );
  const chosen = Object.values(qty).reduce((n, v) => n + v, 0);

  if (!lines || lines.length === 0) return null;
  const renewable = lines.filter((l) => l.canRenew);
  const pending = lines.filter((l) => l.pending);
  const notYet = lines.filter((l) => l.window === 'not_yet' && !l.pending);

  if (renewable.length === 0 && pending.length === 0) {
    // Say why, per item, instead of silently hiding renewal.
    return (
      <p className="text-xs font-semibold text-slate-500">
        {notYet.length === lines.length
          ? `Renewal opens ${notYet.map((l) => l.opensOn).filter(Boolean).sort()[0]}.`
          : `Renewal not available right now: ${lines.map((l) => `${l.productName} (${(l.reason || 'unavailable').toLowerCase()})`).join(', ')}.`}
      </p>
    );
  }

  const soonest = renewable.map((l) => daysUntil(l.endsAt)).filter((d): d is number => d !== null).sort((a, b) => a - b)[0];
  const urgent = soonest !== undefined && soonest <= 7;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chosen === 0) return setError('Choose at least one item.');
    if (!trxId.trim()) return setError('Enter the transaction ID from your payment.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/orders/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          buyerEmail: email,
          accessToken: getOrderAccessToken(orderId),
          gateway,
          trxId: trxId.trim(),
          lines: Object.entries(qty)
            .filter(([, n]) => n > 0)
            .map(([key, n]) => ({ key, qty: n })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || 'Could not send the renewal.');
      setOpen(false);
      setTrxId('');
      setDoneAt(Date.now());
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${urgent ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-extrabold text-[#0F172A]">
            {soonest === undefined
              ? 'Renew'
              : soonest < 0
                ? 'Access has ended — renew to continue'
                : `Renewal open · ends in ${soonest} day${soonest === 1 ? '' : 's'}`}
          </div>
          {pending.length > 0 ? (
            <div className="font-semibold text-sky-800">
              {pending.map((l) => l.productName).join(', ')}: renewal sent, waiting for confirmation
            </div>
          ) : null}
        </div>
        {!open && renewable.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0F172A] px-4 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer border-0"
          >
            <RefreshCw size={14} aria-hidden /> Renew
          </button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <ul className="space-y-1.5">
            {lines.map((l) => {
              const n = qty[l.key] || 0;
              const d = daysUntil(l.endsAt);
              return (
                <li
                  key={l.key}
                  className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                    l.canRenew ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[#0F172A]">
                      {l.productName} · {l.planName}
                    </span>
                    <span className="block text-xs font-semibold">
                      {l.canRenew
                        ? `${d !== null && d < 0 ? `Ended ${l.endsAt}` : `Ends ${l.endsAt}`} · new period from ${l.endsAt && d !== null && d >= 0 ? dayAfter(l.endsAt) : 'today'}`
                        : l.reason}
                    </span>
                  </span>
                  {l.canRenew ? (
                    <>
                      <span className="inline-flex h-9 items-center overflow-hidden rounded-md border border-slate-200">
                        <button
                          type="button"
                          aria-label={`Fewer ${l.productName}`}
                          disabled={n === 0}
                          onClick={() => setQty((q) => ({ ...q, [l.key]: Math.max(0, n - 1) }))}
                          className="inline-flex h-full w-8 items-center justify-center border-0 bg-white disabled:opacity-40 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
                          {n}
                        </span>
                        <button
                          type="button"
                          aria-label={`More ${l.productName}`}
                          disabled={n >= l.units}
                          onClick={() => setQty((q) => ({ ...q, [l.key]: Math.min(l.units, n + 1) }))}
                          className="inline-flex h-full w-8 items-center justify-center border-0 bg-white disabled:opacity-40 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </span>
                      <span className="w-16 text-right font-extrabold tabular-nums text-[#0F172A]">
                        {money(n * l.unitPriceBdt)}
                      </span>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {renewable.some((l) => (qty[l.key] || 0) < l.units && (qty[l.key] || 0) > 0) ? (
            <p className="text-xs font-semibold text-slate-600">
              Seats you don&apos;t renew stay active until their current end date, then stop.
            </p>
          ) : null}

          {/* One row on wider screens: method + TrxID */}
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="radiogroup" aria-label="Payment method">
              {(['bKash', 'Nagad'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={gateway === g}
                  onClick={() => setGateway(g)}
                  className={`h-9 flex-1 rounded px-5 text-xs font-extrabold cursor-pointer border-0 ${
                    gateway === g ? 'bg-[#0F172A] text-white' : 'bg-transparent text-[#0F172A]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder={`${gateway} transaction ID`}
              aria-label="Transaction ID"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-[#FF5E5B] focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-600">
            Send <strong>{money(total)}</strong> to{' '}
            <span className="font-mono font-bold text-[#0F172A]">{PAY_NUMBER}</span> ({gateway}), then paste the transaction ID above.
          </p>
          {error ? <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-xs font-bold cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || chosen === 0}
              className="h-10 rounded-md bg-[#FF5E5B] px-4 text-xs font-extrabold text-white hover:bg-[#e04845] disabled:opacity-60 cursor-pointer border-0"
            >
              {busy ? 'Sending…' : `Renew ${chosen} item${chosen === 1 ? '' : 's'} · ${money(total)}`}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
