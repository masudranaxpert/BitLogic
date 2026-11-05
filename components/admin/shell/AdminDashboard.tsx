'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Layers,
  Database,
  Send,
  Ticket,
  Users,
  CreditCard,
  Sliders,
  Image as ImageIcon,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Bell,
  MessageSquare,
  ShieldAlert,
  Check,
} from 'lucide-react';
import {
  AdminTab,
  INITIAL_PRODUCTS,
  INITIAL_VAULT_CREDENTIALS,
  INITIAL_DELIVERIES,
  INITIAL_SUBSCRIBERS,
  INITIAL_PAYMENTS,
  INITIAL_COUPONS,
  INITIAL_FEATURE_FLAGS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_ADMIN_TICKETS,
  INITIAL_ADMIN_NOTIFICATIONS,
  DigitalProduct,
  ProductVariant,
  VaultCredential,
  DigitalDelivery,
  SubscriberUser,
  PaymentTransaction,
  CouponCode,
  SystemFeatureFlag,
  MediaAsset,
  AdminSupportTicket,
  AdminNotificationItem,
  AdminChatAttachment,
} from '@/lib/admin-data';
import { ModalShell } from '@/components/admin/ui/primitives';
import { AdminViewRouter } from '@/components/admin/shell/AdminViewRouter';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminTabToPath, pathToAdminTab } from '@/lib/admin-routes';

interface NavSubItem {
  id: AdminTab;
  label: string;
}

