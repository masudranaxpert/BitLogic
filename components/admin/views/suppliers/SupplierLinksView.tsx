'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Card } from '@/components/admin/ui/primitives';
import OptionSourcingEditor from './OptionSourcingEditor';
import {
  PageHeader,
  Pill,
  SOURCING,
  api,
  field,
  taka,
  type OptionView,
  type ProductOptions,
} from './shared';

type Filter = 'all' | 'linked' | 'attention' | 'unlinked';

export default function SupplierLinksView() {
  const [products, setProducts] = useState<ProductOptions[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<{ productId: string; planId: string } | null>(
    null,
  );

  const load = useCallback(() => {
    api<{ products: ProductOptions[] }>('/api/admin/suppliers/options')
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const attention = (p: OptionView) =>
    Boolean(p.pricingAlert) ||
    (p.sourcing !== 'own' && !p.inStock) ||
    p.links.some((l) => l.status === 'removed' || l.warning);

  const shown = useMemo(() => {
    if (!products) return [];
    const needle = q.toLowerCase().trim();
    return products
      .map((p) => ({
        ...p,
        plans: p.plans.filter((pl) => {
          if (
            needle &&
            !`${p.productName} ${pl.label}`.toLowerCase().includes(needle)
          )
            return false;
          if (filter === 'linked') return pl.links.length > 0;
          if (filter === 'unlinked') return pl.links.length === 0;
          if (filter === 'attention') return attention(pl);
          return true;
        }),
      }))
      .filter((p) => p.plans.length > 0);
  }, [products, filter, q]);

  const counts = useMemo(() => {
    const all = (products || []).flatMap((p) => p.plans);
    return {
      all: all.length,
      linked: all.filter((p) => p.links.length).length,
      attention: all.filter(attention).length,
      unlinked: all.filter((p) => !p.links.length).length,
    };
  }, [products]);

  const current =
    open && products
      ? products.find((p) => p.productId === open.productId)
      : null;
  const currentPlan =
    current?.plans.find((p) => p.planId === open?.planId) || null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <PageHeader
        title="Linked plans"
        sub="Each plan: source, your cost, and what you earn."
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
          {(
            [
              ['all', `All (${counts.all})`],
              ['linked', `Linked (${counts.linked})`],
              ['attention', `Attention (${counts.attention})`],
              ['unlinked', `Not linked (${counts.unlinked})`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`h-9.5 rounded-lg border px-3.5 text-left text-sm font-medium transition-all cursor-pointer ${
                filter === k
                  ? k === 'unlinked'
                    ? 'border-amber-500 bg-amber-50 font-semibold text-amber-900 ring-1 ring-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300'
                    : k === 'attention'
                      ? 'border-rose-500 bg-rose-50 font-semibold text-rose-900 ring-1 ring-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300'
                      : 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-600/30 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:ml-auto lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products or plans..."
            aria-label="Search products"
            className={`${field} h-9.5 pl-9 text-sm`}
          />
        </div>
      </div>

      {error ? <Card className="p-5 text-sm text-rose-600">{error}</Card> : null}
      {!products && !error ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border border-slate-200/90 shadow-xs dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60 animate-pulse">
                <div className="h-5 w-36 rounded bg-slate-200/80 dark:bg-slate-700" />
                <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 p-5 space-y-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between pt-2 animate-pulse">
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 rounded bg-slate-200/80 dark:bg-slate-700" />
                      <div className="h-3 w-40 rounded bg-slate-200/50 dark:bg-slate-800" />
                    </div>
                    <div className="h-8 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {products && shown.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          No matching products or plans found.
        </Card>
      ) : null}

      {shown.map((p) => (
        <Card
          key={p.productId}
          className="overflow-hidden border border-slate-200/90 shadow-xs dark:border-slate-800"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="m-0 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {p.productName}
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {p.plans.length} {p.plans.length === 1 ? 'plan' : 'plans'}
            </span>
          </div>
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_90px_90px_140px_120px] gap-4 border-b border-slate-100 bg-slate-50/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid dark:border-slate-800 dark:bg-slate-950/40">
            <span>Plan</span>
            <span>Source</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Price</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Stock</span>
          </div>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {p.plans.map((pl) => (
              <li key={pl.planId}>
                <button
                  type="button"
                  onClick={() =>
                    setOpen({ productId: p.productId, planId: pl.planId })
                  }
                  className="grid w-full grid-cols-1 gap-2.5 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_90px_90px_140px_120px] lg:items-center lg:gap-4 dark:hover:bg-slate-900/50 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {pl.label}
                      {!pl.isActive ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (hidden)
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {pl.pricingMode === 'auto' ? (
                        <Pill tone="blue">Auto price +{pl.markupPercent}%</Pill>
                      ) : null}
                      {pl.renewalPricing === 'locked' ? (
                        <Pill tone="grey">Renewal price locked</Pill>
                      ) : null}
                      {pl.pricingAlert ? (
                        <Pill tone="red">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {pl.pricingAlert.includes('jump')
                            ? 'Price waiting for approval'
                            : pl.pricingAlert.includes('loss')
                              ? 'Losing money'
                              : 'Check pricing'}
                        </Pill>
                      ) : null}
                    </span>
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium text-slate-800 dark:text-slate-200">
                      {SOURCING[pl.sourcing]?.label || pl.sourcing}
                    </span>
                    <span className="mt-1 block">
                      {pl.links.length ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {pl.links.map((l) => l.supplierName).join(' → ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/30 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                          No supplier linked
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:contents">
                    <span className="tabular-nums lg:text-right font-medium text-slate-700 dark:text-slate-300">
                      <span className="block text-[11px] font-normal text-slate-500 lg:hidden">
                        Cost
                      </span>
                      {taka(pl.costBdt)}
                    </span>
                    <span className="font-semibold tabular-nums lg:text-right text-slate-900 dark:text-slate-100">
                      <span className="block text-[11px] font-normal text-slate-500 lg:hidden">
                        Price
                      </span>
                      {taka(pl.priceBdt)}
                    </span>
                    <span
                      className={`whitespace-nowrap tabular-nums lg:text-right ${
                        pl.marginBdt !== null && pl.marginBdt < 0
                          ? 'font-bold text-rose-600 dark:text-rose-400'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="block text-[11px] font-normal text-slate-500 lg:hidden">
                        Profit
                      </span>
                      {pl.marginBdt === null
                        ? '—'
                        : `${taka(pl.marginBdt)} · ${pl.marginPct}%`}
                    </span>
                    <span className="lg:text-right">
                      <span className="mb-0.5 block text-[11px] font-normal text-slate-500 lg:hidden">
                        Stock
                      </span>
                      {pl.inStock ? (
                        <Pill
                          tone={
                            pl.stock !== null && pl.stock <= 3
                              ? 'amber'
                              : 'green'
                          }
                        >
                          {pl.stock === null ? 'In stock' : `${pl.stock} left`}
                        </Pill>
                      ) : pl.allowBackorder ? (
                        <Pill tone="amber">Back-order</Pill>
                      ) : (
                        <Pill tone="red">Out of stock</Pill>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {open && currentPlan && current ? (
        <OptionSourcingEditor
          plan={currentPlan}
          productName={current.productName}
          onClose={() => setOpen(null)}
          onChanged={() => {
            load();
          }}
        />
      ) : null}
    </div>
  );
}
