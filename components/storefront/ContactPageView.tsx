'use client';

import React, { useState } from 'react';
import { Mail, Phone, Send, CheckCircle2 } from 'lucide-react';
import {
  StoreButton,
  StoreInputField,
  StoreSurfaceCard,
  StoreTextareaField,
  WhatsAppIcon,
} from './ui';

export function ContactPageView() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setMsg('');
    }, 2000);
  };

  return (
    <div className="max-w-[980px] mx-auto px-3.5 sm:px-6 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight m-0">
          Contact Us
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Contact info cards */}
        <div className="lg:col-span-5 space-y-3">
          <StoreSurfaceCard className="p-4 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-md bg-emerald-50 text-[#25D366] border border-emerald-200/60 flex items-center justify-center shrink-0">
              <WhatsAppIcon size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-sm m-0">WhatsApp</h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">10:00 AM – 2:00 AM (BDT)</p>
              <a
                href="https://wa.me/8801700123456"
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1.5 font-mono font-extrabold text-xs text-emerald-700 hover:underline"
              >
                +880 1700-123456
              </a>
            </div>
          </StoreSurfaceCard>

          <StoreSurfaceCard className="p-4 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-sm m-0">Telegram</h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Support & updates</p>
              <span className="inline-block mt-1.5 font-mono font-bold text-xs text-sky-700">
                @bitlogic_support
              </span>
            </div>
          </StoreSurfaceCard>

          <StoreSurfaceCard className="p-4 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-md bg-[#FFF1F0] text-[#FF5E5B] border border-[#FF5E5B]/20 flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-sm m-0">Email</h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">General inquiries</p>
              <span className="inline-block mt-1.5 font-mono font-bold text-xs text-[#0F172A]">
                support@bitlogic.com.bd
              </span>
            </div>
          </StoreSurfaceCard>
        </div>

        {/* Message form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit}>
            <StoreSurfaceCard className="p-5 space-y-3.5">
              <h2 className="font-display text-base font-extrabold text-[#0F172A] m-0">
                Send a message
              </h2>

              <StoreInputField
                type="text"
                label="Full name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />

              <StoreInputField
                type="email"
                label="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />

              <StoreTextareaField
                label="Message"
                required
                rows={4}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Write your message..."
              />

              {submitted && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Message sent.</span>
                </div>
              )}

              <StoreButton type="submit" variant="dark" size="lg" fullWidth>
                <Send size={14} />
                <span>Send message</span>
              </StoreButton>
            </StoreSurfaceCard>
          </form>
        </div>
      </div>
    </div>
  );
}
