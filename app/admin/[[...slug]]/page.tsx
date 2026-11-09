import { Suspense } from 'react';
import { AdminDashboard, AdminShellSkeleton } from '@/components/admin';

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
