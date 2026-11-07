'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AdminTab, DigitalDelivery, PaymentTransaction } from '@/lib/admin-data';
import { Card, formatBDT, GatewayBadge } from '@/components/admin/ui/primitives';

type Range = '7d' | '30d' | '6m' | '12m';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Buckets verified revenue and new orders by day (7d/30d) or month (6m/12m). */
function buildSeries(range: Range, payments: PaymentTransaction[], deliveries: DigitalDelivery[]) {
  const now = new Date();
  const daily = range === '7d' || range === '30d';
  const count = range === '7d' ? 7 : range === '30d' ? 30 : range === '6m' ? 6 : 12;
  const buckets: Array<{ key: string; label: string; revenueBDT: number; orders: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    if (daily) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({ key: ymd(d), label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, revenueBDT: 0, orders: 0 });
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: ymd(d).slice(0, 7), label: MONTHS[d.getMonth()], revenueBDT: 0, orders: 0 });
    }
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const keyOf = (stamp: string) => (daily ? stamp.slice(0, 10) : stamp.slice(0, 7));
  for (const p of payments) {
    if (p.status !== 'verified') continue;
    const i = index.get(keyOf(p.createdAt));
    if (i !== undefined) buckets[i].revenueBDT += p.amountBDT;
  }
  const seen = new Set<string>();
  for (const d of deliveries) {
    if (seen.has(d.orderId)) continue;
    seen.add(d.orderId);
    const i = index.get(keyOf(d.createdAt));
    if (i !== undefined) buckets[i].orders += 1;
  }
  return buckets;
}

interface OverviewChartsSectionProps {
  payments: PaymentTransaction[];
  deliveries: DigitalDelivery[];
  pendingPaymentsCount: number;
  onNavigate: (tab: AdminTab) => void;
}

export function OverviewChartsSection({
  payments,
  deliveries,
  pendingPaymentsCount,
  onNavigate,
}: OverviewChartsSectionProps) {
  const [timeRange, setTimeRange] = useState<Range>('30d');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const REVENUE_CHART_DATA = useMemo(
    () => buildSeries(timeRange, payments, deliveries),
    [timeRange, payments, deliveries],
  );
  const rangeRevenue = REVENUE_CHART_DATA.reduce((n, b) => n + b.revenueBDT, 0);
  const rangeOrders = REVENUE_CHART_DATA.reduce((n, b) => n + b.orders, 0);
  const month = new Date().toISOString().slice(0, 7);
  const gatewaySplit = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== 'verified' || !p.createdAt.startsWith(month)) continue;
      m.set(p.gateway, (m.get(p.gateway) || 0) + p.amountBDT);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [payments, month]);
  const gatewayTotal = gatewaySplit.reduce((n, [, v]) => n + v, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <Card className="lg:col-span-8 p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2>Sales</h2>

            <div className="surface-pill-segment inline-flex items-center p-1 rounded-[10px] text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                  chartType === 'area'
                    ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                  chartType === 'bar'
                    ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Orders
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {chartType === 'area' ? formatBDT(rangeRevenue) : `${rangeOrders} orders`}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 overflow-x-auto max-w-full">
              {(['7d', '30d', '6m', '12m'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 text-sm font-medium tabular-nums rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                    timeRange === t
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-56 sm:h-60 w-full mt-5">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cleanEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`)}
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [formatBDT(Number(val ?? 0)), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenueBDT"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cleanEmerald)"
                />
              </AreaChart>
            ) : (
              <BarChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="orders" name="Orders" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2>By gateway</h2>
            <span className="text-sm text-slate-500">This month</span>
          </div>

          {gatewaySplit.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No verified payments this month.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-200/70 dark:divide-slate-800">
              {gatewaySplit.map(([g, amount]) => (
                <li key={g} className="flex items-center justify-between gap-2 py-3">
                  <GatewayBadge gateway={g} />
                  <span className="text-sm">
                    <span className="admin-price">{formatBDT(amount)}</span>
                    <span className="ml-2 text-xs text-slate-500 tabular-nums">
                      {Math.round((amount / gatewayTotal) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap"
          >
            {pendingPaymentsCount > 0 ? `Check ${pendingPaymentsCount} payments` : 'View payments'}
          </button>
        </div>
      </Card>
    </div>
  );
}
