import type { AdminTab } from '@/lib/admin-data';

const TAB_TO_PATH: Record<AdminTab, string> = {
  overview: '/admin',
  products: '/admin/products',
  'product-add': '/admin/products/add',
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
  'orders-pinned': '/admin/orders/pinned',
  'orders-renewals': '/admin/orders/renewals',
  'warranty-claims': '/admin/orders/warranty',
  tickets: '/admin/tickets',
  users: '/admin/users',
  'user-detail': '/admin/users/detail',
  'user-add': '/admin/users/add',
  media: '/admin/media',
  payments: '/admin/payments',
  features: '/admin/settings',
};

const PATH_TO_TAB: Array<{ prefix: string; tab: AdminTab }> = [
  { prefix: '/admin/products/add', tab: 'product-add' },
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
  { prefix: '/admin/payments', tab: 'payments' },
  { prefix: '/admin/settings', tab: 'features' },
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
  opts?: { productEdit?: boolean; orderChat?: boolean },
): string {
  if (opts?.productEdit) return 'Edit Product';
  if (opts?.orderChat) return 'Order Chat';

  const labels: Record<AdminTab, string> = {
    overview: 'Dashboard',
    products: 'Products',
    'product-add': 'Add Product',
    'product-option': 'Product Option',
    warranties: 'Warranties',
    'credential-types': 'Credential Types',
    categories: 'Categories',
    vault: 'Credentials',
    'vault-manual': 'Manual Add',
    'vault-bulk': 'Bulk Import',
    'vault-view': 'Credential',
    'vault-edit': 'Edit Credential',
    deliveries: 'Orders',
    'orders-pinned': 'Pinned Orders',
    'orders-renewals': 'Renewals',
    'warranty-claims': 'Warranty Claims',
    tickets: 'Tickets',
    users: 'Customers',
    'user-detail': 'Customer',
    'user-add': 'Add Customer',
    media: 'Media',
    payments: 'Payments',
    features: 'Settings',
  };

  return labels[tab] ?? tab.replace(/-/g, ' ');
}
