'use client';

import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
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
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
      <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {isLoginOnly ? (
            <AlertCircle
              size={14}
              strokeWidth={2.3}
              className="text-[#FF5E5B] shrink-0 mt-0.5"
            />
          ) : (
            <ShieldCheck
              size={14}
              strokeWidth={2.3}
              className="text-emerald-600 shrink-0 mt-0.5"
            />
          )}
          <span className="text-xs font-extrabold text-[#0F172A] leading-snug break-words">
            {headline}
          </span>
        </div>

        {badgeText && (
          <WarrantyBadge label={badgeText} isLoginOnly={isLoginOnly} />
        )}
      </div>

      <ul className="px-3.5 py-2.5 space-y-1.5 list-none m-0">
        {details.map((line, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed"
          >
            {arrowBullets ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-slate-500 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                →
              </span>
            ) : (
              <span className="h-5 flex items-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </span>
            )}
            <span className="leading-5 text-[#0F172A]/90 break-words">
              {line}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
