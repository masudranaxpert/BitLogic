import { decimalString, errorFromStatus, pause, supplierFetch, toInt, type ErrorMapper } from './http';
import {
  SupplierApiError,
  type CatalogItem,
  type ItemRef,
  type SupplierAdapter,
  type SupplierErrorCode,
  type SupplierOrderState,
} from './types';

/** Pandora Digital reseller API v1 — https://api.pandoradigital.shop/docs */

type PProduct = {
  id: string;
  variant_id?: string | null;
  variant_name?: string | null;
  name: string;
  description?: string | null;
  unit_price: string;
  currency: string;
  available_stock?: number | null;
  minimum_quantity?: number;
  maximum_quantity: number;
  delivery_type?: string;
};

type POrder = {
  id: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'refunded';
  unit_price: string;
  currency: string;
  delivery?: { items?: string[] | null } | null;
  failure_code?: string | null;
  failure_message?: string | null;
};

const CODES: Record<string, SupplierErrorCode> = {
  INVALID_API_KEY: 'AUTH',
  INSUFFICIENT_SCOPE: 'SCOPE',
  PURCHASING_DISABLED: 'PURCHASING_DISABLED',
  API_NOT_AVAILABLE: 'SERVER',
  PRODUCT_NOT_ALLOWED: 'UNAVAILABLE',
  INSUFFICIENT_BALANCE: 'BALANCE',
  PER_ORDER_LIMIT_EXCEEDED: 'LIMIT',
  DAILY_LIMIT_EXCEEDED: 'LIMIT',
  MONTHLY_LIMIT_EXCEEDED: 'LIMIT',
  PRODUCT_NOT_FOUND: 'NOT_FOUND',
  PRICE_CHANGED: 'PRICE_CHANGED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRODUCT_UNAVAILABLE: 'UNAVAILABLE',
  QUANTITY_NOT_ALLOWED: 'QUANTITY',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ORDER_PROCESSING: 'IN_PROGRESS',
  ORDER_NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'SERVER',
  INVALID_REQUEST: 'INVALID',
  INVALID_CURSOR: 'INVALID',
  INVALID_WEBHOOK_URL: 'INVALID',
};

const mapError: ErrorMapper = ({ status, body, retryAfterSec }) => {
  const err = (body as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })?.error;
  const code = err?.code ? CODES[err.code] : undefined;
  if (!code) return errorFromStatus(status, err?.message || '', err?.code, retryAfterSec);
  return new SupplierApiError(code, err?.message || err?.code || 'Supplier error', {
    httpStatus: status,
    rawCode: err?.code,
    details: err?.details || undefined,
    retryAfterSec,
    retryable: code === 'SERVER' || code === 'RATE_LIMITED' || code === 'IN_PROGRESS' || code === 'NETWORK',
  });
};

function toItem(p: PProduct): CatalogItem {
  const stock = p.available_stock === null || p.available_stock === undefined ? null : toInt(p.available_stock, 0);
  return {
    externalId: p.variant_id ? `${p.id}::${p.variant_id}` : p.id,
    productRef: p.id,
    variantRef: p.variant_id || '',
    name: (p.name || '').replace(/\s+/g, ' ').trim(),
    variantName: (p.variant_name || '').trim(),
    category: '',
    description: (p.description || '').slice(0, 4000),
    period: '',
    price: decimalString(p.unit_price),
    currency: (p.currency || 'USD').toUpperCase(),
    stock,
    status: stock === 0 ? 'out_of_stock' : 'available',
    minQty: Math.max(1, toInt(p.minimum_quantity, 1)),
    maxQty: Math.max(1, toInt(p.maximum_quantity, 100)),
    deliveryType: 'instant',
    needsBuyerInput: false,
  };
}

