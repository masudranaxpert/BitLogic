'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  AlertTriangle,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/admin/ui/Card';

type SecurityStats = {
  metrics: {
    blockedIps: number;
    flaggedIps: number;
    whitelistedIps: number;
    events24h: number;
  };
  timeline: Array<{
    hour: string;
    allowed: number;
    rateLimited: number;
    blocked: number;
  }>;
  topAttackEndpoints: Array<{ endpoint: string; hits: number }>;
  recentEvents: Array<{
    id: string;
    ip: string;
    endpoint: string;
    action: string;
    severity: string;
    details: string | null;
    createdAt: string;
  }>;
};

export function SecurityOverviewView({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [data, setData] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load security stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-50">
            Security & Traffic
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void fetchStats()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 h-9 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 hover:border-emerald-600 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Live
        </button>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              24h Incidents
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-2 font-display">
            {data?.metrics.events24h ?? '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            Recorded in the last 24 hours
          </p>
        </Card>

        <Card className="p-4 sm:p-5 relative overflow-hidden group border-amber-500/20 dark:border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rate Limit Hits (429)
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-display">
            {data?.timeline.reduce((acc, curr) => acc + curr.rateLimited, 0) ?? '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Requests throttled by endpoint limits
          </p>
        </Card>

        <Card className="p-4 sm:p-5 relative overflow-hidden group border-rose-500/20 dark:border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Blocked IPs (403)
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2 font-display">
            {data?.metrics.blockedIps ?? '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rejected at in-memory IP guard
          </p>
        </Card>

        <Card className="p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Flagged Suspicious
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-2 font-display">
            {data?.metrics.flaggedIps ?? '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Auto-blocks at 15 rate-limit hits
          </p>
        </Card>
      </div>

      {/* 24-Hour Traffic & Security Telemetry Chart */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              24-Hour Traffic &amp; Security Telemetry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real hourly database counts of normal operations vs. 429 rate-limit hits vs. 403 IP blocks
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span className="text-slate-600 dark:text-slate-300">Allowed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <span className="text-slate-600 dark:text-slate-300">Rate Limited (429)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
              <span className="text-slate-600 dark:text-slate-300">Blocked (403)</span>
            </div>
          </div>
        </div>

        {/* EvilCharts Container with Micro-dot Background */}
        <div className="h-72 w-full pt-2 rounded-xl bg-slate-900/5 dark:bg-slate-950/60 p-2 border border-slate-200/50 dark:border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* Emerald Gradient for Allowed */}
                <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>

                {/* Amber Gradient for Rate Limit */}
                <linearGradient id="amberGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>

                {/* Crimson Gradient for Blocked */}
                <linearGradient id="roseGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>

                {/* SVG Glow Filter for EvilCharts aesthetic */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-md text-xs text-white space-y-1">
                        <div className="font-semibold text-slate-300 pb-1 border-b border-slate-800">
                          Time: {label}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>Allowed:</span>
                          <span className="font-mono font-bold">{payload[0]?.value}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-amber-400">
                          <span>Rate Limited:</span>
                          <span className="font-mono font-bold">{payload[1]?.value}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400">
                          <span>Blocked:</span>
                          <span className="font-mono font-bold">{payload[2]?.value}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="allowed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#emeraldGlow)"
              />
              <Area
                type="monotone"
                dataKey="rateLimited"
                stroke="#f59e0b"
                strokeWidth={2.5}
                filter="url(#neonGlow)"
                fillOpacity={1}
                fill="url(#amberGlow)"
              />
              <Area
                type="monotone"
                dataKey="blocked"
                stroke="#ef4444"
                strokeWidth={3}
                filter="url(#neonGlow)"
                fillOpacity={1}
                fill="url(#roseGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom Grid: Top Attack Vectors & Recent Security Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Top Attack Vectors */}
        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Targeted Endpoints
            </h3>
            <span className="text-xs text-slate-500">Hits (24h)</span>
          </div>

          <div className="space-y-3">
            {data?.topAttackEndpoints.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No attack vectors recorded.</p>
            ) : (
              data?.topAttackEndpoints.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                      {item.endpoint}
                    </span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {item.hits} hits
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (item.hits / (data.metrics.events24h || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Incidents Feed */}
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Recent Incidents Stream
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.('security-audit')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              Full Trail
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {data?.recentEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent security events.</p>
            ) : (
              data?.recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        ev.action === 'ip_blocked_403'
                          ? 'bg-rose-500 shadow-[0_0_6px_#ef4444]'
                          : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {ev.ip}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
                          {ev.endpoint}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {ev.details || ev.action}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                    {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
