import { db } from '@/lib/db';
import { pollAdditions, pollSupplierOrders, sweepPendingUnits } from './dispatch';
import { syncSupplier } from './sync';

/**
 * Background work for suppliers, started once per server process (instrumentation.ts):
 * - every minute: poll processing orders, sweep paid-but-pending units, re-read fresh deliveries
 * - per supplier: catalog/price/stock sync every `syncIntervalMin`
 * Each step is isolated: one failing supplier never stops the others.
 */

const g = globalThis as unknown as { __blSupplierTimer?: ReturnType<typeof setInterval>; __blSupplierBusy?: boolean };

export async function supplierTick() {
  if (g.__blSupplierBusy) return;
  g.__blSupplierBusy = true;
  try {
    await step('poll', () => pollSupplierOrders());
    await step('sweep', () => sweepPendingUnits());
    await step('additions', () => pollAdditions());
    const suppliers = await db.supplier.findMany({ where: { isEnabled: true } });
    for (const s of suppliers) {
      const due = !s.lastSyncAt || Date.now() - s.lastSyncAt.getTime() > Math.max(5, s.syncIntervalMin) * 60_000;
      // A rejected key is not retried every minute: wait for an admin to fix it (or 6 h).
      const authBroken = s.lastSyncError.startsWith('AUTH') && s.lastSyncAt && Date.now() - s.lastSyncAt.getTime() < 6 * 3_600_000;
      if (due && !authBroken && s.lastSyncStatus !== 'running') await step(`sync ${s.name}`, () => syncSupplier(s.id));
    }
  } finally {
    g.__blSupplierBusy = false;
  }
}

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    console.error(`[suppliers:${name}]`, e instanceof Error ? e.message : e);
  }
}

export function startSupplierScheduler() {
  if (g.__blSupplierTimer || process.env.SUPPLIER_SCHEDULER === 'off') return;
  // A sync left "running" by a crash would block forever.
  void db.supplier.updateMany({ where: { lastSyncStatus: 'running' }, data: { lastSyncStatus: 'error', lastSyncError: 'Interrupted by a restart.' } }).catch(() => {});
  g.__blSupplierTimer = setInterval(() => void supplierTick(), 60_000);
  setTimeout(() => void supplierTick(), 15_000);
}
