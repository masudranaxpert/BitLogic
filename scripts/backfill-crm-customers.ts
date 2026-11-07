/**
 * One-off: give every CUSTOMER login a row in Admin → Customers (AdminSubscriber).
 * Safe to re-run. Run: npx tsx scripts/backfill-crm-customers.ts
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ where: { role: 'CUSTOMER' } });
  let created = 0;
  for (const u of users) {
    const has = await db.adminSubscriber.findUnique({ where: { email: u.email } });
    if (has) continue;
    const d = u.createdAt;
    const joinedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await db.adminSubscriber.create({
      data: { id: `cust-${randomUUID().slice(0, 12)}`, name: u.name || u.email.split('@')[0], email: u.email, phone: u.phone || '', joinedAt },
    });
    created++;
  }
  console.log(`CRM rows created: ${created} (of ${users.length} customer accounts)`);
}

main().finally(() => db.$disconnect());
