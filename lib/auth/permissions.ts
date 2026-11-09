import type { AdminTab } from '@/lib/admin/types';
import { ROLES, type Role } from '@/lib/auth/roles';

/**
 * Assignable staff menu keys (Django-style groups).
 * Admin ignores these and always has full access.
 * `staff` is never assignable — only full Admin opens Staff page.
 */
export const STAFF_PERMISSIONS = [
  {
    key: 'overview',
    label: 'Dashboard',
    description: 'Overview stats and activity',
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Catalog, options, warranties, categories',
  },
  {
    key: 'vault',
    label: 'Credentials',
    description: 'Vault inventory and import',
  },
  {
    key: 'orders',
    label: 'Orders',
    description: 'Orders, fulfill, renewals, warranty claims',
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payments and coupons',
  },
  {
    key: 'tickets',
    label: 'Support tickets',
    description: 'Customer support threads',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Customer list and profiles',
  },
  {
    key: 'media',
    label: 'Media library',
    description: 'Upload and manage media',
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    description: 'Reseller APIs, supplier catalog, linked options and supplier purchases',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Store maintenance, announcement, email, site title and homepage banners',
  },
] as const;

export type StaffPermissionKey = (typeof STAFF_PERMISSIONS)[number]['key'];

const TAB_TO_PERMISSION: Record<AdminTab, StaffPermissionKey | 'staff' | null> =
  {
    overview: 'overview',
    products: 'products',
    'product-add': 'products',
    'product-option': 'products',
    warranties: 'products',
    'credential-types': 'products',
    categories: 'products',
    vault: 'vault',
    'vault-manual': 'vault',
    'vault-bulk': 'vault',
    'vault-view': 'vault',
    'vault-edit': 'vault',
    deliveries: 'orders',
    'order-add': 'orders',
    'orders-pinned': 'orders',
    'orders-renewals': 'orders',
    'warranty-claims': 'orders',
    tickets: 'tickets',
    users: 'customers',
    'user-detail': 'customers',
    'user-add': 'customers',
    media: 'media',
    payments: 'payments',
    'payment-methods': 'payments',
    coupons: 'payments',
    features: 'settings',
    email: 'settings',
    'email-templates': 'settings',
    'email-triggers': 'settings',
    contact: 'settings',
    storefront: 'settings',
    'suppliers': 'suppliers',
    'supplier-catalog': 'suppliers',
    'supplier-links': 'suppliers',
    'supplier-orders': 'suppliers',
    'supplier-settings': 'suppliers',
    staff: 'staff',
    'staff-add': 'staff',
    'staff-logins': 'staff',
    'staff-actions': 'staff',
    'staff-view': 'staff',
    security: 'settings',
    'security-ips': 'settings',
    'security-audit': 'settings',
    'security-rules': 'settings',
  };

export function parsePermissionsJson(raw: string | null | undefined): StaffPermissionKey[] {
  try {
    const parsed = JSON.parse(raw || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(STAFF_PERMISSIONS.map((p) => p.key));
    return parsed.filter(
      (k): k is StaffPermissionKey =>
        typeof k === 'string' && allowed.has(k as StaffPermissionKey),
    );
  } catch {
    return [];
  }
}

export function isConsoleRole(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.STAFF;
}

export function isFullAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN;
}

/** Admin → everything. Staff → only listed keys. `staff` page = Admin only. */
export function canAccessPermission(
  role: Role | string | null | undefined,
  permissions: StaffPermissionKey[] | undefined,
  key: StaffPermissionKey | 'staff',
): boolean {
  if (role === ROLES.ADMIN) return true;
  if (role !== ROLES.STAFF) return false;
  if (key === 'staff') return false;
  return (permissions || []).includes(key);
}

export function canAccessAdminTab(
  role: Role | string | null | undefined,
  permissions: StaffPermissionKey[] | undefined,
  tab: AdminTab,
): boolean {
  const key = TAB_TO_PERMISSION[tab];
  if (key === null) return role === ROLES.ADMIN;
  return canAccessPermission(role, permissions, key);
}

export function permissionForWorkspacePatchKey(
  patchKey: string,
): StaffPermissionKey | null {
  switch (patchKey) {
    case 'vault':
      return 'vault';
    case 'deliveries':
      return 'orders';
    case 'tickets':
      return 'tickets';
    case 'subscribers':
      return 'customers';
    case 'payments':
    case 'coupons':
      return 'payments';
    case 'mediaAssets':
      return 'media';
    case 'adminNotifications':
      return 'overview';
    default:
      return null;
  }
}
