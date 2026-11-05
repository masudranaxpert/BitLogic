'use client';

import { QuickOrderModal } from '@/components/storefront/features/quick-order';
import { ClassicStorefrontView } from '@/components/storefront/pages/ClassicStorefrontView';

export function StorefrontShell() {
  return (
    <div className="storefront-shell min-h-dvh flex flex-col">
      <ClassicStorefrontView />
      <QuickOrderModal />
    </div>
  );
}
