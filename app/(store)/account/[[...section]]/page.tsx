import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Your BitLogic orders, credentials, and support.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/account' },
};

export default function AccountPage() {
  return <StorefrontShell />;
}
