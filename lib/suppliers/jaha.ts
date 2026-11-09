import { decimalString, errorFromStatus, pause, supplierFetch, toInt, type ErrorMapper } from './http';
import {
  SupplierApiError,
  type CatalogItem,
  type SupplierAdapter,
  type SupplierErrorCode,
  type SupplierOrderState,
} from './types';

/** Jaha Digital API v1 — https://api.jahadigital.shop/guide (prices in USDT). */

type JProduct = {
  code: string;
  title: string;
  variant?: string;
  description?: string;
  period?: string;
  category?: string;
  subcategory?: string | null;
  price_usdt: string;
  available: number;
  min_quantity?: number;
  max_quantity?: number;
  delivery_type?: string;
  buyer_input?: { required?: boolean } | null;
  status?: string;
};

type JOrder = {
  order_number: string | null;
  status: string;
  quantity: number;
  delivered_quantity: number;
  unit_price_usdt: string;
  delivery?: string | null;
  instructions?: string | null;
};

const CODES: Record<string, SupplierErrorCode> = {
  invalid_api_key: 'AUTH',
  purchases_disabled: 'PURCHASING_DISABLED',
  terms_update_required: 'PURCHASING_DISABLED',
  endpoint_not_found: 'NOT_FOUND',
  product_not_found: 'NOT_FOUND',
  order_not_found: 'NOT_FOUND',
  insufficient_balance: 'BALANCE',
  price_changed: 'PRICE_CHANGED',
  out_of_stock: 'OUT_OF_STOCK',
  product_unavailable: 'UNAVAILABLE',
  quantity_not_allowed: 'QUANTITY',
  idempotency_conflict: 'IDEMPOTENCY_CONFLICT',
  external_order_id_conflict: 'IDEMPOTENCY_CONFLICT',
  request_in_progress: 'IN_PROGRESS',
  invalid_cursor: 'INVALID',
  validation_error: 'INVALID',
  buyer_input_required: 'BUYER_INPUT',
  buyer_input_invalid: 'BUYER_INPUT',
  buyer_input_count_mismatch: 'BUYER_INPUT',
  buyer_input_not_allowed: 'BUYER_INPUT',
  rate_limit_exceeded: 'RATE_LIMITED',
  internal_server_error: 'SERVER',
  service_temporarily_unavailable: 'SERVER',
};

const mapError: ErrorMapper = ({ status, body, retryAfterSec }) => {
  const b = body as { code?: string; detail?: string; title?: string } | null;
  const code = b?.code ? CODES[b.code] : undefined;
  if (!code) return errorFromStatus(status, b?.detail || b?.title || '', b?.code, retryAfterSec);
  return new SupplierApiError(code, b?.detail || b?.code || 'Supplier error', {
    httpStatus: status,
    rawCode: b?.code,
    retryAfterSec,
    retryable: code === 'SERVER' || code === 'RATE_LIMITED' || code === 'IN_PROGRESS',
  });
};

function toItem(p: JProduct): CatalogItem {
  const stock = toInt(p.available, 0);
  const title = (p.title || '').trim();
  const variant = (p.variant || '').trim();
  return {
    externalId: p.code,
    productRef: p.code,
    variantRef: '',
    name: title,
    variantName: variant && variant !== title ? variant : '',
    category: [p.category, p.subcategory].filter(Boolean).join(' / '),
    description: (p.description || '').slice(0, 4000),
    period: (p.period || '').trim(),
    price: decimalString(p.price_usdt),
    currency: 'USDT',
    stock,
    status: p.status === 'available' && stock > 0 ? 'available' : 'out_of_stock',
    minQty: Math.max(1, toInt(p.min_quantity, 1)),
    maxQty: Math.max(1, toInt(p.max_quantity, 100)),
    deliveryType: p.delivery_type === 'manual' ? 'manual' : 'automatic',
    needsBuyerInput: Boolean(p.buyer_input?.required),
  };
}

