import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How BitLogic delivery, credentials, warranty tracking, and renewals work from checkout to access.',
  alternates: { canonical: '/how' },
};

export default function HowPage() {
  return <StorefrontShell />;
}
