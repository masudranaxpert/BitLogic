import type { ChatAttachment } from '@/components/storefront/ui';

export interface SupportTicketMessage {
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

export interface SupportTicketItem {
  id: string;
  subject: string;
  orderId: string;
  category: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'Answered' | 'Closed';
  updatedAt: string;
  messages: SupportTicketMessage[];
}

export interface WarrantyClaimItem {
  id: string;
  orderId: string;
  productName: string;
  planName: string;
  issueType: string;
  description: string;
  date: string;
  status: 'In Review' | 'Resolved';
}

export interface AccountNotificationItem {
  id: string;
  type: 'order_chat' | 'ticket' | 'warranty';
  orderId?: string;
  ticketId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}
