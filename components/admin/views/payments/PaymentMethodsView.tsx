'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '@/lib/store-settings';
import {
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Download,
  Activity,
} from 'lucide-react';
import {
  PaymentMethodConfigTab,
  type PaymentConfigDraft,
} from './PaymentMethodConfigTab';
import { PaymentDevicesTab, type MfsDevice } from './PaymentDevicesTab';
import {
  PaymentSmsLogsTab,
  type MfsSmsLog,
  type SmsLogCounts,
} from './PaymentSmsLogsTab';

function pick(s: StoreSettings): PaymentConfigDraft {
  return {
    bkashEnabled: s.bkashEnabled ?? DEFAULT_STORE_SETTINGS.bkashEnabled,
    bkashNumber: s.bkashNumber ?? DEFAULT_STORE_SETTINGS.bkashNumber,
    bkashType: s.bkashType ?? DEFAULT_STORE_SETTINGS.bkashType,
    bkashInstructions: s.bkashInstructions ?? DEFAULT_STORE_SETTINGS.bkashInstructions,
    nagadEnabled: s.nagadEnabled ?? DEFAULT_STORE_SETTINGS.nagadEnabled,
    nagadNumber: s.nagadNumber ?? DEFAULT_STORE_SETTINGS.nagadNumber,
    nagadType: s.nagadType ?? DEFAULT_STORE_SETTINGS.nagadType,
    nagadInstructions: s.nagadInstructions ?? DEFAULT_STORE_SETTINGS.nagadInstructions,
    rocketEnabled: s.rocketEnabled ?? DEFAULT_STORE_SETTINGS.rocketEnabled,
    rocketNumber: s.rocketNumber ?? DEFAULT_STORE_SETTINGS.rocketNumber,
    rocketType: s.rocketType ?? DEFAULT_STORE_SETTINGS.rocketType,
    rocketInstructions: s.rocketInstructions ?? DEFAULT_STORE_SETTINGS.rocketInstructions,
    verifyModeTrxId: s.verifyModeTrxId ?? DEFAULT_STORE_SETTINGS.verifyModeTrxId,
    verifyModeSenderFifo: s.verifyModeSenderFifo ?? DEFAULT_STORE_SETTINGS.verifyModeSenderFifo,
    verifyModeReference: s.verifyModeReference ?? DEFAULT_STORE_SETTINGS.verifyModeReference,
  };
}

