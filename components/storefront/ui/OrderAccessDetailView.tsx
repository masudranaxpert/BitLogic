'use client';

import { OrderLinesCard, groupLines } from './OrderLinesCard';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Paperclip,
  Reply,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { formatPrice } from '@/lib/products';
import type {
  ChatAttachment,
  CustomerOrderItem,
  OrderChatMessage,
} from './AccountCards';
import {
  DurationBadge,
  StatusBadge,
  WarrantyBadge,
  getOrderStatusTone,
} from './StoreBadge';
import { StoreButton } from './StoreButton';
import { StoreSurfaceCard } from './StoreSurfaceCard';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { whatsappHref } from '@/lib/whatsapp';
import { WhatsAppIcon } from './BrandIcons';

type OrderAccessDetailViewProps = {
  order: CustomerOrderItem;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onBack: () => void;
  onClaimWarranty: (orderId: string) => void;
  messages: OrderChatMessage[];
  onSendMessage: (
    orderId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: ChatAttachment;
    },
  ) => void;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function OrderAccessDetailView({
  order,
  copiedId,
  onCopy,
  onBack,
  onClaimWarranty,
  messages,
  onSendMessage,
}: OrderAccessDetailViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<OrderChatMessage | null>(null);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const settings = useStoreSettings();
  const waMessage = `Hi Blumartbd Support, I need assistance with Order ${order.id} (${order.productName}). Status: ${order.status}`;
  const waUrl = settings?.whatsappNumber ? whatsappHref(settings.whatsappNumber, waMessage) : null;

  const isPendingVerification = order.status === 'Pending Verification' || order.isPaymentVerified === false;
  const isDeliveryPending = order.status === 'Pending (10–24h)';
  const isPending = isPendingVerification || isDeliveryPending;
  const isLifetime = order.expiryDate === 'Lifetime';

  const progressPercent = isPending
    ? 35
    : order.status === 'Refunded'
      ? 100
      : isLifetime
        ? 100
        : order.daysRemaining && order.totalDays
          ? Math.min(
              100,
              Math.max(
                4,
                Math.round((order.daysRemaining / order.totalDays) * 100),
              ),
            )
          : 0;

  const statusTone = getOrderStatusTone(order.status);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setFileError('Maximum file size is 5MB.');
      e.target.value = '';
      return;
    }

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setFileError('Only images and PDF files are supported.');
      e.target.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    setAttachment({
      id: `att-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: isPdf ? 'pdf' : 'image',
      url,
    });
    e.target.value = '';
  };

  const submitChatMessage = () => {
    const trimmed = draft.trim();
    if (!trimmed && !attachment) return;

    onSendMessage(order.id, {
      text: trimmed,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text:
              replyingTo.text ||
              (replyingTo.attachment ? replyingTo.attachment.name : ''),
          }
        : undefined,
      attachment: attachment || undefined,
    });

    setDraft('');
    setReplyingTo(null);
    setAttachment(null);
    setFileError('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    submitChatMessage();
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitChatMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = '36px';
    el.style.height = `${Math.min(el.scrollHeight, 108)}px`;
  };

  return (
    <div className="space-y-4">
      {/* Lightbox for image attachment preview */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="surface-elevated relative max-w-2xl w-full rounded-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-800">
                Attachment
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewImageUrl}
                alt="Attachment"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <ArrowLeft size={13} />
            <span>Orders</span>
          </button>

          <h1 className="text-base font-bold text-slate-900 m-0">
            {order.productName}
          </h1>

          <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 text-xs font-semibold tabular-nums">
            {order.id}
          </span>

          <StatusBadge tone={statusTone}>{order.status}</StatusBadge>
        </div>

        <div className="flex items-center gap-2">
          {isPendingVerification && order.status !== 'Payment Rejected' && (
            <Link
              href={`/payment/${order.id}${order.paymentMethod ? `?method=${order.paymentMethod.toLowerCase()}` : ''}`}
              className="h-8 px-3.5 rounded-md bg-[#FF5E5B] hover:bg-[#DE524F] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors no-underline shadow-xs"
            >
              <CreditCard size={13} />
              <span>Pay Now ({formatPrice(order.price)})</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
          {(order.warrantyDaysLeft ?? 0) > 0 && (
            <StoreButton
              variant="outline"
              size="sm"
              onClick={() => onClaimWarranty(order.id)}
            >
              <ShieldAlert size={13} className="text-[#FF5E5B]" />
              <span>Claim Warranty</span>
            </StoreButton>
          )}

        </div>
      </div>

      {/* Prominent Unpaid Payment Banner */}
      {isPendingVerification && order.status !== 'Payment Rejected' && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <CreditCard size={14} className="text-amber-700" />
              <span>Payment Pending — Complete Your Order</span>
            </div>
            <p className="text-xs text-amber-800 m-0">
              Complete your <strong>{formatPrice(order.price)}</strong> payment via the automated MFS gateway to unlock instant delivery.
            </p>
          </div>
          <Link
            href={`/payment/${order.id}${order.paymentMethod ? `?method=${order.paymentMethod.toLowerCase()}` : ''}`}
            className="h-9 px-4 rounded-md bg-[#FF5E5B] hover:bg-[#DE524F] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors no-underline shrink-0 shadow-xs"
          >
            <span>Complete Payment Now</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mixed orders: each product line has its own end date and warranty. */}
          {order.units && groupLines(order.units).length > 1 ? (
            <OrderLinesCard units={order.units} orderedOn={order.date} />
          ) : (
          <>
          <StoreSurfaceCard className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-600">
                  Access Validity
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {isPending
                      ? '10–24 Hours Delivery'
                      : isLifetime
                        ? 'Lifetime Access'
                        : typeof order.daysRemaining === 'number'
                          ? `${order.daysRemaining} Days Remaining`
                          : order.duration}
                  </span>
                  {!isPending && !isLifetime && order.totalDays && (
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                      / {order.totalDays} days
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {order.duration ? <DurationBadge>{order.duration}</DurationBadge> : null}
                <WarrantyBadge
                  label={
                    typeof order.warrantyDaysLeft === 'number' &&
                    order.warrantyDaysLeft <= 0
                      ? 'Warranty Expired'
                      : order.warrantyLabel
                  }
                  expired={
                    typeof order.warrantyDaysLeft === 'number' &&
                    order.warrantyDaysLeft <= 0
                  }
                  showIcon
                />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 w-full rounded-xs bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${
                    isPending
                      ? 'bg-amber-500'
                      : progressPercent > 20
                        ? 'bg-emerald-600'
                        : 'bg-[#FF5E5B]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 tabular-nums">
                <span>Ordered {order.date}</span>
                <span>
                  {isPending
                    ? 'Activation in progress'
                    : `Expires ${order.expiryDate}`}
                </span>
              </div>
            </div>

            {/* Full-Visibility Summary Rows (Never Truncates Plan Name) */}
            <div className="divide-y divide-slate-200/70 border border-slate-200 rounded overflow-hidden text-[13px]">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4 bg-slate-50/60">
                <span className="text-xs font-semibold text-slate-600">
                  Plan
                </span>
                <span className="font-bold text-slate-900 text-right">
                  {order.planName}
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4 bg-white">
                <span className="text-xs font-semibold text-slate-600">
                  Amount Paid
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatPrice(order.price)}
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4 bg-slate-50/60">
                <span className="text-xs font-semibold text-slate-600">
                  Payment Method
                </span>
                <span className="font-bold text-slate-900 uppercase tabular-nums flex items-center gap-1.5">
                  <span>{order.paymentMethod}</span>
                  {order.trxId ? (
                    <span className="text-xs font-mono font-medium text-slate-500 normal-case">
                      (TrxID: <span className="text-slate-800 font-bold">{order.trxId}</span>)
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4 bg-white">
                <span className="text-xs font-semibold text-slate-600">
                  Warranty
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    (order.warrantyDaysLeft ?? 0) > 0
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  {typeof order.warrantyDaysLeft === 'number'
                    ? order.warrantyDaysLeft > 0
                      ? `${order.warrantyDaysLeft} days remaining`
                      : 'Expired'
                    : order.warrantyLabel}
                </span>
              </div>
            </div>
          </StoreSurfaceCard>
          </>
          )}

          {/* Card 2: Credentials / Activation Queue (Icon-Only Copy Buttons) */}
          <StoreSurfaceCard className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 m-0">
                  {isPendingVerification
                    ? 'Credentials Status'
                    : isDeliveryPending
                      ? 'Activation Status'
                      : 'Login Credentials'}
                </h2>
                <StatusBadge tone={isPending ? 'amber' : 'emerald'}>
                  {isPendingVerification
                    ? 'Pending Verification'
                    : isDeliveryPending
                      ? 'Queued (10–24h)'
                      : 'Ready'}
                </StatusBadge>
              </div>

              {order.accessUrl && !isPending && (
                <a
                  href={order.accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7.5 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-900 inline-flex items-center gap-1.5 no-underline transition-colors shadow-2xs"
                >
                  <span>Open Portal</span>
                  <ExternalLink size={12} className="text-[#FF5E5B]" />
                </a>
              )}
            </div>

            {order.units && order.units.length > 1 ? (
              <div className="space-y-2.5">
                {order.units.map((unit) => {
                  const isUnitPending = unit.status === 'pending_dispatch';
                  return (
                    <div
                      key={unit.deliveryId}
                      className="border border-slate-200 rounded p-3 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {unit.productName} · {unit.variantName} — #{unit.unitIndex}
                        </span>
                        <StatusBadge tone={isUnitPending ? 'amber' : 'emerald'}>
                          {isUnitPending ? 'Queued' : 'Ready'}
                        </StatusBadge>
                      </div>

                      {/* Unit Credential Details */}
                      {unit.isLocked ? (
                        <div className="flex items-start gap-2.5 p-3 rounded bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs">
                          <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 space-y-0.5">
                            <span className="font-semibold block text-slate-900">
                              Credentials Locked (Pending Verification)
                            </span>
                            <span className="text-[11px] text-amber-800 block">
                              {unit.lockReason || 'Awaiting payment verification by staff. Will unlock automatically once confirmed.'}
                            </span>
                          </div>
                        </div>
                      ) : unit.email || unit.password || unit.profilePin || unit.secretValue ? (
                        <div className="space-y-1.5 pt-1">
                          {unit.email && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-slate-500 block">Email / Username</span>
                                <span className="font-semibold text-slate-900 select-all truncate block">{unit.email}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onCopy(`${unit.deliveryId}-email`, unit.email!)}
                                className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0"
                                title="Copy email"
                                aria-label={`Copy email for unit ${unit.unitIndex}`}
                              >
                                {copiedId === `${unit.deliveryId}-email` ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          )}

                          {unit.password && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-slate-500 block">Password</span>
                                <span className="font-mono text-slate-900 select-all block">{unit.password}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onCopy(`${unit.deliveryId}-pass`, unit.password!)}
                                className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0"
                                title="Copy password"
                                aria-label={`Copy password for unit ${unit.unitIndex}`}
                              >
                                {copiedId === `${unit.deliveryId}-pass` ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          )}

                          {unit.profilePin && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-slate-500 block">Profile PIN</span>
                                <span className="font-mono text-slate-900 select-all block">{unit.profilePin}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onCopy(`${unit.deliveryId}-pin`, unit.profilePin!)}
                                className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0"
                                title="Copy PIN"
                                aria-label={`Copy PIN for unit ${unit.unitIndex}`}
                              >
                                {copiedId === `${unit.deliveryId}-pin` ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          )}

                          {unit.secretValue && (!unit.email || !unit.password || ![unit.email, `${unit.email}:${unit.password}`, `${unit.email}|${unit.password}`].includes(unit.secretValue.replace(/s+/g, ''))) && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                              <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-slate-500 block">Key / Secret</span>
                                <span className="font-mono text-xs select-all truncate block text-slate-800">{unit.secretValue}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onCopy(`${unit.deliveryId}-sec`, unit.secretValue)}
                                className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0"
                                title="Copy secret"
                                aria-label={`Copy secret for unit ${unit.unitIndex}`}
                              >
                                {copiedId === `${unit.deliveryId}-sec` ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : !isUnitPending && unit.deliveredAt ? (
                        <p className="text-xs text-emerald-700 font-medium m-0">
                          Set up for you — no login details needed.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 font-medium m-0">
                          Activation in queue (10–24h)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : isPending || order.isPaymentVerified === false ? (
              <div className="divide-y divide-slate-200/70 border border-slate-200 rounded overflow-hidden text-[13px]">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-slate-50/60">
                  <span className="text-xs font-semibold text-slate-600">
                    Payment Status
                  </span>
                  <span className="font-bold text-amber-700 flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-600" />
                    {order.status === 'Payment Rejected' ? 'Rejected' : 'Pending Verification'}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white">
                  <span className="text-xs font-semibold text-slate-600">
                    Credentials Status
                  </span>
                  <span className="font-medium text-slate-700 text-xs">
                    {order.status === 'Payment Rejected'
                      ? 'Payment was rejected. Contact support.'
                      : 'Unlocks automatically once payment is verified by staff'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70 border border-slate-200 rounded overflow-hidden">
                {order.loginEmail && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-600">
                        Email / Username
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 select-all mt-0.5">
                        {order.loginEmail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(`${order.id}-email`, order.loginEmail!)
                      }
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      aria-label="Copy email or username"
                      title={
                        copiedId === `${order.id}-email` ? 'Copied' : 'Copy'
                      }
                    >
                      {copiedId === `${order.id}-email` ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                )}

                {order.loginPassword && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-600">
                        Password
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 select-all mt-0.5 tabular-nums">
                        {showPassword ? order.loginPassword : '••••••••••••'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center cursor-pointer transition-colors"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        title={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onCopy(`${order.id}-pass`, order.loginPassword!)
                        }
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center cursor-pointer transition-colors"
                        aria-label="Copy password"
                        title={
                          copiedId === `${order.id}-pass` ? 'Copied' : 'Copy'
                        }
                      >
                        {copiedId === `${order.id}-pass` ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {order.profilePin && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">
                        Profile PIN
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 tabular-nums mt-0.5">
                        {order.profilePin}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(`${order.id}-pin`, order.profilePin!)
                      }
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      aria-label="Copy PIN"
                      title={
                        copiedId === `${order.id}-pin` ? 'Copied' : 'Copy'
                      }
                    >
                      {copiedId === `${order.id}-pin` ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                )}

                {order.twoFactorCode && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">
                        Backup / 2FA Code
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 tabular-nums mt-0.5">
                        {order.twoFactorCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(`${order.id}-2fa`, order.twoFactorCode!)
                      }
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      aria-label="Copy 2FA code"
                      title={
                        copiedId === `${order.id}-2fa` ? 'Copied' : 'Copy'
                      }
                    >
                      {copiedId === `${order.id}-2fa` ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </StoreSurfaceCard>

          {/* Card 3: Aligned Horizontal Details & Highlighted Instructions */}
          {(order.extraInfo?.length || order.usageRules?.length) && (
            <StoreSurfaceCard className="p-5 space-y-4">
              {order.extraInfo && order.extraInfo.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-slate-900 m-0">
                    Plan Details
                  </h2>
                  <div className="divide-y divide-slate-200/70 border border-slate-200 rounded overflow-hidden">
                    {order.extraInfo.map((info) => (
                      <div
                        key={info.label}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-4 text-[13px] bg-white"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          {info.label}
                        </span>
                        <span className="font-bold text-slate-900 text-right">
                          {info.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlighted Instructions Callout Box */}
              {order.usageRules && order.usageRules.length > 0 && (
                <div className="rounded border border-amber-300/90 border-l-4 border-l-amber-500 bg-amber-50/75 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle
                      size={14}
                      className="text-amber-600 shrink-0"
                    />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Important Instructions
                    </span>
                  </div>
                  <ul className="m-0 pl-4 space-y-1 text-[13px] font-semibold text-amber-950">
                    {order.usageRules.map((rule, idx) => (
                      <li key={idx} className="leading-snug">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </StoreSurfaceCard>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Live Chat */}
        <div className="lg:col-span-5">
          <StoreSurfaceCard
            padded={false}
            className="overflow-hidden flex flex-col h-[520px]"
          >
            {/* Clean Chat Header (Avatar with Corner Presence Dot, No 'Support Online' Text) */}
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                    BL
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    aria-label="Online"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    Order Chat
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 leading-tight tabular-nums">
                    {order.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-medium text-slate-500">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${
                        isCustomer ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-0.5">
                        <span className="text-xs font-semibold text-slate-700">
                          {msg.senderName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                          {msg.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 transition-opacity"
                          title="Reply to message"
                        >
                          <Reply size={11} />
                          <span>Reply</span>
                        </button>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-md px-3.5 py-2 text-[13px] font-medium leading-relaxed space-y-1.5 ${
                          isCustomer
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        {msg.replyTo && (
                          <div
                            className={`px-2.5 py-1 rounded text-xs truncate ${
                              isCustomer
                                ? 'bg-slate-800 text-slate-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="font-bold">
                              {msg.replyTo.senderName}:
                            </span>{' '}
                            {msg.replyTo.text}
                          </div>
                        )}

                        {msg.attachment && (
                          <div className="pt-0.5">
                            {msg.attachment.type === 'image' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImageUrl(msg.attachment!.url)
                                }
                                className="block rounded overflow-hidden border border-white/10 bg-black/10 p-0 cursor-pointer"
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name}
                                  referrerPolicy="no-referrer"
                                  className="max-h-36 w-auto object-cover block"
                                />
                              </button>
                            ) : (
                              <a
                                href={msg.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold no-underline ${
                                  isCustomer
                                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200/70'
                                }`}
                              >
                                <FileText size={14} className="shrink-0" />
                                <span className="truncate max-w-[160px]">
                                  {msg.attachment.name}
                                </span>
                                <span className="text-[11px] opacity-80 shrink-0 tabular-nums">
                                  ({formatBytes(msg.attachment.size)})
                                </span>
                              </a>
                            )}
                          </div>
                        )}

                        {msg.text && (
                          <div className="whitespace-pre-wrap break-words">
                            {msg.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply / Attachment Preview Bar */}
            {(replyingTo || attachment || fileError) && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 space-y-1.5">
                {fileError && (
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-600">
                    <span>{fileError}</span>
                    <button
                      type="button"
                      onClick={() => setFileError('')}
                      className="text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {replyingTo && (
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <div className="truncate">
                      <span className="font-bold text-slate-900">
                        Replying to {replyingTo.senderName}:
                      </span>{' '}
                      {replyingTo.text || replyingTo.attachment?.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {attachment && (
                  <div className="flex items-center justify-between gap-2 text-xs bg-white px-2.5 py-1.5 rounded border border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded object-cover shrink-0"
                        />
                      ) : (
                        <FileText
                          size={15}
                          className="text-[#FF5E5B] shrink-0"
                        />
                      )}
                      <span className="truncate font-semibold text-slate-900">
                        {attachment.name}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 shrink-0 tabular-nums">
                        {formatBytes(attachment.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clean Composer (Simple placeholder, no scrollbar on single line, Shift+Enter newline) */}
            <form
              onSubmit={handleSubmitChat}
              className="p-2.5 bg-white border-t border-slate-200 flex items-end gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file (max 5MB)"
                className="w-9 h-9 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <Paperclip size={14} />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Write a message..."
                className="flex-1 h-9 max-h-28 py-2 px-3 rounded border border-slate-300 bg-white text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5E5B] resize-none overflow-hidden leading-tight"
              />

              <StoreButton
                type="submit"
                variant="dark"
                size="sm"
                className="h-9"
              >
                <Send size={13} />
                <span>Send</span>
              </StoreButton>
            </form>
          </StoreSurfaceCard>
        </div>
      </div>
    </div>
  );
}
