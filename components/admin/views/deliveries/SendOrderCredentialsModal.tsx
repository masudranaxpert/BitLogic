'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { DigitalDelivery, VaultCredential } from '@/lib/admin-data';
import { ModalShell, getCredentialTypeLabel } from '@/components/admin/ui/primitives';
import type { DeliveriesViewProps } from './types';

type UnitForm = {
  include: boolean;
  mode: 'vault' | 'custom';
  vaultId: string;
  secret: string;
  email: string;
  password: string;
  pin: string;
};

const field =
  'w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600';

type Props = {
  open: boolean;
  /** Unit the admin clicked; its sibling units in the same order are listed too. */
  delivery: DigitalDelivery | null;
  deliveries: DigitalDelivery[];
  vault: VaultCredential[];
  onFulfillDelivery: DeliveriesViewProps['onFulfillDelivery'];
  onClose: () => void;
};

const needsCredential = (d: DigitalDelivery) =>
  d.status === 'pending_dispatch' ||
  (Boolean(d.renewalPending) && !d.credentialPayload.secretValue?.trim());

export function SendOrderCredentialsModal({
  open,
  delivery,
  deliveries,
  vault,
  onFulfillDelivery,
  onClose,
}: Props) {
  const units = useMemo(() => {
    if (!delivery) return [];
    const all = deliveries
      .filter((d) => d.orderId === delivery.orderId && needsCredential(d))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return all.length > 0 ? all : [delivery];
  }, [delivery, deliveries]);

  const [forms, setForms] = useState<Record<string, UnitForm>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const stockFor = (d: DigitalDelivery) =>
    vault.filter(
      (v) =>
        v.productId === d.productId &&
        v.variantId === d.variantId &&
        v.status === 'available',
    );

  useEffect(() => {
    if (!open || !delivery) return;
    const used = new Set<string>();
    const next: Record<string, UnitForm> = {};
    for (const u of units) {
      const free = stockFor(u).find((v) => !used.has(v.id));
      if (free) used.add(free.id);
      next[u.id] = {
        include: u.id === delivery.id || units.length > 1,
        mode: free ? 'vault' : 'custom',
        vaultId: free?.id ?? '',
        secret: '',
        email: '',
        password: '',
        pin: '',
      };
    }
    setForms(next);
    setNote('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, delivery?.id, units.length]);

  if (!delivery) return null;

  const patch = (id: string, p: Partial<UnitForm>) =>
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = units.filter((u) => forms[u.id]?.include);
    if (chosen.length === 0) {
      setError('Select at least one unit.');
      return;
    }
    const seen = new Set<string>();
    for (const u of chosen) {
      const f = forms[u.id];
      if (f.mode === 'vault') {
        if (!f.vaultId) {
          setError(`Unit ${units.indexOf(u) + 1}: pick a credential.`);
          return;
        }
        if (seen.has(f.vaultId)) {
          setError('The same credential is selected for two units.');
          return;
        }
        seen.add(f.vaultId);
      } else if (u.credentialType === 'email_login') {
        if (!f.email.trim() || !f.password.trim()) {
          setError(`Unit ${units.indexOf(u) + 1}: enter email and password.`);
          return;
        }
      } else if (!f.secret.trim()) {
        setError(`Unit ${units.indexOf(u) + 1}: enter the ${getCredentialTypeLabel(u.credentialType).toLowerCase()}.`);
        return;
      }
    }

    for (const u of chosen) {
      const f = forms[u.id];
      const base = {
        customAdminNote: note,
      };
      if (f.mode === 'vault') {
        const v = vault.find((x) => x.id === f.vaultId);
        if (!v) continue;
        onFulfillDelivery(
          u.id,
          {
            ...base,
            secretValue: v.secretValue,
            email: v.email,
            password: v.password,
            profilePin: v.profilePin,
            vaultCredentialId: v.id,
          },
          false,
        );
      } else {
        const secret =
          u.credentialType === 'email_login'
            ? `${f.email.trim()} | ${f.password.trim()}`
            : f.secret.trim();
        onFulfillDelivery(
          u.id,
          {
            ...base,
            secretValue: secret,
            email: f.email.trim() || undefined,
            password: f.password.trim() || undefined,
            profilePin: f.pin.trim() || undefined,
          },
          false,
        );
      }
    }
    onClose();
  };

  const picked = new Set(
    Object.values(forms)
      .filter((f) => f.include && f.mode === 'vault' && f.vaultId)
      .map((f) => f.vaultId),
  );

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Send credentials · ${delivery.orderId}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <ul className="space-y-3">
          {units.map((u, i) => {
            const f = forms[u.id];
            if (!f) return null;
            const stock = stockFor(u);
            return (
              <li
                key={u.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.include}
                      onChange={(e) => patch(u.id, { include: e.target.checked })}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="text-sm font-semibold">
                      {units.length > 1 ? `${i + 1}. ` : ''}
                      {u.productName} · {u.variantName}
                    </span>
                  </label>
                  <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
                    {(['vault', 'custom'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patch(u.id, { mode: m })}
                        className={`px-3 h-8 cursor-pointer ${
                          f.mode === m
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m === 'vault' ? `Stock (${stock.length})` : 'Manual'}
                      </button>
                    ))}
                  </div>
                </div>

                {f.include ? (
                  f.mode === 'vault' ? (
                    stock.length > 0 ? (
                      <select
                        value={f.vaultId}
                        onChange={(e) => patch(u.id, { vaultId: e.target.value })}
                        className={`${field} font-mono`}
                      >
                        <option value="">Select credential</option>
                        {stock.map((v) => (
                          <option
                            key={v.id}
                            value={v.id}
                            disabled={picked.has(v.id) && f.vaultId !== v.id}
                          >
                            {v.secretValue.slice(0, 44)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        No stock for this plan. Use Manual.
                      </p>
                    )
                  ) : u.credentialType === 'email_login' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        className={`${field} font-mono`}
                        placeholder="Email"
                        value={f.email}
                        onChange={(e) => patch(u.id, { email: e.target.value })}
                      />
                      <input
                        className={`${field} font-mono`}
                        placeholder="Password"
                        value={f.password}
                        onChange={(e) => patch(u.id, { password: e.target.value })}
                      />
                      <input
                        className={`${field} font-mono`}
                        placeholder="Profile / PIN"
                        value={f.pin}
                        onChange={(e) => patch(u.id, { pin: e.target.value })}
                      />
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
          <label className="text-sm font-medium">Message to buyer</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-sm rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 px-5 text-sm font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {units.length > 1 ? 'Send selected' : 'Send'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
