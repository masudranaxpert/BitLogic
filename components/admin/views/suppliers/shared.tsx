'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ModalShell } from '@/components/admin/ui/primitives';

/** Small helpers shared by the Suppliers admin pages. */

export async function api<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method || 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const SOURCING: Record<string, { label: string; help: string }> = {
  own: { label: 'Your credentials', help: 'Only credentials you added. A supplier link is not used.' },
  own_then_supplier: { label: 'Your credentials, then supplier', help: 'Your credentials first. Buy from the supplier when those run out.' },
  supplier_auto: { label: 'Supplier, automatic', help: 'Buy as soon as the payment is verified. Your credentials are not used.' },
  supplier_manual: { label: 'Supplier, manual', help: 'You press Buy on the order. Your credentials are not used.' },
};

export type ToastItem = { id: number; tone: 'ok' | 'error'; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (tone: ToastItem['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, tone, text }].slice(-3));
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 4200);
  };
  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));
  return { toasts, push, dismiss };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-3 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto rounded-md border px-3 py-2 text-left text-sm shadow-md ${
            t.tone === 'error'
              ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300'
              : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}

export type OptionLink = {
  linkId: string;
  priority: number;
  isActive: boolean;
  supplierProductId: string;
  supplierName: string;
  supplierOn: boolean;
  name: string;
  price: string;
  previousPrice: string;
  currency: string;
  costBdt: number | null;
  stock: number | null;
  status: string;
  warning: string;
};

export type OptionView = {
  planId: string;
  code: string;
  label: string;
  isActive: boolean;
  priceBdt: number;
  sourcing: string;
  pricingMode: string;
  markupPercent: number;
  markupFlatBdt: number;
  roundToBdt: number;
  minMarginBdt: number;
  renewalPricing: string;
  allowBackorder: boolean | null;
  pricingAlert: string;
  costBdt: number | null;
  suggestedPrice: number | null;
  marginBdt: number | null;
  marginPct: number | null;
  inStock: boolean;
  stock: number | null;
  canOrder: boolean;
  links: OptionLink[];
};

export type ProductOptions = {
  productId: string;
  productName: string;
  plans: OptionView[];
};

export const taka = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `৳${Math.round(n).toLocaleString('en-US')}`);

export function ago(iso: string | null | undefined) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

/** Human text for an option's pricing alert list ("loss,jump:520"). */
export function alertTexts(alert: string, current: number, cost: number | null): string[] {
  if (!alert) return [];
  return alert.split(',').map((a) =>
    a === 'loss'
      ? `Losing money: supplier cost ${taka(cost)} is above the price ${taka(current)}.`
      : a.startsWith('jump:')
        ? `Auto price wants ${taka(Number(a.slice(5)))} (now ${taka(current)}): a bigger rise than the guard allows. Approve or adjust.`
        : a === 'no_rate'
          ? 'No exchange rate for this supplier currency (Pricing & rules).'
          : a,
  );
}

export const field =
  'w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

export function Pill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'grey'; children: React.ReactNode }) {
  const t = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    grey: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function stockPill(status: string, stock: number | null) {
  if (status === 'removed') return <Pill tone="grey">Removed</Pill>;
  if (status !== 'available' || stock === 0) return <Pill tone="red">Out of stock</Pill>;
  return <Pill tone={stock !== null && stock <= 3 ? 'amber' : 'green'}>{stock === null ? 'In stock' : `${stock} in stock`}</Pill>;
}

function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const start = current <= 3 ? 2 : current >= total - 2 ? Math.max(2, total - 3) : current - 1;
  const end = current <= 3 ? Math.min(total - 1, 4) : current >= total - 2 ? total - 1 : current + 1;
  const out: Array<number | 'gap'> = [1];
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('gap');
  out.push(total);
  return out;
}

