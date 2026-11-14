'use client';

import React, { useState } from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import type { CredentialScheme, WarrantyPlan } from '@/lib/admin-data';
import { Card, SourcingSelect } from '@/components/admin/ui/primitives';
import { allWarranties, type DraftVariant } from './draft-helpers';
import ProductSchedulePicker from './ProductSchedulePicker';
import { ItemView, Pill, SOURCING, api, stockPill, taka, type OptionLink, type OptionView, type SupplierCatalogItem } from '@/components/admin/views/suppliers/shared';

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
  supplyPlans?: OptionView[];
  onManageSupply?: (planId: string) => void;
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
  supplyPlans,
  onManageSupply,
}: ProductOptionsEditorProps) {
  const [inspectingItem, setInspectingItem] = useState<SupplierCatalogItem | null>(null);

  const handleViewSupplierItem = async (link: OptionLink) => {
    try {
      const res = await api<{ items: SupplierCatalogItem[] }>(
        `/api/admin/suppliers/catalog?id=${encodeURIComponent(link.supplierProductId)}`,
      );
      if (res.items?.[0]) {
        setInspectingItem(res.items[0]);
      } else {
        setInspectingItem({
          id: link.supplierProductId,
          supplierId: '',
          supplierName: link.supplierName,
          name: link.name,
          price: link.price,
          currency: link.currency,
          costBdt: link.costBdt,
          stock: link.stock,
          status: link.status,
          minQty: 1,
          maxQty: 100,
          needsBuyerInput: false,
          description: link.warning || '',
          links: [],
        });
      }
    } catch {
      setInspectingItem({
        id: link.supplierProductId,
        supplierId: '',
        supplierName: link.supplierName,
        name: link.name,
        price: link.price,
        currency: link.currency,
        costBdt: link.costBdt,
        stock: link.stock,
        status: link.status,
        minQty: 1,
        maxQty: 100,
        needsBuyerInput: false,
        description: link.warning || '',
        links: [],
      });
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
          Plans{draftVariants.length > 0 ? ` (${draftVariants.length})` : ''}
        </h2>
        {draftVariants.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="px-3 h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            <span>Add plan</span>
          </button>
        ) : null}
      </div>

      {draftVariants.length === 0 ? (
        <Card className="px-5 py-10 flex flex-col items-center justify-center gap-3 text-center">
          <p className="m-0 text-sm font-medium text-slate-700 dark:text-slate-200">
            No plans
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="px-3.5 h-9 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            <span>Add plan</span>
          </button>
        </Card>
      ) : null}

      {draftVariants.map((dv, idx) => (
        <Card key={dv.tempId} className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              Plan {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemove(dv.tempId)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded cursor-pointer"
              title="Remove"
              aria-label="Remove plan"
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
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label className="admin-label m-0">Duration</label>
                <div className="flex items-center gap-1">
                  {(['Hours', 'Days', 'Month'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        const num = Number.parseInt(dv.durationLabel.replace(/[^\d]/g, ''), 10) || 1;
                        const label =
                          unit === 'Hours'
                            ? `${num} Hours`
                            : unit === 'Days'
                            ? `${num} Days`
                            : num === 1
                            ? '1 Month'
                            : `${num} Months`;
                        onUpdate(dv.tempId, 'durationLabel', label);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      +{unit}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                required
                value={dv.durationLabel}
                onChange={(e) =>
                  onUpdate(dv.tempId, 'durationLabel', e.target.value)
                }
                placeholder="e.g. 1 Month, 28 Days, 24 Hours"
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                {allWarranties(warranties).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={dv.renewable}
                onChange={(e) => onUpdate(dv.tempId, 'renewable', e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Renewable
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={dv.allowOrderWhenOutOfStock}
                onChange={(e) => onUpdate(dv.tempId, 'allowOrderWhenOutOfStock', e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Accept orders when out of stock
            </label>
          </div>

          <label className="block max-w-xs">
            <span className="admin-label block mb-1.5">Renewal price</span>
            <select
              value={dv.renewalPricing}
              disabled={!dv.renewable}
              onChange={(e) => onUpdate(dv.tempId, 'renewalPricing', e.target.value === 'locked' ? 'locked' : 'current')}
              className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
            >
              <option value="current">Today's price</option>
              <option value="locked">Price they first paid</option>
            </select>
          </label>

          <ProductSchedulePicker
            embedded
            from={dv.availableFrom}
            until={dv.availableUntil}
            onChange={(next) => {
              onUpdate(dv.tempId, 'availableFrom', next.from);
              onUpdate(dv.tempId, 'availableUntil', next.until);
            }}
          />

          <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="admin-label m-0 font-semibold text-slate-800 dark:text-slate-200">
                Sourcing
              </label>
            </div>
            
            <div className="w-full">
              <SourcingSelect
                value={dv.sourcing || 'own'}
                onChange={(val) => onUpdate(dv.tempId, 'sourcing', val)}
              />
            </div>

            {supplyPlans ? (
              <PlanSourcingRow
                plan={supplyPlans.find((p) => p.code === dv.tempId)}
                unsaved={dv.tempId.startsWith('draft-')}
                onManage={onManageSupply}
                onViewItem={handleViewSupplierItem}
              />
            ) : dv.tempId.startsWith('draft-') && (dv.sourcing === 'supplier_auto' || dv.sourcing === 'supplier_manual' || dv.sourcing === 'own_then_supplier') ? (
              <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-3 py-2">
                💡 <strong>Supplier linking:</strong> This plan will be configured for supplier purchasing. Once published, you can link the specific supplier catalog item anytime.
              </div>
            ) : null}
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

      <ItemView item={inspectingItem} onClose={() => setInspectingItem(null)} />
    </div>
  );
}

function PlanSourcingRow({
  plan,
  unsaved,
  onManage,
  onViewItem,
}: {
  plan?: OptionView;
  unsaved: boolean;
  onManage?: (planId: string) => void;
  onViewItem?: (link: OptionLink) => void;
}) {
  if (!plan) {
    return unsaved ? <p className="m-0 text-xs text-slate-500">Save the product before linking a supplier.</p> : null;
  }
  const names = Array.from(new Set(plan.links.map((l) => l.supplierName))).join(', ');
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Sourcing:</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          {SOURCING[plan.sourcing]?.label || plan.sourcing}
        </span>
        {plan.pricingMode === 'auto' ? <Pill tone="blue">Auto price</Pill> : null}
        {plan.renewalPricing === 'locked' ? <Pill tone="grey">Renewal price locked</Pill> : null}
        {plan.pricingAlert ? (
          <Pill tone="red">
            {plan.pricingAlert.includes('jump')
              ? 'Price to approve'
              : plan.pricingAlert.includes('loss')
              ? 'Loss guard: Selling below cost'
              : 'Check price'}
          </Pill>
        ) : null}
        {!plan.inStock ? (
          <Pill tone={plan.canOrder ? 'amber' : 'red'}>
            {plan.canOrder
              ? 'Back-order'
              : plan.pricingAlert?.includes('loss')
              ? 'Stock blocked (Selling at loss)'
              : 'Out of stock'}
          </Pill>
        ) : null}
        <button
          type="button"
          onClick={() => onManage?.(plan.planId)}
          className="ml-auto h-8 rounded-md border border-slate-200 px-3 text-xs font-semibold hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
        >
          Manage
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
        {names ? (
          <span>
            Supplier: <strong className="font-medium text-slate-700 dark:text-slate-300">{names}</strong>
          </span>
        ) : null}
        {names ? <span>•</span> : null}
        <span>Price {taka(plan.priceBdt)}</span>
        {plan.costBdt !== null ? (
          <>
            <span>•</span>
            <span>Cost {taka(plan.costBdt)}</span>
            <span>•</span>
            <span className={plan.marginBdt && plan.marginBdt >= 0 ? 'text-emerald-600 font-semibold dark:text-emerald-400' : 'text-rose-600 font-semibold dark:text-rose-400'}>
              Profit {taka(plan.marginBdt)}
            </span>
          </>
        ) : null}
      </div>

      {plan.links.length > 0 ? (
        <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Linked Supplier Items ({plan.links.length})
          </div>
          <div className="divide-y divide-slate-100 rounded-md border border-slate-200/80 bg-slate-50/60 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {plan.links.map((link, idx) => (
              <div key={link.linkId} className="flex items-center justify-between p-2 text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    #{idx + 1} {link.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{link.supplierName}</span>
                    <span>•</span>
                    <span>Cost: <strong className="text-slate-900 dark:text-slate-100">{taka(link.costBdt)}</strong> ({link.price} {link.currency})</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {stockPill(link.status, link.stock)}
                  <button
                    type="button"
                    onClick={() => void onViewItem?.(link)}
                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="View supplier item details"
                    aria-label={`View ${link.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
