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
