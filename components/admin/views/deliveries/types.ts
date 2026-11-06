import type {
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  AdminChatAttachment,
  PaymentTransaction,
} from '@/lib/admin-data';

export interface DeliveriesViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  payments?: PaymentTransaction[];
  /** Force list filter when opened from Orders submenu (pinned / warranty). */
  initialStatusFilter?: DeliveryStatusFilter;
  /** @deprecated use pageMode */
  hideWarrantyFilter?: boolean;
  /** Page heading for All / Pinned / Renewals / Warranty. */
  pageTitle?: string;
  /**
   * Dedicated Orders pages — not All Orders + a chip.
   * each mode gets its own stats, columns, and no global status filters.
   */
  pageMode?: 'all' | 'pinned' | 'renewals' | 'warranty';
  selectedChatDeliveryId?: string | null;
  onSelectChatDelivery?: (deliveryId: string | null) => void;
  onTogglePinOrder?: (deliveryId: string) => void;
  onSendOrderChatMessage?: (
    deliveryId: string,
    payload: {
      text: string;
      replyTo?: { id: string; senderName: string; text: string };
      attachment?: AdminChatAttachment;
    }
  ) => void;
  onSimulateBuyerMessage?: (deliveryId: string) => void;
  subscribers?: import('@/lib/admin-data').SubscriberUser[];
  onCreateOrderDelivery?: (userId: string, productId: string, variantId: string) => void;
  onFulfillDelivery: (
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
  ) => void;
}

export type DeliveryStatusFilter =
  | 'all'
  | 'unread_chat'
  | 'pending_dispatch'
  | 'delivered'
  | 'replaced'
  | 'refunded'
  | 'renewals'
  | 'pinned'
  | 'warranty_claim';

export type DeliveryViewLayout = 'table' | 'cards';

export type DeliverySourceMode = 'vault' | 'custom';

export type ActiveActionDelivery = {
  delivery: DigitalDelivery;
  isWarrantySwap: boolean;
};

export type ChatReplyTarget = {
  id: string;
  senderName: string;
  text: string;
};
