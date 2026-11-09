'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ModalShell } from '@/components/admin/ui/primitives';
import { autoPrice, margin } from '@/lib/suppliers/pricing';
import {
  ItemView,
  Pill,
  SOURCING,
  alertTexts,
  api,
  btn,
  btnPrimary,
  field,
  stockPill,
  taka,
  type OptionView,
  type SupplierCatalogItem,
} from './shared';

type CatalogHit = {
  id: string;
  supplierName: string;
  name: string;
  variantName?: string;
  price: string;
  currency: string;
  costBdt: number | null;
  stock: number | null;
  status: string;
  score?: number;
  needsBuyerInput?: boolean;
  deliveryType?: string;
};

/**
 * One place to decide where an option's credentials come from and how it is priced.
 * Opened from Suppliers → Linked options and from the product edit page.
 */
export default function OptionSourcingEditor({
  plan,
  productName,
  onClose,
  onChanged,
}: {
  plan: OptionView | null;
  productName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<OptionView | null>(plan);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [suggestions, setSuggestions] = useState<CatalogHit[] | null>(null);
  const [inspectingItem, setInspectingItem] = useState<SupplierCatalogItem | null>(null);

  const viewSupplierItem = async (link: OptionView['links'][number]) => {
    try {
      const res = await api<{ items: SupplierCatalogItem[] }>(
        `/api/admin/suppliers/catalog?id=${encodeURIComponent(link.supplierProductId)}`,
      );
      if (res.items?.[0]) {
        setInspectingItem(res.items[0]);
      } else {
        setInspectingItem({
          id: link.supplierProductId,
          supplierId: '',
          supplierName: link.supplierName,
          name: link.name,
          price: link.price,
          currency: link.currency,
          costBdt: link.costBdt,
          stock: link.stock,
          status: link.status,
          minQty: 1,
          maxQty: 100,
          needsBuyerInput: false,
          description: link.warning || '',
          links: [],
        });
      }
    } catch {
      setInspectingItem({
        id: link.supplierProductId,
        supplierId: '',
        supplierName: link.supplierName,
        name: link.name,
        price: link.price,
        currency: link.currency,
        costBdt: link.costBdt,
        stock: link.stock,
        status: link.status,
        minQty: 1,
        maxQty: 100,
        needsBuyerInput: false,
        description: link.warning || '',
        links: [],
      });
    }
  };

  useEffect(() => {
    setDraft(plan);
    setError('');
    setSaved('');
    setQ('');
    setHits([]);
    setSuggestions(null);
    if (plan) {
      api<{ suggestions: CatalogHit[] }>('/api/admin/suppliers/options', {
        method: 'POST',
        body: { action: 'suggest', planId: plan.planId },
      })
        .then((r) => setSuggestions(r.suggestions))
        .catch(() => setSuggestions([]));
    }
  }, [plan]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      api<{ items: CatalogHit[] }>(
        `/api/admin/suppliers/catalog?q=${encodeURIComponent(q.trim())}`,
      )
        .then((r) => setHits(r.items.slice(0, 12)))
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const cost = draft?.costBdt ?? null;
  const preview = useMemo(() => {
    if (!draft || cost === null) return null;
    const price =
      draft.pricingMode === 'auto' ? autoPrice(cost, draft) : draft.priceBdt;
    return { price, ...margin(price, cost) };
  }, [draft, cost]);

  if (!plan || !draft) return null;
  const linked = draft.links.length > 0;
  const set = <K extends keyof OptionView>(k: K, v: OptionView[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setSaved('');
  };

  const action = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError('');
    try {
      await api('/api/admin/suppliers/options', {
        method: 'POST',
        body: { ...body, planId: plan.planId },
      });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy('');
    }
  };

  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy('save');
    setError('');
    try {
      await api('/api/admin/suppliers/options', {
        method: 'PATCH',
        body: {
          planId: plan.planId,
          sourcing: draft.sourcing,
          pricingMode: draft.pricingMode,
          markupPercent: draft.markupPercent,
          markupFlatBdt: draft.markupFlatBdt,
          roundToBdt: draft.roundToBdt,
          minMarginBdt: draft.minMarginBdt,
          ...(draft.pricingMode === 'fixed' ? { priceBdt: draft.priceBdt } : {}),
          ...extra,
        },
      });
      setSaved('Saved.');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy('');
    }
  };

  const alerts = alertTexts(plan.pricingAlert, plan.priceBdt, plan.costBdt);
  const held = plan.pricingAlert.split(',').find((a) => a.startsWith('jump:'));
  const linkedIds = new Set(draft.links.map((l) => l.supplierProductId));
  const pickList = (q.trim().length >= 2 ? hits : suggestions || []).filter(
    (h) => !linkedIds.has(h.id),
  );

  return (
    <>
      <ModalShell
      open
      onClose={onClose}
      title={`${productName} · ${plan.label}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Pricing alerts banner */}
        {alerts.length ? (
          <div className="space-y-2 rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                {alerts.map((a) => (
                  <p key={a} className="m-0 leading-relaxed font-medium">
                    {a}
                  </p>
                ))}
              </div>
            </div>
            {held ? (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={busy !== ''}
                  onClick={() => void save({ approvePrice: true })}
                  className={btnPrimary}
                >
                  Approve {taka(Number(held.slice(5)))}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 1. Supplier items & Search Section */}
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 shadow-xs space-y-5">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-900 dark:text-slate-100">
                Supplier items
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Fulfilled in priority order (top item first).
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {draft.links.length} linked
            </span>
          </div>

          {draft.links.length ? (
            <ol className="m-0 list-none space-y-2.5 p-0">
              {draft.links.map((l, i) => (
                <li
                  key={l.linkId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:bg-slate-900/60"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {l.name}
                        </span>
                        {stockPill(l.status, l.stock)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {l.supplierName}
                          {!l.supplierOn ? (
                            <span className="ml-1 text-amber-600">(inactive)</span>
                          ) : (
                            ''
                          )}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>
                          {l.price} {l.currency} ={' '}
                          <strong className="font-semibold text-slate-900 dark:text-slate-100">
                            {taka(l.costBdt)}
                          </strong>
                        </span>
                        {l.previousPrice && l.previousPrice !== l.price ? (
                          <span className="text-slate-400 line-through">
                            was {l.previousPrice}
                          </span>
                        ) : null}
                      </div>
                      {l.warning ? (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{l.warning}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      title="View supplier item details"
                      aria-label={`View ${l.name} details`}
                      onClick={() => void viewSupplierItem(l)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Move higher priority"
                      disabled={i === 0 || busy !== ''}
                      onClick={() =>
                        void action(`up-${l.linkId}`, {
                          action: 'up',
                          linkId: l.linkId,
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Move lower priority"
                      disabled={i === draft.links.length - 1 || busy !== ''}
                      onClick={() =>
                        void action(`down-${l.linkId}`, {
                          action: 'down',
                          linkId: l.linkId,
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Unlink ${l.name}`}
                      disabled={busy !== ''}
                      onClick={() => {
                        if (
                          draft.links.length === 1 &&
                          draft.sourcing !== 'own' &&
                          !window.confirm(
                            'This is the only supplier item. Unlinking uses only your credentials, at a fixed price. Continue?',
                          )
                        )
                          return;
                        void action(`un-${l.linkId}`, {
                          action: 'unlink',
                          linkId: l.linkId,
                        });
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
              <p className="m-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                Not linked to any supplier item.
              </p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">
                Search below to connect an item from your integrated suppliers.
              </p>
            </div>
          )}

          {/* Dedicated Link Another Item Area */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="search-supplier-items"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Link another supplier item
              </label>
              <span className="text-[11px] text-slate-400">
                Search catalog or choose from suggested matches
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="search-supplier-items"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search supplier catalog items by name..."
                className={`${field} h-10.5 pl-10 text-sm`}
                aria-label="Search supplier items"
              />
            </div>
            <div className="text-xs font-medium text-slate-500">
              {q.trim().length >= 2
                ? `${hits.length ? `Found ${hits.length} matches:` : 'No matching supplier items found.'}`
                : suggestions === null
                  ? 'Finding suggested matches…'
                  : suggestions.length
                    ? 'Recommended name matches (verify before linking):'
                    : 'No direct name match found. Search above to find items.'}
            </div>
            {pickList.length ? (
              <ul className="m-0 max-h-64 list-none space-y-2 overflow-y-auto p-0 pr-1">
                {pickList.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-emerald-900/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {[h.name, h.variantName].filter(Boolean).join(' · ')}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {h.supplierName}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>
                          {h.price} {h.currency} = {taka(h.costBdt)}
                        </span>
                        {stockPill(h.status, h.stock)}
                        {h.needsBuyerInput ? (
                          <Pill tone="amber">needs buyer details</Pill>
                        ) : null}
                        {h.score ? (
                          <span className="text-emerald-700 font-medium">
                            {h.score}% match
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy !== ''}
                      onClick={() =>
                        void action(`link-${h.id}`, {
                          action: 'link',
                          supplierProductId: h.id,
                        })
                      }
                      className={`${btn} shrink-0 text-emerald-700 font-medium hover:bg-emerald-50 hover:border-emerald-600`}
                    >
                      {busy === `link-${h.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Plus className="h-4 w-4" aria-hidden />
                      )}
                      Link item
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* 2. Sourcing Option */}
        <section className="space-y-3">
          <div>
            <h3 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Where credentials come from
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose whether to fulfill orders using your manual/auto Vault or via supplier API.
            </p>
          </div>
          <div
            className="grid gap-2.5 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Sourcing"
          >
            {Object.entries(SOURCING).map(([key, s]) => {
              const disabled = key !== 'own' && !linked;
              const active = draft.sourcing === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => set('sourcing', key)}
                  className={`rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600/30 dark:bg-emerald-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {s.label}
                    </span>
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 leading-normal">
                    {s.help}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Pricing Rule */}
        <section className="space-y-3.5 rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Customer Pricing
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Fixed retail price or dynamic price tracked to supplier costs.
              </p>
            </div>
            <div
              className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              role="radiogroup"
              aria-label="Pricing mode"
            >
              {[
                ['fixed', 'Fixed price'],
                ['auto', 'Follow supplier cost'],
              ].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={draft.pricingMode === k}
                  disabled={k === 'auto' && !linked}
                  onClick={() => set('pricingMode', k)}
                  className={`h-8 rounded-md px-3 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer ${
                    draft.pricingMode === k
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {draft.pricingMode === 'fixed' ? (
            <label className="block max-w-xs space-y-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Selling price (৳)
              </span>
              <input
                type="number"
                min={0}
                value={draft.priceBdt || ''}
                onChange={(e) =>
                  set(
                    'priceBdt',
                    e.target.value === '' ? 0 : Number(e.target.value),
                  )
                }
                className={`${field} h-10`}
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['markupPercent', 'Markup %', 1],
                  ['markupFlatBdt', 'Plus fixed ৳', 1],
                  ['roundToBdt', 'Round up to ৳', 1],
                  ['minMarginBdt', 'Min profit ৳', 1],
                ] as const
              ).map(([k, l, step]) => (
                <label key={k} className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {l}
                  </span>
                  <input
                    type="number"
                    min={k === 'roundToBdt' ? 1 : 0}
                    step={step}
                    value={draft[k]}
                    onChange={(e) => set(k, Number(e.target.value))}
                    className={`${field} h-10`}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-3.5 text-sm dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
            {cost === null ? (
              <span className="text-slate-500 text-xs">
                {linked
                  ? 'No exchange rate for this supplier currency yet.'
                  : 'Link a supplier item above to see cost and calculated profit.'}
              </span>
            ) : preview ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm">
                <span>
                  Supplier Cost:{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    {taka(cost)}
                  </strong>
                </span>
                <span>
                  Customer Price:{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    {taka(preview.price)}
                  </strong>
                </span>
                <span
                  className={
                    preview.bdt < 0
                      ? 'font-bold text-rose-600 dark:text-rose-400'
                      : preview.bdt < Math.max(1, draft.minMarginBdt)
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'font-semibold text-emerald-700 dark:text-emerald-400'
                  }
                >
                  Profit: {taka(preview.bdt)} ({preview.pct}%)
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <p role="alert" className="m-0 text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : null}

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {saved ? (
            <span className="mr-auto text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {saved}
            </span>
          ) : null}
          <button type="button" onClick={onClose} className={btn}>
            Close
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== ''}
            className={btnPrimary}
          >
            {busy === 'save' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Save plan settings
          </button>
        </div>
      </div>
    </ModalShell>

    <ItemView item={inspectingItem} onClose={() => setInspectingItem(null)} />
  </>
  );
}
