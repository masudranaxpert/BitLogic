'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, User, CircleAlert, CircleCheck, X, Loader2 } from 'lucide-react';
import { writeCustomer } from '@/lib/customerSession';
import { PasswordField } from '@/components/storefront/features/PasswordField';
import { StoreButton, StoreInputField, StoreSurfaceCard } from '@/components/storefront/ui';
import { useStoreNav } from '@/context/StoreNavContext';

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
};

type AuthResponse = {
  error?: string;
  code?: string;
  user?: AuthUser;
  needsVerification?: boolean;
  emailSent?: boolean;
  email?: string;
  message?: string;
  available?: boolean;
  valid?: boolean;
};

type Mode = 'login' | 'register' | 'forgot' | 'reset';
type Notice = { tone: 'ok' | 'err'; text: string; resendFor?: string } | null;

async function readJson(res: Response): Promise<AuthResponse> {
  const text = await res.text();
  if (!text) {
    return { error: res.status >= 500 ? 'Server error. Please try again in a moment.' : 'Something went wrong.' };
  }
  try {
    return JSON.parse(text) as AuthResponse;
  } catch {
    return { error: 'Unexpected response from server.' };
  }
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Same rule as the server (lib/auth/password-policy.ts), checked early for quick feedback. */
function passwordHint(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/i.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers.';
  return null;
}

function Banner({ notice, onClose, onResend, resending }: { notice: NonNullable<Notice>; onClose: () => void; onResend?: () => void; resending?: boolean }) {
  const ok = notice.tone === 'ok';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
        }`}
      >
        {ok ? <CircleCheck size={13} strokeWidth={2.4} aria-hidden /> : <CircleAlert size={13} strokeWidth={2.4} aria-hidden />}
      </span>
      <div className="flex-1 pt-0.5">
        <p className="m-0 text-sm font-semibold leading-snug">{notice.text}</p>
        {notice.resendFor && onResend ? (
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="mt-1 border-0 bg-transparent p-0 text-sm font-bold underline underline-offset-2 cursor-pointer disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Send the link again'}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 -mr-0.5 -mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function LoginPageView() {
  const { loginMode, navigateTo } = useStoreNav();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const resetToken = pathname?.startsWith('/reset-password') ? searchParams.get('token') || '' : '';

  const [mode, setMode] = useState<Mode>(resetToken || pathname?.startsWith('/reset-password') ? 'reset' : loginMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [markCredentials, setMarkCredentials] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetAvailable, setResetAvailable] = useState<boolean | null>(null);
  const [resetLinkValid, setResetLinkValid] = useState<boolean | null>(null);

  // Messages from the email verification redirect.
  useEffect(() => {
    const v = searchParams.get('verified');
    if (v === '1') setNotice({ tone: 'ok', text: 'Email confirmed. You can sign in now.' });
    else if (v === 'invalid') {
      setNotice({ tone: 'err', text: 'That confirmation link is invalid or has expired. Sign in to get a new one.' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== 'forgot' || resetAvailable !== null) return;
    fetch('/api/auth/forgot-password', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: AuthResponse) => setResetAvailable(Boolean(d.available)))
      .catch(() => setResetAvailable(false));
  }, [mode, resetAvailable]);

  useEffect(() => {
    if (mode !== 'reset') return;
    if (!resetToken) {
      setResetLinkValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(resetToken)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: AuthResponse) => setResetLinkValid(Boolean(d.valid)))
      .catch(() => setResetLinkValid(false));
  }, [mode, resetToken]);

  const clearErrors = () => {
    setNotice((n) => (n?.tone === 'err' ? null : n));
    setFieldErrors({});
    setMarkCredentials(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setNotice(null);
    setFieldErrors({});
    setMarkCredentials(false);
    setPassword('');
    setConfirm('');
    if (next !== 'reset' && pathname?.startsWith('/reset-password')) {
      window.history.replaceState(null, '', '/login');
    }
  };

  const resendVerification = async (target: string) => {
    setResending(true);
    try {
      const res = await post('/api/auth/resend-verification', { email: target });
      const d = await readJson(res);
      setNotice(
        res.ok
          ? { tone: 'ok', text: `If ${target} still needs confirming, a new link is on its way. Check spam too.` }
          : { tone: 'err', text: d.error || 'Could not send. Try again later.', resendFor: target },
      );
    } finally {
      setResending(false);
    }
  };

  const goAfterSignIn = (user: AuthUser) => {
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      const next = searchParams.get('next');
      window.location.href = next && next.startsWith('/admin') ? next : '/admin';
      return;
    }
    writeCustomer({
      name: user.name || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
    });
    navigateTo('account');
  };

  const submitAuth = async () => {
    const errs: typeof fieldErrors = {};
    if (mode === 'register' && !name.trim()) errs.name = 'Enter your full name.';
    if (!email.trim()) errs.email = 'Enter your email address.';
    if (!password) errs.password = 'Enter your password.';
    else if (mode === 'register') {
      const hint = passwordHint(password);
      if (hint) errs.password = hint;
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setNotice({ tone: 'err', text: 'Please fix the highlighted fields.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const res = await post(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
      name: name.trim() || undefined,
      email: cleanEmail,
      password,
    });
    const data = await readJson(res);

    if (res.ok && data.needsVerification) {
      setMode('login');
      setPassword('');
      setNotice(
        data.emailSent
          ? { tone: 'ok', text: `Account created. We sent a confirmation link to ${cleanEmail}. Open it, then sign in.`, resendFor: cleanEmail }
          : { tone: 'err', text: 'Account created, but the confirmation email could not be sent.', resendFor: cleanEmail },
      );
      return;
    }
    if (!res.ok || !data.user) {
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        setNotice({ tone: 'err', text: data.error || 'Please confirm your email first.', resendFor: cleanEmail });
        return;
      }
      setNotice({
        tone: 'err',
        text:
          data.error ||
          (res.status === 401
            ? 'Invalid email or password.'
            : res.status === 409
              ? 'An account with this email already exists.'
              : 'Something went wrong. Please try again.'),
      });
      if (res.status === 401) setMarkCredentials(true);
      else if (res.status === 409) setFieldErrors({ email: 'Try a different email, or sign in instead.' });
      else if (res.status === 400 && mode === 'register' && /password/i.test(data.error || '')) {
        setFieldErrors({ password: data.error });
      }
      return;
    }
    goAfterSignIn(data.user);
  };

  const submitForgot = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: 'Enter your email address.' });
      return;
    }
    const res = await post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
    const d = await readJson(res);
    setNotice(
      res.ok
        ? { tone: 'ok', text: `If an account uses ${email.trim()}, a reset link is on its way. It works for 1 hour.` }
        : { tone: 'err', text: d.error || 'Could not send the link. Try again later.' },
    );
  };

  const submitReset = async () => {
    const errs: typeof fieldErrors = {};
    const hint = passwordHint(password);
    if (hint) errs.password = hint;
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    const res = await post('/api/auth/reset-password', { token: resetToken, password });
    const d = await readJson(res);
    if (!res.ok) {
      if (/password/i.test(d.error || '') && !/link/i.test(d.error || '')) setFieldErrors({ password: d.error });
      else setNotice({ tone: 'err', text: d.error || 'Could not reset the password.' });
      return;
    }
    switchMode('login');
    setNotice({ tone: 'ok', text: 'Password changed. Sign in with your new password.' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    clearErrors();
    try {
      if (mode === 'forgot') await submitForgot();
      else if (mode === 'reset') await submitReset();
      else await submitAuth();
    } catch {
      setNotice({ tone: 'err', text: 'Network error. Check your connection and try again.' });
    } finally {
      setPending(false);
    }
  };

  const title =
    mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Reset password' : mode === 'reset' ? 'Choose a new password' : 'Sign In';
  const submitLabel =
    mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Sign in';
  const pendingLabel =
    mode === 'register' ? 'Creating account…' : mode === 'forgot' ? 'Sending…' : mode === 'reset' ? 'Saving…' : 'Signing in…';

  const showForm =
    mode === 'login' || mode === 'register' || (mode === 'forgot' && resetAvailable !== false) || (mode === 'reset' && resetLinkValid === true);

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <StoreSurfaceCard className="p-5 sm:p-6 space-y-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-[#FF5E5B] text-white flex items-center justify-center mx-auto mb-2 font-extrabold text-base">
            B
          </div>
          <h1 className="font-display text-lg font-extrabold text-[#0F172A] m-0">{title}</h1>
          {mode === 'forgot' ? (
            <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a link to set a new password.</p>
          ) : null}
        </div>

        {mode === 'login' || mode === 'register' ? (
          <div className="flex bg-slate-100 p-1 rounded-md">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors cursor-pointer border-0 ${
                  mode === m ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold' : 'bg-transparent text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        ) : null}

        {notice ? (
          <Banner
            notice={notice}
            onClose={() => setNotice(null)}
            onResend={notice.resendFor ? () => resendVerification(notice.resendFor!) : undefined}
            resending={resending}
          />
        ) : null}

        {mode === 'forgot' && resetAvailable === false ? (
          <p className="m-0 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Password reset by email isn&apos;t available right now.{' '}
            <a href="/contact" className="font-bold text-[#0F172A] underline underline-offset-2">
              Contact support
            </a>{' '}
            and we&apos;ll reset it for you.
          </p>
        ) : null}

        {mode === 'reset' && resetLinkValid === null ? <p className="m-0 text-center text-sm text-slate-500">Checking your link…</p> : null}
        {mode === 'reset' && resetLinkValid === false ? (
          <div className="space-y-3 text-center">
            <p className="m-0 text-sm text-slate-700">This reset link is invalid or has expired. Links work once, for 1 hour.</p>
            <StoreButton type="button" variant="dark" size="lg" fullWidth onClick={() => switchMode('forgot')}>
              Get a new link
            </StoreButton>
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            {mode === 'register' && (
              <StoreInputField
                type="text"
                label="Full name"
                icon={User}
                required
                value={name}
                error={fieldErrors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) clearErrors();
                }}
                placeholder="Enter your name"
                autoComplete="name"
              />
            )}

            {mode !== 'reset' ? (
              <StoreInputField
                type="email"
                label="Email address"
                icon={Mail}
                required
                value={email}
                error={fieldErrors.email}
                invalid={markCredentials}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email || markCredentials) clearErrors();
                }}
                placeholder="name@example.com"
                autoComplete="email"
              />
            ) : null}

            {mode !== 'forgot' ? (
              <div>
                <PasswordField
                  label={mode === 'reset' ? 'New password' : 'Password'}
                  required
                  value={password}
                  invalid={markCredentials || Boolean(fieldErrors.password)}
                  error={fieldErrors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password || markCredentials) clearErrors();
                  }}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {(mode === 'register' || mode === 'reset') && !fieldErrors.password ? (
                  <p className="m-0 mt-1 text-sm text-slate-500">At least 8 characters, with letters and numbers.</p>
                ) : null}
              </div>
            ) : null}

            {mode === 'reset' ? (
              <PasswordField
                label="Confirm new password"
                required
                value={confirm}
                invalid={Boolean(fieldErrors.confirm)}
                error={fieldErrors.confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (fieldErrors.confirm) clearErrors();
                }}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            ) : null}

            {mode === 'login' ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="border-0 bg-transparent p-0 text-sm font-semibold text-slate-600 hover:text-[#0F172A] underline-offset-2 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            ) : null}

            <StoreButton type="submit" variant="dark" size="lg" fullWidth disabled={pending} aria-busy={pending || undefined}>
              {pending ? (
                <>
                  <Loader2 size={14} strokeWidth={2.4} className="animate-spin" />
                  <span>{pendingLabel}</span>
                </>
              ) : (
                <>
                  <span>{submitLabel}</span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </>
              )}
            </StoreButton>
          </form>
        ) : null}

        {mode === 'forgot' || mode === 'reset' ? (
          <p className="m-0 text-center text-sm">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="border-0 bg-transparent p-0 font-semibold text-slate-600 hover:text-[#0F172A] hover:underline underline-offset-2 cursor-pointer"
            >
              Back to sign in
            </button>
          </p>
        ) : null}
      </StoreSurfaceCard>
    </div>
  );
}
