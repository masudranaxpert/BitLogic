'use client';

import React, { useEffect, useState } from 'react';
import { Card, StatusIndicator, SwitchToggle } from '@/components/admin/ui/primitives';

type Provider = 'none' | 'smtp' | 'resend' | 'brevo' | 'sendgrid' | 'postmark' | 'mailgun';
type Preset = { label: string; host: string; port: number; secure: boolean; hint: string };

type PublicConfig = {
  provider: Provider;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  requireVerification: boolean;
  smtp: {
    preset: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    hasPass: boolean;
  };
  apiKey: string;
  apiKeyHint: string;
  mailgunDomain: string;
  mailgunRegion: 'us' | 'eu';
  ready: boolean;
};

const PROVIDERS: { id: Provider; label: string; note: string }[] = [
  {
    id: 'none',
    label: 'Off',
    note: 'No emails are sent. Sign-up skips verification; password reset goes through support.',
  },
  { id: 'smtp', label: 'SMTP', note: 'Gmail, Outlook, Zoho, or any mail server.' },
  {
    id: 'resend',
    label: 'Resend',
    note: 'API key from resend.com → API Keys. Free: 3,000 emails/month.',
  },
  {
    id: 'brevo',
    label: 'Brevo',
    note: 'API key from Brevo → SMTP & API → API Keys. Free: 300 emails/day.',
  },
  { id: 'sendgrid', label: 'SendGrid', note: 'API key with Mail Send permission.' },
  { id: 'postmark', label: 'Postmark', note: 'Server API token.' },
  {
    id: 'mailgun',
    label: 'Mailgun',
    note: 'Private API key and your sending domain.',
  },
];

