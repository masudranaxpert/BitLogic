'use client';

import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { DigitalProduct, ProductCategory } from '@/lib/admin-data';
import {
  Card,
  ModalShell,
  EmptyTableState,
} from '@/components/admin/ui/primitives';

interface CategoriesViewProps {
  categories: ProductCategory[];
  products: DigitalProduct[];
  onChange: (next: ProductCategory[]) => void;
}

const fieldClass =
  'w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600';

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCreatedAt(iso: string | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CategoriesView({
  categories,
  products,
  onChange,
}: CategoriesViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const key =
        p.categoryId ||
        categories.find((c) => c.name === p.category)?.id ||
        '';
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [products, categories]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setName('');
  };

  const canSave = Boolean(name.trim());
  const isEdit = Boolean(editingId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const trimmed = name.trim();
    const duplicate = categories.some(
      (c) =>
        c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editingId,
    );
    if (duplicate) return;

    if (editingId) {
      onChange(
        categories.map((c) =>
          c.id === editingId ? { ...c, name: trimmed } : c,
        ),
      );
    } else {
      onChange([
        {
          id: `cat-${Date.now()}`,
          name: trimmed,
          createdAt: todayISODate(),
        },
        ...categories,
      ]);
    }
    closeModal();
  };

  const handleRemove = (id: string) => {
    onChange(categories.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Categories
        </h1>
        <button
          type="button"
          onClick={openAdd}
          className="h-9 pl-3 pr-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          <span>Add Category</span>
        </button>
      </div>

      <ModalShell
        open={modalOpen}
        onClose={closeModal}
        title={isEdit ? 'Edit Category' : 'Add Category'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <div>
            <label className="admin-label block mb-1.5">Name</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI & LLM Tools"
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="h-9 px-3.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isEdit ? (
                <span>Save</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" aria-hidden />
                  <span>Add Category</span>
                </>
              )}
            </button>
          </div>
        </form>
      </ModalShell>

      <Card className="overflow-hidden">
        {categories.length === 0 ? (
          <EmptyTableState title="No categories" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3 whitespace-nowrap">Products</th>
                  <th className="py-3 px-3 whitespace-nowrap">Created</th>
                  <th className="py-3 px-4 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {categories.map((c) => {
                  const count = productCountByCategory.get(c.id) || 0;
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="admin-metric tabular-nums">{count}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatCreatedAt(c.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="min-h-8 min-w-8 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer inline-flex items-center justify-center"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="w-4 h-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(c.id)}
                            className="min-h-8 min-w-8 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer inline-flex items-center justify-center"
                            aria-label={`Remove ${c.name}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
