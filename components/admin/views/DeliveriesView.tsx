'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  PlusCircle,
  MessageSquare,
  ArrowLeft,
  Paperclip,
  Send,
  Reply,
  FileText,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  AdminChatAttachment,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  ModalShell,
  EmptyTableState,
  BBCodeRenderer,
} from '@/components/admin/ui/primitives';

interface DeliveriesViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  selectedChatDeliveryId?: string | null;
  onSelectChatDelivery?: (deliveryId: string | null) => void;
  onSendOrderChatMessage?: (
    deliveryId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: AdminChatAttachment;
    }
  ) => void;
  onSimulateBuyerMessage?: (deliveryId: string) => void;
  onFulfillDelivery: (
    deliveryId: string,
    payload: {
      secretValue: string;
      email?: string;
      password?: string;
      profilePin?: string;
      vaultCredentialId?: string;
      customAdminNote: string;
      vpnRequired: boolean;
      vpnRegionNote: string;
      warrantyDays: number;
    },
    isWarrantyReplacement: boolean
  ) => void;
  onSimulateOrder: (productId: string, variantId: string, buyerName: string, buyerEmail: string) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export default function DeliveriesView({
  products,
  vault,
  deliveries,
  selectedChatDeliveryId = null,
  onSelectChatDelivery,
  onSendOrderChatMessage,
  onSimulateBuyerMessage,
  onFulfillDelivery,
  onSimulateOrder,
}: DeliveriesViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'unread_chat' | 'pending_dispatch' | 'warranty_claim' | 'delivered' | 'replaced'
  >('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [previewDelivery, setPreviewDelivery] = useState<DigitalDelivery | null>(null);

  const [activeActionDelivery, setActiveActionDelivery] = useState<{
    delivery: DigitalDelivery;
    isWarrantySwap: boolean;
  } | null>(null);

  const [sourceMode, setSourceMode] = useState<'vault' | 'custom'>('vault');
  const [selectedVaultItemId, setSelectedVaultItemId] = useState<string>('');
  const [customSecret, setCustomSecret] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customPin, setCustomPin] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [customVpnReq, setCustomVpnReq] = useState(false);
  const [customVpnNote, setCustomVpnNote] = useState('');
  const [customWarrantyDays, setCustomWarrantyDays] = useState(30);

  const [isSimOrderOpen, setIsSimOrderOpen] = useState(false);
  const [simProdId, setSimProdId] = useState(products[0]?.id || '');
  const [simVarId, setSimVarId] = useState(products[0]?.variants[0]?.id || '');
  const [simBuyerName, setSimBuyerName] = useState('Mahmudul Hasan');
  const [simBuyerEmail, setSimBuyerEmail] = useState('mahmud.bd@gmail.com');

  // Order Chat state
  const [chatText, setChatText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [stagedAttachment, setStagedAttachment] = useState<AdminChatAttachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedChatDelivery = selectedChatDeliveryId
    ? deliveries.find((d) => d.id === selectedChatDeliveryId) || null
    : null;

  const messageCount = selectedChatDelivery?.chatMessages?.length || 0;

  useEffect(() => {
    if (selectedChatDeliveryId) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [selectedChatDeliveryId, messageCount]);

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
        : delivery.customAdminNote || 'Dispatched by Admin.'
    );
    setCustomVpnReq(delivery.vpnRequired);
    setCustomVpnNote(delivery.vpnRegionNote);
    setCustomWarrantyDays(delivery.warrantyRemainingDays || delivery.warrantyDays || 30);
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
          vpnRequired: customVpnReq,
          vpnRegionNote: customVpnNote,
          warrantyDays: customWarrantyDays,
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
          vpnRequired: customVpnReq,
          vpnRegionNote: customVpnNote,
          warrantyDays: customWarrantyDays,
        },
        isWarrantySwap
      );
    }
    setActiveActionDelivery(null);
  };

  const handleTriggerSimulateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulateOrder(simProdId, simVarId, simBuyerName, simBuyerEmail);
    setIsSimOrderOpen(false);
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

    onSendOrderChatMessage(selectedChatDelivery.id, {
      text:
        chatText.trim() ||
        (stagedAttachment ? `Attached file: ${stagedAttachment.name}` : ''),
      replyTo: replyingTo || undefined,
      attachment: stagedAttachment || undefined,
    });

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

  const unreadChatDeliveriesCount = deliveries.filter(
    (d) => (d.unreadChatCount || 0) > 0
  ).length;
  const pendingCount = deliveries.filter((d) => d.status === 'pending_dispatch').length;
  const claimCount = deliveries.filter((d) => d.status === 'warranty_claim').length;
  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
  const activeWarrantyCount = deliveries.filter(
    (d) => d.hasWarranty && d.warrantyRemainingDays > 0
  ).length;

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'unread_chat'
        ? (d.unreadChatCount || 0) > 0
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

  // Render modals shared between list & detail view
  const renderSharedModals = () => (
    <>
      <ModalShell
        open={Boolean(activeActionDelivery)}
        onClose={() => setActiveActionDelivery(null)}
        title={
          activeActionDelivery?.isWarrantySwap
            ? `Warranty Replacement (${activeActionDelivery.delivery.orderId})`
            : `Dispatch Credential (${activeActionDelivery?.delivery.orderId})`
        }
        maxWidth="max-w-xl"
      >
        {activeActionDelivery &&
          (() => {
            const { delivery, isWarrantySwap } = activeActionDelivery;
            const availableVaultForVariant = vault.filter(
              (v) =>
                v.productId === delivery.productId &&
                v.variantId === delivery.variantId &&
                v.status === 'available'
            );

            return (
              <form onSubmit={handleConfirmFulfill} className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Source</span>
                  <SegmentedTabs
                    options={[
                      {
                        value: 'vault',
                        label: 'Vault Stock',
                        count: availableVaultForVariant.length,
                      },
                      { value: 'custom', label: 'Custom Input' },
                    ]}
                    value={sourceMode}
                    onChange={setSourceMode}
                  />
                </div>

                {sourceMode === 'vault' ? (
                  availableVaultForVariant.length > 0 ? (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select Vault Credential
                      </label>
                      <select
                        value={selectedVaultItemId}
                        onChange={(e) => setSelectedVaultItemId(e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {availableVaultForVariant.map((v) => (
                          <option key={v.id} value={v.id}>
                            [{v.id}] {v.secretValue.slice(0, 38)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                      No pre-stocked credentials in Vault for this option. Switch to Custom Input.
                    </div>
                  )
                ) : delivery.credentialType === 'email_login' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Email
                        </label>
                        <input
                          type="text"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          type="text"
                          required
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profile / PIN
                      </label>
                      <input
                        type="text"
                        value={customPin}
                        onChange={(e) => setCustomPin(e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {getCredentialTypeLabel(delivery.credentialType)}
                    </label>
                    <input
                      type="text"
                      required
                      value={customSecret}
                      onChange={(e) => setCustomSecret(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      VPN Required?
                    </label>
                    <select
                      value={customVpnReq ? 'yes' : 'no'}
                      onChange={(e) => setCustomVpnReq(e.target.value === 'yes')}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Warranty Days
                    </label>
                    <input
                      type="number"
                      value={customWarrantyDays}
                      onChange={(e) => setCustomWarrantyDays(Number(e.target.value))}
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveActionDelivery(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    {isWarrantySwap ? 'Confirm Swap' : 'Deliver'}
                  </button>
                </div>
              </form>
            );
          })()}
      </ModalShell>

      <ModalShell
        open={Boolean(previewDelivery)}
        onClose={() => setPreviewDelivery(null)}
        title={`Delivery Receipt (${previewDelivery?.orderId})`}
        maxWidth="max-w-lg"
      >
        {previewDelivery && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {previewDelivery.productName} · {previewDelivery.variantName}
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {previewDelivery.warrantyRemainingDays}d warranty
                </span>
              </div>
              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs break-all flex items-center justify-between gap-2">
                <span>
                  {previewDelivery.credentialPayload.secretValue || 'Awaiting Dispatch'}
                </span>
                {previewDelivery.credentialPayload.secretValue && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy('preview', previewDelivery.credentialPayload.secretValue)
                    }
                    className="p-1.5 bg-emerald-600 text-white rounded shrink-0 cursor-pointer"
                    title="Copy Credential"
                  >
                    {copiedId === 'preview' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              {previewDelivery.credentialPayload.profilePin && (
                <div className="font-mono text-emerald-700 dark:text-emerald-400">
                  PIN / Slot: {previewDelivery.credentialPayload.profilePin}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">VPN</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {previewDelivery.vpnRequired ? 'Required' : 'No VPN'}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Warranty</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {previewDelivery.warrantyRemainingDays} / {previewDelivery.warrantyDays} Days
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Login Guide</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                {previewDelivery.loginInstructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={isSimOrderOpen}
        onClose={() => setIsSimOrderOpen(false)}
        title="Simulate Order"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTriggerSimulateOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Buyer Name
              </label>
              <input
                type="text"
                required
                value={simBuyerName}
                onChange={(e) => setSimBuyerName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Buyer Email
              </label>
              <input
                type="email"
                required
                value={simBuyerEmail}
                onChange={(e) => setSimBuyerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product
            </label>
            <select
              value={simProdId}
              onChange={(e) => {
                setSimProdId(e.target.value);
                const p = products.find((item) => item.id === e.target.value);
                if (p && p.variants[0]) setSimVarId(p.variants[0].id);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Option
            </label>
            <select
              value={simVarId}
              onChange={(e) => setSimVarId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              {products
                .find((p) => p.id === simProdId)
                ?.variants.map((v) => {
                  const stock = vault.filter(
                    (item) =>
                      item.productId === simProdId &&
                      item.variantId === v.id &&
                      item.status === 'available'
                  ).length;
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} ({stock} in Vault)
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSimOrderOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
            >
              Create Order
            </button>
          </div>
        </form>
      </ModalShell>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attachment Preview
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/5 dark:bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage}
                alt="Attachment preview"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Dedicated Order Access & Live Chat Split View
  if (selectedChatDelivery) {
    const messages = selectedChatDelivery.chatMessages || [];

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectChatDelivery?.(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Deliveries</span>
            </button>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {selectedChatDelivery.orderId}
            </span>
            <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              {selectedChatDelivery.productName} · {selectedChatDelivery.variantName}
            </h1>
            {selectedChatDelivery.status === 'delivered' && (
              <StatusIndicator tone="emerald" label="Delivered" />
            )}
            {selectedChatDelivery.status === 'pending_dispatch' && (
              <StatusIndicator tone="amber" label="Pending Dispatch" />
            )}
            {selectedChatDelivery.status === 'warranty_claim' && (
              <StatusIndicator tone="red" label="Warranty Claim" />
            )}
            {selectedChatDelivery.status === 'replaced' && (
              <StatusIndicator tone="blue" label="Replaced" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewDelivery(selectedChatDelivery)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Receipt
            </button>
            {onSimulateBuyerMessage && (
              <button
                type="button"
                onClick={() => onSimulateBuyerMessage(selectedChatDelivery.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulate Reply</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                openActionModal(
                  selectedChatDelivery,
                  selectedChatDelivery.status !== 'pending_dispatch'
                )
              }
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {selectedChatDelivery.status === 'pending_dispatch'
                ? 'Dispatch'
                : 'Replace'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Order & Credential Details */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Buyer Information
                  </div>
                  <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedChatDelivery.buyerName}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {selectedChatDelivery.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Email</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 break-all">
                    {selectedChatDelivery.buyerEmail}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Phone</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedChatDelivery.buyerPhone}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Created</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedChatDelivery.createdAt}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Warranty Protection</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedChatDelivery.hasWarranty
                      ? `${selectedChatDelivery.warrantyRemainingDays} / ${selectedChatDelivery.warrantyDays} Days`
                      : 'No Warranty'}
                  </span>
                </div>
              </div>

              {selectedChatDelivery.warrantyClaimReason && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-semibold block mb-0.5">Active Warranty Claim:</span>
                  {selectedChatDelivery.warrantyClaimReason}
                </div>
              )}
            </Card>

            <Card className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    Delivered Credential Payload
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {getCredentialTypeLabel(selectedChatDelivery.credentialType)}
                </span>
              </div>

              {selectedChatDelivery.credentialPayload.secretValue ? (
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all">
                      {selectedChatDelivery.credentialPayload.secretValue}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          'chat-cred',
                          selectedChatDelivery.credentialPayload.secretValue
                        )
                      }
                      className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                      title="Copy Credential"
                    >
                      {copiedId === 'chat-cred' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {selectedChatDelivery.credentialPayload.profilePin && (
                    <div className="px-3 py-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 font-mono text-xs text-emerald-800 dark:text-emerald-300">
                      Assigned Slot / PIN: {selectedChatDelivery.credentialPayload.profilePin}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Order is awaiting manual credential dispatch.</span>
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedChatDelivery, false)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                  >
                    Dispatch Now
                  </button>
                </div>
              )}

              {selectedChatDelivery.customAdminNote && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Admin Dispatch Note
                  </span>
                  <div className="text-slate-700 dark:text-slate-300">
                    <BBCodeRenderer content={selectedChatDelivery.customAdminNote} />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Order Live Chat */}
          <Card className="lg:col-span-7 flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center">
                    {selectedChatDelivery.buyerName
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
                      {selectedChatDelivery.buyerName}
                    </span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {selectedChatDelivery.orderId}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Order fulfillment &amp; support chat
                  </div>
                </div>
              </div>

              <span className="text-xs font-mono text-slate-400">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>

            <div className="p-4 space-y-3.5 max-h-[460px] min-h-[340px] overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
              {messages.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <MessageSquare className="w-7 h-7 text-slate-300 dark:text-slate-700 mx-auto" />
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No messages on {selectedChatDelivery.orderId} yet
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Send a message below to notify {selectedChatDelivery.buyerName} regarding their credentials or activation.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${
                        isAdmin ? 'items-end' : 'items-start'
                      }`}
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
                        {msg.replyTo && (
                          <div
                            className={`mb-2 pl-2.5 py-1 border-l-2 rounded text-[11px] ${
                              isAdmin
                                ? 'border-emerald-200 bg-emerald-700/60 text-emerald-50'
                                : 'border-emerald-500 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <div className="font-semibold">{msg.replyTo.senderName}</div>
                            <div className="truncate">{msg.replyTo.text}</div>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                        {msg.attachment && (
                          <div className="mt-2.5">
                            {msg.attachment.type === 'image' ? (
                              <button
                                type="button"
                                onClick={() => setLightboxImage(msg.attachment!.url)}
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
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply / Staged Attachment Bar */}
            {(replyingTo || stagedAttachment || uploadError) && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                {uploadError && (
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium">
                    <span>{uploadError}</span>
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {replyingTo && (
                  <div className="flex items-center justify-between gap-2 pl-2.5 border-l-2 border-emerald-600 text-slate-600 dark:text-slate-300">
                    <div className="min-w-0">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Replying to {replyingTo.senderName}:
                      </span>{' '}
                      <span className="truncate">{replyingTo.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {stagedAttachment && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate">{stagedAttachment.name}</span>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        ({(stagedAttachment.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStagedAttachment(null)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Composer */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-end gap-2">
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
                className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer"
                title="Attach image or PDF"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                rows={1}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Write a message to buyer... (Enter to send, Shift + Enter for new line)"
                className="flex-1 min-h-[38px] max-h-28 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
              />

              <button
                type="button"
                onClick={submitOrderChatMessage}
                className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </Card>
        </div>

        {renderSharedModals()}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Deliveries
        </h1>

        <button
          type="button"
          onClick={() => setIsSimOrderOpen(true)}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Simulate Order</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="surface-pill-segment inline-flex items-center h-9 p-1 rounded-[10px] text-xs">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`h-7 px-3 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewLayout === 'table'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`h-7 px-3 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewLayout === 'cards'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cards
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order or buyer..."
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full sm:w-56"
          />

          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

        <SegmentedTabs
          options={[
            { value: 'all', label: 'All', count: deliveries.length },
            {
              value: 'unread_chat',
              label: 'Unread Chat',
              count: unreadChatDeliveriesCount,
            },
            { value: 'pending_dispatch', label: 'Pending', count: pendingCount },
            { value: 'warranty_claim', label: 'Claims', count: claimCount },
            { value: 'delivered', label: 'Delivered', count: deliveredCount },
            {
              value: 'replaced',
              label: 'Replaced',
              count: deliveries.filter((d) => d.status === 'replaced').length,
            },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Deliveries" value={deliveries.length} />
          <StatMetric
            label="Pending Dispatch"
            value={pendingCount}
            badge={pendingCount > 0 ? 'Queue' : undefined}
            tone="amber"
          />
          <StatMetric
            label="Unread Chats"
            value={unreadChatDeliveriesCount}
            badge={unreadChatDeliveriesCount > 0 ? 'Unread' : undefined}
            tone={unreadChatDeliveriesCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric label="Active Warranty" value={activeWarrantyCount} />
        </Card>
      )}

      {filteredDeliveries.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No deliveries match your filter"
            description="Reset the search query or switch back to All."
            onReset={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
          />
        </Card>
      ) : viewLayout === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 w-9">
                    <ShadcnCheckbox
                      checked={
                        filteredDeliveries.length > 0 &&
                        selectedIds.length === filteredDeliveries.length
                      }
                      onChange={(c) =>
                        setSelectedIds(c ? filteredDeliveries.map((d) => d.id) : [])
                      }
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Buyer</th>
                  <th className="py-3 px-3 whitespace-nowrap">Product &amp; Option</th>
                  <th className="py-3 px-3 whitespace-nowrap">Credential</th>
                  <th className="py-3 px-3 whitespace-nowrap">Warranty</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredDeliveries.map((del) => {
                  const checked = selectedIds.includes(del.id);
                  const unread = del.unreadChatCount || 0;

                  return (
                    <tr
                      key={del.id}
                      className={`transition-colors whitespace-nowrap ${
                        checked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <ShadcnCheckbox
                          checked={checked}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(del.id)
                                ? prev.filter((i) => i !== del.id)
                                : [...prev, del.id]
                            )
                          }
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{del.orderId}</span>
                          {unread > 0 && (
                            <span
                              className="w-2 h-2 rounded-full bg-rose-500"
                              title={`${unread} unread message`}
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {del.buyerName}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {del.productName}{' '}
                        <span className="text-slate-400 font-normal">— {del.variantName}</span>
                      </td>

                      <td className="py-3 px-3">
                        {del.credentialPayload.secretValue ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                              {del.credentialPayload.secretValue}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(del.id, del.credentialPayload.secretValue)
                              }
                              className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                              title="Copy"
                            >
                              {copiedId === del.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Awaiting Dispatch
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {del.hasWarranty ? `${del.warrantyRemainingDays}d` : '—'}
                      </td>

                      <td className="py-3 px-3">
                        {del.status === 'delivered' && (
                          <StatusIndicator tone="emerald" label="Delivered" />
                        )}
                        {del.status === 'pending_dispatch' && (
                          <StatusIndicator tone="amber" label="Pending" />
                        )}
                        {del.status === 'warranty_claim' && (
                          <StatusIndicator tone="red" label="Claim" />
                        )}
                        {del.status === 'replaced' && (
                          <StatusIndicator tone="blue" label="Replaced" />
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectChatDelivery?.(del.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border inline-flex items-center gap-1.5 cursor-pointer ${
                              unread > 0
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{unread > 0 ? `Chat (${unread})` : 'Chat'}</span>
                          </button>

                          {del.status === 'pending_dispatch' ? (
                            <button
                              type="button"
                              onClick={() => openActionModal(del, false)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              Dispatch
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openActionModal(del, true)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                                del.status === 'warranty_claim'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {del.status === 'warranty_claim' ? 'Swap' : 'Replace'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredDeliveries.length > 10 && (
            <PaginationFooter
              totalItems={filteredDeliveries.length}
              pageSize={10}
              currentPage={1}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((del) => {
            const matchingVaultStock = vault.filter(
              (v) =>
                v.productId === del.productId &&
                v.variantId === del.variantId &&
                v.status === 'available'
            ).length;
            const unread = del.unreadChatCount || 0;

            return (
              <Card key={del.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{del.orderId}</span>
                      {unread > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <div className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {del.productName} · {del.variantName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectChatDelivery?.(del.id)}
                      className={`px-3 py-1.5 text-xs font-medium border rounded-lg inline-flex items-center gap-1.5 cursor-pointer ${
                        unread > 0
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{unread > 0 ? `Chat (${unread})` : 'Chat'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openActionModal(del, del.status !== 'pending_dispatch')}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                    >
                      {del.status === 'pending_dispatch'
                        ? 'Dispatch'
                        : `Swap (${matchingVaultStock})`}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Credential</span>
                    <div className="font-mono text-xs truncate text-slate-900 dark:text-slate-100 mt-0.5">
                      {del.credentialPayload.secretValue || 'Pending'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Buyer</span>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {del.buyerName}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                    <span className="text-slate-400 block">Warranty &amp; VPN</span>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {del.warrantyRemainingDays}d · {del.vpnRequired ? 'VPN Req' : 'Direct'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {renderSharedModals()}
    </div>
  );
}
