import type {
  AdminNotificationItem,
  AdminSupportTicket,
  CouponCode,
  CredentialScheme,
  DigitalDelivery,
  DigitalProduct,
  MediaAsset,
  PaymentTransaction,
  ProductCategory,
  SubscriberUser,
  SystemFeatureFlag,
  VaultCredential,
  WarrantyPlan,
} from '@/lib/admin/types';
import {
  persistAdminProduct,
  persistAdminTaxonomies,
} from '@/lib/admin/catalog-client';

export type AdminWorkspacePayload = {
  products: DigitalProduct[];
  productCategories: ProductCategory[];
  warranties: WarrantyPlan[];
  credentialSchemes: CredentialScheme[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  tickets: AdminSupportTicket[];
  adminNotifications: AdminNotificationItem[];
  subscribers: SubscriberUser[];
  payments: PaymentTransaction[];
  coupons: CouponCode[];
  features: SystemFeatureFlag[];
  mediaAssets: MediaAsset[];
};

export async function fetchAdminWorkspace(): Promise<AdminWorkspacePayload | null> {
  const res = await fetch('/api/admin/workspace', { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as AdminWorkspacePayload;
}

export async function persistAdminWorkspace(patch: {
  vault?: VaultCredential[];
  deliveries?: DigitalDelivery[];
  tickets?: AdminSupportTicket[];
  adminNotifications?: AdminNotificationItem[];
  subscribers?: SubscriberUser[];
  payments?: PaymentTransaction[];
  coupons?: CouponCode[];
  features?: SystemFeatureFlag[];
  mediaAssets?: MediaAsset[];
}): Promise<boolean> {
  const res = await fetch('/api/admin/workspace', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export { persistAdminProduct, persistAdminTaxonomies };
