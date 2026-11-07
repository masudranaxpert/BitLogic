/**
 * Interactive createsuperuser (asks email + password in the terminal).
 *
 *   bun run admin:ensure
 *
 * Optional non-interactive:
 *   bun run admin:ensure -- you@mail.com YourPass123
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... bun run admin:ensure
 */
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';
import { ROLES } from '../lib/auth/roles';

const prisma = new PrismaClient();

async function ask(rl: readline.Interface, label: string, hide = false) {
  if (!hide) {
    const answer = (await rl.question(label)).trim();
    return answer;
  }
  // Password: still typed (visible on some Windows terminals); never logged.
  const answer = (await rl.question(label)).trim();
  return answer;
}

async function main() {
  const argv = process.argv.slice(2).filter((a) => a !== '--');

  let email = (argv[0] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  let password = (argv[1] || process.env.ADMIN_PASSWORD || '').trim();
  let nameArg = (argv[2] || process.env.ADMIN_NAME || '').trim();

  if (!email || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      console.log('Create admin account\n');
      if (!email) {
        email = (await ask(rl, 'Email: ')).toLowerCase();
      }
      if (!password) {
        password = await ask(rl, 'Password: ', true);
        const again = await ask(rl, 'Password (again): ', true);
        if (password !== again) {
          console.error('Passwords do not match.');
          process.exit(1);
        }
      }
      if (!nameArg) {
        const n = await ask(rl, 'Name (optional, Enter to skip): ');
        nameArg = n;
      }
    } finally {
      rl.close();
    }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Valid email required.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const name = nameArg || email.split('@')[0] || null;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: ROLES.ADMIN,
      permissionsJson: '[]',
      passwordHash,
    },
    update: {
      name,
      role: ROLES.ADMIN,
      permissionsJson: '[]',
      passwordHash,
    },
  });

  console.log(`\nAdmin ready: ${user.email}`);
  console.log('Log in at /login — then Admin → Staff for more users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
