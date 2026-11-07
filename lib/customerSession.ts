const KEY = 'bitlogic-customer';

export type CustomerSession = {
  name: string;
  email: string;
  phone?: string;
};

let cachedRaw: string | null = null;
let cachedSession: CustomerSession | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeCustomerSession(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCustomerSessionSnapshot(): CustomerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) {
      return cachedSession;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedSession = null;
      return null;
    }
    const parsed = JSON.parse(raw) as CustomerSession;
    cachedSession = parsed?.email ? parsed : null;
    return cachedSession;
  } catch {
    return null;
  }
}

export function getCustomerSessionServerSnapshot(): CustomerSession | null {
  return null;
}

export function readCustomer(): CustomerSession | null {
  return getCustomerSessionSnapshot();
}

export function writeCustomer(session: CustomerSession) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(session);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cachedSession = session;
    emitChange();
  } catch {
    // ignore
  }
}

export function clearCustomer() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
    cachedRaw = null;
    cachedSession = null;
    emitChange();
  } catch {
    // ignore
  }
}

const ORDERS_KEY = 'bitlogic-order-ids';
const ACCESS_KEY = 'bitlogic-order-access';

/** Guest checkout has no login cookie, so remember order ids to prove ownership. */
export function readRememberedOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((x): x is string => typeof x === 'string').slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

/** orderId → accessToken from checkout (guest proof). */
export function readOrderAccessMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function rememberOrderId(orderId: string, accessToken?: string) {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const next = [orderId, ...readRememberedOrderIds().filter((x) => x !== orderId)];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next.slice(0, 50)));
    if (accessToken) {
      const map = readOrderAccessMap();
      map[orderId] = accessToken;
      const keep = next.slice(0, 50);
      const trimmed: Record<string, string> = {};
      for (const id of keep) {
        if (map[id]) trimmed[id] = map[id];
      }
      localStorage.setItem(ACCESS_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // ignore
  }
}

/** Proofs for guest /api/orders (orderId + token pairs). */
export function orderAccessProofs(): Array<{ orderId: string; token: string }> {
  const map = readOrderAccessMap();
  return Object.entries(map).map(([orderId, token]) => ({ orderId, token }));
}

export function getOrderAccessToken(orderId: string): string | undefined {
  if (!orderId) return undefined;
  return readOrderAccessMap()[orderId];
}
