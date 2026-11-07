'use client';

import type { FormEvent, RefObject } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Package,
  Paperclip,
  Plus,
  Reply,
  Send,
  X,
} from 'lucide-react';
import {
  StatusBadge,
  StoreButton,
  StoreInputField,
  StorePagination,
  StoreSearchBar,
  StoreSearchableSelect,
  StoreSurfaceCard,
  StoreTextareaField,
  type ChatAttachment,
  type SearchableSelectOption,
} from '@/components/storefront/ui';
import type {
  SupportTicketItem,
  SupportTicketMessage,
} from '@/components/storefront/pages/account/account-types';
import {
  formatBytes,
  TICKETS_PER_PAGE,
} from '@/components/storefront/pages/account/account-utils';

type TicketFilter = 'ALL' | 'Open' | 'Answered' | 'Closed';

export type AccountTicketsPanelProps = {
  creatingTicket: boolean;
  setCreatingTicket: (v: boolean) => void;
  selectedTicket: SupportTicketItem | undefined;
  setSelectedTicketId: (id: string | null) => void;
  tickets: SupportTicketItem[];
  paginatedTickets: SupportTicketItem[];
  filteredTickets: SupportTicketItem[];
  currentTicketPage: number;
  totalTicketPages: number;
  ticketSearch: string;
  setTicketSearch: (v: string) => void;
  ticketFilter: TicketFilter;
  setTicketFilter: (f: TicketFilter) => void;
  setTicketPage: (p: number) => void;
  newTicketSubject: string;
  setNewTicketSubject: (v: string) => void;
  newTicketOrderId: string;
  setNewTicketOrderId: (v: string) => void;
  newTicketCategory: string;
  setNewTicketCategory: (v: string) => void;
  newTicketPriority: SupportTicketItem['priority'];
  setNewTicketPriority: (p: SupportTicketItem['priority']) => void;
  newTicketMessage: string;
  setNewTicketMessage: (v: string) => void;
  newTicketAttachment: ChatAttachment | null;
  setNewTicketAttachment: (a: ChatAttachment | null) => void;
  newTicketFileError: string;
  setNewTicketFileError: (v: string) => void;
  newTicketFileRef: RefObject<HTMLInputElement | null>;
  ticketReplyDraft: string;
  setTicketReplyDraft: (v: string) => void;
  ticketReplyingTo: SupportTicketMessage | null;
  setTicketReplyingTo: (m: SupportTicketMessage | null) => void;
  ticketReplyAttachment: ChatAttachment | null;
  setTicketReplyAttachment: (a: ChatAttachment | null) => void;
  ticketReplyFileError: string;
  setTicketReplyFileError: (v: string) => void;
  ticketReplyFileRef: RefObject<HTMLInputElement | null>;
  ticketReplyTextareaRef: RefObject<HTMLTextAreaElement | null>;
  allOrderSelectOptions: SearchableSelectOption[];
  onCreateTicket: (e: FormEvent) => void;
  onSendTicketReply: (e: FormEvent) => void;
  submitTicketReply: () => void;
  onOpenOrderAccess: (orderId: string) => void;
  parseFileUpload: (
    file: File | undefined,
    onValid: (att: ChatAttachment) => void,
    onError: (msg: string) => void,
  ) => void;
};

