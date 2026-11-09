'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DigitalDelivery, VaultCredential } from '@/lib/admin-data';
import { ModalShell, getCredentialTypeLabel } from '@/components/admin/ui/primitives';
import type { DeliveriesViewProps } from './types';
import { ADMIN_RELOAD_EVENT } from './OrderNotesPanel';

type Mode = 'vault' | 'supplier' | 'custom';

type UnitForm = {
  include: boolean;
  mode: Mode;
  vaultId: string;
  supplierProductId: string;
  allowLoss: boolean;
  secret: string;
  email: string;
  password: string;
  pin: string;
};

type SupplierOption = {
  supplierProductId: string;
  supplierName: string;
  name: string;
  price: string;
  currency: string;
  costBdt: number | null;
  stock: number | null;
  deliveryType: string;
  lossBdt: number;
  /** Why it can't be bought now; '' = usable. */
  reason: string;
};
type UnitSupply = { paid: boolean; busy: boolean; salePriceBdt: number; options: SupplierOption[] };
type SupplyState = { loading: boolean; canBuy: boolean; units: Record<string, UnitSupply> };

type BuyResult = { outcome: string; message: string };

const field =
  'w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600';
const taka = (n: number | null) => (n === null ? '—' : `৳${Math.round(n).toLocaleString('en-US')}`);

type Props = {
  open: boolean;
  /** Unit the admin clicked; its sibling units in the same order are listed too. */
  delivery: DigitalDelivery | null;
  deliveries: DigitalDelivery[];
  vault: VaultCredential[];
  onFulfillDelivery: DeliveriesViewProps['onFulfillDelivery'];
  onClose: () => void;
};

/** Waiting for a credential, and not already being bought from a supplier. */
const needsCredential = (d: DigitalDelivery) =>
  d.supplierState !== 'processing' &&
  (d.status === 'pending_dispatch' || (Boolean(d.renewalPending) && !d.credentialPayload.secretValue?.trim()));