/** Numbered pages. No previous/next buttons. */
export function PageNumbers({ page, pages, onPage, label }: { page: number; pages: number; onPage: (n: number) => void; label?: string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex flex-col items-center gap-2 border-t border-slate-100 px-3 py-3 sm:flex-row sm:justify-between dark:border-slate-800">
      {label ? <p className="m-0 text-xs text-slate-500">{label}</p> : <span className="hidden sm:block" />}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {pageWindow(page, pages).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium tabular-nums cursor-pointer ${
                n === page
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {n}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="m-0 mt-1 text-sm text-slate-500">{sub}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export const btn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:border-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 cursor-pointer';
export const btnPrimary =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer';

export type SupplierCatalogItem = {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  variantName?: string;
  category?: string;
  period?: string;
  price: string;
  previousPrice?: string;
  priceChangedAt?: string | null;
  currency: string;
  costBdt: number | null;
  stock: number | null;
  status: string;
  deliveryType?: string;
  minQty: number;
  maxQty: number;
  needsBuyerInput: boolean;
  description: string;
  links: Array<{ planId: string; label: string }>;
};

export function deliveryLabel(kind?: string) {
  if (kind === 'manual') return 'Hand delivery at the supplier';
  if (kind === 'automatic') return 'Automatic';
  return 'Instant';
}

function linkify(line: string) {
  return line.split(/(https?:\/\/\S+)/g).map((part, i) =>
    part.startsWith('http') ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-emerald-700 underline dark:text-emerald-400">{part}</a>
    ) : (
      <span key={i}>{part.replace(/[ \t]{2,}/g, ' ')}</span>
    ),
  );
}

export function ItemView({ item, onClose }: { item: SupplierCatalogItem | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const lines = (item?.description || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const copyDescription = async () => {
    if (!item?.description) return;
    try {
      await navigator.clipboard.writeText(item.description);
    } catch {
      const area = document.createElement('textarea');
      area.value = item.description;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <ModalShell
      open={Boolean(item)}
      onClose={onClose}
      title={item ? [item.name, item.variantName].filter(Boolean).join(' · ') : ''}
      subtitle={item ? <Pill tone="blue">{item.supplierName}</Pill> : undefined}
      maxWidth="max-w-lg"
    >
      {item ? (
        <div className="space-y-6 text-sm">
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <div><dt className="text-xs text-slate-500">Group</dt><dd className="m-0">{item.category || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Period</dt><dd className="m-0">{item.period || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Supplier price</dt><dd className="m-0 tabular-nums">{item.price} {item.currency}</dd></div>
            <div><dt className="text-xs text-slate-500">Cost</dt><dd className="m-0 tabular-nums">{taka(item.costBdt)}</dd></div>
            <div><dt className="text-xs text-slate-500">Stock</dt><dd className="m-0">{stockPill(item.status, item.stock)}</dd></div>
            <div><dt className="text-xs text-slate-500">Delivery</dt><dd className="m-0">{deliveryLabel(item.deliveryType)}</dd></div>
            <div><dt className="text-xs text-slate-500">Quantity</dt><dd className="m-0 tabular-nums">{item.minQty}–{item.maxQty}</dd></div>
            <div><dt className="text-xs text-slate-500">Buyer details</dt><dd className="m-0">{item.needsBuyerInput ? 'Required' : 'No'}</dd></div>
          </dl>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-500">Description</div>
              {item.description ? (
                <button type="button" onClick={() => void copyDescription()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 cursor-pointer" aria-label="Copy description">
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              ) : null}
            </div>
            {lines.length ? (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 leading-relaxed dark:border-slate-800 dark:bg-slate-900/60">
                <div className="space-y-2 px-3.5 py-3 pr-5">
                  {lines.map((line, i) => (
                    <p key={i} className={`m-0 ${/^[❗⚠]/.test(line) ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>{linkify(line)}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="m-0 mt-1 text-slate-500">The supplier sent no description.</p>
            )}
          </div>
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500">Used by</div>
            {item.links?.length ? <ul className="m-0 mt-1 list-none p-0">{item.links.map((l) => <li key={l.planId}>{l.label}</li>)}</ul> : <p className="m-0 mt-1 text-slate-500">Not linked.</p>}
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
