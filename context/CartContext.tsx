'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Plan, Product } from '@/lib/products';

export type CartItem = {
  productId: string;
  name: string;
  code: Product['code'];
  plan: Plan;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: Product, plan: Plan, qty?: number) => void;
  remove: (productId: string, planId: string) => void;
  clear: () => void;
  updateQty: (productId: string, planId: string, qty: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'bitlogic-cart-v1';
const EMPTY_ITEMS: CartItem[] = [];

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY_ITEMS;
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
      if (e.key === STORAGE_KEY) listener();
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

function getSnapshot(): CartItem[] {
  if (typeof window === 'undefined') return EMPTY_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedItems;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedItems = EMPTY_ITEMS;
      return EMPTY_ITEMS;
    }
    const parsed = JSON.parse(raw);
    cachedItems = Array.isArray(parsed) ? (parsed as CartItem[]) : EMPTY_ITEMS;
    return cachedItems;
  } catch {
    return EMPTY_ITEMS;
  }
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

function writeItems(next: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedItems = next;
    emitChange();
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<CartContextValue>(() => {
    const remove = (productId: string, planId: string) => {
      const current = getSnapshot();
      const next = current.filter(
        (i) => !(i.productId === productId && i.plan.id === planId),
      );
      writeItems(next);
    };

    const add = (product: Product, plan: Plan, qty = 1) => {
      const amount = Math.max(1, Math.floor(qty));
      const current = getSnapshot();
      const idx = current.findIndex(
        (i) => i.productId === product.id && i.plan.id === plan.id,
      );
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], qty: next[idx].qty + amount };
        writeItems(next);
        return;
      }
      writeItems([
        ...current,
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          plan,
          qty: amount,
        },
      ]);
    };

    const updateQty = (productId: string, planId: string, qty: number) => {
      if (qty <= 0) {
        remove(productId, planId);
        return;
      }
      const current = getSnapshot();
      const next = current.map((i) =>
        i.productId === productId && i.plan.id === planId ? { ...i, qty } : i,
      );
      writeItems(next);
    };

    const clear = () => writeItems(EMPTY_ITEMS);
    const count = items.reduce((n, i) => n + i.qty, 0);
    const total = items.reduce((n, i) => n + i.plan.price * i.qty, 0);

    return { items, count, total, add, remove, clear, updateQty };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
