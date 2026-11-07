'use client';

import { useEffect, useRef, useState } from 'react';
import { useStoreSettings } from '@/context/StoreSettingsContext';

/**
 * Current time for countdowns, corrected for the visitor's clock being off.
 * Starts from the server's render time (same on server and client, so markup matches), then ticks.
 * `tickMs` of 0 turns the timer off (products without an order window don't need one).
 */
export function useSaleClock(tickMs = 1000): number | null {
  const { serverNow } = useStoreSettings();
  const skew = useRef<number | null>(null);
  const [now, setNow] = useState<number | null>(serverNow || null);
  useEffect(() => {
    if (!tickMs) return;
    if (skew.current === null) skew.current = serverNow ? serverNow - Date.now() : 0;
    const tick = () => setNow(Date.now() + (skew.current ?? 0));
    tick();
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [serverNow, tickMs]);
  return now;
}
