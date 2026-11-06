'use client';

import React, { useState } from 'react';
import {
  AdminSupportTicket,
  AdminChatAttachment,
  DigitalDelivery,
} from '@/lib/admin-data';
import { TicketDetailChat } from './TicketDetailChat';
import { TicketsList } from './TicketsList';
import { CreateTicketModal } from './CreateTicketModal';

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId) || null
    : null;

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

  if (selectedTicket) {
    return (
      <TicketDetailChat
        ticket={selectedTicket}
        deliveries={deliveries}
        onBack={() => onSelectTicket(null)}
        onReplyTicket={onReplyTicket}
        onUpdateTicketStatus={onUpdateTicketStatus}
        onUpdateTicketPriority={onUpdateTicketPriority}
        onSimulateBuyerTicketReply={onSimulateBuyerTicketReply}
        onOpenOrderChat={onOpenOrderChat}
      />
    );
  }

  return (
    <>
      <TicketsList
        tickets={tickets}
        filteredTickets={filteredTickets}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        showStatistics={showStatistics}
        openCount={openCount}
        answeredCount={answeredCount}
        closedCount={closedCount}
        urgentOrHighCount={urgentOrHighCount}
        onStatusFilterChange={setStatusFilter}
        onPriorityFilterChange={setPriorityFilter}
        onSearchQueryChange={setSearchQuery}
        onShowStatisticsChange={setShowStatistics}
        onSelectTicket={onSelectTicket}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenOrderChat={onOpenOrderChat}
        onResetFilters={() => {
          setStatusFilter('all');
          setPriorityFilter('all');
          setSearchQuery('');
        }}
      />
      <CreateTicketModal
        open={isCreateOpen}
        deliveries={deliveries}
        onClose={() => setIsCreateOpen(false)}
        onCreateTicket={onCreateTicket}
      />
    </>
  );
}
