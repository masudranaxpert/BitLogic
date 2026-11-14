'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Activity as ActivityIcon,
  Filter,
} from 'lucide-react';
import {
  Card,
  EmptyTableState,
  PaginationFooter,
  SegmentedTabs,
  StatMetric,
  StatusIndicator,
} from '@/components/admin/ui/primitives';

type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
};

export type ActivityCategory =
  | 'all'
  | 'payments'
  | 'orders'
  | 'catalog'
  | 'customers'
  | 'logins'
  | 'system';

const CATEGORY_TITLES: Record<ActivityCategory, string> = {
  all: 'Activity Logs',
  payments: 'Payment Logs',
  orders: 'Order Logs',
  catalog: 'Catalog Logs',
  customers: 'Customer Logs',
  logins: 'Sign-In Logs',
  system: 'System Logs',
};

type IpRow = {
  ip: string;
  count: number;
  failed: number;
  lastAt: string;
};

type LoginItem = {
  id: string;
  at: string;
  ip: string;
  method: string;
  success: boolean;
  userAgent: string;
  user: StaffUser;
};

type ActionItem = {
  id: string;
  at: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  ip: string;
  user: StaffUser;
};

type ActivityStats = {
  totalLogins: number;
  successLogins: number;
  failedLogins: number;
  uniqueIps: number;
  totalActivity: number;
  actions24h: number;
  activeStaffCount: number;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleBadgeTone(role?: string): 'emerald' | 'blue' | 'amber' {
  if (role === 'ADMIN') return 'emerald';
  if (role === 'CUSTOMER') return 'amber';
  return 'blue';
}

function roleBadgeLabel(role?: string, hasUserId?: boolean, success?: boolean): string {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'STAFF') return 'Staff';
  if (!hasUserId && success === false) return 'Unknown';
  return 'Customer';
}

function isAutomatedSystemAction(action?: string): boolean {
  if (!action) return false;
  return (
    action === 'payment.auto_verified' ||
    action === 'payment.sender_registered' ||
    action === 'payment.trx_claimed' ||
    action.startsWith('sms.')
  );
}

