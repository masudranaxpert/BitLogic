'use client';

import React, { useEffect, useState } from 'react';
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
import { PaymentSmsLogsTab, type MfsSmsLog } from './PaymentSmsLogsTab';

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
  };
}

export default function PaymentMethodsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'methods' | 'devices' | 'logs' | null;

  const [activeTab, setActiveTab] = useState<'methods' | 'devices' | 'logs'>(
    tabParam && ['methods', 'devices', 'logs'].includes(tabParam) ? tabParam : 'methods'
  );

  const [saved, setSaved] = useState<PaymentConfigDraft | null>(null);
  const [draft, setDraft] = useState<PaymentConfigDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Device management state
  const [devices, setDevices] = useState<MfsDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Live SMS logs state with server-side pagination
  const [smsLogs, setSmsLogs] = useState<MfsSmsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);

  const handleTabChange = (tab: 'methods' | 'devices' | 'logs') => {
    setActiveTab(tab);
    router.replace(`/admin/payments/methods?tab=${tab}`, { scroll: false });
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
      // silently handle
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/payments/sms-logs?page=${page}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setSmsLogs(data.logs || []);
        if (data.pagination) {
          setLogPage(data.pagination.page);
          setLogTotalPages(data.pagination.totalPages);
          setLogTotalCount(data.pagination.total);
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadDevices();
    loadLogs(1);
  }, []);

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
        method: 'PATCH',
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
            Payment Methods
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            MFS numbers, companion Android sync devices, and live incoming logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'methods' && (
            <button
              onClick={saveSettings}
              disabled={busy || !dirty}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md shadow-sm transition ${
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sync APK
          </a>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to save changes. Please check permissions or network connection.</span>
        </div>
      )}

      {/* Tabs Navigation (Consistent Emerald Theme) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => handleTabChange('methods')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'methods'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Numbers
        </button>

        <button
          onClick={() => {
            handleTabChange('devices');
            loadDevices();
          }}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
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
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          SMS Logs
          {logTotalCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {logTotalCount}
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
        />
      )}

      {activeTab === 'logs' && (
        <PaymentSmsLogsTab
          logs={smsLogs}
          loading={loadingLogs}
          onRefresh={() => loadLogs(logPage)}
          page={logPage}
          totalPages={logTotalPages}
          totalCount={logTotalCount}
          onPageChange={(p) => loadLogs(p)}
        />
      )}
    </div>
  );
}
