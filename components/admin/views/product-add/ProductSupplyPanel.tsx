'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
import OptionSourcingEditor from '@/components/admin/views/suppliers/OptionSourcingEditor';
import { api, type ProductOptions } from '@/components/admin/views/suppliers/shared';

type HistoryRow = {
  id: string;
  planCode: string;
  planLabel: string;
  field: string;
  oldValue: string;
  newValue: string;
  source: string;
  actor: string;
  note: string;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  admin: 'Edited',
  auto: 'Auto price',
  supplier: 'Supplier cost',
  rate: 'Exchange rate',
  system: 'System',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

/** Price history on the product edit page. Sourcing rows live on each plan. */
export default function ProductSupplyPanel({
  productId,
  onSupply,
  managePlanId,
  onManagePlanId,
}: {
  productId: string;
  onSupply: (data: ProductOptions | null) => void;
  managePlanId: string | null;
  onManagePlanId: (id: string | null) => void;
}) {
  const [data, setData] = useState<ProductOptions | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [planFilter, setPlanFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    api<{ products: ProductOptions[] }>(`/api/admin/suppliers/options?productId=${encodeURIComponent(productId)}`)
      .then((r) => {
        const next = r.products[0] || null;
        setData(next);
        onSupply(next);
      })
      .catch(() => setNoAccess(true));
    api<{ history: HistoryRow[] }>(`/api/admin/price-history?productId=${encodeURIComponent(productId)}`)
      .then((r) => setHistory(r.history))
      .catch(() => setHistory([]));
  }, [productId, onSupply]);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => (history || []).filter((h) => !planFilter || h.planCode === planFilter), [history, planFilter]);
  const visible = showAll ? rows : rows.slice(0, 8);
  const plan = data?.plans.find((p) => p.planId === managePlanId) || null;

  if (noAccess) return null;
  return (
    <>
      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Price history
          </h2>
          {data && data.plans.length > 1 ? (
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label="Plan"
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">All plans</option>
              {data.plans.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          ) : null}
        </div>
        {history === null ? (
          <div className="space-y-3 pl-4 border-l border-slate-200 dark:border-slate-800 animate-pulse" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-36 rounded bg-slate-200/80 dark:bg-slate-700" />
                <div className="h-3 w-24 rounded bg-slate-200/50 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">No price changes recorded yet. Every change from now on is kept here.</p>
        ) : (
          <ol className="m-0 list-none space-y-0 border-l border-slate-200 p-0 pl-4 dark:border-slate-800">
            {visible.map((h) => {
              const up = Number(h.newValue) > Number(h.oldValue);
              const isPrice = h.field === 'price';
              return (
                <li key={h.id} className="relative pb-3">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-950 ${h.field === 'cost' ? 'bg-slate-400' : up ? 'bg-rose-500' : 'bg-emerald-500'}`} aria-hidden />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{h.planLabel || h.planCode}</span>{' '}
                      <span className="text-slate-500">{h.field === 'cost' ? 'supplier cost' : h.field === 'pricing' ? 'pricing mode' : 'price'}</span>{' '}
                      {isPrice ? (
                        <>
                          <span className="tabular-nums text-slate-500">{h.oldValue === '—' ? '' : `৳${h.oldValue} → `}</span>
                          <span className={`font-semibold tabular-nums ${h.oldValue === '—' ? '' : up ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>৳{h.newValue}</span>
                        </>
                      ) : (
                        <span className="tabular-nums">{h.oldValue} → <strong>{h.newValue}</strong></span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">{when(h.createdAt)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {SOURCE_LABEL[h.source] || h.source}
                    {h.actor ? ` by ${h.actor}` : ''}
                    {h.note ? ` · ${h.note}` : ''}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {rows.length > 8 ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer">
            {showAll ? 'Show less' : `Show all ${rows.length}`}
          </button>
        ) : null}
      </Card>

      {plan && data ? (
        <OptionSourcingEditor
          plan={plan}
          productName={data.productName}
          onClose={() => onManagePlanId(null)}
          onChanged={load}
        />
      ) : null}
    </>
  );
}
