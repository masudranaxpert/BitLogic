'use client';

import React from 'react';
import type { WarrantyPlan } from '@/lib/admin-data';
import { Card, formatBDT, BBCodeRenderer } from '@/components/admin/ui/primitives';
import {
  findWarranty,
  warrantyBadgeFor,
  warrantyHeadlineFor,
  type DraftVariant,
} from './draft-helpers';

export interface ProductLivePreviewProps {
  productName: string;
  platform: string;
  description: string;
  warranties: WarrantyPlan[];
  draftVariants: DraftVariant[];
  activePreviewVariant: DraftVariant | undefined;
  onSelectOption: (tempId: string) => void;
}

export default function ProductLivePreview({
  productName,
  platform,
  description,
  warranties,
  draftVariants,
  activePreviewVariant,
  onSelectOption,
}: ProductLivePreviewProps) {
  const details = (activePreviewVariant?.detailsText || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const hasName = Boolean(productName.trim());
  const hasPlatform = Boolean(platform.trim());
  const hasDescription = Boolean(description.trim());
  const title = productName.trim() || 'Untitled product';
  const brand = platform.trim();

  return (
    <Card className="p-4 space-y-3.5">
      <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-2.5 m-0">
        Preview
      </h2>

      <div className="space-y-1 min-h-[2.75rem]">
        {hasPlatform ? (
          <p className="m-0 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {brand}
          </p>
        ) : null}
        <p
          className={`m-0 text-sm font-bold tracking-tight ${
            hasName
              ? 'text-slate-900 dark:text-slate-50'
              : 'text-slate-400 dark:text-slate-500 font-medium'
          }`}
        >
          {title}
        </p>
      </div>

      <div className="rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 min-h-[5.5rem]">
        {hasDescription ? (
          <BBCodeRenderer content={description} className="text-sm" />
        ) : (
          <div className="h-full min-h-[3.5rem] flex items-center justify-center">
            <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
          </div>
        )}
      </div>

      {draftVariants.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-slate-700 px-3 py-5 text-center">
          <span className="text-sm text-slate-500 dark:text-slate-400">—</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {draftVariants.map((dv, idx) => {
              const active = dv.tempId === activePreviewVariant?.tempId;
              const label = dv.name.trim() || `Option ${idx + 1}`;
              return (
                <button
                  key={dv.tempId}
                  type="button"
                  onClick={() => onSelectOption(dv.tempId)}
                  className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activePreviewVariant ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-md bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="admin-price text-lg">
                    {formatBDT(activePreviewVariant.priceBDT)}
                  </span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {activePreviewVariant.durationLabel || '—'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                    findWarranty(warranties, activePreviewVariant.warrantyId)?.kind ===
                    'login-only'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  {warrantyBadgeFor(activePreviewVariant, warranties)}
                </span>
              </div>

              <div className="rounded-md border border-slate-200/80 dark:border-slate-800 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 m-0">
                  {warrantyHeadlineFor(activePreviewVariant, warranties)}
                </p>
                {details.length === 0 ? null : (
                  <ul className="m-0 pl-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {details.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
