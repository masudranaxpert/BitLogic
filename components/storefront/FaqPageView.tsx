'use client';

import React, { useState } from 'react';
import { Plus, Minus, MessageCircle } from 'lucide-react';
import { useStoreNav } from './StoreNavContext';

const faqs = [
  {
    q: 'How do I place an order?',
    a: 'Select any product from the catalog, choose your preferred option and duration, and click "Quick order" or "Add to cart" to complete checkout.',
  },
  {
    q: 'How do I pay with bKash or Nagad?',
    a: 'During checkout, choose bKash or Nagad. Send the total BDT amount to the listed number and enter your Transaction ID (TrxID).',
  },
  {
    q: 'What warranty is included?',
    a: 'Each option clearly shows its warranty badge (such as 25D Warranty, 28D Warranty, or Login Warranty Only) along with the account usage guidelines before you order.',
  },
  {
    q: 'How can I contact support?',
    a: 'You can reach our team directly via WhatsApp, Telegram, or the Contact page during support hours (10:00 AM – 2:00 AM BDT).',
  },
];

export function FaqPageView() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { navigateTo } = useStoreNav();

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight m-0">
          Frequently Asked Questions
        </h1>
      </div>

      <div className="space-y-2.5">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-white rounded-lg border border-slate-200/90 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-[#0F172A] cursor-pointer hover:bg-slate-50 transition-colors border-0 bg-transparent"
              >
                <span>{faq.q}</span>
                <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 ml-3 text-slate-600">
                  {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-2 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white border border-slate-200/90 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-[#0F172A] m-0">Need more help?</h3>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Reach out to our support team on WhatsApp or Telegram.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('contact')}
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#0F172A] hover:bg-[#FF5E5B] text-white font-extrabold text-xs rounded-md transition-colors cursor-pointer border-0 shrink-0"
        >
          <MessageCircle size={14} />
          <span>Contact support</span>
        </button>
      </div>
    </div>
  );
}
