'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '@/lib/store-settings';
import { CreditCard, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [saved, setSaved] = useState<PaymentConfigDraft | null>(null);
  const [draft, setDraft] = useState<PaymentConfigDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const load = () => {
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

  useEffect(() => {
    load();
  }, []);

  const dirty = Boolean(
    saved && draft && JSON.stringify(saved) !== JSON.stringify(draft),
  );

  const setField = <K extends keyof PaymentConfigDraft>(
    k: K,
    v: PaymentConfigDraft[K],
  ) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setStatus('idle');
  };

  const handleSave = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const updated = pick({ ...DEFAULT_STORE_SETTINGS, ...data.settings });
      setSaved(updated);
      setDraft(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3500);
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <div className="p-8 text-center" aria-busy="true">
        <RefreshCw size={20} className="animate-spin text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading payment configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Save Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            <span>Payment Methods</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure mobile banking numbers, account types, customer instructions, and toggle active methods for storefront checkout.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              <span>Saved</span>
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
              <AlertCircle size={14} />
              <span>Failed to save</span>
            </span>
          )}

          <button
            type="button"
            disabled={!dirty || busy}
            onClick={handleSave}
            className={`h-9 px-4 rounded-md text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              dirty && !busy
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {busy ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>{busy ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. bKash Configuration Card */}
        <Card className="p-5 space-y-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-lg bg-pink-50 p-2 flex items-center justify-center border border-pink-100 dark:bg-pink-950/40 dark:border-pink-900">
                  <img
                    src="/payments/bkash-icon.svg"
                    alt="bKash"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">bKash</h3>
                  <span className="text-[11px] font-medium text-slate-500">Mobile Banking</span>
                </div>
              </div>

              {/* Status Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-bold ${draft.bkashEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {draft.bkashEnabled ? 'Active' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={draft.bkashEnabled}
                  onChange={(e) => setField('bkashEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative" />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  bKash Account Number
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
                  <option value="Merchant">Merchant (Make Payment)</option>
                  <option value="Agent">Agent (Cash Out)</option>
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
                  placeholder="Send Money to our personal bKash number and enter TrxID below."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
            Visible in checkout when active.
          </div>
        </Card>

        {/* 2. Nagad Configuration Card */}
        <Card className="p-5 space-y-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-lg bg-orange-50 p-2 flex items-center justify-center border border-orange-100 dark:bg-orange-950/40 dark:border-orange-900">
                  <img
                    src="/payments/nagad-icon.svg"
                    alt="Nagad"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nagad</h3>
                  <span className="text-[11px] font-medium text-slate-500">Post Office Banking</span>
                </div>
              </div>

              {/* Status Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-bold ${draft.nagadEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {draft.nagadEnabled ? 'Active' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={draft.nagadEnabled}
                  onChange={(e) => setField('nagadEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative" />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nagad Account Number
                </label>
                <input
                  type="text"
                  value={draft.nagadNumber}
                  onChange={(e) => setField('nagadNumber', e.target.value)}
                  placeholder="017XXXXXXXX"
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
                  <option value="Merchant">Merchant (Make Payment)</option>
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
                  placeholder="Send Money to our personal Nagad number and enter TrxID below."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
            Visible in checkout when active.
          </div>
        </Card>

        {/* 3. Rocket Configuration Card */}
        <Card className="p-5 space-y-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-lg bg-purple-50 p-1.5 flex items-center justify-center border border-purple-100 dark:bg-purple-950/40 dark:border-purple-900">
                  <img
                    src="/payments/rocket.png"
                    alt="Rocket"
                    className="w-full h-full object-contain"
                  />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Rocket (DBBL)</h3>
                  <span className="text-[11px] font-medium text-slate-500">Dutch-Bangla Bank</span>
                </div>
              </div>

              {/* Status Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-bold ${draft.rocketEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {draft.rocketEnabled ? 'Active' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={draft.rocketEnabled}
                  onChange={(e) => setField('rocketEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative" />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rocket 12-digit Account Number
                </label>
                <input
                  type="text"
                  value={draft.rocketNumber}
                  onChange={(e) => setField('rocketNumber', e.target.value)}
                  placeholder="017XXXXXXXXX"
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
                  placeholder="Send Money to our Rocket number and enter TrxID below."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
            Visible in checkout when active.
          </div>
        </Card>
      </div>

      {/* Customer Checkout Preview Box */}
      <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Storefront Customer View Preview
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Here is how your customers will see your payment options on the checkout page:
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
            {!draft.bkashEnabled && !draft.nagadEnabled && !draft.rocketEnabled && (
              <div className="w-full p-2 text-center text-xs text-rose-500 font-medium">
                No payment methods are currently active!
              </div>
            )}
          </div>

          {draft.bkashEnabled && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200/70">
              Send <strong className="text-slate-900 dark:text-white">BDT Amount</strong> to{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{draft.bkashNumber || '(not set)'}</span>{' '}
              ({draft.bkashType}) and submit the Transaction ID.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
