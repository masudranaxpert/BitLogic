import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { ROLES } from '../lib/auth/roles';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bitlogic.local';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'BitLogic Admin',
      role: ROLES.ADMIN,
      passwordHash,
    },
    update: {
      name: 'BitLogic Admin',
      role: ROLES.ADMIN,
      passwordHash,
    },
  });

  console.log(`Admin ready: ${user.email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
