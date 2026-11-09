import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto/secrets';
import { getAdapter } from './registry';
import { DEFAULT_RATES, type RateMap } from './pricing';
import type { SupplierAdapter, SupplierCtx } from './types';

/** Taka per unit of each supplier currency (defaults fill missing ones). */
export async function getRates(): Promise<RateMap> {
  const rows = await db.currencyRate.findMany();
  const out: RateMap = { ...DEFAULT_RATES };
  for (const r of rows) if (r.bdtPerUnit > 0) out[r.code.toUpperCase()] = r.bdtPerUnit;
  return out;
}

export type LoadedSupplier = {
  row: Awaited<ReturnType<typeof db.supplier.findUniqueOrThrow>>;
  adapter: SupplierAdapter;
  ctx: SupplierCtx;
};

/** Supplier row + its adapter + decrypted key. Never send `ctx` to the browser. */
export async function loadSupplier(id: string): Promise<LoadedSupplier> {
  const row = await db.supplier.findUniqueOrThrow({ where: { id } });
  const adapter = getAdapter(row.kind);
  if (!adapter) throw new Error(`No adapter for supplier type "${row.kind}".`);
  return { row, adapter, ctx: { baseUrl: row.baseUrl, apiKey: decryptSecret(row.apiKeyEnc) } };
}

/** Last 4 characters only, e.g. "…llU". */
export const keyHint = (key: string) => (key.length > 4 ? `…${key.slice(-4)}` : '…');

/** Records one price change of an option. Never throws (history must not block a sale). */
export async function recordPriceChange(input: {
  productId: string;
  planCode: string;
  planLabel?: string;
  field?: 'price' | 'cost' | 'pricing';
  oldValue: string | number;
  newValue: string | number;
  source: 'admin' | 'auto' | 'supplier' | 'rate' | 'system';
  actor?: string;
  note?: string;
}) {
  if (String(input.oldValue) === String(input.newValue)) return;
  try {
    await db.priceHistory.create({
      data: {
        productId: input.productId,
        planCode: input.planCode,
        planLabel: input.planLabel || '',
        field: input.field || 'price',
        oldValue: String(input.oldValue),
        newValue: String(input.newValue),
        source: input.source,
        actor: input.actor || '',
        note: (input.note || '').slice(0, 300),
      },
    });
  } catch (e) {
    console.error('[price-history]', e instanceof Error ? e.message : e);
  }
}

/** Admin bell notification (same table the dashboard already shows). */
export async function notifyAdmin(title: string, message: string, orderId?: string) {
  try {
    await db.adminNotification.create({
      data: {
        id: `notif-sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'supplier',
        orderId: orderId || null,
        title: title.slice(0, 120),
        message: message.slice(0, 500),
        timeLabel: 'Just now',
        read: false,
      },
    });
  } catch {
    /* never block */
  }
}

const locks = new Map<string, Promise<unknown>>();
/** Runs `fn` with at most one run per key in this process; a second caller gets the same result. */
export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cur = locks.get(key) as Promise<T> | undefined;
  if (cur) return cur;
  const p = fn().finally(() => locks.delete(key));
  locks.set(key, p);
  return p;
}

export const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
