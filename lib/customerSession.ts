import { useSyncExternalStore } from 'react';

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

function subscribe(listener: () => void) {
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

function getSnapshot(): CustomerSession | null {
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

function getServerSnapshot(): CustomerSession | null {
  return null;
}

export function useCustomerSession(): CustomerSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readCustomer(): CustomerSession | null {
  return getSnapshot();
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
