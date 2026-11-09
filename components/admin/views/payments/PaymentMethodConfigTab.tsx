'use client';

import React from 'react';
import { Card } from '@/components/admin/ui/primitives';
import { type StoreSettings } from '@/lib/store-settings';
import { Smartphone, Check, SlidersHorizontal } from 'lucide-react';

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
  | 'verifyModeTrxId'
  | 'verifyModeSenderFifo'
  | 'verifyModeReference'
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
  const isDefaultMode =
    draft.verifyModeSenderFifo &&
    !draft.verifyModeReference &&
    draft.verifyModeTrxId;

  const isStrictTrxOnly =
    draft.verifyModeTrxId &&
    !draft.verifyModeSenderFifo &&
    !draft.verifyModeReference;

  const isAllModesActive =
    draft.verifyModeTrxId &&
    draft.verifyModeSenderFifo &&
    draft.verifyModeReference;

  const enableDefaultMode = () => {
    setField('verifyModeSenderFifo', true);
    setField('verifyModeReference', false);
    setField('verifyModeTrxId', true);
  };

  const enableAllModes = () => {
    setField('verifyModeTrxId', true);
    setField('verifyModeSenderFifo', true);
    setField('verifyModeReference', true);
  };

  const enableStrictTrxOnly = () => {
    setField('verifyModeTrxId', true);
    setField('verifyModeSenderFifo', false);
    setField('verifyModeReference', false);
  };

  return (
    <div className="space-y-6">
      {/* 3-Mode Autonomous Verification Rules Controller */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Verification Engine Modes
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose which matching rules are allowed to auto-approve orders when SMS arrives.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={enableDefaultMode}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition cursor-pointer ${
                isDefaultMode
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              Default (Sender + TrxID)
            </button>
            <button
              type="button"
              onClick={enableAllModes}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition cursor-pointer ${
                isAllModesActive
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              All 3 Modes (+ Reference)
            </button>
            <button
              type="button"
              onClick={enableStrictTrxOnly}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition cursor-pointer ${
                isStrictTrxOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              Strict TrxID Only
            </button>
            <button
              type="button"
              onClick={onNavigateToDevices}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Devices ({devicesCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mode 1 */}
          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition flex flex-col justify-between gap-2 ${
              draft.verifyModeSenderFifo
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-slate-200 dark:border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1. Sender + Time (FIFO)
              </span>
              <input
                type="checkbox"
                checked={draft.verifyModeSenderFifo}
                onChange={(e) => setField('verifyModeSenderFifo', e.target.checked)}
                className="accent-emerald-600 w-4 h-4 mt-0.5 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed m-0">
              Default automatic mode: asks customer for their sender number on Step 1 &amp; matches SMS by sender + amount.
            </p>
          </label>

          {/* Mode 2 */}
          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition flex flex-col justify-between gap-2 ${
              draft.verifyModeReference
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-slate-200 dark:border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                2. Reference + Amount
              </span>
              <input
                type="checkbox"
                checked={draft.verifyModeReference}
                onChange={(e) => setField('verifyModeReference', e.target.checked)}
                className="accent-emerald-600 w-4 h-4 mt-0.5 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed m-0">
              Shows Order ID (Reference Copy Box) in Gateway UI &amp; auto-verifies when typed in MFS Reference.
            </p>
          </label>

          {/* Mode 3 */}
          <label
            className={`p-3.5 rounded-lg border cursor-pointer transition flex flex-col justify-between gap-2 ${
              draft.verifyModeTrxId
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-slate-200 dark:border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                3. Transaction ID (TrxID)
              </span>
              <input
                type="checkbox"
                checked={draft.verifyModeTrxId}
                onChange={(e) => setField('verifyModeTrxId', e.target.checked)}
                className="accent-emerald-600 w-4 h-4 mt-0.5 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed m-0">
              Records customer TrxID immediately (no waiting screen) &amp; verifies against present or incoming SMS.
            </p>
          </label>
        </div>
      </Card>

      {/* Gateway Receiving Accounts */}
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
                  <p className="text-[11px] text-slate-500">SMS Sender: 16216 / bKash</p>
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
                  Receiving Number
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
                  <option value="Agent">Agent (Cash Out)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>{draft.bkashEnabled ? 'Active in checkout & gateway' : 'Hidden from customers'}</span>
            {draft.bkashEnabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
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
                  <p className="text-[11px] text-slate-500">SMS Sender: 16167 / NAGAD</p>
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
                  Receiving Number
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
                  <option value="Agent">Agent (Cash Out)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>{draft.nagadEnabled ? 'Active in checkout & gateway' : 'Hidden from customers'}</span>
            {draft.nagadEnabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
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
                  <p className="text-[11px] text-slate-500">SMS Sender: 16216</p>
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
                  Receiving Number
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
                  <option value="Agent">Agent (Cash Out)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>{draft.rocketEnabled ? 'Active in checkout & gateway' : 'Hidden from customers'}</span>
            {draft.rocketEnabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
