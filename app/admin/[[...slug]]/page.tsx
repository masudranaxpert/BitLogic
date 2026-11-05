import { Suspense } from 'react';
import { AdminDashboard } from '@/components/admin';

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
