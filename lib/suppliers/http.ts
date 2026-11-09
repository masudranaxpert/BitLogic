import { SupplierApiError, type SupplierCtx, type SupplierErrorCode } from './types';

const TIMEOUT_MS = 15_000;

export type ErrorMapper = (input: {
  status: number;
  body: unknown;
  retryAfterSec?: number;
}) => SupplierApiError;

/** Removes anything that looks like an API key from text we store or show. */
export function scrub(text: string, key?: string): string {
  let out = text;
  if (key) out = out.split(key).join('[key]');
  return out
    .replace(/(sk_live_|jaha_live_)[A-Za-z0-9._-]+/g, '$1[key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [key]')
    .slice(0, 500);
}

/** JSON request to a supplier with timeout, auth header and normalized errors. */
export async function supplierFetch<T>(
  ctx: SupplierCtx,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  mapError: ErrorMapper,
): Promise<{ data: T; headers: Headers }> {
  const url = ctx.baseUrl.replace(/\/+$/, '') + path;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method || 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${ctx.apiKey}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new SupplierApiError('NETWORK', timeout ? 'Supplier did not answer in time.' : 'Could not reach the supplier.', {
      retryable: true,
    });
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const ra = Number(res.headers.get('retry-after'));
    throw mapError({ status: res.status, body, retryAfterSec: Number.isFinite(ra) && ra > 0 ? ra : undefined });
  }
  return { data: body as T, headers: res.headers };
}

/** Fallback mapping from HTTP status when the supplier's code is unknown. */
export function errorFromStatus(status: number, message: string, rawCode?: string, retryAfterSec?: number) {
  const byStatus: Record<number, SupplierErrorCode> = {
    401: 'AUTH',
    402: 'BALANCE',
    403: 'SCOPE',
    404: 'NOT_FOUND',
    409: 'UNAVAILABLE',
    422: 'INVALID',
    429: 'RATE_LIMITED',
  };
  const code: SupplierErrorCode = byStatus[status] || (status >= 500 ? 'SERVER' : 'INVALID');
  return new SupplierApiError(code, message || `Supplier error ${status}`, {
    httpStatus: status,
    retryable: code === 'SERVER' || code === 'RATE_LIMITED',
    retryAfterSec,
    rawCode,
  });
}

export const toInt = (v: unknown, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : d;
};

/** Normalizes "12.5000" → "12.5", keeps it a string. */
export function decimalString(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return '0';
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
