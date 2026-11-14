'use client';

import React from 'react';
import type {
  CredentialType,
  DeliveryMode,
  DigitalProduct,
  StockDisplayMode,
} from '@/lib/admin/types';
import { BBCodeEditor } from '@/components/admin/ui/BBCode';
import { SourcingSelect } from '@/components/admin/ui/primitives';
import ProductSchedulePicker from '@/components/admin/views/product-add/ProductSchedulePicker';
import type { ProductOptionFormValues } from '@/components/admin/views/product-option/option-form-values';

type ProductOptionFormProps = {
  mode: 'add' | 'edit';
  values: ProductOptionFormValues;
  onChange: <K extends keyof ProductOptionFormValues>(
    key: K,
    value: ProductOptionFormValues[K],
  ) => void;
  /** Add mode: pick which product gets the new option. */
  products?: DigitalProduct[];
  productId?: string;
  onProductIdChange?: (productId: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function ProductOptionForm({
  mode,
  values,
  onChange,
  products = [],
  productId = '',
  onProductIdChange,
  onCancel,
  onSubmit,
}: ProductOptionFormProps) {
  const isEdit = mode === 'edit';

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-xs">
      {!isEdit && (
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => onProductIdChange?.(e.target.value)}
            required
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Plan title
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <input
                type="checkbox"
                checked={values.isDefault}
                onChange={(e) => onChange('isDefault', e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Default plan</span>
            </label>
          </div>
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g., 1M Access Token"
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Price (BDT ৳)
          </label>
          <input
            type="number"
            required
            min={1}
            value={values.priceBDT}
            onChange={(e) => onChange('priceBDT', Number(e.target.value))}
            className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Credential Type
          </label>
          <select
            value={values.credentialType}
            onChange={(e) =>
              onChange('credentialType', e.target.value as CredentialType)
            }
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="token">Token</option>
            <option value="email_login">Email Login</option>
            <option value="license_key">License Key</option>
            <option value="invite_link">Team Invite</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Delivery Mode
          </label>
          <select
            value={values.deliveryMode}
            onChange={(e) =>
              onChange('deliveryMode', e.target.value as DeliveryMode)
            }
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="auto_vault">Auto-Vault (Instant)</option>
            <option value="manual_dispatch">Manual Dispatch</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Stock Display
          </label>
          <select
            value={values.stockDisplayMode}
            onChange={(e) =>
              onChange('stockDisplayMode', e.target.value as StockDisplayMode)
            }
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="exact_count">Exact Count</option>
            <option value="status_only">Status Only</option>
            <option value="unlimited_manual">Always Available</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Duration
            </label>
            <div className="flex items-center gap-1">
              {(['Hours', 'Days', 'Month'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    const days =
                      unit === 'Hours' ? 1 : unit === 'Month' ? 30 : 28;
                    onChange('durationDays', days);
                  }}
                  className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:text-emerald-600 cursor-pointer"
                >
                  +{unit}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              required
              min={0}
              step="any"
              value={values.durationDays}
              onChange={(e) => onChange('durationDays', Number(e.target.value))}
              className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
            <span className="text-xs text-slate-400 font-medium">days</span>
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Device Limit
          </label>
          <input
            type="text"
            value={values.deviceLimit}
            onChange={(e) => onChange('deviceLimit', e.target.value)}
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            VPN Required?
          </label>
          <select
            value={values.vpnRequired ? 'yes' : 'no'}
            onChange={(e) => onChange('vpnRequired', e.target.value === 'yes')}
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {values.vpnRequired && (
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            VPN Note
          </label>
          <input
            type="text"
            value={values.vpnRegionNote}
            onChange={(e) => onChange('vpnRegionNote', e.target.value)}
            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300 mb-1">
            <input
              type="checkbox"
              checked={values.hasWarranty}
              onChange={(e) => onChange('hasWarranty', e.target.checked)}
              className="rounded border-slate-300"
            />
            Has Warranty
          </label>
          {values.hasWarranty && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={values.warrantyDays}
                onChange={(e) =>
                  onChange('warrantyDays', Number(e.target.value))
                }
                className="h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                placeholder="Days"
              />
              <input
                type="text"
                value={values.warrantyTerms}
                onChange={(e) => onChange('warrantyTerms', e.target.value)}
                className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                placeholder="Terms"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Login Steps (one per line)
          </label>
          <textarea
            rows={3}
            value={values.loginStepsText}
            onChange={(e) => onChange('loginStepsText', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Plan description
        </label>
        <textarea
          rows={2}
          value={values.optionDescription}
          onChange={(e) => onChange('optionDescription', e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Source / Sourcing <span className="font-normal text-slate-500">(Where credentials come from)</span>
        </label>
        <SourcingSelect
          value={values.sourcing || 'own'}
          onChange={(val) => onChange('sourcing', val)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={values.renewable}
            onChange={(e) => onChange('renewable', e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Renewable
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={values.allowOrderWhenOutOfStock}
            onChange={(e) => onChange('allowOrderWhenOutOfStock', e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Accept orders when out of stock
        </label>
      </div>

      <ProductSchedulePicker
        embedded
        from={values.availableFrom}
        until={values.availableUntil}
        onChange={(next) => {
          onChange('availableFrom', next.from);
          onChange('availableUntil', next.until);
        }}
      />

      <BBCodeEditor
        label="Plan warning"
        value={values.warningNote}
        onChange={(next) => onChange('warningNote', next)}
        rows={3}
      />

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 h-9 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
        >
          {isEdit ? 'Save Changes' : 'Save plan'}
        </button>
      </div>
    </form>
  );
}
