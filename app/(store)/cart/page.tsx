import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Your BitLogic cart.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/cart' },
};

export default function CartPage() {
  return <StorefrontShell />;
}
