'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '@/lib/products';

type QuickOrderOptions = {
  planId?: string;
  qty?: number;
};

type QuickOrderContextValue = {
  product: Product | null;
  initialPlanId: string;
  initialQty: number;
  openKey: number;
  openQuickOrder: (product: Product, options?: QuickOrderOptions) => void;
  closeQuickOrder: () => void;
};

const QuickOrderContext = createContext<QuickOrderContextValue | null>(null);

export function QuickOrderProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [initialPlanId, setInitialPlanId] = useState('');
  const [initialQty, setInitialQty] = useState(1);
  const [openKey, setOpenKey] = useState(0);

  const openQuickOrder = useCallback(
    (next: Product, options?: QuickOrderOptions) => {
      setProduct(next);
      setInitialPlanId(options?.planId ?? '');
      setInitialQty(Math.max(1, Math.min(20, options?.qty ?? 1)));
      setOpenKey((k) => k + 1);
    },
    [],
  );

  const closeQuickOrder = useCallback(() => {
    setProduct(null);
    setInitialPlanId('');
    setInitialQty(1);
  }, []);

  const value = useMemo(
    () => ({
      product,
      initialPlanId,
      initialQty,
      openKey,
      openQuickOrder,
      closeQuickOrder,
    }),
    [product, initialPlanId, initialQty, openKey, openQuickOrder, closeQuickOrder],
  );

  return (
    <QuickOrderContext.Provider value={value}>
      {children}
    </QuickOrderContext.Provider>
  );
}

export function useQuickOrder() {
  const ctx = useContext(QuickOrderContext);
  if (!ctx) throw new Error('useQuickOrder must be used inside QuickOrderProvider');
  return ctx;
}
