import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get help with an order, warranty claim, or account — Blumartbd support.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <StorefrontShell />;
}
