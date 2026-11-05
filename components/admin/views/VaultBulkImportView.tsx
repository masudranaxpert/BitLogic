'use client';

import React, { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  Card,
  getCredentialTypeLabel,
  StatusIndicator,
  SwitchToggle,
} from '@/components/admin/ui/primitives';

interface VaultBulkImportViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  onAddCredentials: (items: VaultCredential[]) => void;
  onBackToVault: () => void;
}

export default function VaultBulkImportView({
  products,
  vault,
  onAddCredentials,
  onBackToVault,
}: VaultBulkImportViewProps) {
  const [selectedProdId, setSelectedProdId] = useState<string>(products[0]?.id || '');
  const [selectedVarId, setSelectedVarId] = useState<string>(products[0]?.variants[0]?.id || '');
  const [delimiter, setDelimiter] = useState<'|' | ':' | ','>('|');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [batchNote, setBatchNote] = useState('Bulk #45');
  const [rawText, setRawText] = useState('');

  const currentProduct = products.find((p) => p.id === selectedProdId) || products[0];
  const currentVariant =
    currentProduct?.variants.find((v) => v.id === selectedVarId) || currentProduct?.variants[0];

  const handleProductChange = (nextProdId: string) => {
    setSelectedProdId(nextProdId);
    const prod = products.find((p) => p.id === nextProdId);
    if (prod && prod.variants[0]) {
      setSelectedVarId(prod.variants[0].id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setRawText((prev) => (prev ? `${prev}\n${content}` : content));
    };
    reader.readAsText(file);
  };

  const existingSecrets = new Set(vault.map((v) => v.secretValue.trim().toLowerCase()));

  const parsedRows = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(delimiter).map((p) => p.trim());
      const isEmailType = currentVariant?.credentialType === 'email_login';
      const secretValue =
        isEmailType && parts.length >= 2 ? `${parts[0]} | ${parts[1]}` : line;
      const isDuplicate = existingSecrets.has(secretValue.toLowerCase());

      return {
        index: index + 1,
        raw: line,
        secretValue,
        email: isEmailType ? parts[0] : undefined,
        password: isEmailType ? parts[1] : undefined,
        profilePin: isEmailType && parts[2] ? parts[2] : undefined,
        isDuplicate,
      };
    });

  const validRows = parsedRows.filter((r) => (skipDuplicates ? !r.isDuplicate : true));

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !currentVariant || validRows.length === 0) return;

    const created: VaultCredential[] = validRows.map((row, idx) => ({
      id: `vlt-${Date.now()}-${idx}`,
      productId: currentProduct.id,
      productName: currentProduct.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      credentialType: currentVariant.credentialType,
      secretValue: row.secretValue,
      email: row.email,
      password: row.password,
      profilePin: row.profilePin,
      status: 'available',
      batchNote: batchNote.trim() || 'Bulk Import',
      addedAt: '2026-10-30 05:46',
    }));

    onAddCredentials(created);
    setRawText('');
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
            Bulk Import Credentials
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-6 p-5">
          <form onSubmit={handleImport} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
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
                  onChange={(e) => setSelectedVarId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  {currentProduct?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({getCredentialTypeLabel(v.credentialType)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delimiter
                </label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value as '|' | ':' | ',')}
                  className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="|">Pipe ( | )</option>
                  <option value=":">Colon ( : )</option>
                  <option value=",">Comma ( , )</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Tag
                </label>
                <input
                  type="text"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              <div className="flex items-end pb-1">
                <SwitchToggle
                  checked={skipDuplicates}
                  onChange={setSkipDuplicates}
                  label="Skip Duplicates"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Paste Lines or Upload (.txt / .csv)
                </label>
                <label className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load File</span>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={8}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  currentVariant?.credentialType === 'email_login'
                    ? `node01@bitlogic.io ${delimiter} Pass#001 ${delimiter} Slot-1\nnode02@bitlogic.io ${delimiter} Pass#002 ${delimiter} Slot-2`
                    : 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_TOKEN_01\neyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_TOKEN_02'
                }
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setRawText(
                    currentVariant?.credentialType === 'email_login'
                      ? `slot21@bitlogic-vault.io ${delimiter} Pass#9021 ${delimiter} PIN: 3310\nslot22@bitlogic-vault.io ${delimiter} Pass#9022 ${delimiter} PIN: 4410\nslot23@bitlogic-vault.io ${delimiter} Pass#9023 ${delimiter} PIN: 5510`
                      : 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_BATCH45_TOKEN_A1\neyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_BATCH45_TOKEN_A2\neyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_BATCH45_TOKEN_A3'
                  )
                }
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Load Sample Batch
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBackToVault}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={validRows.length === 0}
                  className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Import ({validRows.length})</span>
                </button>
              </div>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-6 overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Parsed Preview ({parsedRows.length})
            </h2>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {validRows.length} ready
            </span>
          </div>

          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-2.5 px-4 w-10">#</th>
                  <th className="py-2.5 px-3">Parsed Credential</th>
                  <th className="py-2.5 px-3">Slot / PIN</th>
                  <th className="py-2.5 px-4 text-right">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {parsedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                      Paste lines on the left to preview parsed credentials.
                    </td>
                  </tr>
                ) : (
                  parsedRows.map((row) => (
                    <tr key={row.index} className="whitespace-nowrap">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-400">{row.index}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-800 dark:text-slate-200 max-w-[260px] truncate">
                        {row.secretValue}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                        {row.profilePin || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {row.isDuplicate ? (
                          <StatusIndicator tone="amber" label="Duplicate" />
                        ) : (
                          <StatusIndicator tone="emerald" label="Ready" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