interface NavGroupItem {
  id: AdminTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  subItems?: NavSubItem[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathToAdminTab(pathname);

  const setActiveTab = (tab: AdminTab) => {
    router.push(adminTabToPath(tab));
  };

  const openProductOptionPage = (productId?: string, variantId?: string) => {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (variantId) params.set('variantId', variantId);
    const query = params.toString();
    router.push(
      `/admin/products/option${query ? `?${query}` : ''}`,
    );
  };

  /** Edit reuses the Add Product page (same component, edit mode). */
  const openProductEditPage = (productId: string, variantId?: string) => {
    const params = new URLSearchParams({ productId });
    if (variantId) params.set('variantId', variantId);
    router.push(`/admin/products/add?${params.toString()}`);
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    products: true,
    vault: true,
    users: true,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<DigitalProduct[]>(INITIAL_PRODUCTS);
  const [vault, setVault] = useState<VaultCredential[]>(INITIAL_VAULT_CREDENTIALS);
  const [deliveries, setDeliveries] = useState<DigitalDelivery[]>(INITIAL_DELIVERIES);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>(INITIAL_ADMIN_TICKETS);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotificationItem[]>(
    INITIAL_ADMIN_NOTIFICATIONS
  );
  const [subscribers, setSubscribers] = useState<SubscriberUser[]>(INITIAL_SUBSCRIBERS);
  const [payments, setPayments] = useState<PaymentTransaction[]>(INITIAL_PAYMENTS);
  const [coupons, setCoupons] = useState<CouponCode[]>(INITIAL_COUPONS);
  const [features, setFeatures] = useState<SystemFeatureFlag[]>(INITIAL_FEATURE_FLAGS);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(INITIAL_MEDIA_ASSETS);

  const [selectedChatDeliveryId, setSelectedChatDeliveryId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Admin Notification Popover & Live Toast
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [liveAdminToast, setLiveAdminToast] = useState<{
    id: string;
    title: string;
    message: string;
    orderId?: string;
    deliveryId?: string;
    ticketId?: string;
  } | null>(null);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    INITIAL_SUBSCRIBERS[0]?.id || null
  );
  const [activePortalUserId] = useState<string>(
    INITIAL_SUBSCRIBERS[0]?.id || 'usr-1'
  );

  const [preselectedVaultTarget, setPreselectedVaultTarget] = useState<{
    productId: string;
    variantId: string;
  } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const triggerLiveAdminToast = (payload: {
    title: string;
    message: string;
    orderId?: string;
    deliveryId?: string;
    ticketId?: string;
  }) => {
    const id = `latoast-${Date.now()}`;
    setLiveAdminToast({ id, ...payload });
    setTimeout(() => {
      setLiveAdminToast((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  };

  const handleSelectChatDelivery = (deliveryId: string | null) => {
    setSelectedChatDeliveryId(deliveryId);
    if (deliveryId) {
      const target = deliveries.find((d) => d.id === deliveryId);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, unreadChatCount: 0 } : d))
      );
      if (target) {
        setAdminNotifications((prev) =>
          prev.map((n) =>
            n.deliveryId === deliveryId ||
            (n.type === 'order_chat' && n.orderId === target.orderId)
              ? { ...n, read: true }
              : n
          )
        );
      }
    }
  };

  const handleSendOrderChatMessage = (
    deliveryId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: AdminChatAttachment;
    }
  ) => {
    const newMsgId = `adm-msg-${Date.now()}`;
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              unreadChatCount: 0,
              chatMessages: [
                ...(d.chatMessages || []),
                {
                  id: newMsgId,
                  sender: 'admin',
                  senderName: 'Support Admin',
                  text: payload.text,
                  time: 'Just now',
                  replyTo: payload.replyTo,
                  attachment: payload.attachment,
                },
              ],
            }
          : d
      )
    );
  };

  const handleSimulateBuyerMessage = (deliveryId: string) => {
    const target = deliveries.find((d) => d.id === deliveryId);
    if (!target) return;

    const sampleBuyerMessages = [
      `Hi Admin, I just checked ${target.orderId}. Can you confirm the workspace invite status?`,
      `Thank you! Quick question on ${target.orderId}: can I sign in on my laptop and phone simultaneously?`,
      `Hello, I need the 2FA / verification code for ${target.productName} (${target.orderId}).`,
    ];
    const randomText =
      sampleBuyerMessages[Math.floor(Math.random() * sampleBuyerMessages.length)];

    const isCurrentlyViewing =
      activeTab === 'deliveries' && selectedChatDeliveryId === deliveryId;

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              unreadChatCount: isCurrentlyViewing ? 0 : (d.unreadChatCount || 0) + 1,
              chatMessages: [
                ...(d.chatMessages || []),
                {
                  id: `sim-chat-${Date.now()}`,
                  sender: 'customer',
                  senderName: target.buyerName,
                  text: randomText,
                  time: 'Just now',
                },
              ],
            }
          : d
      )
    );

    const newNotif: AdminNotificationItem = {
      id: `anotif-${Date.now()}`,
      type: 'order_chat',
      orderId: target.orderId,
      deliveryId: target.id,
      title: `Order Chat · ${target.buyerName}`,
      message: randomText,
      time: 'Just now',
      read: false,
    };
    setAdminNotifications((prev) => [newNotif, ...prev]);
    triggerLiveAdminToast({
      title: `${target.orderId} · ${target.buyerName}`,
      message: randomText,
      orderId: target.orderId,
      deliveryId: target.id,
    });
  };

  const handleSelectTicket = (ticketId: string | null) => {
    setSelectedTicketId(ticketId);
    if (ticketId) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unreadCount: 0 } : t))
      );
      setAdminNotifications((prev) =>
        prev.map((n) => (n.ticketId === ticketId ? { ...n, read: true } : n))
      );
    }
  };

  const handleReplyTicket = (
    ticketId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: AdminChatAttachment;
    }
  ) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'answered',
              updatedAt: 'Just now',
              unreadCount: 0,
              messages: [
                ...t.messages,
                {
                  id: `tmsg-${Date.now()}`,
                  sender: 'admin',
                  senderName: 'Support Admin',
                  text: payload.text,
                  time: 'Just now',
                  replyTo: payload.replyTo,
                  attachment: payload.attachment,
                },
              ],
            }
          : t
      )
    );
    showToast(`Sent reply on ${ticketId}.`);
  };

  const handleUpdateTicketStatus = (
    ticketId: string,
    status: AdminSupportTicket['status']
  ) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status, updatedAt: 'Just now' } : t
      )
    );
    showToast(`Ticket ${ticketId} marked as ${status}.`);
  };

  const handleUpdateTicketPriority = (
    ticketId: string,
    priority: AdminSupportTicket['priority']
  ) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
    );
    showToast(`Updated ${ticketId} priority to ${priority}.`);
  };

  const handleCreateTicket = (newTicketData: {
    subject: string;
    orderId: string;
    category: AdminSupportTicket['category'];
    priority: AdminSupportTicket['priority'];
    initialMessage: string;
  }) => {
    const matchedDelivery =
      deliveries.find((d) => d.orderId === newTicketData.orderId) || deliveries[0];
    const newId = `TKT-${Math.floor(4100 + Math.random() * 800)}`;

    const created: AdminSupportTicket = {
      id: newId,
      subject: newTicketData.subject,
      orderId: newTicketData.orderId,
      deliveryId: matchedDelivery?.id,
      buyerName: matchedDelivery?.buyerName || 'Customer',
      buyerEmail: matchedDelivery?.buyerEmail || 'customer@gmail.com',
      buyerPhone: matchedDelivery?.buyerPhone || '+880 1700-000000',
      productName: matchedDelivery
        ? `${matchedDelivery.productName} · ${matchedDelivery.variantName}`
        : 'Digital Subscription',
      category: newTicketData.category,
      priority: newTicketData.priority,
      status: 'answered',
      updatedAt: 'Just now',
      unreadCount: 0,
      messages: [
        {
          id: `tmsg-${Date.now()}`,
          sender: 'admin',
          senderName: 'Support Admin',
          text: newTicketData.initialMessage,
          time: 'Just now',
        },
      ],
    };

    setTickets((prev) => [created, ...prev]);
    setSelectedTicketId(created.id);
    showToast(`Created ticket ${created.id}.`);
  };

  const handleSimulateBuyerTicketReply = (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;

    const replySamples = [
      `I checked my inbox and spam folder for ${target.orderId}—please resend or share the direct link here.`,
      `Got it, thank you! Please keep ${target.id} open until I verify login on my device.`,
      `Here is an update on ${target.orderId}: still seeing the verification prompt when signing in.`,
    ];
    const text = replySamples[Math.floor(Math.random() * replySamples.length)];

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'open',
              updatedAt: 'Just now',
              unreadCount:
                activeTab === 'tickets' && selectedTicketId === ticketId
                  ? 0
                  : (t.unreadCount || 0) + 1,
              messages: [
                ...t.messages,
                {
                  id: `tmsg-sim-${Date.now()}`,
                  sender: 'customer',
                  senderName: target.buyerName,
                  text,
                  time: 'Just now',
                },
              ],
            }
          : t
      )
    );

    const newNotif: AdminNotificationItem = {
      id: `anotif-${Date.now()}`,
      type: 'ticket',
      ticketId: target.id,
      orderId: target.orderId,
      deliveryId: target.deliveryId,
      title: `Ticket ${target.id} · ${target.buyerName}`,
      message: text,
      time: 'Just now',
      read: false,
    };
    setAdminNotifications((prev) => [newNotif, ...prev]);
    triggerLiveAdminToast({
      title: `Ticket ${target.id} · ${target.buyerName}`,
      message: text,
      ticketId: target.id,
      orderId: target.orderId,
    });
  };

  const handleOpenOrderChatFromTicket = (orderId: string, deliveryId?: string) => {
    const targetDelivery =
      deliveries.find((d) => d.id === deliveryId) ||
      deliveries.find((d) => d.orderId === orderId);
    if (targetDelivery) {
      setActiveTab('deliveries');
      handleSelectChatDelivery(targetDelivery.id);
    } else {
      setActiveTab('deliveries');
    }
  };

  const handleNotificationClick = (notif: AdminNotificationItem) => {
    setAdminNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setNotifOpen(false);

    if (notif.type === 'ticket' && notif.ticketId) {
      setActiveTab('tickets');
      handleSelectTicket(notif.ticketId);
      return;
    }

    if (notif.type === 'payment') {
      setActiveTab('payments');
      return;
    }

    const matchedDelivery =
      deliveries.find((d) => d.id === notif.deliveryId) ||
      deliveries.find((d) => d.orderId === notif.orderId);
    setActiveTab('deliveries');
    if (matchedDelivery) {
      handleSelectChatDelivery(matchedDelivery.id);
    }
  };

  const handleMarkAllAdminNotifsRead = () => {
    setAdminNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setDeliveries((prev) => prev.map((d) => ({ ...d, unreadChatCount: 0 })));
    setTickets((prev) => prev.map((t) => ({ ...t, unreadCount: 0 })));
  };

  const handleSaveNewProduct = (
    newProduct: DigitalProduct,
    initialCredentials: VaultCredential[]
  ) => {
    setProducts((prev) => [newProduct, ...prev]);
    if (initialCredentials.length > 0) {
      setVault((prev) => [...initialCredentials, ...prev]);
    }
    setActiveTab('products');
    showToast(`Published "${newProduct.name}" (${newProduct.variants.length} options).`);
  };

  const handleUpdateProduct = (
    product: DigitalProduct,
    newCredentials: VaultCredential[],
  ) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    if (newCredentials.length > 0) {
      setVault((prev) => [...newCredentials, ...prev]);
    }
    setActiveTab('products');
    showToast(`Saved "${product.name}" (${product.variants.length} options).`);
  };

  const handleAddVariant = (productId: string, variant: ProductVariant) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: [
                ...(variant.isDefault
                  ? p.variants.map((v) => ({ ...v, isDefault: false }))
                  : p.variants),
                variant,
              ],
            }
          : p
      )
    );
    showToast(`Added option "${variant.name}".`);
  };

  const handleUpdateVariant = (productId: string, updatedVariant: ProductVariant) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) => {
                if (v.id === updatedVariant.id) return updatedVariant;
                if (updatedVariant.isDefault) return { ...v, isDefault: false };
                return v;
              }),
            }
          : p
      )
    );
    showToast(`Updated "${updatedVariant.name}".`);
  };

  const handleOpenQuickRestock = (productId: string, variantId: string) => {
    setPreselectedVaultTarget({ productId, variantId });
    setExpandedGroups((prev) => ({ ...prev, vault: true }));
    setActiveTab('vault-manual');
  };

  const handleAddCredentials = (newItems: VaultCredential[]) => {
    setVault((prev) => [...newItems, ...prev]);
    showToast(`Added ${newItems.length} credential(s) to Vault.`);
  };

  const handleDeleteCredential = (id: string) => {
    setVault((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed credential from Vault.');
  };

  const handleAddMediaAsset = (asset: MediaAsset) => {
    setMediaAssets((prev) => [asset, ...prev]);
    showToast(`Added "${asset.name}" to Media Library.`);
  };

  const handleDeleteMediaAsset = (id: string) => {
    setMediaAssets((prev) => prev.filter((a) => a.id !== id));
    showToast('Removed file from Media Library.');
  };

  const handleFulfillDelivery = (
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
  ) => {
    const targetDelivery = deliveries.find((d) => d.id === deliveryId);

    if (payload.vaultCredentialId && targetDelivery) {
      setVault((prev) =>
        prev.map((v) =>
          v.id === payload.vaultCredentialId
            ? {
                ...v,
                status: 'delivered',
                assignedOrderId: targetDelivery.orderId,
                assignedBuyerEmail: targetDelivery.buyerEmail,
              }
            : v
        )
      );
    }

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: isWarrantyReplacement ? 'replaced' : 'delivered',
              deliveredAt: '2026-10-30 03:38',
              credentialPayload: {
                secretValue: payload.secretValue,
                email: payload.email,
                password: payload.password,
                profilePin: payload.profilePin,
              },
              vpnRequired: payload.vpnRequired,
              vpnRegionNote: payload.vpnRegionNote,
              warrantyRemainingDays: payload.warrantyDays,
              replacementHistoryCount: isWarrantyReplacement
                ? d.replacementHistoryCount + 1
                : d.replacementHistoryCount,
              customAdminNote: payload.customAdminNote,
              warrantyClaimReason: undefined,
            }
          : d
      )
    );

    showToast(
      isWarrantyReplacement
        ? `Replaced credential for ${deliveryId}.`
        : `Delivered credential for ${deliveryId}.`
    );
  };

  const handleSimulateOrder = (
    productId: string,
    variantId: string,
    buyerName: string,
    buyerEmail: string
  ) => {
    const product = products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return;

    const orderId = `ORD-${Math.floor(88225 + Math.random() * 700)}`;
    const deliveryId = `DLV-${Math.floor(9050 + Math.random() * 900)}`;

    const availableStockItem =
      variant.deliveryMode === 'auto_vault'
        ? vault.find(
            (v) =>
              v.productId === product.id &&
              v.variantId === variant.id &&
              v.status === 'available'
          )
        : undefined;

    if (availableStockItem) {
      setVault((prev) =>
        prev.map((v) =>
          v.id === availableStockItem.id
            ? {
                ...v,
                status: 'delivered',
                assignedOrderId: orderId,
                assignedBuyerEmail: buyerEmail,
              }
            : v
        )
      );
    }

    const newDelivery: DigitalDelivery = {
      id: deliveryId,
      orderId,
      createdAt: '2026-10-30 03:40',
      deliveredAt: availableStockItem ? '2026-10-30 03:40' : undefined,
      buyerName,
      buyerEmail,
      buyerPhone: '+880 1700-000000',
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      credentialType: variant.credentialType,
      deliveryMode: variant.deliveryMode,
      status: availableStockItem ? 'delivered' : 'pending_dispatch',
      credentialPayload: {
        secretValue: availableStockItem ? availableStockItem.secretValue : '',
        email: availableStockItem?.email,
        password: availableStockItem?.password,
        profilePin: availableStockItem?.profilePin,
      },
      vpnRequired: variant.vpnRequired,
      vpnRegionNote: variant.vpnRegionNote,
      hasWarranty: variant.hasWarranty,
      warrantyDays: variant.warrantyDays,
      warrantyRemainingDays: variant.warrantyDays,
      warrantyTerms: variant.warrantyTerms,
      replacementHistoryCount: 0,
      loginInstructions: variant.loginInstructions,
      customAdminNote: availableStockItem
        ? availableStockItem.noteBBCode || `Auto-delivered (${availableStockItem.id}).`
        : 'Queued for manual dispatch.',
      unreadChatCount: 1,
      chatMessages: [
        {
          id: `init-chat-${Date.now()}`,
          sender: 'customer',
          senderName: buyerName,
          text: `Hi, I just placed order ${orderId} for ${product.name} (${variant.name}).`,
          time: 'Just now',
        },
      ],
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              totalSales: p.totalSales + 1,
              monthlyRevenueBDT: p.monthlyRevenueBDT + variant.priceBDT,
            }
          : p
      )
    );

    const newNotif: AdminNotificationItem = {
      id: `anotif-${Date.now()}`,
      type: 'order_chat',
      orderId,
      deliveryId,
      title: `New Order ${orderId} · ${buyerName}`,
      message: `${product.name} (${variant.name}) — ${
        availableStockItem ? 'Auto-delivered from Vault' : 'Awaiting dispatch'
      }`,
      time: 'Just now',
      read: false,
    };
    setAdminNotifications((prev) => [newNotif, ...prev]);
    triggerLiveAdminToast({
      title: `New Order ${orderId}`,
      message: `${buyerName} ordered ${product.name} (${variant.name}).`,
      orderId,
      deliveryId,
    });
  };

  const handleAddCustomer = (newCustomer: SubscriberUser) => {
    setSubscribers((prev) => [newCustomer, ...prev]);
    setSelectedCustomerId(newCustomer.id);
    setActiveTab('user-detail');
    showToast(`Added customer "${newCustomer.name}".`);
  };

  const handleAssignSubscription = (
    userId: string,
    productId: string,
    variantId: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    const variant = prod?.variants.find((v) => v.id === variantId);
    if (!prod || !variant) return;

    setSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              totalSpentBDT: u.totalSpentBDT + variant.priceBDT,
              ordersCount: u.ordersCount + 1,
              activeSubscriptions: [
                {
                  id: `sub-${Date.now()}`,
                  productName: prod.name,
                  variantName: variant.name,
                  credentialType: variant.credentialType,
                  startedAt: '2026-10-30',
                  expiresAt: '2026-11-29',
                  remainingDays: variant.durationDays,
                  autoRenew: true,
                  warrantyActive: variant.hasWarranty,
                },
                ...u.activeSubscriptions,
              ],
            }
          : u
      )
    );
    showToast(`Assigned ${prod.name} (${variant.name}).`);
  };

  const handleExtendSubscription = (userId: string, subId: string, extraDays: number) => {
    setSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              activeSubscriptions: u.activeSubscriptions.map((s) =>
                s.id === subId
                  ? {
                      ...s,
                      remainingDays: s.remainingDays + extraDays,
                      warrantyActive: true,
                    }
                  : s
              ),
            }
          : u
      )
    );
    showToast(`Extended plan by +${extraDays} days.`);
  };

  const handleToggleUserStatus = (userId: string) => {
    setSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
          : u
      )
    );
    showToast('Updated account status.');
  };

  const handleChangeUserRole = (userId: string, role: SubscriberUser['role']) => {
    setSubscribers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
    showToast(`Updated tier to ${role.toUpperCase()}.`);
  };

  const handleVerifyPayment = (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'verified' } : p))
    );
    if (pay) {
      showToast(`Verified ${pay.gateway} (${pay.trxId}).`);
    }
  };

  const handleRejectOrRefundPayment = (
    paymentId: string,
    nextStatus: 'rejected' | 'refunded'
  ) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: nextStatus } : p))
    );
    showToast(`Marked payment ${paymentId} as ${nextStatus}.`);
  };

  const handleAddCoupon = (coupon: CouponCode) => {
    setCoupons((prev) => [coupon, ...prev]);
    showToast(`Created coupon ${coupon.code}.`);
  };

  const handleToggleCoupon = (couponId: string) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === couponId
          ? { ...c, status: c.status === 'active' ? 'disabled' : 'active' }
          : c
      )
    );
  };

  const handleToggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    showToast('Updated feature state.');
  };

  const pendingDeliveriesBadge = deliveries.filter(
    (d) =>
      d.status === 'pending_dispatch' ||
      d.status === 'warranty_claim' ||
      (d.unreadChatCount || 0) > 0
  ).length;
  const openTicketsBadge = tickets.filter((t) => t.status === 'open').length;
  const unreadOrderChatsCount = deliveries.reduce(
    (sum, d) => sum + (d.unreadChatCount || 0),
    0
  );
  const unreadNotificationsCount = adminNotifications.filter((n) => !n.read).length;
  const visibleAdminNotifications = adminNotifications
    .filter((n) => (notifFilter === 'UNREAD' ? !n.read : true))
    .slice(0, 7);

  const pendingPaymentsBadge = payments.filter(
    (p) => p.status === 'pending_verification'
  ).length;
  const availableVaultBadge = vault.filter((v) => v.status === 'available').length;

  const mainMenuItems: NavGroupItem[] = [
    { id: 'overview', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    {
      id: 'products',
      label: 'Product',
      shortLabel: 'Product',
      icon: Layers,
      count: products.length,
      subItems: [
        { id: 'products', label: 'All Products' },
        { id: 'product-add', label: 'Add Product' },
      ],
    },
    {
      id: 'vault',
      label: 'Credential Vault',
      shortLabel: 'Vault',
      icon: Database,
      count: availableVaultBadge,
      subItems: [
        { id: 'vault', label: 'Vault Inventory' },
        { id: 'vault-manual', label: 'Manual Add' },
        { id: 'vault-bulk', label: 'Bulk Import' },
      ],
    },
    {
      id: 'deliveries',
      label: 'Deliveries',
      shortLabel: 'Deliveries',
      icon: Send,
      count: pendingDeliveriesBadge,
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      shortLabel: 'Tickets',
      icon: Ticket,
      count: openTicketsBadge,
    },
    {
      id: 'users',
      label: 'Customer',
      shortLabel: 'Customer',
      icon: Users,
      count: subscribers.length,
      subItems: [
        { id: 'users', label: 'All Customers' },
        { id: 'user-add', label: 'Add Customer' },
      ],
    },
    {
      id: 'media',
      label: 'Media Library',
      shortLabel: 'Media',
      icon: ImageIcon,
      count: mediaAssets.length,
    },
  ];

  const toolsMenuItems: NavGroupItem[] = [
    {
      id: 'payments',
      label: 'Payments',
      shortLabel: 'Payments',
      icon: CreditCard,
      count: pendingPaymentsBadge,
    },
    { id: 'features', label: 'Settings', shortLabel: 'Settings', icon: Sliders },
  ];

  const isGroupActive = (item: NavGroupItem) => {
    if (activeTab === item.id) return true;
    if (item.id === 'users' && (activeTab === 'user-detail' || activeTab === 'user-add')) {
      return true;
    }
    if (
      item.id === 'products' &&
      (activeTab === 'product-add' || activeTab === 'product-option')
    ) {
      return true;
    }
    if (item.subItems?.some((sub) => sub.id === activeTab)) return true;
    return false;
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="admin-console min-h-dvh flex bg-[#f6f8fa] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white">
      {/* Top-Right Sonner Live Toast for Admin */}
      {liveAdminToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3.5 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[350px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)] p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {liveAdminToast.title}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {liveAdminToast.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (liveAdminToast.ticketId) {
                setActiveTab('tickets');
                handleSelectTicket(liveAdminToast.ticketId);
              } else if (liveAdminToast.deliveryId) {
                setActiveTab('deliveries');
                handleSelectChatDelivery(liveAdminToast.deliveryId);
              }
              setLiveAdminToast(null);
            }}
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => setLiveAdminToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden'
        } lg:sticky lg:top-0 lg:h-dvh lg:flex w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between select-none`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[7px] bg-emerald-600 text-white font-display font-bold text-sm flex items-center justify-center shadow-2xs">
                B
              </div>
              <div>
                <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  BitLogic Inc.
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Admin Store</div>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search"
              aria-label="Filter sidebar menu"
              className="w-full h-9 pl-8 pr-12 text-xs bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 rounded-lg focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              title="Open Quick Command (⌘K)"
              aria-label="Open Quick Command (Command K)"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[5px] text-slate-500 hover:border-emerald-600 cursor-pointer"
            >
              ⌘ K
            </button>
          </div>

          <div>
            <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              MAIN MENU
            </div>
            <div className="space-y-1">
              {mainMenuItems
                .filter(
                  (item) =>
                    item.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                    item.subItems?.some((s) =>
                      s.label.toLowerCase().includes(sidebarSearch.toLowerCase())
                    )
                )
                .map((item) => {
                  const Icon = item.icon;
                  const active = isGroupActive(item);
                  const hasSubs = Boolean(item.subItems && item.subItems.length > 0);
                  const isExpanded = Boolean(expandedGroups[item.id]);

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => {
                          if (hasSubs) {
                            toggleGroupExpand(item.id);
                            if (!active) {
                              setActiveTab(item.id);
                            }
                          } else {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                          active
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>

                        <span className="flex items-center gap-1.5 shrink-0">
                          {typeof item.count === 'number' && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                                active
                                  ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                          {hasSubs && (
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                isExpanded ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          )}
                        </span>
                      </button>

                      {hasSubs && isExpanded && (
                        <div className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5 py-0.5">
                          {item.subItems?.map((sub) => {
                            const subActive =
                              activeTab === sub.id ||
                              (sub.id === 'users' && activeTab === 'user-detail');
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(sub.id);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                                  subActive
                                    ? 'text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50/60 dark:bg-emerald-950/40'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <span>{sub.label}</span>
                                {subActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              TOOLS
            </div>
            <div className="space-y-1">
              {toolsMenuItems
                .filter((item) =>
                  item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
                )
                .map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        active
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-[11px] font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('deliveries');
              setMobileMenuOpen(false);
            }}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[inset_0_0_0_1px_#059669] flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-[6px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Deliveries Queue
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {pendingDeliveriesBadge} pending action
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-display font-bold text-[11px] flex items-center justify-center shrink-0">
                MR
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Masud Rana
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Admin
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 cursor-pointer shrink-0"
              title="Toggle Light / Dark Mode"
              aria-label="Toggle Light or Dark Mode"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Admin Top Bar (Mobile + Desktop) with Order Chat, Tickets & Notification Popover */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-7 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              aria-label="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="lg:hidden font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              BitLogic Inc.
            </span>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Admin Console
              </span>
              <span>/</span>
              <span className="capitalize">
                {activeTab === 'product-add' && searchParams.get('productId')
                  ? 'Edit Product'
                  : activeTab.replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" ref={notifContainerRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className={`relative w-9 h-9 rounded-lg border transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs ${
                  notifOpen
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-3 top-15 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                        Notifications
                      </span>
                      <div className="inline-flex p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNotifFilter('ALL')}
                          className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                            notifFilter === 'ALL'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifFilter('UNREAD')}
                          className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                            notifFilter === 'UNREAD'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Unread ({unreadNotificationsCount})
                        </button>
                      </div>
                    </div>

                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAdminNotifsRead}
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 cursor-pointer whitespace-nowrap"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {visibleAdminNotifications.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-slate-400">
                        No unread notifications.
                      </div>
                    ) : (
                      visibleAdminNotifications.map((item) => {
                        const refCode = item.ticketId || item.orderId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationClick(item)}
                            className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                              !item.read
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/35'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                !item.read
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-xs truncate ${
                                    !item.read
                                      ? 'font-bold text-slate-900 dark:text-slate-100'
                                      : 'font-semibold text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums shrink-0">
                                  {item.time}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {refCode && (
                                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                    {refCode} ·{' '}
                                  </span>
                                )}
                                {item.message}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3.5 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Showing latest 7 notifications</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab('deliveries');
                      }}
                      className="font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                    >
                      Deliveries →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-22 md:pb-8 max-w-[1440px] w-full mx-auto">
          <AdminViewRouter
            activeTab={activeTab}
            searchParams={searchParams}
            setActiveTab={setActiveTab}
            openProductOptionPage={openProductOptionPage}
            openProductEditPage={openProductEditPage}
            products={products}
            vault={vault}
            deliveries={deliveries}
            tickets={tickets}
            subscribers={subscribers}
            payments={payments}
            coupons={coupons}
            features={features}
            mediaAssets={mediaAssets}
            selectedChatDeliveryId={selectedChatDeliveryId}
            selectedTicketId={selectedTicketId}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            preselectedVaultTarget={preselectedVaultTarget}
            setPreselectedVaultTarget={setPreselectedVaultTarget}
            handleOpenQuickRestock={handleOpenQuickRestock}
            handleVerifyPayment={handleVerifyPayment}
            handleSaveNewProduct={handleSaveNewProduct}
            handleUpdateProduct={handleUpdateProduct}
            handleAddVariant={handleAddVariant}
            handleUpdateVariant={handleUpdateVariant}
            handleDeleteCredential={handleDeleteCredential}
            handleAddCredentials={handleAddCredentials}
            handleSelectChatDelivery={handleSelectChatDelivery}
            handleSendOrderChatMessage={handleSendOrderChatMessage}
            handleSimulateBuyerMessage={handleSimulateBuyerMessage}
            handleFulfillDelivery={handleFulfillDelivery}
            handleSimulateOrder={handleSimulateOrder}
            handleSelectTicket={handleSelectTicket}
            handleReplyTicket={handleReplyTicket}
            handleUpdateTicketStatus={handleUpdateTicketStatus}
            handleUpdateTicketPriority={handleUpdateTicketPriority}
            handleCreateTicket={handleCreateTicket}
            handleSimulateBuyerTicketReply={handleSimulateBuyerTicketReply}
            handleOpenOrderChatFromTicket={handleOpenOrderChatFromTicket}
            handleAddCustomer={handleAddCustomer}
            handleExtendSubscription={handleExtendSubscription}
            handleAssignSubscription={handleAssignSubscription}
            handleToggleUserStatus={handleToggleUserStatus}
            handleChangeUserRole={handleChangeUserRole}
            handleAddMediaAsset={handleAddMediaAsset}
            handleDeleteMediaAsset={handleDeleteMediaAsset}
            handleRejectOrRefundPayment={handleRejectOrRefundPayment}
            handleAddCoupon={handleAddCoupon}
            handleToggleCoupon={handleToggleCoupon}
            handleToggleFeature={handleToggleFeature}
          />
        </main>

        <nav
          aria-label="Mobile quick navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 h-15 px-1"
        >
          {[
            mainMenuItems[0],
            mainMenuItems[1],
            mainMenuItems[3],
            mainMenuItems[4],
            mainMenuItems[5],
          ].map((item) => {
            const Icon = item.icon;
            const active = isGroupActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-full px-1">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <ModalShell
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        title="Quick Command (⌘K)"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              placeholder="Jump to page or action..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
              Pages
            </div>
            {[
              { id: 'overview' as AdminTab, label: 'Dashboard' },
              { id: 'products' as AdminTab, label: 'Product — All Products' },
              { id: 'product-add' as AdminTab, label: 'Product — Add Product' },
              { id: 'product-option' as AdminTab, label: 'Product — Add / Edit Option' },
              { id: 'vault' as AdminTab, label: 'Credential Vault — Inventory' },
              { id: 'vault-manual' as AdminTab, label: 'Credential Vault — Manual Add' },
              { id: 'vault-bulk' as AdminTab, label: 'Credential Vault — Bulk Import' },
              { id: 'deliveries' as AdminTab, label: 'Deliveries & Order Chat' },
              { id: 'tickets' as AdminTab, label: 'Support Tickets' },
              { id: 'users' as AdminTab, label: 'Customer — All Customers' },
              { id: 'user-add' as AdminTab, label: 'Customer — Add Customer' },
              { id: 'media' as AdminTab, label: 'Media Library' },
              { id: 'payments' as AdminTab, label: 'Payments' },
              { id: 'features' as AdminTab, label: 'Settings' },
            ]
              .filter((i) => i.label.toLowerCase().includes(commandQuery.toLowerCase()))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setCommandOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
          </div>
        </div>
      </ModalShell>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-18 md:bottom-5 right-4 sm:right-5 z-50 px-4 py-3 bg-slate-900 dark:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_25px_-5px_rgba(0,0,0,0.4)] flex items-center gap-2 max-w-[calc(100vw-2rem)]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
