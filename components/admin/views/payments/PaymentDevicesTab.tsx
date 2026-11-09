'use client';

import React, { useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
import {
  Smartphone,
  Download,
  Key,
  Trash2,
  BatteryCharging,
  Battery,
  Copy,
  Plus,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Wifi,
  Zap,
} from 'lucide-react';

export interface MfsDevice {
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

interface DevicesTabProps {
  devices: MfsDevice[];
  loading: boolean;
  onRefresh: () => void;
  onManualSync?: () => void;
  reconciling?: boolean;
  configuredNumbers?: {
    bkash: string;
    nagad: string;
    rocket: string;
  };
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never connected';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Just now (< 1m ago)';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return new Date(iso).toLocaleString('en-BD', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

export function PaymentDevicesTab({
  devices,
  loading,
  onRefresh,
  onManualSync,
  reconciling,
  configuredNumbers,
}: DevicesTabProps) {
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceGateway, setNewDeviceGateway] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPlayProtectGuide, setShowPlayProtectGuide] = useState(false);

  const getAutoLinkedNumber = (gw: string) => {
    if (!configuredNumbers) return 'Auto-linked SIM';
    if (gw === 'bkash') return configuredNumbers.bkash || 'bKash SIM';
    if (gw === 'nagad') return configuredNumbers.nagad || 'Nagad SIM';
    if (gw === 'rocket') return configuredNumbers.rocket || 'Rocket SIM';
    return [configuredNumbers.bkash, configuredNumbers.nagad].filter(Boolean).join(' / ') || 'All Active SIMs';
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    try {
      const res = await fetch('/api/admin/payments/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: newDeviceName,
          phoneNumber: getAutoLinkedNumber(newDeviceGateway),
          gateway: newDeviceGateway,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDeviceName('');
        setIsAddingDevice(false);
        onRefresh();
      } else {
        alert(data.message || 'Failed to create device');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Remove this sync device?')) return;
    try {
      const res = await fetch(`/api/admin/payments/devices?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
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

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Blumart SMS Sync Companion App
            </h3>
            <p className="text-[11px] text-slate-500">
              Install on the Android phone where your MFS SIM is inserted to forward payment SMS automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPlayProtectGuide(!showPlayProtectGuide)}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Install Help
          </button>

          <a
            href="/blumart-sync.apk"
            download="blumart-sync.apk"
            className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition no-underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download APK
          </a>
        </div>
      </div>

      {/* Play Protect Help */}
      {showPlayProtectGuide && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>How to bypass Google Play Protect during installation:</span>
          </div>
          <p className="text-[11px] leading-relaxed m-0">
            1. Open the downloaded APK and tap <strong>&quot;More details&quot;</strong> on the Play Protect prompt, then select <strong>&quot;Install anyway&quot;</strong>.<br />
            2. Inside the app, tap <strong>Allow Battery Whitelist</strong> so Android does not stop background syncing when the screen is locked.
          </p>
        </div>
      )}

      {/* Sync Schedule & Interval Telemetry Card */}
      <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Sync Frequency &amp; Verification Schedule
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              How often the Android Sync App and server check for incoming payments and match pending orders.
            </p>
          </div>
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={reconciling}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              {reconciling ? 'Matching Pending Orders...' : 'Manual Sync & Match Now'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Real-Time SMS Push</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 m-0">
              <strong>Instant (&lt; 1 sec)</strong> whenever a new bKash, Nagad, Rocket, or Upay SMS arrives on the phone.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Wifi className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Offline Recovery</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 m-0">
              <strong>Instant on Wi-Fi / Data reconnect</strong> — flushes queued offline SMS and sweeps 24h inbox automatically.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Background Sweep</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 m-0">
              <strong>Every 15 minutes</strong> via Android WorkManager + Foreground Service heartbeat &amp; 24h inbox check.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
              <span>4. Manual Re-Sync</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 m-0">
              <strong>On-Demand</strong> — click &quot;Manual Sync Now&quot; anytime to re-match all 72h unmatched SMS against pending orders.
            </p>
          </div>
        </div>
      </Card>

      {/* Action Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Registered Phones ({devices.length})
        </h2>

        <button
          type="button"
          onClick={() => setIsAddingDevice(!isAddingDevice)}
          className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAddingDevice ? 'Cancel' : 'Register Phone'}
        </button>
      </div>

      {/* Add Device Form (No Duplicate Phone Number Input!) */}
      {isAddingDevice && (
        <Card className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/15 dark:bg-emerald-950/10">
          <form onSubmit={handleCreateDevice} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Generate Device Sync Key
              </h4>
              <span className="text-[11px] text-slate-500">
                Linked SIM: <strong className="text-slate-800 dark:text-slate-200 font-mono">{getAutoLinkedNumber(newDeviceGateway)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Model / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samsung Galaxy A54 (Office Phone)"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SIM Gateway Assignment
                </label>
                <select
                  value={newDeviceGateway}
                  onChange={(e) => setNewDeviceGateway(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All Active Gateways (bKash + Nagad + Rocket)</option>
                  <option value="bkash">bKash SIM ({configuredNumbers?.bkash || 'Not set'})</option>
                  <option value="nagad">Nagad SIM ({configuredNumbers?.nagad || 'Not set'})</option>
                  <option value="rocket">Rocket SIM ({configuredNumbers?.rocket || 'Not set'})</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingDevice(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Generate API Key
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Devices List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading devices...</div>
      ) : devices.length === 0 ? (
        <Card className="p-8 text-center space-y-2 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No phones registered yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click &quot;Register Phone&quot; to create a Device API Key and paste it into the Blumart Sync app.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
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
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
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
                        {isOnline ? 'Online' : 'Standby'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Gateway: <strong className="uppercase">{dev.gateway}</strong></span>
                      <span>SIM: <strong className="font-mono">{dev.phoneNumber}</strong></span>
                      <span>Synced: <strong>{dev._count?.smsLogs ?? 0} SMS</strong></span>
                      <span>Last Sync: <strong className="text-slate-700 dark:text-slate-300">{formatRelativeTime(dev.lastSeenAt)}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {dev.batteryPct !== null && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {dev.isCharging ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{dev.batteryPct}%</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
                    <Key className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 select-all">
                      {dev.apiKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dev.apiKey, dev.id)}
                      className="p-1 hover:text-emerald-600 text-slate-400 transition cursor-pointer"
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
                    type="button"
                    onClick={() => handleDeleteDevice(dev.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition cursor-pointer"
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
  );
}