function actionBadgeStyle(action?: string): string {
  if (!action) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (action === 'payment.auto_verified' || action === 'product.plan_on' || action === 'product.create' || action === 'product.plan_add') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (action === 'payment.manual_verify' || action === 'payment.manual_match' || action === 'product.save') {
    return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  }
  if (action === 'payment.trx_claimed' || action === 'payment.sender_registered' || action === 'product.plan_off') {
    return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  }
  if (action === 'payment.reject' || action === 'payment.refund' || action === 'sms.parse_failed' || action === 'product.plan_remove') {
    return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function userInitials(name: string | null | undefined, email: string) {
  const source = (name || email || 'ST').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

function simplifyUserAgent(ua: string) {
  if (!ua) return 'Unknown device';
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} · ${os}` : browser;
}

function usePagination<T>(items: T[], initialSize = 15) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total: items.length,
    setPage,
    setPageSize,
  };
}

// -------------------------------------------------------------
// 1. ALL SIGN-IN ATTEMPTS VIEW (Admin, Staff, Customer & Unknown)
// -------------------------------------------------------------
export function StaffLoginsView({ userId }: { userId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(userId || 'all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'customer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [daysWindow, setDaysWindow] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState<ActivityStats>({
    totalLogins: 0,
    successLogins: 0,
    failedLogins: 0,
    uniqueIps: 0,
    totalActivity: 0,
    actions24h: 0,
    activeStaffCount: 0,
  });
  const [logins, setLogins] = useState<LoginItem[]>([]);
  const [ips, setIps] = useState<IpRow[]>([]);

  const loadData = useCallback(
    async (uid?: string, days = daysWindow) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('includeAllLogins', '1');
        params.set('days', String(days));
        if (uid && uid !== 'all') params.set('userId', uid);

        const res = await fetch(`/api/admin/staff/activity?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Failed to load logins.');

        setLogins(data.logins || []);
        setIps(data.ips || []);
        if (data.users) setStaffUsers(data.users);
        if (data.stats) setStats(data.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load logins.');
      } finally {
        setLoading(false);
      }
    },
    [daysWindow],
  );

  useEffect(() => {
    void loadData(selectedStaffId, daysWindow);
  }, [selectedStaffId, daysWindow, loadData]);

  const filteredLogins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logins.filter((item) => {
      if (roleFilter === 'staff' && item.user?.role === 'CUSTOMER') return false;
      if (roleFilter === 'customer' && item.user?.role !== 'CUSTOMER') return false;
      if (statusFilter === 'success' && !item.success) return false;
      if (statusFilter === 'failed' && item.success) return false;
      if (!q) return true;

      const userText = `${item.user?.name || ''} ${item.user?.email || ''}`.toLowerCase();
      const ipText = (item.ip || '').toLowerCase();
      const uaText = (item.userAgent || '').toLowerCase();
      return userText.includes(q) || ipText.includes(q) || uaText.includes(q);
    });
  }, [logins, roleFilter, statusFilter, searchQuery]);

  const paged = usePagination(filteredLogins, 20);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Sign-In Logs
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={daysWindow}
            onChange={(e) => {
              setDaysWindow(Number(e.target.value));
              paged.setPage(1);
            }}
            aria-label="Timeframe"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last 365 Days</option>
            <option value={0}>All Time</option>
          </select>

          <button
            type="button"
            onClick={() => void loadData(selectedStaffId, daysWindow)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : null}

      {/* Metrics Cards */}
      <Card className="grid grid-cols-2 divide-x divide-y divide-slate-200/80 overflow-hidden dark:divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
        <StatMetric
          label="Total attempts"
          value={stats.totalLogins}
          hint={daysWindow === 0 ? 'All time' : `Last ${daysWindow} days`}
        />
        <StatMetric
          label="Successful"
          value={stats.successLogins}
          hint="Authorized sessions"
        />
        <StatMetric
          label="Failed attempts"
          value={stats.failedLogins}
          hint="Wrong password / denied"
        />
        <StatMetric
          label="IP addresses"
          value={stats.uniqueIps}
          hint="Distinct networks"
        />
      </Card>

      {/* Filter / Search Controls */}
      <Card className="p-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 shrink-0">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as 'all' | 'staff' | 'customer');
                  paged.setPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Users (Admin, Staff & Customer)</option>
                <option value="staff">Admin & Staff Only</option>
                <option value="customer">Customers & Unknown Only</option>
              </select>
            </div>

            {/* Staff Filter Dropdown */}
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-2.5">
              <span className="text-xs font-medium text-slate-500 shrink-0">Staff:</span>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  paged.setPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Accounts</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role === 'ADMIN' ? 'Admin' : 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2.5">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  paged.setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({logins.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('success');
                  paged.setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Signed in
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('failed');
                  paged.setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          {/* Search box */}
          <label className="relative block shrink-0">
            <span className="sr-only">Search logins</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                paged.setPage(1);
              }}
              placeholder="Search email, name, IP, or browser…"
              aria-label="Search logins"
              className="h-8 w-full sm:w-64 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>
      </Card>

      {/* Logins Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto" aria-busy="true">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Account / Email</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Device & Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-slate-700" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-slate-200/70 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-40 rounded bg-slate-200/50 dark:bg-slate-800" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredLogins.length === 0 ? (
          <EmptyTableState
            title="No login records found"
            description={searchQuery ? 'Try adjusting your search or filters.' : 'No sign-in attempts recorded in this timeframe.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Account / Email</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Device & Browser</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Account / Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
                          aria-hidden
                        >
                          {userInitials(row.user?.name, row.user?.email || '')}
                        </div>
                        <div className="min-w-0">
                          {row.user?.id && (row.user.role === 'ADMIN' || row.user.role === 'STAFF') ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/admin/staff/view?id=${encodeURIComponent(row.user.id)}`)}
                              className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-slate-900 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400 truncate block max-w-44 text-xs"
                            >
                              {row.user?.name || row.user?.email || 'Unknown'}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate block max-w-44 text-xs">
                              {row.user?.name || row.user?.email || 'Unknown'}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-400 truncate max-w-40">
                              {row.user?.email}
                            </span>
                            <StatusIndicator
                              tone={roleBadgeTone(row.user?.role)}
                              label={roleBadgeLabel(row.user?.role, Boolean(row.user?.id), row.success)}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* When */}
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatWhen(row.at)}
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3">
                      <StatusIndicator
                        tone={row.success ? 'emerald' : 'red'}
                        label={row.method === 'register' ? 'Sign-up' : row.success ? 'Signed in' : 'Failed'}
                      />
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.ip}
                    </td>

                    {/* Browser / UA */}
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={row.userAgent}>
                      {simplifyUserAgent(row.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredLogins.length > 0 && (
          <PaginationFooter
            totalItems={paged.total}
            pageSize={paged.pageSize}
            currentPage={paged.page}
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        )}
      </Card>

      {/* Top IPs Summary */}
      {ips.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 flex items-center justify-between">
            <h2 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              IP Addresses ({daysWindow === 0 ? 'All Time' : `Last ${daysWindow} Days`})
            </h2>
            <span className="text-xs text-slate-400">{ips.length} unique networks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">IP Address</th>
                  <th className="px-4 py-2 font-medium">Attempts</th>
                  <th className="px-4 py-2 font-medium">Failed</th>
                  <th className="px-4 py-2 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {ips.slice(0, 10).map((row) => (
                  <tr key={row.ip} className="border-b border-slate-100 dark:border-slate-800/80">
                    <td className="px-4 py-2 font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                      {row.ip}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {row.count}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-xs">
                      {row.failed > 0 ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">{row.failed}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{formatWhen(row.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. CATEGORIZED ACTIVITY LOGS VIEW
// -------------------------------------------------------------
export function StaffActionsView({
  userId,
  category = 'all',
}: {
  userId: string | null;
  category?: ActivityCategory;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(userId || 'all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [daysWindow, setDaysWindow] = useState<number>(90);
  const [totalStoredLogs, setTotalStoredLogs] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState<ActivityStats>({
    totalLogins: 0,
    successLogins: 0,
    failedLogins: 0,
    uniqueIps: 0,
    totalActivity: 0,
    actions24h: 0,
    activeStaffCount: 0,
  });
  const [activity, setActivity] = useState<ActionItem[]>([]);

  const loadData = useCallback(
    async (uid?: string, cat: ActivityCategory = category, days = daysWindow) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (uid && uid !== 'all') params.set('userId', uid);
        if (cat && cat !== 'all') params.set('category', cat);
        params.set('days', String(days));

        const res = await fetch(`/api/admin/staff/activity?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Failed to load activity logs.');

        setActivity(data.activity || []);
        if (data.users) setStaffUsers(data.users);
        if (data.stats) setStats(data.stats);
        if (typeof data.totalStoredLogs === 'number') setTotalStoredLogs(data.totalStoredLogs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load activity logs.');
      } finally {
        setLoading(false);
      }
    },
    [category, daysWindow],
  );

  useEffect(() => {
    void loadData(selectedStaffId, category, daysWindow);
  }, [selectedStaffId, category, daysWindow, loadData]);

  // Distinct modules/action prefixes for filter
  const actionCategories = useMemo(() => {
    const cats = new Set<string>();
    activity.forEach((a) => {
      const prefix = a.action ? a.action.split('.')[0] : (a.entityType || 'other');
      if (prefix) cats.add(prefix);
    });
    return Array.from(cats);
  }, [activity]);

  const filteredActivity = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activity.filter((item) => {
      if (actionFilter !== 'all') {
        const prefix = item.action ? item.action.split('.')[0] : (item.entityType || 'other');
        if (prefix !== actionFilter) return false;
      }
      if (!q) return true;

      const userText = `${item.user?.name || ''} ${item.user?.email || ''}`.toLowerCase();
      const actionText = (item.action || '').toLowerCase();
      const summaryText = (item.summary || '').toLowerCase();
      const recordText = (item.entityId || '').toLowerCase();
      const ipText = (item.ip || '').toLowerCase();

      return (
        userText.includes(q) ||
        actionText.includes(q) ||
        summaryText.includes(q) ||
        recordText.includes(q) ||
        ipText.includes(q)
      );
    });
  }, [activity, actionFilter, searchQuery]);

  const paged = usePagination(filteredActivity, 20);
  const pageTitle = CATEGORY_TITLES[category] || CATEGORY_TITLES.all;

  if (category === 'logins') {
    return <StaffLoginsView userId={userId} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          {pageTitle}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={daysWindow}
            onChange={(e) => {
              setDaysWindow(Number(e.target.value));
              paged.setPage(1);
            }}
            aria-label="Retention timeframe"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last 365 Days</option>
            <option value={0}>All Time</option>
          </select>

          <button
            type="button"
            onClick={() => void loadData(selectedStaffId, category, daysWindow)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : null}

      {/* Metrics Cards */}
      <Card className="grid grid-cols-2 divide-x divide-y divide-slate-200/80 overflow-hidden dark:divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
        <StatMetric
          label="Matching events"
          value={filteredActivity.length}
          hint={daysWindow === 0 ? 'All time' : `Last ${daysWindow} days`}
        />
        <StatMetric
          label="Last 24 hours"
          value={stats.actions24h}
          hint="Recent operations"
        />
        <StatMetric
          label="Active actors"
          value={stats.activeStaffCount}
          hint="Users & system"
        />
        <StatMetric
          label="IP addresses"
          value={stats.uniqueIps}
          hint="Distinct networks"
        />
      </Card>

      {/* Filter / Search Controls */}
      <Card className="p-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Staff Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 shrink-0">Staff:</span>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  paged.setPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Staff & Admins</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role === 'ADMIN' ? 'Admin' : 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            {actionCategories.length > 0 && (
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-2.5">
                <span className="text-xs font-medium text-slate-500 shrink-0">Module:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    paged.setPage(1);
                  }}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-emerald-500 focus:outline-none capitalize"
                >
                  <option value="all">All Modules</option>
                  {actionCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search box */}
          <label className="relative block shrink-0">
            <span className="sr-only">Search activity</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                paged.setPage(1);
              }}
              placeholder="Search action, record, staff, or IP…"
              aria-label="Search activity"
              className="h-8 w-full sm:w-64 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto" aria-busy="true">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Staff Member</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Record ID</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-slate-700" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-48 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-16 rounded bg-slate-200/50 dark:bg-slate-800" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredActivity.length === 0 ? (
          <EmptyTableState
            title="No activity recorded"
            description={searchQuery ? 'Try adjusting your search or filters.' : 'No actions recorded in the past 90 days.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Staff Member</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Record ID</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Staff Person / System Actor */}
                    <td className="px-4 py-3">
                      {isAutomatedSystemAction(row.action) ? (
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 font-display text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0"
                            aria-hidden
                          >
                            SYS
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                              Auto-Verification Engine
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <StatusIndicator tone="emerald" label="System Auto" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
                            aria-hidden
                          >
                            {userInitials(row.user?.name, row.user?.email || '')}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => router.push(`/admin/staff/view?id=${encodeURIComponent(row.user.id)}`)}
                              className="cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-slate-900 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400 truncate block max-w-44 text-xs"
                            >
                              {row.user?.name || row.user?.email || 'Unknown'}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-400 truncate max-w-40">
                                {row.user?.email}
                              </span>
                              <StatusIndicator
                                tone={
                                  row.user?.role === 'ADMIN'
                                    ? 'emerald'
                                    : row.user?.role === 'CUSTOMER'
                                      ? 'amber'
                                      : 'blue'
                                }
                                label={
                                  row.user?.role === 'ADMIN'
                                    ? 'Admin'
                                    : row.user?.role === 'CUSTOMER'
                                      ? 'Customer'
                                      : 'Staff'
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* When */}
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatWhen(row.at)}
                    </td>

                    {/* Action Tag */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${actionBadgeStyle(row.action)}`}>
                        {row.action || row.entityType || 'action'}
                      </span>
                    </td>

                    {/* Summary */}
                    <td className="px-4 py-3 text-xs text-slate-900 dark:text-slate-100 max-w-md">
                      {row.summary}
                    </td>

                    {/* Record ID */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {row.entityId || '—'}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {row.ip || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredActivity.length > 0 && (
          <PaginationFooter
            totalItems={paged.total}
            pageSize={paged.pageSize}
            currentPage={paged.page}
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        )}
      </Card>
    </div>
  );
}

// -------------------------------------------------------------
// 3. SINGLE STAFF PROFILE / ACTIVITY VIEW (StaffFileView)
// -------------------------------------------------------------
export function StaffFileView({ userId }: { userId: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<'logins' | 'activity'>('logins');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [person, setPerson] = useState<StaffUser | null>(null);

  const [stats, setStats] = useState<ActivityStats>({
    totalLogins: 0,
    successLogins: 0,
    failedLogins: 0,
    uniqueIps: 0,
    totalActivity: 0,
    actions24h: 0,
    activeStaffCount: 0,
  });
  const [logins, setLogins] = useState<LoginItem[]>([]);
  const [activity, setActivity] = useState<ActionItem[]>([]);
  const [ips, setIps] = useState<IpRow[]>([]);
  const [query, setQuery] = useState('');

  const loadPerson = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/activity?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to load staff record.');

      setPerson(data.targetUser || null);
      setLogins(data.logins || []);
      setActivity(data.activity || []);
      setIps(data.ips || []);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff record.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadPerson();
  }, [loadPerson]);

  const q = query.trim().toLowerCase();
  const shownLogins = useMemo(
    () => (q ? logins.filter((r) => `${r.ip} ${r.userAgent}`.toLowerCase().includes(q)) : logins),
    [logins, q],
  );
  const shownActions = useMemo(
    () => (q ? activity.filter((r) => `${r.summary} ${r.entityId} ${r.ip}`.toLowerCase().includes(q)) : activity),
    [activity, q],
  );

  const loginPage = usePagination(shownLogins, 15);
  const actionPage = usePagination(shownActions, 15);

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-bold">Staff Member</h1>
        <p className="text-sm text-slate-500">No staff member specified.</p>
        <button
          type="button"
          onClick={() => router.push('/admin/staff')}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:border-emerald-600"
        >
          Back to Staff
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/staff')}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          aria-label="Back to staff"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>

        {person ? (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50 font-display text-sm font-semibold tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0"
              aria-hidden
            >
              {userInitials(person.name, person.email)}
            </div>
            <div className="min-w-0">
              <h1 className="font-display m-0 text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {person.name || person.email}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{person.email}</span>
                <StatusIndicator
                  tone={roleBadgeTone(person.role)}
                  label={person.role === 'ADMIN' ? 'Admin' : 'Staff'}
                />
              </div>
            </div>
          </div>
        ) : (
          <h1 className="font-display text-lg font-bold">Staff Details</h1>
        )}
      </div>

      {error ? (
        <p className="text-sm text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : null}

      {/* Metrics Cards */}
      <Card className="grid grid-cols-2 divide-x divide-y divide-slate-200/80 overflow-hidden dark:divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
        <StatMetric label="Sign-in attempts" value={stats.totalLogins} hint="Last 7 days" />
        <StatMetric label="Failed sign-ins" value={stats.failedLogins} hint="Last 7 days" />
        <StatMetric label="IP addresses" value={stats.uniqueIps} hint="Last 7 days" />
        <StatMetric label="Actions taken" value={stats.totalActivity} hint="Last 90 days" />
      </Card>

      {/* Segmented Tab Switcher + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SegmentedTabs
          options={[
            { value: 'logins', label: 'Logins', count: logins.length },
            { value: 'activity', label: 'Activity', count: activity.length },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next as 'logins' | 'activity');
            setQuery('');
          }}
        />
        <label className="relative block">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'logins' ? 'Search IP or browser…' : 'Search summary, record ID…'}
            aria-label="Search"
            className="h-8 w-full sm:w-56 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {/* Content based on selected tab */}
      {tab === 'logins' ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <h2 className="m-0 text-sm font-semibold">Sign-in History (Last 7 Days)</h2>
          </div>
          {loading ? (
            <div className="overflow-x-auto" aria-busy="true">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium">Device & Browser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-slate-200/70 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-40 rounded bg-slate-200/50 dark:bg-slate-800" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : shownLogins.length === 0 ? (
            <EmptyTableState title="No sign-in records" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium">Device & Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {loginPage.rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatWhen(row.at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusIndicator
                          tone={row.success ? 'emerald' : 'red'}
                          label={row.success ? 'Signed in' : 'Failed'}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.ip}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={row.userAgent}>
                        {simplifyUserAgent(row.userAgent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shownLogins.length > 0 && (
            <PaginationFooter
              totalItems={loginPage.total}
              pageSize={loginPage.pageSize}
              currentPage={loginPage.page}
              onPageChange={loginPage.setPage}
              onPageSizeChange={loginPage.setPageSize}
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <h2 className="m-0 text-sm font-semibold">Activity Audit Trail (Last 90 Days)</h2>
          </div>
          {loading ? (
            <div className="overflow-x-auto" aria-busy="true">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Record ID</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-48 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-16 rounded bg-slate-200/50 dark:bg-slate-800" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-24 rounded bg-slate-200/60 dark:bg-slate-800" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : shownActions.length === 0 ? (
            <EmptyTableState title="No action records" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Record ID</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {actionPage.rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatWhen(row.at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {row.action || row.entityType || 'action'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-900 dark:text-slate-100 max-w-md">
                        {row.summary}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {row.entityId || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {row.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shownActions.length > 0 && (
            <PaginationFooter
              totalItems={actionPage.total}
              pageSize={actionPage.pageSize}
              currentPage={actionPage.page}
              onPageChange={actionPage.setPage}
              onPageSizeChange={actionPage.setPageSize}
            />
          )}
        </Card>
      )}
    </div>
  );
}
