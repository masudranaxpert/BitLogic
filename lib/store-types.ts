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

export type StoreNavigateOptions = {
  productId?: string;
  code?: Category | 'ALL';
  q?: string;
  loginMode?: 'login' | 'register';
  accountTab?: AccountTab;
};
