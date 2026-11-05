'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck, Globe } from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  Card,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  BBCodeEditor,
  BBCodeRenderer,
} from '@/components/admin/ui/primitives';

interface VaultManualAddViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  preselectedTarget?: { productId: string; variantId: string } | null;
  onClearPreselectedTarget?: () => void;
  onAddCredentials: (items: VaultCredential[]) => void;
  onBackToVault: () => void;
}

export default function VaultManualAddView({
  products,
  vault,
  preselectedTarget,
  onClearPreselectedTarget,
  onAddCredentials,
  onBackToVault,
}: VaultManualAddViewProps) {
  const [selectedProdId, setSelectedProdId] = useState<string>(products[0]?.id || '');
  const [selectedVarId, setSelectedVarId] = useState<string>(products[0]?.variants[0]?.id || '');

  const [secretInput, setSecretInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [batchNoteInput, setBatchNoteInput] = useState('Batch #44');
  const [noteBBCodeInput, setNoteBBCodeInput] = useState(
    '[warning]Do not click Log Out or change account settings. Close the browser tab when finished to preserve your active warranty.[/warning]'
  );

  const [prevTarget, setPrevTarget] = useState(preselectedTarget);
  if (preselectedTarget && preselectedTarget !== prevTarget) {
    setPrevTarget(preselectedTarget);
    setSelectedProdId(preselectedTarget.productId);
    setSelectedVarId(preselectedTarget.variantId);
    if (onClearPreselectedTarget) {
      onClearPreselectedTarget();
    }
  }

  const currentProduct = products.find((p) => p.id === selectedProdId) || products[0];
  const currentVariant =
    currentProduct?.variants.find((v) => v.id === selectedVarId) || currentProduct?.variants[0];

  const handleProductChange = (nextProdId: string) => {
    setSelectedProdId(nextProdId);
    const prod = products.find((p) => p.id === nextProdId);
    if (prod && prod.variants[0]) {
      setSelectedVarId(prod.variants[0].id);
      if (prod.variants[0].warningNote) {
        setNoteBBCodeInput(prod.variants[0].warningNote);
      }
    }
  };

  const handleVariantChange = (nextVarId: string) => {
    setSelectedVarId(nextVarId);
    const v = currentProduct?.variants.find((item) => item.id === nextVarId);
    if (v?.warningNote) {
      setNoteBBCodeInput(v.warningNote);
    }
  };

  const currentPoolStock = vault.filter(
    (v) =>
      v.productId === currentProduct?.id &&
      v.variantId === currentVariant?.id &&
      v.status === 'available'
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !currentVariant) return;

    const formattedSecret =
      currentVariant.credentialType === 'email_login'
        ? `${emailInput.trim()} | ${passwordInput.trim()}`
        : secretInput.trim();

    if (!formattedSecret) return;

    const newCred: VaultCredential = {
      id: `vlt-${Date.now()}`,
      productId: currentProduct.id,
      productName: currentProduct.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      credentialType: currentVariant.credentialType,
      secretValue: formattedSecret,
      email: currentVariant.credentialType === 'email_login' ? emailInput.trim() : undefined,
      password: currentVariant.credentialType === 'email_login' ? passwordInput.trim() : undefined,
      profilePin: pinInput.trim() || undefined,
      noteBBCode: noteBBCodeInput.trim() || undefined,
      status: 'available',
      batchNote: batchNoteInput.trim() || 'Manual Entry',
      addedAt: '2026-10-30 05:45',
    };

    onAddCredentials([newCred]);
    setSecretInput('');
    setEmailInput('');
    setPasswordInput('');
    setPinInput('');
    onBackToVault();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToVault}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
            aria-label="Back to Vault"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Manual Add Credential
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-7 p-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              Target Product &amp; Option
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
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  Credential Payload
                </span>
                {currentVariant && (
                  <StatusIndicator
                    tone="emerald"
                    label={getCredentialTypeLabel(currentVariant.credentialType)}
                  />
                )}
              </div>

              {currentVariant?.credentialType === 'email_login' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Account Email
                      </label>
                      <input
                        type="text"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="slot08@bitlogic-vault.io"
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type="text"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Pass#2026!"
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profile Slot / PIN
                      </label>
                      <input
                        type="text"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Slot #2 | PIN: 4820"
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Tag
                      </label>
                      <input
                        type="text"
                        value={batchNoteInput}
                        onChange={(e) => setBatchNoteInput(e.target.value)}
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {currentVariant?.credentialType === 'token'
                        ? 'Access Token String'
                        : currentVariant?.credentialType === 'license_key'
                        ? '25-Character License Key'
                        : 'Workspace Invite URL'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={secretInput}
                      onChange={(e) => setSecretInput(e.target.value)}
                      placeholder={
                        currentVariant?.credentialType === 'token'
                          ? 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_SESS_...'
                          : 'VK7JG-NPHTM-C97JM-9MPGT-3V66T'
                      }
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Optional Slot / Node ID
                      </label>
                      <input
                        type="text"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Node #12"
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Tag
                      </label>
                      <input
                        type="text"
                        value={batchNoteInput}
                        onChange={(e) => setBatchNoteInput(e.target.value)}
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <BBCodeEditor
                  label="Optional Buyer Note / Warning (BBCode Supported)"
                  value={noteBBCodeInput}
                  onChange={setNoteBBCodeInput}
                  rows={4}
                  placeholder="[warning]Do not click Log Out or change password...[/warning]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                Save Credential
              </button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Buyer Delivery Preview
            </h2>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {currentPoolStock} in Vault
            </span>
          </div>

          {currentVariant && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                    {currentProduct?.name} — {currentVariant.name}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatBDT(currentVariant.priceBDT)}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all">
                  {currentVariant.credentialType === 'email_login'
                    ? `${emailInput || 'email@vault.io'} | ${passwordInput || '••••••••'}${
                        pinInput ? ` (${pinInput})` : ''
                      }`
                    : secretInput || 'CREDENTIAL_PAYLOAD_PREVIEW'}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {currentVariant.hasWarranty
                        ? `${currentVariant.warrantyDays}d Warranty`
                        : 'No Warranty'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{currentVariant.vpnRequired ? 'VPN Required' : 'Direct Login'}</span>
                  </div>
                </div>
              </div>

              {noteBBCodeInput.trim() && (
                <BBCodeRenderer content={noteBBCodeInput} />
              )}

              <div className="space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Buyer Login Instructions</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  {currentVariant.loginInstructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
