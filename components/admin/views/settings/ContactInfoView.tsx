'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/admin/ui/primitives';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '@/lib/store-settings';

type ContactDraft = Pick<
  StoreSettings,
  | 'whatsappNumber'
  | 'supportEmail'
  | 'telegramHandle'
  | 'supportHours'
  | 'facebookUrl'
  | 'youtubeUrl'
>;

const field =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

function pick(s: StoreSettings): ContactDraft {
  return {
    whatsappNumber: s.whatsappNumber,
    supportEmail: s.supportEmail,
    telegramHandle: s.telegramHandle,
    supportHours: s.supportHours,
    facebookUrl: s.facebookUrl,
    youtubeUrl: s.youtubeUrl,
  };
}

export default function ContactInfoView() {
  const [saved, setSaved] = useState<ContactDraft | null>(null);
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) {
          const merged = pick({ ...DEFAULT_STORE_SETTINGS, ...d.settings });
          setSaved(merged);
          setDraft(merged);
        } else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, []);

  const dirty = Boolean(
    saved && draft && JSON.stringify(saved) !== JSON.stringify(draft),
  );

  const set = <K extends keyof ContactDraft>(k: K, v: string) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setStatus('idle');
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.settings) {
        setStatus('error');
        return;
      }
      const next = pick(data.settings);
      setSaved(next);
      setDraft(next);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Contact
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Shown on the store footer and contact page. Leave a field empty to hide it.
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || busy || !draft}
          onClick={() => void save()}
          className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </header>

      {status === 'saved' ? (
        <p className="text-sm font-medium text-emerald-700">Saved.</p>
      ) : null}
      {status === 'error' ? (
        <p className="text-sm font-medium text-rose-600">Could not save contact info.</p>
      ) : null}

      {!draft ? (
        <Card className="p-5 text-sm text-slate-500">
          {status === 'error' ? 'Could not load settings.' : 'Loading…'}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid gap-4 px-5 py-4">
            {(
              [
                ['whatsappNumber', 'WhatsApp number', '017XXXXXXXX or +880…', 'text'],
                ['supportEmail', 'Support email', 'support@example.com', 'email'],
                ['telegramHandle', 'Telegram', '@yourchannel', 'text'],
                ['supportHours', 'Support hours', '10:00 AM – 2:00 AM (BDT)', 'text'],
                ['facebookUrl', 'Facebook URL', 'https://facebook.com/…', 'url'],
                ['youtubeUrl', 'YouTube URL', 'https://youtube.com/…', 'url'],
              ] as const
            ).map(([key, label, placeholder, type]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {label}
                </span>
                <input
                  type={type}
                  value={draft[key]}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                  className={`${field} h-10`}
                />
              </label>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
