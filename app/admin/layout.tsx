import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';
import { AdminDashboard, AdminShellSkeleton } from '@/components/admin';

export const metadata: Metadata = {
  title: 'Admin',
  description:
    'Blumartbd admin console for products, credential vault, deliveries, payments, and support.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout() {
  // Reconcile JWT against DB (sessionVersion / demotion) — middleware alone cannot.
  const session = await getSession();
  if (
    !session ||
    (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)
  ) {
    redirect('/login?next=/admin');
  }
  // The shell lives in the layout so it persists across every /admin/* navigation.
  // AdminDashboard renders the active view itself from the URL, so pages return null.
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
