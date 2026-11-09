'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { Card } from '@/components/admin/ui/primitives';
import { PageHeader, Pill, ago, api, btn, field, taka } from './shared';

export type PurchaseRow = {
  id: string;
  supplierName: string;
  orderId: string;
  deliveryId: string;
  status: string;
  externalOrderId: string;
  externalStatus: string;
  productLabel: string;
  unitCost: string;
  currency: string;
  costBdt: number;
  salePriceBdt: number;
  profitBdt: number | null;
  attempts: number;
  errorCode: string;
  lastError: string;
  hasResult: boolean;
  createdAt: string;
  deliveredAt: string | null;
  nextPollAt: string | null;
};

export const PURCHASE_STATUS: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue' | 'grey'; label: string }> = {
  delivered: { tone: 'green', label: 'Delivered' },
  processing: { tone: 'blue', label: 'Waiting for supplier' },
  queued: { tone: 'blue', label: 'Starting' },
  failed: { tone: 'red', label: 'Failed' },
  needs_review: { tone: 'amber', label: 'Needs review' },
  cancelled: { tone: 'grey', label: 'Cancelled' },
};

export default function SupplierPurchasesView({ onOpenOrder }: { onOpenOrder: (deliveryId: string) => void }) {
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api<{ orders: PurchaseRow[] }>(`/api/admin/suppliers/purchases${status ? `?status=${status}` : ''}`)
      .then((r) => {
        setRows(r.orders);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!rows?.some((r) => r.status === 'processing' || r.status === 'queued')) return;
    const t = window.setTimeout(load, 8000);
    return () => window.clearTimeout(t);
  }, [rows, load]);

  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    try {
      const r = await api<{ result?: string }>('/api/admin/suppliers/purchases', { method: 'POST', body });
      if (body.action === 'reveal') setRevealed((m) => ({ ...m, [String(body.id)]: r.result || '(empty)' }));
      else load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy('');
    }
  };

  const totals = (rows || []).filter((r) => r.status === 'delivered').reduce(
    (t, r) => ({ cost: t.cost + r.costBdt, sale: t.sale + r.salePriceBdt }),
    { cost: 0, sale: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <PageHeader
        title="Supplier purchases"
        sub="Units bought from a supplier: cost, sale, and failures."
        actions={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} h-9 w-auto`} aria-label="Status">
            <option value="">All</option>
            <option value="processing">Waiting for supplier</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
            <option value="delivered">Delivered</option>
          </select>
        }
      />
      {rows && rows.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Delivered cost', taka(totals.cost)],
            ['Customers paid', taka(totals.sale)],
            ['Profit', taka(totals.sale - totals.cost)],
          ].map(([l, v]) => (
            <Card key={l} className="px-4 py-3">
              <div className="text-xs text-slate-500">{l}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">{v}</div>
            </Card>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="m-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {!rows && !error ? (
        <Card className="overflow-hidden" aria-busy="true">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700" />
                    <div className="h-4 w-24 rounded bg-slate-200/60 dark:bg-slate-800" />
                  </div>
                  <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-48 rounded bg-slate-200/60 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {rows && rows.length === 0 ? <Card className="p-8 text-center text-sm text-slate-500">No supplier purchases yet.</Card> : null}
      {rows && rows.length ? (
        <Card className="overflow-hidden">
          <ul className="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {rows.map((r) => {
              const st = PURCHASE_STATUS[r.status] || { tone: 'grey' as const, label: r.status };
              return (
                <li key={r.id} className="space-y-2 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={st.tone}>{st.label}</Pill>
                        <button type="button" onClick={() => onOpenOrder(r.deliveryId)} className="font-mono text-sm font-semibold text-slate-900 hover:text-emerald-700 hover:underline dark:text-slate-100 cursor-pointer">
                          {r.orderId}
                        </button>
                        <span className="text-xs text-slate-500">{r.supplierName}{r.externalOrderId ? ` · ${r.externalOrderId}` : ''}{r.externalStatus ? ` · ${r.externalStatus}` : ''}</span>
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-700 dark:text-slate-300">{r.productLabel}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm tabular-nums sm:text-right">
                      <div>
                        <div className="text-[11px] text-slate-500">Cost</div>
                        <strong>{taka(r.costBdt || null)}</strong>
                        {r.unitCost ? <div className="text-[11px] font-normal text-slate-500">{r.unitCost} {r.currency}</div> : null}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Paid</div>
                        <strong>{taka(r.salePriceBdt)}</strong>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Profit</div>
                        <strong className={r.profitBdt !== null && r.profitBdt < 0 ? 'text-rose-700' : 'text-emerald-700'}>{r.profitBdt === null ? '—' : taka(r.profitBdt)}</strong>
                      </div>
                    </div>
                  </div>
                  {r.lastError ? <p className="m-0 text-xs text-slate-600 dark:text-slate-400">{r.errorCode ? `${r.errorCode}: ` : ''}{r.lastError}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Started {ago(r.createdAt)}</span>
                    {r.deliveredAt ? <span>· delivered {ago(r.deliveredAt)}</span> : null}
                    {r.status === 'processing' && r.nextPollAt ? <span>· next check {new Date(r.nextPollAt).toLocaleTimeString()}</span> : null}
                    <span className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                      {r.status === 'processing' ? (
                        <button type="button" disabled={busy !== ''} onClick={() => void act(`ref-${r.id}`, { action: 'refresh', id: r.id })} className={btn}>
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Check now
                        </button>
                      ) : null}
                      {r.hasResult ? (
                        revealed[r.id] ? null : (
                          <button type="button" disabled={busy !== ''} onClick={() => void act(`rev-${r.id}`, { action: 'reveal', id: r.id })} className={btn}>
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Show delivery
                          </button>
                        )
                      ) : null}
                    </span>
                  </div>
                  {revealed[r.id] ? (
                    <pre className="m-0 whitespace-pre-wrap break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{revealed[r.id]}</pre>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
