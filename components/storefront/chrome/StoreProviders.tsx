'use client';

import { Suspense, type ReactNode } from 'react';
import { CartProvider } from '@/context/CartContext';
import { QuickOrderProvider } from '@/context/QuickOrderContext';
import { StoreNavProvider } from '@/context/StoreNavContext';
import { CatalogProvider } from '@/context/CatalogContext';
import type { Product } from '@/lib/products';

function StoreProvidersInner({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  return (
    <CatalogProvider products={products}>
      <CartProvider>
        <QuickOrderProvider>
          <StoreNavProvider>{children}</StoreNavProvider>
        </QuickOrderProvider>
      </CartProvider>
    </CatalogProvider>
  );
}

export function StoreProviders({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <StoreProvidersInner products={products}>{children}</StoreProvidersInner>
    </Suspense>
  );
}