export function SendOrderCredentialsModal({ open, delivery, deliveries, vault, onFulfillDelivery, onClose }: Props) {
  const units = useMemo(() => {
    if (!delivery) return [];
    const all = deliveries
      .filter((d) => d.orderId === delivery.orderId && needsCredential(d))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return all.length > 0 ? all : [delivery];
  }, [delivery, deliveries]);

  const [forms, setForms] = useState<Record<string, UnitForm>>({});
  const [supply, setSupply] = useState<SupplyState>({ loading: true, canBuy: false, units: {} });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, BuyResult>>({});

  const stockFor = (d: DigitalDelivery) =>
    vault.filter((v) => v.productId === d.productId && v.variantId === d.variantId && v.status === 'available');

  const usableOptions = (id: string, s: SupplyState) =>
    s.canBuy && s.units[id]?.paid ? (s.units[id]?.options || []).filter((o) => !o.reason) : [];

  // Load supplier choices, then pick a sensible default per unit: own stock → supplier → manual.
  useEffect(() => {
    if (!open || !delivery) return;
    let alive = true;
    setNote('');
    setError('');
    setResults({});
    setSupply({ loading: true, canBuy: false, units: {} });
    const init = (s: SupplyState) => {
      const used = new Set<string>();
      const next: Record<string, UnitForm> = {};
      for (const u of units) {
        const free = stockFor(u).find((v) => !used.has(v.id));
        if (free) used.add(free.id);
        const sup = usableOptions(u.id, s)[0];
        next[u.id] = {
          include: u.id === delivery.id || units.length > 1,
          mode: free ? 'vault' : sup ? 'supplier' : 'custom',
          vaultId: free?.id ?? '',
          supplierProductId: sup?.supplierProductId ?? '',
          allowLoss: false,
          secret: '',
          email: '',
          password: '',
          pin: '',
        };
      }
      setForms(next);
    };
    init({ loading: true, canBuy: false, units: {} });
    fetch(`/api/admin/suppliers/unit-options?orderId=${encodeURIComponent(delivery.orderId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const s: SupplyState = { loading: false, canBuy: Boolean(d?.canBuy), units: d?.units || {} };
        setSupply(s);
        init(s);
      })
      .catch(() => alive && setSupply({ loading: false, canBuy: false, units: {} }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, delivery?.id, units.length]);

  if (!delivery) return null;

  const patch = (id: string, p: Partial<UnitForm>) => setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
  const label = (u: DigitalDelivery) => (units.length > 1 ? `Unit ${units.indexOf(u) + 1}` : 'This unit');

  const validate = (chosen: DigitalDelivery[]) => {
    const seenVault = new Set<string>();
    const perItem = new Map<string, number>();
    for (const u of chosen) {
      const f = forms[u.id];
      if (f.mode === 'vault') {
        if (!f.vaultId) return `${label(u)}: pick a credential.`;
        if (seenVault.has(f.vaultId)) return 'The same credential is selected for two units.';
        seenVault.add(f.vaultId);
      } else if (f.mode === 'supplier') {
        const s = supply.units[u.id];
        if (!supply.canBuy) return 'You need the Suppliers permission to buy from a supplier.';
        if (!s?.paid) return `${label(u)}: payment is not verified yet. Nothing is bought before that.`;
        const opt = s.options.find((o) => o.supplierProductId === f.supplierProductId);
        if (!opt) return `${label(u)}: choose a supplier item.`;
        if (opt.reason) return `${label(u)}: ${opt.reason}.`;
        if (opt.lossBdt > 0 && !f.allowLoss) return `${label(u)}: tick “buy at a loss” or choose another item.`;
        perItem.set(opt.supplierProductId, (perItem.get(opt.supplierProductId) || 0) + 1);
        if (opt.stock !== null && (perItem.get(opt.supplierProductId) || 0) > opt.stock) {
          return `${opt.supplierName} has only ${opt.stock} of “${opt.name}”. Split the units across items.`;
        }
      } else if (u.credentialType === 'email_login') {
        if (!f.email.trim() || !f.password.trim()) return `${label(u)}: enter email and password.`;
      } else if (!f.secret.trim()) {
        return `${label(u)}: enter the ${getCredentialTypeLabel(u.credentialType).toLowerCase()}.`;
      }
    }
    return '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const chosen = units.filter((u) => forms[u.id]?.include && !results[u.id]);
    if (chosen.length === 0) {
      setError('Select at least one unit.');
      return;
    }
    const problem = validate(chosen);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');

    // 1) Stock and manual units: sent right away (same as before).
    for (const u of chosen) {
      const f = forms[u.id];
      if (f.mode === 'vault') {
        const v = vault.find((x) => x.id === f.vaultId);
        if (!v) continue;
        onFulfillDelivery(
          u.id,
          { customAdminNote: note, secretValue: v.secretValue, email: v.email, password: v.password, profilePin: v.profilePin, vaultCredentialId: v.id },
          false,
        );
      } else if (f.mode === 'custom') {
        const secret = u.credentialType === 'email_login' ? `${f.email.trim()} | ${f.password.trim()}` : f.secret.trim();
        onFulfillDelivery(
          u.id,
          { customAdminNote: note, secretValue: secret, email: f.email.trim() || undefined, password: f.password.trim() || undefined, profilePin: f.pin.trim() || undefined },
          false,
        );
      }
    }

    // 2) Supplier units: bought on the server one at a time (claim prevents double buying).
    const supplierUnits = chosen.filter((u) => forms[u.id].mode === 'supplier');
    if (supplierUnits.length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    const got: Record<string, BuyResult> = { ...results };
    for (const u of supplierUnits) {
      const f = forms[u.id];
      setResults({ ...got, [u.id]: { outcome: 'running', message: 'Buying…' } });
      try {
        const res = await fetch('/api/admin/suppliers/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'buy_unit', deliveryId: u.id, supplierProductId: f.supplierProductId, allowLoss: f.allowLoss }),
        });
        const data = await res.json().catch(() => ({}));
        const r = (data.results || [])[0] as BuyResult | undefined;
        got[u.id] = !res.ok
          ? { outcome: 'failed', message: data.error || 'Could not reach the supplier.' }
          : r || { outcome: 'skipped', message: 'Nothing to buy for this unit.' };
      } catch {
        got[u.id] = { outcome: 'failed', message: 'Network error. Check Suppliers → Purchases before trying again.' };
      }
      setResults({ ...got });
    }
    setBusy(false);
    window.dispatchEvent(new Event(ADMIN_RELOAD_EVENT));
    const allGood = supplierUnits.every((u) => ['delivered', 'processing'].includes(got[u.id]?.outcome));
    if (allGood) onClose();
  };

  const picked = new Set(
    Object.values(forms)
      .filter((f) => f.include && f.mode === 'vault' && f.vaultId)
      .map((f) => f.vaultId),
  );
  const anySupplier = units.some((u) => forms[u.id]?.include && forms[u.id]?.mode === 'supplier' && !results[u.id]);
  const done = Object.keys(results).length > 0 && !busy;

  return (
    <ModalShell open={open} onClose={busy ? () => {} : onClose} title={`Send credentials · ${delivery.orderId}`} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <ul className="space-y-3">
          {units.map((u, i) => {
            const f = forms[u.id];
            if (!f) return null;
            const stock = stockFor(u);
            const s = supply.units[u.id];
            const usable = usableOptions(u.id, supply);
            const result = results[u.id];
            const locked = Boolean(result) && result.outcome !== 'failed' && result.outcome !== 'needs_review' && result.outcome !== 'skipped';
            const tabs: Array<{ m: Mode; label: string }> = [
              { m: 'vault', label: `Stock (${stock.length})` },
              { m: 'supplier', label: supply.loading ? 'Supplier…' : `Supplier${s?.options.length ? ` (${usable.length})` : ''}` },
              { m: 'custom', label: 'Manual' },
            ];
            return (
              <li key={u.id} className="space-y-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={f.include}
                      disabled={locked || busy}
                      onChange={(e) => patch(u.id, { include: e.target.checked })}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="text-sm font-semibold">
                      {units.length > 1 ? `${i + 1}. ` : ''}
                      {u.productName} · {u.variantName}
                    </span>
                  </label>
                  <div className="inline-flex overflow-hidden rounded-md border border-slate-200 text-sm dark:border-slate-800" role="radiogroup" aria-label="Source">
                    {tabs.map(({ m, label: l }) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={f.mode === m}
                        disabled={locked || busy}
                        onClick={() => patch(u.id, { mode: m })}
                        className={`h-8 px-3 cursor-pointer disabled:cursor-not-allowed ${
                          f.mode === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {result ? (
                  <p
                    role="status"
                    className={`m-0 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      result.outcome === 'running'
                        ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                        : result.outcome === 'delivered'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : result.outcome === 'processing'
                            ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    {result.outcome === 'running' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {result.outcome === 'delivered'
                      ? 'Delivered by the supplier.'
                      : result.outcome === 'processing'
                        ? 'Sent. The supplier is preparing it; it is added to the order as soon as it arrives.'
                        : result.message}
                  </p>
                ) : null}

                {f.include && !locked ? (
                  f.mode === 'vault' ? (
                    stock.length > 0 ? (
                      <select value={f.vaultId} onChange={(e) => patch(u.id, { vaultId: e.target.value })} className={`${field} font-mono`} aria-label="Credential">
                        <option value="">Select credential</option>
                        {stock.map((v) => (
                          <option key={v.id} value={v.id} disabled={picked.has(v.id) && f.vaultId !== v.id}>
                            {v.secretValue.slice(0, 44)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="m-0 text-sm text-amber-700 dark:text-amber-400">No own stock for this option. Use Supplier or Manual.</p>
                    )
                  ) : f.mode === 'supplier' ? (
                    <SupplierPicker
                      loading={supply.loading}
                      canBuy={supply.canBuy}
                      s={s}
                      value={f.supplierProductId}
                      allowLoss={f.allowLoss}
                      priceRose={result?.outcome === 'needs_review'}
                      onPick={(id) => patch(u.id, { supplierProductId: id, allowLoss: false })}
                      onAllowLoss={(v) => patch(u.id, { allowLoss: v })}
                    />
                  ) : u.credentialType === 'email_login' ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <input className={`${field} font-mono`} placeholder="Email" value={f.email} onChange={(e) => patch(u.id, { email: e.target.value })} />
                      <input className={`${field} font-mono`} placeholder="Password" value={f.password} onChange={(e) => patch(u.id, { password: e.target.value })} />
                      <input className={`${field} font-mono`} placeholder="Profile / PIN" value={f.pin} onChange={(e) => patch(u.id, { pin: e.target.value })} />
                    </div>
                  ) : (
                    <input
                      className={`${field} font-mono`}
                      placeholder={getCredentialTypeLabel(u.credentialType)}
                      value={f.secret}
                      onChange={(e) => patch(u.id, { secret: e.target.value })}
                    />
                  )
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="send-note">Message to buyer</label>
          <textarea
            id="send-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
          />
          {anySupplier ? <p className="m-0 text-xs text-slate-500">Supplier units get the supplier’s credential; this message applies to stock and manual units.</p> : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" disabled={busy} onClick={onClose} className="h-10 cursor-pointer rounded-md border border-slate-200 px-4 text-sm disabled:opacity-50 dark:border-slate-800">
            {done ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" disabled={busy} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? 'Buying…' : done ? 'Try again' : units.length > 1 ? 'Send selected' : 'Send'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/** Supplier source for one unit: linked items with cost, stock and profit; unusable ones say why. */
function SupplierPicker({
  loading,
  canBuy,
  s,
  value,
  allowLoss,
  onPick,
  onAllowLoss,
  priceRose = false,
}: {
  priceRose?: boolean;
  loading: boolean;
  canBuy: boolean;
  s?: UnitSupply;
  value: string;
  allowLoss: boolean;
  onPick: (id: string) => void;
  onAllowLoss: (v: boolean) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading supplier items">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2.5 animate-pulse"
          >
            <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-40 rounded bg-slate-200/80 dark:bg-slate-700" />
              <div className="h-3 w-24 rounded bg-slate-200/60 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!s || s.options.length === 0) {
    return <p className="m-0 text-sm text-slate-500">This option is not linked to a supplier. Link it under Suppliers → Linked options.</p>;
  }
  const chosen = s.options.find((o) => o.supplierProductId === value);
  return (
    <div className="space-y-2">
      {!canBuy ? <p className="m-0 text-sm text-amber-700 dark:text-amber-400">You need the Suppliers permission to buy. Ask an admin.</p> : null}
      {canBuy && !s.paid ? (
        <p className="m-0 text-sm text-amber-700 dark:text-amber-400">Payment is not verified yet. Verify it first: nothing is bought before the money is confirmed.</p>
      ) : null}
      <div className="space-y-1.5" role="radiogroup" aria-label="Supplier item">
        {s.options.map((o) => {
          const disabled = Boolean(o.reason) || !canBuy || !s.paid;
          const profit = o.costBdt === null ? null : s.salePriceBdt - o.costBdt;
          return (
            <label
              key={o.supplierProductId}
              className={`flex items-start gap-2.5 rounded-md border px-3 py-2 ${
                value === o.supplierProductId ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <input type="radio" disabled={disabled} checked={value === o.supplierProductId} onChange={() => onPick(o.supplierProductId)} className="mt-1 accent-emerald-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{o.name}</span>
                <span className="flex flex-wrap gap-x-2 text-xs text-slate-500">
                  <span>{o.supplierName}</span>
                  <span>
                    {o.price} {o.currency} = {taka(o.costBdt)}
                  </span>
                  {o.stock !== null && !o.reason ? <span>{o.stock} at supplier</span> : null}
                  {o.deliveryType === 'manual' && !o.reason ? <span>delivered by hand (can take hours)</span> : null}
                  {profit !== null && !o.reason ? (
                    <span className={profit < 0 ? 'font-semibold text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                      {profit < 0 ? `loss ${taka(-profit)}` : `profit ${taka(profit)}`}
                    </span>
                  ) : null}
                </span>
                {o.reason ? <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">{o.reason}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {chosen && priceRose && chosen.lossBdt === 0 ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
          <input type="checkbox" checked={allowLoss} onChange={(e) => onAllowLoss(e.target.checked)} className="accent-rose-600" />
          The supplier raised the price. Buy anyway at today’s price
        </label>
      ) : null}
      {chosen && chosen.lossBdt > 0 ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
          <input type="checkbox" checked={allowLoss} onChange={(e) => onAllowLoss(e.target.checked)} className="accent-rose-600" />
          Buy at a loss of {taka(chosen.lossBdt)} (customer paid {taka(s.salePriceBdt)})
        </label>
      ) : null}
    </div>
  );
}