function toOrder(o: POrder): SupplierOrderState {
  const items = (o.delivery?.items || []).filter((x) => typeof x === 'string' && x.trim());
  return {
    state:
      o.status === 'delivered'
        ? 'delivered'
        : o.status === 'failed'
          ? 'failed'
          : o.status === 'refunded'
            ? 'refunded'
            : 'processing',
    externalOrderId: o.id,
    externalStatus: o.status,
    items,
    unitCost: decimalString(o.unit_price),
    currency: (o.currency || 'USD').toUpperCase(),
    failureCode: o.failure_code || undefined,
    failureMessage: o.failure_message || undefined,
  };
}

export const pandoraAdapter: SupplierAdapter = {
  kind: 'pandora',
  label: 'Pandora Digital',
  defaultBaseUrl: 'https://api.pandoradigital.shop/api/v1',
  currency: 'USD',
  docsUrl: 'https://api.pandoradigital.shop/docs',
  supportsWebhooks: true,

  async account(ctx) {
    const { data } = await supplierFetch<{ available_balance: string; currency: string }>(ctx, '/balance', {}, mapError);
    return { balance: decimalString(data.available_balance), currency: (data.currency || 'USD').toUpperCase() };
  },

  async catalog(ctx) {
    const out: CatalogItem[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 40; page++) {
      const q: string = `/products?limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const { data } = await supplierFetch<{ items: PProduct[]; next_cursor: string | null }>(ctx, q, {}, mapError);
      for (const p of data.items || []) out.push(toItem(p));
      cursor = data.next_cursor;
      if (!cursor) return out;
      await pause(250);
    }
    throw new SupplierApiError('INVALID', 'Catalog has too many pages; stopped to stay safe.');
  },

  async item(ctx, ref: ItemRef) {
    try {
      const { data } = await supplierFetch<PProduct>(ctx, `/products/${encodeURIComponent(ref.productRef)}`, {}, mapError);
      if (!ref.variantRef || data.variant_id === ref.variantRef) return toItem(data);
    } catch (e) {
      if (e instanceof SupplierApiError && e.code === 'NOT_FOUND') return null;
      throw e;
    }
    // Variant: the single-product endpoint may describe the base package, so read the list.
    const all = await this.catalog(ctx);
    return all.find((i) => i.externalId === ref.externalId) || null;
  },

  async buildOrder(ctx, req) {
    const { data: q } = await supplierFetch<{
      unit_price: string;
      price_version: string;
      can_purchase: boolean;
      available_stock?: number | null;
    }>(
      ctx,
      '/quotes',
      {
        method: 'POST',
        body: { product_id: req.item.productRef, variant_id: req.item.variantRef || null, quantity: req.quantity },
      },
      mapError,
    );
    if (!q.can_purchase) {
      throw new SupplierApiError('OUT_OF_STOCK', 'Supplier says this cannot be bought right now.', {
        details: { available_stock: q.available_stock ?? null },
      });
    }
    if (Number(q.unit_price) > Number(req.maxUnitPrice)) {
      throw new SupplierApiError('PRICE_TOO_HIGH', `Supplier price ${q.unit_price} is above the limit ${req.maxUnitPrice}.`, {
        details: { current_unit_price: q.unit_price },
      });
    }
    return {
      unitPrice: decimalString(q.unit_price),
      body: {
        product_id: req.item.productRef,
        variant_id: req.item.variantRef || null,
        quantity: req.quantity,
        expected_unit_price: q.unit_price,
        price_version: q.price_version,
        client_order_reference: req.reference.slice(0, 120),
      },
    };
  },

  async submitOrder(ctx, body, key) {
    const { data } = await supplierFetch<POrder>(ctx, '/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } }, mapError);
    return toOrder(data);
  },

  async getOrder(ctx, id) {
    const { data } = await supplierFetch<POrder>(ctx, `/orders/${encodeURIComponent(id)}`, {}, mapError);
    return toOrder(data);
  },

  async setWebhook(ctx, url) {
    const { data } = await supplierFetch<{ signing_secret: string }>(ctx, '/webhook', { method: 'PUT', body: { url } }, mapError);
    return { secret: data.signing_secret };
  },
};