export default function PaymentMethodsView({
  initialTab,
}: {
  initialTab?: 'methods' | 'devices' | 'logs';
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'methods' | 'devices' | 'logs' | null;

  const [activeTab, setActiveTab] = useState<'methods' | 'devices' | 'logs'>(
    initialTab || (tabParam && ['methods', 'devices', 'logs'].includes(tabParam) ? tabParam : 'methods'),
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (tabParam && ['methods', 'devices', 'logs'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [initialTab, tabParam]);

  const [saved, setSaved] = useState<PaymentConfigDraft | null>(null);
  const [draft, setDraft] = useState<PaymentConfigDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    ok: boolean;
    message: string;
    verifiedCount: number;
  } | null>(null);

  const [devices, setDevices] = useState<MfsDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [smsLogs, setSmsLogs] = useState<MfsSmsLog[]>([]);
  const [logCounts, setLogCounts] = useState<SmsLogCounts | undefined>(undefined);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');

  const handleTabChange = (tab: 'methods' | 'devices' | 'logs') => {
    setActiveTab(tab);
    const path =
      tab === 'devices'
        ? '/admin/payments/devices'
        : tab === 'logs'
          ? '/admin/payments/sms-logs'
          : '/admin/payments/methods';
    router.replace(path, { scroll: false });
  };

  const loadSettings = () => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) {
          const merged = pick({ ...DEFAULT_STORE_SETTINGS, ...d.settings });
          setSaved(merged);
          setDraft(merged);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch('/api/admin/payments/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadLogs = useCallback(
    async (page = 1, search = searchQuery, st = statusFilter, gw = gatewayFilter) => {
      setLoadingLogs(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
          status: st,
          gateway: gw,
        });
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/admin/payments/sms-logs?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setSmsLogs(data.logs || []);
          if (data.counts) setLogCounts(data.counts);
          if (data.pagination) {
            setLogPage(data.pagination.page);
            setLogTotalPages(data.pagination.totalPages);
            setLogTotalCount(data.pagination.total);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingLogs(false);
      }
    },
    [searchQuery, statusFilter, gatewayFilter],
  );

  useEffect(() => {
    loadSettings();
    loadDevices();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs(1, searchQuery, statusFilter, gatewayFilter);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, gatewayFilter, loadLogs]);

  const dirty = Boolean(
    saved && draft && JSON.stringify(saved) !== JSON.stringify(draft),
  );

  const setField = <K extends keyof PaymentConfigDraft>(
    k: K,
    v: PaymentConfigDraft[K],
  ) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  };

  const saveSettings = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setStatus('idle');
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (r.ok) {
        setSaved(draft);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  const runManualSync = async () => {
    if (reconciling) return;
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setReconcileResult({
          ok: true,
          message: data.message,
          verifiedCount: data.verifiedCount || 0,
        });
        void loadDevices();
        void loadLogs(logPage);
        window.dispatchEvent(new Event('admin:reload-workspace'));
      } else {
        setReconcileResult({
          ok: false,
          message: data.message || 'Manual sync failed',
          verifiedCount: 0,
        });
      }
    } catch {
      setReconcileResult({
        ok: false,
        message: 'Network error while running manual sync',
        verifiedCount: 0,
      });
    } finally {
      setReconciling(false);
    }
  };

  if (!draft) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading payment configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Methods &amp; Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure MFS receiving numbers, 3-mode auto-verification rules, Android sync devices, and raw SMS logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runManualSync}
            disabled={reconciling}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-emerald-600/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 transition cursor-pointer"
            title="Re-scan unmatched SMS logs from the last 72h and auto-verify any matching pending orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Syncing & Matching...' : 'Manual Sync Now'}
          </button>

          {activeTab === 'methods' && (
            <button
              onClick={saveSettings}
              disabled={busy || !dirty}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md shadow-sm transition cursor-pointer ${
                dirty
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
              }`}
            >
              {busy ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : status === 'saved' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {status === 'saved' ? 'Saved' : 'Save Changes'}
            </button>
          )}

          <a
            href="/blumart-sync.apk"
            download="blumart-sync.apk"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-sm transition no-underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sync APK
          </a>
        </div>
      </div>

      {reconcileResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            reconcileResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {reconcileResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{reconcileResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setReconcileResult(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to save changes. Please check permissions or network connection.</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => handleTabChange('methods')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === 'methods'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Methods &amp; Verification Modes
        </button>

        <button
          onClick={() => {
            handleTabChange('devices');
            loadDevices();
          }}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === 'devices'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Sync Devices
          {devices.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {devices.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            handleTabChange('logs');
            loadLogs(1);
          }}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          SMS Logs
          {(logCounts?.all ?? logTotalCount) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {logCounts?.all ?? logTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'methods' && (
        <PaymentMethodConfigTab
          draft={draft}
          setField={setField}
          onNavigateToDevices={() => handleTabChange('devices')}
          devicesCount={devices.length}
        />
      )}

      {activeTab === 'devices' && (
        <PaymentDevicesTab
          devices={devices}
          loading={loadingDevices}
          onRefresh={loadDevices}
          onManualSync={runManualSync}
          reconciling={reconciling}
          configuredNumbers={{
            bkash: draft.bkashNumber,
            nagad: draft.nagadNumber,
            rocket: draft.rocketNumber,
          }}
        />
      )}

      {activeTab === 'logs' && (
        <PaymentSmsLogsTab
          logs={smsLogs}
          counts={logCounts}
          loading={loadingLogs}
          onRefresh={() => loadLogs(logPage)}
          page={logPage}
          totalPages={logTotalPages}
          totalCount={logTotalCount}
          onPageChange={(p) => loadLogs(p)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          gatewayFilter={gatewayFilter}
          onGatewayFilterChange={setGatewayFilter}
        />
      )}
    </div>
  );
}
