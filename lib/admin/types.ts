export type CredentialType = 'token' | 'license_key' | 'email_login' | 'invite_link';
export type DeliveryMode = 'auto_vault' | 'manual_dispatch';
export type StockDisplayMode = 'exact_count' | 'status_only' | 'unlimited_manual';

export type AdminTab =
  | 'overview'
  | 'products'
  | 'product-add'
  | 'product-option'
  | 'vault'
  | 'vault-manual'
  | 'vault-bulk'
  | 'deliveries'
  | 'tickets'
  | 'users'
  | 'user-detail'
  | 'user-add'
  | 'media'
  | 'payments'
  | 'features';

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
  mimeType: 'image/png' | 'image/webp' | 'image/svg+xml';
  uploadedAt: string;
  usedByProduct?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  isDefault?: boolean;
  durationDays: number;
  durationLabel: string;
  priceBDT: number;
  priceUSD: number;
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
}

export interface DigitalProduct {
  id: string;
  name: string;
  category: 'AI & LLM Tools' | 'Creative & Design' | 'Streaming & OTT' | 'Developer & Cloud' | 'VPN & Security' | 'OS & Office Keys';
  sku: string;
  imageUrl?: string;
  galleryUrls?: string[];
  status: 'active' | 'draft' | 'out_of_stock';
  shortDescription: string;
  description?: string;
  descriptionMode?: 'global' | 'per_option';
  totalSales: number;
  monthlyRevenueBDT: number;
  variants: ProductVariant[];
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
  batchNote: string;
  addedAt: string;
  assignedOrderId?: string;
  assignedBuyerEmail?: string;
}

export interface DigitalDelivery {
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
  status: 'delivered' | 'pending_dispatch' | 'warranty_claim' | 'replaced' | 'revoked';
  credentialPayload: {
    secretValue: string;
    email?: string;
    password?: string;
    profilePin?: string;
  };
  vpnRequired: boolean;
  vpnRegionNote: string;
  hasWarranty: boolean;
  warrantyDays: number;
  warrantyRemainingDays: number;
  warrantyTerms: string;
  warrantyClaimReason?: string;
  replacementHistoryCount: number;
  loginInstructions: string[];
  customAdminNote: string;
  unreadChatCount?: number;
  chatMessages?: AdminChatMessage[];
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
  status: 'active' | 'past_due' | 'suspended';
  role: 'subscriber' | 'reseller' | 'vip';
  activeSubscriptions: {
    id: string;
    productName: string;
    variantName: string;
    credentialType: CredentialType;
    startedAt: string;
    expiresAt: string;
    remainingDays: number;
    autoRenew: boolean;
    warrantyActive: boolean;
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
  gateway: 'bKash' | 'Nagad' | 'Stripe' | 'Binance Pay' | 'Rocket';
  senderNumberOrRef: string;
  trxId: string;
  status: 'verified' | 'pending_verification' | 'refunded' | 'rejected';
  createdAt: string;
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

export interface SystemFeatureFlag {
  id: string;
  category: 'Fulfillment Engine' | 'Storefront & Stock UX' | 'Warranty & Security' | 'Payment & Webhooks';
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  impactNote: string;
}
