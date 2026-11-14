'use client';

import React from 'react';
import { AlertCircle, Check, ShieldCheck } from 'lucide-react';
import { WarrantyBadge } from './StoreBadge';

type PlanWarrantyCardProps = {
  headline: string;
  details: string[];
  isLoginOnly?: boolean;
  badgeText?: string;
  arrowBullets?: boolean;
};

export function PlanWarrantyCard({
  headline,
  details,
  isLoginOnly = false,
  badgeText,
  arrowBullets = false,
}: PlanWarrantyCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
          isLoginOnly
            ? 'bg-[#FFF1F0]/55 border-[#FF5E5B]/15'
            : 'bg-emerald-50/55 border-emerald-200/60'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              isLoginOnly
                ? 'bg-[#FFF1F0] text-[#FF5E5B] border-[#FF5E5B]/20'
                : 'bg-emerald-100/80 text-emerald-700 border-emerald-200/80'
            }`}
          >
            {isLoginOnly ? (
              <AlertCircle size={15} strokeWidth={2.3} aria-hidden />
            ) : (
              <ShieldCheck size={15} strokeWidth={2.3} aria-hidden />
            )}
          </span>
          <span className="text-[13.5px] sm:text-sm font-bold text-[#0F172A] leading-snug tracking-normal break-words">
            {headline}
          </span>
        </div>

        {badgeText && (
          <WarrantyBadge label={badgeText} isLoginOnly={isLoginOnly} />
        )}
      </div>

      <ul className="px-4 py-3.5 space-y-2.5 list-none m-0">
        {details.map((line, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-[13.5px] sm:text-[14px] text-slate-700 font-medium leading-[1.6]"
          >
            {arrowBullets ? (
              <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-bold shrink-0 mt-[3px]">
                →
              </span>
            ) : (
              <span
                className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0 mt-[3px] border ${
                  isLoginOnly
                    ? 'bg-slate-50 text-slate-600 border-slate-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200/90'
                }`}
              >
                <Check size={11} strokeWidth={2.8} aria-hidden />
              </span>
            )}
            <span className="flex-1 text-[#0F172A]/90 break-words">
              {line}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
