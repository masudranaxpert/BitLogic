'use client';

import React, { useEffect, useId, useState } from 'react';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  AlertTriangle,
  Info,
  Code,
  Bold,
  Eye,
} from 'lucide-react';
import { CredentialType } from '@/lib/admin-data';

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

export function getCredentialTypeLabel(type: CredentialType): string {
  switch (type) {
    case 'token':
      return 'Token';
    case 'license_key':
      return 'License Key';
    case 'email_login':
      return 'Email Login';
    case 'invite_link':
      return 'Team Invite';
  }
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface-card rounded-[10px] ${className}`}>
      {children}
    </div>
  );
}

export function StatMetric({
  label,
  value,
  badge,
  subtext = 'vs last month',
  tone = 'emerald',
}: {
  label: string;
  value: string | number;
  badge: string;
  subtext?: string;
  tone?: 'emerald' | 'amber' | 'slate';
}) {
  const badgeClasses = {
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    slate:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div className="p-5">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums mt-1.5">
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400 dark:text-slate-500">
        <span>{subtext}</span>
        <span
          className={`px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold tabular-nums ${badgeClasses[tone]}`}
        >
          {badge}
        </span>
      </div>
    </div>
  );
}

export function StatusIndicator({
  tone,
  label,
  detail,
}: {
  tone: 'emerald' | 'amber' | 'red' | 'zinc' | 'blue' | 'purple';
  label: string;
  detail?: string;
  dot?: boolean;
}) {
  const toneClasses = {
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    red:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
    blue:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    purple:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
    zinc:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-xs font-medium whitespace-nowrap shrink-0 ${toneClasses[tone]}`}
    >
      <span>{label}</span>
      {detail && (
        <span className="font-mono tabular-nums text-[11px] opacity-80">
          · {detail}
        </span>
      )}
    </span>
  );
}

