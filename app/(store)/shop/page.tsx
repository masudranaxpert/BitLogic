import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Browse digital subscriptions — AI tools, streaming, productivity, and creative apps with fast delivery.',
  alternates: { canonical: '/shop' },
};

export default function ShopPage() {
  return <StorefrontShell />;
}
