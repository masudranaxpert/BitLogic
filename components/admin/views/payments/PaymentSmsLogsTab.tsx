'use client';

import React, { useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
import {
  RefreshCw,
  Radio,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
} from 'lucide-react';

export interface MfsSmsLog {
  id: string;
  deviceId: string;
  gateway: string;
  senderAddress: string;
  senderNumber?: string;
  amount: number;
  balance?: number;
  trxId?: string;
  reference?: string;
  rawSms: string;
  receivedAt?: string;
  status: string;
  matchedOrderId?: string;
  verificationMode?: string;
  createdAt: string;
  device?: { deviceName: string; phoneNumber: string };
}

export interface SmsLogCounts {
  all: number;
  matched: number;
  unmatched: number;
  parse_failed: number;
}

interface LogsTabProps {
  logs: MfsSmsLog[];
  counts?: SmsLogCounts;
  loading: boolean;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  gatewayFilter: string;
  onGatewayFilterChange: (g: string) => void;
}

export function PaymentSmsLogsTab({
  logs,
  counts,
  loading,
  onRefresh,
  page,
  totalPages,
  totalCount,
  onPageChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  gatewayFilter,
  onGatewayFilterChange,
}: LogsTabProps) {
  const [linkingSmsId, setLinkingSmsId] = useState<string | null>(null);
  const [targetOrderId, setTargetOrderId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<{
    smsId: string;
    ok: boolean;
    msg: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleManualLink = async (smsLogId: string) => {
    const cleanOrd = targetOrderId.trim();
    if (!cleanOrd || linkLoading) return;
    setLinkLoading(true);
    setLinkFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/sms-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsLogId, orderId: cleanOrd }),
      });
      const data = await res.json();
      if (data.success) {
        setLinkFeedback({ smsId: smsLogId, ok: true, msg: data.message || 'Linked & Verified!' });
        setLinkingSmsId(null);
        setTargetOrderId('');
        onRefresh();
      } else {
        setLinkFeedback({ smsId: smsLogId, ok: false, msg: data.message || 'Failed to match order' });
      }
    } catch {
      setLinkFeedback({ smsId: smsLogId, ok: false, msg: 'Network error while linking order' });
    } finally {
      setLinkLoading(false);
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All SMS', count: counts?.all ?? totalCount },
    { id: 'matched', label: 'Matched', count: counts?.matched },
    { id: 'unmatched', label: 'Unmatched', count: counts?.unmatched },
    { id: 'parse_failed', label: 'Raw / Unparsed', count: counts?.parse_failed },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <Card className="p-3.5 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search TrxID, sender number, Order ID, reference, or raw SMS text..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Gateway Filter + Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={gatewayFilter}
              onChange={(e) => onGatewayFilterChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="all">All Gateways</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="upay">Upay</option>
            </select>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-emerald-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Fetching SMS logs...</div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center space-y-2 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Radio className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No matching SMS logs found
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || gatewayFilter !== 'all'
              ? 'Try clearing your search query or changing the active filters.'
              : 'Every incoming MFS SMS (including unparsed raw messages) from your Android Sync APK will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isLinking = linkingSmsId === log.id;
            const feedback = linkFeedback?.smsId === log.id ? linkFeedback : null;

            return (
              <Card
                key={log.id}
                className="p-3.5 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                      {log.gateway}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      From:{' '}
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {log.senderNumber || log.senderAddress}
                      </strong>
                    </span>
                    {log.senderNumber && log.senderAddress && log.senderNumber !== log.senderAddress && (
                      <span className="text-slate-400 text-[10px]">
                        ({log.senderAddress})
                      </span>
                    )}
                    {log.device && (
                      <span className="text-slate-400 text-[11px]">
                        · Device: <strong className="text-slate-600 dark:text-slate-300">{log.device.deviceName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'matched'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : log.status === 'unmatched'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {log.status === 'parse_failed' ? 'RAW / UNPARSED' : log.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.receivedAt || log.createdAt).toLocaleString('en-BD', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Parsed Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Amount</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(log.amount) > 0 ? `৳${log.amount}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">TrxID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                        {log.trxId || '—'}
                      </span>
                      {log.trxId && !log.trxId.startsWith('RAW-') && (
                        <button
                          type="button"
                          onClick={() => handleCopy(log.trxId!, `trx-${log.id}`)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy TrxID"
                        >
                          {copiedId === `trx-${log.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sender Mobile</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {log.senderNumber || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reference</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {log.reference || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">New Balance</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {log.balance !== null && log.balance !== undefined ? `৳${log.balance}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Matched Order</span>
                    {log.matchedOrderId ? (
                      <a
                        href={`/admin/orders?search=${encodeURIComponent(log.matchedOrderId)}`}
                        className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        {log.matchedOrderId}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">
                        {log.verificationMode || 'Unlinked'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Raw SMS Content + Manual Link Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono break-words flex-1">
                    {log.rawSms}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(log.rawSms, `raw-${log.id}`)}
                      className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `raw-${log.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy SMS
                        </>
                      )}
                    </button>

                    {log.status !== 'matched' && (
                      <button
                        type="button"
                        onClick={() => {
                          setLinkingSmsId(isLinking ? null : log.id);
                          setTargetOrderId(log.reference?.startsWith('ORD-') ? log.reference : '');
                          setLinkFeedback(null);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 className="w-3 h-3" />
                        Link to Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Manual Order Link Form */}
                {isLinking && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={targetOrderId}
                      onChange={(e) => setTargetOrderId(e.target.value)}
                      placeholder="Enter Order ID (e.g. ORD-123456)"
                      className="px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <button
                      type="button"
                      disabled={linkLoading || !targetOrderId.trim()}
                      onClick={() => handleManualLink(log.id)}
                      className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {linkLoading ? 'Verifying...' : 'Confirm & Verify Order'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkingSmsId(null)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {feedback && (
                  <div
                    className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                      feedback.ok
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {feedback.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{feedback.msg}</span>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-800 dark:text-slate-200">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
