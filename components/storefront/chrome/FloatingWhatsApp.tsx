'use client';

import React from 'react';
import Whatsapp from '@thesvg/react/whatsapp';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { whatsappHref } from '@/lib/whatsapp';

export function FloatingWhatsApp() {
  const { whatsappNumber } = useStoreSettings();
  const href = whatsappHref(
    whatsappNumber,
    'Hi Blumartbd! I have a question about a product.',
  );

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 inline-flex h-12 w-12 sm:w-auto sm:px-4 items-center justify-center gap-2.5 rounded-full bg-white text-slate-900 border border-slate-200/90 shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)] hover:border-[#25D366]/60 hover:shadow-[0_14px_32px_-6px_rgba(37,211,102,0.28)] hover:-translate-y-0.5 active:translate-y-0 transition-all no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
    >
      <Whatsapp className="h-6 w-6 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-xs font-semibold tracking-tight whitespace-nowrap">
        Chat on WhatsApp
      </span>
    </a>
  );
}
