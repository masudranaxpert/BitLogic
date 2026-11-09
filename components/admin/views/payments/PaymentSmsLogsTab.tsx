'use client';

import React from 'react';
import { Card } from '@/components/admin/ui/primitives';
import { Terminal, RefreshCw, Radio, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

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
  status: string;
  matchedOrderId?: string;
  verificationMode?: string;
  createdAt: string;
  device?: { deviceName: string; phoneNumber: string };
}

interface LogsTabProps {
  logs: MfsSmsLog[];
  loading: boolean;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function PaymentSmsLogsTab({
  logs,
  loading,
  onRefresh,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: LogsTabProps) {
  return (
    <div className="space-y-4">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Incoming SMS Logs ({totalCount})
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Fetching logs...</div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center space-y-2 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Radio className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No SMS received yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Received SMS will automatically appear here once the sync APK is active.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card
              key={log.id}
              className="p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                    {log.gateway}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Sender: <strong className="text-slate-800 dark:text-slate-200">{log.senderAddress}</strong>
                  </span>
                  {log.device && (
                    <span className="text-slate-400 text-[11px]">
                      via {log.device.deviceName}
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
                    {log.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Amount</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{log.amount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">TrxID</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {log.trxId || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Order</span>
                  {log.matchedOrderId ? (
                    <a
                      href={`/admin/orders`}
                      className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      #{log.matchedOrderId.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block">Mode</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    {log.verificationMode || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono break-words">
                {log.rawSms}
              </div>
            </Card>
          ))}

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
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
