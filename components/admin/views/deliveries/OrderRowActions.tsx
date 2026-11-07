'use client';

import { useEffect, useId, useRef } from 'react';
import { MessageSquare, MoreHorizontal, Pin, PinOff } from 'lucide-react';
import type { DigitalDelivery } from '@/lib/admin-data';

export function primaryFulfillAction(del: DigitalDelivery): {
  label: string;
  urgent: boolean;
  isReplace: boolean;
} {
  const renewPending = Boolean(del.renewalPending);
  const emptySecret = !del.credentialPayload.secretValue?.trim();
  if (del.status === 'pending_dispatch' || (renewPending && emptySecret)) {
    return {
      label: renewPending ? 'Assign' : 'Send',
      urgent: true,
      isReplace: false,
    };
  }
  if (del.status === 'warranty_claim') {
    return { label: 'Swap', urgent: true, isReplace: true };
  }
  return { label: 'Replace', urgent: false, isReplace: true };
}

type OrderRowActionsProps = {
  del: DigitalDelivery;
  unread: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onOpenChat: () => void;
  onFulfill: (isReplace: boolean) => void;
  onTogglePin?: () => void;
};

/** Chat + ⋯ menu (Send / Replace / Pin). */
export function OrderRowActions({
  del,
  unread,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onOpenChat,
  onFulfill,
  onTogglePin,
}: OrderRowActionsProps) {
  const action = primaryFulfillAction(del);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onMenuClose();
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onMenuClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [menuOpen, onMenuClose]);

  const menuItemClass =
    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 focus-visible:outline-none';

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onOpenChat}
        className={`relative h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
          unread > 0
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300'
        }`}
        aria-label={
          unread > 0
            ? `Open chat for ${del.orderId}, ${unread} unread`
            : `Open chat for ${del.orderId}`
        }
        title="Chat"
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold leading-4 tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={onMenuToggle}
          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          aria-label={`More actions for ${del.orderId}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          title="More"
        >
          <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label={`Actions for ${del.orderId}`}
            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                onFulfill(action.isReplace);
                onMenuClose();
              }}
            >
              {action.label}
            </button>
            {onTogglePin ? (
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => {
                  onTogglePin();
                  onMenuClose();
                }}
              >
                {del.pinned ? (
                  <>
                    <PinOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Pin
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
