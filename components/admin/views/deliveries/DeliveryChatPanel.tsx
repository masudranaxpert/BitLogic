'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  ArrowLeft,
  Paperclip,
  Reply,
  FileText,
  X,
  Pin,
  PinOff,
  ArrowUp,
} from 'lucide-react';
import type { DigitalDelivery, PaymentTransaction } from '@/lib/admin-data';
import {
  Card,
  getCredentialTypeLabel,
  StatusIndicator,
  BBCodeRenderer,
  SegmentedTabs,
  formatBDT,
} from '@/components/admin/ui/primitives';
import type { DeliveriesViewState } from './useDeliveriesViewState';
import { OrderNotesPanel } from './OrderNotesPanel';

type DetailTab = 'profile' | 'order' | 'credential' | 'payments' | 'notes';

type DeliveryChatPanelProps = {
  delivery: DigitalDelivery;
  /** All units of the same order (any product). */
  siblings?: DigitalDelivery[];
  /** Render only the chat card (used by the order page). */
  chatOnly?: boolean;
  payments?: PaymentTransaction[];
  onSelectChatDelivery?: (deliveryId: string | null) => void;
  onTogglePinOrder?: (deliveryId: string) => void;
  state: DeliveriesViewState;
};

export function DeliveryChatPanel({
  delivery,
  siblings = [],
  chatOnly = false,
  payments = [],
  onSelectChatDelivery,
  onTogglePinOrder,
  state,
}: DeliveryChatPanelProps) {
  const {
    openActionModal,
    handleCopy,
    copiedId,
    setReplyingTo,
    setLightboxImage,
    replyingTo,
    stagedAttachment,
    uploadError,
    setUploadError,
    setStagedAttachment,
    fileInputRef,
    handleFileChange,
    chatText,
    setChatText,
    handleChatKeyDown,
    submitOrderChatMessage,
  } = state;

  const [detailTab, setDetailTab] = useState<DetailTab>('profile');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const COMPOSER_MAX_ROWS = 5;

  const messages = delivery.chatMessages || [];
  const audit = delivery.credentialAudit || [];

  // Scroll only the chat pane — never the whole page (scrollIntoView jumps up).
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, delivery.id]);

  // Compact start → grow with text → scroll after max rows.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const styles = window.getComputedStyle(el);
    const line = parseFloat(styles.lineHeight) || 20;
    const padding =
      (parseFloat(styles.paddingTop) || 0) +
      (parseFloat(styles.paddingBottom) || 0);
    const min = line + padding;
    const max = line * COMPOSER_MAX_ROWS + padding;
    el.style.height = 'auto';
    const content = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(content, min), max)}px`;
    el.style.overflowY = content > max ? 'auto' : 'hidden';
  }, [chatText]);
  const latest = audit[0];
  const credentialId =
    delivery.vaultCredentialId ||
    delivery.credentialPayload.vaultCredentialId ||
    latest?.vaultCredentialId;

  const buyerCard = (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 px-4 py-4 sm:px-5 dark:border-slate-800">
        <div
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 font-display text-[13px] font-semibold tracking-tight text-white shadow-md shadow-emerald-600/25 ring-1 ring-black/5 dark:shadow-emerald-900/40 dark:ring-white/10"
          aria-hidden="true"
        >
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,transparent_45%)]" />
          <span className="relative z-[1]">
            {delivery.buyerName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
            {delivery.buyerName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {delivery.id}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {delivery.orderId}
            </span>
          </div>
        </div>
        {onTogglePinOrder ? (
          <button
            type="button"
            onClick={() => onTogglePinOrder(delivery.id)}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:hover:text-emerald-300"
            title={delivery.pinned ? 'Unpin' : 'Pin'}
            aria-label={delivery.pinned ? 'Unpin order' : 'Pin order'}
          >
            {delivery.pinned ? (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      <dl className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800/80">
        {(
          [
            { label: 'Email', value: delivery.buyerEmail },
            { label: 'Phone', value: delivery.buyerPhone },
            { label: 'Created', value: delivery.createdAt },
            {
              label: 'Order expires',
              value: delivery.orderExpiresAt || '—',
            },
            {
              label: 'Cred window',
              value: delivery.credentialExpiresAt
                ? `${delivery.credentialExpiresAt} (${delivery.credentialValidDays ?? 30}d)`
                : delivery.credentialClearedAt
                  ? `Cleared ${delivery.credentialClearedAt}`
                  : 'Not assigned',
            },
            {
              label: 'Warranty',
              value: delivery.hasWarranty
                ? `${delivery.warrantyRemainingDays} / ${delivery.warrantyDays} days`
                : 'None',
              accent: delivery.hasWarranty,
            },
          ] as { label: string; value: string; accent?: boolean }[]
        ).map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <dt className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
              {row.label}
            </dt>
            <dd
              className={`break-all text-sm sm:text-right ${
                row.accent
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'font-medium text-slate-900 dark:text-slate-100'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {delivery.renewalPending ? (
        <div className="mx-4 mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-900 sm:mx-5 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          Renewal paid
        </div>
      ) : null}

      {delivery.warrantyClaimReason ? (
        <div className="mx-4 mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 sm:mx-5 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <span className="mb-1 block font-semibold">Warranty claim</span>
          {delivery.warrantyClaimReason}
        </div>
      ) : null}
    </Card>
  );

  const orderTab = (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
        Order info
      </div>
      <dl className="space-y-3.5">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
          <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Product
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right">
            {delivery.productName} — {delivery.variantName}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
          <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Type
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right">
            {getCredentialTypeLabel(delivery.credentialType)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
          <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Mode
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right">
            {delivery.deliveryMode}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
          <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">
            VPN
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right">
            {delivery.vpnRequired
              ? delivery.vpnRegionNote || 'Required'
              : 'Not required'}
          </dd>
        </div>
      </dl>
      {delivery.customAdminNote ? (
        <div className="space-y-1.5 border-t border-slate-200/80 pt-3 dark:border-slate-800">
          <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Description
          </span>
          <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <BBCodeRenderer content={delivery.customAdminNote} />
          </div>
        </div>
      ) : null}
    </Card>
  );

  const credentialTab = (
    <Card className="p-4 sm:p-5 space-y-4">
      {(() => {
        const assignedAt =
          delivery.credentialAssignedAt ||
          latest?.at ||
          delivery.deliveredAt ||
          undefined;
        return (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Delivery secret
                </div>
                {assignedAt ? (
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {latest?.action === 'replaced'
                      ? 'Updated'
                      : latest?.action === 'renewed'
                        ? 'Renewed'
                        : 'Assigned'}{' '}
                    {assignedAt}
                    {delivery.credentialExpiresAt
                      ? ` · ends ${delivery.credentialExpiresAt}`
                      : ''}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Not assigned yet
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                {getCredentialTypeLabel(delivery.credentialType)}
              </span>
            </div>

            {credentialId ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                    Credential ID
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                    {credentialId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('chat-cred-id', credentialId)}
                  className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                  title="Copy credential ID"
                >
                  {copiedId === 'chat-cred-id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : null}

            {delivery.credentialPayload.secretValue ? (
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                      Current
                    </div>
                    <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all block">
                      {delivery.credentialPayload.secretValue}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'chat-cred',
                        delivery.credentialPayload.secretValue,
                      )
                    }
                    className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                    title="Copy secret"
                  >
                    {copiedId === 'chat-cred' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {delivery.credentialPayload.profilePin ? (
                  <div className="px-3 py-2 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 font-mono text-xs text-emerald-800 dark:text-emerald-300">
                    PIN / Slot: {delivery.credentialPayload.profilePin}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-3.5 rounded-md bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
                <span>
                  {delivery.credentialClearedAt
                    ? 'Credential cleared after window ended.'
                    : 'Credential not sent yet.'}
                </span>
                <button
                  type="button"
                  onClick={() => openActionModal(delivery, false)}
                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shrink-0"
                >
                  {delivery.renewalPending ? 'Assign' : 'Send now'}
                </button>
              </div>
            )}

            {audit.length > 0 ? (
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Secret history
                </div>
                <ol className="space-y-2.5">
                  {audit.map((entry, idx) => (
                    <li
                      key={entry.id}
                      className="relative pl-3.5 border-l-2 border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {entry.action}
                        </span>
                        <span className="text-slate-400">{entry.at}</span>
                        <span className="text-slate-400">
                          ·{' '}
                          {entry.source === 'vault'
                            ? 'Credentials'
                            : entry.source === 'system'
                              ? 'System'
                              : 'Custom'}
                        </span>
                        {idx === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            · now
                          </span>
                        ) : null}
                      </div>
                      {entry.vaultCredentialId ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono truncate">
                            {entry.vaultCredentialId}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `aud-id-${entry.id}`,
                                entry.vaultCredentialId!,
                              )
                            }
                            className="p-0.5 rounded text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                            title="Copy credential ID"
                          >
                            {copiedId === `aud-id-${entry.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : null}
                      {entry.secretValue ? (
                        <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                          {entry.secretValue}
                        </div>
                      ) : null}
                      {entry.previousSecretValue ? (
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="text-slate-400">Was: </span>
                          <span className="font-mono line-through break-all">
                            {entry.previousSecretValue}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        );
      })()}
    </Card>
  );

  const paymentsTab = (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200/80 px-4 py-3.5 sm:px-5 dark:border-slate-800">
        <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Payments
        </div>
      </div>
      {payments.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-slate-400">
          No payments linked yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {payments.map((p) => (
            <li
              key={p.id}
              className="px-4 py-3 sm:px-5 flex items-start justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {formatBDT(p.amountBDT)}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                    {p.kind || 'purchase'}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-500 truncate">
                  {p.trxId} · {p.gateway}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {p.createdAt}
                </div>
              </div>
              <StatusIndicator
                tone={
                  p.status === 'verified'
                    ? 'emerald'
                    : p.status === 'pending_verification'
                      ? 'amber'
                      : 'red'
                }
                label={
                  p.status === 'verified'
                    ? 'Paid'
                    : p.status === 'pending_verification'
                      ? 'Pending'
                      : p.status === 'refunded'
                        ? 'Refunded'
                        : 'Rejected'
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const tabBody =
    detailTab === 'profile'
      ? buyerCard
      : detailTab === 'order'
        ? orderTab
        : detailTab === 'credential'
          ? credentialTab
          : detailTab === 'notes'
            ? (
                <OrderNotesPanel
                  key={delivery.id}
                  orderId={delivery.orderId}
                  deliveryId={delivery.id}
                  canDeliverWithoutCredential={delivery.status === 'pending_dispatch'}
                />
              )
            : paymentsTab;

  const chatCard = (
    <Card className="flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center">
              {delivery.buyerName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5"
              title="Buyer Online"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                {delivery.buyerName}
              </span>
              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {delivery.orderId}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Order chat
            </div>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div
        ref={messagesScrollRef}
        className="max-h-[460px] min-h-[280px] space-y-3.5 overflow-y-auto bg-slate-50/30 p-4 dark:bg-slate-950/30"
      >
        {messages.length === 0 ? (
          <div className="space-y-2 py-16 text-center">
            <MessageSquare className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No messages
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender === 'admin';
            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {isAdmin ? 'You (Support Admin)' : msg.senderName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {msg.time}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyingTo({
                        id: msg.id,
                        senderName: isAdmin ? 'Support Admin' : msg.senderName,
                        text: msg.text,
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer"
                    title="Reply to this message"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[76%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isAdmin
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs'
                  }`}
                >
                  {msg.replyTo ? (
                    <div
                      className={`mb-2 pl-2.5 py-1 border-l-2 rounded text-[11px] ${
                        isAdmin
                          ? 'border-emerald-200 bg-emerald-700/60 text-emerald-50'
                          : 'border-emerald-500 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-semibold">
                        {msg.replyTo.senderName}
                      </div>
                      <div className="truncate">{msg.replyTo.text}</div>
                    </div>
                  ) : null}

                  <div className="whitespace-pre-wrap break-words">
                    {msg.text}
                  </div>

                  {msg.attachment ? (
                    <div className="mt-2.5">
                      {msg.attachment.type === 'image' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage(msg.attachment!.url)
                          }
                          className="block rounded-lg overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name}
                            className="max-h-44 w-auto object-cover"
                          />
                        </button>
                      ) : (
                        <a
                          href={msg.attachment.url}
                          download={msg.attachment.name}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                            isAdmin
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {msg.attachment.name}
                          </span>
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact inline composer: attach | input | send */}
      <div className="border-t border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitOrderChatMessage();
          }}
          className="rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950"
        >
          {(replyingTo || stagedAttachment || uploadError) && (
            <div className="space-y-1.5 border-b border-slate-100 px-2.5 py-2 text-xs dark:border-slate-800">
              {uploadError ? (
                <div className="flex items-center justify-between font-medium text-rose-600 dark:text-rose-400">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="cursor-pointer rounded-md p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    aria-label="Dismiss error"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {replyingTo ? (
                <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
                  <div className="min-w-0 border-l-2 border-emerald-600 pl-2">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Replying to {replyingTo.senderName}
                    </span>
                    <div className="truncate text-slate-500">{replyingTo.text}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    aria-label="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {stagedAttachment ? (
                <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                  <FileText
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">
                    {stagedAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    className="cursor-pointer rounded p-0.5 text-slate-400 hover:text-rose-600"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div className="flex items-end gap-1 px-1.5 py-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-0.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Attach image or PDF"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>

            <textarea
              ref={composerRef}
              rows={1}
              data-autogrow
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Write a message…"
              aria-label="Message"
              enterKeyHint="send"
              style={{ resize: 'none' }}
              className="max-h-[7.5rem] min-h-[32px] flex-1 resize-none overflow-y-hidden border-0 bg-transparent px-1 py-1.5 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
            />

            <button
              type="submit"
              disabled={!chatText.trim() && !stagedAttachment}
              className="mb-0.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </Card>
  );

  if (chatOnly) return chatCard;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectChatDelivery?.(null)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {delivery.orderId}
          </span>
          <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
            {delivery.productName} · {delivery.variantName}
          </h1>
          {delivery.status === 'delivered' && (
            <StatusIndicator tone="emerald" label="Delivered" />
          )}
          {delivery.status === 'pending_dispatch' && (
            <StatusIndicator tone="amber" label="Pending" />
          )}
          {delivery.status === 'warranty_claim' && (
            <StatusIndicator tone="red" label="Warranty Claim" />
          )}
          {delivery.status === 'replaced' && (
            <StatusIndicator tone="blue" label="Replaced" />
          )}
          {delivery.renewalPending ? (
            <StatusIndicator tone="blue" label="Renew pending" />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() =>
            openActionModal(
              delivery,
              Boolean(delivery.credentialPayload.secretValue) &&
                delivery.status !== 'pending_dispatch',
            )
          }
          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          {delivery.status === 'pending_dispatch' ||
          (delivery.renewalPending && !delivery.credentialPayload.secretValue)
            ? delivery.renewalPending
              ? 'Assign'
              : 'Send'
            : 'Replace'}
        </button>
      </div>

      {siblings.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Items in this order
          </span>
          {siblings.map((u, i) => {
            const ready = u.status === 'delivered' && Boolean(u.credentialPayload.secretValue?.trim());
            const active = u.id === delivery.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectChatDelivery?.(u.id)}
                title={u.productName + ' — ' + u.variantName}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm cursor-pointer ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{i + 1}. {u.productName}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Tabs sit under order title — control left content only; chat stays */}
      <SegmentedTabs
        options={[
          { value: 'profile', label: 'Profile' },
          { value: 'order', label: 'Order' },
          { value: 'credential', label: 'Credential' },
          { value: 'payments', label: 'Payments', count: payments.length },
          { value: 'notes', label: 'Notes' },
        ]}
        value={detailTab}
        onChange={setDetailTab}
      />

      {/* Mobile: chat first. Desktop: tab content | chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="order-1 lg:order-2 lg:col-span-7">{chatCard}</div>
        <div className="order-2 lg:order-1 lg:col-span-5">{tabBody}</div>
      </div>
    </div>
  );
}
