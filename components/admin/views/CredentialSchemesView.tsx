'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CredentialFieldDef,
  CredentialFieldKey,
  CredentialScheme,
} from '@/lib/admin-data';
import {
  Card,
  ModalShell,
  EmptyTableState,
  ShadcnCheckbox,
} from '@/components/admin/ui/primitives';
import {
  CREDENTIAL_FIELD_CATALOG,
  DEFAULT_VAULT_ONLY_FIELDS,
} from '@/lib/admin/credential-schemes';

interface CredentialSchemesViewProps {
  schemes: CredentialScheme[];
  onChange: (next: CredentialScheme[]) => void;
}

type DraftField = CredentialFieldDef & { enabled: boolean };

function emptyDraftFields(): DraftField[] {
  return CREDENTIAL_FIELD_CATALOG.map((f) => ({
    key: f.key,
    label: f.defaultLabel,
    required:
      f.key === 'email' ||
      f.key === 'password' ||
      f.key === 'token' ||
      f.key === 'link' ||
      f.key === 'activation_code',
    planVisible: !DEFAULT_VAULT_ONLY_FIELDS.includes(f.key),
    enabled: f.key === 'email' || f.key === 'password',
  }));
}

const fieldClass =
  'w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600';

export default function CredentialSchemesView({
  schemes,
  onChange,
}: CredentialSchemesViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<DraftField[]>(emptyDraftFields);

  const openAdd = () => {
    setName('');
    setFields(emptyDraftFields());
    setModalOpen(true);
  };

  const closeAdd = () => {
    setModalOpen(false);
    setName('');
    setFields(emptyDraftFields());
  };

  const enabledFields = fields.filter((f) => f.enabled);
  const canSave = Boolean(name.trim() && enabledFields.length > 0);

  const toggleField = (key: CredentialFieldKey, enabled: boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled } : f)),
    );
  };

  const patchField = (
    key: CredentialFieldKey,
    patch: Partial<Pick<CredentialFieldDef, 'label' | 'required' | 'planVisible'>>,
  ) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const next: CredentialScheme = {
      id: `cred-${Date.now()}`,
      name: name.trim(),
      fields: enabledFields.map(({ key, label, required, planVisible }) => ({
        key,
        label: label.trim() || key,
        required,
        planVisible,
      })),
    };
    onChange([next, ...schemes]);
    closeAdd();
  };

  const handleRename = (id: string, nextName: string) => {
    onChange(
      schemes.map((s) => (s.id === id ? { ...s, name: nextName } : s)),
    );
  };

  const handleRemove = (id: string) => {
    onChange(schemes.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Credential Types
        </h1>
        <button
          type="button"
          onClick={openAdd}
          className="h-9 pl-3 pr-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          <span>Add Type</span>
        </button>
      </div>

      <ModalShell
        open={modalOpen}
        onClose={closeAdd}
        title="Add Credential Type"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAdd} className="space-y-5 text-sm">
          <div>
            <label className="admin-label block mb-1.5">Name</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Email Login"
              className={fieldClass}
            />
          </div>

          <div>
            <p className="admin-label m-0 mb-3">Fields</p>
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800 border-y border-slate-200/80 dark:border-slate-800">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className={`py-3 space-y-2 ${
                    f.enabled ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100 cursor-pointer">
                      <ShadcnCheckbox
                        checked={f.enabled}
                        onChange={(c) => toggleField(f.key, c)}
                      />
                      {CREDENTIAL_FIELD_CATALOG.find((c) => c.key === f.key)?.defaultLabel}
                    </label>
                  </div>
                  {f.enabled ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                      <input
                        value={f.label}
                        onChange={(e) => patchField(f.key, { label: e.target.value })}
                        placeholder="Label"
                        className="h-8 px-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md sm:col-span-1"
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <ShadcnCheckbox
                          checked={f.required}
                          onChange={(c) => patchField(f.key, { required: c })}
                        />
                        Required
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <ShadcnCheckbox
                          checked={f.planVisible}
                          onChange={(c) => patchField(f.key, { planVisible: c })}
                        />
                        On plan
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
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
              Add Type
            </button>
          </div>
        </form>
      </ModalShell>

      <Card className="overflow-hidden">
        {schemes.length === 0 ? (
          <EmptyTableState title="No credential types" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Plan fields</th>
                  <th className="py-3 px-3">Vault extras</th>
                  <th className="py-3 px-4 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {schemes.map((s) => {
                  const plan = s.fields.filter((f) => f.planVisible);
                  const extras = s.fields.filter((f) => !f.planVisible);
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 px-4">
                        <input
                          value={s.name}
                          onChange={(e) => handleRename(s.id, e.target.value)}
                          className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded-md"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                        {plan.length
                          ? plan.map((f) => f.label).join(', ')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">
                        {extras.length
                          ? extras.map((f) => f.label).join(', ')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(s.id)}
                          className="min-h-8 min-w-8 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer inline-flex items-center justify-center"
                          aria-label={`Remove ${s.name}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
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