export function SwitchToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md h-9 px-1"
    >
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-[6px] p-0.5 transition-colors duration-150 ${
          checked
            ? 'bg-emerald-600'
            : 'bg-slate-200 dark:bg-slate-800 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-[4px] bg-white shadow-2xs transition-transform duration-150 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export function ShadcnCheckbox({
  checked,
  onChange,
  ariaLabel = 'Select row',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
        checked
          ? 'bg-emerald-600 text-white shadow-2xs'
          : 'bg-white dark:bg-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] hover:shadow-[inset_0_0_0_1px_#059669]'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
    </button>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="surface-pill-segment inline-flex items-center p-1 rounded-[10px] h-9 max-w-full overflow-x-auto gap-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`px-3 h-7 inline-flex items-center text-xs font-medium whitespace-nowrap shrink-0 rounded-[6px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              active
                ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`ml-1.5 font-mono tabular-nums text-[11px] ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function renderInlineBBCode(text: string): React.ReactNode[] {
  const parts = text.split(/(\[b\][\s\S]*?\[\/b\]|\[code\][\s\S]*?\[\/code\])/gi);
  return parts.map((part, idx) => {
    if (part.toLowerCase().startsWith('[b]') && part.toLowerCase().endsWith('[/b]')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(3, -4)}
        </strong>
      );
    }
    if (part.toLowerCase().startsWith('[code]') && part.toLowerCase().endsWith('[/code]')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700"
        >
          {part.slice(6, -7)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function BBCodeRenderer({
  content,
  className = '',
}: {
  content?: string;
  className?: string;
}) {
  if (!content || !content.trim()) return null;

  const blocks = content.split(
    /(\[warning\][\s\S]*?\[\/warning\]|\[notice\][\s\S]*?\[\/notice\])/gi
  );

  return (
    <div className={`space-y-2 text-xs leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (
          trimmed.toLowerCase().startsWith('[warning]') &&
          trimmed.toLowerCase().endsWith('[/warning]')
        ) {
          const inner = trimmed.slice(9, -10).trim();
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">{renderInlineBBCode(inner)}</div>
            </div>
          );
        }

        if (
          trimmed.toLowerCase().startsWith('[notice]') &&
          trimmed.toLowerCase().endsWith('[/notice]')
        ) {
          const inner = trimmed.slice(8, -9).trim();
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{renderInlineBBCode(inner)}</div>
            </div>
          );
        }

        return (
          <div key={i} className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {renderInlineBBCode(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export function BBCodeEditor({
  label,
  value,
  onChange,
  rows = 4,
  placeholder = 'Write description or insert [warning]...[/warning] tags...',
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const insertTag = (openTag: string, closeTag: string, sample: string) => {
    const snippet = `${openTag}${sample}${closeTag}`;
    onChange(value ? `${value}\n${snippet}` : snippet);
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() =>
              insertTag(
                '[warning]',
                '[/warning]',
                'Do NOT click Log Out or change password, otherwise warranty is void.'
              )
            }
            className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
            title="Insert Warning Box"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>[warning]</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertTag(
                '[notice]',
                '[/notice]',
                'Instant Auto-Vault delivery with full replacement warranty.'
              )
            }
            className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
            title="Insert Notice Box"
          >
            <Info className="w-3 h-3" />
            <span>[notice]</span>
          </button>

          <button
            type="button"
            onClick={() => insertTag('[b]', '[/b]', 'Important')}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
            title="Insert Bold Tag"
          >
            <Bold className="w-3 h-3" />
            <span>[b]</span>
          </button>

          <button
            type="button"
            onClick={() => insertTag('[code]', '[/code]', 'PIN: 4820')}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
            title="Insert Code Tag"
          >
            <Code className="w-3 h-3" />
            <span>[code]</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`px-2 py-1 rounded border font-medium text-[11px] inline-flex items-center gap-1 cursor-pointer ${
              showPreview
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
      />

      {showPreview && value.trim() && (
        <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            BBCode Live Preview
          </div>
          <BBCodeRenderer content={value} />
        </div>
      )}
    </div>
  );
}

export function EmptyTableState({
  title = 'No matching records',
  description = 'Try clearing your search or switching tabs.',
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="py-12 px-4 text-center">
      <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        {description}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3.5 pl-3 pr-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}

export function PaginationFooter({
  totalItems,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
}: {
  totalItems: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const [internalPage, setInternalPage] = useState(currentPage);
  const [internalSize, setInternalSize] = useState(pageSize);

  const activePage = onPageChange ? currentPage : internalPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / internalSize));
  const startItem = totalItems === 0 ? 0 : (activePage - 1) * internalSize + 1;
  const endItem = Math.min(totalItems, activePage * internalSize);

  const handlePage = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next));
    setInternalPage(clamped);
    onPageChange?.(clamped);
  };

  return (
    <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/40 rounded-b-[10px]">
      <div className="flex flex-wrap items-center gap-2">
        <span>Showing per page</span>
        <select
          value={internalSize}
          onChange={(e) => {
            setInternalSize(Number(e.target.value));
            setInternalPage(1);
          }}
          aria-label="Rows per page"
          className="px-2 py-1 text-xs font-mono tabular-nums font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <span className="font-mono tabular-nums">
          <strong className="text-slate-900 dark:text-slate-100">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-slate-900 dark:text-slate-100">{totalItems}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => handlePage(1)}
          disabled={activePage <= 1}
          aria-label="First page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handlePage(activePage - 1)}
          disabled={activePage <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold font-mono text-xs tabular-nums">
          {activePage}
        </span>
        {totalPages > 1 && (
          <button
            type="button"
            onClick={() => handlePage(activePage === 1 ? 2 : 1)}
            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-mono text-xs tabular-nums cursor-pointer"
          >
            {activePage === 1 ? 2 : 1}
          </button>
        )}
        <button
          type="button"
          onClick={() => handlePage(activePage + 1)}
          disabled={activePage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handlePage(totalPages)}
          disabled={activePage >= totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function FloatingBulkActionBar({
  selectedCount,
  onClear,
  actions,
}: {
  selectedCount: number;
  onClear: () => void;
  actions: { label: string; icon?: React.ReactNode; onClick: () => void; destructive?: boolean }[];
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk selection actions"
      className="surface-elevated fixed bottom-18 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 pl-3 rounded-xl max-w-[calc(100vw-1.5rem)] overflow-x-auto"
    >
      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 pr-2.5 border-r border-slate-200 dark:border-slate-700 font-mono tabular-nums whitespace-nowrap shrink-0">
        {selectedCount} Selected
      </span>
      <div className="flex items-center gap-1.5">
        {actions.map((act, i) => (
          <button
            key={i}
            type="button"
            onClick={act.onClick}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-[6px] border inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              act.destructive
                ? 'border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-[6px] cursor-pointer shrink-0"
        aria-label="Clear selection"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`surface-elevated w-full ${maxWidth} rounded-xl max-h-[92dvh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="font-display text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">{children}</div>
      </div>
    </div>
  );
}
