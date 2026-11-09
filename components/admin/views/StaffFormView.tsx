'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Shield, UserCog, UserPlus } from 'lucide-react';
import { Card, AdminFormSkeleton } from '@/components/admin/ui/primitives';
import type { StaffPermissionKey } from '@/lib/auth/permissions';

type CatalogItem = {
  key: StaffPermissionKey;
  label: string;
  description: string;
};

type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: 'ADMIN' | 'STAFF';
  permissions: StaffPermissionKey[];
};

const field =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

interface StaffFormViewProps {
  editId: string | null;
  onCancel: () => void;
  onSaved: () => void;
}

export default function StaffFormView({
  editId,
  onCancel,
  onSaved,
}: StaffFormViewProps) {
  const isEdit = Boolean(editId);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [perms, setPerms] = useState<StaffPermissionKey[]>(['orders', 'tickets']);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setCatalog(data.permissionsCatalog || []);
      if (editId) {
        const row = (data.users as StaffRow[] | undefined)?.find((u) => u.id === editId);
        if (!row) throw new Error('Account not found');
        setName(row.name || '');
        setEmail(row.email);
        setPhone(row.phone || '');
        setPassword('');
        setRole(row.role);
        setPerms(row.permissions.length ? row.permissions : ['orders', 'tickets']);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePerm = (key: StaffPermissionKey) => {
    setPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isEdit && editId) {
        const res = await fetch('/api/admin/staff', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editId,
            name,
            phone,
            role,
            permissions: role === 'STAFF' ? perms : [],
            password: password || undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Save failed');
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Email and password are required');
        }
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim(),
            phone: phone.trim(),
            password,
            role,
            permissions: role === 'STAFF' ? perms : [],
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Create failed');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
          aria-label="Back to Staff"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          {isEdit ? 'Edit staff' : 'Add staff'}
        </h1>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <AdminFormSkeleton />
      ) : (
        <form
          onSubmit={(e) => void save(e)}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
        >
          <Card className="lg:col-span-7 p-5 space-y-4">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3 m-0">
              Account
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="admin-label block mb-1.5" htmlFor="staff-name">
                  Name
                </label>
                <input
                  id="staff-name"
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masud Rana"
                  autoFocus={!isEdit}
                />
              </div>
              <div>
                <label className="admin-label block mb-1.5" htmlFor="staff-email">
                  Email
                </label>
                <input
                  id="staff-email"
                  className={`${field} font-mono`}
                  type="email"
                  required={!isEdit}
                  value={email}
                  disabled={isEdit}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@blumartbd.local"
                />
              </div>
              <div>
                <label className="admin-label block mb-1.5" htmlFor="staff-phone">
                  Phone
                </label>
                <input
                  id="staff-phone"
                  className={`${field} font-mono`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 17…"
                />
              </div>
              <div>
                <label className="admin-label block mb-1.5" htmlFor="staff-pass">
                  Password{isEdit ? ' (leave blank to keep)' : ''}
                </label>
                <input
                  id="staff-pass"
                  className={field}
                  type="password"
                  required={!isEdit}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="admin-label block mb-1.5" htmlFor="staff-role">
                Role
              </label>
              <select
                id="staff-role"
                className={field}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value === 'ADMIN' ? 'ADMIN' : 'STAFF')
                }
              >
                <option value="STAFF">Staff — limited menus</option>
                <option value="ADMIN">Admin — full access</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                {isEdit ? (
                  <UserCog className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" aria-hidden />
                )}
                {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create staff'}
              </button>
            </div>
          </Card>

          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              {role === 'ADMIN' ? (
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
              ) : (
                <UserCog className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
              )}
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                {role === 'ADMIN' ? 'Full access' : 'Menu access'}
              </h2>
            </div>

            {role === 'ADMIN' ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                Admins can open every console page, including Staff.
              </p>
            ) : (
              <div className="space-y-2">
                {catalog.map((p) => {
                  const on = perms.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                        on
                          ? 'border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-700/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-emerald-600"
                        checked={on}
                        onChange={() => togglePerm(p.key)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                          {p.label}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {p.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        </form>
      )}
    </div>
  );
}
