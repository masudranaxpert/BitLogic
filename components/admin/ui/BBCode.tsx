'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Info,
  Code2,
  Bold,
  Italic,
  Underline,
  Eye,
  Pencil,
  Link2,
  Quote,
  Minus,
  Heading2,
} from 'lucide-react';

/** Tags this editor can insert and render. */
export const SUPPORTED_BBCODE = [
  'warning',
  'notice',
  'b',
  'i',
  'u',
  'code',
  'url',
  'quote',
  'hr',
  'h',
  'size',
  'color',
] as const;

const FONT_SIZES = [
  { value: '1', label: 'S', px: '12px' },
  { value: '2', label: 'M', px: '14px' },
  { value: '3', label: 'L', px: '16px' },
  { value: '4', label: 'XL', px: '18px' },
  { value: '5', label: '2X', px: '20px' },
] as const;

const FONT_COLORS = [
  { value: 'slate', label: 'Slate', hex: '#334155' },
  { value: 'red', label: 'Red', hex: '#dc2626' },
  { value: 'amber', label: 'Amber', hex: '#d97706' },
  { value: 'green', label: 'Green', hex: '#059669' },
  { value: 'blue', label: 'Blue', hex: '#2563eb' },
  { value: 'violet', label: 'Violet', hex: '#7c3aed' },
] as const;

function sizeToPx(size: string): string {
  return FONT_SIZES.find((s) => s.value === size)?.px || '14px';
}

function colorToHex(color: string): string {
  const named = FONT_COLORS.find((c) => c.value === color.toLowerCase());
  if (named) return named.hex;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color;
  return '#334155';
}

