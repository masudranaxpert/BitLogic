import type { DurationUnit } from '@/lib/warranty';

export type CredentialType = 'token' | 'license_key' | 'email_login' | 'invite_link';
export type DeliveryMode = 'auto_vault' | 'manual_dispatch';
export type StockDisplayMode = 'exact_count' | 'status_only' | 'unlimited_manual';

export type AdminTab =
  | 'overview'
  | 'products'
  | 'product-add'
  | 'product-view'
  | 'product-option'
  | 'warranties'
  | 'credential-types'
  | 'categories'
  | 'vault'
  | 'vault-manual'
  | 'vault-bulk'
  | 'vault-view'
  | 'vault-edit'
  | 'deliveries'
  | 'order-add'
  | 'orders-pinned'
  | 'orders-renewals'
  | 'warranty-claims'
  | 'tickets'
  | 'users'
  | 'user-detail'
  | 'user-add'
  | 'media'
  | 'payments'
  | 'payment-methods'
  | 'payment-devices'
  | 'payment-logs'
  | 'coupons'
  | 'features'
  | 'email'
  | 'email-templates'
  | 'email-triggers'
  | 'contact'
  | 'storefront'
  | 'suppliers'
  | 'supplier-catalog'
  | 'supplier-links'
  | 'supplier-orders'
  | 'supplier-settings'
  | 'staff'
  | 'staff-add'
  | 'staff-logins'
  | 'staff-actions'
  | 'staff-view'
  | 'security'
  | 'security-ips'
  | 'security-audit'
  | 'security-rules'
  | 'activity'
  | 'activity-payments'
  | 'activity-orders'
  | 'activity-catalog'
  | 'activity-customers'
  | 'activity-logins'
  | 'activity-system';

export interface AdminChatAttachment {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'pdf';
  url: string;
}

export interface AdminChatMessage {
  id: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  time: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: AdminChatAttachment;
}

