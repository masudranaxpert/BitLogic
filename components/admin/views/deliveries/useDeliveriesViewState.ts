'use client';

import React, { useState, useRef, useEffect } from 'react';
import type {
  DigitalDelivery,
  AdminChatAttachment,
} from '@/lib/admin-data';
import type {
  DeliveriesViewProps,
  DeliveryStatusFilter,
  DeliveryViewLayout,
  DeliverySourceMode,
  ActiveActionDelivery,
  ChatReplyTarget,
} from './types';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function useDeliveriesViewState({
  products,
  vault,
  deliveries,
  initialStatusFilter = 'all',
  pageMode = 'all',
  selectedChatDeliveryId = null,
  onSendOrderChatMessage,
  onFulfillDelivery,
}: DeliveriesViewProps) {
  const [statusFilter, setStatusFilter] =
    useState<DeliveryStatusFilter>(initialStatusFilter);

  useEffect(() => {
    // Dedicated pages own their scope — don't bounce All Orders chips
    if (pageMode !== 'all') return;
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter, pageMode]);
  const [viewLayout, setViewLayout] = useState<DeliveryViewLayout>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [activeActionDelivery, setActiveActionDelivery] =
    useState<ActiveActionDelivery | null>(null);

  const [sourceMode, setSourceMode] = useState<DeliverySourceMode>('vault');
  const [selectedVaultItemId, setSelectedVaultItemId] = useState<string>('');
  const [customSecret, setCustomSecret] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customPin, setCustomPin] = useState('');
  const [customNote, setCustomNote] = useState('');

  // Order Chat state
  const [chatText, setChatText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatReplyTarget | null>(null);
  const [stagedAttachment, setStagedAttachment] = useState<AdminChatAttachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedChatDelivery = selectedChatDeliveryId
    ? deliveries.find((d) => d.id === selectedChatDeliveryId) || null
    : null;

  const openActionModal = (delivery: DigitalDelivery, isWarrantySwap: boolean) => {
    const matchingStock = vault.filter(
      (v) =>
        v.productId === delivery.productId &&
        v.variantId === delivery.variantId &&
        v.status === 'available'
    );
    setActiveActionDelivery({ delivery, isWarrantySwap });
    if (matchingStock.length > 0) {
      setSourceMode('vault');
      setSelectedVaultItemId(matchingStock[0].id);
    } else {
      setSourceMode('custom');
      setSelectedVaultItemId('');
    }
    setCustomSecret(delivery.credentialPayload.secretValue || '');
    setCustomEmail(delivery.credentialPayload.email || '');
    setCustomPassword(delivery.credentialPayload.password || '');
    setCustomPin(delivery.credentialPayload.profilePin || '');
    setCustomNote(
      isWarrantySwap
        ? 'Warranty replacement issued.'
        : delivery.customAdminNote || 'Sent by admin.'
    );
  };

  const handleConfirmFulfill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionDelivery) return;
    const { delivery, isWarrantySwap } = activeActionDelivery;

    if (sourceMode === 'vault' && selectedVaultItemId) {
      const vaultItem = vault.find((v) => v.id === selectedVaultItemId);
      if (!vaultItem) return;
      onFulfillDelivery(
        delivery.id,
        {
          secretValue: vaultItem.secretValue,
          email: vaultItem.email,
          password: vaultItem.password,
          profilePin: vaultItem.profilePin,
          vaultCredentialId: vaultItem.id,
          customAdminNote: customNote,
        },
        isWarrantySwap
      );
    } else {
      const formattedSecret =
        delivery.credentialType === 'email_login' && customEmail
          ? `${customEmail.trim()} | ${customPassword.trim()}`
          : customSecret.trim();
      if (!formattedSecret) return;

      onFulfillDelivery(
        delivery.id,
        {
          secretValue: formattedSecret,
          email: customEmail.trim() || undefined,
          password: customPassword.trim() || undefined,
          profilePin: customPin.trim() || undefined,
          customAdminNote: customNote,
        },
        isWarrantySwap
      );
    }
    setActiveActionDelivery(null);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setUploadError('Only images (PNG, JPG, WEBP) and PDF files are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File exceeds 5MB limit.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setStagedAttachment({
        id: `att-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'image',
        url: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submitOrderChatMessage = () => {
    if (!selectedChatDelivery || !onSendOrderChatMessage) return;
    if (!chatText.trim() && !stagedAttachment) return;

    const payload = {
      text:
        chatText.trim() ||
        (stagedAttachment ? `Attached file: ${stagedAttachment.name}` : ''),
      replyTo: replyingTo || undefined,
      attachment: stagedAttachment || undefined,
    };
    // One conversation per order: mirror to every unit so the buyer sees it on any item.
    for (const d of deliveries) {
      if (d.orderId === selectedChatDelivery.orderId) onSendOrderChatMessage(d.id, payload);
    }

    setChatText('');
    setReplyingTo(null);
    setStagedAttachment(null);
    setUploadError(null);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitOrderChatMessage();
    }
  };

  const unreadChatDeliveriesCount = new Set(
    deliveries.filter((d) => (d.unreadChatCount || 0) > 0).map((d) => d.orderId),
  ).size;
  const pendingCount = new Set(
    deliveries.filter((d) => d.status === 'pending_dispatch').map((d) => d.orderId),
  ).size;
  const claimCount = new Set(
    deliveries.filter((d) => d.status === 'warranty_claim').map((d) => d.orderId),
  ).size;
  const deliveredCount = new Set(
    deliveries.filter((d) => d.status === 'delivered').map((d) => d.orderId),
  ).size;
  const refundedCount = new Set(
    deliveries.filter((d) => d.status === 'refunded').map((d) => d.orderId),
  ).size;
  const replacedCount = new Set(
    deliveries.filter((d) => d.status === 'replaced').map((d) => d.orderId),
  ).size;
  const renewalsCount = new Set(
    deliveries.filter((d) => d.renewalPending).map((d) => d.orderId),
  ).size;
  const pinnedCount = new Set(
    deliveries.filter((d) => d.pinned).map((d) => d.orderId),
  ).size;
  const activeWarrantyCount = new Set(
    deliveries
      .filter((d) => d.hasWarranty && d.warrantyRemainingDays > 0)
      .map((d) => d.orderId),
  ).size;

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'unread_chat'
          ? (d.unreadChatCount || 0) > 0
          : statusFilter === 'renewals'
            ? Boolean(d.renewalPending)
            : statusFilter === 'pinned'
              ? Boolean(d.pinned)
              : d.status === statusFilter;
    const matchesSearch =
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.variantName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return {
    // derived
    selectedChatDelivery,
    filteredDeliveries,
    unreadChatDeliveriesCount,
    pendingCount,
    claimCount,
    deliveredCount,
    refundedCount,
    replacedCount,
    renewalsCount,
    pinnedCount,
    activeWarrantyCount,

    // list UI state
    statusFilter,
    setStatusFilter,
    viewLayout,
    setViewLayout,
    showStatistics,
    setShowStatistics,
    searchQuery,
    setSearchQuery,
    copiedId,
    selectedIds,
    setSelectedIds,

    // modals / fulfill
    activeActionDelivery,
    setActiveActionDelivery,
    sourceMode,
    setSourceMode,
    selectedVaultItemId,
    setSelectedVaultItemId,
    customSecret,
    setCustomSecret,
    customEmail,
    setCustomEmail,
    customPassword,
    setCustomPassword,
    customPin,
    setCustomPin,
    customNote,
    setCustomNote,
    lightboxImage,
    setLightboxImage,

    // chat
    chatText,
    setChatText,
    replyingTo,
    setReplyingTo,
    stagedAttachment,
    setStagedAttachment,
    uploadError,
    setUploadError,
    fileInputRef,

    // handlers
    openActionModal,
    handleConfirmFulfill,
    handleCopy,
    handleFileChange,
    submitOrderChatMessage,
    handleChatKeyDown,
  };
}

export type DeliveriesViewState = ReturnType<typeof useDeliveriesViewState>;
