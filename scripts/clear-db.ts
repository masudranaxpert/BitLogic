import { PrismaClient } from '@prisma/client';

/** Wipe all business rows so the app runs on an empty DB (no mock seed). */
const prisma = new PrismaClient();

async function main() {
  await prisma.credentialAudit.deleteMany();
  await prisma.orderNote.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.digitalDelivery.deleteMany();
  await prisma.vaultCredential.deleteMany();
  await prisma.productPlan.deleteMany();
  await prisma.product.deleteMany();
  await prisma.catalogCategory.deleteMany();
  await prisma.warrantyTemplate.deleteMany();
  await prisma.credentialScheme.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.adminSubscriber.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.couponCode.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.storeSetting.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database cleared — no mock rows remain.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
