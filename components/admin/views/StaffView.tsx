'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  Card,
  PaginationFooter,
  StatusIndicator,
} from '@/components/admin/ui/primitives';
import type { StaffPermissionKey } from '@/lib/auth/permissions';

const iconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer transition-colors';

const iconBtnDangerClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors';

type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: 'ADMIN' | 'STAFF';
  permissions: StaffPermissionKey[];
  createdAt: string;
};

interface StaffViewProps {
  onOpenAdd: () => void;
  onOpenEdit: (id: string) => void;
}

export default function StaffView({ onOpenAdd, onOpenEdit }: StaffViewProps) {
  const [users, setUsers] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setUsers(data.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setPage(1), [users.length]);

  const paged = users.slice((page - 1) * pageSize, page * pageSize);

  const remove = async (id: string) => {
    if (!window.confirm('Remove this console account?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          Staff
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenAdd}
            className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Add staff
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-slate-500 m-0">Loading…</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-sm text-slate-500 m-0">No console users yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Access</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800/80"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {u.name || '—'}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'ADMIN' ? (
                          <StatusIndicator tone="emerald" label="Admin" />
                        ) : (
                          <StatusIndicator tone="blue" label="Staff" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {u.role === 'ADMIN'
                          ? 'Full system'
                          : u.permissions.length
                            ? u.permissions.join(', ')
                            : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Edit"
                            aria-label="Edit"
                            disabled={busy}
                            onClick={() => onOpenEdit(u.id)}
                            className={iconBtnClass}
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            title="Remove"
                            aria-label="Remove"
                            disabled={busy}
                            onClick={() => void remove(u.id)}
                            className={iconBtnDangerClass}
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              totalItems={users.length}
              pageSize={pageSize}
              currentPage={page}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}
