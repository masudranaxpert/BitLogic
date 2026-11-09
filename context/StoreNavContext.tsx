'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/products';
import {
  accountTabFromPath,
  pathToStoreView,
  productIdFromPath,
  storeViewToPath,
} from '@/lib/store-routes';
import type {
  AccountTab,
  StorefrontVariant,
  StoreNavigateOptions,
  StoreView,
} from '@/lib/store-types';

export type {
  AccountTab,
  StorefrontVariant,
  StoreView,
} from '@/lib/store-types';

type StoreNavContextValue = {
  view: StoreView;
  variant: StorefrontVariant;
  setVariant: (v: StorefrontVariant) => void;
  selectedProductId: string | null;
  categoryCode: Category | 'ALL';
  searchQuery: string;
  loginMode: 'login' | 'register';
  accountTab: AccountTab;
  navigateTo: (view: StoreView, options?: StoreNavigateOptions) => void;
};

const StoreNavContext = createContext<StoreNavContextValue | null>(null);

function SearchParamsWatcher({
  onChange,
}: {
  onChange: (sp: URLSearchParams) => void;
}) {
  const sp = useSearchParams();
  useEffect(() => {
    onChange(new URLSearchParams(sp.toString()));
  }, [sp, onChange]);
  return null;
}

export function StoreNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [params, setParams] = useState<URLSearchParams>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  const [variant, setVariant] = useState<StorefrontVariant>('classic');

  const view = pathToStoreView(pathname);
  const selectedProductId = productIdFromPath(pathname);
  const categoryCode = (params.get('code') as Category | 'ALL' | null) || 'ALL';
  const searchQuery = params.get('q') || '';
  const loginMode: 'login' | 'register' =
    params.get('mode') === 'register' ? 'register' : 'login';
  const accountTab = accountTabFromPath(pathname, params.get('tab'));

  // /account?tab=orders and unknown /account/foo → canonical path.
  useEffect(() => {
    if (!pathname.startsWith('/account')) return;
    const expected = storeViewToPath('account', { accountTab });
    const here = pathname.replace(/\/$/, '') || '/account';
    if (params.get('tab') || here !== expected) {
      router.replace(expected);
    }
  }, [accountTab, pathname, router, params]);

  const navigateTo = useCallback(
    (nextView: StoreView, options?: StoreNavigateOptions) => {
      const href = storeViewToPath(nextView, {
        productId: options?.productId ?? selectedProductId ?? undefined,
        code: options?.code,
        q: options?.q,
        loginMode: options?.loginMode ?? loginMode,
        accountTab: options?.accountTab ?? accountTab,
      });

      router.push(href);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [accountTab, loginMode, router, selectedProductId],
  );

  const value = useMemo(
    () => ({
      view,
      variant,
      setVariant,
      selectedProductId,
      categoryCode,
      searchQuery,
      loginMode,
      accountTab,
      navigateTo,
    }),
    [
      accountTab,
      categoryCode,
      loginMode,
      navigateTo,
      searchQuery,
      selectedProductId,
      variant,
      view,
    ],
  );

  return (
    <StoreNavContext.Provider value={value}>
      <Suspense fallback={null}>
        <SearchParamsWatcher onChange={setParams} />
      </Suspense>
      {children}
    </StoreNavContext.Provider>
  );
}

export function useStoreNav() {
  const ctx = useContext(StoreNavContext);
  if (!ctx) throw new Error('useStoreNav must be used within StoreNavProvider');
  return ctx;
}
