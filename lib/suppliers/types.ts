/**
 * One interface for every reseller API. Adding a supplier = one file implementing SupplierAdapter
 * and one line in registry.ts. Nothing else in the app knows a supplier's wire format.
 */

export type SupplierCtx = {
  baseUrl: string;
  apiKey: string;
};

/** A catalog item in our normalized shape. */
export type CatalogItem = {
  /** Stable id inside the supplier (product id, plus variant id when the supplier has variants). */
  externalId: string;
  productRef: string;
  variantRef: string;
  name: string;
  variantName: string;
  category: string;
  description: string;
  period: string;
  /** Decimal string exactly as sent ("0.285"). */
  price: string;
  currency: string;
  /** null = the supplier does not say. */
  stock: number | null;
  status: 'available' | 'out_of_stock';
  minQty: number;
  maxQty: number;
  deliveryType: 'instant' | 'automatic' | 'manual';
  needsBuyerInput: boolean;
};

export type ItemRef = Pick<CatalogItem, 'externalId' | 'productRef' | 'variantRef'>;

/** Supplier order in our normalized shape. */
export type SupplierOrderState = {
  /** delivered = credentials available; processing = wait/poll; failed = definitely not delivered (funds released). */
  state: 'delivered' | 'processing' | 'failed' | 'refunded';
  externalOrderId: string;
  externalStatus: string;
  /** One entry per delivered unit (or one text block). Never logged. */
  items: string[];
  unitCost: string;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
};

/** Normalized error codes the dispatcher branches on. */
export type SupplierErrorCode =
  | 'AUTH'
  | 'SCOPE'
  | 'BALANCE'
  | 'OUT_OF_STOCK'
  | 'UNAVAILABLE'
  | 'NOT_FOUND'
  | 'PRICE_CHANGED'
  | 'PRICE_TOO_HIGH'
  | 'LIMIT'
  | 'PURCHASING_DISABLED'
  | 'RATE_LIMITED'
  | 'QUANTITY'
  | 'IDEMPOTENCY_CONFLICT'
  | 'BUYER_INPUT'
  | 'IN_PROGRESS'
  | 'INVALID'
  | 'SERVER'
  | 'NETWORK';

export class SupplierApiError extends Error {
  constructor(
    public code: SupplierErrorCode,
    message: string,
    public opts: {
      httpStatus?: number;
      /** Same request + same key may be re-sent later. */
      retryable?: boolean;
      retryAfterSec?: number;
      /** e.g. the new price after PRICE_CHANGED. */
      details?: Record<string, unknown>;
      rawCode?: string;
    } = {},
  ) {
    super(message);
  }
}

export type PurchaseRequest = {
  item: ItemRef;
  quantity: number;
  /** Highest unit price (supplier currency) we accept. */
  maxUnitPrice: string;
  /** Our reference shown in the supplier's history. */
  reference: string;
};

export interface SupplierAdapter {
  kind: string;
  label: string;
  defaultBaseUrl: string;
  currency: string;
  docsUrl: string;
  supportsWebhooks: boolean;
  /** Balance check; also proves the key works. */
  account(ctx: SupplierCtx): Promise<{ balance: string; currency: string }>;
  /** Complete catalog (follows pagination). Throws if it could not read every page. */
  catalog(ctx: SupplierCtx): Promise<CatalogItem[]>;
  /** Fresh read of one item right before buying. null = no longer sold. */
  item(ctx: SupplierCtx, ref: ItemRef): Promise<CatalogItem | null>;
  /**
   * Builds the exact order body (may call a quote endpoint). Saved before sending so that a
   * retry re-sends the identical body with the same idempotency key.
   */
  buildOrder(ctx: SupplierCtx, req: PurchaseRequest): Promise<{ body: Record<string, unknown>; unitPrice: string }>;
  submitOrder(ctx: SupplierCtx, body: Record<string, unknown>, idempotencyKey: string): Promise<SupplierOrderState>;
  getOrder(ctx: SupplierCtx, externalOrderId: string): Promise<SupplierOrderState>;
  /** Registers our webhook URL; returns the signing secret (shown once by the supplier). */
  setWebhook?(ctx: SupplierCtx, url: string): Promise<{ secret: string }>;
}
