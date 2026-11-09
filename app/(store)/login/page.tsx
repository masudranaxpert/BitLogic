import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Blumartbd account.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return <StorefrontShell />;
}
