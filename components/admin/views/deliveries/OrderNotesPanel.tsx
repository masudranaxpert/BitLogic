'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/admin/ui';

type Note = {
  id: string;
  orderId: string;
  deliveryId: string | null;
  text: string;
  authorName: string;
  kind: string;
  createdAt: string;
  editedAt: string | null;
  editableUntil: string;
  editable: boolean;
};

export const ADMIN_RELOAD_EVENT = 'admin:reload-workspace';

function fmt(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'locked';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left to edit` : `${m}m left to edit`;
}

type Props = {
  orderId: string;
  deliveryId: string;
  /** Unit has no credential yet and can be closed out without one. */
  canDeliverWithoutCredential: boolean;
};

export function OrderNotesPanel({
  orderId,
  deliveryId,
  canDeliverWithoutCredential,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [noCredOpen, setNoCredOpen] = useState(false);
  const [noCredNote, setNoCredNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/orders/notes?orderId=${encodeURIComponent(orderId)}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      if (res.ok) setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onReload = () => void load();
    window.addEventListener(ADMIN_RELOAD_EVENT, onReload);
    return () => window.removeEventListener(ADMIN_RELOAD_EVENT, onReload);
  }, [load]);

  const call = async (
    url: string,
    init: RequestInit,
    onOk?: () => void,
  ): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return false;
      }
      onOk?.();
      await load();
      return true;
    } catch {
      setError('Network error. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await call(
      '/api/admin/orders/notes',
      { method: 'POST', body: JSON.stringify({ orderId, deliveryId, text: draft }) },
      () => setDraft(''),
    );
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await call(
      '/api/admin/orders/notes',
      { method: 'PATCH', body: JSON.stringify({ id: editingId, text: editText }) },
      () => setEditingId(null),
    );
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    await call(`/api/admin/orders/notes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  const deliverWithoutCredential = async () => {
    if (!noCredNote.trim()) {
      setError('A delivery note is required.');
      return;
    }
    const ok = await call(
      '/api/admin/orders/deliver-without-credential',
      { method: 'POST', body: JSON.stringify({ deliveryId, note: noCredNote }) },
      () => {
        setNoCredOpen(false);
        setNoCredNote('');
      },
    );
    if (ok) window.dispatchEvent(new Event(ADMIN_RELOAD_EVENT));
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
        Notes
      </h3>

      {canDeliverWithoutCredential ? (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
          {!noCredOpen ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Deliver without credential
              </p>
              <button
                type="button"
                onClick={() => setNoCredOpen(true)}
                className="shrink-0 h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                Mark delivered
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery note</label>
              <textarea
                rows={2}
                maxLength={2000}
                value={noCredNote}
                onChange={(e) => setNoCredNote(e.target.value)}
                placeholder="Required"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoCredOpen(false)}
                  className="h-8 px-3 text-sm rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={deliverWithoutCredential}
                  className="h-8 px-3 text-sm font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white cursor-pointer"
                >
                  Confirm delivered
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <form onSubmit={addNote} className="space-y-2">
        <textarea
          rows={2}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note"
          aria-label="New order note"
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="h-8 px-3 text-sm font-semibold rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer"
          >
            Add note
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {n.authorName}
                  </span>{' '}
                  · {fmt(n.createdAt)}
                  {n.editedAt ? ' · edited' : ''}
                  {n.kind === 'no_credential' ? ' · delivered without credential' : ''}
                  {n.deliveryId && n.deliveryId !== deliveryId ? ` · ${n.deliveryId}` : ''}
                </span>
                {n.editable ? (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {timeLeft(n.editableUntil)}
                    </span>
                    <button
                      type="button"
                      aria-label="Edit note"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.text);
                      }}
                      className="p-1 hover:text-emerald-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete note"
                      onClick={() => remove(n.id)}
                      className="p-1 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1" title="Older than 24 hours">
                    <Lock className="w-3 h-3" aria-hidden /> locked
                  </span>
                )}
              </div>
              {editingId === n.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-7 px-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !editText.trim()}
                      onClick={saveEdit}
                      className="h-7 px-2.5 text-sm font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                  {n.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
