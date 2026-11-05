import type { AccountTab, StoreNavigateOptions, StoreView } from '@/lib/store-types';

export type { StoreNavigateOptions } from '@/lib/store-types';

export function pathToStoreView(pathname: string): StoreView {
  if (pathname.startsWith('/shop')) return 'shop';
  if (pathname.startsWith('/product')) return 'product';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/how')) return 'how';
  if (pathname.startsWith('/faq')) return 'faq';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
}

export function productIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/product\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function storeViewToPath(
  view: StoreView,
  options?: StoreNavigateOptions,
): string {
  switch (view) {
    case 'shop': {
      const params = new URLSearchParams();
      if (options?.code && options.code !== 'ALL') params.set('code', options.code);
      if (options?.q) params.set('q', options.q);
      const qs = params.toString();
      return qs ? `/shop?${qs}` : '/shop';
    }
    case 'product': {
      const id = options?.productId || 'chatgpt-plus';
      return `/product/${encodeURIComponent(id)}`;
    }
    case 'cart':
      return '/cart';
    case 'how':
      return '/how';
    case 'faq':
      return '/faq';
    case 'contact':
      return '/contact';
    case 'login': {
      const params = new URLSearchParams();
      if (options?.loginMode && options.loginMode !== 'login') {
        params.set('mode', options.loginMode);
      }
      const qs = params.toString();
      return qs ? `/login?${qs}` : '/login';
    }
    case 'account': {
      const params = new URLSearchParams();
      if (options?.accountTab && options.accountTab !== 'overview') {
        params.set('tab', options.accountTab);
      }
      const qs = params.toString();
      return qs ? `/account?${qs}` : '/account';
    }
    case 'admin':
      return '/admin';
    case 'home':
    default:
      return '/';
  }
}

export function parseAccountTab(value: string | null): AccountTab {
  const tabs: AccountTab[] = [
    'overview',
    'credentials',
    'orders',
    'warranty',
    'tickets',
    'profile',
    'library',
  ];
  if (value && tabs.includes(value as AccountTab)) {
    return value as AccountTab;
  }
  return 'overview';
}