export function AccountTicketsPanel(props: AccountTicketsPanelProps) {
  const {
    creatingTicket,
    setCreatingTicket,
    selectedTicket,
    setSelectedTicketId,
    tickets,
    paginatedTickets,
    filteredTickets,
    currentTicketPage,
    totalTicketPages,
    ticketSearch,
    setTicketSearch,
    ticketFilter,
    setTicketFilter,
    setTicketPage,
    newTicketSubject,
    setNewTicketSubject,
    newTicketOrderId,
    setNewTicketOrderId,
    newTicketCategory,
    setNewTicketCategory,
    newTicketPriority,
    setNewTicketPriority,
    newTicketMessage,
    setNewTicketMessage,
    newTicketAttachment,
    setNewTicketAttachment,
    newTicketFileError,
    setNewTicketFileError,
    newTicketFileRef,
    ticketReplyDraft,
    setTicketReplyDraft,
    ticketReplyingTo,
    setTicketReplyingTo,
    ticketReplyAttachment,
    setTicketReplyAttachment,
    ticketReplyFileError,
    setTicketReplyFileError,
    ticketReplyFileRef,
    ticketReplyTextareaRef,
    allOrderSelectOptions,
    onCreateTicket,
    onSendTicketReply,
    submitTicketReply,
    onOpenOrderAccess,
    parseFileUpload,
  } = props;

  return (
      <div className="space-y-4">
        {creatingTicket ? (
          <div className="max-w-xl mx-auto w-full space-y-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCreatingTicket(false)}
                className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={13} />
                <span>Tickets</span>
              </button>
              <h1 className="text-base font-bold text-slate-900 m-0">
                New Ticket
              </h1>
            </div>

            <StoreSurfaceCard className="p-5 sm:p-6 space-y-4">
              <form onSubmit={onCreateTicket} className="space-y-4">
                <StoreInputField
                  label="Subject"
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Short summary of your request"
                />

                <StoreSearchableSelect
                  label="Order"
                  required
                  options={allOrderSelectOptions}
                  value={newTicketOrderId}
                  onChange={setNewTicketOrderId}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) =>
                        setNewTicketCategory(e.target.value)
                      }
                      className="w-full h-9.5 px-3 rounded border border-slate-300 bg-white text-[13px] font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="Access & Delivery">
                        Access & Delivery
                      </option>
                      <option value="Login / Credentials">
                        Login / Credentials
                      </option>
                      <option value="Billing / TrxID">
                        Billing / TrxID
                      </option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Normal', 'High', 'Urgent'] as const).map(
                        (p) => {
                          const active = newTicketPriority === p;
                          const activeClass =
                            p === 'Urgent'
                              ? 'bg-[#FF5E5B] text-white border-[#FF5E5B]'
                              : p === 'High'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-slate-900 text-white border-slate-900';
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewTicketPriority(p)}
                              className={`h-9.5 rounded text-xs font-semibold border cursor-pointer transition-colors ${
                                active
                                  ? activeClass
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>

                <StoreTextareaField
                  label="Message"
                  required
                  rows={4}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Describe your question or issue..."
                />

                {/* 5MB Attachment Control */}
                <div className="space-y-1.5">
                  <input
                    ref={newTicketFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      parseFileUpload(
                        e.target.files?.[0],
                        setNewTicketAttachment,
                        setNewTicketFileError,
                      );
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => newTicketFileRef.current?.click()}
                      className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Paperclip size={13} />
                      <span>Attach file</span>
                    </button>
                    {newTicketFileError && (
                      <span className="text-[11px] font-semibold text-rose-600">
                        {newTicketFileError}
                      </span>
                    )}
                  </div>

                  {newTicketAttachment && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 text-xs">
                      <span className="truncate font-semibold text-slate-900">
                        {newTicketAttachment.name} (
                        {formatBytes(newTicketAttachment.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewTicketAttachment(null)}
                        className="text-slate-500 hover:text-slate-900 bg-transparent border-0 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <StoreButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingTicket(false)}
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </StoreButton>
                  <StoreButton type="submit" variant="dark" size="sm">
                    <Send size={13} />
                    <span>Submit Ticket</span>
                  </StoreButton>
                </div>
              </form>
            </StoreSurfaceCard>
          </div>
        ) : selectedTicket ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  className="h-8 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft size={13} />
                  <span>Tickets</span>
                </button>
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold tabular-nums">
                  {selectedTicket.id}
                </span>
                <StatusBadge
                  tone={
                    selectedTicket.status === 'Answered'
                      ? 'emerald'
                      : selectedTicket.status === 'Open'
                        ? 'coral'
                        : 'slate'
                  }
                >
                  {selectedTicket.status}
                </StatusBadge>
              </div>

              <StoreButton
                variant="outline"
                size="sm"
                onClick={() => onOpenOrderAccess(selectedTicket.orderId)}
              >
                <Package size={13} />
                <span>Order {selectedTicket.orderId}</span>
                <ArrowUpRight size={12} />
              </StoreButton>
            </div>

            <StoreSurfaceCard
              padded={false}
              className="divide-y divide-slate-200 overflow-hidden"
            >
              <div className="p-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 m-0">
                    {selectedTicket.subject}
                  </h2>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    {selectedTicket.category} · {selectedTicket.priority}{' '}
                    Priority
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {selectedTicket.updatedAt}
                </span>
              </div>

              <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto bg-slate-50/40">
                {selectedTicket.messages.map((m) => {
                  const isCustomer = m.sender === 'customer';
                  return (
                    <div
                      key={m.id}
                      className={`group flex flex-col ${
                        isCustomer ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {m.senderName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                          {m.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTicketReplyingTo(m)}
                          className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                        >
                          <Reply size={11} />
                          <span>Reply</span>
                        </button>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-md px-3.5 py-2.5 text-[13px] font-medium leading-relaxed space-y-1.5 ${
                          isCustomer
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        {m.replyTo && (
                          <div
                            className={`px-2.5 py-1 rounded text-[11px] truncate ${
                              isCustomer
                                ? 'bg-slate-800 text-slate-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="font-semibold">
                              {m.replyTo.senderName}:
                            </span>{' '}
                            {m.replyTo.text}
                          </div>
                        )}

                        {m.attachment && (
                          <div>
                            {m.attachment.type === 'image' ? (
                              <img
                                src={m.attachment.url}
                                alt={m.attachment.name}
                                referrerPolicy="no-referrer"
                                className="max-h-36 rounded object-cover"
                              />
                            ) : (
                              <a
                                href={m.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold no-underline ${
                                  isCustomer
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-900'
                                }`}
                              >
                                <FileText size={13} />
                                <span className="truncate max-w-[160px]">
                                  {m.attachment.name}
                                </span>
                                <span className="text-[10px] opacity-80 tabular-nums">
                                  ({formatBytes(m.attachment.size)})
                                </span>
                              </a>
                            )}
                          </div>
                        )}

                        {m.text && (
                          <div className="whitespace-pre-wrap break-words">
                            {m.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply & Attachment Preview */}
              {(ticketReplyingTo ||
                ticketReplyAttachment ||
                ticketReplyFileError) && (
                <div className="px-4 py-2 bg-slate-50 space-y-1.5 text-xs">
                  {ticketReplyFileError && (
                    <div className="flex items-center justify-between font-semibold text-rose-600">
                      <span>{ticketReplyFileError}</span>
                      <button
                        type="button"
                        onClick={() => setTicketReplyFileError('')}
                        className="bg-transparent border-0 cursor-pointer text-slate-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {ticketReplyingTo && (
                    <div className="flex items-center justify-between font-medium text-slate-700">
                      <span className="truncate">
                        Replying to{' '}
                        <strong className="font-semibold">
                          {ticketReplyingTo.senderName}
                        </strong>
                        : {ticketReplyingTo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTicketReplyingTo(null)}
                        className="bg-transparent border-0 cursor-pointer text-slate-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {ticketReplyAttachment && (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-slate-200 font-medium text-slate-800">
                      <span className="truncate">
                        {ticketReplyAttachment.name} (
                        {formatBytes(ticketReplyAttachment.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setTicketReplyAttachment(null)}
                        className="bg-transparent border-0 cursor-pointer text-slate-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={onSendTicketReply}
                className="p-3 bg-white flex items-end gap-2"
              >
                <input
                  ref={ticketReplyFileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    parseFileUpload(
                      e.target.files?.[0],
                      setTicketReplyAttachment,
                      setTicketReplyFileError,
                    );
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ticketReplyFileRef.current?.click()}
                  title="Attach image or PDF (max 5MB)"
                  className="w-9 h-9 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Paperclip size={14} />
                </button>

                <textarea
                  ref={ticketReplyTextareaRef}
                  rows={1}
                  value={ticketReplyDraft}
                  onChange={(e) => {
                    setTicketReplyDraft(e.target.value);
                    const el = e.target;
                    el.style.height = '36px';
                    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitTicketReply();
                    }
                  }}
                  placeholder="Write a reply..."
                  className="flex-1 h-9 max-h-28 py-2 px-3 rounded border border-slate-300 bg-white text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 resize-none overflow-hidden leading-tight"
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
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg font-bold text-slate-900 m-0">
                Tickets
              </h1>

              <StoreButton
                variant="dark"
                size="sm"
                onClick={() => setCreatingTicket(true)}
              >
                <Plus size={13} />
                <span>New Ticket</span>
              </StoreButton>
            </div>

            <StoreSearchBar
              value={ticketSearch}
              onChange={(val) => {
                setTicketSearch(val);
                setTicketPage(1);
              }}
              placeholder="Search tickets..."
              filters={[
                { id: 'ALL', label: 'All', count: tickets.length },
                {
                  id: 'Open',
                  label: 'Open',
                  count: tickets.filter((t) => t.status === 'Open')
                    .length,
                },
                {
                  id: 'Answered',
                  label: 'Answered',
                  count: tickets.filter((t) => t.status === 'Answered')
                    .length,
                },
                {
                  id: 'Closed',
                  label: 'Closed',
                  count: tickets.filter((t) => t.status === 'Closed')
                    .length,
                },
              ]}
              activeFilter={ticketFilter}
              onFilterChange={(f) => {
                setTicketFilter(f);
                setTicketPage(1);
              }}
            />

            <StoreSurfaceCard
              padded={false}
              className="divide-y divide-slate-200 overflow-hidden"
            >
              {paginatedTickets.map((t) => (
                <div
                  key={t.id}
                  className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 m-0 truncate">
                        {t.subject}
                      </h3>
                      <StatusBadge
                        tone={
                          t.status === 'Answered'
                            ? 'emerald'
                            : t.status === 'Open'
                              ? 'blue'
                              : 'slate'
                        }
                      >
                        {t.status}
                      </StatusBadge>
                      <StatusBadge
                        dot={false}
                        tone={
                          t.priority === 'Urgent'
                            ? 'rose'
                            : t.priority === 'High'
                              ? 'amber'
                              : 'slate'
                        }
                      >
                        {t.priority}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-800 tabular-nums">
                        {t.id}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {t.orderId}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span>{t.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0 shrink-0">
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      {t.updatedAt}
                    </span>
                    <StoreButton
                      variant={
                        t.status === 'Closed' ? 'secondary' : 'dark'
                      }
                      size="sm"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <span>Open</span>
                      <ArrowUpRight size={13} />
                    </StoreButton>
                  </div>
                </div>
              ))}
            </StoreSurfaceCard>

            <StorePagination
              currentPage={currentTicketPage}
              totalPages={totalTicketPages}
              totalItems={filteredTickets.length}
              pageSize={TICKETS_PER_PAGE}
              onPageChange={setTicketPage}
            />
          </>
        )}
      </div>  );
}