function renderInlineBBCode(text: string): React.ReactNode[] {
  const parts = text.split(
    /(\[b\][\s\S]*?\[\/b\]|\[i\][\s\S]*?\[\/i\]|\[u\][\s\S]*?\[\/u\]|\[code\][\s\S]*?\[\/code\]|\[url(?:=[^\]]+)?\][\s\S]*?\[\/url\]|\[size=\d\][\s\S]*?\[\/size\]|\[color=[^\]]+\][\s\S]*?\[\/color\])/gi
  );

  return parts.map((part, idx) => {
    const lower = part.toLowerCase();

    if (lower.startsWith('[b]') && lower.endsWith('[/b]')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
          {renderInlineBBCode(part.slice(3, -4))}
        </strong>
      );
    }
    if (lower.startsWith('[i]') && lower.endsWith('[/i]')) {
      return (
        <em key={idx} className="italic">
          {renderInlineBBCode(part.slice(3, -4))}
        </em>
      );
    }
    if (lower.startsWith('[u]') && lower.endsWith('[/u]')) {
      return (
        <span key={idx} className="underline underline-offset-2">
          {renderInlineBBCode(part.slice(3, -4))}
        </span>
      );
    }
    if (lower.startsWith('[code]') && lower.endsWith('[/code]')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[12px] text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700"
        >
          {part.slice(6, -7)}
        </code>
      );
    }

    const urlMatch = part.match(/^\[url(?:=([^\]]+))?\]([\s\S]*?)\[\/url\]$/i);
    if (urlMatch) {
      const href = (urlMatch[1] || urlMatch[2]).trim();
      const label = urlMatch[1] ? urlMatch[2] : href;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
        >
          {renderInlineBBCode(label)}
        </a>
      );
    }

    const sizeMatch = part.match(/^\[size=(\d)\]([\s\S]*?)\[\/size\]$/i);
    if (sizeMatch) {
      return (
        <span key={idx} style={{ fontSize: sizeToPx(sizeMatch[1]) }}>
          {renderInlineBBCode(sizeMatch[2])}
        </span>
      );
    }

    const colorMatch = part.match(/^\[color=([^\]]+)\]([\s\S]*?)\[\/color\]$/i);
    if (colorMatch) {
      return (
        <span key={idx} style={{ color: colorToHex(colorMatch[1].trim()) }}>
          {renderInlineBBCode(colorMatch[2])}
        </span>
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
    /(\[warning\][\s\S]*?\[\/warning\]|\[notice\][\s\S]*?\[\/notice\]|\[quote\][\s\S]*?\[\/quote\]|\[h\][\s\S]*?\[\/h\]|\[hr\])/gi
  );

  return (
    <div className={`space-y-2 text-sm leading-[1.55] ${className}`}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();

        if (lower === '[hr]') {
          return (
            <hr
              key={i}
              className="border-0 border-t border-slate-200 dark:border-slate-700 my-3"
            />
          );
        }

        if (lower.startsWith('[warning]') && lower.endsWith('[/warning]')) {
          const inner = trimmed.slice(9, -10).trim();
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 font-normal flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 text-pretty">{renderInlineBBCode(inner)}</div>
            </div>
          );
        }

        if (lower.startsWith('[notice]') && lower.endsWith('[/notice]')) {
          const inner = trimmed.slice(8, -9).trim();
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 font-normal flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 text-pretty">{renderInlineBBCode(inner)}</div>
            </div>
          );
        }

        if (lower.startsWith('[quote]') && lower.endsWith('[/quote]')) {
          const inner = trimmed.slice(7, -8).trim();
          return (
            <blockquote
              key={i}
              className="m-0 pl-3 border-l-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
            >
              {renderInlineBBCode(inner)}
            </blockquote>
          );
        }

        if (lower.startsWith('[h]') && lower.endsWith('[/h]')) {
          const inner = trimmed.slice(3, -4).trim();
          return (
            <h3
              key={i}
              className="m-0 text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {renderInlineBBCode(inner)}
            </h3>
          );
        }

        return (
          <div key={i} className="admin-body whitespace-pre-line text-pretty">
            {renderInlineBBCode(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

const toolBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded cursor-pointer transition-colors duration-150 ' +
  'text-slate-500 dark:text-slate-400 ' +
  'hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35';

const toolSelect =
  'h-7 max-w-[5.5rem] px-1.5 rounded text-[11px] font-medium cursor-pointer ' +
  'bg-transparent border-0 text-slate-500 dark:text-slate-400 ' +
  'hover:bg-slate-200/70 dark:hover:bg-slate-800 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35';

export function BBCodeEditor({
  label,
  value,
  onChange,
  rows = 5,
  placeholder = 'Description…',
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const insertTag = (openTag: string, closeTag: string, sample = '') => {
    const snippet = closeTag ? `${openTag}${sample}${closeTag}` : openTag;
    if (!value) {
      onChange(snippet);
      return;
    }
    const needsBreak = !value.endsWith('\n');
    onChange(`${value}${needsBreak ? '\n' : ''}${snippet}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="admin-label m-0 block">{label}</label>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-emerald-600 transition-colors">
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50"
        >
          <button type="button" onClick={() => insertTag('[b]', '[/b]', 'bold')} className={toolBtn} title="Bold" aria-label="Bold">
            <Bold className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[i]', '[/i]', 'italic')} className={toolBtn} title="Italic" aria-label="Italic">
            <Italic className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[u]', '[/u]', 'underline')} className={toolBtn} title="Underline" aria-label="Underline">
            <Underline className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[code]', '[/code]', 'code')} className={toolBtn} title="Code" aria-label="Code">
            <Code2 className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[h]', '[/h]', 'Heading')} className={toolBtn} title="Heading" aria-label="Heading">
            <Heading2 className="w-3.5 h-3.5" aria-hidden />
          </button>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden />

          <button type="button" onClick={() => insertTag('[url=https://]', '[/url]', 'link')} className={toolBtn} title="Link" aria-label="Link">
            <Link2 className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[quote]', '[/quote]', 'Quoted text')} className={toolBtn} title="Quote" aria-label="Quote">
            <Quote className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[hr]', '')} className={toolBtn} title="Divider" aria-label="Divider">
            <Minus className="w-3.5 h-3.5" aria-hidden />
          </button>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden />

          <button type="button" onClick={() => insertTag('[warning]', '[/warning]', 'Warning')} className={toolBtn} title="Warning" aria-label="Warning">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" aria-hidden />
          </button>
          <button type="button" onClick={() => insertTag('[notice]', '[/notice]', 'Notice')} className={toolBtn} title="Notice" aria-label="Notice">
            <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" aria-hidden />
          </button>

          <select
            className={toolSelect}
            defaultValue=""
            aria-label="Text size"
            title="Size"
            onChange={(e) => {
              const size = e.target.value;
              if (!size) return;
              insertTag(`[size=${size}]`, '[/size]', 'text');
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Size
            </option>
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <span className="inline-flex items-center gap-0.5 px-0.5" role="group" aria-label="Text color">
            {FONT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => insertTag(`[color=${c.value}]`, '[/color]', 'text')}
                className="h-5 w-5 rounded-sm border border-slate-300/90 dark:border-slate-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                style={{ backgroundColor: c.hex }}
                title={c.label}
                aria-label={c.label}
              />
            ))}
          </span>

          <span className="flex-1 min-w-2" aria-hidden />

          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`inline-flex h-7 items-center gap-1.5 px-2 rounded text-xs font-medium cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35 ${
              showPreview
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
            title={showPreview ? 'Edit' : 'Preview'}
            aria-pressed={showPreview}
            aria-label={showPreview ? 'Edit' : 'Preview'}
          >
            {showPreview ? <Pencil className="w-3.5 h-3.5" aria-hidden /> : <Eye className="w-3.5 h-3.5" aria-hidden />}
            <span>{showPreview ? 'Edit' : 'Preview'}</span>
          </button>
        </div>

        {showPreview ? (
          <div className="min-h-[8.5rem] px-3.5 py-3">
            {value.trim() ? (
              <BBCodeRenderer content={value} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Empty.</p>
            )}
          </div>
        ) : (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-3 text-sm leading-relaxed bg-transparent border-0 rounded-none resize-y focus:outline-none focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        )}
      </div>
    </div>
  );
}
