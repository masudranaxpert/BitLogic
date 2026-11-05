'use client';

import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type QoModalShellProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function QoModalShell({ title, onClose, children }: QoModalShellProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F172A]/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="fixed inset-0 border-0 bg-transparent cursor-pointer m-0 p-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full sm:max-w-[480px] max-h-[92dvh] overflow-y-auto overscroll-contain bg-white rounded-t-xl sm:rounded-lg border border-slate-200 shadow-2xl shadow-slate-950/25"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#0F172A] flex items-center justify-center border-0 cursor-pointer transition-colors"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