function toOrder(o: JOrder): SupplierOrderState {
  const text = [o.delivery, o.instructions].filter((x) => typeof x === 'string' && x.trim()).join('\n\n').trim();
  const done =
    o.status === 'completed' || (o.status === 'partially_completed' && o.delivered_quantity >= o.quantity);
  return {
    state: done
      ? 'delivered'
      : o.status === 'failed' || o.status === 'cancelled'
        ? 'failed'
        : o.status === 'refunded'
          ? 'refunded'
          : 'processing',
    externalOrderId: o.order_number || '',
    externalStatus: o.status,
    // A provisional instruction is readable but not fulfilled goods: only count it once done.
    items: done && text ? [text] : [],
    unitCost: decimalString(o.unit_price_usdt),
    currency: 'USDT',
  };
}

export const jahaAdapter: SupplierAdapter = {
  kind: 'jaha',
  label: 'Jaha Digital',
  defaultBaseUrl: 'https://api.jahadigital.shop/v1',
  currency: 'USDT',
  docsUrl: 'https://api.jahadigital.shop/guide?lang=en',
  supportsWebhooks: false,

  async account(ctx) {
    const { data } = await supplierFetch<{ account: { balance_usdt: string; currency: string; status: string } }>(
      ctx,
      '/account',
      {},
      mapError,
    );
    if (data.account?.status && data.account.status !== 'active') {
      throw new SupplierApiError('PURCHASING_DISABLED', `Account status is ${data.account.status}.`);
    }
    return { balance: decimalString(data.account?.balance_usdt), currency: (data.account?.currency || 'USDT').toUpperCase() };
  },

  async catalog(ctx) {
    const out: CatalogItem[] = [];
    let cursor: string | null = null;
    // 100 per page; 120 reads/min shared, so pace the pages.
    for (let page = 0; page < 60; page++) {
      const q: string = `/products?limit=100&current_only=true${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const { data } = await supplierFetch<{ products: JProduct[]; next_cursor: string | null }>(ctx, q, {}, mapError);
      for (const p of data.products || []) out.push(toItem(p));
      cursor = data.next_cursor;
      if (!cursor) return out;
      await pause(600);
    }
    throw new SupplierApiError('INVALID', 'Catalog has too many pages; stopped to stay safe.');
  },

  async item(ctx, ref) {
    try {
      const { data } = await supplierFetch<{ product: JProduct }>(ctx, `/products/${encodeURIComponent(ref.productRef)}`, {}, mapError);
      return data.product ? toItem(data.product) : null;
    } catch (e) {
      if (e instanceof SupplierApiError && e.code === 'NOT_FOUND') return null;
      throw e;
    }
  },

  async buildOrder(ctx, req) {
    const fresh = await this.item(ctx, req.item);
    if (!fresh) throw new SupplierApiError('NOT_FOUND', 'The supplier no longer sells this item.');
    if (fresh.needsBuyerInput) {
      throw new SupplierApiError('BUYER_INPUT', 'This item needs the buyer’s email/password; buy it by hand.');
    }
    if (fresh.status !== 'available' || (fresh.stock !== null && fresh.stock < req.quantity)) {
      throw new SupplierApiError('OUT_OF_STOCK', 'Out of stock at the supplier.', { details: { available: fresh.stock } });
    }
    if (Number(fresh.price) > Number(req.maxUnitPrice)) {
      throw new SupplierApiError('PRICE_TOO_HIGH', `Supplier price ${fresh.price} is above the limit ${req.maxUnitPrice}.`, {
        details: { current_unit_price: fresh.price },
      });
    }
    return {
      unitPrice: fresh.price,
      body: {
        product_code: req.item.productRef,
        quantity: req.quantity,
        // Ceiling, not the exact price: protects against a rise without failing on rounding.
        max_unit_price_usdt: Number(req.maxUnitPrice).toFixed(4),
        external_order_id: req.reference.slice(0, 120),
      },
    };
  },

  async submitOrder(ctx, body, key) {
    const { data } = await supplierFetch<{ order: JOrder }>(
      ctx,
      '/orders',
      { method: 'POST', body, headers: { 'Idempotency-Key': key } },
      mapError,
    );
    return toOrder(data.order);
  },

  async getOrder(ctx, id) {
    const { data } = await supplierFetch<{ order: JOrder }>(
      ctx,
      `/orders/${encodeURIComponent(id)}?include_additions=true`,
      {},
      mapError,
    );
    return toOrder(data.order);
  },
};
