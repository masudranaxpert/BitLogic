import React from 'react';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

export function BlockedIpNotice({ ip }: { ip: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-slate-100 font-sans select-none">
      <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-slate-900/90 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Lock className="w-3 h-3" />
            403 Forbidden
          </span>
          <h1 className="text-2xl font-bold font-display text-white">
            Access Restricted
          </h1>
          <p className="text-sm text-slate-400">
            Your IP address has been blocked due to security violations or rate limit abuse.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Client IP:</span>
            <span className="font-mono font-semibold text-rose-400">{ip}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Firewall Policy:</span>
            <span className="font-mono text-slate-300">WAF-RATE-DROP</span>
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-500">
          If you believe this is a mistake, contact our support team.
        </div>
      </div>
    </div>
  );
}
