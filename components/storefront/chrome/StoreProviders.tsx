'use client';

import { type ReactNode } from 'react';
import { CartProvider } from '@/context/CartContext';
import { QuickOrderProvider } from '@/context/QuickOrderContext';
import { StoreNavProvider } from '@/context/StoreNavContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { FloatingWhatsApp } from '@/components/storefront/chrome/FloatingWhatsApp';
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
          <StoreNavProvider>
            {children}
            <FloatingWhatsApp />
          </StoreNavProvider>
        </QuickOrderProvider>
      </CartProvider>
    </CatalogProvider>
  );
}
