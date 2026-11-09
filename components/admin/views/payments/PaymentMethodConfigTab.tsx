'use client';

import React from 'react';
import { Card } from '@/components/admin/ui/primitives';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings';

export type PaymentConfigDraft = Pick<
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

interface MethodTabProps {
  draft: PaymentConfigDraft;
  setField: <K extends keyof PaymentConfigDraft>(k: K, v: PaymentConfigDraft[K]) => void;
  onNavigateToDevices: () => void;
  devicesCount: number;
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

export function PaymentMethodConfigTab({
  draft,
  setField,
  onNavigateToDevices,
  devicesCount,
}: MethodTabProps) {
  return (
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
          onClick={onNavigateToDevices}
          className="shrink-0 px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
        >
          Manage Sync Devices ({devicesCount})
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
  );
}
