'use client';

import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, Mail } from 'lucide-react';

type Status = { hasAccount: boolean; isStaff: boolean; emailVerified: boolean; emailReady: boolean };

const field =
  'w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

/**
 * Sign-in help for a customer. Admins never see the current password —
 * they can only email a reset link or set a new one (shown once).
 */
export function CustomerPasswordPanel({ email }: { email: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<'idle' | 'set'>('idle');
  const [password, setPassword] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStatus(null);
    setIssued(null);
    setMsg(null);
    setMode('idle');
    fetch(`/api/admin/customers/password?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, [email]);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/customers/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...body }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || 'Something went wrong.');
      return d;
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Something went wrong.' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async () => {
    const d = await call({ mode: 'email' });
    if (d) setMsg({ tone: 'ok', text: `Reset link sent to ${email}. It works for 1 hour.` });
  };

  const setNew = async () => {
    const d = await call({ mode: 'set', password: password.trim() || undefined, notify });
    if (!d) return;
    setIssued(d.password);
    setPassword('');
    setMode('idle');
    setStatus((s) => (s ? { ...s, emailVerified: true } : s));
    setMsg({
      tone: 'ok',
      text: d.notified
        ? 'Password changed. The customer got an email, and was signed out everywhere.'
        : 'Password changed. The customer was signed out everywhere.',
    });
  };

  return (
    <section className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-400" aria-hidden /> Sign-in
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {!status
              ? 'Checking…'
              : status.isStaff
                ? 'This email belongs to a staff account. Manage it from Staff.'
                : !status.hasAccount
                  ? 'No login yet. The customer can create one from the sign-up page with this email.'
                  : status.emailVerified
                    ? 'Has a login. Email verified.'
                    : 'Has a login. Email not verified yet.'}
          </p>
        </div>
        {status?.hasAccount ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={sendLink}
              disabled={busy || !status.emailReady}
              title={status.emailReady ? undefined : 'Set up email in Settings first'}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:border-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 cursor-pointer disabled:cursor-default"
            >
              <Mail className="h-4 w-4" aria-hidden /> Email reset link
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'set' ? 'idle' : 'set');
                setMsg(null);
                setIssued(null);
              }}
              disabled={busy}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
            >
              Set new password
            </button>
          </div>
        ) : null}
      </div>

      {mode === 'set' ? (
        <div className="mt-4 space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">New password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty to generate one"
              autoComplete="off"
              className={`${field} font-mono`}
            />
            <span className="block text-sm text-slate-500">At least 8 characters with letters and numbers.</span>
          </label>
          {status?.emailReady ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Email the customer that their password was changed (the password itself is not sent)
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="h-9 rounded-md border border-slate-200 px-4 text-sm font-medium dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={setNew}
              disabled={busy}
              className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </div>
      ) : null}

      {issued ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <span className="text-sm">New password:</span>
          <code className="rounded bg-white px-2 py-1 font-mono text-sm dark:bg-slate-900">{issued}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(issued);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? 'Copied' : 'Copy'}
          </button>
          <span className="w-full text-sm text-slate-600 dark:text-slate-400">
            Shown only now. Share it privately and ask the customer to change it from their account.
          </span>
        </div>
      ) : null}

      {msg ? (
        <p role="status" className={`mt-3 text-sm ${msg.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}
