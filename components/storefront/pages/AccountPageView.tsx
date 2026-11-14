'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { RenewOrderCard } from '@/components/storefront/ui/RenewOrderCard';
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
  Bell,
  MessageSquare,
  Check,
} from 'lucide-react';
import {
  clearCustomer,
  getOrderAccessToken,
  orderAccessProofs,
  readRememberedOrderIds,
  writeCustomer,
} from '@/lib/customerSession';
import { useCustomerSession } from '@/hooks/use-customer-session';
import { formatPrice } from '@/lib/products';
import {
  DurationBadge,
  OrderAccessDetailView,
  OrderRowCard,
  StoreButton,
  StoreInputField,
  StorePagination,
  StoreSearchBar,
  StoreSearchableSelect,
  StoreStatCard,
  StoreSurfaceCard,
  StoreTextareaField,
  WarrantyBadge,
  type ChatAttachment,
  type CustomerOrderItem,
  type OrderChatMessage,
  type SearchableSelectOption,
} from '@/components/storefront/ui';
import { useStoreNav, type AccountTab } from '@/context/StoreNavContext';
import {
  AccountSkeleton,
  useHydrated,
} from '@/components/storefront/pages/account/AccountSkeleton';
import type {
  AccountNotificationItem,
  SupportTicketItem,
  SupportTicketMessage,
  WarrantyClaimItem,
} from '@/components/storefront/pages/account/account-types';
import {
  CLAIMS_PER_PAGE,
  ISSUE_TYPES,
  MAX_FILE_BYTES,
  MAX_NOTIFICATIONS_SHOWN,
  ORDERS_PER_PAGE,
  TICKETS_PER_PAGE,
} from '@/components/storefront/pages/account/account-utils';
import { AccountProfilePanel } from '@/components/storefront/pages/account/AccountProfilePanel';
import { AccountOverviewPanel } from '@/components/storefront/pages/account/AccountOverviewPanel';
import { AccountTicketsPanel } from '@/components/storefront/pages/account/AccountTicketsPanel';
import { AccountWarrantyPanel } from '@/components/storefront/pages/account/AccountWarrantyPanel';

const INITIAL_ORDERS: CustomerOrderItem[] = [];
const INITIAL_TICKETS: SupportTicketItem[] = [];
const INITIAL_WARRANTY_CLAIMS: WarrantyClaimItem[] = [];
const INITIAL_NOTIFICATIONS: AccountNotificationItem[] = [];

