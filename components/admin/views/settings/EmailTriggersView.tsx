'use client';

import React, { useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldAlert,
  Send,
  Zap,
  Power,
  RefreshCw,
} from 'lucide-react';
import { Card, SwitchToggle } from '@/components/admin/ui/primitives';
import type { NotificationTriggers, NotificationTriggerConfig } from '@/lib/email/config';

export default function EmailTriggersView() {
  const [triggers, setTriggers] = useState<NotificationTriggers | null>(null);
  const [provider, setProvider] = useState<string>('none');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const fetchTriggers = () => {
    setLoading(true);
    fetch('/api/admin/email/triggers')
      .then((r) => r.json())
      .then((d) => {
        if (d.triggers) {
          setTriggers(d.triggers);
          setProvider(d.provider);
          setIsReady(d.isReady);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const handleToggle = (key: keyof NotificationTriggers, subfield?: keyof NotificationTriggerConfig, val?: boolean) => {
    if (!triggers) return;
    if (key === 'masterEnabled') {
      setTriggers({ ...triggers, masterEnabled: !triggers.masterEnabled });
      return;
    }
    const current = triggers[key] as NotificationTriggerConfig;
    if (subfield) {
      setTriggers({
        ...triggers,
        [key]: {
          ...current,
          [subfield]: val !== undefined ? val : !(current as any)[subfield],
        },
      });
    }
  };

  const handleSubjectChange = (key: keyof NotificationTriggers, subject: string) => {
    if (!triggers || key === 'masterEnabled') return;
    const current = triggers[key] as NotificationTriggerConfig;
    setTriggers({
      ...triggers,
      [key]: {
        ...current,
        customSubject: subject,
      },
    });
  };

  const save = async () => {
    if (!triggers) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/email/triggers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggers }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ tone: 'ok', text: 'Email notification triggers saved successfully.' });
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to save triggers.' });
      }
    } catch {
      setFeedback({ tone: 'err', text: 'Network error saving triggers.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !triggers) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-12 text-center text-slate-500">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm">Loading trigger configurations...</p>
      </div>
    );
  }

  const triggerItems = [
    {
      key: 'orderPlaced' as const,
      title: 'Order Placed (Checkout)',
      description: 'Triggered immediately when a customer submits a new order.',
      hasAdmin: true,
      hasCustomer: true,
    },
    {
      key: 'paymentVerified' as const,
      title: 'Payment Verified & Delivered',
      description: 'Triggered when admin verifies the transaction and digital credentials unlock.',
      hasAdmin: false,
      hasCustomer: true,
    },
    {
      key: 'paymentRejected' as const,
      title: 'Payment Rejected / Failed',
      description: 'Triggered when admin marks payment as rejected or wrong TrxID.',
      hasAdmin: false,
      hasCustomer: true,
    },
    {
      key: 'renewalReminder' as const,
      title: 'Subscription Renewal Alert',
      description: 'Automated notification before digital service expiry (e.g. 5 days remaining).',
      hasAdmin: false,
      hasCustomer: true,
    },
    {
      key: 'warrantyClaim' as const,
      title: 'Warranty Claim / Support',
      description: 'Triggered when customer requests warranty replacement.',
      hasAdmin: true,
      hasCustomer: true,
    },
    {
      key: 'passwordReset' as const,
      title: 'Password Reset',
      description: 'Triggered when a user requests password reset from login.',
      hasAdmin: false,
      hasCustomer: true,
    },
    {
      key: 'emailVerification' as const,
      title: 'Sign-up Email Verification',
      description: 'Triggered when new customer registers and email verification is enforced.',
      hasAdmin: false,
      hasCustomer: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Automated Email Triggers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Control which transactional events trigger automatic emails to customers and administrators.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Triggers'}
        </button>
      </header>

      {/* Provider Readiness Warning if not ready */}
      {provider === 'none' || !isReady ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Email Provider Not Connected: </span>
            Currently, email provider is set to <strong>{provider}</strong> or credentials are missing. Emails will not actually be delivered until you configure an active provider in <strong>Email → Settings & SMTP</strong>.
          </div>
        </div>
      ) : null}

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            feedback.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
          }`}
        >
          {feedback.tone === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Master Toggle Card */}
      <Card className="border-2 border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                triggers.masterEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Power className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Master Automated Dispatch
              </h2>
              <p className="text-xs text-slate-500">
                Turn ON to permit system background jobs & checkout actions to dispatch emails.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                triggers.masterEnabled ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {triggers.masterEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <SwitchToggle
              checked={triggers.masterEnabled}
              onChange={() => handleToggle('masterEnabled')}
              label="Master Toggle"
            />
          </div>
        </div>
      </Card>

      {/* Triggers Breakdown List */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
          Trigger Rules & Recipients
        </h3>

        {triggerItems.map((item) => {
          const conf = triggers[item.key] as NotificationTriggerConfig;
          const isTriggerActive = triggers.masterEnabled && conf.enabled;

          return (
            <Card
              key={item.key}
              className={`p-4.5 transition-all ${
                !isTriggerActive ? 'opacity-70 dark:opacity-60' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${isTriggerActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isTriggerActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isTriggerActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>

                {/* Sub-toggles */}
                <div className="flex flex-wrap items-center gap-4">
                  {item.hasCustomer && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={conf.notifyCustomer}
                        onChange={(e) => handleToggle(item.key, 'notifyCustomer', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Customer
                    </label>
                  )}

                  {item.hasAdmin && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={conf.notifyAdmin}
                        onChange={(e) => handleToggle(item.key, 'notifyAdmin', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Admin Alert
                    </label>
                  )}

                  <div className="border-l border-slate-200 pl-4 dark:border-slate-800">
                    <SwitchToggle
                      checked={conf.enabled}
                      onChange={() => handleToggle(item.key, 'enabled')}
                      label={`Enable ${item.title}`}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Custom Subject override field */}
              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-400 shrink-0">Custom Subject:</span>
                <input
                  type="text"
                  value={conf.customSubject || ''}
                  onChange={(e) => handleSubjectChange(item.key, e.target.value)}
                  placeholder="Leave blank for default dynamic template subject"
                  className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-[11px] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
