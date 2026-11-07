'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export type RowMenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  hidden?: boolean;
};

/** Compact "⋯" menu for row actions. Portaled so tables never clip it. */
export function RowMenu({
  items,
  label = 'Actions',
}: {
  items: RowMenuItem[];
  label?: string;
}) {
  const visible = items.filter((i) => !i.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 200;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
    const below = r.bottom + 6;
    const estH = visible.length * 38 + 12;
    const top = below + estH > window.innerHeight ? Math.max(8, r.top - estH - 6) : below;
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
        );
        const i = els.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[next]?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    requestAnimationFrame(() =>
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(),
    );
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              id={id}
              role="menu"
              style={{ top: pos.top, left: pos.left, width: 200 }}
              className="admin-console fixed z-[70] rounded-lg border border-slate-200 bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900"
            >
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium focus:outline-none cursor-pointer ${
                      item.tone === 'danger'
                        ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40'
                        : 'text-slate-700 hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800'
                    }`}
                  >
                    {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-70" /> : null}
                    {item.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
