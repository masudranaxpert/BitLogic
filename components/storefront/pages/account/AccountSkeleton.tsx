'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** false during SSR and the hydration pass, true after. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function AccountSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"
      aria-busy="true"
      aria-label="Loading your account"
    >
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="hidden space-y-2 md:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-md bg-slate-200/70"
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200/70" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-slate-200/60"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-slate-200/50" />
        </div>
      </div>
    </div>
  );
}