export interface MediaAsset {
  id: string;
  name: string;
  fileName: string;
  folder: 'Product Covers' | 'Brand Icons' | 'Login Guides';
  url: string;
  dimensions: string;
  sizeKB: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  uploadedAt: string;
  usedByProduct?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  /** Read-only here (managed in Suppliers): own | own_then_supplier | supplier_auto | supplier_manual */
  sourcing?: string;
  /** Read-only here: fixed | auto (auto = price follows supplier cost) */
  pricingMode?: string;
  /** Read-only: database plan id (for supplier links / price history) */
  planDbId?: string;
  productId: string;
  name: string;
  isDefault?: boolean;
  durationDays: number;
  durationLabel: string;
  priceBDT: number;
  priceUSD: number;
  /** Taxonomy id from Product → Credential Types */
  credentialSchemeId?: string;
  /** Derived from scheme for vault/delivery compat */
  credentialType: CredentialType;
  deliveryMode: DeliveryMode;
  stockDisplayMode: StockDisplayMode;
  vpnRequired: boolean;
  vpnRegionNote: string;
  hasWarranty: boolean;
  warrantyDays: number;
  warrantyTerms: string;
  deviceLimit: string;
  loginInstructions: string[];
  importantNote: string;
  warningNote?: string;
  optionDescription?: string;
  specifications?: ProductSpecification[];
  /** false = one-time plan */
  renewable?: boolean;
  /** current = today's price; locked = the price they first paid */
  renewalPricing?: 'current' | 'locked';
  /** Accept orders when this plan has no credentials */
  allowOrderWhenOutOfStock?: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

export interface DigitalProduct {
  id: string;
  name: string;
  /** Display name from Product → Categories taxonomy */
  category: string;
  categoryId?: string;
  sku: string;
  imageUrl?: string;
  galleryUrls?: string[];
  /** active = show on storefront; draft = hidden (no new buy/renew). */
  status: 'active' | 'draft';
  shortDescription: string;
  description?: string;
  descriptionMode?: 'global' | 'per_option';
  variants: ProductVariant[];
}

/** Reusable warranty plans (Product → Warranties taxonomy). */
export interface WarrantyPlan {
  id: string;
  name: string;
  badge: string;
  headline: string;
  kind: 'warranty' | 'login-only';
  days: number;
  unit?: DurationUnit;
}

/** Field keys vault / delivery can collect. */
export type CredentialFieldKey =
  | 'email'
  | 'password'
  | 'username'
  | 'pin'
  | 'phone'
  | 'recovery_email'
  | 'totp'
  | 'profile_name'
  | 'activation_code'
  | 'token'
  | 'link';

export interface CredentialFieldDef {
  key: CredentialFieldKey;
  label: string;
  required: boolean;
  /** Shown on option/plan UI; false = vault-only extra (e.g. PIN). */
  planVisible: boolean;
}

/**
 * Login / delivery templates (Product → Credential Types).
 * You name the type and pick which fields it uses — not hardcoded.
 */
export interface CredentialScheme {
  id: string;
  name: string;
  fields: CredentialFieldDef[];
}

/** Product catalog categories (Product → Categories). */
export interface ProductCategory {
  id: string;
  name: string;
  /** ISO date `YYYY-MM-DD` when the category was created. */
  createdAt: string;
}

export interface VaultCredential {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  credentialType: CredentialType;
  secretValue: string;
  email?: string;
  password?: string;
  profilePin?: string;
  noteBBCode?: string;
  status: 'available' | 'delivered' | 'replaced' | 'expired';
  /** Stock meyaad length in days (set when credential is added). */
  validDays?: number;
  /** Absolute stock end date (YYYY-MM-DD). */
  expiresAt?: string;
  batchNote: string;
  addedAt: string;
  assignedOrderId?: string;
  assignedBuyerEmail?: string;
}

export type CredentialAuditAction =
  | 'assigned'
  | 'replaced'
  | 'renewed'
  | 'expired'
  | 'cleared';
export type CredentialAuditSource = 'vault' | 'custom' | 'system';

export interface CredentialAuditEntry {
  id: string;
  at: string;
  action: CredentialAuditAction;
  source: CredentialAuditSource;
  secretValue: string;
  previousSecretValue?: string;
  vaultCredentialId?: string;
  note?: string;
  /** When this credential window was due to end. */
  credentialExpiresAt?: string;
}

export type OrderStatus =
  | 'delivered'
  | 'pending_dispatch'
  | 'warranty_claim'
  | 'replaced'
  | 'revoked'
  | 'refunded';

export type PaymentKind = 'purchase' | 'renewal' | 'manual';

export interface DigitalDelivery {
  /** Supplier purchase state for this unit ('' | processing | delivered | needs_review | failed). Server-owned. */
  supplierState?: string;
  /** Server bumps this on supplier writes; saves carrying an older value don't touch fulfilment fields. */
  supplierRev?: number;
  id: string;
  orderId: string;
  createdAt: string;
  deliveredAt?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  credentialType: CredentialType;
  deliveryMode: DeliveryMode;
  status: OrderStatus;
  /** Linked Vault row — source of truth for the current secret. */
  vaultCredentialId?: string;
  /**
   * Hydrated view of the current secret (from Vault).
   * Not persisted as a secret blob — rebuilt on load from vaultCredentialId.
   */
  credentialPayload: {
    secretValue: string;
    email?: string;
    password?: string;
    profilePin?: string;
    vaultCredentialId?: string;
  };
  vpnRequired: boolean;
  vpnRegionNote: string;
  hasWarranty: boolean;
  warrantyDays: number;
  /** Derived from the warranty dates on load (days left in the running warranty). */
  warrantyRemainingDays: number;
  /** 'YYYY-MM-DD HH:mm' — starts at delivery or when an admin sets it. */
  warrantyStartsAt?: string;
  warrantyEndsAt?: string;
  /** Next paid period's warranty, queued by an early renewal. */
  nextWarrantyStartsAt?: string;
  nextWarrantyEndsAt?: string;
  warrantyTerms: string;
  warrantyClaimReason?: string;
  replacementHistoryCount: number;
  loginInstructions: string[];
  customAdminNote: string;
  /** Newest-first — from CredentialAudit table. */
  credentialAudit?: CredentialAuditEntry[];
  unreadChatCount?: number;
  chatMessages?: AdminChatMessage[];
  /** Admin pinned this order for follow-up. */
  pinned?: boolean;
  /**
   * Subscription / order window end (YYYY-MM-DD).
   * Extended on renew — does not create a new order.
   */
  orderExpiresAt?: string;
  /** How many days a delivered credential stays usable after assign. */
  credentialValidDays?: number;
  /** When current credential was assigned / renewed. */
  credentialAssignedAt?: string;
  /** When current credential auto-clears (assign + validDays). */
  credentialExpiresAt?: string;
  /** Renew paid; waiting for admin to assign next credential. */
  renewalPending?: boolean;
  /** Last credential was cleared by expiry while renew may be pending. */
  credentialClearedAt?: string;
  /** Units in this order line (same ORD may have multiple deliveries). */
  orderQuantity?: number;
  /** 1-based index within the order line (1…orderQuantity). */
  unitIndex?: number;
}

export interface AdminSupportTicket {
  id: string;
  subject: string;
  orderId: string;
  deliveryId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  productName: string;
  category:
    | 'Access & Delivery'
    | 'Login / Credentials'
    | 'Billing / TrxID'
    | 'Warranty / Replacement'
    | 'General';
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'open' | 'answered' | 'closed';
  updatedAt: string;
  unreadCount?: number;
  messages: AdminChatMessage[];
}

export interface AdminNotificationItem {
  id: string;
  type: 'order_chat' | 'ticket' | 'warranty' | 'payment';
  orderId?: string;
  deliveryId?: string;
  ticketId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface SubscriberUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  status: 'active' | 'suspended';
  role: 'subscriber' | 'reseller' | 'vip';
  /**
   * From User.emailVerifiedAt (login account).
   * null = no User row for this email (guest / admin-only customer card).
   */
  emailVerified: boolean | null;
  activeSubscriptions: {
    id: string;
    orderId?: string;
    deliveryId?: string;
    productName: string;
    variantName: string;
    credentialType: CredentialType;
    startedAt: string;
    expiresAt: string;
    remainingDays: number;
    autoRenew: boolean;
    warrantyActive: boolean;
    /** active = credential delivered; pending_credential = order placed, secret not sent yet */
    status?: 'active' | 'pending_credential';
  }[];
  totalSpentBDT: number;
  ordersCount: number;
  warrantyClaimsCount: number;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productSummary: string;
  amountBDT: number;
  /** Known names live in lib/admin/gateways.ts; free text is allowed for others. */
  gateway: 'bKash' | 'Nagad' | 'Stripe' | 'Binance Pay' | 'Rocket' | (string & {});
  senderNumberOrRef: string;
  trxId: string;
  status: 'verified' | 'pending_verification' | 'refunded' | 'rejected';
  createdAt: string;
  /** purchase = first order; renewal = same-order extend; manual = admin adjust */
  kind?: PaymentKind;
  deliveryId?: string;
  /** Renewal only: the units this payment extends. Empty = every live unit of the order. */
  renewDeliveryIds?: string[];
  /** Renewal only: the access period it paid for (YYYY-MM-DD), set on verify. */
  periodFrom?: string;
  periodTo?: string;
  /** When an admin verified it. */
  verifiedAt?: string;
}

export interface CouponCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_bdt';
  discountValue: number;
  minSpendBDT: number;
  usedCount: number;
  maxUses: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'disabled';
}

