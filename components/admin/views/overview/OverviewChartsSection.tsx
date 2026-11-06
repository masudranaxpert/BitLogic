'use client';

import React, { useState } from 'react';
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
import { AdminTab } from '@/lib/admin-data';
import { Card, formatBDT } from '@/components/admin/ui/primitives';

/** Empty scaffold until live revenue series is wired (no mock seed). */
const REVENUE_CHART_DATA = [
  { month: 'May', revenueBDT: 0, orders: 0, autoDelivered: 0 },
  { month: 'Jun', revenueBDT: 0, orders: 0, autoDelivered: 0 },
  { month: 'Jul', revenueBDT: 0, orders: 0, autoDelivered: 0 },
  { month: 'Aug', revenueBDT: 0, orders: 0, autoDelivered: 0 },
  { month: 'Sep', revenueBDT: 0, orders: 0, autoDelivered: 0 },
  { month: 'Oct', revenueBDT: 0, orders: 0, autoDelivered: 0 },
];

interface OverviewChartsSectionProps {
  totalMonthlyRevenue: number;
  pendingPaymentsCount: number;
  onNavigate: (tab: AdminTab) => void;
}

export function OverviewChartsSection({
  totalMonthlyRevenue,
  pendingPaymentsCount,
  onNavigate,
}: OverviewChartsSectionProps) {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '6m' | 'Max'>('6m');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <Card className="lg:col-span-8 p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Sales Report
            </h2>

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
              <div className="admin-price text-2xl sm:text-3xl tracking-tight">
                {formatBDT(totalMonthlyRevenue)}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 overflow-x-auto max-w-full">
              {(['1d', '7d', '30d', '6m', 'Max'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
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
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `৳${Math.round(v / 1000)}k`}
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
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
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
                <Bar dataKey="orders" name="Total Orders" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="autoDelivered" name="Auto-Vault" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Payment Gateways
            </h2>
            <span className="admin-muted text-xs font-medium tabular-nums">This month</span>
          </div>

          <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm mt-1">
            {(
              [
                { name: 'bKash Merchant', amount: 0 },
                { name: 'Nagad Wallet', amount: 0 },
                { name: 'Binance Pay & Stripe', amount: 0 },
              ] as const
            ).map((row) => (
              <div
                key={row.name}
                className="py-3 flex items-center justify-between gap-2"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {row.name}
                </span>
                <span className="admin-price shrink-0">{formatBDT(row.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap"
          >
            View Payments ({pendingPaymentsCount})
          </button>
        </div>
      </Card>
    </div>
  );
}
