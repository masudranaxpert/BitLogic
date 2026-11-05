'use client';

import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';

type CredentialSecretBoxProps = {
  id: string;
  loginEmail?: string;
  loginPassword?: string;
  profilePin?: string;
  secretText: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  allowReveal?: boolean;
};

export function CredentialSecretBox({
  id,
  loginEmail,
  loginPassword,
  profilePin,
  secretText,
  copiedId,
  onCopy,
  allowReveal = true,
}: CredentialSecretBoxProps) {
  const [revealed, setRevealed] = useState(!allowReveal);

  const displayValue =
    loginPassword && !revealed
      ? `${loginEmail} | ••••••••${profilePin ? ` | PIN: ${profilePin}` : ''}`
      : secretText;

  return (
    <div className="p-2.5 rounded-md bg-[#0F172A] text-slate-100 font-mono text-xs flex items-center justify-between gap-2.5">
      <span className="truncate text-slate-200 select-all font-semibold">
        {displayValue}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {allowReveal && loginPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer border-0 transition-colors"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            title={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => onCopy(id, secretText)}
          className="w-7 h-7 rounded bg-slate-800 hover:bg-[#FF5E5B] text-white flex items-center justify-center cursor-pointer border-0 transition-colors"
          aria-label="Copy credential"
          title={copiedId === id ? 'Copied' : 'Copy'}
        >
          {copiedId === id ? (
            <Check size={13} className="text-emerald-400" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>
    </div>
  );
}
