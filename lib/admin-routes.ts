import type { AdminTab } from '@/lib/admin-data';

const TAB_TO_PATH: Record<AdminTab, string> = {
  overview: '/admin',
  products: '/admin/products',
  'product-add': '/admin/products/add',
  'product-view': '/admin/products/view',
  'product-option': '/admin/products/option',
  warranties: '/admin/products/warranties',
  'credential-types': '/admin/products/credential-types',
  categories: '/admin/products/categories',
  vault: '/admin/vault',
  'vault-manual': '/admin/vault/manual',
  'vault-bulk': '/admin/vault/bulk',
  'vault-view': '/admin/vault/view',
  'vault-edit': '/admin/vault/edit',
  deliveries: '/admin/orders',
  'order-add': '/admin/orders/add',
  'orders-pinned': '/admin/orders/pinned',
  'orders-renewals': '/admin/orders/renewals',
  'warranty-claims': '/admin/orders/warranty',
  tickets: '/admin/tickets',
  users: '/admin/users',
  'user-detail': '/admin/users/detail',
  'user-add': '/admin/users/add',
  media: '/admin/media',
  payments: '/admin/payments',
  'payment-methods': '/admin/payments/methods',
  'payment-devices': '/admin/payments/devices',
  'payment-logs': '/admin/payments/sms-logs',
  coupons: '/admin/payments/coupons',
  features: '/admin/settings',
  email: '/admin/email',
  'email-templates': '/admin/email/templates',
  'email-triggers': '/admin/email/triggers',
  contact: '/admin/contact',
  storefront: '/admin/storefront',
  'suppliers': '/admin/suppliers',
  'supplier-catalog': '/admin/suppliers/catalog',
  'supplier-links': '/admin/suppliers/links',
  'supplier-orders': '/admin/suppliers/orders',
  'supplier-settings': '/admin/suppliers/settings',
  staff: '/admin/staff',
  'staff-add': '/admin/staff/add',
  'staff-logins': '/admin/staff/logins',
  'staff-actions': '/admin/staff/actions',
  'staff-view': '/admin/staff/view',
  security: '/admin/security',
  'security-ips': '/admin/security/ips',
  'security-audit': '/admin/security/audit',
  'security-rules': '/admin/security/rules',
  activity: '/admin/activity',
  'activity-payments': '/admin/activity/payments',
  'activity-orders': '/admin/activity/orders',
  'activity-catalog': '/admin/activity/catalog',
  'activity-customers': '/admin/activity/customers',
  'activity-logins': '/admin/activity/logins',
  'activity-system': '/admin/activity/system',
};

const PATH_TO_TAB: Array<{ prefix: string; tab: AdminTab }> = [
  { prefix: '/admin/activity/payments', tab: 'activity-payments' },
  { prefix: '/admin/activity/orders', tab: 'activity-orders' },
  { prefix: '/admin/activity/catalog', tab: 'activity-catalog' },
  { prefix: '/admin/activity/customers', tab: 'activity-customers' },
  { prefix: '/admin/activity/logins', tab: 'activity-logins' },
  { prefix: '/admin/activity/system', tab: 'activity-system' },
  { prefix: '/admin/activity', tab: 'activity' },
  { prefix: '/admin/security/ips', tab: 'security-ips' },
  { prefix: '/admin/security/audit', tab: 'security-audit' },
  { prefix: '/admin/security/rules', tab: 'security-rules' },
  { prefix: '/admin/security', tab: 'security' },
  { prefix: '/admin/products/add', tab: 'product-add' },
  { prefix: '/admin/products/view', tab: 'product-view' },
  { prefix: '/admin/products/option', tab: 'product-option' },
  { prefix: '/admin/products/warranties', tab: 'warranties' },
  { prefix: '/admin/products/credential-types', tab: 'credential-types' },
  { prefix: '/admin/products/categories', tab: 'categories' },
  { prefix: '/admin/products', tab: 'products' },
  { prefix: '/admin/vault/manual', tab: 'vault-manual' },
  { prefix: '/admin/vault/bulk', tab: 'vault-bulk' },
  { prefix: '/admin/vault/view', tab: 'vault-view' },
  { prefix: '/admin/vault/edit', tab: 'vault-edit' },
  { prefix: '/admin/vault', tab: 'vault' },
  { prefix: '/admin/orders/add', tab: 'order-add' },
  { prefix: '/admin/orders/pinned', tab: 'orders-pinned' },
  { prefix: '/admin/orders/renewals', tab: 'orders-renewals' },
  { prefix: '/admin/orders/warranty', tab: 'warranty-claims' },
  { prefix: '/admin/orders', tab: 'deliveries' },
  { prefix: '/admin/deliveries', tab: 'deliveries' },
  { prefix: '/admin/tickets', tab: 'tickets' },
  { prefix: '/admin/users/add', tab: 'user-add' },
  { prefix: '/admin/users/detail', tab: 'user-detail' },
  { prefix: '/admin/users', tab: 'users' },
  { prefix: '/admin/media', tab: 'media' },
  { prefix: '/admin/payments/methods', tab: 'payment-methods' },
  { prefix: '/admin/payments/devices', tab: 'payment-devices' },
  { prefix: '/admin/payments/sms-logs', tab: 'payment-logs' },
  { prefix: '/admin/payments/coupons', tab: 'coupons' },
  { prefix: '/admin/payments', tab: 'payments' },
  { prefix: '/admin/email/templates', tab: 'email-templates' },
  { prefix: '/admin/email/triggers', tab: 'email-triggers' },
  { prefix: '/admin/email', tab: 'email' },
  { prefix: '/admin/contact', tab: 'contact' },
  { prefix: '/admin/storefront', tab: 'storefront' },
  { prefix: '/admin/suppliers/catalog', tab: 'supplier-catalog' },
  { prefix: '/admin/suppliers/links', tab: 'supplier-links' },
  { prefix: '/admin/suppliers/orders', tab: 'supplier-orders' },
  { prefix: '/admin/suppliers/settings', tab: 'supplier-settings' },
  { prefix: '/admin/suppliers', tab: 'suppliers' },
  { prefix: '/admin/settings', tab: 'features' },
  { prefix: '/admin/staff/add', tab: 'staff-add' },
  { prefix: '/admin/staff/logins', tab: 'staff-logins' },
  { prefix: '/admin/staff/actions', tab: 'staff-actions' },
  { prefix: '/admin/staff/view', tab: 'staff-view' },
  { prefix: '/admin/staff', tab: 'staff' },
  { prefix: '/admin', tab: 'overview' },
];

