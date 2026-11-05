'use client';

import React from 'react';
import { ArrowUpRight, MessageSquare } from 'lucide-react';
import { formatPrice } from '@/lib/products';
import {
  DurationBadge,
  StatusBadge,
  WarrantyBadge,
  getOrderStatusTone,
} from './StoreBadge';
import { StoreButton } from './StoreButton';
import { CredentialSecretBox } from './CredentialSecretBox';

export interface CustomerCredentialItem {
  id: string;
  orderId: string;
  productName: string;
  planName: string;
  duration: string;
  expiryDate: string;
  loginEmail?: string;
  loginPassword?: string;
  profilePin?: string;
  secretText: string;
  note?: string;
  warrantyLabel: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'pdf';
  url: string;
}

export interface OrderChatMessage {
  id: string;
  sender: 'customer' | 'support';
  senderName: string;
  text: string;
  time: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: ChatAttachment;
}

export interface CustomerOrderItem {
  id: string;
  productName: string;
  planName: string;
  duration: string;
  date: string;
  expiryDate: string;
  daysRemaining?: number;
  totalDays?: number;
  price: number;
  paymentMethod: 'bkash' | 'nagad';
  trxId: string;
  status: 'Active' | 'Pending (10–24h)' | 'Delivered' | 'Expired' | 'Refunded';
  warrantyLabel: string;
  warrantyDaysLeft?: number;
  deliveryEta?: string;
  loginEmail?: string;
  loginPassword?: string;
  profilePin?: string;
  twoFactorCode?: string;
  accessUrl?: string;
  secretText?: string;
  extraInfo?: Array<{ label: string; value: string }>;
  usageRules?: string[];
  chatMessages?: OrderChatMessage[];
  unreadChatCount?: number;
}

type CredentialItemCardProps = {
  item: CustomerCredentialItem;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  compact?: boolean;
};

export function CredentialItemCard({
  item,
  copiedId,
  onCopy,
  compact = false,
}: CredentialItemCardProps) {
  return (
    <div className="bg-white rounded-md border border-slate-200/90 p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              {item.productName}
            </h3>
            <DurationBadge>{item.duration}</DurationBadge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-800">{item.orderId}</span>
            <span aria-hidden="true">·</span>
            <span>{item.planName}</span>
            <span aria-hidden="true">·</span>
            <span>Exp {item.expiryDate}</span>
          </div>
        </div>

        <WarrantyBadge label={item.warrantyLabel} showIcon />
      </div>

      <CredentialSecretBox
        id={item.id}
        loginEmail={item.loginEmail}
        loginPassword={item.loginPassword}
        profilePin={item.profilePin}
        secretText={item.secretText}
        copiedId={copiedId}
        onCopy={onCopy}
        allowReveal={!compact}
      />
    </div>
  );
}

type OrderRowCardProps = {
  order: CustomerOrderItem;
  onOpenAccess?: (orderId: string) => void;
  onViewCredentials?: () => void;
};

export function OrderRowCard({
  order,
  onOpenAccess,
  onViewCredentials,
}: OrderRowCardProps) {
  const handleAccess = () => {
    if (onOpenAccess) {
      onOpenAccess(order.id);
    } else if (onViewCredentials) {
      onViewCredentials();
    }
  };

  const statusTone = getOrderStatusTone(order.status);

  const remainingText =
    order.status === 'Pending (10–24h)'
      ? '10–24h delivery'
      : order.status === 'Refunded'
        ? `Refunded (${order.paymentMethod.toUpperCase()})`
        : order.expiryDate === 'Lifetime'
          ? 'Lifetime'
          : typeof order.daysRemaining === 'number'
            ? order.daysRemaining > 0
              ? `${order.daysRemaining}d left`
              : 'Expired'
            : `Exp ${order.expiryDate}`;

  const unreadCount = order.unreadChatCount ?? 0;
  const warrantyExpired =
    order.status === 'Refunded' ||
    (typeof order.warrantyDaysLeft === 'number' && order.warrantyDaysLeft <= 0);
  const warrantyText =
    order.status === 'Refunded'
      ? 'Void (Refunded)'
      : warrantyExpired
        ? 'Warranty expired'
        : order.warrantyLabel;

  const buttonVariant =
    order.status === 'Pending (10–24h)'
      ? 'primary'
      : order.status === 'Delivered'
        ? 'blue'
        : order.status === 'Expired' || order.status === 'Refunded'
          ? 'secondary'
          : 'dark';

  return (
    <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 m-0">
            {order.productName}
          </h3>
          <StatusBadge tone={statusTone}>{order.status}</StatusBadge>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleAccess}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFF1F0] hover:bg-[#ffe4e2] border border-[#FF5E5B]/30 text-[#e04845] text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors"
              title="Unread support message"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E5B]" />
              <MessageSquare size={11} />
              <span>{unreadCount} new</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-slate-600 tabular-nums">
          <span className="font-bold text-slate-800">{order.id}</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-semibold text-slate-700">{order.planName}</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span>{order.duration}</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span
            className={
              order.status === 'Refunded'
                ? 'text-violet-700 font-semibold'
                : warrantyExpired
                  ? 'text-slate-400'
                  : 'text-emerald-700 font-semibold'
            }
          >
            {warrantyText}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span
            className={
              order.status === 'Expired'
                ? 'text-rose-600 font-semibold'
                : order.status === 'Refunded'
                  ? 'text-violet-700 font-semibold'
                  : ''
            }
          >
            {remainingText}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3.5 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0 shrink-0">
        <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0.5">
          <div className="text-sm font-bold text-slate-900 tabular-nums">
            {formatPrice(order.price)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 tabular-nums">
            {order.date}
          </div>
        </div>

        <StoreButton variant={buttonVariant} size="sm" onClick={handleAccess}>
          <span>Access</span>
          <ArrowUpRight size={13} />
        </StoreButton>
      </div>
    </div>
  );
}
