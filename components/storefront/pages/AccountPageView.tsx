'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShieldAlert,
  Ticket,
  User,
  LogOut,
  ShoppingBag,
  Menu,
  X,
  CheckCircle2,
  Plus,
  Send,
  ArrowLeft,
  Lock,
  Phone,
  Mail,
  Paperclip,
  FileText,
  Reply,
  Bell,
  MessageSquare,
  ArrowUpRight,
  Check,
  KeyRound,
} from 'lucide-react';
import { clearCustomer, writeCustomer } from '@/lib/customerSession';
import { useCustomerSession } from '@/hooks/use-customer-session';
import { formatPrice } from '@/lib/products';
import {
  DurationBadge,
  OrderAccessDetailView,
  OrderRowCard,
  StatusBadge,
  StoreButton,
  StoreInputField,
  StorePagination,
  StoreSearchBar,
  StoreSearchableSelect,
  StoreStatCard,
  StoreSurfaceCard,
  StoreTextareaField,
  WarrantyBadge,
  WhatsAppIcon,
  type ChatAttachment,
  type CustomerOrderItem,
  type OrderChatMessage,
  type SearchableSelectOption,
} from '@/components/storefront/ui';
import { useStoreNav, type AccountTab } from '@/context/StoreNavContext';

interface SupportTicketMessage {
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

interface SupportTicketItem {
  id: string;
  subject: string;
  orderId: string;
  category: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'Answered' | 'Closed';
  updatedAt: string;
  messages: SupportTicketMessage[];
}

interface WarrantyClaimItem {
  id: string;
  orderId: string;
  productName: string;
  planName: string;
  issueType: string;
  description: string;
  date: string;
  status: 'In Review' | 'Resolved';
}

interface AccountNotificationItem {
  id: string;
  type: 'order_chat' | 'ticket' | 'warranty';
  orderId?: string;
  ticketId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const INITIAL_ORDERS: CustomerOrderItem[] = [
  {
    id: 'ORD-9995',
    productName: 'Coursera Plus Annual',
    planName: 'Personal Mail Activation',
    duration: '12 Months',
    date: '2026-11-04',
    expiryDate: '2027-11-04',
    daysRemaining: 365,
    totalDays: 365,
    price: 950,
    paymentMethod: 'bkash',
    trxId: 'BKX99410P',
    status: 'Pending (10–24h)',
    warrantyLabel: '300D Warranty',
    warrantyDaysLeft: 300,
    deliveryEta: '10–24h delivery',
    loginEmail: 'masud132213@gmail.com',
    unreadChatCount: 1,
    extraInfo: [
      { label: 'Activation', value: 'Personal Email Invite' },
      { label: 'Target Email', value: 'masud132213@gmail.com' },
      { label: 'Delivery Time', value: '10–24 Hours' },
      { label: 'Certificates', value: 'Included' },
    ],
    usageRules: [
      'Invite is sent to masud132213@gmail.com within 10–24 hours.',
      'Accept the invitation link within 48 hours of receipt.',
    ],
    chatMessages: [
      {
        id: 'm-1',
        sender: 'support',
        senderName: 'Support',
        text: 'Payment BKX99410P verified. Activation on masud132213@gmail.com is scheduled (10–24h).',
        time: '10:15 AM',
      },
      {
        id: 'm-2',
        sender: 'customer',
        senderName: 'You',
        text: 'Please send the invite to masud132213@gmail.com.',
        time: '10:17 AM',
      },
      {
        id: 'm-3',
        sender: 'support',
        senderName: 'Support',
        text: 'Confirmed! Your Coursera Plus invite is now at the top of the batch queue.',
        time: '10:22 AM',
      },
    ],
  },
  {
    id: 'ORD-9982',
    productName: 'Gemini Advanced',
    planName: 'Gemini Jio 18M + 2TB',
    duration: '18 Months',
    date: '2026-11-02',
    expiryDate: '2028-05-02',
    daysRemaining: 544,
    totalDays: 548,
    price: 1450,
    paymentMethod: 'bkash',
    trxId: 'BKX98271A',
    status: 'Active',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 23,
    loginEmail: 'gemini.masud@bl-auth.com',
    loginPassword: 'BL@Jio2026!#',
    twoFactorCode: '8492-1104',
    accessUrl: 'https://gemini.google.com',
    secretText: 'gemini.masud@bl-auth.com | BL@Jio2026!#',
    unreadChatCount: 1,
    extraInfo: [
      { label: 'Type', value: 'Private Account' },
      { label: 'Storage', value: '2 TB Google One' },
      { label: 'Devices', value: 'Up to 3 Devices' },
    ],
    usageRules: [
      'Sign in at accounts.google.com.',
      'Keep the 2FA backup code saved for device verification.',
    ],
    chatMessages: [
      {
        id: 'm-10',
        sender: 'support',
        senderName: 'Support',
        text: 'Credentials delivered for Gemini Advanced 18M + 2TB. Backup code 8492-1104 is attached.',
        time: 'Nov 02',
      },
    ],
  },
  {
    id: 'ORD-9921',
    productName: 'ChatGPT Plus',
    planName: 'Private Mail Access',
    duration: '1 Month',
    date: '2026-10-28',
    expiryDate: '2026-11-28',
    daysRemaining: 24,
    totalDays: 30,
    price: 320,
    paymentMethod: 'nagad',
    trxId: 'NGD44812K',
    status: 'Active',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 18,
    loginEmail: 'chat.masud99@bitlogic.com.bd',
    loginPassword: 'Blgpt@2026#',
    accessUrl: 'https://chatgpt.com',
    secretText: 'chat.masud99@bitlogic.com.bd | Blgpt@2026#',
    unreadChatCount: 0,
    extraInfo: [
      { label: 'Workspace', value: 'Team Seat #4' },
      { label: 'Devices', value: '1 PC + 1 Mobile' },
    ],
    usageRules: [
      'Do not change the account password.',
      'Select Team Workspace after login.',
    ],
    chatMessages: [
      {
        id: 'm-20',
        sender: 'support',
        senderName: 'Support',
        text: 'ChatGPT Plus seat is active.',
        time: 'Oct 28',
      },
    ],
  },
  {
    id: 'ORD-9844',
    productName: 'Netflix 4K Ultra HD',
    planName: '1 Screen PIN Profile',
    duration: '1 Month',
    date: '2026-10-15',
    expiryDate: '2026-11-15',
    daysRemaining: 11,
    totalDays: 30,
    price: 280,
    paymentMethod: 'bkash',
    trxId: 'BKX77301M',
    status: 'Active',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 11,
    loginEmail: 'netflix.stream2@bdplay.io',
    loginPassword: 'Stream@Bl2026',
    profilePin: '4891',
    accessUrl: 'https://www.netflix.com/login',
    secretText: 'netflix.stream2@bdplay.io | Stream@Bl2026 | PIN: 4891',
    extraInfo: [
      { label: 'Profile', value: 'Profile #3 (Masud)' },
      { label: 'PIN', value: '4891' },
      { label: 'Screens', value: '1 Device' },
    ],
    usageRules: [
      'Use Profile #3 (PIN 4891) only.',
      'Do not modify other profiles or account settings.',
    ],
    chatMessages: [],
  },
  {
    id: 'ORD-9790',
    productName: 'Perplexity Pro',
    planName: 'Private Account',
    duration: '1 Month',
    date: '2026-10-12',
    expiryDate: '2026-11-12',
    daysRemaining: 8,
    totalDays: 30,
    price: 350,
    paymentMethod: 'bkash',
    trxId: 'BKX66210Q',
    status: 'Active',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 8,
    loginEmail: 'pplx.masud@bitlogic.com.bd',
    loginPassword: 'Pplx@2026!',
    accessUrl: 'https://www.perplexity.ai',
    secretText: 'pplx.masud@bitlogic.com.bd | Pplx@2026!',
    extraInfo: [
      { label: 'Models', value: 'Claude 3.5, GPT-4o, Sonar' },
      { label: 'Devices', value: '2 Devices' },
    ],
    usageRules: ['Sign in directly at perplexity.ai.'],
    chatMessages: [],
  },
  {
    id: 'ORD-9715',
    productName: 'Spotify Premium',
    planName: 'Individual Invite',
    duration: '3 Months',
    date: '2026-10-01',
    expiryDate: '2027-01-01',
    daysRemaining: 58,
    totalDays: 90,
    price: 390,
    paymentMethod: 'nagad',
    trxId: 'NGD30192L',
    status: 'Active',
    warrantyLabel: '90D Warranty',
    warrantyDaysLeft: 58,
    loginEmail: 'masud132213@gmail.com',
    accessUrl: 'https://open.spotify.com',
    secretText: 'Family Plan Invite: masud132213@gmail.com',
    extraInfo: [
      { label: 'Plan', value: 'Premium Family Slot' },
      { label: 'Account', value: 'masud132213@gmail.com' },
    ],
    usageRules: ['Keep region matched with the family address provided.'],
    chatMessages: [],
  },
  {
    id: 'ORD-9680',
    productName: 'YouTube Premium',
    planName: 'Personal Gmail Invite',
    duration: '1 Month',
    date: '2026-09-25',
    expiryDate: '2026-10-25',
    daysRemaining: 0,
    totalDays: 30,
    price: 160,
    paymentMethod: 'bkash',
    trxId: 'BKX21094Z',
    status: 'Expired',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 0,
    loginEmail: 'masud132213@gmail.com',
    extraInfo: [{ label: 'Type', value: 'Family Invite' }],
    usageRules: [],
    chatMessages: [],
  },
  {
    id: 'ORD-9610',
    productName: 'Canva Pro',
    planName: 'Team Invite',
    duration: 'Lifetime',
    date: '2026-09-10',
    expiryDate: 'Lifetime',
    price: 99,
    paymentMethod: 'nagad',
    trxId: 'NGD11094B',
    status: 'Delivered',
    warrantyLabel: '1Y Warranty',
    warrantyDaysLeft: 310,
    loginEmail: 'masud132213@gmail.com',
    accessUrl: 'https://www.canva.com',
    secretText: 'Invite active: masud132213@gmail.com',
    extraInfo: [
      { label: 'Team', value: 'Bitlogic Creative' },
      { label: 'Email', value: 'masud132213@gmail.com' },
    ],
    usageRules: ['Switch to Bitlogic Creative from the profile menu.'],
    chatMessages: [],
  },
  {
    id: 'ORD-9540',
    productName: 'CapCut Pro',
    planName: 'Cloud Team Account',
    duration: '1 Month',
    date: '2026-09-02',
    expiryDate: '2026-10-02',
    daysRemaining: 0,
    totalDays: 30,
    price: 220,
    paymentMethod: 'bkash',
    trxId: 'BKX10942M',
    status: 'Expired',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 0,
    loginEmail: 'capcut.pro2@bitlogic.com.bd',
    loginPassword: 'Cc@2026Pro',
    extraInfo: [{ label: 'Platform', value: 'PC + Mobile + Web' }],
    usageRules: [],
    chatMessages: [],
  },
  {
    id: 'ORD-9490',
    productName: 'Grammarly Premium',
    planName: 'Shared Workspace',
    duration: '1 Month',
    date: '2026-08-25',
    expiryDate: '2026-09-25',
    daysRemaining: 0,
    totalDays: 30,
    price: 180,
    paymentMethod: 'nagad',
    trxId: 'NGD88310P',
    status: 'Expired',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 0,
    loginEmail: 'gram.seat8@bitlogic.com.bd',
    loginPassword: 'Gr@2026#',
    extraInfo: [{ label: 'Tier', value: 'Business Member' }],
    usageRules: [],
    chatMessages: [],
  },
  {
    id: 'ORD-9402',
    productName: 'Claude 3.5 Sonnet Pro',
    planName: 'Shared Pro Workspace',
    duration: '1 Month',
    date: '2026-08-19',
    expiryDate: '2026-09-19',
    daysRemaining: 0,
    totalDays: 30,
    price: 420,
    paymentMethod: 'bkash',
    trxId: 'BKX55109C',
    status: 'Refunded',
    warrantyLabel: '25D Warranty',
    warrantyDaysLeft: 0,
    loginEmail: 'claude.pro4@bitlogic.com.bd',
    extraInfo: [
      { label: 'Refund Status', value: 'Full Refund Processed' },
      { label: 'Refund Method', value: 'bKash (BKX55109C)' },
    ],
    usageRules: [],
    chatMessages: [
      {
        id: 'm-9402',
        sender: 'support',
        senderName: 'Support',
        text: 'Full refund of ৳420 has been processed to your bKash account.',
        time: 'Aug 21',
      },
    ],
  },
  {
    id: 'ORD-9318',
    productName: 'Prime Video 4K',
    planName: '1 Screen Profile',
    duration: '6 Months',
    date: '2026-08-05',
    expiryDate: '2027-02-05',
    daysRemaining: 93,
    totalDays: 180,
    price: 450,
    paymentMethod: 'bkash',
    trxId: 'BKX44012V',
    status: 'Active',
    warrantyLabel: '180D Warranty',
    warrantyDaysLeft: 93,
    loginEmail: 'prime.bd4@bitlogic.com.bd',
    loginPassword: 'Pv@2026#',
    profilePin: '2049',
    accessUrl: 'https://www.primevideo.com',
    extraInfo: [
      { label: 'Profile', value: 'Profile #2' },
      { label: 'PIN', value: '2049' },
    ],
    usageRules: ['Sign in and select Profile #2.'],
    chatMessages: [],
  },
];

const INITIAL_TICKETS: SupportTicketItem[] = [
  {
    id: 'TKT-4092',
    subject: 'Coursera Plus activation email',
    orderId: 'ORD-9995',
    category: 'Access & Delivery',
    priority: 'High',
    status: 'Answered',
    updatedAt: '10:19 AM',
    messages: [
      {
        id: 'tm-1',
        sender: 'customer',
        senderName: 'Masud Ahmed',
        text: 'Please activate ORD-9995 on masud132213@gmail.com.',
        time: '10:16 AM',
      },
      {
        id: 'tm-2',
        sender: 'support',
        senderName: 'Support',
        text: 'Queued for masud132213@gmail.com. Delivery takes 10–24 hours.',
        time: '10:19 AM',
      },
    ],
  },
  {
    id: 'TKT-3810',
    subject: 'Netflix TV verification code',
    orderId: 'ORD-9844',
    category: 'Login / Credentials',
    priority: 'Normal',
    status: 'Closed',
    updatedAt: 'Oct 20',
    messages: [
      {
        id: 'tm-3',
        sender: 'customer',
        senderName: 'Masud Ahmed',
        text: 'Need the household verification code for Smart TV.',
        time: 'Oct 20',
      },
      {
        id: 'tm-4',
        sender: 'support',
        senderName: 'Support',
        text: 'Code: 7741 (valid 15m).',
        time: 'Oct 20',
      },
    ],
  },
];

const INITIAL_WARRANTY_CLAIMS: WarrantyClaimItem[] = [
  {
    id: 'WRN-204',
    orderId: 'ORD-9844',
    productName: 'Netflix 4K Ultra HD',
    planName: '1 Screen PIN Profile',
    issueType: 'Profile PIN',
    description: 'Profile #3 PIN was reset and updated in credentials.',
    date: '2026-10-18',
    status: 'Resolved',
  },
  {
    id: 'WRN-189',
    orderId: 'ORD-9921',
    productName: 'ChatGPT Plus',
    planName: 'Private Mail Access',
    issueType: 'Login / Password',
    description: 'Workspace invitation re-sent to account email.',
    date: '2026-10-29',
    status: 'Resolved',
  },
  {
    id: 'WRN-162',
    orderId: 'ORD-9715',
    productName: 'Spotify Premium',
    planName: 'Individual Invite',
    issueType: 'Deactivated Early',
    description: 'Family slot renewed and re-linked to account.',
    date: '2026-10-09',
    status: 'Resolved',
  },
  {
    id: 'WRN-145',
    orderId: 'ORD-9318',
    productName: 'Prime Video 4K',
    planName: '1 Screen Profile',
    issueType: '2FA / OTP Code',
    description: 'Sent login OTP code for new TV sign-in.',
    date: '2026-09-14',
    status: 'Resolved',
  },
];

const INITIAL_NOTIFICATIONS: AccountNotificationItem[] = [
  {
    id: 'notif-1',
    type: 'order_chat',
    orderId: 'ORD-9995',
    title: 'Coursera Plus Annual',
    message:
      'Confirmed! Your Coursera Plus invite is now at the top of the batch queue.',
    time: '10:22 AM',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'order_chat',
    orderId: 'ORD-9982',
    title: 'Gemini Advanced',
    message:
      'Credentials delivered for Gemini Advanced 18M + 2TB. Backup code 8492-1104 is attached.',
    time: 'Nov 02',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'ticket',
    ticketId: 'TKT-4092',
    orderId: 'ORD-9995',
    title: 'Ticket TKT-4092 replied',
    message: 'Queued for masud132213@gmail.com. Delivery takes 10–24 hours.',
    time: '10:19 AM',
    read: true,
  },
  {
    id: 'notif-4',
    type: 'order_chat',
    orderId: 'ORD-9921',
    title: 'ChatGPT Plus',
    message: 'ChatGPT Plus Team Workspace seat #4 is now active.',
    time: 'Oct 28',
    read: true,
  },
  {
    id: 'notif-5',
    type: 'warranty',
    orderId: 'ORD-9844',
    title: 'Warranty WRN-204 resolved',
    message: 'Profile #3 PIN was reset to 4891 and updated in credentials.',
    time: 'Oct 18',
    read: true,
  },
  {
    id: 'notif-6',
    type: 'ticket',
    ticketId: 'TKT-3810',
    orderId: 'ORD-9844',
    title: 'Ticket TKT-3810 closed',
    message: 'Household verification code 7741 delivered.',
    time: 'Oct 20',
    read: true,
  },
  {
    id: 'notif-7',
    type: 'order_chat',
    orderId: 'ORD-9715',
    title: 'Spotify Premium',
    message: 'Family Plan invite active on masud132213@gmail.com.',
    time: 'Oct 01',
    read: true,
  },
];

const MAX_NOTIFICATIONS_SHOWN = 7;

const ISSUE_TYPES = [
  'Login / Password',
  'Deactivated Early',
  'Profile PIN',
  '2FA / OTP Code',
  'Other',
];

const ORDERS_PER_PAGE = 10;
const TICKETS_PER_PAGE = 10;
const CLAIMS_PER_PAGE = 10;

export function AccountPageView() {
  const { accountTab, navigateTo } = useStoreNav();
  const storedSession = useCustomerSession();
  const session = storedSession || {
    name: 'Masud Ahmed',
    email: 'masud132213@gmail.com',
    phone: '01712345678',
  };

  const initialTab: AccountTab =
    accountTab === 'credentials' || accountTab === 'library'
      ? 'orders'
      : accountTab || 'overview';

  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Orders & Access View State
  const [orders, setOrders] = useState<CustomerOrderItem[]>(INITIAL_ORDERS);
  const [selectedAccessOrderId, setSelectedAccessOrderId] = useState<
    string | null
  >(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<
    | 'ALL'
    | 'UNREAD_CHAT'
    | 'Active'
    | 'Pending (10–24h)'
    | 'Delivered'
    | 'Expired'
    | 'Refunded'
  >('ALL');
  const [orderPage, setOrderPage] = useState(1);

  // Notifications & Live Toast State
  const [notifications, setNotifications] = useState<AccountNotificationItem[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [liveToast, setLiveToast] = useState<{
    id: string;
    orderId: string;
    title: string;
    message: string;
  } | null>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const activeOrderViewRef = useRef<{ tab: AccountTab; orderId: string | null }>({
    tab: activeTab,
    orderId: selectedAccessOrderId,
  });

  useEffect(() => {
    activeOrderViewRef.current = {
      tab: activeTab,
      orderId: selectedAccessOrderId,
    };
  }, [activeTab, selectedAccessOrderId]);

  useEffect(() => {
    if (!liveToast) return;
    const timer = window.setTimeout(() => {
      setLiveToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [liveToast]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Only orders with active warranty (> 0 days remaining) can be claimed
  const warrantyEligibleOrders = useMemo(
    () => orders.filter((o) => (o.warrantyDaysLeft ?? 0) > 0),
    [orders],
  );

  // Warranty State & Modal
  const [claims, setClaims] = useState<WarrantyClaimItem[]>(
    INITIAL_WARRANTY_CLAIMS,
  );
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [claimOrderId, setClaimOrderId] = useState<string>(
    INITIAL_ORDERS[1].id,
  );
  const [claimIssueType, setClaimIssueType] = useState<string>(ISSUE_TYPES[0]);
  const [claimDescription, setClaimDescription] = useState<string>('');
  const [claimError, setClaimError] = useState<string>('');
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimFilter, setClaimFilter] = useState<
    'ALL' | 'In Review' | 'Resolved'
  >('ALL');
  const [claimPage, setClaimPage] = useState(1);

  // Tickets State
  const [tickets, setTickets] = useState<SupportTicketItem[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<
    'ALL' | 'Open' | 'Answered' | 'Closed'
  >('ALL');
  const [ticketPage, setTicketPage] = useState(1);

  // New Ticket & Reply Form State
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketOrderId, setNewTicketOrderId] = useState(INITIAL_ORDERS[0].id);
  const [newTicketCategory, setNewTicketCategory] = useState(
    'Access & Delivery',
  );
  const [newTicketPriority, setNewTicketPriority] = useState<
    'Normal' | 'High' | 'Urgent'
  >('Normal');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketAttachment, setNewTicketAttachment] =
    useState<ChatAttachment | null>(null);
  const [newTicketFileError, setNewTicketFileError] = useState('');
  const newTicketFileRef = useRef<HTMLInputElement>(null);

  const [ticketReplyDraft, setTicketReplyDraft] = useState('');
  const [ticketReplyingTo, setTicketReplyingTo] =
    useState<SupportTicketMessage | null>(null);
  const [ticketReplyAttachment, setTicketReplyAttachment] =
    useState<ChatAttachment | null>(null);
  const [ticketReplyFileError, setTicketReplyFileError] = useState('');
  const ticketReplyFileRef = useRef<HTMLInputElement>(null);
  const ticketReplyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Profile State
  const [profileName, setProfileName] = useState(session.name || 'Masud Ahmed');
  const [profilePhone, setProfilePhone] = useState(
    (session.phone || '01712345678').replace(/[-\s]/g, ''),
  );
  const [recoveryEmail, setRecoveryEmail] = useState('masud.backup@gmail.com');
  const [telegramHandle, setTelegramHandle] = useState('@masud_bd');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Notification Toggles
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyExpiry, setNotifyExpiry] = useState(true);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // still clear local session
    }
    clearCustomer();
    navigateTo('home');
  };

  // Opens an order's Access & Chat page and clears its unread chat notifications
  const openOrderAccess = (orderId: string) => {
    setSelectedAccessOrderId(orderId);
    setActiveTab('orders');
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, unreadChatCount: 0 } : o)),
    );
    setNotifications((prev) =>
      prev.map((n) => (n.orderId === orderId ? { ...n, read: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setOrders((prev) => prev.map((o) => ({ ...o, unreadChatCount: 0 })));
  };

  const pushIncomingOrderMessage = (
    orderId: string,
    replyText: string,
    currentlyViewingThisOrder: boolean,
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const productName = targetOrder?.productName || 'Order';

    const supportMsg: OrderChatMessage = {
      id: `msg-sup-${Date.now()}`,
      sender: 'support',
      senderName: 'Support',
      text: replyText,
      time: 'Just now',
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              unreadChatCount: currentlyViewingThisOrder
                ? 0
                : (o.unreadChatCount ?? 0) + 1,
              chatMessages: [...(o.chatMessages || []), supportMsg],
            }
          : o,
      ),
    );

    const newNotif: AccountNotificationItem = {
      id: `notif-${Date.now()}`,
      type: 'order_chat',
      orderId,
      title: productName,
      message: replyText,
      time: 'Just now',
      read: currentlyViewingThisOrder,
    };

    setNotifications((prev) => [newNotif, ...prev].slice(0, 15));

    setLiveToast({
      id: newNotif.id,
      orderId,
      title: `New message · ${orderId}`,
      message: replyText,
    });
  };

  const openWarrantyClaimModal = (orderId?: string) => {
    const target = orderId
      ? warrantyEligibleOrders.find((o) => o.id === orderId)
      : warrantyEligibleOrders[0];
    if (target) {
      setClaimOrderId(target.id);
    } else if (warrantyEligibleOrders[0]) {
      setClaimOrderId(warrantyEligibleOrders[0].id);
    }
    setClaimError('');
    setWarrantyModalOpen(true);
  };

  const handleSendOrderChatMessage = (
    orderId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: ChatAttachment;
    },
  ) => {
    const newMsg: OrderChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'customer',
      senderName: 'You',
      text: payload.text,
      time: 'Just now',
      replyTo: payload.replyTo,
      attachment: payload.attachment,
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              unreadChatCount: 0,
              chatMessages: [...(o.chatMessages || []), newMsg],
            }
          : o,
      ),
    );

    // Simulated live support response after 2.2 seconds
    setTimeout(() => {
      const isStillViewingOrder =
        activeOrderViewRef.current.tab === 'orders' &&
        activeOrderViewRef.current.orderId === orderId;
      pushIncomingOrderMessage(
        orderId,
        `Received your message on ${orderId}. Checking this right now.`,
        isStillViewingOrder,
      );
    }, 2200);
  };

  const parseFileUpload = (
    file: File | undefined,
    onValid: (att: ChatAttachment) => void,
    onError: (msg: string) => void,
  ) => {
    onError('');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      onError('Maximum file size is 5MB.');
      return;
    }
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      onError('Only images and PDF files are supported.');
      return;
    }
    const url = URL.createObjectURL(file);
    onValid({
      id: `att-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: isPdf ? 'pdf' : 'image',
      url,
    });
  };

  // All orders for support tickets
  const allOrderSelectOptions: SearchableSelectOption[] = useMemo(
    () =>
      orders.map((o) => ({
        value: o.id,
        label: o.productName,
        sublabel: `${o.planName} · ${o.duration}`,
        badge: o.status,
      })),
    [orders],
  );

  // Only active-warranty orders for Warranty Claim Modal
  const warrantyOrderSelectOptions: SearchableSelectOption[] = useMemo(
    () =>
      warrantyEligibleOrders.map((o) => ({
        value: o.id,
        label: o.productName,
        sublabel: `${o.planName} · ${o.duration}`,
        badge: `${o.warrantyDaysLeft}d left`,
        badgeTone: 'emerald',
      })),
    [warrantyEligibleOrders],
  );

  const selectedClaimOrder = useMemo(
    () =>
      warrantyEligibleOrders.find((o) => o.id === claimOrderId) ||
      warrantyEligibleOrders[0],
    [warrantyEligibleOrders, claimOrderId],
  );

  const unreadChatOrdersCount = useMemo(
    () => orders.filter((o) => (o.unreadChatCount ?? 0) > 0).length,
    [orders],
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Filtered + Paginated Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === 'UNREAD_CHAT') {
        if ((o.unreadChatCount ?? 0) <= 0) return false;
      } else if (orderFilter !== 'ALL' && o.status !== orderFilter) {
        return false;
      }
      const q = orderSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.planName.toLowerCase().includes(q) ||
        o.trxId.toLowerCase().includes(q) ||
        (o.loginEmail && o.loginEmail.toLowerCase().includes(q))
      );
    });
  }, [orders, orderFilter, orderSearch]);

  const totalOrderPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );
  const currentOrderPage = Math.min(orderPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice(
    (currentOrderPage - 1) * ORDERS_PER_PAGE,
    currentOrderPage * ORDERS_PER_PAGE,
  );

  // Filtered + Paginated Warranty Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (claimFilter !== 'ALL' && c.status !== claimFilter) return false;
      const q = claimSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.orderId.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.planName.toLowerCase().includes(q) ||
        c.issueType.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [claims, claimFilter, claimSearch]);

  const totalClaimPages = Math.max(
    1,
    Math.ceil(filteredClaims.length / CLAIMS_PER_PAGE),
  );
  const currentClaimPage = Math.min(claimPage, totalClaimPages);
  const paginatedClaims = filteredClaims.slice(
    (currentClaimPage - 1) * CLAIMS_PER_PAGE,
    currentClaimPage * CLAIMS_PER_PAGE,
  );

  // Filtered + Paginated Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketFilter !== 'ALL' && t.status !== ticketFilter) return false;
      const q = ticketSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.orderId.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketFilter, ticketSearch]);

  const totalTicketPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / TICKETS_PER_PAGE),
  );
  const currentTicketPage = Math.min(ticketPage, totalTicketPages);
  const paginatedTickets = filteredTickets.slice(
    (currentTicketPage - 1) * TICKETS_PER_PAGE,
    currentTicketPage * TICKETS_PER_PAGE,
  );

  // Profile Validations
  const cleanPhone = profilePhone.replace(/[-\s]/g, '');
  const isPhoneValid = /^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone);
  const phoneError =
    profilePhone.length > 0 && !isPhoneValid
      ? 'Invalid BD phone number (01XXXXXXXXX)'
      : '';

  const isRecoveryEmailValid =
    recoveryEmail.trim() === '' ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim());
  const recoveryEmailError = !isRecoveryEmailValid
    ? 'Invalid email address'
    : '';

  const isNameValid = profileName.trim().length >= 3;
  const nameError =
    profileName.length > 0 && !isNameValid ? 'Minimum 3 characters' : '';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid || !isPhoneValid || !isRecoveryEmailValid) return;
    writeCustomer({
      name: profileName.trim(),
      email: session.email,
      phone: cleanPhone,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Enter current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Minimum 8 characters required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const handleSubmitWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimOrder || (selectedClaimOrder.warrantyDaysLeft ?? 0) <= 0) {
      setClaimError('Selected order does not have active warranty.');
      return;
    }
    if (claimDescription.trim().length < 5) {
      setClaimError('Describe the issue');
      return;
    }
    setClaimError('');
    const newClaim: WarrantyClaimItem = {
      id: `WRN-${Math.floor(300 + Math.random() * 600)}`,
      orderId: selectedClaimOrder.id,
      productName: selectedClaimOrder.productName,
      planName: selectedClaimOrder.planName,
      issueType: claimIssueType,
      description: claimDescription.trim(),
      date: '2026-11-04',
      status: 'In Review',
    };
    setClaims((prev) => [newClaim, ...prev]);
    setClaimDescription('');
    setClaimPage(1);
    setWarrantyModalOpen(false);
    setClaimSuccess(
      `Claim ${newClaim.id} submitted for ${selectedClaimOrder.id}.`,
    );
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTicketSubject.trim() ||
      (!newTicketMessage.trim() && !newTicketAttachment)
    )
      return;
    const created: SupportTicketItem = {
      id: `TKT-${Math.floor(5000 + Math.random() * 4000)}`,
      subject: newTicketSubject.trim(),
      orderId: newTicketOrderId,
      category: newTicketCategory,
      priority: newTicketPriority,
      status: 'Open',
      updatedAt: 'Just now',
      messages: [
        {
          id: `tm-${Date.now()}`,
          sender: 'customer',
          senderName: session.name,
          text: newTicketMessage.trim(),
          time: 'Just now',
          attachment: newTicketAttachment || undefined,
        },
      ],
    };
    setTickets((prev) => [created, ...prev]);
    setNewTicketSubject('');
    setNewTicketMessage('');
    setNewTicketAttachment(null);
    setCreatingTicket(false);
    setSelectedTicketId(created.id);
  };

  const submitTicketReply = () => {
    if (
      !selectedTicketId ||
      (!ticketReplyDraft.trim() && !ticketReplyAttachment)
    )
      return;
    const replyMsg: SupportTicketMessage = {
      id: `tm-${Date.now()}`,
      sender: 'customer',
      senderName: session.name,
      text: ticketReplyDraft.trim(),
      time: 'Just now',
      replyTo: ticketReplyingTo
        ? {
            id: ticketReplyingTo.id,
            senderName: ticketReplyingTo.senderName,
            text:
              ticketReplyingTo.text ||
              ticketReplyingTo.attachment?.name ||
              '',
          }
        : undefined,
      attachment: ticketReplyAttachment || undefined,
    };
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicketId
          ? {
              ...t,
              status: 'Open',
              updatedAt: 'Just now',
              messages: [...t.messages, replyMsg],
            }
          : t,
      ),
    );
    setTicketReplyDraft('');
    setTicketReplyingTo(null);
    setTicketReplyAttachment(null);
    setTicketReplyFileError('');
    if (ticketReplyTextareaRef.current) {
      ticketReplyTextareaRef.current.style.height = '36px';
    }
  };

  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    submitTicketReply();
  };

  const totalSpent = orders.reduce((sum, o) => sum + o.price, 0);
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'Active' || o.status === 'Delivered',
  ).length;
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Pending (10–24h)',
  ).length;
  const openTicketsCount = tickets.filter((t) => t.status !== 'Closed').length;

  const selectedAccessOrder = orders.find(
    (o) => o.id === selectedAccessOrderId,
  );
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const navItems: Array<{
    id: AccountTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    count?: number;
    unreadBadge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      count: orders.length,
      unreadBadge: unreadChatOrdersCount,
    },
    {
      id: 'warranty',
      label: 'Warranty',
      icon: ShieldAlert,
      count: claims.length,
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: Ticket,
      count: openTicketsCount,
    },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-dvh flex bg-[#f6f8fa] text-slate-900 font-sans">
      {/* Top-Positioned Sonner/Shadcn Style Toast Notification */}
      {liveToast && (
        <div className="fixed top-3.5 inset-x-3 sm:inset-x-auto sm:right-4 z-50 sm:w-[360px] bg-white text-slate-900 rounded-md border border-slate-200/95 shadow-[0_10px_28px_-6px_rgba(15,23,42,0.12)] px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
              <MessageSquare size={13} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {liveToast.title}
              </div>
              <p className="text-xs font-medium text-slate-600 m-0 truncate">
                {liveToast.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!(
              activeTab === 'orders' &&
              selectedAccessOrderId === liveToast.orderId
            ) && (
              <button
                type="button"
                onClick={() => {
                  openOrderAccess(liveToast.orderId);
                  setLiveToast(null);
                }}
                className="h-7 px-2.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-[11px] font-bold cursor-pointer transition-colors"
              >
                View
              </button>
            )}
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="p-1 text-slate-400 hover:text-slate-900 bg-transparent border-0 cursor-pointer rounded"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Warranty Claim Modal */}
      {warrantyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
          onClick={() => setWarrantyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 m-0">
                New Warranty Claim
              </h2>
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded bg-transparent border-0 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitWarranty} className="p-5 space-y-4">
              <StoreSearchableSelect
                label="Order (Active Warranty)"
                required
                options={warrantyOrderSelectOptions}
                value={claimOrderId}
                onChange={setClaimOrderId}
              />

              {selectedClaimOrder && (
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {selectedClaimOrder.productName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-bold text-slate-700 tabular-nums">
                        {selectedClaimOrder.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <DurationBadge>
                        {selectedClaimOrder.duration}
                      </DurationBadge>
                      <WarrantyBadge
                        label={`${selectedClaimOrder.warrantyDaysLeft}d warranty left`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-600 font-semibold">
                        Plan:{' '}
                      </span>
                      <span className="text-slate-900 font-bold">
                        {selectedClaimOrder.planName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-semibold">
                        Ordered:{' '}
                      </span>
                      <span className="text-slate-900 font-bold tabular-nums">
                        {selectedClaimOrder.date}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Issue Type <span className="text-[#FF5E5B]">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ISSUE_TYPES.map((type) => {
                    const active = claimIssueType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setClaimIssueType(type)}
                        className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <StoreTextareaField
                label="Description"
                required
                rows={3}
                value={claimDescription}
                onChange={(e) => {
                  setClaimDescription(e.target.value);
                  if (claimError) setClaimError('');
                }}
                error={claimError}
                placeholder="Describe the login, PIN, or access issue..."
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <StoreButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWarrantyModalOpen(false)}
                >
                  <X size={13} />
                  <span>Cancel</span>
                </StoreButton>
                <StoreButton type="submit" variant="dark" size="sm">
                  <Check size={13} />
                  <span>Submit Claim</span>
                </StoreButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`${
          drawerOpen
            ? 'fixed inset-y-0 left-0 z-50 flex shadow-xl'
            : 'hidden'
        } lg:sticky lg:top-0 lg:h-dvh lg:flex w-60 shrink-0 bg-white border-r border-slate-200 flex-col justify-between select-none`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Signature Brand Logo (Matches Storefront Header) */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateTo('home', { code: 'ALL' })}
              className="flex items-center gap-2 cursor-pointer border-0 bg-transparent p-0 shrink-0"
              aria-label="Bitlogic home"
            >
              <span className="w-8 h-8 rounded-xl bg-[#FF5E5B] text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-[#FF5E5B]/25 rotate-[-4deg] shrink-0">
                B
              </span>
              <span className="font-display font-extrabold text-lg tracking-tight text-[#0F172A] whitespace-nowrap">
                Bit<span className="text-[#FF5E5B]">logic</span>
              </span>
            </button>

            {drawerOpen && (
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="lg:hidden p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer border-0 bg-transparent"
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* User Summary */}
          <div className="px-2.5 py-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {profileName ? profileName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {profileName}
              </div>
              <div className="text-[11px] font-medium text-slate-600 truncate">
                {session.email}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1" aria-label="Account navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedAccessOrderId(null);
                    setSelectedTicketId(null);
                    setCreatingTicket(false);
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors cursor-pointer border-0 ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'bg-transparent text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      size={15}
                      className={active ? 'text-[#FF5E5B]' : 'text-slate-400'}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {typeof item.unreadBadge === 'number' &&
                      item.unreadBadge > 0 && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#FF5E5B]"
                          title={`${item.unreadBadge} unread chat`}
                        />
                      )}
                    {typeof item.count === 'number' && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-700 tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Switchers */}
        <div className="p-4 space-y-2 border-t border-slate-200">
          <StoreButton
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => navigateTo('home', { code: 'ALL' })}
          >
            <ShoppingBag size={13} />
            <span>Storefront</span>
          </StoreButton>

          <StoreButton
            variant="soft-red"
            size="sm"
            fullWidth
            onClick={handleLogout}
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </StoreButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Desktop & Mobile) with Clean Notification Icon & Popover */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-13 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded border border-slate-200 text-slate-900 bg-white cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <Menu size={15} />
            </button>
            <span className="text-sm font-bold text-slate-900 truncate">
              {selectedAccessOrder
                ? `Order ${selectedAccessOrder.id}`
                : navItems.find((i) => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2" ref={notifDropdownRef}>
            {/* Clean Component-Library Notification Bell Button & Responsive Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative w-9 h-9 rounded border transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs ${
                  notifOpen
                    ? 'border-slate-400 bg-slate-100 text-slate-900'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5E5B] text-white text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-white tabular-nums">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] bg-white rounded-md border border-slate-200 shadow-xl z-50 overflow-hidden">
                  {/* Clean Popover Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Notifications
                      </span>
                      <div className="inline-flex items-center rounded bg-slate-100 p-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setNotifFilter('ALL')}
                          className={`px-2 py-0.5 rounded-xs cursor-pointer border-0 transition-colors ${
                            notifFilter === 'ALL'
                              ? 'bg-white text-slate-900 font-bold shadow-2xs'
                              : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifFilter('UNREAD')}
                          className={`px-2 py-0.5 rounded-xs cursor-pointer border-0 transition-colors ${
                            notifFilter === 'UNREAD'
                              ? 'bg-white text-slate-900 font-bold shadow-2xs'
                              : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Unread ({unreadNotificationsCount})
                        </button>
                      </div>
                    </div>

                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0 whitespace-nowrap"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Latest 7 Notifications List */}
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                    {(() => {
                      const visibleNotifications = notifications
                        .filter((n) =>
                          notifFilter === 'UNREAD' ? !n.read : true,
                        )
                        .slice(0, MAX_NOTIFICATIONS_SHOWN);

                      if (visibleNotifications.length === 0) {
                        return (
                          <div className="py-8 px-4 text-center text-xs font-medium text-slate-500">
                            {notifFilter === 'UNREAD'
                              ? 'No unread notifications.'
                              : 'No notifications yet.'}
                          </div>
                        );
                      }

                      return visibleNotifications.map((n) => {
                        const refCode = n.orderId || n.ticketId;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifications((prev) =>
                                prev.map((item) =>
                                  item.id === n.id
                                    ? { ...item, read: true }
                                    : item,
                                ),
                              );
                              setNotifOpen(false);
                              if (n.type === 'order_chat' && n.orderId) {
                                openOrderAccess(n.orderId);
                              } else if (n.type === 'ticket' && n.ticketId) {
                                setActiveTab('tickets');
                                setSelectedTicketId(n.ticketId);
                              } else if (n.type === 'warranty') {
                                setActiveTab('warranty');
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 border-0 cursor-pointer transition-colors ${
                              !n.read
                                ? 'bg-slate-50/90 hover:bg-slate-100/80'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                !n.read ? 'bg-[#FF5E5B]' : 'bg-slate-300'
                              }`}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-xs truncate ${
                                    !n.read
                                      ? 'font-bold text-slate-900'
                                      : 'font-semibold text-slate-800'
                                  }`}
                                >
                                  {n.title}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap tabular-nums shrink-0">
                                  {n.time}
                                </span>
                              </div>

                              <p className="text-xs font-medium text-slate-600 m-0 mt-0.5 truncate">
                                {refCode && (
                                  <span className="font-semibold text-slate-700 tabular-nums">
                                    {refCode} ·{' '}
                                  </span>
                                )}
                                {n.message}
                              </p>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Popover Footer */}
                  <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-500">
                      Latest {MAX_NOTIFICATIONS_SHOWN} updates
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab('orders');
                        setSelectedAccessOrderId(null);
                      }}
                      className="text-[11px] font-bold text-slate-800 hover:text-[#FF5E5B] bg-transparent border-0 cursor-pointer p-0"
                    >
                      All Orders →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:hidden flex items-center gap-1.5">
              <StoreButton
                variant="outline"
                size="sm"
                onClick={() => navigateTo('home', { code: 'ALL' })}
              >
                <ShoppingBag size={12} />
                <span>Store</span>
              </StoreButton>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1040px] w-full mx-auto space-y-6">
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-lg font-bold text-slate-900 m-0">
                  Overview
                </h1>

                <div className="flex items-center gap-2">
                  <StoreButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('tickets');
                      setCreatingTicket(true);
                    }}
                  >
                    <Plus size={13} />
                    <span>New Ticket</span>
                  </StoreButton>
                  <StoreButton
                    variant="dark"
                    size="sm"
                    onClick={() => {
                      setActiveTab('orders');
                      setSelectedAccessOrderId(null);
                    }}
                  >
                    <Package size={13} />
                    <span>Orders</span>
                  </StoreButton>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StoreStatCard
                  label="Active Access"
                  value={activeOrdersCount}
                  badge="Active"
                  tone="emerald"
                />
                <StoreStatCard
                  label="Pending (10–24h)"
                  value={pendingOrdersCount}
                  badge="Queue"
                  tone="amber"
                />
                <StoreStatCard
                  label="Unread Messages"
                  value={unreadChatOrdersCount}
                  badge={unreadChatOrdersCount > 0 ? 'New Chat' : 'All Read'}
                  tone={unreadChatOrdersCount > 0 ? 'coral' : 'slate'}
                />
                <StoreStatCard
                  label="Total Spent"
                  value={formatPrice(totalSpent)}
                  badge={`${orders.length} Orders`}
                  tone="slate"
                />
              </div>

              {/* Recent Orders */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 m-0">
                    Recent Orders
                  </h2>
                  <StoreButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('orders');
                      setSelectedAccessOrderId(null);
                    }}
                  >
                    <span>View all ({orders.length})</span>
                    <ArrowUpRight size={13} />
                  </StoreButton>
                </div>

                <StoreSurfaceCard
                  padded={false}
                  className="divide-y divide-slate-200 overflow-hidden"
                >
                  {orders.slice(0, 5).map((order) => (
                    <OrderRowCard
                      key={order.id}
                      order={order}
                      onOpenAccess={openOrderAccess}
                    />
                  ))}
                </StoreSurfaceCard>
              </div>
            </div>
          )}

          {/* 2. ORDERS (10 per page + Search + Unread Chat Filter + Dedicated Access View) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {selectedAccessOrder ? (
                <OrderAccessDetailView
                  order={selectedAccessOrder}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onBack={() => setSelectedAccessOrderId(null)}
                  onClaimWarranty={(ordId) => {
                    setActiveTab('warranty');
                    openWarrantyClaimModal(ordId);
                  }}
                  messages={selectedAccessOrder.chatMessages || []}
                  onSendMessage={handleSendOrderChatMessage}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="text-lg font-bold text-slate-900 m-0">
                      Orders
                    </h1>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {orders.length} total
                    </span>
                  </div>

                  <StoreSearchBar
                    value={orderSearch}
                    onChange={(val) => {
                      setOrderSearch(val);
                      setOrderPage(1);
                    }}
                    placeholder="Search by Order ID, product, plan, or TrxID..."
                    filters={[
                      { id: 'ALL', label: 'All', count: orders.length },
                      {
                        id: 'UNREAD_CHAT',
                        label: 'Unread Chat',
                        count: unreadChatOrdersCount,
                      },
                      {
                        id: 'Active',
                        label: 'Active',
                        count: orders.filter((o) => o.status === 'Active')
                          .length,
                      },
                      {
                        id: 'Pending (10–24h)',
                        label: 'Pending',
                        count: pendingOrdersCount,
                      },
                      {
                        id: 'Delivered',
                        label: 'Delivered',
                        count: orders.filter((o) => o.status === 'Delivered')
                          .length,
                      },
                      {
                        id: 'Expired',
                        label: 'Expired',
                        count: orders.filter((o) => o.status === 'Expired')
                          .length,
                      },
                      {
                        id: 'Refunded',
                        label: 'Refunded',
                        count: orders.filter((o) => o.status === 'Refunded')
                          .length,
                      },
                    ]}
                    activeFilter={orderFilter}
                    onFilterChange={(f) => {
                      setOrderFilter(f);
                      setOrderPage(1);
                    }}
                  />

                  {paginatedOrders.length === 0 ? (
                    <StoreSurfaceCard className="p-8 text-center text-xs font-semibold text-slate-600">
                      No matching orders found.
                    </StoreSurfaceCard>
                  ) : (
                    <StoreSurfaceCard
                      padded={false}
                      className="divide-y divide-slate-200 overflow-hidden"
                    >
                      {paginatedOrders.map((order) => (
                        <OrderRowCard
                          key={order.id}
                          order={order}
                          onOpenAccess={openOrderAccess}
                        />
                      ))}
                    </StoreSurfaceCard>
                  )}

                  <StorePagination
                    currentPage={currentOrderPage}
                    totalPages={totalOrderPages}
                    totalItems={filteredOrders.length}
                    pageSize={ORDERS_PER_PAGE}
                    onPageChange={setOrderPage}
                  />
                </>
              )}
            </div>
          )}

          {/* 3. WARRANTY (Mobile Responsive Cards + Desktop Table + Claim Modal) */}
          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h1 className="text-lg font-bold text-slate-900 m-0">
                  Warranty
                </h1>

                <div className="flex items-center gap-2">
                  <a
                    href="https://wa.me/8801700123456"
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-xs inline-flex items-center gap-1.5 no-underline transition-colors shadow-2xs"
                  >
                    <WhatsAppIcon size={13} />
                    <span>WhatsApp</span>
                  </a>

                  <StoreButton
                    variant="dark"
                    size="sm"
                    onClick={() => openWarrantyClaimModal()}
                  >
                    <Plus size={13} />
                    <span>Claim Warranty</span>
                  </StoreButton>
                </div>
              </div>

              {claimSuccess && (
                <div className="px-3.5 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                  <span>{claimSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setClaimSuccess(null)}
                    className="text-xs font-bold underline bg-transparent border-0 text-emerald-900 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <StoreSearchBar
                value={claimSearch}
                onChange={(val) => {
                  setClaimSearch(val);
                  setClaimPage(1);
                }}
                placeholder="Search claims by ID, Order ID, product, or issue..."
                filters={[
                  { id: 'ALL', label: 'All', count: claims.length },
                  {
                    id: 'In Review',
                    label: 'In Review',
                    count: claims.filter((c) => c.status === 'In Review')
                      .length,
                  },
                  {
                    id: 'Resolved',
                    label: 'Resolved',
                    count: claims.filter((c) => c.status === 'Resolved').length,
                  },
                ]}
                activeFilter={claimFilter}
                onFilterChange={(f) => {
                  setClaimFilter(f);
                  setClaimPage(1);
                }}
              />

              <StoreSurfaceCard padded={false} className="overflow-hidden">
                {paginatedClaims.length === 0 ? (
                  <div className="py-8 px-4 text-center text-xs font-semibold text-slate-500">
                    No warranty claims found.
                  </div>
                ) : (
                  <>
                    {/* Mobile Responsive Stacked Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {paginatedClaims.map((claim) => {
                        const issueTone =
                          claim.issueType === 'Deactivated Early'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : claim.issueType === 'Login / Password'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : claim.issueType === 'Profile PIN'
                                ? 'bg-violet-50 text-violet-700 border-violet-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200';
                        return (
                          <div key={claim.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {claim.productName}
                                  </span>
                                  <StatusBadge
                                    tone={
                                      claim.status === 'Resolved'
                                        ? 'emerald'
                                        : 'amber'
                                    }
                                  >
                                    {claim.status}
                                  </StatusBadge>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-medium text-slate-600 tabular-nums">
                                  <span className="font-bold text-slate-800">
                                    {claim.id}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span>{claim.planName}</span>
                                  <span className="text-slate-300">·</span>
                                  <span>{claim.date}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openOrderAccess(claim.orderId)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 inline-flex items-center gap-1 cursor-pointer tabular-nums shrink-0"
                              >
                                <span>{claim.orderId}</span>
                                <ArrowUpRight size={11} />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${issueTone}`}
                              >
                                {claim.issueType}
                              </span>
                              <span className="text-xs font-medium text-slate-600">
                                {claim.description}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Claim ID</th>
                            <th className="py-2.5 px-4">Order</th>
                            <th className="py-2.5 px-4">Product & Plan</th>
                            <th className="py-2.5 px-4">Issue</th>
                            <th className="py-2.5 px-4">Description</th>
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {paginatedClaims.map((claim) => {
                            const issueTone =
                              claim.issueType === 'Deactivated Early'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : claim.issueType === 'Login / Password'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : claim.issueType === 'Profile PIN'
                                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200';
                            return (
                              <tr
                                key={claim.id}
                                className="hover:bg-slate-50/70 transition-colors"
                              >
                                <td className="py-3 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                  {claim.id}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openOrderAccess(claim.orderId)
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-800 inline-flex items-center gap-1 cursor-pointer tabular-nums"
                                  >
                                    <span>{claim.orderId}</span>
                                    <ArrowUpRight size={11} />
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">
                                    {claim.productName}
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    {claim.planName}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded border font-semibold ${issueTone}`}
                                  >
                                    {claim.issueType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700 max-w-[260px]">
                                  {claim.description}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                                  {claim.date}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <StatusBadge
                                    tone={
                                      claim.status === 'Resolved'
                                        ? 'emerald'
                                        : 'amber'
                                    }
                                  >
                                    {claim.status}
                                  </StatusBadge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </StoreSurfaceCard>

              <StorePagination
                currentPage={currentClaimPage}
                totalPages={totalClaimPages}
                totalItems={filteredClaims.length}
                pageSize={CLAIMS_PER_PAGE}
                onPageChange={setClaimPage}
              />
            </div>
          )}

          {/* 4. TICKETS */}
          {activeTab === 'tickets' && (
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
                    <form onSubmit={handleCreateTicket} className="space-y-4">
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
                      onClick={() => openOrderAccess(selectedTicket.orderId)}
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
                      onSubmit={handleSendTicketReply}
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
            </div>
          )}

          {/* 5. PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h1 className="text-lg font-bold text-slate-900 m-0">
                Profile
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Account Info + Notifications */}
                <div className="lg:col-span-7 space-y-4">
                  <StoreSurfaceCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 m-0">
                        Account Details
                      </h2>
                      {profileSaved && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-3.5">
                      <StoreInputField
                        label="Full Name"
                        required
                        icon={User}
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        error={nameError}
                      />

                      <StoreInputField
                        label="Email"
                        icon={Mail}
                        value={session.email}
                        disabled
                        rightElement={
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Lock size={10} />
                            <span>Locked</span>
                          </span>
                        }
                      />

                      <StoreInputField
                        label="Phone / WhatsApp (BD)"
                        required
                        icon={Phone}
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        error={phoneError}
                        placeholder="017XXXXXXXX"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StoreInputField
                          label="Recovery Email"
                          icon={Mail}
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          error={recoveryEmailError}
                        />

                        <StoreInputField
                          label="Telegram"
                          value={telegramHandle}
                          onChange={(e) => setTelegramHandle(e.target.value)}
                          placeholder="@username"
                        />
                      </div>

                      <div className="pt-1">
                        <StoreButton
                          type="submit"
                          variant="dark"
                          size="sm"
                          disabled={
                            !isNameValid ||
                            !isPhoneValid ||
                            !isRecoveryEmailValid
                          }
                        >
                          <Check size={13} />
                          <span>Save Changes</span>
                        </StoreButton>
                      </div>
                    </form>
                  </StoreSurfaceCard>

                  <StoreSurfaceCard className="p-5 space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 m-0">
                      Notifications
                    </h2>

                    <div className="divide-y divide-slate-200">
                      {[
                        {
                          id: 'wa',
                          title: 'WhatsApp delivery updates',
                          checked: notifyWhatsapp,
                          toggle: () => setNotifyWhatsapp((v) => !v),
                        },
                        {
                          id: 'em',
                          title: 'Email order receipts',
                          checked: notifyEmail,
                          toggle: () => setNotifyEmail((v) => !v),
                        },
                        {
                          id: 'ex',
                          title: 'Expiry reminders (3 days prior)',
                          checked: notifyExpiry,
                          toggle: () => setNotifyExpiry((v) => !v),
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <span className="text-xs font-semibold text-slate-800">
                            {item.title}
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.checked}
                            onClick={item.toggle}
                            className={`w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer border-0 shrink-0 ${
                              item.checked ? 'bg-[#FF5E5B]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                item.checked ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </StoreSurfaceCard>
                </div>

                {/* Right Column: Password */}
                <div className="lg:col-span-5">
                  <StoreSurfaceCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 m-0">
                        Password
                      </h2>
                      {passwordSaved && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Updated</span>
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                      <StoreInputField
                        type="password"
                        label="Current Password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />

                      <StoreInputField
                        type="password"
                        label="New Password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                      />

                      <StoreInputField
                        type="password"
                        label="Confirm Password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={passwordError}
                        placeholder="Re-enter password"
                      />

                      <div className="pt-1">
                        <StoreButton
                          type="submit"
                          variant="dark"
                          size="sm"
                        >
                          <KeyRound size={13} />
                          <span>Update Password</span>
                        </StoreButton>
                      </div>
                    </form>
                  </StoreSurfaceCard>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
