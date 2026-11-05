import type { AdminTab } from '@/lib/admin-data';

const TAB_TO_PATH: Record<AdminTab, string> = {
  overview: '/admin',
  products: '/admin/products',
  'product-add': '/admin/products/add',
  'product-option': '/admin/products/option',
  vault: '/admin/vault',
  'vault-manual': '/admin/vault/manual',
  'vault-bulk': '/admin/vault/bulk',
  deliveries: '/admin/deliveries',
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
  { prefix: '/admin/products', tab: 'products' },
  { prefix: '/admin/vault/manual', tab: 'vault-manual' },
  { prefix: '/admin/vault/bulk', tab: 'vault-bulk' },
  { prefix: '/admin/vault', tab: 'vault' },
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
