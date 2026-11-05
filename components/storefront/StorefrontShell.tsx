'use client';

import React from 'react';
import { QuickOrderModal } from './quick-order';
import { ClassicStorefrontView } from './ClassicStorefrontView';

export function StorefrontShell() {
  return (
    <div className="min-h-dvh flex flex-col">
      <ClassicStorefrontView />
      <QuickOrderModal />
    </div>
  );
}
