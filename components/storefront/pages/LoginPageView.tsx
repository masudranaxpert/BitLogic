'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, User, CircleAlert, X, Loader2 } from 'lucide-react';
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

async function readAuthResponse(res: Response): Promise<{
  error?: string;
  user?: AuthUser;
}> {
  const text = await res.text();
  if (!text) {
    return {
      error:
        res.status >= 500
          ? 'Server error. Please try again in a moment.'
          : 'Something went wrong.',
    };
  }
  try {
    return JSON.parse(text) as { error?: string; user?: AuthUser };
  } catch {
    return { error: 'Unexpected response from server.' };
  }
}

export function LoginPageView() {
  const { loginMode, navigateTo } = useStoreNav();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(loginMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [markCredentials, setMarkCredentials] = useState(false);
  const [pending, setPending] = useState(false);

  const clearErrors = () => {
    setError('');
    setFieldErrors({});
    setMarkCredentials(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextFieldErrors: typeof fieldErrors = {};
    if (mode === 'register' && !name.trim()) {
      nextFieldErrors.name = 'Enter your full name.';
    }
    if (!email.trim()) {
      nextFieldErrors.email = 'Enter your email address.';
    }
    if (!password) {
      nextFieldErrors.password = 'Enter your password.';
    } else if (mode === 'register' && password.length < 6) {
      nextFieldErrors.password = 'Use at least 6 characters.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setMarkCredentials(false);
      setError('Please fix the highlighted fields.');
      return;
    }

    setPending(true);
    clearErrors();

    try {
      const endpoint =
        mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await readAuthResponse(res);

      if (!res.ok || !data.user) {
        const message =
          data.error ||
          (res.status === 401
            ? 'Invalid email or password.'
            : res.status === 409
              ? 'An account with this email already exists.'
              : 'Something went wrong. Please try again.');

        setError(message);
        if (res.status === 401) {
          setMarkCredentials(true);
        } else if (res.status === 409) {
          setFieldErrors({ email: 'Try a different email, or sign in instead.' });
        }
        return;
      }

      if (data.user.role === 'ADMIN') {
        const next = searchParams.get('next');
        window.location.href =
          next && next.startsWith('/admin') ? next : '/admin';
        return;
      }

      writeCustomer({
        name: data.user.name || data.user.email.split('@')[0],
        email: data.user.email,
        phone: data.user.phone || '',
      });
      navigateTo('account');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <StoreSurfaceCard className="p-5 sm:p-6 space-y-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-[#FF5E5B] text-white flex items-center justify-center mx-auto mb-2 font-extrabold text-base">
            B
          </div>
          <h1 className="font-display text-lg font-extrabold text-[#0F172A] m-0">
            {mode === 'register' ? 'Create Account' : 'Sign In'}
          </h1>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              clearErrors();
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer border-0 ${
              mode === 'login'
                ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold'
                : 'bg-transparent text-slate-500 hover:text-[#0F172A]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              clearErrors();
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer border-0 ${
              mode === 'register'
                ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold'
                : 'bg-transparent text-slate-500 hover:text-[#0F172A]'
            }`}
          >
            Register
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-800"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <CircleAlert size={13} strokeWidth={2.4} aria-hidden />
            </span>
            <p className="m-0 flex-1 text-[12px] font-semibold leading-snug pt-0.5">
              {error}
            </p>
            <button
              type="button"
              onClick={clearErrors}
              className="shrink-0 -mr-0.5 -mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-rose-500 hover:bg-rose-100 hover:text-rose-700 border-0 bg-transparent cursor-pointer"
              aria-label="Dismiss error"
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          </div>
        ) : null}

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
                if (error || fieldErrors.name) clearErrors();
              }}
              placeholder="Enter your name"
              autoComplete="name"
            />
          )}

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
              if (error || fieldErrors.email || markCredentials) clearErrors();
            }}
            placeholder="name@example.com"
            autoComplete="email"
          />

          <PasswordField
            label="Password"
            required
            value={password}
            invalid={markCredentials || Boolean(fieldErrors.password)}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error || fieldErrors.password || markCredentials) {
                clearErrors();
              }
            }}
            placeholder="••••••••"
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
          />

          <StoreButton
            type="submit"
            variant="dark"
            size="lg"
            fullWidth
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="animate-spin" />
                <span>
                  {mode === 'register' ? 'Creating account…' : 'Signing in…'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'register' ? 'Create account' : 'Sign in'}
                </span>
                <ArrowRight size={14} strokeWidth={2.4} />
              </>
            )}
          </StoreButton>
        </form>
      </StoreSurfaceCard>
    </div>
  );
}
