'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/admin/ui/Card';

type SecurityEventItem = {
  id: string;
  ip: string;
  endpoint: string;
  action: string;
  severity: string;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
};

export function SecurityAuditView() {
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/admin/security/events?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEvents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-50">
            Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete real-time incident telemetry, throttled requests, and blocked access attempts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchEvents()}
          className="inline-flex items-center gap-2 px-3.5 h-9 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 hover:border-emerald-600 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IP, endpoint, or details…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'rate_limit_429', 'ip_blocked_403'] as const).map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  actionFilter === act
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {act === 'all'
                  ? 'All Events'
                  : act === 'rate_limit_429'
                    ? '429 Rate-Limited'
                    : '403 Blocked'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-medium">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Client IP</th>
                <th className="px-4 py-3">Action / Status</th>
                <th className="px-4 py-3">Target Endpoint</th>
                <th className="px-4 py-3">Details / User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {loading ? 'Loading audit trail…' : 'No audit events recorded yet.'}
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleDateString()}{' '}
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {ev.ip}
                    </td>
                    <td className="px-4 py-3">
                      {ev.action === 'ip_blocked_403' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          403 FORBIDDEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          429 TOO MANY REQS
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {ev.endpoint}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-sm truncate">
                      {ev.details || 'Rate limit threshold exceeded'}
                      {ev.userAgent ? <span className="text-slate-400 block truncate text-[11px] font-mono">{ev.userAgent}</span> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