export function adminTabToPath(tab: AdminTab): string {
  return TAB_TO_PATH[tab] ?? '/admin';
}

export function pathToAdminTab(pathname: string): AdminTab {
  const normalized = pathname.replace(/\/$/, '') || '/admin';
  for (const entry of PATH_TO_TAB) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return entry.tab;
    }
  }
  return 'overview';
}

export function isOrdersAdminTab(tab: AdminTab): boolean {
  return (
    tab === 'deliveries' ||
    tab === 'orders-pinned' ||
    tab === 'orders-renewals' ||
    tab === 'warranty-claims'
  );
}

/** Human breadcrumb / command labels (never expose raw tab ids like "deliveries"). */
export function adminTabLabel(
  tab: AdminTab,
  opts?: { productEdit?: boolean; orderChat?: boolean; staffEdit?: boolean },
): string {
  if (opts?.productEdit) return 'Edit Product';
  if (opts?.staffEdit) return 'Edit Staff';
  if (opts?.orderChat) return 'Order Chat';

  const labels: Record<AdminTab, string> = {
    overview: 'Dashboard',
    products: 'Products',
    'product-add': 'Add Product',
    'product-view': 'Product Details',
    'product-option': 'Plan',
    warranties: 'Warranties',
    'credential-types': 'Credential Types',
    categories: 'Categories',
    vault: 'Credentials',
    'vault-manual': 'Manual Add',
    'vault-bulk': 'Bulk Import',
    'vault-view': 'Credential',
    'vault-edit': 'Edit Credential',
    deliveries: 'Orders',
    'order-add': 'Add Order',
    'orders-pinned': 'Pinned Orders',
    'orders-renewals': 'Renewals',
    'warranty-claims': 'Warranty Claims',
    tickets: 'Tickets',
    users: 'Customers',
    'user-detail': 'Customer',
    'user-add': 'Add Customer',
    media: 'Media',
    payments: 'Payments',
    'payment-methods': 'Payment Methods',
    'payment-devices': 'Sync Devices',
    'payment-logs': 'SMS Logs',
    coupons: 'Coupons',
    features: 'Settings',
    email: 'Email Settings',
    'email-templates': 'Email Templates',
    'email-triggers': 'Email Triggers',
    contact: 'Contact',
    storefront: 'Storefront',
    'suppliers': 'Suppliers',
    'supplier-catalog': 'Supplier catalog',
    'supplier-links': 'Linked plans',
    'supplier-orders': 'Supplier orders',
    'supplier-settings': 'Supplier settings',
    staff: 'Staff',
    'staff-add': 'Add Staff',
    'staff-logins': 'Logins',
    'staff-actions': 'Actions',
    'staff-view': 'Profile',
    security: 'Security & Traffic',
    'security-ips': 'IP Access Rules',
    'security-audit': 'Audit Trail',
    'security-rules': 'Rate Limit Rules',
    activity: 'All Logs',
    'activity-payments': 'Payment Logs',
    'activity-orders': 'Order Logs',
    'activity-catalog': 'Catalog Logs',
    'activity-customers': 'Customer Logs',
    'activity-logins': 'Sign-In Logs',
    'activity-system': 'System Logs',
  };

  return labels[tab] ?? tab.replace(/-/g, ' ');
}