const field =
  'w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export default function EmailSettingsView() {
  const [presets, setPresets] = useState<Record<string, Preset>>({});
  const [saved, setSaved] = useState<PublicConfig | null>(null);
  const [draft, setDraft] = useState<PublicConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/email', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.config) {
          setMsg({ tone: 'err', text: 'Could not load email settings.' });
          return;
        }
        setPresets(d.presets || {});
        setSaved(d.config);
        setDraft(d.config);
      })
      .catch(() => setMsg({ tone: 'err', text: 'Could not load email settings.' }));
  }, []);

  if (!draft || !saved) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <header>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Email
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Provider, sender identity, and sign-up verification.
          </p>
        </header>
        <Card className="p-5 text-sm text-slate-500">
          {msg?.text || 'Loading…'}
        </Card>
      </div>
    );
  }

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = (patch: Partial<PublicConfig>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setMsg(null);
  };
  const setSmtp = (patch: Partial<PublicConfig['smtp']>) =>
    set({ smtp: { ...draft.smtp, ...patch } });
  const pickPreset = (id: string) => {
    const p = presets[id];
    if (!p) return;
    setSmtp({
      preset: id,
      host: p.host || draft.smtp.host,
      port: p.port,
      secure: p.secure,
      user: id === 'sendgrid' ? 'apikey' : draft.smtp.user,
    });
  };
  const provider = PROVIDERS.find((p) => p.id === draft.provider) ?? PROVIDERS[0];
  const usesApiKey = !['none', 'smtp'].includes(draft.provider);
  const preset = presets[draft.smtp.preset];
  const providerLabel =
    PROVIDERS.find((p) => p.id === saved.provider)?.label ?? saved.provider;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.config) throw new Error(d?.error || 'Could not save.');
      setSaved(d.config);
      setDraft(d.config);
      setMsg({
        tone: 'ok',
        text:
          d.config.ready || d.config.provider === 'none'
            ? 'Saved.'
            : 'Saved — finish the missing fields to start sending.',
      });
    } catch (e) {
      setMsg({
        tone: 'err',
        text: e instanceof Error ? e.message : 'Could not save.',
      });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || 'Test email failed.');
      setMsg({
        tone: 'ok',
        text: `Test sent${testTo.trim() ? ` to ${testTo.trim()}` : ''}. Check inbox and spam.`,
      });
    } catch (e) {
      setMsg({
        tone: 'err',
        text: e instanceof Error ? e.message : 'Test email failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Email
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            How BitLogic sends verification, password reset, and system mail.
          </p>
        </div>
        {saved.provider === 'none' ? (
          <StatusIndicator tone="zinc" label="Off" />
        ) : saved.ready ? (
          <StatusIndicator tone="emerald" label={`Live · ${providerLabel}`} />
        ) : (
          <StatusIndicator tone="amber" label="Not ready" />
        )}
      </header>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold">Provider</h2>
          <p className="mt-0.5 text-sm text-slate-500">{provider.note}</p>
        </div>
        <div className="px-5 py-4">
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Email provider"
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={draft.provider === p.id}
                onClick={() => set({ provider: p.id })}
                className={`h-10 rounded-md border text-sm font-semibold cursor-pointer ${
                  draft.provider === p.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {draft.provider === 'smtp' ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold">SMTP</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Server login for the mail host you use.
            </p>
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Mail service" hint={preset?.hint || undefined}>
              <select
                value={draft.smtp.preset}
                onChange={(e) => pickPreset(e.target.value)}
                className={field}
              >
                {Object.entries(presets).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field label="Host">
                <input
                  value={draft.smtp.host}
                  onChange={(e) => setSmtp({ host: e.target.value.trim() })}
                  className={field}
                  placeholder="smtp.example.com"
                />
              </Field>
              <Field label="Port">
                <input
                  inputMode="numeric"
                  value={String(draft.smtp.port)}
                  onChange={(e) => {
                    const port =
                      Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                    setSmtp({ port, secure: port === 465 });
                  }}
                  className={`${field} tabular-nums`}
                />
              </Field>
            </div>
            <Field label="Username">
              <input
                value={draft.smtp.user}
                onChange={(e) => setSmtp({ user: e.target.value.trim() })}
                className={field}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Password"
              hint={saved.smtp.hasPass ? 'Saved. Leave empty to keep it.' : undefined}
            >
              <input
                type="password"
                value={draft.smtp.pass}
                onChange={(e) => setSmtp({ pass: e.target.value })}
                className={field}
                autoComplete="new-password"
                placeholder={saved.smtp.hasPass ? '••••••••' : ''}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {usesApiKey ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold">API</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Credentials for {provider.label}.
            </p>
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field
              label="API key"
              hint={
                saved.apiKeyHint
                  ? `Saved (${saved.apiKeyHint}). Leave empty to keep it.`
                  : undefined
              }
            >
              <input
                type="password"
                value={draft.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
                className={field}
                autoComplete="new-password"
                placeholder={saved.apiKeyHint || ''}
              />
            </Field>
            {draft.provider === 'mailgun' ? (
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <Field label="Sending domain">
                  <input
                    value={draft.mailgunDomain}
                    onChange={(e) =>
                      set({ mailgunDomain: e.target.value.trim() })
                    }
                    className={field}
                    placeholder="mg.example.com"
                  />
                </Field>
                <Field label="Region">
                  <select
                    value={draft.mailgunRegion}
                    onChange={(e) =>
                      set({
                        mailgunRegion: e.target.value as 'us' | 'eu',
                      })
                    }
                    className={field}
                  >
                    <option value="us">US</option>
                    <option value="eu">EU</option>
                  </select>
                </Field>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {draft.provider !== 'none' ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold">Sender</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              From name and address customers see in their inbox.
            </p>
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
            <Field label="Name">
              <input
                value={draft.fromName}
                onChange={(e) => set({ fromName: e.target.value })}
                className={field}
                maxLength={60}
              />
            </Field>
            <Field
              label="Email"
              hint="Must be verified with your provider."
            >
              <input
                type="email"
                value={draft.fromEmail}
                onChange={(e) => set({ fromEmail: e.target.value.trim() })}
                className={field}
                placeholder="no-reply@yourdomain.com"
              />
            </Field>
            <Field label="Reply-to">
              <input
                type="email"
                value={draft.replyTo}
                onChange={(e) => set({ replyTo: e.target.value.trim() })}
                className={field}
                placeholder="support@yourdomain.com"
              />
            </Field>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">
              Verify on sign-up
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              New customers must click the email link before they can sign in.
              Only applies while a provider is ready.
            </p>
          </div>
          <SwitchToggle
            checked={draft.requireVerification}
            onChange={(v) => set({ requireVerification: v })}
            label={draft.requireVerification ? 'On' : 'Off'}
          />
        </div>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:bottom-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Test to (your email)"
            aria-label="Test email recipient"
            className={`${field} max-w-xs`}
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || dirty || !saved.ready}
            title={
              dirty ? 'Save first' : !saved.ready ? 'Finish setup first' : undefined
            }
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium hover:border-emerald-600 disabled:cursor-default disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
          >
            {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {msg ? (
            <span
              className={`text-sm ${
                msg.tone === 'ok'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600'
              }`}
              role="status"
            >
              {msg.text}
            </span>
          ) : null}
          {dirty ? (
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setMsg(null);
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
            >
              Discard
            </button>
          ) : null}
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={save}
            className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-default disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
