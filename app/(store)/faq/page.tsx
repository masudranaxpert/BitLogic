import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about delivery, warranties, renewals, payments, and account access on BitLogic.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return <StorefrontShell />;
}
