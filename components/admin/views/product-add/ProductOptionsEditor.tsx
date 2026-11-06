'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CredentialScheme, WarrantyPlan } from '@/lib/admin-data';
import { Card } from '@/components/admin/ui/primitives';
import type { DraftVariant } from './draft-helpers';

export interface ProductOptionsEditorProps {
  draftVariants: DraftVariant[];
  warranties: WarrantyPlan[];
  credentialSchemes: CredentialScheme[];
  onAdd: () => void;
  onRemove: (tempId: string) => void;
  onUpdate: <K extends keyof DraftVariant>(
    tempId: string,
    field: K,
    value: DraftVariant[K],
  ) => void;
  onOpenWarranties: () => void;
  onOpenCredentialTypes: () => void;
}

export default function ProductOptionsEditor({
  draftVariants,
  warranties,
  credentialSchemes,
  onAdd,
  onRemove,
  onUpdate,
  onOpenWarranties,
  onOpenCredentialTypes,
}: ProductOptionsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
          Options{draftVariants.length > 0 ? ` (${draftVariants.length})` : ''}
        </h2>
        {draftVariants.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="px-3 h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            <span>Add option</span>
          </button>
        ) : null}
      </div>

      {draftVariants.length === 0 ? (
        <Card className="px-5 py-10 flex flex-col items-center justify-center gap-3 text-center">
          <p className="m-0 text-sm font-medium text-slate-700 dark:text-slate-200">
            No options
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="px-3.5 h-9 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            <span>Add option</span>
          </button>
        </Card>
      ) : null}

      {draftVariants.map((dv, idx) => (
        <Card key={dv.tempId} className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              Option {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemove(dv.tempId)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
              title="Remove"
              aria-label="Remove option"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="admin-label block mb-1.5">Label</label>
              <input
                type="text"
                required
                value={dv.name}
                onChange={(e) => onUpdate(dv.tempId, 'name', e.target.value)}
                placeholder="ChatGPT Plus Shared"
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="admin-label block mb-1.5">Price (৳)</label>
              <input
                type="number"
                required
                min={0}
                value={dv.priceBDT}
                onChange={(e) =>
                  onUpdate(dv.tempId, 'priceBDT', Number(e.target.value))
                }
                className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="admin-label block mb-1.5">Duration</label>
              <input
                type="text"
                required
                value={dv.durationLabel}
                onChange={(e) =>
                  onUpdate(dv.tempId, 'durationLabel', e.target.value)
                }
                placeholder="1 Month"
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="admin-label m-0">Credential type</label>
                <button
                  type="button"
                  onClick={onOpenCredentialTypes}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                >
                  Manage
                </button>
              </div>
              <select
                required
                value={dv.credentialSchemeId}
                onChange={(e) =>
                  onUpdate(dv.tempId, 'credentialSchemeId', e.target.value)
                }
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {credentialSchemes.length === 0 ? (
                  <option value="">Add a credential type first</option>
                ) : (
                  credentialSchemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="admin-label m-0">Warranty</label>
                <button
                  type="button"
                  onClick={onOpenWarranties}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                >
                  Manage
                </button>
              </div>
              <select
                required
                value={dv.warrantyId}
                onChange={(e) => onUpdate(dv.tempId, 'warrantyId', e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {warranties.length === 0 ? (
                  <option value="">Add a warranty first</option>
                ) : (
                  warranties.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="admin-label block mb-1.5">Details</label>
            <textarea
              rows={3}
              value={dv.detailsText}
              onChange={(e) => onUpdate(dv.tempId, 'detailsText', e.target.value)}
              placeholder="One line per bullet"
              className="w-full px-3 py-2 text-sm leading-relaxed bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
