import { PrismaClient } from '@prisma/client';
import { products } from '../lib/products';
import { durationLabelToDays } from '../lib/catalog/duration';
import { hashPassword } from '../lib/auth/password';
import { ROLES } from '../lib/auth/roles';

const prisma = new PrismaClient();

async function seedUsers() {
  const adminHash = await hashPassword('admin123');
  const customerHash = await hashPassword('customer123');

  await prisma.user.upsert({
    where: { email: 'admin@bitlogic.local' },
    create: {
      email: 'admin@bitlogic.local',
      name: 'BitLogic Admin',
      role: ROLES.ADMIN,
      passwordHash: adminHash,
    },
    update: {
      name: 'BitLogic Admin',
      role: ROLES.ADMIN,
      passwordHash: adminHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@bitlogic.local' },
    create: {
      email: 'customer@bitlogic.local',
      name: 'Demo Customer',
      phone: '01712-345678',
      role: ROLES.CUSTOMER,
      passwordHash: customerHash,
    },
    update: {
      name: 'Demo Customer',
      phone: '01712-345678',
      role: ROLES.CUSTOMER,
      passwordHash: customerHash,
    },
  });

  console.log(
    'Seeded users: admin@bitlogic.local / admin123, customer@bitlogic.local / customer123',
  );
}

async function main() {
  await seedUsers();

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.id },
      create: {
        slug: product.id,
        name: product.name,
        description: product.description,
        tagline: product.tagline,
        category: product.code,
        platform: product.platform,
        imageUrl: product.image,
        galleryJson: JSON.stringify(product.gallery),
        featuresJson: JSON.stringify(product.features),
        badge: product.badge ?? null,
        sale: Boolean(product.sale),
        featured: Boolean(product.featured),
        isActive: true,
        plans: {
          create: product.plans.map((plan) => ({
            code: plan.id,
            label: plan.label,
            durationLabel: plan.duration,
            durationDays: durationLabelToDays(plan.duration),
            priceBdt: plan.price,
            warrantyBadge: plan.warrantyBadge ?? null,
            warrantyType: plan.warrantyType ?? null,
            warrantyHeadline: plan.warrantyHeadline ?? null,
            detailsJson: JSON.stringify(plan.details ?? []),
            isActive: true,
          })),
        },
      },
      update: {
        name: product.name,
        description: product.description,
        tagline: product.tagline,
        category: product.code,
        platform: product.platform,
        imageUrl: product.image,
        galleryJson: JSON.stringify(product.gallery),
        featuresJson: JSON.stringify(product.features),
        badge: product.badge ?? null,
        sale: Boolean(product.sale),
        featured: Boolean(product.featured),
        isActive: true,
        plans: {
          deleteMany: {},
          create: product.plans.map((plan) => ({
            code: plan.id,
            label: plan.label,
            durationLabel: plan.duration,
            durationDays: durationLabelToDays(plan.duration),
            priceBdt: plan.price,
            warrantyBadge: plan.warrantyBadge ?? null,
            warrantyType: plan.warrantyType ?? null,
            warrantyHeadline: plan.warrantyHeadline ?? null,
            detailsJson: JSON.stringify(plan.details ?? []),
            isActive: true,
          })),
        },
      },
    });
  }

  const count = await prisma.product.count();
  console.log(`Seeded ${count} products`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
