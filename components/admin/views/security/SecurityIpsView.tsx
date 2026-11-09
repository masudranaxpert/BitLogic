'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  CheckCircle,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/admin/ui/Card';
import { ModalShell } from '@/components/admin/ui/ModalShell';

type IpRuleItem = {
  id: string;
  ip: string;
  status: 'blocked' | 'flagged' | 'whitelisted';
  reason: string;
  hitCount: number;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function SecurityIpsView() {
  const [rules, setRules] = useState<IpRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newStatus, setNewStatus] = useState<'blocked' | 'whitelisted'>('blocked');
  const [newReason, setNewReason] = useState('Manual security block');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/security/ips?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRules(json.rules || []);
      }
    } catch (err) {
      console.error('Failed to load IP rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRules();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleUpdateStatus = async (id: string, status: 'blocked' | 'flagged' | 'whitelisted') => {
    try {
      const res = await fetch('/api/admin/security/ips', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        void fetchRules();
      }
    } catch (err) {
      console.error('Failed to update IP rule:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to remove this IP rule?')) return;
    try {
      const res = await fetch(`/api/admin/security/ips?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        void fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete IP rule:', err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/security/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: newIp.trim(),
          status: newStatus,
          reason: newReason.trim(),
          notes: newNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setNewIp('');
        setNewNotes('');
        void fetchRules();
      }
    } catch (err) {
      console.error('Failed to create IP rule:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-50">
            IP Access Rules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage blocked threat actors, suspicious flagged clients, and trusted whitelisted IPs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchRules()}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-300 hover:border-emerald-600 cursor-pointer"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 h-9 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add IP Rule
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IP, reason, or notes…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'blocked', 'flagged', 'whitelisted'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Rules Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-medium">
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Hits</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {loading ? 'Loading IP rules…' : 'No IP rules match the criteria.'}
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {rule.ip}
                    </td>
                    <td className="px-4 py-3">
                      {rule.status === 'blocked' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <Lock className="w-3 h-3" />
                          Blocked
                        </span>
                      ) : rule.status === 'flagged' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Whitelisted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {rule.reason}
                      {rule.notes ? <span className="text-slate-400 ml-1">({rule.notes})</span> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {rule.hitCount}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(rule.updatedAt).toLocaleDateString()}{' '}
                      {new Date(rule.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {rule.status !== 'blocked' ? (
                          <button
                            type="button"
                            onClick={() => void handleUpdateStatus(rule.id, 'blocked')}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleUpdateStatus(rule.id, 'whitelisted')}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer"
                          >
                            Whitelist
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          aria-label="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add IP Rule Modal */}
      {modalOpen ? (
        <ModalShell
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add New IP Access Rule"
        >
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                IP Address *
              </label>
              <input
                type="text"
                required
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Action / Policy *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="blocked">Block (403 Forbidden)</option>
                <option value="whitelisted">Whitelist (Bypass rate limits)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason *
              </label>
              <input
                type="text"
                required
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. Brute-force attacks observed on auth"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes (Optional)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add reference ticket or staff notes..."
                className="w-full h-20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3.5 h-9 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newIp.trim()}
                className="px-4 h-9 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Enforce Rule'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
