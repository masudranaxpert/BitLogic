'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Send,
  Reply,
  FileText,
  X,
  ArrowUpRight,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  AdminSupportTicket,
  AdminChatAttachment,
  DigitalDelivery,
} from '@/lib/admin-data';
import { Card, StatusIndicator } from '@/components/admin/ui/primitives';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

interface TicketDetailChatProps {
  ticket: AdminSupportTicket;
  deliveries: DigitalDelivery[];
  onBack: () => void;
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
  onOpenOrderChat: (orderId: string, deliveryId?: string) => void;
}

export function TicketDetailChat({
  ticket,
  deliveries,
  onBack,
  onReplyTicket,
  onUpdateTicketStatus,
  onUpdateTicketPriority,
  onOpenOrderChat,
}: TicketDetailChatProps) {
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

  const messageCount = ticket.messages.length;

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ticket.id, messageCount]);

  const linkedDelivery = deliveries.find(
    (d) => d.orderId === ticket.orderId || d.id === ticket.deliveryId
  );

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
    if (!replyText.trim() && !stagedAttachment) return;

    onReplyTicket(ticket.id, {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tickets</span>
          </button>

          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {ticket.id}
          </span>

          {ticket.status === 'open' && (
            <StatusIndicator tone="amber" label="Open" />
          )}
          {ticket.status === 'answered' && (
            <StatusIndicator tone="emerald" label="Answered" />
          )}
          {ticket.status === 'closed' && (
            <StatusIndicator tone="zinc" label="Closed" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={ticket.priority}
            onChange={(e) =>
              onUpdateTicketPriority(
                ticket.id,
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

          {ticket.status !== 'closed' ? (
            <button
              type="button"
              onClick={() => onUpdateTicketStatus(ticket.id, 'closed')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Close Ticket</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onUpdateTicketStatus(ticket.id, 'open')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Ticket</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-8 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {ticket.subject}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Updated {ticket.updatedAt}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{ticket.category}</span>
              <span>·</span>
              <span>{ticket.productName}</span>
            </div>
          </div>

          <div className="p-4 space-y-3.5 max-h-[460px] min-h-[340px] overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
            {ticket.messages.map((msg) => {
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

        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Customer &amp; Order Context
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Buyer</span>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {ticket.buyerName}
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                  {ticket.buyerEmail}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Linked Order</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {ticket.orderId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenOrderChat(ticket.orderId, ticket.deliveryId)
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
                  {ticket.productName}
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
