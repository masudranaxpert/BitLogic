import React from 'react';
import { ShieldCheck } from 'lucide-react';

const METHODS = [
  { id: 'bkash', label: 'bKash', logo: '/payments/bkash.svg' },
  { id: 'nagad', label: 'Nagad', logo: '/payments/nagad.jpeg' },
] as const;

export function QoPaymentMethod() {
  return (
    <section
      className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2.5"
      aria-label="Payment method"
    >
      <div className="flex items-center justify-between gap-2 text-[#0F172A]">
        <label className="inline-flex items-center gap-2 text-xs font-extrabold cursor-pointer">
          <input
            type="radio"
            name="qo-pay"
            defaultChecked
            className="accent-[#0F172A]"
          />
          <span>Mobile Payment</span>
        </label>
        <ShieldCheck size={16} strokeWidth={2.2} className="text-emerald-600" aria-hidden="true" />
      </div>
      <ul className="flex flex-wrap items-center gap-2 list-none m-0 p-0">
        {METHODS.map((method) => (
          <li
            key={method.id}
            className="h-8 px-2.5 rounded-md bg-white border border-slate-200 inline-flex items-center justify-center shadow-2xs"
          >
            <img
              src={method.logo}
              alt={method.label}
              className="h-4.5 w-auto object-contain"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
