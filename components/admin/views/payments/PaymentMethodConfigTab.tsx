'use client';

import React from 'react';
import { Card } from '@/components/admin/ui/primitives';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings';
import { Smartphone } from 'lucide-react';

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
      {/* Clean Quick Status */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Automated SMS Sync Available
          </h3>
          <p className="text-xs text-slate-500">
            Received customer transactions are matched automatically via companion app.
          </p>
        </div>
        <button
          onClick={onNavigateToDevices}
          className="shrink-0 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          Devices ({devicesCount})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* bKash */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 p-1 flex items-center justify-center border border-pink-100">
                  <img src="/payments/bkash-icon.svg" alt="bKash" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">bKash</h3>
                  <p className="text-[11px] text-slate-500">Sender: 16216</p>
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

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Shown in checkout when enabled.
          </div>
        </Card>

        {/* Nagad */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 p-1 flex items-center justify-center border border-orange-100">
                  <img src="/payments/nagad.svg" alt="Nagad" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nagad</h3>
                  <p className="text-[11px] text-slate-500">Sender: 16167</p>
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

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Shown in checkout when enabled.
          </div>
        </Card>

        {/* Rocket */}
        <Card className="p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 p-1 flex items-center justify-center border border-purple-100">
                  <img src="/payments/rocket.png" alt="Rocket" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rocket</h3>
                  <p className="text-[11px] text-slate-500">Sender: 16221</p>
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

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Shown in checkout when enabled.
          </div>
        </Card>
      </div>
    </div>
  );
}