/** Signed-out visitors get a sign-in prompt — never someone else's demo data. */
export function AccountPageView() {
  const { navigateTo } = useStoreNav();
  const storedSession = useCustomerSession();
  const hydrated = useHydrated();
  // No saved session in this browser: ask the server before showing the sign-in prompt
  // (the login cookie can outlive the local copy).
  const [serverCheck, setServerCheck] = useState<'idle' | 'checking' | 'none'>('idle');
  useEffect(() => {
    if (!hydrated || storedSession || serverCheck !== 'idle') return;
    setServerCheck('checking');
    fetch('/api/account/profile', { cache: 'no-store' })
      .then(async (r) => {
        const d = r.ok ? await r.json().catch(() => null) : null;
        if (d?.user?.email) {
          writeCustomer({ name: d.user.name || d.user.email.split('@')[0], email: d.user.email, phone: d.user.phone || '' });
        } else setServerCheck('none');
      })
      .catch(() => setServerCheck('none'));
  }, [hydrated, storedSession, serverCheck]);
  // Refresh name/phone from the account. Guest buyers (no login) get 401 and keep their order-link access.
  useEffect(() => {
    if (!storedSession) return;
    let alive = true;
    fetch('/api/account/profile', { cache: 'no-store' })
      .then(async (r) => {
        if (!alive || !r.ok) return;
        const d = await r.json().catch(() => null);
        if (d?.user && (d.user.name !== storedSession.name || (d.user.phone || '') !== (storedSession.phone || ''))) {
          writeCustomer({ name: d.user.name || storedSession.name, email: d.user.email, phone: d.user.phone || '' });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSession?.email]);
  if (!storedSession && (!hydrated || serverCheck !== 'none')) return <AccountSkeleton />;
  if (!storedSession) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-extrabold text-[#0F172A]">Sign in to see your account</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your orders, credentials, warranty claims and support tickets live here.
        </p>
        <button
          type="button"
          onClick={() => navigateTo('login')}
          className="mt-5 h-10 px-5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-sm cursor-pointer border-0"
        >
          Sign in
        </button>
      </div>
    );
  }
  return <AccountPageInner key={storedSession.email} session={storedSession} />;
}

function AccountPageInner({
  session,
}: {
  session: { name: string; email: string; phone?: string };
}) {
  const { accountTab, navigateTo } = useStoreNav();

  const activeTab: AccountTab =
    accountTab === 'credentials' || accountTab === 'library'
      ? 'orders'
      : accountTab || 'overview';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setActiveTab = (tab: AccountTab) => {
    setDrawerOpen(false);
    navigateTo('account', { accountTab: tab });
  };
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

  useEffect(() => {
    const fetchRealOrders = async () => {
      try {
        const email = session.email;
        const ids = readRememberedOrderIds();
        const proofs = orderAccessProofs();
        const url =
          `/api/orders?email=${encodeURIComponent(email)}` +
          (ids.length ? `&orderIds=${encodeURIComponent(ids.join(','))}` : '') +
          (proofs.length
            ? `&accessProofs=${encodeURIComponent(JSON.stringify(proofs))}`
            : '');
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.orders)) {
          const apiOrders: CustomerOrderItem[] = data.orders.map((o: any) => {
            const lines = new Map<string, { name: string; plan: string; n: number }>();
            for (const u of (o.units || []) as Array<{ productName: string; variantName: string }>) {
              const k = u.productName + '|' + u.variantName;
              const cur = lines.get(k);
              if (cur) cur.n += 1;
              else lines.set(k, { name: u.productName, plan: u.variantName, n: 1 });
            }
            const list = Array.from(lines.values());
            const multi = new Set(list.map((l) => l.name)).size > 1;
            return {
            id: o.id,
            productName: multi
              ? list.map((l) => l.name).filter((v, i, a) => a.indexOf(v) === i).join(' + ')
              : o.productName,
            planName: multi
              ? list.map((l) => `${l.name} ${l.plan}${l.n > 1 ? ` ×${l.n}` : ''}`).join(', ')
              : o.planName,
            duration: '',
            date: o.date,
            expiryDate: o.expiryDate,
            // Days left on the order window, not the warranty.
            daysRemaining: o.expiryDate && o.expiryDate !== 'N/A'
              ? Math.max(0, Math.ceil((new Date(o.expiryDate).getTime() - Date.now()) / 86_400_000))
              : undefined,
            totalDays: o.expiryDate && o.expiryDate !== 'N/A' && o.date
              ? Math.max(1, Math.round((new Date(o.expiryDate).getTime() - new Date(o.date).getTime()) / 86_400_000))
              : undefined,
            price: o.price,
            paymentMethod: o.paymentMethod || 'bkash',
            trxId: o.trxId,
            status: o.status,
            warrantyLabel: o.warrantyLabel || 'No Warranty',
            warrantyDaysLeft: o.warrantyDaysLeft ?? 0,
            deliveryEta: '10–24h delivery',
            isPaymentVerified: o.isPaymentVerified,
            loginEmail: o.isPaymentVerified ? (o.units?.[0]?.email || undefined) : undefined,
            loginPassword: o.isPaymentVerified ? o.units?.[0]?.password : undefined,
            profilePin: o.units?.[0]?.profilePin,
            secretText: o.units?.[0]?.secretValue,
            chatMessages: o.chatMessages || [],
            unreadChatCount: o.unreadChatCount || 0,
            quantity: o.quantity || 1,
            units: [...(o.units || [])].sort(
              (a: { deliveryId: string }, b: { deliveryId: string }) =>
                a.deliveryId.localeCompare(b.deliveryId, undefined, { numeric: true }),
            ),
          };
          });

          setOrders(apiOrders);
        }
      } catch (err) {
        console.error('Failed to load orders from api', err);
      }
    };
    fetchRealOrders();
  }, [session.email]);

  useEffect(() => {
    if (!session.email) return;
    const fetchTickets = async () => {
      try {
        const res = await fetch(
          `/api/account/tickets?email=${encodeURIComponent(session.email)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.tickets)) setTickets(data.tickets);
      } catch (err) {
        console.error('Failed to load tickets from api', err);
      }
    };
    fetchTickets();
  }, [session.email]);

  useEffect(() => {
    if (!session.email) return;
    const fetchWarrantyClaims = async () => {
      try {
        const res = await fetch(
          `/api/account/warranty?email=${encodeURIComponent(session.email)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.claims)) setClaims(data.claims);
      } catch (err) {
        console.error('Failed to load warranty claims from api', err);
      }
    };
    fetchWarrantyClaims();
  }, [session.email]);

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
    '',
  );
  const [claimUnitId, setClaimUnitId] = useState('');
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
  const [newTicketOrderId, setNewTicketOrderId] = useState('');
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
  const [profileName, setProfileName] = useState(session.name || '');
  const [profilePhone, setProfilePhone] = useState(
    (session.phone || '').replace(/[-\s]/g, ''),
  );
  const [profileSaved, setProfileSaved] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Notification Toggles

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

    try {
      fetch('/api/orders/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          text: payload.text,
          buyerEmail: session.email,
          senderName: profileName || session.name || 'You',
          attachment: payload.attachment,
          accessToken: getOrderAccessToken(orderId),
        }),
      }).catch((e) => console.error('Chat post failed:', e));
    } catch {}
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
        sublabel: o.duration ? `${o.planName} · ${o.duration}` : o.planName,
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
        sublabel: o.duration ? `${o.planName} · ${o.duration}` : o.planName,
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

  const isNameValid = profileName.trim().length >= 3;
  const nameError =
    profileName.length > 0 && !isNameValid ? 'Minimum 3 characters' : '';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid || !isPhoneValid || profileBusy) return;
    setProfileBusy(true);
    setProfileError('');
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim(), phone: cleanPhone }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || 'Could not save. Try again.');
      writeCustomer({ name: profileName.trim(), email: session.email, phone: cleanPhone });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8 || !/[a-z]/i.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('Use at least 8 characters, with letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || 'Could not change the password.');
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
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
    let res: Response;
    try {
      res = await fetch('/api/account/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedClaimOrder.id,
          deliveryIds: claimUnitId ? [claimUnitId] : undefined,
          issueType: claimIssueType,
          description: claimDescription.trim(),
          buyerName: profileName || session.name,
          accessToken: getOrderAccessToken(selectedClaimOrder.id),
        }),
      });
    } catch {
      setClaimError('Network error. Try again.');
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setClaimError(d?.error || 'Could not submit the claim. Try again.');
      return;
    }
    const newClaim: WarrantyClaimItem = {
      id: `WRN-${selectedClaimOrder.id.replace(/[^0-9]/g, '')}`,
      orderId: selectedClaimOrder.id,
      productName: selectedClaimOrder.productName,
      planName: selectedClaimOrder.planName,
      issueType: claimIssueType,
      description: claimDescription.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'In Review',
    };
    setClaims((prev) => [newClaim, ...prev]);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedClaimOrder.id ? { ...o, status: 'Warranty Claim' } : o,
      ),
    );

    setClaimDescription('');
    setClaimPage(1);
    setWarrantyModalOpen(false);
    setClaimSuccess(
      `Claim ${newClaim.id} submitted for ${selectedClaimOrder.id}.`,
    );
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTicketSubject.trim() ||
      (!newTicketMessage.trim() && !newTicketAttachment)
    )
      return;
    const msgText = newTicketMessage.trim() || newTicketAttachment?.name || '';
    const tempId = `TKT-${Math.floor(5000 + Math.random() * 4000)}`;

    try {
      const ticketOrderId = newTicketOrderId || 'General';
      const res = await fetch('/api/account/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newTicketSubject.trim(),
          orderId: ticketOrderId,
          category: newTicketCategory,
          priority: newTicketPriority,
          message: msgText,
          buyerName: profileName || session.name,
          buyerEmail: session.email,
          buyerPhone: profilePhone || session.phone,
          accessToken: getOrderAccessToken(ticketOrderId),
        }),
      });
      const data = await res.json();
      const created: SupportTicketItem =
        data.ok && data.ticket
          ? {
              ...data.ticket,
              messages: data.ticket.messages || [
                {
                  id: `tm-${Date.now()}`,
                  sender: 'customer',
                  senderName: profileName || session.name,
                  text: msgText,
                  time: 'Just now',
                  attachment: newTicketAttachment || undefined,
                },
              ],
            }
          : {
              id: tempId,
              subject: newTicketSubject.trim(),
              orderId: newTicketOrderId || 'General',
              category: newTicketCategory,
              priority: newTicketPriority,
              status: 'Open',
              updatedAt: 'Just now',
              messages: [
                {
                  id: `tm-${Date.now()}`,
                  sender: 'customer',
                  senderName: profileName || session.name,
                  text: msgText,
                  time: 'Just now',
                  attachment: newTicketAttachment || undefined,
                },
              ],
            };
      setTickets((prev) => [created, ...prev]);
      setSelectedTicketId(created.id);
    } catch (err) {
      console.error('Failed to create ticket API:', err);
      const fallback: SupportTicketItem = {
        id: tempId,
        subject: newTicketSubject.trim(),
        orderId: newTicketOrderId || 'General',
        category: newTicketCategory,
        priority: newTicketPriority,
        status: 'Open',
        updatedAt: 'Just now',
        messages: [
          {
            id: `tm-${Date.now()}`,
            sender: 'customer',
            senderName: profileName || session.name,
            text: msgText,
            time: 'Just now',
            attachment: newTicketAttachment || undefined,
          },
        ],
      };
      setTickets((prev) => [fallback, ...prev]);
      setSelectedTicketId(fallback.id);
    }
    setNewTicketSubject('');
    setNewTicketMessage('');
    setNewTicketAttachment(null);
    setCreatingTicket(false);
  };

  const submitTicketReply = () => {
    if (
      !selectedTicketId ||
      (!ticketReplyDraft.trim() && !ticketReplyAttachment)
    )
      return;
    const replyText = ticketReplyDraft.trim();
    const replyMsg: SupportTicketMessage = {
      id: `tm-${Date.now()}`,
      sender: 'customer',
      senderName: profileName || session.name || 'You',
      text: replyText || (ticketReplyAttachment ? ticketReplyAttachment.name : ''),
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

    const ticket = tickets.find((t) => t.id === selectedTicketId);
    void fetch('/api/account/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: selectedTicketId,
        message: replyMsg.text,
        senderName: profileName || session.name || 'You',
        buyerEmail: session.email,
        accessToken: ticket
          ? getOrderAccessToken(ticket.orderId)
          : undefined,
      }),
    }).catch((err) => console.error('Failed to post ticket reply to API:', err));

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
                onChange={(v) => {
                  setClaimOrderId(v);
                  setClaimUnitId('');
                }}
              />

              {selectedClaimOrder?.units && selectedClaimOrder.units.length > 1 ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-800">Which item has the problem?</span>
                  <select
                    value={claimUnitId}
                    onChange={(e) => setClaimUnitId(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">All items in this order</option>
                    {selectedClaimOrder.units
                      .filter((u) => u.status !== 'refunded' && u.status !== 'revoked')
                      .map((u) => (
                        <option
                          key={u.deliveryId}
                          value={u.deliveryId}
                          disabled={u.hasWarranty === false || (u.warrantyRemainingDays ?? 1) <= 0}
                        >
                          {u.productName} · {u.variantName} #{u.unitIndex}
                          {u.hasWarranty === false ? ' (no warranty)' : (u.warrantyRemainingDays ?? 1) <= 0 ? ' (warranty ended)' : ` (${u.warrantyRemainingDays}d left)`}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}


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
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => navigateTo('home', { code: 'ALL' })}
              className="flex items-center gap-2 cursor-pointer border-0 bg-transparent p-0 shrink-0"
              aria-label="Blumartbd home"
            >
              <BrandLogo size="md" />
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
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-13">
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
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'overview' && (
            <AccountOverviewPanel
              orders={orders}
              activeOrdersCount={activeOrdersCount}
              pendingOrdersCount={pendingOrdersCount}
              unreadChatOrdersCount={unreadChatOrdersCount}
              totalSpent={totalSpent}
              onNewTicket={() => {
                setActiveTab('tickets');
                setCreatingTicket(true);
              }}
              onOpenOrders={() => {
                setActiveTab('orders');
                setSelectedAccessOrderId(null);
              }}
              onOpenAccess={openOrderAccess}
            />
          )}

          {/* 2. ORDERS (10 per page + Search + Unread Chat Filter + Dedicated Access View) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {selectedAccessOrder ? (
                <div className="space-y-3">
                <RenewOrderCard orderId={selectedAccessOrder.id} email={session.email} />
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
                </div>
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

          {activeTab === 'warranty' && (
            <AccountWarrantyPanel
              claimSuccess={claimSuccess}
              setClaimSuccess={setClaimSuccess}
              claimSearch={claimSearch}
              setClaimSearch={setClaimSearch}
              claims={claims}
              paginatedClaims={paginatedClaims}
              filteredClaims={filteredClaims}
              currentClaimPage={currentClaimPage}
              totalClaimPages={totalClaimPages}
              claimFilter={claimFilter}
              setClaimFilter={setClaimFilter}
              setClaimPage={setClaimPage}
              onOpenWarrantyClaimModal={() => openWarrantyClaimModal()}
              onOpenOrderAccess={openOrderAccess}
            />
          )}

          {/* 4. TICKETS */}
          {activeTab === 'tickets' && (
            <AccountTicketsPanel
              creatingTicket={creatingTicket}
              setCreatingTicket={setCreatingTicket}
              selectedTicket={selectedTicket}
              setSelectedTicketId={setSelectedTicketId}
              tickets={tickets}
              paginatedTickets={paginatedTickets}
              filteredTickets={filteredTickets}
              currentTicketPage={currentTicketPage}
              totalTicketPages={totalTicketPages}
              ticketSearch={ticketSearch}
              setTicketSearch={setTicketSearch}
              ticketFilter={ticketFilter}
              setTicketFilter={setTicketFilter}
              setTicketPage={setTicketPage}
              newTicketSubject={newTicketSubject}
              setNewTicketSubject={setNewTicketSubject}
              newTicketOrderId={newTicketOrderId}
              setNewTicketOrderId={setNewTicketOrderId}
              newTicketCategory={newTicketCategory}
              setNewTicketCategory={setNewTicketCategory}
              newTicketPriority={newTicketPriority}
              setNewTicketPriority={setNewTicketPriority}
              newTicketMessage={newTicketMessage}
              setNewTicketMessage={setNewTicketMessage}
              newTicketAttachment={newTicketAttachment}
              setNewTicketAttachment={setNewTicketAttachment}
              newTicketFileError={newTicketFileError}
              setNewTicketFileError={setNewTicketFileError}
              newTicketFileRef={newTicketFileRef}
              ticketReplyDraft={ticketReplyDraft}
              setTicketReplyDraft={setTicketReplyDraft}
              ticketReplyingTo={ticketReplyingTo}
              setTicketReplyingTo={setTicketReplyingTo}
              ticketReplyAttachment={ticketReplyAttachment}
              setTicketReplyAttachment={setTicketReplyAttachment}
              ticketReplyFileError={ticketReplyFileError}
              setTicketReplyFileError={setTicketReplyFileError}
              ticketReplyFileRef={ticketReplyFileRef}
              ticketReplyTextareaRef={ticketReplyTextareaRef}
              allOrderSelectOptions={allOrderSelectOptions}
              onCreateTicket={handleCreateTicket}
              onSendTicketReply={handleSendTicketReply}
              submitTicketReply={submitTicketReply}
              onOpenOrderAccess={openOrderAccess}
              parseFileUpload={parseFileUpload}
            />
          )}

          {activeTab === 'profile' && (
            <AccountProfilePanel
              email={session.email}
              profileName={profileName}
              onProfileName={setProfileName}
              nameError={nameError}
              profilePhone={profilePhone}
              onProfilePhone={setProfilePhone}
              phoneError={phoneError}
              profileError={profileError}
              profileBusy={profileBusy}
              profileSaved={profileSaved}
              isNameValid={isNameValid}
              isPhoneValid={isPhoneValid}
              onSaveProfile={handleSaveProfile}
              currentPassword={currentPassword}
              onCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              onNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              onConfirmPassword={setConfirmPassword}
              passwordError={passwordError}
              passwordBusy={passwordBusy}
              passwordSaved={passwordSaved}
              onUpdatePassword={handleUpdatePassword}
            />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
