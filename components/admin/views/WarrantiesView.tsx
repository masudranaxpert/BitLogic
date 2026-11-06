'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { WarrantyPlan } from '@/lib/admin-data';
import {
  Card,
  ModalShell,
  EmptyTableState,
} from '@/components/admin/ui/primitives';

interface WarrantiesViewProps {
  warranties: WarrantyPlan[];
  onChange: (next: WarrantyPlan[]) => void;
}

const emptyDraft = (): Omit<WarrantyPlan, 'id' | 'kind'> => ({
  name: '',
  badge: '',
  headline: '',
  days: 25,
});

function kindFromDays(days: number): WarrantyPlan['kind'] {
  return days <= 0 ? 'login-only' : 'warranty';
}

const fieldClass =
  'w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600';

export default function WarrantiesView({ warranties, onChange }: WarrantiesViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const openAdd = () => {
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const closeAdd = () => {
    setModalOpen(false);
    setDraft(emptyDraft());
  };

  const canSave = Boolean(draft.name.trim() && draft.badge.trim());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const days = Math.max(0, draft.days);
    const next: WarrantyPlan = {
      id: `wrn-${Date.now()}`,
      name: draft.name.trim(),
      badge: draft.badge.trim(),
      headline: draft.headline.trim() || draft.badge.trim(),
      kind: kindFromDays(days),
      days,
    };
    onChange([next, ...warranties]);
    closeAdd();
  };

  const handleUpdate = (id: string, patch: Partial<WarrantyPlan>) => {
    onChange(
      warranties.map((w) => {
        if (w.id !== id) return w;
        const merged = { ...w, ...patch };
        const days = Math.max(0, merged.days);
        return { ...merged, days, kind: kindFromDays(days) };
      }),
    );
  };

  const handleRemove = (id: string) => {
    onChange(warranties.filter((w) => w.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Warranties
        </h1>
        <button
          type="button"
          onClick={openAdd}
          className="h-9 pl-3 pr-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          <span>Add Warranty</span>
        </button>
      </div>

      <ModalShell
        open={modalOpen}
        onClose={closeAdd}
        title="Add Warranty"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdd} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="admin-label block mb-1.5">Name</label>
              <input
                required
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="25D Full"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Badge</label>
              <input
                required
                value={draft.badge}
                onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))}
                placeholder="25D Warranty"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Days</label>
              <input
                type="number"
                min={0}
                value={draft.days}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, days: Number(e.target.value) }))
                }
                className={`${fieldClass} font-mono`}
              />
              <p className="m-0 mt-1 text-[11px] text-slate-500">
                0 = login-only
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="admin-label block mb-1.5">Headline</label>
              <input
                value={draft.headline}
                onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
                placeholder="25 Days Replacement Warranty"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeAdd}
              className="h-9 px-3.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Add Warranty
            </button>
          </div>
        </form>
      </ModalShell>

      <Card className="overflow-hidden">
        {warranties.length === 0 ? (
          <EmptyTableState title="No warranties" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Badge</th>
                  <th className="py-3 px-3">Headline</th>
                  <th className="py-3 px-3">Days</th>
                  <th className="py-3 px-4 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {warranties.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2.5 px-4">
                      <input
                        value={w.name}
                        onChange={(e) => handleUpdate(w.id, { name: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded-md"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        value={w.badge}
                        onChange={(e) => handleUpdate(w.id, { badge: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded-md"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        value={w.headline}
                        onChange={(e) => handleUpdate(w.id, { headline: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded-md"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min={0}
                        value={w.days}
                        onChange={(e) =>
                          handleUpdate(w.id, { days: Number(e.target.value) })
                        }
                        className="w-20 h-8 px-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(w.id)}
                        className="min-h-8 min-w-8 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer inline-flex items-center justify-center"
                        aria-label={`Remove ${w.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
