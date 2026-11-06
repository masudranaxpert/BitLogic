'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { VaultCredential } from '@/lib/admin-data';
import {
  Card,
  getCredentialTypeLabel,
  StatusIndicator,
  BBCodeEditor,
} from '@/components/admin/ui/primitives';

type VaultCredentialEditViewProps = {
  item: VaultCredential | null;
  onBack: () => void;
  onSave: (next: VaultCredential) => void;
};

export default function VaultCredentialEditView({
  item,
  onBack,
  onSave,
}: VaultCredentialEditViewProps) {
  const [secretValue, setSecretValue] = useState(item?.secretValue || '');
  const [email, setEmail] = useState(item?.email || '');
  const [password, setPassword] = useState(item?.password || '');
  const [profilePin, setProfilePin] = useState(item?.profilePin || '');
  const [validDays, setValidDays] = useState(item?.validDays ?? 30);
  const [noteBBCode, setNoteBBCode] = useState(item?.noteBBCode || '');

  if (!item) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer dark:border-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Credentials
        </button>
        <Card className="p-8 text-center text-sm text-slate-500">
          Credential not found.
        </Card>
      </div>
    );
  }

  const isEmail = item.credentialType === 'email_login';
  const locked = item.status !== 'available';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextSecret = secretValue.trim();
    if (isEmail) {
      const em = email.trim();
      const pw = password.trim();
      if (!em || !pw) return;
      nextSecret = `${em} | ${pw}`;
    } else if (!nextSecret) {
      return;
    }

    const days = Math.max(1, validDays || 30);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const exp = new Date(now);
    exp.setDate(exp.getDate() + days);
    const expiresAt = `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())}`;

    onSave({
      ...item,
      secretValue: locked ? item.secretValue : nextSecret,
      email: isEmail ? (locked ? item.email : email.trim()) : undefined,
      password: isEmail ? (locked ? item.password : password.trim()) : undefined,
      profilePin: isEmail
        ? locked
          ? item.profilePin
          : profilePin.trim() || undefined
        : undefined,
      validDays: days,
      expiresAt,
      noteBBCode: noteBBCode.trim() || undefined,
    });
    onBack();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Credentials
        </button>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Edit · {item.productName}
          </h1>
          {item.status === 'available' ? (
            <StatusIndicator tone="emerald" label="Available" />
          ) : item.status === 'expired' ? (
            <StatusIndicator tone="red" label="Expired" />
          ) : item.status === 'replaced' ? (
            <StatusIndicator tone="blue" label="Replaced" />
          ) : (
            <StatusIndicator tone="zinc" label="Delivered" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {item.variantName}
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {getCredentialTypeLabel(item.credentialType)}
          </span>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            {item.id}
          </span>
        </div>
      </div>

      <Card className="p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">

            {locked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Secret locked
              </div>
            ) : null}

            {isEmail ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    required={!locked}
                    disabled={locked}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    type="text"
                    required={!locked}
                    disabled={locked}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    PIN
                  </label>
                  <input
                    type="text"
                    disabled={locked}
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Secret
                </label>
                <textarea
                  required={!locked}
                  disabled={locked}
                  rows={3}
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                Valid days
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={validDays}
                onChange={(e) =>
                  setValidDays(Math.max(1, Number(e.target.value) || 30))
                }
                className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 font-mono dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <BBCodeEditor
              label="Description"
              value={noteBBCode}
              onChange={setNoteBBCode}
              rows={4}
              placeholder="Note for the buyer…"
            />

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Added {item.addedAt}
              {item.batchNote ? ` · ${item.batchNote}` : ''}
              {item.expiresAt ? ` · Expires ${item.expiresAt}` : ''}
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onBack}
                className="h-9 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 cursor-pointer rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </form>
      </Card>
    </div>
  );
}
