'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Category } from '@/lib/products';

export type StoreView =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'how'
  | 'faq'
  | 'contact'
  | 'login'
  | 'account'
  | 'admin';

export type StorefrontVariant = 'pop' | 'classic';

export type AccountTab =
  | 'overview'
  | 'credentials'
  | 'orders'
  | 'warranty'
  | 'tickets'
  | 'profile'
  | 'library';

type StoreNavContextValue = {
  view: StoreView;
  variant: StorefrontVariant;
  setVariant: (v: StorefrontVariant) => void;
  selectedProductId: string | null;
  categoryCode: Category | 'ALL';
  searchQuery: string;
  loginMode: 'login' | 'register';
  accountTab: AccountTab;
  navigateTo: (
    view: StoreView,
    options?: {
      productId?: string;
      code?: Category | 'ALL';
      q?: string;
      loginMode?: 'login' | 'register';
      accountTab?: AccountTab;
    },
  ) => void;
};

const StoreNavContext = createContext<StoreNavContextValue | null>(null);

export function StoreNavProvider({
  children,
  initialView = 'home',
  onSwitchToAdmin,
}: {
  children: ReactNode;
  initialView?: StoreView;
  onSwitchToAdmin?: () => void;
}) {
  const [view, setView] = useState<StoreView>(initialView);
  const [variant, setVariant] = useState<StorefrontVariant>('classic');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categoryCode, setCategoryCode] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [accountTab, setAccountTab] = useState<AccountTab>('overview');

  const navigateTo = (
    nextView: StoreView,
    options?: {
      productId?: string;
      code?: Category | 'ALL';
      q?: string;
      loginMode?: 'login' | 'register';
      accountTab?: AccountTab;
    },
  ) => {
    if (nextView === 'admin' && onSwitchToAdmin) {
      onSwitchToAdmin();
      return;
    }

    if (options?.productId !== undefined) {
      setSelectedProductId(options.productId);
    }
    if (options?.code !== undefined) {
      setCategoryCode(options.code);
    }
    if (options?.q !== undefined) {
      setSearchQuery(options.q);
    }
    if (options?.loginMode !== undefined) {
      setLoginMode(options.loginMode);
    }
    if (options?.accountTab !== undefined) {
      setAccountTab(options.accountTab);
    }

    setView(nextView);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <StoreNavContext.Provider
      value={{
        view,
        variant,
        setVariant,
        selectedProductId,
        categoryCode,
        searchQuery,
        loginMode,
        accountTab,
        navigateTo,
      }}
    >
      {children}
    </StoreNavContext.Provider>
  );
}

export function useStoreNav() {
  const ctx = useContext(StoreNavContext);
  if (!ctx) throw new Error('useStoreNav must be used within StoreNavProvider');
  return ctx;
}
