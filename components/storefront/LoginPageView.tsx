'use client';

import React, { useState } from 'react';
import { User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { writeCustomer } from '@/lib/customerSession';
import { PasswordField } from './PasswordField';
import { StoreButton, StoreInputField, StoreSurfaceCard } from './ui';
import { useStoreNav } from './StoreNavContext';

export function LoginPageView() {
  const { loginMode, navigateTo } = useStoreNav();
  const [mode, setMode] = useState<'login' | 'register'>(loginMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleDemoUser = () => {
    writeCustomer({
      name: 'Masud Ahmed',
      email: 'masud132213@gmail.com',
      phone: '01712-345678',
    });
    navigateTo('account');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter email and password.');
      return;
    }
    writeCustomer({
      name: name || email.split('@')[0],
      email: email.trim().toLowerCase(),
      phone: '01712-345678',
    });
    navigateTo('account');
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

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
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
              setError('');
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

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'register' && (
            <StoreInputField
              type="text"
              label="Full name"
              icon={User}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          )}

          <StoreInputField
            type="email"
            label="Email address"
            icon={Mail}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />

          <div>
            <PasswordField
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9.5 pl-3 pr-9 rounded-md border border-slate-200 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#FF5E5B] focus:ring-2 focus:ring-[#FF5E5B]/15"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-[#FF5E5B] m-0">{error}</p>
          )}

          <StoreButton type="submit" variant="dark" size="lg" fullWidth>
            <span>{mode === 'register' ? 'Create account' : 'Sign in'}</span>
            <ArrowRight size={14} strokeWidth={2.4} />
          </StoreButton>
        </form>

        {/* Compact Quick Access Controls */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <StoreButton
            variant="soft-red"
            size="sm"
            fullWidth
            onClick={handleDemoUser}
          >
            <User size={13} />
            <span>Demo User</span>
          </StoreButton>

          <StoreButton
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => navigateTo('admin')}
          >
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Admin Panel</span>
          </StoreButton>
        </div>
      </StoreSurfaceCard>
    </div>
  );
}
