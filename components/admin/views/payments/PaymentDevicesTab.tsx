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
  ShieldCheck,
  Copy,
  Plus,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
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
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

export function PaymentDevicesTab({ devices, loading, onRefresh }: DevicesTabProps) {
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePhone, setNewDevicePhone] = useState('');
  const [newDeviceGateway, setNewDeviceGateway] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPlayProtectGuide, setShowPlayProtectGuide] = useState(false);

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
        onRefresh();
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
      {/* Quick Setup Walkthrough Banner */}
      <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Blumart SMS Sync Companion App (v1.0.0)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Official APK
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Native Android background service to auto-sync incoming bKash, Nagad, and Rocket SMS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlayProtectGuide(!showPlayProtectGuide)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              Play Protect Guide
            </button>

            <a
              href="/blumart-sync.apk"
              download="blumart-sync.apk"
              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download APK
            </a>
          </div>
        </div>

        {/* Play Protect Instructions Accordion */}
        {showPlayProtectGuide && (
          <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Why Google Play Protect Blocks SMS Gateway Apps &amp; How to Install:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Google Play Protect strictly flags any sideloaded APK containing <code className="font-mono bg-white px-1 py-0.5 rounded">RECEIVE_SMS</code> permission as sensitive because it is outside Google Play Store.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200/60">
                <strong>Option A (One-Time Bypass - Recommended):</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>When Play Protect modal appears, click <strong>&quot;More details&quot;</strong>.</li>
                  <li>Click <strong>&quot;Install anyway&quot;</strong> (or &quot;Install without scanning&quot;).</li>
                </ol>
              </div>
              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200/60">
                <strong>Option B (Temporarily Disable Play Protect):</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>Open <strong>Play Store</strong> &gt; Profile Icon &gt; <strong>Play Protect</strong>.</li>
                  <li>Tap Settings (⚙ Gear icon at top right).</li>
                  <li>Turn off <em>&quot;Scan apps with Play Protect&quot;</em>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

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
            Enter Server URL + Device Key in the app and tap &quot;Start 24/7 SMS Listener&quot;. Done!
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
      {loading ? (
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
  );
}
