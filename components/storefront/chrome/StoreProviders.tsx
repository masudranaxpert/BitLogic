'use client';

import { type ReactNode } from 'react';
import { CartProvider } from '@/context/CartContext';
import { QuickOrderProvider } from '@/context/QuickOrderContext';
import { StoreNavProvider } from '@/context/StoreNavContext';
import { CatalogProvider } from '@/context/CatalogContext';
import type { Product } from '@/lib/products';

export function StoreProviders({
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
