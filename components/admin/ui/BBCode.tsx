'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  AlignCenter,
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
  List,
} from 'lucide-react';
import { applyBulletLines, splitBBCodeSegments } from './bbcode-segments';

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
  'list',
  'hr',
  'h',
  'center',
  'size',
  'color',
] as const;

const FONT_SIZES = [
  { value: '1', label: 'S', px: '13.5px' },
  { value: '2', label: 'M', px: '15.5px' },
  { value: '3', label: 'L', px: '17px' },
  { value: '4', label: 'XL', px: '19px' },
  { value: '5', label: '2X', px: '22px' },
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

function safeHref(raw: string): string {
  const trimmed = raw.trim();
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)) return trimmed;
  return '#';
}

function renderInlineBBCode(text: string): React.ReactNode[] {
  const parts = text.split(
    /(\[center\][\s\S]*?\[\/center\]|\[b\][\s\S]*?\[\/b\]|\[i\][\s\S]*?\[\/i\]|\[u\][\s\S]*?\[\/u\]|\[code\][\s\S]*?\[\/code\]|\[url(?:=[^\]]+)?\][\s\S]*?\[\/url\]|\[size=\d\][\s\S]*?\[\/size\]|\[color=[^\]]+\][\s\S]*?\[\/color\])/gi
  );

  return parts.map((part, idx) => {
    const lower = part.toLowerCase();

    if (lower.startsWith('[center]') && lower.endsWith('[/center]')) {
      return (
        <span key={idx} className="block text-center">
          {renderInlineBBCode(part.slice(8, -9))}
        </span>
      );
    }

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
      const href = safeHref(urlMatch[1] || urlMatch[2]);
      const label = urlMatch[1] ? urlMatch[2] : (urlMatch[1] || urlMatch[2]).trim();
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
  nested = false,
}: {
  content?: string;
  className?: string;
  nested?: boolean;
}) {
  if (!content || !content.trim()) return null;

  const blocks = content.split(
    /(\[center\][\s\S]*?\[\/center\]|\[warning\][\s\S]*?\[\/warning\]|\[notice\][\s\S]*?\[\/notice\]|\[quote\][\s\S]*?\[\/quote\]|\[h\][\s\S]*?\[\/h\]|\[hr\])/gi
  );

  return (
    <div
      className={
        nested
          ? `flex-1 min-w-0 space-y-2 text-pretty ${className}`
          : `space-y-3 text-[15px] sm:text-[15.5px] leading-[1.75] text-slate-700 dark:text-slate-300 tracking-normal ${className}`
      }
    >
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();

        if (lower.startsWith('[center]') && lower.endsWith('[/center]')) {
          const inner = trimmed.slice(8, -9).trim();
          return <BBCodeRenderer key={i} content={inner} nested={nested} className="text-center" />;
        }

        if (lower === '[hr]') {
          return (
            <hr
              key={i}
              className="border-0 border-t border-slate-200 dark:border-slate-700 my-4"
            />
          );
        }

        if (lower.startsWith('[warning]') && lower.endsWith('[/warning]')) {
          const inner = trimmed.slice(9, -10).trim();
          return (
            <div
              key={i}
              className="px-4 py-3 rounded-xl bg-amber-50/85 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 font-normal leading-[1.7] flex items-start gap-3"
            >
              <AlertTriangle className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400 shrink-0 mt-1" aria-hidden />
              <BBCodeRenderer content={inner} nested />
            </div>
          );
        }

        if (lower.startsWith('[notice]') && lower.endsWith('[/notice]')) {
          const inner = trimmed.slice(8, -9).trim();
          return (
            <div
              key={i}
              className="px-4 py-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 font-normal leading-[1.7] flex items-start gap-3"
            >
              <Info className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" aria-hidden />
              <BBCodeRenderer content={inner} nested />
            </div>
          );
        }

        if (lower.startsWith('[quote]') && lower.endsWith('[/quote]')) {
          const inner = trimmed.slice(7, -8).trim();
          return (
            <blockquote
              key={i}
              className="my-3 px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-emerald-500/70 dark:border-l-emerald-500 text-slate-700 dark:text-slate-200 font-normal leading-[1.7] flex items-start gap-3"
            >
              <Quote className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 shrink-0 mt-1" aria-hidden />
              <BBCodeRenderer content={inner} nested />
            </blockquote>
          );
        }

        if (lower.startsWith('[h]') && lower.endsWith('[/h]')) {
          const inner = trimmed.slice(3, -4).trim();
          return (
            <h3
              key={i}
              className="m-0 pt-2 first:pt-0 text-[17px] sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-normal"
            >
              {renderInlineBBCode(inner)}
            </h3>
          );
        }

        const segments = splitBBCodeSegments(trimmed);
        return (
          <div key={i} className="space-y-3">
            {segments.map((seg, sIdx) => {
              if (seg.kind === 'heading') {
                return (
                  <h3
                    key={sIdx}
                    className="m-0 pt-2 first:pt-0 text-[16.5px] sm:text-[17.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-normal"
                  >
                    {renderInlineBBCode(seg.text)}
                  </h3>
                );
              }
              if (seg.kind === 'list') {
                return (
                  <ul
                    key={sIdx}
                    className="my-1.5 first:mt-0 last:mb-0 space-y-2 list-none p-0 m-0 text-left"
                  >
                    {seg.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 leading-[1.7] text-pretty"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#FF5E5B] shrink-0 mt-[10px]"
                          aria-hidden
                        />
                        <span className="flex-1">{renderInlineBBCode(item)}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={sIdx} className="m-0 whitespace-pre-line leading-[1.75] text-pretty">
                  {renderInlineBBCode(seg.text)}
                </p>
              );
            })}
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (openTag: string, closeTag: string, sample = '') => {
    const el = textareaRef.current;
    if (el && !showPreview) {
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      if (start !== end || start < value.length) {
        const inner = start !== end ? value.slice(start, end) : sample;
        const snippet = closeTag ? `${openTag}${inner}${closeTag}` : openTag;
        onChange(`${value.slice(0, start)}${snippet}${value.slice(end)}`);
        return;
      }
    }
    const snippet = closeTag ? `${openTag}${sample}${closeTag}` : openTag;
    if (!value) {
      onChange(snippet);
      return;
    }
    const needsBreak = !value.endsWith('\n');
    onChange(`${value}${needsBreak ? '\n' : ''}${snippet}`);
  };

  const insertBullets = () => {
    const el = textareaRef.current;
    const start = el && !showPreview ? (el.selectionStart ?? value.length) : value.length;
    const end = el && !showPreview ? (el.selectionEnd ?? value.length) : value.length;
    onChange(applyBulletLines(value, start, end));
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
          <button type="button" onClick={() => insertTag('[center]', '[/center]', 'Centered text')} className={toolBtn} title="Center" aria-label="Center">
            <AlignCenter className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={insertBullets}
            className={toolBtn}
            title="Bullet list (works inside [quote] too)"
            aria-label="Bullet list"
          >
            <List className="w-3.5 h-3.5" aria-hidden />
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
            ref={textareaRef}
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
