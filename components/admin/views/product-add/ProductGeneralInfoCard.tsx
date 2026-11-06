'use client';

import React from 'react';
import type { DigitalProduct, ProductCategory } from '@/lib/admin-data';
import { Card, BBCodeEditor } from '@/components/admin/ui/primitives';

export interface ProductGeneralInfoCardProps {
  name: string;
  platform: string;
  categoryId: string;
  categories: ProductCategory[];
  status: DigitalProduct['status'];
  description: string;
  onNameChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onStatusChange: (value: DigitalProduct['status']) => void;
  onDescriptionChange: (value: string) => void;
  onOpenCategories: () => void;
}

export default function ProductGeneralInfoCard({
  name,
  platform,
  categoryId,
  categories,
  status,
  description,
  onNameChange,
  onPlatformChange,
  onCategoryIdChange,
  onStatusChange,
  onDescriptionChange,
  onOpenCategories,
}: ProductGeneralInfoCardProps) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        Product
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="admin-label block mb-1.5">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="ChatGPT Plus"
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="admin-label block mb-1.5">Platform</label>
          <input
            type="text"
            required
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
            placeholder="OpenAI"
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="admin-label m-0">Category</label>
            <button
              type="button"
              onClick={onOpenCategories}
              className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
            >
              Manage
            </button>
          </div>
          <select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            {categories.length === 0 ? (
              <option value="">Add a category first</option>
            ) : (
              categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="admin-label block mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as DigitalProduct['status'])}
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>
      </div>

      <BBCodeEditor
        label="Description"
        value={description}
        onChange={onDescriptionChange}
        rows={6}
        placeholder="Product page description…"
      />
    </Card>
  );
}
