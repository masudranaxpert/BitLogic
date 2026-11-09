'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Loader2, Plus, RefreshCw, Trash2, Webhook } from 'lucide-react';
import { Card, ModalShell, SwitchToggle } from '@/components/admin/ui/primitives';
import { PageHeader, Pill, ToastStack, ago, api, btn, btnPrimary, field, useToasts } from './shared';

type Kind = { kind: string; label: string; defaultBaseUrl: string; currency: string; docsUrl: string; supportsWebhooks: boolean };
type SupplierRow = {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  apiKeyHint: string;
  currency: string;
  isEnabled: boolean;
  purchasingEnabled: boolean;
  syncIntervalMin: number;
  lowBalanceAlert: number;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  lastSyncError: string;
  balance: string;
  balanceAt: string | null;
  webhookConnected: boolean;
  items: { available: number; outOfStock: number; removed: number };
  linkedOptions: number;
  orders: { delivered: number; processing: number; failed: number; review: number };
};

export default function SuppliersView({ onOpen }: { onOpen: (tab: 'supplier-catalog' | 'supplier-orders' | 'supplier-settings') => void }) {
  const [data, setData] = useState<{ suppliers: SupplierRow[]; kinds: Kind[] } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const toasts = useToasts();
  const [adding, setAdding] = useState(false);
  const [keyFor, setKeyFor] = useState<SupplierRow | null>(null);

  const load = useCallback(() => {
    api<{ suppliers: SupplierRow[]; kinds: Kind[] }>('/api/admin/suppliers')
      .then((d) => {
        setData(d);
        setErr('');
      })
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // While a sync runs in the background, refresh every few seconds.
  useEffect(() => {
    if (!data?.suppliers.some((s) => s.lastSyncStatus === 'running')) return;
    const t = window.setTimeout(load, 3000);
    return () => window.clearTimeout(t);
  }, [data, load]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toasts.push('ok', ok);
      load();
    } catch (e) {
      toasts.push('error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(null);
    }
  };

  const patch = (s: SupplierRow, body: Record<string, unknown>, ok?: string) =>
    run(`patch-${s.id}`, () => api(`/api/admin/suppliers/${s.id}`, { method: 'PATCH', body }), ok);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <PageHeader
        title="Suppliers"
        sub="Reseller APIs. Link an item to a plan to sell it."
        actions={
          <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden /> Add supplier
          </button>
        }
      />
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />
      {err ? <Card className="p-5 text-sm text-rose-600">{err}</Card> : null}
      {!data && !err ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-6 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-5 w-36 rounded bg-slate-200/80 dark:bg-slate-700" />
                  <div className="h-3.5 w-52 rounded bg-slate-200/50 dark:bg-slate-800" />
                </div>
                <div className="h-8 w-24 rounded-md bg-slate-200/60 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {data && data.suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="m-0 font-semibold text-slate-900 dark:text-slate-100">No supplier connected yet</p>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Paste an API key. It is stored encrypted and not shown again.
          </p>
          <button type="button" onClick={() => setAdding(true)} className={`${btnPrimary} mt-4`}>
            <Plus className="h-4 w-4" aria-hidden /> Add supplier
          </button>
        </Card>
      ) : null}

      {data?.suppliers.map((s) => {
        const kind = data.kinds.find((k) => k.kind === s.kind);
        const syncing = s.lastSyncStatus === 'running' || busy === `sync-${s.id}`;
        const authBroken = s.lastSyncError.startsWith('AUTH');
        const lowBal = s.balance !== '' && Number(s.balance) < s.lowBalanceAlert;
        return (
          <Card key={s.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 font-display text-lg font-semibold">{s.name}</h2>
                  {!s.isEnabled ? (
                    <Pill tone="grey">Off</Pill>
                  ) : authBroken ? (
                    <Pill tone="red">Key rejected</Pill>
                  ) : s.lastSyncStatus === 'error' ? (
                    <Pill tone="amber">Last sync failed</Pill>
                  ) : (
                    <Pill tone="green">Connected</Pill>
                  )}
                  {!s.purchasingEnabled && s.isEnabled ? <Pill tone="amber">Buying paused</Pill> : null}
                </div>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {kind?.label || s.kind} · key {s.apiKeyHint} · prices in {s.currency}
                  {kind?.docsUrl ? (
                    <>
                      {' · '}
                      <a href={kind.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline dark:text-emerald-400">
                        API docs <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={syncing || !s.isEnabled}
                  onClick={() =>
                    run(
                      `sync-${s.id}`,
                      async () => {
                        const r = await api<{ result: { ok: boolean; added: number; updated: number; removed: number; priceChanges: number; error?: string } }>(
                          `/api/admin/suppliers/${s.id}/sync`,
                          { method: 'POST' },
                        );
                        if (!r.result.ok) throw new Error(r.result.error || 'Sync failed.');
                        toasts.push(
                          'ok',
                          `${s.name}: ${r.result.added} new, ${r.result.updated} updated, ${r.result.removed} removed, ${r.result.priceChanges} price changes.`,
                        );
                      },
                    )
                  }
                  className={btn}
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
                <button type="button" onClick={() => setKeyFor(s)} className={btn}>
                  <KeyRound className="h-4 w-4" aria-hidden /> Change key
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-200/70 dark:bg-slate-800 sm:grid-cols-4">
              {[
                {
                  label: 'Balance',
                  value: s.balance === '' ? '—' : `${s.balance} ${s.currency}`,
                  sub: lowBal ? `Below ${s.lowBalanceAlert} — top up` : s.balanceAt ? `checked ${ago(s.balanceAt)}` : '',
                  warn: lowBal,
                },
                { label: 'Catalog', value: `${s.items.available} on sale`, sub: `${s.items.outOfStock} out of stock${s.items.removed ? ` · ${s.items.removed} removed` : ''}` },
                { label: 'Linked plans', value: String(s.linkedOptions), sub: 'on your plans' },
                {
                  label: 'Purchases',
                  value: `${s.orders.delivered} delivered`,
                  sub: [s.orders.processing ? `${s.orders.processing} running` : '', s.orders.failed ? `${s.orders.failed} failed` : '', s.orders.review ? `${s.orders.review} to review` : '']
                    .filter(Boolean)
                    .join(' · ') || 'none waiting',
                  warn: s.orders.review > 0,
                },
              ].map((k) => (
                <div key={k.label} className="bg-white px-4 py-3 dark:bg-slate-950">
                  <div className="text-xs text-slate-500">{k.label}</div>
                  <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">{k.value}</div>
                  <div className={`text-xs ${k.warn ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>{k.sub}</div>
                </div>
              ))}
            </div>

            {s.lastSyncError && s.lastSyncStatus === 'error' ? (
              <p className="m-0 border-t border-rose-100 bg-rose-50 px-5 py-2.5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {authBroken ? 'API key rejected. Change the key. Buying is stopped.' : s.lastSyncError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
              <SwitchToggle checked={s.isEnabled} label="Use this supplier" onChange={(v) => patch(s, { isEnabled: v }, v ? 'Supplier on.' : 'Supplier off. Its plans stop selling.')} />
              <SwitchToggle
                checked={s.purchasingEnabled}
                label="Allow buying"
                onChange={(v) => patch(s, { purchasingEnabled: v }, v ? 'Buying on.' : 'Buying paused. Sync still runs.')}
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                Sync every
                <select
                  value={s.syncIntervalMin}
                  onChange={(e) => patch(s, { syncIntervalMin: Number(e.target.value) })}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  {[5, 10, 15, 30, 60, 180, 720].map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} min` : `${m / 60} h`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                Low-balance alert
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  defaultValue={s.lowBalanceAlert}
                  onBlur={(e) => Number(e.target.value) !== s.lowBalanceAlert && patch(s, { lowBalanceAlert: Number(e.target.value) })}
                  className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                />
                {s.currency}
              </label>
              <span className="text-xs text-slate-500">Last sync {ago(s.lastSyncAt)}</span>
              <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                {kind?.supportsWebhooks ? (
                  <button
                    type="button"
                    disabled={busy === `wh-${s.id}`}
                    onClick={() => run(`wh-${s.id}`, () => api(`/api/admin/suppliers/${s.id}/webhook`, { method: 'POST' }), 'Webhook connected.')}
                    className={btn}
                    title="Instant status updates. Polling works without it."
                  >
                    <Webhook className="h-4 w-4" aria-hidden /> {s.webhookConnected ? 'Webhook on · reconnect' : 'Connect webhook'}
                  </button>
                ) : null}
                <button type="button" onClick={() => onOpen('supplier-catalog')} className={btn}>
                  Browse catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remove ${s.name}? Plan links go away. Purchase history stays.`)) return;
                    void run(`del-${s.id}`, () => api(`/api/admin/suppliers/${s.id}`, { method: 'DELETE' }), 'Supplier removed.');
                  }}
                  className={`${btn} text-rose-600 hover:border-rose-400`}
                  aria-label={`Remove ${s.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {data ? (
        <AddSupplierModal
          open={adding}
          kinds={data.kinds}
          onClose={() => setAdding(false)}
          onAdded={(name) => {
            setAdding(false);
            toasts.push('ok', `${name} connected. Reading its catalog.`);
            load();
          }}
        />
      ) : null}
      <ChangeKeyModal
        supplier={keyFor}
        onClose={() => setKeyFor(null)}
        onSaved={() => {
          setKeyFor(null);
          toasts.push('ok', 'New key saved.');
          load();
        }}
      />
    </div>
  );
}

function AddSupplierModal({ open, kinds, onClose, onAdded }: { open: boolean; kinds: Kind[]; onClose: () => void; onAdded: (name: string) => void }) {
  const [kind, setKind] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = kinds.find((x) => x.kind === kind);
  useEffect(() => {
    if (open) {
      setKind(kinds[0]?.kind || '');
      setName('');
      setApiKey('');
      setBaseUrl('');
      setError('');
      setAdvanced(false);
    }
  }, [open, kinds]);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ supplier: { name: string } }>('/api/admin/suppliers', { method: 'POST', body: { kind, name, apiKey, baseUrl: baseUrl || undefined } });
      onAdded(r.supplier.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Add supplier" subtitle="The key is checked with the supplier before it is saved." maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Supplier">
          {kinds.map((x) => (
            <button
              key={x.kind}
              type="button"
              role="radio"
              aria-checked={kind === x.kind}
              onClick={() => setKind(x.kind)}
              className={`rounded-lg border px-3 py-2.5 text-left cursor-pointer ${kind === x.kind ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
            >
              <div className="text-sm font-semibold">{x.label}</div>
              <div className="text-xs text-slate-500">Prices in {x.currency}{x.supportsWebhooks ? ' · webhooks' : ''}</div>
            </button>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">API key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={kind === 'jaha' ? 'jaha_live_…' : 'sk_live_…'}
            className={`${field} h-10 font-mono`}
          />
          <span className="block text-xs text-slate-500">Stored encrypted. You will only ever see its last 4 characters.</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name <span className="font-normal text-slate-400">(optional)</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={k?.label} className={`${field} h-10`} />
        </label>
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer">
          {advanced ? 'Hide' : 'Show'} advanced
        </button>
        {advanced ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">API base URL</span>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={k?.defaultBaseUrl} className={`${field} h-10 font-mono text-xs`} />
          </label>
        ) : null}
        {error ? <p role="alert" className="m-0 text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={busy || !kind || apiKey.trim().length < 12} className={btnPrimary}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? 'Checking key…' : 'Connect'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ChangeKeyModal({ supplier, onClose, onSaved }: { supplier: SupplierRow | null; onClose: () => void; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setApiKey('');
    setError('');
  }, [supplier]);
  return (
    <ModalShell open={Boolean(supplier)} onClose={onClose} title={`New API key · ${supplier?.name || ''}`} subtitle={`Current key ${supplier?.apiKeyHint || ''}`} maxWidth="max-w-md">
      <div className="space-y-3">
        <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste the new key" className={`${field} h-10 font-mono`} />
        {error ? <p role="alert" className="m-0 text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <button
            type="button"
            disabled={busy || apiKey.trim().length < 12}
            onClick={async () => {
              if (!supplier) return;
              setBusy(true);
              setError('');
              try {
                await api(`/api/admin/suppliers/${supplier.id}`, { method: 'PATCH', body: { apiKey } });
                onSaved();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save.');
              } finally {
                setBusy(false);
              }
            }}
            className={btnPrimary}
          >
            {busy ? 'Checking…' : 'Save key'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
