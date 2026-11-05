import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  description:
    'BitLogic admin console for products, credential vault, deliveries, payments, and support.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
