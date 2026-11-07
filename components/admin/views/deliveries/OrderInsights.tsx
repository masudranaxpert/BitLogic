'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Undo2,
  XCircle,
} from 'lucide-react';
import type { DigitalDelivery, PaymentTransaction } from '@/lib/admin-data';
import { formatBDT } from '@/components/admin/ui/primitives';
import { parseStamp, warrantyState, type WarrantyFields } from '@/lib/warranty';

// ---------- dates ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const DAY = 86_400_000;

export const ymdOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayDate = (ymd: string) => parseStamp(ymd.slice(0, 10)) ?? new Date(NaN);
export const addDays = (ymd: string, n: number) => {
  const d = dayDate(ymd);
  d.setDate(d.getDate() + n);
  return ymdOf(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((dayDate(b).getTime() - dayDate(a).getTime()) / DAY);
const todayYmd = () => ymdOf(new Date());

/** '2026-11-09' → '9 Nov 2026' (year dropped when it is this year and `short`). */
export function fmtDay(s?: string | null, short = false): string {
  if (!s) return '—';
  const d = parseStamp(s);
  if (!d) return s;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${short && sameYear ? '' : ` ${d.getFullYear()}`}`;
}

/** '2026-11-08 13:26' → '8 Nov, 1:26 PM'. Bare dates fall back to fmtDay. */
export function fmtStamp(s?: string | null): string {
  if (!s) return '—';
  if (!/\d{2}:\d{2}/.test(s)) return fmtDay(s, true);
  const d = parseStamp(s);
  if (!d) return s;
  const h = d.getHours();
  const time = `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  return `${fmtDay(s, true)}, ${time}`;
}

const monthLabel = (ymd: string) => {
  const d = dayDate(ymd);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** 'Nov 2026' or 'Nov – Dec 2026' for a period. */
export function periodMonths(from: string, to: string) {
  const a = monthLabel(from);
  const b = monthLabel(to);
  if (a === b) return a;
  const [am, ay] = a.split(' ');
  const [bm, by] = b.split(' ');
  return ay === by ? `${am} – ${bm} ${by}` : `${a} – ${b}`;
}

// ---------- warranty ----------

/** Compact warranty status — chip + one short date line. */
export function WarrantySummary({
  fields,
  compact = false,
}: {
  fields: WarrantyFields;
  compact?: boolean;
}) {
  const w = warrantyState(fields);
  const days = fields.warrantyDays || 0;
  const chip = (tone: string, label: string) => (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      <ShieldCheck className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
  const TONE = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    grey: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  let head: React.ReactNode;
  let text = '';
  switch (w.state) {
    case 'none':
      return null;
    case 'pending':
      head = chip(TONE.amber, `${days}d warranty`);
      text = 'After delivery';
      break;
    case 'scheduled':
      head = chip(TONE.blue, `${days}d warranty`);
      text = fmtStamp(w.startsAt);
      break;
    case 'active':
      head = chip(TONE.green, `${w.daysLeft}d left`);
      text = fmtStamp(w.endsAt);
      break;
    case 'ended':
      head = chip(TONE.grey, 'Warranty ended');
      text = fmtStamp(w.endsAt);
      break;
  }
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-2 gap-y-0.5' : 'space-y-1'}>
      {head}
      {text ? (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{text}</span>
      ) : null}
    </div>
  );
}

// ---------- billing periods ----------

export type Period = {
  kind: 'purchase' | 'renewal' | 'pending';
  from: string;
  to: string;
  paymentId?: string;
  /** Older renewals did not store their period; it is worked out from the end date. */
  estimated?: boolean;
};

const isLive = (u: DigitalDelivery) => u.status !== 'refunded' && u.status !== 'revoked';

function paysForUnit(u: DigitalDelivery, payments: PaymentTransaction[], status: PaymentTransaction['status']) {
  return payments
    .filter(
      (p) =>
        p.kind === 'renewal' &&
        p.status === status &&
        (p.renewDeliveryIds?.length ? p.renewDeliveryIds.includes(u.id) : p.deliveryId ? p.deliveryId === u.id : true),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Paid periods of one seat, oldest first: the purchase, then each verified renewal,
 * then a pending renewal (if any). Renewals without a stored period are worked out
 * backwards from the seat's current end date.
 */
export function seatPeriods(u: DigitalDelivery, payments: PaymentTransaction[], orderDate: string): Period[] {
  const valid = Math.max(1, u.credentialValidDays || 30);
  const end = (u.orderExpiresAt || '').slice(0, 10);
  const renewals = paysForUnit(u, payments, 'verified');
  const out: Period[] = [];
  let cursor = end || addDays(orderDate, valid);
  for (let i = renewals.length - 1; i >= 0; i--) {
    const r = renewals[i];
    if (r.periodFrom && r.periodTo) {
      out.unshift({ kind: 'renewal', from: r.periodFrom, to: r.periodTo, paymentId: r.id });
      cursor = addDays(r.periodFrom, -1);
    } else {
      const from = addDays(cursor, -valid + 1);
      out.unshift({ kind: 'renewal', from, to: cursor, paymentId: r.id, estimated: true });
      cursor = addDays(from, -1);
    }
  }
  const purchaseTo = cursor < orderDate ? orderDate : cursor;
  out.unshift({ kind: 'purchase', from: orderDate, to: purchaseTo });
  const pending = paysForUnit(u, payments, 'pending_verification')[0];
  if (pending && isLive(u)) {
    const base = end && end >= todayYmd() ? addDays(end, 1) : todayYmd();
    out.push({ kind: 'pending', from: base, to: addDays(base, valid - 1), paymentId: pending.id });
  }
  return out;
}

/** Period each renewal payment paid for, across all its seats. */
export function periodsByPayment(seatMap: Map<string, Period[]>) {
  const m = new Map<string, { from: string; to: string; estimated: boolean; seats: string[] }>();
  for (const [seatId, periods] of seatMap) {
    for (const p of periods) {
      if (!p.paymentId) continue;
      const cur = m.get(p.paymentId);
      if (!cur) m.set(p.paymentId, { from: p.from, to: p.to, estimated: Boolean(p.estimated), seats: [seatId] });
      else {
        if (p.from < cur.from) cur.from = p.from;
        if (p.to > cur.to) cur.to = p.to;
        cur.seats.push(seatId);
      }
    }
  }
  return m;
}

// ---------- coverage timeline ----------

export type TimelineRow = {
  id: string;
  label: string;
  sub?: string;
  closed?: boolean;
  periods: Period[];
};

const SEG = {
  purchase: 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900',
  renewal: 'bg-emerald-600 text-white',
  pending: 'border border-dashed border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

/** One row per seat; bars = paid periods on a shared month axis. */
export function CoverageTimeline({ rows }: { rows: TimelineRow[] }) {
  const today = todayYmd();
  const all = rows.flatMap((r) => r.periods);
  if (all.length === 0) return null;
  let min = all.reduce((m, p) => (p.from < m ? p.from : m), all[0].from);
  let max = all.reduce((m, p) => (p.to > m ? p.to : m), all[0].to);
  if (today < min) min = today;
  if (today > max) max = today;
  min = addDays(min, -2);
  max = addDays(max, 3);
  const span = Math.max(1, daysBetween(min, max) + 1);
  const pos = (ymd: string) => (daysBetween(min, ymd) / span) * 100;

  const ticks: Array<{ at: number; label: string }> = [];
  const first = dayDate(min);
  for (
    let d = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    ymdOf(d) <= max;
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  ) {
    ticks.push({
      at: pos(ymdOf(d)),
      label: `${MONTHS[d.getMonth()]}${d.getMonth() === 0 ? ` ${d.getFullYear()}` : ''}`,
    });
  }
  const todayAt = pos(today);

  return (
    <div className="space-y-3">
      <div className="relative hidden h-4 text-[11px] text-slate-400 sm:block sm:ml-[9.5rem]">
        {ticks.map((t) => (
          <span
            key={t.label + t.at}
            className="absolute -translate-x-1/2"
            style={{ left: `${t.at}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`flex flex-col gap-1.5 sm:flex-row sm:items-center ${
              r.closed ? 'opacity-45' : ''
            }`}
          >
            <div className="w-full shrink-0 sm:w-[9.5rem] sm:pr-3">
              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {r.label}
              </div>
              {r.sub ? (
                <div className="truncate text-[11px] text-slate-500">{r.sub}</div>
              ) : null}
            </div>
            <div className="relative h-7 w-full rounded bg-slate-100 dark:bg-slate-800/70 sm:flex-1">
              {ticks.map((t) => (
                <span
                  key={t.at}
                  className="absolute inset-y-0 w-px bg-slate-200/80 dark:bg-slate-700/80"
                  style={{ left: `${t.at}%` }}
                />
              ))}
              {r.periods.map((p, i) => {
                const left = pos(p.from);
                const width = Math.max(1.2, pos(addDays(p.to, 1)) - left);
                const kindLabel =
                  p.kind === 'purchase'
                    ? 'Purchase'
                    : p.kind === 'pending'
                      ? 'Pending'
                      : 'Renewal';
                const showText = width >= 14;
                return (
                  <div
                    key={i}
                    title={`${kindLabel}: ${fmtDay(p.from)} → ${fmtDay(p.to)}${
                      p.estimated ? ' · estimated' : ''
                    }`}
                    className={`absolute top-1 bottom-1 flex items-center overflow-hidden rounded-sm px-1.5 text-[10px] font-medium leading-none ${SEG[p.kind]}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {showText ? (
                      <span className="truncate">
                        {fmtDay(p.from, true)}–{fmtDay(p.to, true)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              <span
                className="absolute -top-0.5 -bottom-0.5 z-[1] w-0.5 rounded-full bg-rose-500"
                style={{ left: `${todayAt}%` }}
                title="Today"
                aria-hidden
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-slate-500 sm:ml-[9.5rem]">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-3.5 rounded-sm ${SEG.purchase}`} /> Buy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-3.5 rounded-sm ${SEG.renewal}`} /> Renew
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-3.5 rounded-sm ${SEG.pending}`} /> Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded bg-rose-500" /> Today
        </span>
      </div>
    </div>
  );
}

// ---------- billing chart ----------

type MonthRow = {
  key: string;
  label: string;
  purchase: number;
  renewal: number;
  refund: number;
};

function BillingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0);
  if (!rows.length) return null;
  const nameOf = (k?: string) =>
    k === 'purchase' ? 'Buy' : k === 'renewal' ? 'Renew' : 'Refund';
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
        {label}
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={String(r.dataKey)}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: r.color }}
              />
              {nameOf(r.dataKey)}
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatBDT(Number(r.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Monthly verified money — EvilCharts-style stacked bars on Recharts. */
export function BillingChart({ payments }: { payments: PaymentTransaction[] }) {
  const data = useMemo(() => {
    const verified = payments.filter(
      (p) => p.status === 'verified' || p.status === 'refunded',
    );
    if (verified.length === 0) return [] as MonthRow[];
    const keys = verified.map((p) => p.createdAt.slice(0, 7)).sort();
    const start = dayDate(`${keys[0]}-01`);
    const end = dayDate(`${keys[keys.length - 1]}-01`);
    const rows: MonthRow[] = [];
    for (
      let d = new Date(start);
      d <= end;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      rows.push({
        key: ymdOf(d).slice(0, 7),
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        purchase: 0,
        renewal: 0,
        refund: 0,
      });
    }
    while (rows.length < 3) {
      const last = dayDate(`${rows[rows.length - 1].key}-01`);
      const d = new Date(last.getFullYear(), last.getMonth() + 1, 1);
      rows.push({
        key: ymdOf(d).slice(0, 7),
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        purchase: 0,
        renewal: 0,
        refund: 0,
      });
    }
    const idx = new Map(rows.map((r, i) => [r.key, i]));
    for (const p of verified) {
      const i = idx.get(p.createdAt.slice(0, 7));
      if (i === undefined) continue;
      if (p.status === 'refunded') rows[i].refund += p.amountBDT;
      else if (p.kind === 'renewal') rows[i].renewal += p.amountBDT;
      else rows[i].purchase += p.amountBDT;
    }
    return rows;
  }, [payments]);

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">No payments yet.</p>
    );
  }
  const hasRefund = data.some((d) => d.refund > 0);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="42%"
          barGap={0}
        >
          <defs>
            <linearGradient id="bl-purchase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="bl-renewal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="bl-refund" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="currentColor"
            className="text-slate-200/80 dark:text-slate-800"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            fontSize={12}
            tick={{ fill: 'currentColor' }}
            className="text-slate-500"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            fontSize={11}
            tickMargin={6}
            tick={{ fill: 'currentColor' }}
            className="text-slate-400"
            tickFormatter={(v: number) =>
              v >= 1000 ? `৳${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `৳${v}`
            }
          />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.04)', radius: 6 }}
            content={<BillingTooltip />}
          />
          <Bar
            dataKey="purchase"
            name="purchase"
            stackId="m"
            fill="url(#bl-purchase)"
            maxBarSize={36}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="renewal"
            name="renewal"
            stackId="m"
            fill="url(#bl-renewal)"
            maxBarSize={36}
            radius={[6, 6, 0, 0]}
          />
          {hasRefund ? (
            <Bar
              dataKey="refund"
              name="refund"
              fill="url(#bl-refund)"
              maxBarSize={36}
              radius={[6, 6, 0, 0]}
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- activity ----------

export type ActivityEvent = {
  at: string;
  kind:
    | 'order'
    | 'payment'
    | 'verified'
    | 'renewal'
    | 'credential'
    | 'delivered'
    | 'warranty'
    | 'rejected'
    | 'refund';
  title: string;
  detail?: string;
};

const EVENT_ICON: Record<ActivityEvent['kind'], { icon: React.ElementType; tone: string }> = {
  order: { icon: ShoppingCart, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  payment: { icon: CircleDollarSign, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' },
  verified: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' },
  renewal: { icon: RefreshCw, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' },
  credential: { icon: KeyRound, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400' },
  delivered: { icon: PackageCheck, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400' },
  warranty: { icon: ShieldCheck, tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400' },
  rejected: { icon: XCircle, tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' },
  refund: { icon: Undo2, tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' },
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (sorted.length === 0) return <p className="py-8 text-center text-sm text-slate-500">Nothing yet.</p>;
  const groups: Array<{ day: string; items: ActivityEvent[] }> = [];
  for (const e of sorted) {
    const day = e.at.slice(0, 10);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{fmtDay(g.day)}</h3>
          <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-800">
            {g.items.map((e, i) => {
              const { icon: Icon, tone } = EVENT_ICON[e.kind];
              return (
                <li key={i} className="relative">
                  <span className={`absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${tone}`}>
                    <Icon className="h-3 w-3" aria-hidden />
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{e.title}</span>
                    <span className="text-xs tabular-nums text-slate-500">{/\d{2}:\d{2}/.test(e.at) ? fmtStamp(e.at).split(', ')[1] : ''}</span>
                  </div>
                  {e.detail ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{e.detail}</p> : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
