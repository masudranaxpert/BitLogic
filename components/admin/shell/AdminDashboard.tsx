'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  CheckCircle2,
  ArrowUpRight,
  MessageSquare,
  ShieldAlert,
  Check,
} from 'lucide-react';
import {
  canAccessAdminTab,
  type StaffPermissionKey,
} from '@/lib/auth/permissions';
import { ROLES } from '@/lib/auth/roles';
import {
  fetchAdminWorkspace,
  getCachedAdminWorkspace,
  setCachedAdminWorkspace,
  getCachedConsoleUser,
  setCachedConsoleUser,
  hasPendingAdminSaves,
  persistAdminProduct,
  persistAdminTaxonomies,
  persistAdminWorkspace,
} from '@/lib/admin/workspace-client';
import { persistPlanActive, persistProductActive } from '@/lib/admin/catalog-client';
import {
  AdminTab,
  DigitalProduct,
  ProductVariant,
  VaultCredential,
  DigitalDelivery,
  SubscriberUser,
  PaymentTransaction,
  CouponCode,
  MediaAsset,
  AdminSupportTicket,
  AdminNotificationItem,
  AdminChatAttachment,
  WarrantyPlan,
  CredentialScheme,
  ProductCategory,
} from '@/lib/admin-data';
import { ModalShell } from '@/components/admin/ui/primitives';
import { AdminContextualSkeleton } from '@/components/admin/ui/AdminSkeleton';
import { CommandPalette } from '@/components/admin/shell/CommandPalette';
import { parseStamp, warrantyWindow } from '@/lib/warranty';
import { BrandLogo } from '@/components/brand/BrandLogo';
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
import { applyRefundOrder } from '@/lib/admin/apply-refund-order';
import type { ConsoleUser } from '@/components/admin/shell/admin-nav-types';
import { buildAdminNavMenus } from '@/components/admin/shell/admin-nav-config';
import { AdminNotificationsPanel } from '@/components/admin/shell/AdminNotificationsPanel';
import {
  AdminMobileBottomNav,
  AdminSidebarNav,
} from '@/components/admin/shell/AdminSidebarNav';

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathToAdminTab(pathname);

  const [consoleUser, setConsoleUser] = useState<ConsoleUser | null>(null);
  const lastNonProfileTabRef = useRef<AdminTab>('overview');
  useEffect(() => {
    if (activeTab !== 'profile') {
      lastNonProfileTabRef.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    const cached = getCachedConsoleUser();
    if (cached) setConsoleUser(cached);
    let cancelled = false;
    void fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.user) {
          const u = d.user as ConsoleUser;
          setConsoleUser(u);
          setCachedConsoleUser(u);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canOpenTab = (tab: AdminTab) => {
    if (!consoleUser) return true;
    if (consoleUser.isFullAdmin) return true;
    return canAccessAdminTab(
      ROLES.STAFF,
      consoleUser.permissions,
      tab,
    );
  };

  // Old /admin/deliveries → canonical Orders URL
  useEffect(() => {
    const normalized = pathname.replace(/\/$/, '') || '/admin';
    if (normalized === '/admin/deliveries') {
      const id = searchParams.get('id');
      router.replace(id ? `/admin/orders?id=${encodeURIComponent(id)}` : '/admin/orders');
    }
  }, [pathname, router, searchParams]);

  // Staff landed on a forbidden tab → send them to the first allowed area.
  useEffect(() => {
    if (!consoleUser || consoleUser.isFullAdmin) return;
    if (canAccessAdminTab(ROLES.STAFF, consoleUser.permissions, activeTab)) {
      return;
    }
    const fallback: AdminTab[] = [
      'overview',
      'deliveries',
      'tickets',
      'payments',
      'products',
      'vault',
      'users',
      'media',
      'features',
      'email',
      'contact',
      'storefront',
      'suppliers',
    ];
    const next =
      fallback.find((t) =>
        canAccessAdminTab(ROLES.STAFF, consoleUser.permissions, t),
      ) || 'overview';
    router.replace(adminTabToPath(next));
  }, [consoleUser, activeTab, router]);

  // Customer detail lives in the URL (?id=) so refresh, back and deep links open the right person.
  const pendingCustomerIdRef = useRef<string | null>(null);
  const setActiveTab = (tab: AdminTab) => {
    const onStaff =
      activeTab === 'staff-add' ||
      activeTab === 'staff-logins' ||
      activeTab === 'staff-actions' ||
      activeTab === 'staff-view';
    const id =
      tab === 'user-detail'
        ? pendingCustomerIdRef.current
        : (tab === 'staff-logins' || tab === 'staff-actions' || tab === 'staff-view') && onStaff
          ? searchParams.get('id')
          : null;
    pendingCustomerIdRef.current = null;
    router.push(id ? `${adminTabToPath(tab)}?id=${encodeURIComponent(id)}` : adminTabToPath(tab));
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

  /** View opens the dedicated read-only product detail page. */
  const openProductViewPage = (productId: string, variantId?: string) => {
    const params = new URLSearchParams({ productId });
    if (variantId) params.set('variantId', variantId);
    router.push(`/admin/products/view?${params.toString()}`);
  };

  /** Accordion: only the active section’s submenu stays open. */
  const navGroupForTab = (
    tab: AdminTab,
  ):
    | 'products'
    | 'vault'
    | 'users'
    | 'deliveries'
    | 'payments'
    | 'email'
    | 'suppliers'
    | 'security'
    | 'activity'
    | 'staff'
    | null => {
    if (
      tab === 'products' ||
      tab === 'product-add' ||
      tab === 'product-view' ||
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
      tab === 'payments' ||
      tab === 'payment-methods' ||
      tab === 'payment-devices' ||
      tab === 'payment-logs' ||
      tab === 'coupons'
    ) {
      return 'payments';
    }
    if (
      tab === 'deliveries' ||
      tab === 'order-add' ||
      tab === 'orders-pinned' ||
      tab === 'orders-renewals' ||
      tab === 'warranty-claims'
    ) {
      return 'deliveries';
    }
    if (tab === 'email' || tab === 'email-templates' || tab === 'email-triggers') {
      return 'email';
    }
    if (
      tab === 'suppliers' ||
      tab === 'supplier-catalog' ||
      tab === 'supplier-links' ||
      tab === 'supplier-orders' ||
      tab === 'supplier-settings'
    ) {
      return 'suppliers';
    }
    if (
      tab === 'security' ||
      tab === 'security-ips' ||
      tab === 'security-audit' ||
      tab === 'security-rules'
    ) {
      return 'security';
    }
    if (
      tab === 'activity' ||
      tab === 'activity-payments' ||
      tab === 'activity-orders' ||
      tab === 'activity-catalog' ||
      tab === 'activity-customers' ||
      tab === 'activity-logins' ||
      tab === 'activity-system'
    ) {
      return 'activity';
    }
    if (
      tab === 'staff' ||
      tab === 'staff-add' ||
      tab === 'staff-logins' ||
      tab === 'staff-actions' ||
      tab === 'staff-view'
    ) {
      return 'staff';
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
      payments: open === 'payments',
      email: open === 'email',
      suppliers: open === 'suppliers',
      security: open === 'security',
      activity: open === 'activity',
      staff: open === 'staff',
    };
  });

  // Ensure the active tab's parent group remains expanded whenever the URL/tab changes
  useEffect(() => {
    const grp = navGroupForTab(activeTab);
    if (grp) {
      setExpandedGroups((prev) => (prev[grp] ? prev : { ...prev, [grp]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkModeState] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [warranties, setWarranties] = useState<WarrantyPlan[]>([]);
  const [credentialSchemes, setCredentialSchemes] = useState<CredentialScheme[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [catalogHydrated, setCatalogHydrated] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [vault, setVaultState] = useState<VaultCredential[]>([]);
  const [deliveries, setDeliveriesState] = useState<DigitalDelivery[]>([]);
  const [tickets, setTicketsState] = useState<AdminSupportTicket[]>([]);
  const [adminNotifications, setAdminNotificationsState] = useState<AdminNotificationItem[]>([]);
  const [subscribers, setSubscribersState] = useState<SubscriberUser[]>([]);
  const [payments, setPaymentsState] = useState<PaymentTransaction[]>([]);
  const [coupons, setCouponsState] = useState<CouponCode[]>([]);
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

  const selectedCustomerId = searchParams.get('id');
  const setSelectedCustomerId = (id: string | null) => {
    pendingCustomerIdRef.current = id;
  };
  const [activePortalUserId] = useState<string>('');

  const [preselectedVaultTarget, setPreselectedVaultTarget] = useState<{
    productId: string;
    variantId: string;
  } | null>(null);

  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem('blumart_admin_dark') === '1';
    } catch {
      saved = document.documentElement.classList.contains('dark');
    }
    document.documentElement.classList.toggle('dark', saved);
    setDarkModeState(saved);
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const setDarkMode = (next: boolean) => {
    setDarkModeState(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('blumart_admin_dark', next ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  };

  const applyWorkspace = (
    workspace: NonNullable<Awaited<ReturnType<typeof fetchAdminWorkspace>>>,
  ) => {
    setCachedAdminWorkspace(workspace);
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
        setMediaAssetsState(workspace.mediaAssets ?? []);
  };

  /** Re-read everything from the DB (after server-side writes like Add Order). */
  const reloadWorkspace = async () => {
    const workspace = await fetchAdminWorkspace();
    if (workspace) {
      applyWorkspace(workspace);
      setWorkspaceError(false);
      setCatalogHydrated(true);
    }
  };

  // Child panels that write server-side (order notes, no-credential delivery) ask for a refresh.
  useEffect(() => {
    const onReload = () => void reloadWorkspace();
    window.addEventListener('admin:reload-workspace', onReload);
    return () => window.removeEventListener('admin:reload-workspace', onReload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Storefront orders and other tabs write to the DB. Re-sync so a stale list here can
  // never overwrite them (vault stock, chat, order status).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (hasPendingAdminSaves()) return;
      void reloadWorkspace();
    };
    const timer = window.setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full admin workspace from DB (Prisma seed only bootstraps empty DB).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Immediately hydrate from client cache on mount without causing SSR mismatch
      const cached = getCachedAdminWorkspace();
      if (!cancelled && cached) {
        applyWorkspace(cached);
        setCatalogHydrated(true);
      }
      const workspace = await fetchAdminWorkspace();
      if (cancelled) return;
      if (workspace) {
        applyWorkspace(workspace);
        setCatalogHydrated(true);
      } else {
        setWorkspaceError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const commitMedia = (updater: React.SetStateAction<MediaAsset[]>) => {
    setMediaAssetsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      void persistAdminWorkspace({ mediaAssets: next }).then((ok) => {
        if (!ok) showToast('DB write failed — media changes may not survive refresh.');
      });
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleSelectChatDelivery = (deliveryId: string | null) => {
    setSelectedChatDeliveryId(deliveryId);

    const ordersBase = isOrdersAdminTab(activeTab)
      ? adminTabToPath(activeTab)
      : adminTabToPath('deliveries');
    if (deliveryId) {
      router.push(`${ordersBase}?id=${encodeURIComponent(deliveryId)}`);
      const target = deliveries.find((d) => d.id === deliveryId);
      // Chat is marked read when the admin actually opens it (handleMarkOrderChatRead).
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
    // Never fall back to another customer's order.
    const matchedDelivery = deliveries.find((d) => d.orderId === newTicketData.orderId);
    if (!matchedDelivery) {
      showToast(`Order ${newTicketData.orderId} not found.`);
      return;
    }
    const newId = `TCK-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const created: AdminSupportTicket = {
      id: newId,
      subject: newTicketData.subject,
      orderId: newTicketData.orderId,
      deliveryId: matchedDelivery?.id,
      buyerName: matchedDelivery?.buyerName || 'Customer',
      buyerEmail: matchedDelivery.buyerEmail || '',
      buyerPhone: matchedDelivery.buyerPhone || '',
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
    showToast(`Published "${newProduct.name}" (${newProduct.variants.length} plans).`);
  };

  const handleUpdateProduct = (
    product: DigitalProduct,
    newCredentials: VaultCredential[],
  ) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    if (newCredentials.length > 0) {
      commitVault((prev) => [...newCredentials, ...prev]);
    }
    setActiveTab('products');
    showToast(`Saved "${product.name}" (${product.variants.length} plans).`);
    void persistAdminProduct(product).then((ok) => {
      if (!ok) showToast('DB write failed — changes may not survive refresh.');
    });
  };

  const handleWarrantiesChange = (next: WarrantyPlan[]) => {
    setWarranties(next);
    void persistAdminTaxonomies({ warranties: next }).then((ok) => {
      if (!ok) showToast('DB write failed — warranty changes may not survive refresh.');
    });
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
    let updatedProduct: DigitalProduct | undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const nextVariants = [
            ...(variant.isDefault
              ? p.variants.map((v) => ({ ...v, isDefault: false }))
              : p.variants),
            variant,
          ];
          updatedProduct = { ...p, variants: nextVariants };
          return updatedProduct;
        }
        return p;
      })
    );
    if (updatedProduct) {
      void persistAdminProduct(updatedProduct).then((ok) => {
        if (!ok) showToast('DB write failed — changes may not survive refresh.');
      });
    }
    setActiveTab('products');
    showToast(`Added plan "${variant.name}".`);
  };

  const handleUpdateVariant = (productId: string, updatedVariant: ProductVariant) => {
    let updatedProduct: DigitalProduct | undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const nextVariants = p.variants.map((v) => {
            if (v.id === updatedVariant.id) return updatedVariant;
            if (updatedVariant.isDefault) return { ...v, isDefault: false };
            return v;
          });
          updatedProduct = { ...p, variants: nextVariants };
          return updatedProduct;
        }
        return p;
      })
    );
    if (updatedProduct) {
      void persistAdminProduct(updatedProduct).then((ok) => {
        if (!ok) showToast('DB write failed — changes may not survive refresh.');
      });
    }
    setActiveTab('products');
    showToast(`Updated "${updatedVariant.name}".`);
  };

  const handleTogglePlanActive = (
    productId: string,
    variantId: string,
    nextActive: boolean,
  ) => {
    let targetName = variantId;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            if (v.id !== variantId) return v;
            targetName = v.name;
            return { ...v, isActive: nextActive };
          }),
        };
      }),
    );
    showToast(
      `${nextActive ? 'Turned ON' : 'Turned OFF'} plan "${targetName}".`,
    );
    void persistPlanActive(productId, variantId, nextActive).then((ok) => {
      if (!ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id !== productId
              ? p
              : {
                  ...p,
                  variants: p.variants.map((v) =>
                    v.id === variantId ? { ...v, isActive: !nextActive } : v,
                  ),
                },
          ),
        );
        showToast('DB write failed — reverted plan status.');
      }
    });
  };

  const handleToggleProductActive = (
    productId: string,
    nextActive: boolean,
  ) => {
    const nextStatus = nextActive ? 'active' : 'draft';
    const prevStatus = nextActive ? 'draft' : 'active';
    let targetName = productId;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        targetName = p.name;
        return { ...p, status: nextStatus };
      }),
    );
    showToast(
      `${nextActive ? 'Shown' : 'Hidden'} product "${targetName}" on storefront.`,
    );
    void persistProductActive(productId, nextActive).then((ok) => {
      if (!ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id !== productId ? p : { ...p, status: prevStatus },
          ),
        );
        showToast('DB write failed — reverted product visibility.');
      }
    });
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
      linkedVaultCredentialId = `vlt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
          id: `aud-${deliveryId}-${Date.now()}`,
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
          ...(!isWarrantyReplacement ? startWarrantyIfNeeded(d, new Date()) : {}),
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

  /** Create order via server API (same path as Add Order) — no client-side ORD invent. */
  const handleCreateOrderDelivery = (
    userId: string,
    productId: string,
    variantId: string,
    amountBDT?: number,
    quantity = 1,
  ) => {
    const prod = products.find((p) => p.id === productId);
    const variant = prod?.variants.find((v) => v.id === variantId);
    const customer = subscribers.find((u) => u.id === userId);
    if (!prod || !variant || !customer) return;

    const qty = Math.max(1, Math.min(100, Math.round(quantity) || 1));
    const unitPrice =
      amountBDT !== undefined && Number.isFinite(amountBDT)
        ? Math.round(amountBDT / qty)
        : variant.priceBDT;

    void (async () => {
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            items: [
              {
                productId: prod.id,
                planId: variant.id,
                qty,
                unitPriceBdt: unitPrice,
              },
            ],
            paidBdt: 0,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          showToast(data?.error || 'Could not create order.');
          return;
        }
        await reloadWorkspace();
        const pending = (data?.deliveries || []).filter(
          (d: { status: string }) => d.status === 'pending_dispatch',
        ).length;
        const total = data?.deliveries?.length || qty;
        showToast(
          pending === total
            ? `Order ${data.orderId} · ${total} pending assign`
            : pending > 0
              ? `Order ${data.orderId} · ${total - pending}/${total} sent, ${pending} pending`
              : `Order ${data.orderId} · ${total} sent`,
        );
      } catch {
        showToast('Could not create order.');
      }
    })();
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

    const renewProduct = products.find((p) => p.name === sub.productName);
    const renewPlan = renewProduct?.variants.find((v) => v.name === sub.variantName);
    if (renewPlan?.renewable === false) {
      showToast(renewPlan.name + ' is a one-time plan — renewals are disabled.');
      return;
    }
    if (renewProduct?.status === 'draft') {
      showToast(renewProduct.name + ' is not available — renewals are blocked.');
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
      verifiedAt: stamp,
      kind: 'renewal',
      deliveryId: delivery?.id,
      renewDeliveryIds: delivery ? [delivery.id] : undefined,
      periodFrom: baseExpiry < today ? today : addDaysYmd(baseExpiry, 1),
      periodTo: newOrderExpiry,
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
    if (!pay) return;

    const verifiedAt = formatStamp();
    commitPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'verified', verifiedAt } : p))
    );

    // Customer-initiated renewal: extend the window on every live unit of the order.
    if (pay.kind === 'renewal') {
      const today = todayYmd();
      const msg = {
        id: `adm-msg-${Date.now()}-renew`,
        sender: 'admin' as const,
        senderName: 'Support Admin',
        text: `Renewal payment ${pay.trxId} confirmed. ${pay.productSummary.replace(/^Renewal · /, '')} extended.`,
        time: 'Just now',
      };
      // Only the units this payment paid for; each keeps its own plan length and warranty.
      const scope = new Set(pay.renewDeliveryIds || []);
      // The period this payment paid for, recorded on the payment so the order shows it later.
      let periodFrom = '';
      let periodTo = '';
      let next = deliveries.map((d) => {
        if (d.orderId !== pay.orderId) return d;
        const withMsg = { ...d, chatMessages: [...(d.chatMessages || []), msg] };
        if (d.status === 'refunded' || d.status === 'revoked') return withMsg;
        if (scope.size > 0 && !scope.has(d.id)) return withMsg;
        const early = Boolean(d.orderExpiresAt && d.orderExpiresAt >= today);
        const base = early ? (d.orderExpiresAt as string) : today;
        const newEnd = addDaysYmd(base, d.credentialValidDays ?? 30);
        const periodStart = early ? parseStamp(addDaysYmd(base, 1)) ?? new Date() : new Date();
        const fromYmd = early ? addDaysYmd(base, 1) : today;
        if (!periodFrom || fromYmd < periodFrom) periodFrom = fromYmd;
        if (newEnd > periodTo) periodTo = newEnd;
        const w = d.hasWarranty && d.warrantyDays ? warrantyWindow(periodStart, d.warrantyDays, newEnd) : null;
        return {
          ...withMsg,
          orderExpiresAt: newEnd,
          ...(w
            ? early
              ? {
                  nextWarrantyStartsAt: w.startsAt,
                  nextWarrantyEndsAt: w.endsAt,
                  // The running warranty can never outlive its own paid period.
                  ...(d.warrantyEndsAt && d.warrantyEndsAt > `${base} 23:59` ? { warrantyEndsAt: `${base} 23:59` } : {}),
                }
              : {
                  warrantyStartsAt: w.startsAt,
                  warrantyEndsAt: w.endsAt,
                  nextWarrantyStartsAt: undefined,
                  nextWarrantyEndsAt: undefined,
                  warrantyRemainingDays: d.warrantyDays,
                }
            : {}),
          renewalPending: true,
        };
      });
      const life = runCredentialLifecycle(next, vault);
      next = life.deliveries;
      commitDeliveries(() => next);
      if (life.changed) commitVault(() => life.vault);
      if (periodFrom) {
        commitPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, periodFrom, periodTo } : p)),
        );
      }
      showToast(`Renewal verified for ${pay.orderId}.`);
      // Supplier options whose old credential already ended get a fresh one bought now.
      triggerSupplierDispatch(pay.orderId, pay.renewDeliveryIds?.length ? pay.renewDeliveryIds : undefined);
      return;
    }

    const relatedDeliveries = deliveries.filter((d) => d.orderId === pay.orderId);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stampNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const assignedDay = stampNow.slice(0, 10);

    const allocatedVaultIds = new Set<string>();
    const updatedDeliveriesList: DigitalDelivery[] = [];
    let currentVault = [...vault];

    for (const del of relatedDeliveries) {
      if (del.status === 'pending_dispatch' && del.deliveryMode === 'auto_vault') {
        const availableVault = currentVault.find(
          (v) =>
            v.productId === del.productId &&
            v.variantId === del.variantId &&
            v.status === 'available' &&
            !allocatedVaultIds.has(v.id),
        );

        if (availableVault) {
          allocatedVaultIds.add(availableVault.id);

          currentVault = currentVault.map((v) =>
            v.id === availableVault.id
              ? {
                  ...v,
                  status: 'delivered' as const,
                  assignedOrderId: del.orderId,
                  assignedBuyerEmail: del.buyerEmail,
                }
              : v,
          );

          const validDays = del.credentialValidDays ?? 30;
          const credExpires = cappedCredentialExpiresAt(
            assignedDay,
            validDays,
            availableVault.expiresAt,
          );

          const auditEntry = {
            id: `aud-${Date.now()}-${del.id}`,
            at: stampNow,
            action: 'assigned' as const,
            source: 'vault' as const,
            secretValue: availableVault.secretValue,
            vaultCredentialId: availableVault.id,
            credentialExpiresAt: credExpires,
          };

          const newChatMessage = {
            id: `msg-${Date.now()}-${del.id}`,
            sender: 'admin' as const,
            senderName: 'Support',
            text: `Payment ${pay.gateway} (${pay.trxId}) verified! Your credentials have been automatically provisioned.`,
            time: 'Just now',
          };

          updatedDeliveriesList.push({
            ...del,
            ...startWarrantyIfNeeded(del, now),
            status: 'delivered',
            deliveredAt: stampNow,
            vaultCredentialId: availableVault.id,
            credentialPayload: {
              secretValue: availableVault.secretValue,
              email: availableVault.email,
              password: availableVault.password,
              profilePin: availableVault.profilePin,
              vaultCredentialId: availableVault.id,
            },
            credentialAudit: [auditEntry, ...(del.credentialAudit || [])],
            credentialAssignedAt: assignedDay,
            credentialExpiresAt: credExpires,
            chatMessages: [...(del.chatMessages || []), newChatMessage],
          });
          continue;
        }
      }

      // Fallback for manual delivery mode or when auto_vault stock is exhausted
      if (del.status === 'pending_dispatch') {
        const manualNoticeMessage = {
          id: `msg-${Date.now()}-${del.id}`,
          sender: 'admin' as const,
          senderName: 'Support',
          text: `Payment ${pay.gateway} (${pay.trxId}) verified! Your access is being processed by our team.`,
          time: 'Just now',
        };
        updatedDeliveriesList.push({
          ...del,
          chatMessages: [...(del.chatMessages || []), manualNoticeMessage],
        });
      }
    }

    if (updatedDeliveriesList.length > 0) {
      if (allocatedVaultIds.size > 0) {
        commitVault(currentVault);
      }
      commitDeliveries((prev) =>
        prev.map((d) => {
          const updated = updatedDeliveriesList.find((ud) => ud.id === d.id);
          return updated || d;
        }),
      );

      commitSubscribers((prev) =>
        prev.map((u) => {
          if (
            u.email.toLowerCase() === pay.buyerEmail.toLowerCase() ||
            u.name.toLowerCase() === pay.buyerName.toLowerCase()
          ) {
            return {
              ...u,
              activeSubscriptions: u.activeSubscriptions.map((sub) =>
                sub.orderId === pay.orderId
                  ? { ...sub, status: 'active' as const }
                  : sub,
              ),
            };
          }
          return u;
        }),
      );
    }

    const unallocatedCount = relatedDeliveries.length - allocatedVaultIds.size;
    if (unallocatedCount > 0) {
      commitNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'payment' as const,
          orderId: pay.orderId,
          title: `Manual dispatch needed for ${pay.orderId}`,
          message: `Payment verified (${pay.gateway} ${pay.trxId}), but ${unallocatedCount} unit(s) require manual dispatch or restocking.`,
          time: 'Just now',
          read: false,
        },
        ...prev,
      ]);
    }

    if (allocatedVaultIds.size === relatedDeliveries.length && relatedDeliveries.length > 0) {
      showToast(
        `Verified ${pay.gateway} (${pay.trxId}) — auto-allocated ${allocatedVaultIds.size} credential(s).`,
      );
    } else if (allocatedVaultIds.size > 0) {
      showToast(
        `Verified ${pay.gateway} (${pay.trxId}) — auto-allocated ${allocatedVaultIds.size}/${relatedDeliveries.length}. ${unallocatedCount} pending manual dispatch.`,
      );
    } else {
      showToast(
        `Verified ${pay.gateway} (${pay.trxId}) — queued for manual fulfillment.`,
      );
    }
    if (unallocatedCount > 0) triggerSupplierDispatch(pay.orderId);
  };

  /**
   * Units of supplier-sourced options are bought on the server right after verification.
   * The server also sweeps every minute, so a closed tab never leaves a paid order unserved.
   */
  const triggerSupplierDispatch = (orderId: string, deliveryIds?: string[]) => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/suppliers/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dispatch', orderId, deliveryIds }),
        });
        if (!res.ok) return; // no Suppliers permission, or nothing to do
        const data = (await res.json().catch(() => null)) as { results?: Array<{ outcome: string }> } | null;
        const results = (data?.results || []).filter((r) => r.outcome !== 'skipped');
        if (results.length === 0) return;
        await reloadWorkspace();
        const n = (o: string) => results.filter((r) => r.outcome === o).length;
        showToast(
          [
            n('delivered') ? `${n('delivered')} delivered by supplier` : '',
            n('processing') ? `${n('processing')} waiting for supplier` : '',
            n('needs_review') ? `${n('needs_review')} need your review (price)` : '',
            n('failed') ? `${n('failed')} supplier purchase failed` : '',
          ]
            .filter(Boolean)
            .join(' · ') + ` — ${orderId}`,
        );
      } catch {
        /* the server sweep retries */
      }
    })();
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

  /** Starts the warranty clock on first delivery; leaves an existing clock alone. */
  function startWarrantyIfNeeded(d: DigitalDelivery, at: Date): Partial<DigitalDelivery> {
    if (d.warrantyStartsAt || !d.hasWarranty || !d.warrantyDays) return {};
    const w = warrantyWindow(at, d.warrantyDays, d.orderExpiresAt);
    return { warrantyStartsAt: w.startsAt, warrantyEndsAt: w.endsAt, warrantyRemainingDays: d.warrantyDays };
  }

  /** Admin sets when the warranty starts (e.g. 12 hours after delivery). */
  const handleSetWarrantyStart = (deliveryIds: string[], startsAt: string) => {
    const at = parseStamp(startsAt);
    if (!at) return;
    const ids = new Set(deliveryIds);
    commitDeliveries((prev) =>
      prev.map((d) => {
        if (!ids.has(d.id) || !d.hasWarranty || !d.warrantyDays) return d;
        const w = warrantyWindow(at, d.warrantyDays, d.orderExpiresAt);
        // Never overlap a warranty already queued for the next paid period.
        const end =
          d.nextWarrantyStartsAt && w.endsAt > d.nextWarrantyStartsAt ? d.nextWarrantyStartsAt : w.endsAt;
        return { ...d, warrantyStartsAt: w.startsAt, warrantyEndsAt: end };
      }),
    );
    showToast('Warranty start updated.');
  };

  const handleMarkOrderChatRead = (orderId: string) => {
    commitDeliveries((prev) =>
      prev.map((d) => (d.orderId === orderId ? { ...d, unreadChatCount: 0 } : d)),
    );
  };

  /** Refund chosen payments and end access for chosen units; logs a locked-in note. */
  const handleRefundOrder = (req: {
    orderId: string;
    paymentIds: string[];
    revokeDeliveryIds: string[];
    reason: string;
    amountBdt: number;
  }) => {
    const stamp = formatStamp();
    const { nextPayments, nextDeliveries, amount } = applyRefundOrder(
      payments,
      deliveries,
      req,
      stamp,
    );
    setPaymentsState(nextPayments);
    setDeliveriesState(nextDeliveries);

    void (async () => {
      const ok = await persistAdminWorkspace({
        payments: nextPayments,
        deliveries: nextDeliveries,
      });
      await fetch('/api/admin/orders/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: req.orderId,
          text:
            `Refund ${amount > 0 ? 'BDT ' + amount : ''}${req.revokeDeliveryIds.length ? ` · access ended for ${req.revokeDeliveryIds.length} item(s)` : ''}` +
            (req.reason ? ` · ${req.reason}` : ''),
        }),
      });
      if (ok) window.dispatchEvent(new Event('admin:reload-workspace'));
      showToast(
        ok
          ? `Refund recorded for ${req.orderId}.`
          : `Refund saved locally — sync failed, retry refresh.`,
      );
    })();
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

  const handleUpdateDeliveryVpn = (
    deliveryIds: string[],
    patch: { vpnRequired: boolean; vpnRegionNote: string },
  ) => {
    if (deliveryIds.length === 0) return;
    const idSet = new Set(deliveryIds);
    commitDeliveries((prev) =>
      prev.map((d) =>
        idSet.has(d.id)
          ? {
              ...d,
              vpnRequired: patch.vpnRequired,
              vpnRegionNote: patch.vpnRequired ? patch.vpnRegionNote : '',
            }
          : d,
      ),
    );
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

  const pendingDeliveriesBadge = new Set(
    deliveries
      .filter(
        (d) =>
          d.status === 'pending_dispatch' ||
          d.status === 'warranty_claim' ||
          d.renewalPending ||
          (d.unreadChatCount || 0) > 0,
      )
      .map((d) => d.orderId),
  ).size;
  const openTicketsBadge = tickets.filter((t) => t.status === 'open').length;
  const unreadOrderChatsCount = deliveries.reduce(
    (sum, d) => sum + (d.unreadChatCount || 0),
    0
  );
  const pendingPaymentsBadge = payments.filter(
    (p) => p.status === 'pending_verification'
  ).length;
  const availableVaultBadge = vault.filter((v) => v.status === 'available').length;

  const { main: mainMenuItems, tools: toolsMenuItems } = buildAdminNavMenus(
    {
      products: products.length,
      availableVault: availableVaultBadge,
      pendingDeliveries: pendingDeliveriesBadge,
      pendingPayments: pendingPaymentsBadge,
      openTickets: openTicketsBadge,
      subscribers: subscribers.length,
      media: mediaAssets.length,
    },
    { isFullAdmin: Boolean(consoleUser?.isFullAdmin) },
  );

  const visibleMainMenu = mainMenuItems.filter((item) => canOpenTab(item.id));
  const visibleToolsMenu = toolsMenuItems.filter((item) => canOpenTab(item.id));

  const openNavGroup = (
    groupId: 'products' | 'vault' | 'users' | 'deliveries' | 'payments' | null,
  ) => {
    setExpandedGroups({
      products: groupId === 'products',
      vault: groupId === 'vault',
      users: groupId === 'users',
      deliveries: groupId === 'deliveries',
      payments: groupId === 'payments',
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
        payments: groupId === 'payments' ? nextOpen : false,
        email: groupId === 'email' ? nextOpen : false,
        suppliers: groupId === 'suppliers' ? nextOpen : false,
        security: groupId === 'security' ? nextOpen : false,
        activity: groupId === 'activity' ? nextOpen : false,
        staff: groupId === 'staff' ? nextOpen : false,
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
      payments: open === 'payments',
      email: open === 'email',
      suppliers: open === 'suppliers',
      security: open === 'security',
      activity: open === 'activity',
      staff: open === 'staff',
    });
  }, [activeTab]);

  return (
    <div className="admin-console min-h-dvh flex bg-[#f6f8fa] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminSidebarNav
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        visibleMainMenu={visibleMainMenu}
        visibleToolsMenu={visibleToolsMenu}
        activeTab={activeTab}
        expandedGroups={expandedGroups}
        toggleGroupExpand={toggleGroupExpand}
        setActiveTab={setActiveTab}
        pendingDeliveriesBadge={pendingDeliveriesBadge}
        consoleUser={consoleUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenProfile={() => setActiveTab('profile')}
      />

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
            <span className="lg:hidden">
              <BrandLogo size="sm" />
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
                  staffEdit:
                    activeTab === 'staff-add' &&
                    Boolean(searchParams.get('id')),
                  orderChat:
                    isOrdersAdminTab(activeTab) &&
                    Boolean(selectedChatDeliveryId),
                })}
              </span>
            </div>
          </div>

          <AdminNotificationsPanel
            adminNotifications={adminNotifications}
            deliveries={deliveries}
            commitNotifications={commitNotifications}
            commitDeliveries={commitDeliveries}
            commitTickets={commitTickets}
            setActiveTab={setActiveTab}
            handleSelectTicket={handleSelectTicket}
            handleSelectChatDelivery={handleSelectChatDelivery}
          >
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label="Search (Ctrl K)"
              title="Search (Ctrl K)"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 hover:border-emerald-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer sm:min-w-[13rem]"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden flex-1 text-left text-sm text-slate-500 sm:inline">Search…</span>
              <kbd className="hidden rounded border border-slate-200 px-1.5 font-mono text-xs text-slate-500 sm:inline dark:border-slate-700">Ctrl K</kbd>
            </button>
          </AdminNotificationsPanel>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-22 md:pb-8 max-w-[1440px] w-full mx-auto">
          {!catalogHydrated && workspaceError ? (
            <div className="flex items-center gap-3 py-10 text-sm" role="alert">
              <span className="text-rose-600">Could not load data.</span>
              <button
                type="button"
                onClick={() => void reloadWorkspace()}
                className="h-9 rounded-md border border-slate-200 px-3 font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : !catalogHydrated ? (
            <AdminContextualSkeleton tab={activeTab} />
          ) : (
          <AdminViewRouter
            activeTab={activeTab}
            searchParams={searchParams}
            setActiveTab={setActiveTab}
            openProductOptionPage={openProductOptionPage}
            openProductEditPage={openProductEditPage}
            openProductViewPage={openProductViewPage}
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
            handleTogglePlanActive={handleTogglePlanActive}
            handleToggleProductActive={handleToggleProductActive}
            consoleUser={consoleUser}
            onProfileUpdated={(nextUser) => {
              setConsoleUser(nextUser);
              setCachedConsoleUser(nextUser);
            }}
            onProfileBack={() => setActiveTab(lastNonProfileTabRef.current || 'overview')}
            handleDeleteCredential={handleDeleteCredential}
            handleUpdateCredential={handleUpdateCredential}
            handleAddCredentials={handleAddCredentials}
            openVaultViewPage={openVaultViewPage}
            openVaultEditPage={openVaultEditPage}
            handleSelectChatDelivery={handleSelectChatDelivery}
            handleSendOrderChatMessage={handleSendOrderChatMessage}
            handleFulfillDelivery={handleFulfillDelivery}
            handleUpdateDeliveryVpn={handleUpdateDeliveryVpn}
            handleTogglePinOrder={handleTogglePinOrder}
            handleSelectTicket={handleSelectTicket}
            handleReplyTicket={handleReplyTicket}
            handleUpdateTicketStatus={handleUpdateTicketStatus}
            handleUpdateTicketPriority={handleUpdateTicketPriority}
            handleCreateTicket={handleCreateTicket}
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
            reloadWorkspace={reloadWorkspace}
            handleRefundOrder={handleRefundOrder}
            handleMarkOrderChatRead={handleMarkOrderChatRead}
            handleSetWarrantyStart={handleSetWarrantyStart}
            showToast={showToast}
          />
          )}
        </main>

        <AdminMobileBottomNav
          visibleMainMenu={visibleMainMenu}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        pages={[
          { id: 'overview' as AdminTab, label: 'Dashboard' },
          { id: 'deliveries' as AdminTab, label: 'Orders' },
          { id: 'order-add' as AdminTab, label: 'Add order' },
          { id: 'orders-renewals' as AdminTab, label: 'Renewals' },
          { id: 'orders-pinned' as AdminTab, label: 'Pinned orders' },
          { id: 'warranty-claims' as AdminTab, label: 'Warranty claims' },
          { id: 'payments' as AdminTab, label: 'Payments' },
          { id: 'coupons' as AdminTab, label: 'Coupons' },
          { id: 'users' as AdminTab, label: 'Customers' },
          { id: 'user-add' as AdminTab, label: 'Add customer' },
          { id: 'products' as AdminTab, label: 'Products' },
          { id: 'product-add' as AdminTab, label: 'Add product' },
          { id: 'vault' as AdminTab, label: 'Credentials inventory' },
          { id: 'vault-manual' as AdminTab, label: 'Add credentials' },
          { id: 'vault-bulk' as AdminTab, label: 'Bulk import credentials' },
          { id: 'tickets' as AdminTab, label: 'Support tickets' },
          { id: 'warranties' as AdminTab, label: 'Warranties' },
          { id: 'credential-types' as AdminTab, label: 'Credential types' },
          { id: 'categories' as AdminTab, label: 'Categories' },
          { id: 'media' as AdminTab, label: 'Media library' },
          { id: 'features' as AdminTab, label: 'Settings' },
          { id: 'email' as AdminTab, label: 'Email' },
          { id: 'contact' as AdminTab, label: 'Contact' },
          { id: 'storefront' as AdminTab, label: 'Storefront', keywords: 'site title homepage banners' },
          { id: 'suppliers' as AdminTab, label: 'Suppliers', keywords: 'reseller apis' },
          { id: 'supplier-catalog' as AdminTab, label: 'Supplier catalog' },
          { id: 'supplier-links' as AdminTab, label: 'Linked plans' },
          { id: 'supplier-orders' as AdminTab, label: 'Supplier purchases' },
          { id: 'supplier-settings' as AdminTab, label: 'Supplier pricing & rules' },
          ...(consoleUser?.isFullAdmin
            ? [
                { id: 'staff' as AdminTab, label: 'Staff' },
                { id: 'staff-add' as AdminTab, label: 'Add staff' },
              ]
            : []),
        ].filter((p) => canOpenTab(p.id))}
        deliveries={deliveries}
        subscribers={subscribers}
        products={products}
        payments={payments}
        tickets={tickets}
        vault={vault}
        goTab={setActiveTab}
        openOrder={(id) => handleSelectChatDelivery(id)}
        openCustomer={(id) => {
          setSelectedCustomerId(id);
          setActiveTab('user-detail');
        }}
        openProduct={(id) => openProductEditPage(id)}
        openTicket={(id) => {
          setActiveTab('tickets');
          handleSelectTicket(id);
        }}
        openCredential={(id) => openVaultViewPage(id)}
      />

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
