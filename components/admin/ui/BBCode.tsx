'use client';

import React, { useState } from 'react';
import { AlertTriangle, Info, Code, Bold, Eye } from 'lucide-react';

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
