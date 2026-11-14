'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Card } from '@/components/admin/ui/primitives';
import {
  canChangeOwnEmail,
  STAFF_PERMISSIONS,
} from '@/lib/auth/permissions';
import type { ConsoleUser } from '@/components/admin/shell/admin-nav-types';

const inputClass =
  'w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900/70 dark:disabled:text-slate-400';

const PERM_LABEL_BY_KEY = new Map<string, string>(
  STAFF_PERMISSIONS.map((p) => [p.key, p.label]),
);

export default function ProfileSettingsView({
  user,
  onUpdated,
  onBack,
  showToast,
}: {
  user: ConsoleUser | null;
  onUpdated: (nextUser: ConsoleUser) => void;
  onBack: () => void;
  showToast?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setEmail(user.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError('');
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
        Loading account details…
      </div>
    );
  }

  const canEditEmail = canChangeOwnEmail(user.role, user.permissions);
  const emailChanged =
    email.trim().toLowerCase() !== user.email.trim().toLowerCase();
  const passwordChanged = newPassword.length > 0;
  const needsCurrentPassword = (canEditEmail && emailChanged) || passwordChanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedNotice(false);

    if (canEditEmail && emailChanged) {
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    if (passwordChanged && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (needsCurrentPassword && !currentPassword) {
      setError(
        'Enter your current password to confirm an email or password change.',
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(canEditEmail ? { email: email.trim().toLowerCase() } : {}),
          ...(needsCurrentPassword ? { currentPassword } : {}),
          ...(passwordChanged ? { newPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update profile.');
      }
      if (data?.user) {
        onUpdated(data.user as ConsoleUser);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSavedNotice(true);
      showToast?.('Profile settings updated');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update profile.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
            Profile Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">
            Manage your console display name, login email, and password.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-4 p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <BrandLogo mark className="h-7 w-auto" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.name || user.email}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                    user.isFullAdmin
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" aria-hidden />
                  {user.isFullAdmin ? 'Full Admin' : 'Staff'}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mt-1">
                {user.email}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Account type</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {user.isFullAdmin ? 'Full Administrator' : 'Staff Member'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Email changes</span>
              <span
                className={
                  canEditEmail
                    ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                    : 'font-medium text-slate-600 dark:text-slate-400'
                }
              >
                {canEditEmail ? 'Allowed' : 'Locked by Admin'}
              </span>
            </div>
          </div>

          {!user.isFullAdmin ? (
            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Assigned Permissions
              </div>
              {user.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      {PERM_LABEL_BY_KEY.get(perm) || perm}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  No additional staff permissions assigned.
                </p>
              )}
            </div>
          ) : null}
        </Card>

        <Card className="lg:col-span-8 p-5 sm:p-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Account &amp; Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-0">
                Changes to your display name or login email update your active session right away.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            ) : null}

            {savedNotice && !error ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                <span>Your profile settings have been saved.</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-name"
                  className="admin-label flex items-center gap-1.5 mb-1.5"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSavedNotice(false);
                  }}
                  placeholder="Super Admin"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="profile-email"
                    className="admin-label flex items-center gap-1.5 m-0"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                    Login Email
                  </label>
                  {canEditEmail ? (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Editable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Lock className="w-3 h-3" aria-hidden />
                      Locked
                    </span>
                  )}
                </div>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  disabled={!canEditEmail}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSavedNotice(false);
                  }}
                  placeholder="admin@blumartbd.com"
                  className={`${inputClass} font-mono`}
                />
                {!canEditEmail ? (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed m-0">
                    Only a Full Admin or staff with the{' '}
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">
                      Change own email
                    </strong>{' '}
                    permission can update their login email.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Password &amp; Verification
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {needsCurrentPassword
                    ? 'Current password required'
                    : 'Leave new password blank to keep current'}
                </span>
              </div>

              <div>
                <label htmlFor="profile-current-password" className="admin-label block mb-1.5">
                  Current Password{needsCurrentPassword ? ' *' : ''}
                </label>
                <div className="relative">
                  <input
                    id="profile-current-password"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required={needsCurrentPassword}
                    autoComplete="current-password"
                    placeholder={
                      needsCurrentPassword
                        ? 'Enter your current password to confirm'
                        : 'Only needed for email or password changes'
                    }
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrent ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-new-password" className="admin-label block mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min 10 characters"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-confirm-password"
                    className="admin-label block mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="profile-confirm-password"
                    type={showNew ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onBack}
                className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
