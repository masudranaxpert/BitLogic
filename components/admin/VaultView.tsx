'use client';

import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Search,
} from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  FloatingBulkActionBar,
  EmptyTableState,
  ModalShell,
  BBCodeRenderer,
} from '@/components/ui/primitives';

interface VaultViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  onOpenManualAddPage: () => void;
  onOpenBulkImportPage: () => void;
  onDeleteCredential: (id: string) => void;
}

export default function VaultView({
  products,
  vault,
  onOpenManualAddPage,
  onOpenBulkImportPage,
  onDeleteCredential,
}: VaultViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'delivered'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStatistics, setShowStatistics] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectNoteItem, setInspectNoteItem] = useState<VaultCredential | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredVault = vault.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesProd = productFilter === 'all' || item.productId === productFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.id.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.variantName.toLowerCase().includes(q) ||
      item.secretValue.toLowerCase().includes(q) ||
      (item.batchNote || '').toLowerCase().includes(q);
    return matchesStatus && matchesProd && matchesSearch;
  });

  const availableCount = vault.filter((v) => v.status === 'available').length;
  const deliveredCount = vault.filter((v) => v.status === 'delivered').length;
  const tokenCount = vault.filter((v) => v.credentialType === 'token' && v.status === 'available').length;
  const emailLoginCount = vault.filter((v) => v.credentialType === 'email_login' && v.status === 'available').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Credential Vault
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenBulkImportPage}
            className="h-9 px-3.5 text-xs font-semibold bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_#059669] text-slate-700 dark:text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk Import</span>
          </button>

          <button
            type="button"
            onClick={onOpenManualAddPage}
            className="h-9 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Add</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedTabs
            options={[
              { value: 'all', label: 'All', count: vault.length },
              { value: 'available', label: 'In Stock', count: availableCount },
              { value: 'delivered', label: 'Delivered', count: deliveredCount },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, product, or key..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            aria-label="Filter by product"
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="In Stock" value={availableCount} badge="↑ 8%" />
          <StatMetric label="Tokens Ready" value={tokenCount} badge="+ 2 new" />
          <StatMetric label="Email Logins" value={emailLoginCount} badge="+ 3 slots" />
          <StatMetric label="Delivered" value={deliveredCount} badge="↑ 14%" />
        </Card>
      )}

      <Card className="overflow-hidden">
        {filteredVault.length === 0 ? (
          <EmptyTableState
            title="No credentials found"
            description="Reset the filter or search query to view all Vault credentials."
            onReset={() => {
              setStatusFilter('all');
              setProductFilter('all');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 w-9">
                    <ShadcnCheckbox
                      checked={
                        filteredVault.length > 0 && selectedIds.length === filteredVault.length
                      }
                      onChange={(checked) =>
                        setSelectedIds(checked ? filteredVault.map((i) => i.id) : [])
                      }
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Product &amp; Option</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 whitespace-nowrap">Credential</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredVault.map((item) => {
                  const isRevealed = Boolean(revealedIds[item.id]);
                  const isSelected = selectedIds.includes(item.id);
                  const maskedSecret =
                    item.secretValue.length > 14
                      ? `${item.secretValue.slice(0, 10)}••••••••${item.secretValue.slice(-4)}`
                      : '••••••••••••';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <ShadcnCheckbox
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.id}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.productName}{' '}
                        <span className="text-slate-400 font-normal">— {item.variantName}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {getCredentialTypeLabel(item.credentialType)}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300 max-w-[260px] truncate">
                        {isRevealed ? item.secretValue : maskedSecret}
                      </td>

                      <td className="py-3 px-3">
                        {item.status === 'available' ? (
                          <StatusIndicator tone="emerald" label="In Stock" />
                        ) : (
                          <StatusIndicator tone="zinc" label="Delivered" />
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {item.noteBBCode && (
                            <button
                              type="button"
                              onClick={() => setInspectNoteItem(item)}
                              className="px-2 py-1 text-[11px] font-medium border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-md cursor-pointer"
                            >
                              Note
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleReveal(item.id)}
                            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-md hover:border-slate-400 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={isRevealed ? 'Hide' : 'Reveal'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id, item.secretValue)}
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:border-emerald-500 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          {item.status === 'available' && (
                            <button
                              type="button"
                              onClick={() => onDeleteCredential(item.id)}
                              className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-md hover:border-rose-500 hover:text-rose-600 text-slate-400 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationFooter totalItems={filteredVault.length} pageSize={10} currentPage={1} />
      </Card>

      <ModalShell
        open={Boolean(inspectNoteItem)}
        onClose={() => setInspectNoteItem(null)}
        title={`Credential Note (${inspectNoteItem?.id})`}
        maxWidth="max-w-md"
      >
        {inspectNoteItem && (
          <div className="space-y-3 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {inspectNoteItem.productName} — {inspectNoteItem.variantName}
            </div>
            {inspectNoteItem.noteBBCode && (
              <BBCodeRenderer content={inspectNoteItem.noteBBCode} />
            )}
          </div>
        )}
      </ModalShell>

      <FloatingBulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Reveal',
            onClick: () => {
              const next: Record<string, boolean> = { ...revealedIds };
              selectedIds.forEach((id) => {
                next[id] = true;
              });
              setRevealedIds(next);
            },
          },
          {
            label: 'Delete',
            destructive: true,
            onClick: () => {
              selectedIds.forEach((id) => onDeleteCredential(id));
              setSelectedIds([]);
            },
          },
        ]}
      />
    </div>
  );
}
