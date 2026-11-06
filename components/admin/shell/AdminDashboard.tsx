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
  fetchAdminWorkspace,
  persistAdminProduct,
  persistAdminTaxonomies,
  persistAdminWorkspace,
} from '@/lib/admin/workspace-client';
import {
  AdminTab,
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
  WarrantyPlan,
  CredentialScheme,
  ProductCategory,
} from '@/lib/admin-data';
import { ModalShell } from '@/components/admin/ui/primitives';
import { AdminViewRouter } from '@/components/admin/shell/AdminViewRouter';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  adminTabLabel,
  adminTabToPath,
  isOrdersAdminTab,
  pathToAdminTab,
} from '@/lib/admin-routes';
import {
  addDaysYmd,
  formatStamp,
  todayYmd,
} from '@/lib/admin/credential-lifecycle';
import { runCredentialLifecycle } from '@/lib/admin/clear-expired-credentials';
import { cappedCredentialExpiresAt } from '@/lib/admin/renewal-lifecycle';

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

  // Old /admin/deliveries → canonical Orders URL
  useEffect(() => {
    const normalized = pathname.replace(/\/$/, '') || '/admin';
    if (normalized === '/admin/deliveries') {
      const id = searchParams.get('id');
      router.replace(id ? `/admin/orders?id=${encodeURIComponent(id)}` : '/admin/orders');
    }
  }, [pathname, router, searchParams]);

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

  /** Accordion: only the active section’s submenu stays open. */
  const navGroupForTab = (
    tab: AdminTab,
  ): 'products' | 'vault' | 'users' | 'deliveries' | null => {
    if (
      tab === 'products' ||
      tab === 'product-add' ||
      tab === 'product-option' ||
      tab === 'warranties' ||
      tab === 'credential-types' ||
      tab === 'categories'
    ) {
      return 'products';
    }
    if (
      tab === 'vault' ||
      tab === 'vault-manual' ||
      tab === 'vault-bulk' ||
      tab === 'vault-view' ||
      tab === 'vault-edit'
    ) {
      return 'vault';
    }
    if (tab === 'users' || tab === 'user-detail' || tab === 'user-add') {
      return 'users';
    }
    if (
      tab === 'deliveries' ||
      tab === 'orders-pinned' ||
      tab === 'orders-renewals' ||
      tab === 'warranty-claims'
    ) {
      return 'deliveries';
    }
    return null;
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const open = navGroupForTab(pathToAdminTab(pathname));
    return {
      products: open === 'products',
      vault: open === 'vault',
      users: open === 'users',
      deliveries: open === 'deliveries',
    };
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [warranties, setWarranties] = useState<WarrantyPlan[]>([]);
  const [credentialSchemes, setCredentialSchemes] = useState<CredentialScheme[]>(
    [],
  );
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(
    [],
  );
  const [catalogHydrated, setCatalogHydrated] = useState(false);
  const [vault, setVaultState] = useState<VaultCredential[]>([]);
  const [deliveries, setDeliveriesState] = useState<DigitalDelivery[]>([]);
  const [tickets, setTicketsState] = useState<AdminSupportTicket[]>([]);
  const [adminNotifications, setAdminNotificationsState] = useState<
    AdminNotificationItem[]
  >([]);
  const [subscribers, setSubscribersState] = useState<SubscriberUser[]>([]);
  const [payments, setPaymentsState] = useState<PaymentTransaction[]>([]);
  const [coupons, setCouponsState] = useState<CouponCode[]>([]);
  const [features, setFeaturesState] = useState<SystemFeatureFlag[]>([]);
  const [mediaAssets, setMediaAssetsState] = useState<MediaAsset[]>([]);

  const [selectedChatDeliveryId, setSelectedChatDeliveryId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Keep order-chat selection in sync with ?id= on Orders URLs
  useEffect(() => {
    if (!isOrdersAdminTab(activeTab)) {
      setSelectedChatDeliveryId(null);
      return;
    }
    const id = searchParams.get('id');
    setSelectedChatDeliveryId((prev) => (prev === id ? prev : id));
  }, [activeTab, searchParams]);

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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activePortalUserId] = useState<string>('');

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

  // Full admin workspace from DB (Prisma seed only bootstraps empty DB).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const workspace = await fetchAdminWorkspace();
      if (cancelled) return;
      if (workspace) {
        setProducts(workspace.products ?? []);
        setWarranties(workspace.warranties ?? []);
        setCredentialSchemes(workspace.credentialSchemes ?? []);
        setProductCategories(workspace.productCategories ?? []);
        const life = runCredentialLifecycle(
          workspace.deliveries ?? [],
          workspace.vault ?? [],
        );
        setVaultState(life.vault);
        setDeliveriesState(life.deliveries);
        if (life.changed) {
          void persistAdminWorkspace({
            deliveries: life.deliveries,
            vault: life.vault,
          });
        }
        setTicketsState(workspace.tickets ?? []);
        setAdminNotificationsState(workspace.adminNotifications ?? []);
        setSubscribersState(workspace.subscribers ?? []);
        setPaymentsState(workspace.payments ?? []);
        setCouponsState(workspace.coupons ?? []);
        setFeaturesState(workspace.features ?? []);
        setMediaAssetsState(workspace.mediaAssets ?? []);
      }
      setCatalogHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commitVault = (
    updater: React.SetStateAction<VaultCredential[]>,
  ) => {
    setVaultState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ vault: next });
      return next;
    });
  };

  const commitDeliveries = (
    updater: React.SetStateAction<DigitalDelivery[]>,
  ) => {
    setDeliveriesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ deliveries: next });
      return next;
    });
  };

  const commitTickets = (
    updater: React.SetStateAction<AdminSupportTicket[]>,
  ) => {
    setTicketsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ tickets: next });
      return next;
    });
  };

  const commitNotifications = (
    updater: React.SetStateAction<AdminNotificationItem[]>,
  ) => {
    setAdminNotificationsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ adminNotifications: next });
      return next;
    });
  };

  const commitSubscribers = (
    updater: React.SetStateAction<SubscriberUser[]>,
  ) => {
    setSubscribersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ subscribers: next });
      return next;
    });
  };

  const commitPayments = (
    updater: React.SetStateAction<PaymentTransaction[]>,
  ) => {
    setPaymentsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ payments: next });
      return next;
    });
  };

  const commitCoupons = (updater: React.SetStateAction<CouponCode[]>) => {
    setCouponsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ coupons: next });
      return next;
    });
  };

  const commitFeatures = (
    updater: React.SetStateAction<SystemFeatureFlag[]>,
  ) => {
    setFeaturesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ features: next });
      return next;
    });
  };

  const commitMedia = (updater: React.SetStateAction<MediaAsset[]>) => {
    setMediaAssetsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ mediaAssets: next });
      return next;
    });
  };

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

    const ordersBase = isOrdersAdminTab(activeTab)
      ? adminTabToPath(activeTab)
      : adminTabToPath('deliveries');
    if (deliveryId) {
      router.push(`${ordersBase}?id=${encodeURIComponent(deliveryId)}`);
      const target = deliveries.find((d) => d.id === deliveryId);
      commitDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, unreadChatCount: 0 } : d))
      );
      if (target) {
        commitNotifications((prev) =>
          prev.map((n) =>
            n.deliveryId === deliveryId ||
            (n.type === 'order_chat' && n.orderId === target.orderId)
              ? { ...n, read: true }
              : n
          )
        );
      }
    } else {
      router.push(ordersBase);
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
    commitDeliveries((prev) =>
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

    commitDeliveries((prev) =>
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
    commitNotifications((prev) => [newNotif, ...prev]);
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
      commitTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unreadCount: 0 } : t))
      );
      commitNotifications((prev) =>
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
    commitTickets((prev) =>
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
    commitTickets((prev) =>
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
    commitTickets((prev) =>
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

    commitTickets((prev) => [created, ...prev]);
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

    commitTickets((prev) =>
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
    commitNotifications((prev) => [newNotif, ...prev]);
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
      handleSelectChatDelivery(targetDelivery.id);
    } else {
      setActiveTab('deliveries');
    }
  };

  const handleNotificationClick = (notif: AdminNotificationItem) => {
    commitNotifications((prev) =>
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
    if (matchedDelivery) {
      handleSelectChatDelivery(matchedDelivery.id);
    } else {
      setActiveTab('deliveries');
    }
  };

  const handleMarkAllAdminNotifsRead = () => {
    commitNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    commitDeliveries((prev) => prev.map((d) => ({ ...d, unreadChatCount: 0 })));
    commitTickets((prev) => prev.map((t) => ({ ...t, unreadCount: 0 })));
  };

  const handleSaveNewProduct = (
    newProduct: DigitalProduct,
    initialCredentials: VaultCredential[]
  ) => {
    setProducts((prev) => [newProduct, ...prev]);
    if (initialCredentials.length > 0) {
      commitVault((prev) => [...initialCredentials, ...prev]);
    }
    void persistAdminProduct(newProduct).then((ok) => {
      if (!ok) showToast('Saved locally — DB write failed.');
    });
    setActiveTab('products');
    showToast(`Published "${newProduct.name}" (${newProduct.variants.length} options).`);
  };

  const handleUpdateProduct = (
    product: DigitalProduct,
    newCredentials: VaultCredential[],
  ) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    if (newCredentials.length > 0) {
      commitVault((prev) => [...newCredentials, ...prev]);
    }
    showToast(`Saved "${product.name}" (${product.variants.length} options).`);
    void persistAdminProduct(product).then((ok) => {
      if (!ok) showToast('DB write failed — changes may not survive refresh.');
    });
  };

  const handleWarrantiesChange = (next: WarrantyPlan[]) => {
    setWarranties(next);
    void persistAdminTaxonomies({ warranties: next });
  };

  const handleCredentialSchemesChange = (next: CredentialScheme[]) => {
    setCredentialSchemes(next);
    void persistAdminTaxonomies({ credentialSchemes: next });
  };

  const handleProductCategoriesChange = (next: ProductCategory[]) => {
    setProductCategories(next);
    void persistAdminTaxonomies({ productCategories: next });
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
    openNavGroup('vault');
    setActiveTab('vault-manual');
  };

  const handleAddCredentials = (newItems: VaultCredential[]) => {
    commitVault((prev) => [...newItems, ...prev]);
    showToast(
      newItems.length === 1
        ? 'Added 1 credential.'
        : `Added ${newItems.length} credentials.`
    );
  };

  const handleDeleteCredential = (id: string) => {
    commitVault((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed credential.');
  };

  const handleUpdateCredential = (next: VaultCredential) => {
    commitVault((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    showToast('Credential updated.');
  };

  const openVaultViewPage = (id: string) => {
    router.push(`/admin/vault/view?id=${encodeURIComponent(id)}`);
  };

  const openVaultEditPage = (id: string) => {
    router.push(`/admin/vault/edit?id=${encodeURIComponent(id)}`);
  };

  const handleAddMediaAsset = (asset: MediaAsset) => {
    commitMedia((prev) => [asset, ...prev]);
    showToast(`Added "${asset.name}" to Media Library.`);
  };

  const handleDeleteMediaAsset = (id: string) => {
    const asset = mediaAssets.find((a) => a.id === id);
    commitMedia((prev) => prev.filter((a) => a.id !== id));
    showToast('Removed file from Media Library.');
    if (asset?.url?.startsWith('/uploads/media/')) {
      void fetch('/api/admin/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: asset.url }),
      });
    }
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
    let linkedVaultCredentialId = payload.vaultCredentialId;

    if (payload.vaultCredentialId && targetDelivery) {
      commitVault((prev) =>
        prev.map((v) =>
          v.id === payload.vaultCredentialId
            ? {
                ...v,
                status: 'delivered',
                assignedOrderId: targetDelivery.orderId,
                assignedBuyerEmail: targetDelivery.buyerEmail,
                noteBBCode: payload.customAdminNote.trim() || v.noteBBCode,
              }
            : v
        )
      );
    } else if (targetDelivery) {
      // Custom Input — also write Vault so history matches stock deliveries
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const addedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      linkedVaultCredentialId = `vlt-${Date.now()}`;
      const newVaultItem: VaultCredential = {
        id: linkedVaultCredentialId,
        productId: targetDelivery.productId,
        productName: targetDelivery.productName,
        variantId: targetDelivery.variantId,
        variantName: targetDelivery.variantName,
        credentialType: targetDelivery.credentialType,
        secretValue: payload.secretValue,
        email: payload.email,
        password: payload.password,
        profilePin: payload.profilePin,
        noteBBCode: payload.customAdminNote.trim() || undefined,
        status: 'delivered',
        batchNote: isWarrantyReplacement
          ? 'Custom warranty swap'
          : 'Custom delivery',
        addedAt,
        assignedOrderId: targetDelivery.orderId,
        assignedBuyerEmail: targetDelivery.buyerEmail,
      };
      commitVault((prev) => [newVaultItem, ...prev]);
    }

    // Mark linked plan active once credential is sent
    if (targetDelivery) {
      commitSubscribers((prev) =>
        prev.map((u) => {
          if (
            u.email.toLowerCase() === targetDelivery.buyerEmail.toLowerCase() ||
            u.name.toLowerCase() === targetDelivery.buyerName.toLowerCase()
          ) {
            return {
              ...u,
              activeSubscriptions: u.activeSubscriptions.map((sub) =>
                sub.orderId === targetDelivery.orderId ||
                sub.deliveryId === targetDelivery.id
                  ? { ...sub, status: 'active' as const }
                  : sub
              ),
            };
          }
          return u;
        })
      );
    }

    const stampNow = (() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    })();
    const assignedDay = stampNow.slice(0, 10);
    const validDays = targetDelivery?.credentialValidDays ?? 30;
    const vaultForCap = linkedVaultCredentialId
      ? vault.find((v) => v.id === linkedVaultCredentialId)
      : undefined;
    const credExpires = cappedCredentialExpiresAt(
      assignedDay,
      validDays,
      vaultForCap?.expiresAt,
    );
    const wasRenewal = Boolean(targetDelivery?.renewalPending);

    commitDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== deliveryId) return d;
        const previousSecret = d.credentialPayload.secretValue?.trim() || '';
        const isReplace =
          isWarrantyReplacement || Boolean(previousSecret);
        const auditAction = wasRenewal
          ? ('renewed' as const)
          : isReplace
            ? ('replaced' as const)
            : ('assigned' as const);
        const auditEntry = {
          id: `aud-${Date.now()}`,
          at: stampNow,
          action: auditAction,
          source: (payload.vaultCredentialId ? 'vault' : 'custom') as
            | 'vault'
            | 'custom',
          secretValue: payload.secretValue,
          previousSecretValue: previousSecret || undefined,
          vaultCredentialId: linkedVaultCredentialId,
          note: payload.customAdminNote.trim() || undefined,
          credentialExpiresAt: credExpires,
        };
        return {
          ...d,
          status: isWarrantyReplacement ? 'replaced' : 'delivered',
          deliveredAt: stampNow,
          vaultCredentialId: linkedVaultCredentialId,
          credentialPayload: {
            secretValue: payload.secretValue,
            email: payload.email,
            password: payload.password,
            profilePin: payload.profilePin,
            vaultCredentialId: linkedVaultCredentialId,
          },
          vpnRequired: payload.vpnRequired,
          vpnRegionNote: payload.vpnRegionNote,
          warrantyRemainingDays: payload.warrantyDays,
          replacementHistoryCount: isReplace
            ? d.replacementHistoryCount + 1
            : d.replacementHistoryCount,
          customAdminNote: payload.customAdminNote,
          warrantyClaimReason: undefined,
          credentialAssignedAt: assignedDay,
          credentialExpiresAt: credExpires,
          credentialClearedAt: undefined,
          renewalPending: false,
          credentialAudit: [auditEntry, ...(d.credentialAudit || [])],
        };
      })
    );

    showToast(
      isWarrantyReplacement
        ? `Replaced credential for ${deliveryId}.`
        : `Delivered credential for ${deliveryId}.`
    );
  };

  const handleAddCustomer = (newCustomer: SubscriberUser) => {
    commitSubscribers((prev) => [newCustomer, ...prev]);
    setSelectedCustomerId(newCustomer.id);
    setActiveTab('user-detail');
    showToast(`Added customer "${newCustomer.name}".`);
  };

  const handleCreateOrderDelivery = (
    userId: string,
    productId: string,
    variantId: string,
    amountBDT?: number,
    quantity = 1,
  ) => {
    const prod = products.find((p) => p.id === productId);
    const variant = prod?.variants.find((v) => v.id === variantId);
    if (!prod || !variant) return;

    const qty = Math.max(1, Math.min(100, Math.round(quantity) || 1));
    void amountBDT; // order value lives on the delivery; no fake payment row

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const expires = new Date(now);
    expires.setDate(expires.getDate() + (variant.durationDays || 30));
    const expiresAt = `${expires.getFullYear()}-${pad(expires.getMonth() + 1)}-${pad(expires.getDate())}`;
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const orderId = `ORD-${Math.floor(89000 + Math.random() * 900)}`;
    const baseDlv = Math.floor(9200 + Math.random() * 700);
    const customer = subscribers.find((u) => u.id === userId);

    const stockPool = vault.filter(
      (v) =>
        v.productId === prod.id &&
        v.variantId === variant.id &&
        v.status === 'available',
    );
    const assignedVaultIds: string[] = [];
    const unitVault: Array<(typeof vault)[number] | null> = [];
    for (let i = 0; i < qty; i++) {
      const item = stockPool[i] || null;
      unitVault.push(item);
      if (item) assignedVaultIds.push(item.id);
    }

    if (assignedVaultIds.length > 0) {
      const idSet = new Set(assignedVaultIds);
      commitVault((prev) =>
        prev.map((v) =>
          idSet.has(v.id)
            ? {
                ...v,
                status: 'delivered' as const,
                assignedOrderId: orderId,
                assignedBuyerEmail: customer?.email || '',
              }
            : v,
        ),
      );
    }

    const newDeliveries: DigitalDelivery[] = [];
    const newSubs: SubscriberUser['activeSubscriptions'] = [];

    for (let i = 0; i < qty; i++) {
      const unitIndex = i + 1;
      const deliveryId =
        qty === 1 ? `DLV-${baseDlv}` : `DLV-${baseDlv}-${unitIndex}`;
      const vaultItem = unitVault[i];
      const instant = Boolean(vaultItem);
      const credExpires = instant
        ? cappedCredentialExpiresAt(
            startedAt,
            variant.durationDays || 30,
            vaultItem?.expiresAt,
          )
        : undefined;

      newSubs.push({
        id: `sub-${Date.now()}-${unitIndex}`,
        orderId,
        deliveryId,
        productName: prod.name,
        variantName: variant.name,
        credentialType: variant.credentialType,
        startedAt,
        expiresAt,
        remainingDays: variant.durationDays || 30,
        autoRenew: true,
        warrantyActive: variant.hasWarranty,
        status: instant ? 'active' : 'pending_credential',
      });

      if (!customer) continue;

      newDeliveries.push({
        id: deliveryId,
        orderId,
        createdAt: stamp,
        buyerName: customer.name,
        buyerEmail: customer.email,
        buyerPhone: customer.phone,
        productId: prod.id,
        productName: prod.name,
        variantId: variant.id,
        variantName: variant.name,
        credentialType: variant.credentialType,
        deliveryMode: variant.deliveryMode,
        status: instant ? 'delivered' : 'pending_dispatch',
        deliveredAt: instant ? stamp : undefined,
        vaultCredentialId: vaultItem?.id,
        credentialPayload: instant
          ? {
              secretValue: vaultItem?.secretValue || '',
              email: vaultItem?.email,
              password: vaultItem?.password,
              profilePin: vaultItem?.profilePin,
              vaultCredentialId: vaultItem?.id,
            }
          : { secretValue: '' },
        vpnRequired: variant.vpnRequired,
        vpnRegionNote: variant.vpnRegionNote,
        hasWarranty: variant.hasWarranty,
        warrantyDays: variant.warrantyDays,
        warrantyRemainingDays: variant.warrantyDays,
        warrantyTerms: variant.warrantyTerms,
        replacementHistoryCount: 0,
        loginInstructions: variant.loginInstructions || [],
        customAdminNote: '',
        credentialValidDays: variant.durationDays || 30,
        orderExpiresAt: expiresAt,
        credentialAssignedAt: instant ? startedAt : undefined,
        credentialExpiresAt: credExpires,
        renewalPending: false,
        pinned: false,
        orderQuantity: qty,
        unitIndex,
        credentialAudit:
          instant && vaultItem
            ? [
                {
                  id: `aud-${deliveryId}-1`,
                  at: stamp,
                  action: 'assigned',
                  source: 'vault',
                  secretValue: vaultItem.secretValue,
                  vaultCredentialId: vaultItem.id,
                  credentialExpiresAt: credExpires,
                },
              ]
            : [],
        unreadChatCount: 0,
        chatMessages: [],
      });
    }

    // No fake payment — Payments stay empty until real TrxID is recorded.
    commitSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              ordersCount: u.ordersCount + 1,
              activeSubscriptions: [...newSubs, ...u.activeSubscriptions],
            }
          : u,
      ),
    );

    if (customer && newDeliveries.length > 0) {
      commitDeliveries((prev) => [...newDeliveries, ...prev]);
      const sent = assignedVaultIds.length;
      showToast(
        sent === qty
          ? `Order ${orderId} · ${qty} sent`
          : sent > 0
            ? `Order ${orderId} · ${sent}/${qty} sent, ${qty - sent} pending`
            : `Order ${orderId} · ${qty} pending`,
      );
    } else {
      showToast(`Order ${orderId} · ${qty} unit${qty > 1 ? 's' : ''}`);
    }
  };

  /**
   * Renew = payment under the SAME order (no new ORD).
   * Extends order window. Does NOT swap a still-valid credential —
   * lifecycle sweep reuses / instant-delivers / waits when the window ends.
   */
  const handleRenewSubscription = (
    userId: string,
    subId: string,
    amountBDT?: number,
    paymentMeta?: {
      gateway: PaymentTransaction['gateway'];
      trxId: string;
      senderNumberOrRef?: string;
    },
  ) => {
    const user = subscribers.find((u) => u.id === userId);
    const sub = user?.activeSubscriptions.find((s) => s.id === subId);
    if (!user || !sub) return;

    const trxId = paymentMeta?.trxId?.trim();
    const gateway = paymentMeta?.gateway;
    if (!trxId || !gateway) {
      showToast('Renew needs gateway + TrxID.');
      return;
    }

    const delivery =
      deliveries.find((d) => d.id === sub.deliveryId) ||
      deliveries.find((d) => d.orderId === sub.orderId);
    const validDays = delivery?.credentialValidDays ?? 30;
    const orderId = sub.orderId || delivery?.orderId || `ORD-${Date.now()}`;
    const stamp = formatStamp();
    const today = todayYmd();
    const baseExpiry =
      delivery?.orderExpiresAt || sub.expiresAt || today;
    const newOrderExpiry = addDaysYmd(
      baseExpiry < today ? today : baseExpiry,
      validDays,
    );
    const charged =
      typeof amountBDT === 'number' && amountBDT > 0 ? Math.round(amountBDT) : 0;
    const stillHasCred = Boolean(
      delivery?.credentialPayload?.secretValue?.trim(),
    );

    const payment: PaymentTransaction = {
      id: `pay-ren-${Date.now()}`,
      orderId,
      buyerName: user.name,
      buyerEmail: user.email,
      productSummary: `${sub.productName} — ${sub.variantName} (renewal)`,
      amountBDT: charged,
      gateway,
      senderNumberOrRef:
        paymentMeta.senderNumberOrRef?.trim() ||
        user.phone.replace(/\s/g, '') ||
        '',
      trxId,
      status: 'verified',
      createdAt: stamp,
      kind: 'renewal',
      deliveryId: delivery?.id,
    };

    commitPayments((prev) => [payment, ...prev]);

    let nextDeliveries = deliveries;
    let nextVault = vault;

    if (delivery) {
      nextDeliveries = deliveries.map((d) =>
        d.id === delivery.id
          ? {
              ...d,
              renewalPending: true,
              orderExpiresAt: newOrderExpiry,
            }
          : d,
      );
      // If window already over / empty — resolve reuse / instant / pending now
      const life = runCredentialLifecycle(nextDeliveries, vault);
      nextDeliveries = life.deliveries;
      nextVault = life.vault;
      commitDeliveries(() => nextDeliveries);
      if (life.changed) commitVault(() => nextVault);
    }

    const after = nextDeliveries.find((d) => d.id === delivery?.id);
    const resolvedInstant =
      after &&
      !after.renewalPending &&
      Boolean(after.credentialPayload?.secretValue?.trim());

    commitSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              totalSpentBDT: u.totalSpentBDT + (charged || 0),
              activeSubscriptions: u.activeSubscriptions.map((s) =>
                s.id === subId
                  ? {
                      ...s,
                      expiresAt: newOrderExpiry,
                      remainingDays: Math.max(
                        0,
                        Math.round(
                          (new Date(newOrderExpiry).getTime() -
                            new Date(today).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                      ),
                      warrantyActive: true,
                      status:
                        resolvedInstant || stillHasCred
                          ? ('active' as const)
                          : ('pending_credential' as const),
                    }
                  : s,
              ),
            }
          : u,
      ),
    );

    if (stillHasCred && after?.renewalPending) {
      showToast(
        `Renewal under ${orderId} — current credential stays until ${delivery?.credentialExpiresAt || 'window end'}.`,
      );
    } else if (resolvedInstant) {
      showToast(`Renewal under ${orderId} — credential updated instantly.`);
    } else {
      showToast(
        `Renewal under ${orderId} — no stock; assign a credential.`,
      );
    }
  };

  const handleToggleUserStatus = (userId: string) => {
    commitSubscribers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
          : u
      )
    );
    showToast('Updated account status.');
  };

  const handleUpdateCustomer = (
    userId: string,
    patch: Partial<
      Pick<
        SubscriberUser,
        'name' | 'email' | 'phone' | 'joinedAt' | 'role' | 'status'
      >
    >,
  ) => {
    commitSubscribers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    );
    showToast('Customer profile saved.');
  };

  const handleVerifyPayment = (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    commitPayments((prev) =>
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
    commitPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: nextStatus } : p))
    );
    showToast(`Marked payment ${paymentId} as ${nextStatus}.`);
  };

  const handleAddCoupon = (coupon: CouponCode) => {
    commitCoupons((prev) => [coupon, ...prev]);
    showToast(`Created coupon ${coupon.code}.`);
  };

  const handleToggleCoupon = (couponId: string) => {
    commitCoupons((prev) =>
      prev.map((c) =>
        c.id === couponId
          ? { ...c, status: c.status === 'active' ? 'disabled' : 'active' }
          : c
      )
    );
  };

  const handleToggleFeature = (id: string) => {
    commitFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    showToast('Updated feature state.');
  };

  const handleTogglePinOrder = (deliveryId: string) => {
    commitDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, pinned: !d.pinned } : d,
      ),
    );
    const next = deliveries.find((d) => d.id === deliveryId);
    showToast(
      next?.pinned ? 'Order unpinned.' : 'Order pinned for follow-up.',
    );
  };

  const pendingDeliveriesBadge = deliveries.filter(
    (d) =>
      d.status === 'pending_dispatch' ||
      d.status === 'warranty_claim' ||
      d.renewalPending ||
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
        { id: 'warranties', label: 'Warranties' },
        { id: 'credential-types', label: 'Credential Types' },
        { id: 'categories', label: 'Categories' },
      ],
    },
    {
      id: 'vault',
      label: 'Credentials',
      shortLabel: 'Credentials',
      icon: Database,
      count: availableVaultBadge,
      subItems: [
        { id: 'vault', label: 'Inventory' },
        { id: 'vault-manual', label: 'Manual Add' },
        { id: 'vault-bulk', label: 'Bulk Import' },
      ],
    },
    {
      id: 'deliveries',
      label: 'Orders',
      shortLabel: 'Orders',
      icon: Send,
      count: pendingDeliveriesBadge,
      subItems: [
        { id: 'deliveries', label: 'All Orders' },
        { id: 'orders-renewals', label: 'Renewals' },
        { id: 'orders-pinned', label: 'Pinned' },
        { id: 'warranty-claims', label: 'Warranty Claims' },
      ],
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
    if (
      item.id === 'vault' &&
      (activeTab === 'vault-view' ||
        activeTab === 'vault-edit' ||
        activeTab === 'vault-manual' ||
        activeTab === 'vault-bulk')
    ) {
      return true;
    }
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

  const openNavGroup = (
    groupId: 'products' | 'vault' | 'users' | 'deliveries' | null,
  ) => {
    setExpandedGroups({
      products: groupId === 'products',
      vault: groupId === 'vault',
      users: groupId === 'users',
      deliveries: groupId === 'deliveries',
    });
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const nextOpen = !prev[groupId];
      return {
        products: groupId === 'products' ? nextOpen : false,
        vault: groupId === 'vault' ? nextOpen : false,
        users: groupId === 'users' ? nextOpen : false,
        deliveries: groupId === 'deliveries' ? nextOpen : false,
      };
    });
  };

  // Collapse unrelated submenus when route changes (Orders, Media, …).
  useEffect(() => {
    const open = navGroupForTab(activeTab);
    setExpandedGroups({
      products: open === 'products',
      vault: open === 'vault',
      users: open === 'users',
      deliveries: open === 'deliveries',
    });
  }, [activeTab]);

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
              className="w-full h-9 pl-8 pr-12 text-sm bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 rounded-lg focus:outline-none focus:border-emerald-600"
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
            <div className="admin-section-label px-2.5 text-[11px] uppercase mb-2">
              Main menu
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
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                          active
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
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

                      {hasSubs && (isExpanded || active) && (
                        <div className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5 py-0.5">
                          {item.subItems?.map((sub) => {
                            const subActive =
                              activeTab === sub.id ||
                              (sub.id === 'vault' &&
                                (activeTab === 'vault-view' ||
                                  activeTab === 'vault-edit')) ||
                              (sub.id === 'users' &&
                                activeTab === 'user-detail') ||
                              (sub.id === 'deliveries' &&
                                activeTab === 'deliveries' &&
                                item.id === 'deliveries');
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab(sub.id);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                                  subActive
                                    ? 'text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50/60 dark:bg-emerald-950/40'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
            <div className="admin-section-label px-2.5 text-[11px] uppercase mb-2">
              Tools
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        active
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
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
                  Orders Queue
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
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Admin Console
              </span>
              <span className="text-slate-400" aria-hidden>
                /
              </span>
              <span className="admin-crumb-current">
                {adminTabLabel(activeTab, {
                  productEdit:
                    activeTab === 'product-add' &&
                    Boolean(searchParams.get('productId')),
                  orderChat:
                    isOrdersAdminTab(activeTab) &&
                    Boolean(selectedChatDeliveryId),
                })}
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
                      Orders →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-22 md:pb-8 max-w-[1440px] w-full mx-auto">
          {!catalogHydrated ? null : (
          <AdminViewRouter
            activeTab={activeTab}
            searchParams={searchParams}
            setActiveTab={setActiveTab}
            openProductOptionPage={openProductOptionPage}
            openProductEditPage={openProductEditPage}
            products={products}
            warranties={warranties}
            onWarrantiesChange={handleWarrantiesChange}
            credentialSchemes={credentialSchemes}
            onCredentialSchemesChange={handleCredentialSchemesChange}
            productCategories={productCategories}
            onProductCategoriesChange={handleProductCategoriesChange}
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
            handleUpdateCredential={handleUpdateCredential}
            handleAddCredentials={handleAddCredentials}
            openVaultViewPage={openVaultViewPage}
            openVaultEditPage={openVaultEditPage}
            handleSelectChatDelivery={handleSelectChatDelivery}
            handleSendOrderChatMessage={handleSendOrderChatMessage}
            handleSimulateBuyerMessage={handleSimulateBuyerMessage}
            handleFulfillDelivery={handleFulfillDelivery}
            handleTogglePinOrder={handleTogglePinOrder}
            handleSelectTicket={handleSelectTicket}
            handleReplyTicket={handleReplyTicket}
            handleUpdateTicketStatus={handleUpdateTicketStatus}
            handleUpdateTicketPriority={handleUpdateTicketPriority}
            handleCreateTicket={handleCreateTicket}
            handleSimulateBuyerTicketReply={handleSimulateBuyerTicketReply}
            handleOpenOrderChatFromTicket={handleOpenOrderChatFromTicket}
            handleAddCustomer={handleAddCustomer}
            handleRenewSubscription={handleRenewSubscription}
            handleAssignSubscription={handleCreateOrderDelivery}
            handleToggleUserStatus={handleToggleUserStatus}
            handleUpdateCustomer={handleUpdateCustomer}
            handleAddMediaAsset={handleAddMediaAsset}
            handleDeleteMediaAsset={handleDeleteMediaAsset}
            handleRejectOrRefundPayment={handleRejectOrRefundPayment}
            handleAddCoupon={handleAddCoupon}
            handleToggleCoupon={handleToggleCoupon}
            handleToggleFeature={handleToggleFeature}
          />
          )}
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
              { id: 'warranties' as AdminTab, label: 'Product — Warranties' },
              {
                id: 'credential-types' as AdminTab,
                label: 'Product — Credential Types',
              },
              { id: 'categories' as AdminTab, label: 'Product — Categories' },
              { id: 'vault' as AdminTab, label: 'Credentials — Inventory' },
              { id: 'vault-manual' as AdminTab, label: 'Credentials — Manual Add' },
              { id: 'vault-bulk' as AdminTab, label: 'Credentials — Bulk Import' },
              { id: 'vault-view' as AdminTab, label: 'Credentials — View' },
              { id: 'vault-edit' as AdminTab, label: 'Credentials — Edit' },
              { id: 'deliveries' as AdminTab, label: 'Orders & Order Chat' },
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
