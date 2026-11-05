'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PlusCircle,
  ArrowLeft,
  Paperclip,
  Send,
  Reply,
  FileText,
  X,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  AdminSupportTicket,
  AdminChatAttachment,
  DigitalDelivery,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  PaginationFooter,
  ModalShell,
  EmptyTableState,
} from '@/components/ui/primitives';

interface TicketsViewProps {
  tickets: AdminSupportTicket[];
  deliveries: DigitalDelivery[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  onReplyTicket: (
    ticketId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: AdminChatAttachment;
    }
  ) => void;
  onUpdateTicketStatus: (
    ticketId: string,
    status: AdminSupportTicket['status']
  ) => void;
  onUpdateTicketPriority: (
    ticketId: string,
    priority: AdminSupportTicket['priority']
  ) => void;
  onCreateTicket: (newTicket: {
    subject: string;
    orderId: string;
    category: AdminSupportTicket['category'];
    priority: AdminSupportTicket['priority'];
    initialMessage: string;
  }) => void;
  onSimulateBuyerTicketReply: (ticketId: string) => void;
  onOpenOrderChat: (orderId: string, deliveryId?: string) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export default function TicketsView({
  tickets,
  deliveries,
  selectedTicketId,
  onSelectTicket,
  onReplyTicket,
  onUpdateTicketStatus,
  onUpdateTicketPriority,
  onCreateTicket,
  onSimulateBuyerTicketReply,
  onOpenOrderChat,
}: TicketsViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'answered' | 'closed'
  >('all');
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'Urgent' | 'High' | 'Normal'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatistics, setShowStatistics] = useState(true);

  // Create Ticket modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newOrderId, setNewOrderId] = useState(deliveries[0]?.orderId || 'ORD-88219');
  const [newCategory, setNewCategory] =
    useState<AdminSupportTicket['category']>('Access & Delivery');
  const [newPriority, setNewPriority] =
    useState<AdminSupportTicket['priority']>('High');
  const [newMessage, setNewMessage] = useState('');

