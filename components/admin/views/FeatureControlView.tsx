'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, StatusIndicator, SwitchToggle } from '@/components/admin/ui/primitives';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '@/lib/store-settings';

type Settings = StoreSettings;

const field =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  tone,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone: 'red' | 'amber' | 'emerald';
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {checked ? <StatusIndicator tone={tone} label="On" /> : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <SwitchToggle
          checked={checked}
          onChange={onChange}
          label={checked ? 'On' : 'Off'}
        />
      </div>
      {children}
    </div>
  );
}

export default function FeatureControlView() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) {
          const merged = { ...DEFAULT_STORE_SETTINGS, ...d.settings };
          setSaved(merged);
          setDraft(merged);
        } else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, []);

  const dirty = Boolean(
    saved && draft && JSON.stringify(saved) !== JSON.stringify(draft),
  );
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setStatus('idle');
  };

  const save = async () => {
    if (!draft) return;
    if (draft.maintenanceMode && !saved?.maintenanceMode) {
      if (
        !window.confirm(
          'Turn on maintenance mode? Customers will see the maintenance page.',
        )
      ) {
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.settings) throw new Error();
      setSaved(d.settings);
      setDraft(d.settings);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Store status, announcement bar and renewal windows. Site title and homepage banners are under Storefront.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:border-emerald-600 dark:border-slate-800 dark:bg-slate-900"
        >
          View store <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </header>

      {!draft ? (
        status === 'error' ? (
          <Card className="p-6 text-sm text-center space-y-3">
            <p className="text-rose-600 dark:text-rose-400 font-medium m-0">Could not load settings.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-emerald-600 cursor-pointer"
            >
              Retry
            </button>
          </Card>
        ) : (
          <Card className="overflow-hidden divide-y divide-slate-200/80 dark:divide-slate-800" aria-busy="true">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800 space-y-1.5">
              <div className="h-5 w-32 rounded bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
              <div className="h-4 w-72 rounded bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="h-4 w-40 rounded bg-slate-200/80 dark:bg-slate-700" />
                  <div className="h-3 w-64 rounded bg-slate-200/50 dark:bg-slate-800" />
                </div>
                <div className="h-6 w-11 rounded-full bg-slate-200/70 dark:bg-slate-800 shrink-0" />
              </div>
            ))}
          </Card>
        )
      ) : (
        <>
          <Card className="overflow-hidden divide-y divide-slate-200/80 dark:divide-slate-800">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold">
                Store status
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Close the shop or pause checkout without touching live orders.
              </p>
            </div>
            <ToggleRow
              title="Maintenance mode"
              description="Customers see a maintenance page. Admins can still browse."
              checked={draft.maintenanceMode}
              onChange={(v) => set('maintenanceMode', v)}
              tone="red"
            >
              {draft.maintenanceMode ? (
                <textarea
                  rows={2}
                  value={draft.maintenanceMessage}
                  onChange={(e) => set('maintenanceMessage', e.target.value)}
                  aria-label="Maintenance message"
                  placeholder="We’ll be back shortly…"
                  className={field}
                />
              ) : null}
            </ToggleRow>
            <ToggleRow
              title="Pause new orders"
              description="Catalog stays open; checkout is closed. Chat and renewals still work."
              checked={draft.ordersPaused}
              onChange={(v) => set('ordersPaused', v)}
              tone="amber"
            >
              {draft.ordersPaused ? (
                <textarea
                  rows={2}
                  value={draft.ordersPausedMessage}
                  onChange={(e) => set('ordersPausedMessage', e.target.value)}
                  aria-label="Message shown while orders are paused"
                  placeholder="Checkout is temporarily closed."
                  className={field}
                />
              ) : null}
            </ToggleRow>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold">
                Storefront
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                One-line banner above the store header.
              </p>
            </div>
            <ToggleRow
              title="Announcement bar"
              description="Short promo or notice for every visitor."
              checked={draft.announcementEnabled}
              onChange={(v) => set('announcementEnabled', v)}
              tone="emerald"
            >
              <div className="space-y-1.5">
                <input
                  value={draft.announcementText}
                  onChange={(e) => set('announcementText', e.target.value)}
                  placeholder="Eid offer: 10% off all AI tools"
                  maxLength={160}
                  aria-label="Announcement text"
                  disabled={!draft.announcementEnabled}
                  className={`${field} h-10 disabled:opacity-50`}
                />
                <div className="text-right text-xs tabular-nums text-slate-400">
                  {draft.announcementText.length}/160
                </div>
              </div>
            </ToggleRow>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold">Renewals</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                When customers can renew before and after an item ends.
              </p>
            </div>
            <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Opens before end
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(draft.renewOpenDaysBefore ?? 0)}
                    onChange={(e) =>
                      set(
                        'renewOpenDaysBefore',
                        Math.min(
                          365,
                          Number(e.target.value.replace(/[^0-9]/g, '')) || 0,
                        ),
                      )
                    }
                    className={`${field} h-10 w-24 tabular-nums font-semibold`}
                  />
                  <span className="text-sm text-slate-500">days</span>
                </span>
                <span className="block text-xs text-slate-500">
                  Renew button shows this many days before expiry.
                </span>
              </label>
              <label className="space-y-1.5">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Grace after end
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(draft.renewGraceDaysAfter ?? 0)}
                    onChange={(e) =>
                      set(
                        'renewGraceDaysAfter',
                        Math.min(
                          365,
                          Number(e.target.value.replace(/[^0-9]/g, '')) || 0,
                        ),
                      )
                    }
                    className={`${field} h-10 w-24 tabular-nums font-semibold`}
                  />
                  <span className="text-sm text-slate-500">days</span>
                </span>
                <span className="block text-xs text-slate-500">
                  Still renewable after end; then a new order is required.
                </span>
              </label>
            </div>
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
              Warranty follows each paid period from delivery — early renewals
              never stack.
            </div>
          </Card>

          {dirty || status !== 'idle' ? (
            <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:bottom-4">
              {status === 'saved' && !dirty ? (
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  Saved
                </span>
              ) : null}
              {status === 'error' ? (
                <span className="text-sm text-rose-600">
                  Could not save. Try again.
                </span>
              ) : null}
              {dirty ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(saved);
                    setStatus('idle');
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
          ) : null}
        </>
      )}
    </div>
  );
}
