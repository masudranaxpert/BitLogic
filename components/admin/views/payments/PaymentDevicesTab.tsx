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
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

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
      {/* Banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Blumart SMS Sync APK
            </h3>
            <p className="text-[11px] text-slate-500">
              Forwards incoming MFS SMS from your phone to verify payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlayProtectGuide(!showPlayProtectGuide)}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Play Protect Guide
          </button>

          <a
            href="/blumart-sync.apk"
            download="blumart-sync.apk"
            className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download APK
          </a>
        </div>
      </div>

      {/* Play Protect Instructions Accordion */}
      {showPlayProtectGuide && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Google Play Protect Notice:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Google flags sideloaded APKs requesting SMS access. During installation, tap <strong>&quot;More details&quot;</strong> &gt; <strong>&quot;Install anyway&quot;</strong>.
          </p>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Connected Devices ({devices.length})
        </h2>

        <button
          onClick={() => setIsAddingDevice(!isAddingDevice)}
          className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAddingDevice ? 'Cancel' : 'Add Device'}
        </button>
      </div>

      {/* Add Device Form */}
      {isAddingDevice && (
        <Card className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/15 dark:bg-emerald-950/10">
          <form onSubmit={handleCreateDevice} className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Register New Device
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samsung M32"
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
                  placeholder="e.g. 017XXXXXXXX"
                  value={newDevicePhone}
                  onChange={(e) => setNewDevicePhone(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gateway
                </label>
                <select
                  value={newDeviceGateway}
                  onChange={(e) => setNewDeviceGateway(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All Gateways</option>
                  <option value="bkash">bKash Only</option>
                  <option value="nagad">Nagad Only</option>
                  <option value="rocket">Rocket Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingDevice(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                Generate Key &amp; Save
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Devices List Table */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading devices...</div>
      ) : devices.length === 0 ? (
        <Card className="p-8 text-center space-y-2 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No sync devices connected
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click &quot;Add Device&quot; to generate an API key and connect your phone.
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
                        {isOnline ? 'Active' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Phone: <strong>{dev.phoneNumber}</strong></span>
                      <span>Gateway: <strong className="uppercase">{dev.gateway}</strong></span>
                      <span>Synced: <strong>{dev._count?.smsLogs ?? 0} SMS</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Battery Status */}
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
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition"
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
