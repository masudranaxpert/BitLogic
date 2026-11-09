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
  UserCog,
  Mail,
  Headset,
  PanelTop,
  Network,
  ShieldAlert,
} from 'lucide-react';
import type { AdminTab } from '@/lib/admin/types';
import type { NavGroupItem } from '@/components/admin/shell/admin-nav-types';

export type AdminNavCounts = {
  products: number;
  availableVault: number;
  pendingDeliveries: number;
  pendingPayments: number;
  openTickets: number;
  subscribers: number;
  media: number;
};

/** Sidebar main + tools menus (counts come from live workspace). */
export function buildAdminNavMenus(
  counts: AdminNavCounts,
  opts: { isFullAdmin: boolean },
): { main: NavGroupItem[]; tools: NavGroupItem[] } {
  const main: NavGroupItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'products',
      label: 'Product',
      shortLabel: 'Product',
      icon: Layers,
      count: counts.products,
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
      count: counts.availableVault,
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
      count: counts.pendingDeliveries,
      subItems: [
        { id: 'deliveries', label: 'All Orders' },
        { id: 'order-add', label: 'Add Order' },
        { id: 'orders-renewals', label: 'Renewals' },
        { id: 'orders-pinned', label: 'Pinned' },
        { id: 'warranty-claims', label: 'Warranty Claims' },
      ],
    },
    {
      id: 'payments',
      label: 'Payments',
      shortLabel: 'Payments',
      icon: CreditCard,
      count: counts.pendingPayments,
      subItems: [
        { id: 'payments', label: 'All Payments' },
        { id: 'payment-methods', label: 'Payment Methods' },
        { id: 'coupons', label: 'Coupons' },
      ],
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      shortLabel: 'Tickets',
      icon: Ticket,
      count: counts.openTickets,
    },
    {
      id: 'users',
      label: 'Customer',
      shortLabel: 'Customer',
      icon: Users,
      count: counts.subscribers,
      subItems: [
        { id: 'users', label: 'All Customers' },
        { id: 'user-add', label: 'Add Customer' },
      ],
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      shortLabel: 'Suppliers',
      icon: Network,
      subItems: [
        { id: 'suppliers', label: 'Connections' },
        { id: 'supplier-catalog', label: 'Catalog' },
        { id: 'supplier-links', label: 'Linked plans' },
        { id: 'supplier-orders', label: 'Purchases' },
        { id: 'supplier-settings', label: 'Pricing & rules' },
      ],
    },
    {
      id: 'media',
      label: 'Media Library',
      shortLabel: 'Media',
      icon: ImageIcon,
      count: counts.media,
    },
  ];

  const tools: NavGroupItem[] = [
    { id: 'features', label: 'Settings', shortLabel: 'Settings', icon: Sliders },
    { id: 'storefront', label: 'Storefront', shortLabel: 'Store', icon: PanelTop },
    {
      id: 'email' as AdminTab,
      label: 'Email',
      shortLabel: 'Email',
      icon: Mail,
      subItems: [
        { id: 'email', label: 'Settings & SMTP' },
        { id: 'email-templates', label: 'Templates & Preview' },
        { id: 'email-triggers', label: 'Auto Triggers' },
      ],
    },
    { id: 'contact', label: 'Contact', shortLabel: 'Contact', icon: Headset },
    {
      id: 'security' as AdminTab,
      label: 'Security & Traffic',
      shortLabel: 'Security',
      icon: ShieldAlert,
      subItems: [
        { id: 'security', label: 'Security Overview' },
        { id: 'security-ips', label: 'IP Access Rules' },
        { id: 'security-audit', label: 'Audit Trail' },
        { id: 'security-rules', label: 'Rate Limit Rules' },
      ],
    },
    ...(opts.isFullAdmin
      ? ([
          {
            id: 'staff' as AdminTab,
            label: 'Staff',
            shortLabel: 'Staff',
            icon: UserCog,
            subItems: [
              { id: 'staff', label: 'All Staff' },
              { id: 'staff-logins', label: 'Staff Logins' },
              { id: 'staff-actions', label: 'Staff Activity' },
            ],
          },
        ] as NavGroupItem[])
      : []),
  ];

  return { main, tools };
}

export function isAdminNavGroupActive(
  item: NavGroupItem,
  activeTab: AdminTab,
): boolean {
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
  if (
    item.id === 'users' &&
    (activeTab === 'user-detail' || activeTab === 'user-add')
  ) {
    return true;
  }
  if (
    item.id === 'security' &&
    (activeTab === 'security' ||
      activeTab === 'security-ips' ||
      activeTab === 'security-audit' ||
      activeTab === 'security-rules')
  ) {
    return true;
  }
  if (
    item.id === 'staff' &&
    (activeTab === 'staff-add' ||
      activeTab === 'staff-logins' ||
      activeTab === 'staff-actions' ||
      activeTab === 'staff-view')
  ) {
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
}
