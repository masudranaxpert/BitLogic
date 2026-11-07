'use client';

import React from 'react';
import { CalendarClock, Hourglass, Timer } from 'lucide-react';
import type { Product } from '@/lib/products';
import { scheduleState, shortDuration, splitDuration } from '@/lib/catalog/schedule';
import { useSaleClock } from '@/hooks/use-sale-clock';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/** Current order-window state of a product on the storefront (null until the clock is ready). */
export function useProductWindow(product: Pick<Product, 'availableFrom' | 'availableUntil'>) {
  const scheduled = Boolean(product.availableFrom || product.availableUntil);
  const now = useSaleClock(scheduled ? 1000 : 0);
  if (!scheduled) return { scheduled: false as const, state: 'always' as const, canOrder: true, msLeft: null, ready: true };
  if (now === null) {
    return { scheduled: true as const, state: 'live' as const, canOrder: true, msLeft: null, ready: false };
  }
  return { scheduled: true as const, ...scheduleState(product, now), ready: true };
}

function Digit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div className="flex min-w-[3.1rem] flex-col items-center rounded-md bg-white px-2 py-1.5 shadow-sm ring-1 ring-black/5 sm:min-w-[3.6rem]">
      <span
        className={`font-mono text-xl font-extrabold leading-none tabular-nums sm:text-2xl ${
          urgent ? 'text-[#E04845]' : 'text-[#0F172A]'
        }`}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

/** Big countdown block for the product page. Renders nothing for products without a window. */
export function SaleCountdown({ product }: { product: Product }) {
  const w = useProductWindow(product);
  if (!w.scheduled || !w.ready) return null;

  if (w.state === 'ended') {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
        <Hourglass size={18} className="shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0">
          <p className="m-0 text-sm font-extrabold text-[#0F172A]">This offer has ended</p>
          <p className="m-0 text-xs text-slate-500">
            It can no longer be ordered{product.availableUntil ? ` (closed ${when(product.availableUntil)})` : ''}.
          </p>
        </div>
      </div>
    );
  }

  const upcoming = w.state === 'upcoming';
  if (!upcoming && !product.availableUntil) return null;
  const target = upcoming ? product.availableFrom! : product.availableUntil!;
  const left = w.msLeft ?? 0;
  const t = splitDuration(left);
  const urgent = !upcoming && left < 86_400_000;

  return (
    <div
      role="timer"
      aria-label={`${upcoming ? 'Opens in' : 'Offer ends in'} ${shortDuration(left)}`}
      className={`rounded-lg border px-3.5 py-3 ${
        upcoming
          ? 'border-sky-200 bg-sky-50'
          : urgent
            ? 'border-[#FF5E5B]/40 bg-[#FFF1F0]'
            : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="m-0 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#0F172A]">
            {upcoming ? <CalendarClock size={14} aria-hidden /> : <Timer size={14} aria-hidden />}
            {upcoming ? 'Opens in' : urgent ? 'Ending soon' : 'Limited-time offer'}
          </p>
          <p className="m-0 mt-0.5 text-xs text-slate-600">
            {upcoming ? 'Opens' : 'Order before'} {when(target)}
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden>
          {t.d > 0 ? <Digit value={t.d} label="Days" urgent={urgent} /> : null}
          <Digit value={t.h} label="Hrs" urgent={urgent} />
          <Digit value={t.m} label="Min" urgent={urgent} />
          <Digit value={t.s} label="Sec" urgent={urgent} />
        </div>
      </div>
    </div>
  );
}

/** One-line chip for product cards. */
export function SaleChip({ product }: { product: Product }) {
  const w = useProductWindow(product);
  if (!w.scheduled || !w.ready) return null;
  if (w.state === 'ended') {
    return (
      <p className="m-0 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
        <Hourglass size={12} aria-hidden /> Offer ended
      </p>
    );
  }
  if (w.state === 'upcoming') {
    return (
      <p className="m-0 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700">
        <CalendarClock size={12} aria-hidden /> Opens in {shortDuration(w.msLeft ?? 0)}
      </p>
    );
  }
  if (w.msLeft === null) return null;
  return (
    <p
      className={`m-0 inline-flex items-center gap-1 text-[11px] font-bold ${
        w.msLeft < 86_400_000 ? 'text-[#E04845]' : 'text-amber-700'
      }`}
    >
      <Timer size={12} aria-hidden /> Ends in {shortDuration(w.msLeft)}
    </p>
  );
}
