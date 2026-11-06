'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type {
  CredentialScheme,
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  resolveSchemeForVariant,
  credentialTypeFromScheme,
  fieldsForVaultEntry,
} from '@/lib/admin/credential-schemes';
import {
  Card,
  formatBDT,
  getCredentialTypeLabel,
  BBCodeEditor,
  BBCodeRenderer,
} from '@/components/admin/ui/primitives';

interface VaultManualAddViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  credentialSchemes: CredentialScheme[];
  preselectedTarget?: { productId: string; variantId: string } | null;
  onClearPreselectedTarget?: () => void;
  onAddCredentials: (items: VaultCredential[]) => void;
  onBackToVault: () => void;
}

const fieldClass =
  'w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg';

const LONG_KEYS = new Set(['token', 'link', 'activation_code', 'secret']);

export default function VaultManualAddView({
  products,
  vault,
  credentialSchemes,
  preselectedTarget,
  onClearPreselectedTarget,
  onAddCredentials,
  onBackToVault,
}: VaultManualAddViewProps) {
  const [selectedProdId, setSelectedProdId] = useState<string>(
    products[0]?.id || '',
  );
  const [selectedVarId, setSelectedVarId] = useState<string>(
    products[0]?.variants[0]?.id || '',
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [noteBBCodeInput, setNoteBBCodeInput] = useState('');
  const [validDays, setValidDays] = useState(30);

  const [prevTarget, setPrevTarget] = useState(preselectedTarget);
  if (preselectedTarget && preselectedTarget !== prevTarget) {
    setPrevTarget(preselectedTarget);
    setSelectedProdId(preselectedTarget.productId);
    setSelectedVarId(preselectedTarget.variantId);
    if (onClearPreselectedTarget) onClearPreselectedTarget();
  }

  const currentProduct =
    products.find((p) => p.id === selectedProdId) || products[0];
  const currentVariant =
    currentProduct?.variants.find((v) => v.id === selectedVarId) ||
    currentProduct?.variants[0];

  const scheme = useMemo(
    () =>
      resolveSchemeForVariant(credentialSchemes, {
        credentialSchemeId: currentVariant?.credentialSchemeId,
        credentialType: currentVariant?.credentialType,
      }),
    [
      credentialSchemes,
      currentVariant?.credentialSchemeId,
      currentVariant?.credentialType,
    ],
  );

  const credentialType =
    currentVariant?.credentialType || credentialTypeFromScheme(scheme);

  const entryFields = useMemo(
    () => fieldsForVaultEntry(scheme, credentialType),
    [scheme, credentialType],
  );

  const resetFields = () => {
    setFieldValues({});
    setNoteBBCodeInput('');
    setValidDays(30);
  };

  const handleProductChange = (nextProdId: string) => {
    setSelectedProdId(nextProdId);
    const prod = products.find((p) => p.id === nextProdId);
    const first = prod?.variants[0];
    if (first) {
      setSelectedVarId(first.id);
      setNoteBBCodeInput(first.warningNote || '');
    }
    setFieldValues({});
  };

  const handleVariantChange = (nextVarId: string) => {
    setSelectedVarId(nextVarId);
    const v = currentProduct?.variants.find((item) => item.id === nextVarId);
    setNoteBBCodeInput(v?.warningNote || '');
    setFieldValues({});
  };

  const setField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const currentPoolStock = vault.filter(
    (v) =>
      v.productId === currentProduct?.id &&
      v.variantId === currentVariant?.id &&
      v.status === 'available',
  ).length;

  const previewSecret = () => {
    if (credentialType === 'email_login') {
      const email = fieldValues.email?.trim() || 'email';
      const password = fieldValues.password?.trim() || '••••••••';
      const pin = fieldValues.pin?.trim();
      return pin ? `${email} | ${password} (${pin})` : `${email} | ${password}`;
    }
    const primary = entryFields.find((f) => f.planVisible) || entryFields[0];
    return (primary && fieldValues[primary.key]?.trim()) || '—';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !currentVariant) return;

    let secretValue = '';
    if (credentialType === 'email_login') {
      const email = fieldValues.email?.trim() || '';
      const password = fieldValues.password?.trim() || '';
      if (!email || !password) return;
      secretValue = `${email} | ${password}`;
    } else {
      const primary = entryFields.find((f) => f.required) || entryFields[0];
      secretValue = (primary ? fieldValues[primary.key] : '')?.trim() || '';
      if (!secretValue) return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const addedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const days = Math.max(1, validDays || 30);
    const exp = new Date(now);
    exp.setDate(exp.getDate() + days);
    const expiresAt = `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())}`;

    const newCred: VaultCredential = {
      id: `vlt-${Date.now()}`,
      productId: currentProduct.id,
      productName: currentProduct.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      credentialType,
      secretValue,
      email:
        credentialType === 'email_login'
          ? fieldValues.email?.trim()
          : undefined,
      password:
        credentialType === 'email_login'
          ? fieldValues.password?.trim()
          : undefined,
      profilePin:
        credentialType === 'email_login'
          ? fieldValues.pin?.trim() || undefined
          : undefined,
      noteBBCode: noteBBCodeInput.trim() || undefined,
      status: 'available',
      validDays: days,
      expiresAt,
      batchNote: 'Manual Entry',
      addedAt,
    };

    onAddCredentials([newCred]);
    resetFields();
    onBackToVault();
  };

  const emptyProducts = products.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToVault}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
          aria-label="Back to Credentials"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Manual Add
        </h1>
      </div>

      {emptyProducts ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No products yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Card className="lg:col-span-7 p-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3 m-0">
                Product &amp; Option
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product
                  </label>
                  <select
                    value={selectedProdId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Option
                  </label>
                  <select
                    value={selectedVarId}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {currentProduct?.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({getCredentialTypeLabel(v.credentialType)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {entryFields.map((field) => {
                    const isLong = LONG_KEYS.has(field.key);
                    return (
                      <div
                        key={field.key}
                        className={isLong ? 'sm:col-span-2' : undefined}
                      >
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {field.label}
                          {field.required ? (
                            <span className="text-rose-500"> *</span>
                          ) : null}
                        </label>
                        {isLong ? (
                          <textarea
                            rows={3}
                            required={field.required}
                            value={fieldValues[field.key] || ''}
                            onChange={(e) =>
                              setField(field.key, e.target.value)
                            }
                            placeholder={
                              field.key === 'token'
                                ? 'Paste access token…'
                                : undefined
                            }
                            className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                          />
                        ) : (
                          <input
                            type="text"
                            required={field.required}
                            value={fieldValues[field.key] || ''}
                            onChange={(e) =>
                              setField(field.key, e.target.value)
                            }
                            className={fieldClass}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valid days
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={validDays}
                    onChange={(e) =>
                      setValidDays(Math.max(1, Number(e.target.value) || 30))
                    }
                    className="w-28 h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <BBCodeEditor
                  label="Description"
                  value={noteBBCodeInput}
                  onChange={setNoteBBCodeInput}
                  rows={4}
                  placeholder="Note for the buyer…"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onBackToVault}
                  className="px-4 h-9 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </Card>

          <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Preview
              </h2>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {currentPoolStock} in stock
              </span>
            </div>

            {currentVariant && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                      {currentVariant.name}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatBDT(currentVariant.priceBDT)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all">
                    {previewSecret()}
                  </div>
                </div>

                {noteBBCodeInput.trim() ? (
                  <BBCodeRenderer content={noteBBCodeInput} />
                ) : null}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
