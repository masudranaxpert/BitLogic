'use client';

import React from 'react';
import type { CustomerOrderUnit } from './AccountCards';

type Line = {
  key: string;
  productName: string;
  planName: string;
  units: CustomerOrderUnit[];
};

export function groupLines(units: CustomerOrderUnit[]): Line[] {
  const map = new Map<string, Line>();
  for (const u of units) {
    // Same plan but different end dates (partial renewal) → separate rows.
    const key = `${u.lineKey || `${u.productName}|${u.variantName}`}|${u.orderExpiresAt || ''}`;
    const cur = map.get(key);
    if (cur) cur.units.push(u);
    else map.set(key, { key, productName: u.productName, planName: u.variantName, units: [u] });
  }
  return Array.from(map.values());
}

const DAY = 86_400_000;

/** One row per product line: each has its own end date and warranty. */
export function OrderLinesCard({ units, orderedOn }: { units: CustomerOrderUnit[]; orderedOn?: string }) {
  const lines = groupLines(units);
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-sm font-extrabold text-[#0F172A]">Your items</h2>
        <span className="text-xs font-semibold text-slate-500">
          {new Set(lines.map((l) => l.productName)).size} product{new Set(lines.map((l) => l.productName)).size === 1 ? '' : 's'} · {units.length} item{units.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {lines.map((l) => {
          const live = l.units.filter((u) => u.status !== 'refunded' && u.status !== 'revoked');
          const pool = live.length ? live : l.units;
          const ends = pool.map((u) => u.orderExpiresAt).filter(Boolean).sort()[0] || null;
          const daysLeft = ends ? Math.round((new Date(ends).getTime() - today) / DAY) : null;
          const start = orderedOn ? new Date(orderedOn).getTime() : null;
          const total = ends && start ? Math.max(1, Math.round((new Date(ends).getTime() - start) / DAY)) : null;
          const pct = daysLeft !== null && total ? Math.max(0, Math.min(100, (daysLeft / total) * 100)) : 0;
          const pending = pool.some((u) => u.status === 'pending_dispatch');
          const refunded = live.length === 0;
          const w = pool[0]?.warranty;
          const warrantyDays = Math.max(0, ...pool.map((u) => u.warrantyDays || 0));
          const wLabel = !pool.some((u) => u.hasWarranty) || !w || w.state === 'none'
            ? 'No warranty'
            : w.state === 'active'
              ? `${w.daysLeft}d warranty left`
              : w.state === 'scheduled'
                ? `Warranty from ${w.startsAt?.slice(0, 10)}`
                : w.state === 'pending'
                  ? `${warrantyDays}d warranty after delivery`
                  : 'Warranty ended';
          const wTone = w?.state === 'active' ? 'bg-emerald-50 text-emerald-700' : w?.state === 'scheduled' || w?.state === 'pending' ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-600';
          return (
            <li key={l.key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#0F172A]">
                    {l.productName} <span className="font-semibold text-slate-500">· {l.planName}</span>
                    {l.units.length > 1 ? <span className="ml-1 text-xs font-bold text-slate-500">×{l.units.length}</span> : null}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-600">
                    {refunded
                      ? 'Refunded'
                      : pending
                        ? 'Delivery in 10–24 hours'
                        : daysLeft === null
                          ? '—'
                          : daysLeft < 0
                            ? `Ended ${ends}`
                            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · ends ${ends}`}
                  </div>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${wTone}`}>{wLabel}</span>
                  {w?.nextStartsAt ? (
                    <span className="text-[11px] font-semibold text-slate-500">Next warranty from {w.nextStartsAt.slice(0, 10)}</span>
                  ) : null}
                </span>
              </div>
              {!refunded && !pending && daysLeft !== null ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${daysLeft <= 3 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
