/**
 * One-off: give already-delivered units real warranty dates (start = delivery time).
 * Safe to re-run: only touches units without warrantyStartsAt.
 *   npx tsx scripts/backfill-warranty-dates.ts
 */
import { PrismaClient } from '@prisma/client';
import { parseStamp, warrantyWindow } from '../lib/warranty';

const db = new PrismaClient();

async function main() {
  const units = await db.digitalDelivery.findMany({
    where: { warrantyStartsAt: null, hasWarranty: true, deliveredAt: { not: null } },
  });
  let n = 0;
  for (const u of units) {
    const start = parseStamp(u.deliveredAt) ?? parseStamp(u.credentialAssignedAt);
    if (!start || !u.warrantyDays) continue;
    const w = warrantyWindow(start, u.warrantyDays, u.orderExpiresAt);
    await db.digitalDelivery.update({
      where: { id: u.id },
      data: { warrantyStartsAt: w.startsAt, warrantyEndsAt: w.endsAt },
    });
    n++;
  }
  console.log(`Backfilled ${n} of ${units.length} delivered units.`);
}

main().finally(() => db.$disconnect());
