'use client';

import React from 'react';
import {
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Database,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/admin/ui/Card';

const RULES = [
  {
    name: 'Customer & Staff Login Brute-Force Guard',
    endpoint: '/api/auth/login',
    tier: 'Dual Tier: IP + Email Pair',
    limit: '8 attempts per 15 mins (pair) / 40 attempts per 15 mins (IP)',
    action: '429 Too Many Requests with Retry-After header',
    mode: 'L1 In-Memory Sliding Window',
  },
  {
    name: 'Customer Registration Spam Guard',
    endpoint: '/api/auth/register',
    tier: 'Network IP Rate Limit',
    limit: '10 sign-ups per 60 mins',
    action: '429 Too Many Requests',
    mode: 'L1 In-Memory Sliding Window',
  },
  {
    name: 'Storefront Order Placement Guard',
    endpoint: '/api/orders',
    tier: 'Checkout DDoS & Spammer Protection',
    limit: '15 orders per 10 mins',
    action: '429 Too Many Requests',
    mode: 'L1 In-Memory Sliding Window',
  },
  {
    name: 'Subscription Renewal Transaction Guard',
    endpoint: '/api/orders/renew',
    tier: 'TrxID & Replay Protection',
    limit: '15 renewal submissions per 10 mins',
    action: '429 Too Many Requests',
    mode: 'L1 In-Memory Sliding Window',
  },
  {
    name: 'Password Reset Token Exhaustion Guard',
    endpoint: '/api/auth/reset-password',
    tier: 'Credential Stuffing Guard',
    limit: '10 requests per 15 mins',
    action: '429 Too Many Requests',
    mode: 'L1 In-Memory Sliding Window',
  },
  {
    name: 'Automatic IP Escalation & Blacklisting',
    endpoint: 'System-Wide',
    tier: 'Threat Actor Isolation',
    limit: '15 cumulative rate-limit violations',
    action: 'Auto-promoted to Blocked Status (403 Forbidden)',
    mode: 'L1 Memory Fast-Drop + L2 DB Rule Sync',
  },
];

export function SecurityRulesView() {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-50">
          Active Defense Rules & Thresholds
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect and audit the active boundary policies, rate limits, and zero-latency fast-path rules.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RULES.map((rule, idx) => (
          <Card key={idx} className="p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {rule.mode}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 pt-1">
                  {rule.name}
                </h3>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Target:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {rule.endpoint}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Threshold:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 text-right">
                  {rule.limit}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Action:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-right">
                  {rule.action}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
