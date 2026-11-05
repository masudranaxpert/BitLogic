'use client';

import { useSyncExternalStore } from 'react';
import {
  getCustomerSessionServerSnapshot,
  getCustomerSessionSnapshot,
  subscribeCustomerSession,
  type CustomerSession,
} from '@/lib/customerSession';

export function useCustomerSession(): CustomerSession | null {
  return useSyncExternalStore(
    subscribeCustomerSession,
    getCustomerSessionSnapshot,
    getCustomerSessionServerSnapshot,
  );
}
