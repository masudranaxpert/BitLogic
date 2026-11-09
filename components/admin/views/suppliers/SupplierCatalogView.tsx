'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Link2, Loader2, Search } from 'lucide-react';
import { Card, ModalShell } from '@/components/admin/ui/primitives';
import { ItemView, PageHeader, PageNumbers, Pill, SOURCING, api, btn, field, stockPill, taka, type ProductOptions, type SupplierCatalogItem as Item } from './shared';

export default function SupplierCatalogView() {
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('');
  const [linked, setLinked] = useState('');
  const [q, setQ] = useState('');
  const [linkFor, setLinkFor] = useState<Item | null>(null);
  const [viewFor, setViewFor] = useState<Item | null>(null);
  const [page, setPage] = useState(1);
  const PER = 24;

  useEffect(() => {
    api<{ suppliers: Array<{ id: string; name: string }> }>('/api/admin/suppliers').then((r) => setSuppliers(r.suppliers)).catch(() => {});
  }, []);
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (supplierId) p.set('supplierId', supplierId);
    if (status) p.set('status', status);
    if (linked) p.set('linked', linked);
    if (q.trim()) p.set('q', q.trim());
    api<{ items: Item[] }>(`/api/admin/suppliers/catalog?${p}`)
      .then((r) => {
        setItems(r.items);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [supplierId, status, linked, q]);
  useEffect(() => {
    const t = window.setTimeout(load, 200);
    setPage(1);
    return () => window.clearTimeout(t);
  }, [load]);

  const pages = Math.max(1, Math.ceil((items?.length || 0) / PER));
  const safePage = Math.min(page, pages);
  const rows = (items || []).slice((safePage - 1) * PER, safePage * PER);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <PageHeader title="Supplier catalog" sub="What they sell, in taka. Link an item to a plan." />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, category, or price (e.g. 2.5)" aria-label="Search catalog" className={`${field} h-9 pl-9`} />
        </div>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${field} h-9`} aria-label="Supplier">
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} h-9`} aria-label="Stock">
          <option value="">On sale + out of stock</option>
          <option value="available">On sale</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="removed">Removed by supplier</option>
        </select>
        <select value={linked} onChange={(e) => setLinked(e.target.value)} className={`${field} h-9`} aria-label="Linked">
          <option value="">Linked or not</option>
          <option value="yes">Linked to a plan</option>
          <option value="no">Not linked</option>
        </select>
      </div>
      {error ? <Card className="p-5 text-sm text-rose-600">{error}</Card> : null}
      {!items && !error ? (
        <Card className="overflow-hidden" aria-busy="true">
          <div className="hidden grid-cols-[minmax(0,2fr)_110px_110px_120px_minmax(0,1.2fr)_132px] gap-3 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 lg:grid dark:border-slate-800">
            <span>Item</span>
            <span className="text-right">Supplier price</span>
            <span className="text-right">Cost (৳)</span>
            <span>Stock</span>
            <span>Used by</span>
            <span />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-48 rounded bg-slate-200/80 dark:bg-slate-700" />
                  <div className="h-3 w-32 rounded bg-slate-200/50 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800" />
                <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800" />
                <div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800" />
                <div className="h-8 w-20 rounded-md bg-slate-200/60 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {items && items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No items. Connect a supplier and press “Sync now” on the Connections page.</Card>
      ) : null}

      {rows.length ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_110px_110px_120px_minmax(0,1.2fr)_132px] gap-3 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 lg:grid dark:border-slate-800">
            <span>Item</span>
            <span className="text-right">Supplier price</span>
            <span className="text-right">Cost (৳)</span>
            <span>Stock</span>
            <span>Used by</span>
            <span />
          </div>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {rows.map((it) => (
              <li key={it.id} className="grid grid-cols-1 gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,2fr)_110px_110px_120px_minmax(0,1.2fr)_132px] lg:items-start lg:gap-3 lg:px-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={[it.name, it.variantName].filter(Boolean).join(' · ')}>
                    {[it.name, it.variantName].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500" title={[it.supplierName, it.category, it.period].filter(Boolean).join(' · ')}>
                    {[it.supplierName, it.category, it.period].filter(Boolean).join(' · ')}
                  </div>
                  {it.deliveryType === 'manual' || it.needsBuyerInput || it.minQty > 1 ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {it.deliveryType === 'manual' ? <Pill tone="amber">Manual</Pill> : null}
                      {it.needsBuyerInput ? <Pill tone="amber">Buyer details</Pill> : null}
                      {it.minQty > 1 ? <Pill tone="grey">Min {it.minQty}</Pill> : null}
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:contents">
                  <div className="tabular-nums lg:text-right">
                    <div className="text-[11px] text-slate-500 lg:hidden">Price</div>
                    {it.price} {it.currency}
                    {it.previousPrice && it.previousPrice !== it.price ? (
                      <div className={`text-xs ${Number(it.price) > Number(it.previousPrice) ? 'text-rose-600' : 'text-emerald-600'}`}>was {it.previousPrice}</div>
                    ) : null}
                  </div>
                  <div className="font-semibold tabular-nums lg:text-right">
                    <div className="text-[11px] font-normal text-slate-500 lg:hidden">Cost</div>
                    {taka(it.costBdt)}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 lg:hidden">Stock</div>
                    {stockPill(it.status, it.stock)}
                  </div>
                  <div className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                    <div className="text-[11px] text-slate-500 lg:hidden">Used by</div>
                    {it.links.length ? it.links.map((l) => <div key={l.planId} className="truncate">{l.label}</div>) : <span className="text-slate-400">—</span>}
                  </div>
                </div>
                <div className="flex gap-2 lg:justify-end">
                  <button type="button" onClick={() => setViewFor(it)} className={`${btn} px-2.5`} aria-label={`View ${it.name}`}>
                    <Eye className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" disabled={it.status === 'removed'} onClick={() => setLinkFor(it)} className={`${btn} min-w-0 flex-1 lg:flex-none`}>
                    <Link2 className="h-4 w-4" aria-hidden /> Link
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <PageNumbers
            page={safePage}
            pages={pages}
            onPage={(n) => {
              setPage(n);
              window.scrollTo({ top: 0 });
            }}
            label={items ? `${(safePage - 1) * PER + 1}–${Math.min(safePage * PER, items.length)} of ${items.length}` : undefined}
          />
        </Card>
      ) : null}

      <ItemView item={viewFor} onClose={() => setViewFor(null)} />
      <LinkModal
        item={linkFor}
        onClose={() => setLinkFor(null)}
        onLinked={() => {
          setLinkFor(null);
          load();
        }}
      />
    </div>
  );
}

function LinkModal({ item, onClose, onLinked }: { item: Item | null; onClose: () => void; onLinked: () => void }) {
  const [products, setProducts] = useState<ProductOptions[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!item) return;
    setQ('');
    setError('');
    setProducts(null);
    api<{ products: ProductOptions[] }>('/api/admin/suppliers/options')
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message));
  }, [item]);
  const needle = q.trim().toLowerCase();
  const rows = (products || []).flatMap((p) =>
    p.plans
      .filter((pl) => !needle || `${p.productName} ${pl.label}`.toLowerCase().includes(needle))
      .map((pl) => ({ productName: p.productName, pl })),
  );
  const link = async (planId: string) => {
    setBusy(planId);
    setError('');
    try {
      await api('/api/admin/suppliers/options', { method: 'POST', body: { action: 'link', planId, supplierProductId: item?.id } });
      onLinked();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not link.');
    } finally {
      setBusy('');
    }
  };
  return (
    <ModalShell open={Boolean(item)} onClose={onClose} title="Link to a plan" subtitle={item ? `${[item.name, item.variantName].filter(Boolean).join(' · ')} · ${item.price} ${item.currency} (${taka(item.costBdt)})` : ''} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or plan" className={`${field} h-10`} aria-label="Search product or plan" />
        {products === null ? (
          <div className="space-y-2 py-1" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-md border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-44 rounded bg-slate-200/80 dark:bg-slate-700" />
                  <div className="h-3 w-28 rounded bg-slate-200/50 dark:bg-slate-800" />
                </div>
                <div className="h-7 w-16 rounded bg-slate-200/60 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">{needle ? 'No plan matches.' : 'No plans yet.'}</p>
        ) : (
          <ul className="m-0 max-h-80 list-none space-y-1 overflow-y-auto p-0">
            {rows.map(({ productName, pl }) => {
              const taken = pl.links.some((l) => l.supplierProductId === item?.id);
              const names = pl.links.map((l) => l.supplierName).join(', ');
              return (
                <li key={pl.planId} className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{productName} · {pl.label}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{SOURCING[pl.sourcing]?.label || pl.sourcing}</span>
                      <span>price {taka(pl.priceBdt)}</span>
                      {pl.costBdt !== null ? <span>cost {taka(pl.costBdt)}</span> : null}
                      {names ? <span>linked: {names}</span> : <span>not linked</span>}
                    </div>
                  </div>
                  {taken ? (
                    <span className="text-xs text-slate-400">Already linked</span>
                  ) : (
                    <button type="button" disabled={busy !== ''} onClick={() => void link(pl.planId)} className={btn}>
                      {busy === pl.planId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Link
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="m-0 text-xs text-slate-500">Linking does not change the selling price. Set that on the plan.</p>
        {item?.needsBuyerInput ? <p className="m-0 text-xs text-amber-700">This item needs the buyer’s details, so it can only be bought by hand.</p> : null}
        {error ? <p role="alert" className="m-0 text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <button type="button" onClick={onClose} className={btn}>Close</button>
        </div>
      </div>
    </ModalShell>
  );
}
