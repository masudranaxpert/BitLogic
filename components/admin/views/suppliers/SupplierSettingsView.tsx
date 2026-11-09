'use client';

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, SwitchToggle } from '@/components/admin/ui/primitives';
import { PageHeader, ToastStack, api, btn, btnPrimary, field, useToasts } from './shared';

type Rules = { supplierAutoDispatch: boolean; supplierPriceGuardPct: number; supplierStopOnLoss: boolean; supplierMaxLossPct: number };

export default function SupplierSettingsView() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rules, setRules] = useState<Rules | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [newCode, setNewCode] = useState('');
  const [busy, setBusy] = useState(false);
  const toasts = useToasts();

  useEffect(() => {
    api<{ rates: Record<string, number>; rules: Rules }>('/api/admin/suppliers')
      .then((r) => {
        setRates(r.rates);
        setRules(r.rules);
        setSaved(JSON.stringify({ rates: r.rates, rules: r.rules }));
      })
      .catch((e) => toasts.push('error', e.message));
  }, []);

  if (!rates || !rules) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy="true">
        <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />
        <Card className="overflow-hidden p-6 space-y-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200/80 dark:bg-slate-700" />
          <div className="h-4 w-72 rounded bg-slate-200/50 dark:bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="h-10 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
        </Card>
      </div>
    );
  }
  const dirty = JSON.stringify({ rates, rules }) !== saved;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ rates: Record<string, number>; rules: Rules }>('/api/admin/suppliers/rules', { method: 'PUT', body: { rates, rules } });
      setRates(r.rates);
      setRules(r.rules);
      setSaved(JSON.stringify({ rates: r.rates, rules: r.rules }));
      toasts.push('ok', 'Saved. Auto prices recalculated.');
    } catch (e) {
      toasts.push('error', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-16">
      <PageHeader
        title="Pricing & rules"
        sub="Exchange rates and the rules that stop a bad buy."
        actions={
          <button type="button" disabled={!dirty || busy} onClick={() => void save()} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        }
      />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
          <h2 className="m-0 font-display text-base font-semibold">Exchange rates</h2>
          <p className="m-0 mt-0.5 text-sm text-slate-500">Taka per 1 unit. Saving recalculates auto-priced plans.</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          {Object.entries(rates).map(([code, v]) => (
            <label key={code} className="flex items-center gap-2">
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold">1 {code} =</span>
              <input
                type="number"
                min={0.01}
                step="0.5"
                value={v}
                onChange={(e) => setRates({ ...rates, [code]: Number(e.target.value) })}
                className={`${field} h-10 min-w-0 flex-1 sm:max-w-36`}
              />
              <span className="shrink-0 text-sm text-slate-500">taka</span>
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))} placeholder="EUR" aria-label="New currency code" className={`${field} h-9 w-24`} />
            <button
              type="button"
              disabled={newCode.length < 3 || newCode in rates}
              onClick={() => {
                setRates({ ...rates, [newCode]: 150 });
                setNewCode('');
              }}
              className={btn}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add currency
            </button>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-slate-200/80 overflow-hidden dark:divide-slate-800">
        <div className="px-5 py-3.5">
          <h2 className="m-0 font-display text-base font-semibold">Buying rules</h2>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
          <div>
            <h3 className="m-0 text-sm font-semibold">Buy automatically after payment</h3>
            <p className="m-0 mt-0.5 text-sm text-slate-500">Plans set to automatic buy as soon as the payment is verified. Off means you press Buy.</p>
          </div>
          <SwitchToggle checked={rules.supplierAutoDispatch} onChange={(v) => setRules({ ...rules, supplierAutoDispatch: v })} label={rules.supplierAutoDispatch ? 'On' : 'Off'} />
        </div>
        <div className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
          <div>
            <h3 className="m-0 text-sm font-semibold">Stop selling at a loss</h3>
            <p className="m-0 mt-0.5 text-sm text-slate-500">If cost goes above your price, that plan shows “Temporarily unavailable” until you fix it.</p>
          </div>
          <SwitchToggle checked={rules.supplierStopOnLoss} onChange={(v) => setRules({ ...rules, supplierStopOnLoss: v })} label={rules.supplierStopOnLoss ? 'On' : 'Off'} />
        </div>
        <label className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
          <span>
            <span className="block text-sm font-semibold">Big price rise guard</span>
            <span className="mt-0.5 block text-sm text-slate-500">An automatic price rise bigger than this waits for your approval instead of going live.</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <input type="number" min={0} max={365} value={rules.supplierPriceGuardPct} onChange={(e) => setRules({ ...rules, supplierPriceGuardPct: Number(e.target.value) })} className={`${field} h-10 w-20`} />%
          </span>
        </label>
        <label className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
          <span>
            <span className="block text-sm font-semibold">Accept a small loss when buying</span>
            <span className="mt-0.5 block text-sm text-slate-500">After payment, still buy if the loss stays within this % of the sale. 0 waits for you.</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <input type="number" min={0} max={100} value={rules.supplierMaxLossPct} onChange={(e) => setRules({ ...rules, supplierMaxLossPct: Number(e.target.value) })} className={`${field} h-10 w-20`} />%
          </span>
        </label>
      </Card>
    </div>
  );
}
