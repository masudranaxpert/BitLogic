'use client';

import React from 'react';
import { PhoneCall, Mail, Clock } from 'lucide-react';
import Facebook from '@thesvg/react/facebook';
import Youtube from '@thesvg/react/youtube';
import Whatsapp from '@thesvg/react/whatsapp';
import Telegram from '@thesvg/react/telegram';
import { useStoreNav } from '@/context/StoreNavContext';

export function StoreFooter() {
  const { navigateTo } = useStoreNav();

  return (
    <footer className="mt-14 px-4 sm:px-6 pb-20 md:pb-8">
      <div className="max-w-[1180px] mx-auto rounded-xl bg-white border border-slate-200/90 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
        {/* Main Footer Content: Brand + Social Icons on Left, Support + bKash/Nagad on Right */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Left: Brand & Official Brand SVGs */}
          <div className="space-y-4 max-w-md">
            <button
              type="button"
              onClick={() => navigateTo('home', { code: 'ALL' })}
              className="flex items-center gap-2.5 cursor-pointer border-0 bg-transparent p-0"
            >
              <span className="w-9 h-9 rounded-xl bg-[#FF5E5B] text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-[#FF5E5B]/25 rotate-[-4deg]">
                B
              </span>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#0F172A]">
                Bit<span className="text-[#FF5E5B]">logic</span>
              </span>
            </button>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              প্রিমিয়াম AI টুলস, স্ট্রিমিং মেম্বারশিপ, ক্রিয়েটিভ সফটওয়্যার এবং ওয়ার্কস্পেস
              সাবস্ক্রিপশনের বিশ্বস্ত প্ল্যাটফর্ম। প্রতিটি অর্ডারে ফুল মেয়াদের ওয়ারেন্টি ও দ্রুত সাপোর্ট।
            </p>

            <div className="pt-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                Follow & Connect
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                  className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-[#0866FF]/40 flex items-center justify-center transition-all shadow-2xs no-underline"
                >
                  <Facebook className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  title="YouTube"
                  className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-[#FF0000]/40 flex items-center justify-center transition-all shadow-2xs no-underline"
                >
                  <Youtube className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                  className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-[#25D366]/40 flex items-center justify-center transition-all shadow-2xs no-underline"
                >
                  <Whatsapp className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram"
                  title="Telegram"
                  className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-[#229ED9]/40 flex items-center justify-center transition-all shadow-2xs no-underline"
                >
                  <Telegram className="w-4.5 h-4.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right: Support & Official bKash / Nagad Payment Logos */}
          <div className="space-y-3 md:min-w-[280px]">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] m-0">
              Support & Payment
            </h3>

            <div className="space-y-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#FF5E5B] shrink-0" />
                <span>Support: 10:00 AM – 2:00 AM (BDT)</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall size={14} className="text-[#FF5E5B] shrink-0" />
                <span>WhatsApp Live Chat Available</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#FF5E5B] shrink-0" />
                <span>support@bitlogic.com.bd</span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Accepted Payment Methods
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-9.5 w-24 px-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs inline-flex items-center justify-center overflow-hidden">
                  <img
                    src="/payments/bkash.svg"
                    alt="bKash"
                    className="h-7 w-auto max-w-full object-contain"
                  />
                </span>
                <span className="h-9.5 w-24 px-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs inline-flex items-center justify-center overflow-hidden">
                  <img
                    src="/payments/nagad.jpeg"
                    alt="Nagad"
                    className="h-7 w-auto max-w-full object-contain"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Bottom Bar: Left Privacy Policy + Admin Access, Right Copyright */}
        <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('faq')}
              className="border-0 bg-transparent p-0 text-xs font-semibold text-slate-600 hover:text-[#FF5E5B] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>

          <p className="m-0">
            © 2026 <strong className="text-[#0F172A]">Bitlogic</strong>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
