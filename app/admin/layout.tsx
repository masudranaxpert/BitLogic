import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = {
  title: 'Admin',
  description:
    'Blumartbd admin console for products, credential vault, deliveries, payments, and support.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reconcile JWT against DB (sessionVersion / demotion) — middleware alone cannot.
  const session = await getSession();
  if (
    !session ||
    (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)
  ) {
    redirect('/login?next=/admin');
  }
  return children;
}