  // Conversation composer state
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [stagedAttachment, setStagedAttachment] =
    useState<AdminChatAttachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId) || null
    : null;

  const messageCount = selectedTicket?.messages.length || 0;

  useEffect(() => {
    if (selectedTicketId) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [selectedTicketId, messageCount]);

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
        id: `tatt-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'image',
        url: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendReply = () => {
    if (!selectedTicket) return;
    if (!replyText.trim() && !stagedAttachment) return;

    onReplyTicket(selectedTicket.id, {
      text:
        replyText.trim() ||
        (stagedAttachment ? `Attached file: ${stagedAttachment.name}` : ''),
      replyTo: replyingTo || undefined,
      attachment: stagedAttachment || undefined,
    });

    setReplyText('');
    setReplyingTo(null);
    setStagedAttachment(null);
    setUploadError(null);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    onCreateTicket({
      subject: newSubject.trim(),
      orderId: newOrderId,
      category: newCategory,
      priority: newPriority,
      initialMessage: newMessage.trim(),
    });
    setNewSubject('');
    setNewMessage('');
    setIsCreateOpen(false);
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const answeredCount = tickets.filter((t) => t.status === 'answered').length;
  const closedCount = tickets.filter((t) => t.status === 'closed').length;
  const urgentOrHighCount = tickets.filter(
    (t) => t.status !== 'closed' && (t.priority === 'Urgent' || t.priority === 'High')
  ).length;

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority =
      priorityFilter === 'all' || t.priority === priorityFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q) ||
      t.buyerName.toLowerCase().includes(q) ||
      t.buyerEmail.toLowerCase().includes(q) ||
      t.productName.toLowerCase().includes(q);
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Ticket Conversation View
  if (selectedTicket) {
    const linkedDelivery = deliveries.find(
      (d) =>
        d.orderId === selectedTicket.orderId || d.id === selectedTicket.deliveryId
    );

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectTicket(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tickets</span>
            </button>

            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {selectedTicket.id}
            </span>

            {selectedTicket.status === 'open' && (
              <StatusIndicator tone="amber" label="Open" />
            )}
            {selectedTicket.status === 'answered' && (
              <StatusIndicator tone="emerald" label="Answered" />
            )}
            {selectedTicket.status === 'closed' && (
              <StatusIndicator tone="zinc" label="Closed" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateBuyerTicketReply(selectedTicket.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simulate Buyer Reply</span>
            </button>

            <select
              value={selectedTicket.priority}
              onChange={(e) =>
                onUpdateTicketPriority(
                  selectedTicket.id,
                  e.target.value as AdminSupportTicket['priority']
                )
              }
              aria-label="Ticket priority"
              className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="Normal">Priority: Normal</option>
              <option value="High">Priority: High</option>
              <option value="Urgent">Priority: Urgent</option>
            </select>

            {selectedTicket.status !== 'closed' ? (
              <button
                type="button"
                onClick={() => onUpdateTicketStatus(selectedTicket.id, 'closed')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Close Ticket</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateTicketStatus(selectedTicket.id, 'open')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Ticket</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Conversation Column */}
          <Card className="lg:col-span-8 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedTicket.subject}
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  Updated {selectedTicket.updatedAt}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{selectedTicket.category}</span>
                <span>·</span>
                <span>{selectedTicket.productName}</span>
              </div>
            </div>

            <div className="p-4 space-y-3.5 max-h-[460px] min-h-[340px] overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
              {selectedTicket.messages.map((msg) => {
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
              })}
              <div ref={threadEndRef} />
            </div>

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
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleReplyKeyDown}
                placeholder="Reply to customer ticket... (Enter to send, Shift + Enter for new line)"
                className="flex-1 min-h-[38px] max-h-28 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
              />

              <button
                type="button"
                onClick={handleSendReply}
                className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </button>
            </div>
          </Card>

          {/* Right Sidebar: Customer & Linked Order Details */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Customer &amp; Order Context
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Buyer</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedTicket.buyerName}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {selectedTicket.buyerEmail}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Linked Order</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {selectedTicket.orderId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenOrderChat(selectedTicket.orderId, selectedTicket.deliveryId)
                    }
                    className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Order Chat</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Product</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTicket.productName}
                  </span>
                </div>

                {linkedDelivery && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">
                      Current Order Credential
                    </span>
                    <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                      {linkedDelivery.credentialPayload.secretValue || 'Awaiting Dispatch'}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Support Tickets
        </h1>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create Ticket</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket ID, order, or buyer..."
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          />

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value as 'all' | 'Urgent' | 'High' | 'Normal'
              )
            }
            aria-label="Filter by priority"
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent Only</option>
            <option value="High">High Only</option>
            <option value="Normal">Normal Only</option>
          </select>

          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

        <SegmentedTabs
          options={[
            { value: 'all', label: 'All', count: tickets.length },
            { value: 'open', label: 'Open', count: openCount },
            { value: 'answered', label: 'Answered', count: answeredCount },
            { value: 'closed', label: 'Closed', count: closedCount },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Tickets" value={tickets.length} badge="Support" />
          <StatMetric
            label="Open Queue"
            value={openCount}
            badge={openCount > 0 ? 'Needs reply' : 'Clear'}
            tone={openCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric
            label="Urgent / High"
            value={urgentOrHighCount}
            badge="Priority"
            tone={urgentOrHighCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric label="Answered" value={answeredCount} badge="Resolved" />
        </Card>
      )}

      {filteredTickets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No support tickets match your filter"
            description="Reset the search query or switch back to All."
            onReset={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setSearchQuery('');
            }}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 whitespace-nowrap">Ticket ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Subject &amp; Category</th>
                  <th className="py-3 px-3 whitespace-nowrap">Buyer</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order</th>
                  <th className="py-3 px-3 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Updated</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredTickets.map((tkt) => {
                  const unread = tkt.unreadCount || 0;
                  return (
                    <tr
                      key={tkt.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{tkt.id}</span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-sans font-semibold">
                              {unread} new
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-normal">
                          {tkt.subject}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {tkt.category} · {tkt.productName}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tkt.buyerName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {tkt.buyerEmail}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenOrderChat(tkt.orderId, tkt.deliveryId)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{tkt.orderId}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        {tkt.priority === 'Urgent' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                            Urgent
                          </span>
                        )}
                        {tkt.priority === 'High' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            High
                          </span>
                        )}
                        {tkt.priority === 'Normal' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {tkt.status === 'open' && (
                          <StatusIndicator tone="amber" label="Open" />
                        )}
                        {tkt.status === 'answered' && (
                          <StatusIndicator tone="emerald" label="Answered" />
                        )}
                        {tkt.status === 'closed' && (
                          <StatusIndicator tone="zinc" label="Closed" />
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {tkt.updatedAt}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectTicket(tkt.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 cursor-pointer ${
                            tkt.status === 'open'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-200/80 dark:divide-slate-800">
            {filteredTickets.map((tkt) => (
              <div key={tkt.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {tkt.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenOrderChat(tkt.orderId, tkt.deliveryId)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{tkt.orderId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  {tkt.status === 'open' && (
                    <StatusIndicator tone="amber" label="Open" />
                  )}
                  {tkt.status === 'answered' && (
                    <StatusIndicator tone="emerald" label="Answered" />
                  )}
                  {tkt.status === 'closed' && (
                    <StatusIndicator tone="zinc" label="Closed" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {tkt.subject}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {tkt.buyerName} · {tkt.category}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[11px] text-slate-400">
                    {tkt.updatedAt}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTicket(tkt.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Ticket</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTickets.length > 10 && (
            <PaginationFooter
              totalItems={filteredTickets.length}
              pageSize={10}
              currentPage={1}
            />
          )}
        </Card>
      )}

      <ModalShell
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Support Ticket"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Linked Order
            </label>
            <select
              value={newOrderId}
              onChange={(e) => setNewOrderId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              {deliveries.map((d) => (
                <option key={d.id} value={d.orderId}>
                  {d.orderId} — {d.buyerName} ({d.productName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as AdminSupportTicket['category'])
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="Access & Delivery">Access &amp; Delivery</option>
                <option value="Login / Credentials">Login / Credentials</option>
                <option value="Warranty / Replacement">Warranty / Replacement</option>
                <option value="Billing / TrxID">Billing / TrxID</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value as AdminSupportTicket['priority'])
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g., Workspace invite verification follow-up"
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message to Buyer
            </label>
            <textarea
              rows={4}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write the support message..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
