'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
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
  Key,
  Trash2,
  BatteryCharging,
  Battery,
  ShieldCheck,
  Copy,
  Plus,
  Terminal,
  Activity,
  Radio,
  ExternalLink,
} from 'lucide-react';

type PaymentConfigDraft = Pick<
  StoreSettings,
  | 'bkashEnabled'
  | 'bkashNumber'
  | 'bkashType'
  | 'bkashInstructions'
  | 'nagadEnabled'
  | 'nagadNumber'
  | 'nagadType'
  | 'nagadInstructions'
  | 'rocketEnabled'
  | 'rocketNumber'
  | 'rocketType'
  | 'rocketInstructions'
>;

interface MfsDevice {
  id: string;
  deviceName: string;
  phoneNumber: string;
  gateway: string;
  simSlot: string;
  apiKey: string;
  status: string;
  batteryPct: number | null;
  isCharging: boolean | null;
  lastSeenAt: string | null;
  createdAt: string;
  _count?: { smsLogs: number };
}

interface MfsSmsLog {
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

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

export default function PaymentMethodsView() {
  const [activeTab, setActiveTab] = useState<'methods' | 'devices' | 'logs'>('methods');
  const [saved, setSaved] = useState<PaymentConfigDraft | null>(null);
  const [draft, setDraft] = useState<PaymentConfigDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Device management state
  const [devices, setDevices] = useState<MfsDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePhone, setNewDevicePhone] = useState('');
  const [newDeviceGateway, setNewDeviceGateway] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live SMS logs state
  const [smsLogs, setSmsLogs] = useState<MfsSmsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/payments/sms-logs?limit=40');
      const data = await res.json();
      if (data.success) {
        setSmsLogs(data.logs || []);
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
    loadLogs();
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

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim() || !newDevicePhone.trim()) return;
    try {
      const res = await fetch('/api/admin/payments/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: newDeviceName,
          phoneNumber: newDevicePhone,
          gateway: newDeviceGateway,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDeviceName('');
        setNewDevicePhone('');
        setIsAddingDevice(false);
        loadDevices();
      } else {
        alert(data.message || 'Failed to create device');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device? It will stop syncing SMS.')) return;
    try {
      const res = await fetch(`/api/admin/payments/devices?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadDevices();
      }
    } catch {
      alert('Failed to delete device');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
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
      {/* Header with Title and Global Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Gateway & Sync Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure mobile financial services, monitor Android SMS Sync companion devices, and inspect live ingestion.
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sync APK (v1.0)
          </a>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to save changes. Please check permissions or network connection.</span>
        </div>
      )}

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('methods')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'methods'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Numbers & Methods
        </button>

        <button
          onClick={() => {
            setActiveTab('devices');
            loadDevices();
          }}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'devices'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Android Sync Devices
          {devices.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {devices.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('logs');
            loadLogs();
          }}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Ingestion Logs
          {smsLogs.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {smsLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Payment Numbers & Methods */}
      {activeTab === 'methods' && (
        <div className="space-y-6">
          {/* Autonomous Sync Quick Info Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-emerald-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-600 text-white tracking-wider">
                  Automated Autonomous Verification
                </span>
                <span className="text-xs text-slate-500 font-medium">4 Detection Modes Active</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Customers pay via the <strong>/payment/[id]</strong> gateway screen. When your phone receives an SMS from <strong>bKash (16216)</strong> or <strong>Nagad (16167)</strong>, the Blumart Sync APK automatically verifies and completes the order in real-time.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('devices')}
              className="shrink-0 px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              Manage Sync Devices ({devices.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* bKash Configuration Card */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-50 p-1 flex items-center justify-center border border-pink-100">
                      <img src="/payments/bkash-icon.svg" alt="bKash" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">bKash</h3>
                      <p className="text-[11px] text-slate-500">Auto-sync with 16216</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.bkashEnabled}
                      onChange={(e) => setField('bkashEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={draft.bkashNumber}
                      onChange={(e) => setField('bkashNumber', e.target.value)}
                      placeholder="017XXXXXXXX"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Type
                    </label>
                    <select
                      value={draft.bkashType}
                      onChange={(e) => setField('bkashType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={draft.bkashInstructions}
                      onChange={(e) => setField('bkashInstructions', e.target.value)}
                      placeholder="Send Money to our bKash number..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                Visible on checkout when active.
              </div>
            </Card>

            {/* Nagad Configuration Card */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 p-1 flex items-center justify-center border border-orange-100">
                      <img src="/payments/nagad.svg" alt="Nagad" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nagad</h3>
                      <p className="text-[11px] text-slate-500">Auto-sync with 16167</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.nagadEnabled}
                      onChange={(e) => setField('nagadEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={draft.nagadNumber}
                      onChange={(e) => setField('nagadNumber', e.target.value)}
                      placeholder="018XXXXXXXX"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Type
                    </label>
                    <select
                      value={draft.nagadType}
                      onChange={(e) => setField('nagadType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={draft.nagadInstructions}
                      onChange={(e) => setField('nagadInstructions', e.target.value)}
                      placeholder="Send Money to our Nagad number..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                Visible on checkout when active.
              </div>
            </Card>

            {/* Rocket Configuration Card */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 p-1 flex items-center justify-center border border-purple-100">
                      <img src="/payments/rocket.png" alt="Rocket" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rocket</h3>
                      <p className="text-[11px] text-slate-500">Auto-sync with 16221</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.rocketEnabled}
                      onChange={(e) => setField('rocketEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Number (with check digit)
                    </label>
                    <input
                      type="text"
                      value={draft.rocketNumber}
                      onChange={(e) => setField('rocketNumber', e.target.value)}
                      placeholder="01XXXXXXXXX-X"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Type
                    </label>
                    <select
                      value={draft.rocketType}
                      onChange={(e) => setField('rocketType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={draft.rocketInstructions}
                      onChange={(e) => setField('rocketInstructions', e.target.value)}
                      placeholder="Send Money to our Rocket number..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                Visible on checkout when active.
              </div>
            </Card>
          </div>

          {/* Customer Checkout Preview Box */}
          <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Storefront Customer View Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When customers check out, they are redirected to the branded payment gateway:
            </p>

            <div className="p-4 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-md space-y-3">
              <div className="flex gap-2">
                {draft.bkashEnabled && (
                  <div className="flex-1 p-2 rounded border border-slate-900 bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-white p-0.5 inline-flex items-center justify-center shrink-0">
                      <img src="/payments/bkash-icon.svg" alt="bKash" className="w-full h-full object-contain" />
                    </span>
                    <span>bKash ({draft.bkashType})</span>
                  </div>
                )}
                {draft.nagadEnabled && (
                  <div className="flex-1 p-2 rounded border border-slate-200 bg-white text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-white p-0.5 inline-flex items-center justify-center shrink-0">
                      <img src="/payments/nagad.svg" alt="Nagad" className="w-full h-full object-contain" />
                    </span>
                    <span>Nagad ({draft.nagadType})</span>
                  </div>
                )}
                {draft.rocketEnabled && (
                  <div className="flex-1 p-2 rounded border border-slate-200 bg-white text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-white p-0.5 inline-flex items-center justify-center shrink-0">
                      <img src="/payments/rocket.png" alt="Rocket" className="w-full h-full object-contain" />
                    </span>
                    <span>Rocket ({draft.rocketType})</span>
                  </div>
                )}
              </div>

              {draft.bkashEnabled && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200/70">
                  Send <strong className="text-slate-900 dark:text-white">BDT Amount</strong> to{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{draft.bkashNumber || '(not set)'}</span>{' '}
                  ({draft.bkashType}). Auto-verification triggers on incoming SMS.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Android Sync Devices */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Quick Setup Walkthrough Banner */}
          <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Blumart SMS Sync Companion App
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Native Android background service to sync incoming MFS SMS automatically.
                  </p>
                </div>
              </div>
              <a
                href="/blumart-sync.apk"
                download="blumart-sync.apk"
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download APK (5.38 MB)
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-indigo-600 block mb-1">1. Install APK</span>
                Install on your SIM phone (Samsung, Honor, Xiaomi, etc.) and tap &quot;Whitelist Battery&quot; inside the app.
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-indigo-600 block mb-1">2. Add Device &amp; Copy Key</span>
                Click &quot;Add New Device&quot; below, fill phone number, and copy the generated <strong>API Key</strong>.
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-indigo-600 block mb-1">3. Start Background Sync</span>
                Enter Server URL + Device Key in the app and tap &quot;Start Sync Service&quot;. Done!
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Connected Sync Devices ({devices.length})
            </h2>

            <button
              onClick={() => setIsAddingDevice(!isAddingDevice)}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAddingDevice ? 'Cancel' : 'Add New Device'}
            </button>
          </div>

          {/* Add Device Form */}
          {isAddingDevice && (
            <Card className="p-5 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/10">
              <form onSubmit={handleCreateDevice} className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Register New Android Companion Phone
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Device Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Samsung M32 (bKash SIM)"
                      value={newDeviceName}
                      onChange={(e) => setNewDeviceName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01700123456"
                      value={newDevicePhone}
                      onChange={(e) => setNewDevicePhone(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gateway Focus
                    </label>
                    <select
                      value={newDeviceGateway}
                      onChange={(e) => setNewDeviceGateway(e.target.value)}
                      className={inputClass}
                    >
                      <option value="all">All Gateways (bKash + Nagad + Rocket)</option>
                      <option value="bkash">bKash Only</option>
                      <option value="nagad">Nagad Only</option>
                      <option value="rocket">Rocket Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingDevice(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                  >
                    Generate Device Key &amp; Save
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Devices List Table */}
          {loadingDevices ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading devices...</div>
          ) : devices.length === 0 ? (
            <Card className="p-8 text-center space-y-3 border-dashed border-2 border-slate-200 dark:border-slate-800">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No sync devices registered yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click &quot;Add New Device&quot; to generate an API key, install the APK on your phone, and start autonomous payment matching.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {devices.map((dev) => {
                const isOnline =
                  dev.lastSeenAt &&
                  new Date().getTime() - new Date(dev.lastSeenAt).getTime() < 3 * 60 * 1000;

                return (
                  <Card
                    key={dev.id}
                    className="p-4 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {dev.deviceName}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isOnline
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {isOnline ? 'Active Online' : 'Offline / Idle'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Phone: <strong>{dev.phoneNumber}</strong></span>
                          <span>Gateway: <strong className="uppercase">{dev.gateway}</strong></span>
                          <span>Synced: <strong>{dev._count?.smsLogs ?? 0} SMS</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Battery Status */}
                      {dev.batteryPct !== null && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {dev.isCharging ? (
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>{dev.batteryPct}%</span>
                        </div>
                      )}

                      {/* API Key Box */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md">
                        <Key className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                          {dev.apiKey}
                        </span>
                        <button
                          onClick={() => copyToClipboard(dev.apiKey, dev.id)}
                          className="p-1 hover:text-emerald-600 text-slate-400 transition"
                          title="Copy API Key"
                        >
                          {copiedKey === dev.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteDevice(dev.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition"
                        title="Delete Device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Live Ingestion Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-600" />
                Live MFS SMS Ingestion Feed
              </h2>
              <p className="text-xs text-slate-500">
                Real-time log of parsed mobile transaction SMS received from sync phones.
              </p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Refresh Feed
            </button>
          </div>

          {loadingLogs ? (
            <div className="p-8 text-center text-xs text-slate-500">Fetching latest logs...</div>
          ) : smsLogs.length === 0 ? (
            <Card className="p-8 text-center space-y-2 border-dashed border-2 border-slate-200 dark:border-slate-800">
              <Radio className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No SMS received yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once the Blumart Sync APK is running on your phone, incoming bKash/Nagad/Rocket SMS will instantly appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {smsLogs.map((log) => (
                <Card
                  key={log.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 space-y-2.5 font-mono text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {log.gateway}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        From: <strong className="text-slate-800 dark:text-slate-200">{log.senderAddress}</strong>
                      </span>
                      {log.device && (
                        <span className="text-slate-500 text-[11px]">
                          Device: {log.device.deviceName}
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
                      <span className="text-slate-400 block">Amount:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{log.amount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">TrxID:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.trxId || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Matched Order:</span>
                      {log.matchedOrderId ? (
                        <a
                          href={`/admin/orders/${log.matchedOrderId}`}
                          className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          #{log.matchedOrderId.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mode:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {log.verificationMode || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 break-words">
                    {log.rawSms}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
