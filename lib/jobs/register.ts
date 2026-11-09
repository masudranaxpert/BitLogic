/**
 * Server jobs started once from instrumentation.ts.
 * Request-triggered work (credential expiry on workspace/orders GET) stays next to that route.
 */
export function startBackgroundJobs() {
  // Every 60s: poll supplier orders, sweep paid units, sync catalogs due by syncIntervalMin (min 5).
  void import('@/lib/suppliers/scheduler').then((m) => m.startSupplierScheduler());
}
