/**
 * reset-passwords.ts — Resets ALL user passwords to easy defaults.
 *
 * Run with:
 *   cd sponsiwise_backend && npx ts-node prisma/reset-passwords.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NEW_PASSWORD = 'Test1234';

async function main() {
  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });

  console.log(`\n🔑 Resetting passwords for ${users.length} users to "${NEW_PASSWORD}"\n`);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    console.log(`  ✅ ${user.email.padEnd(35)} role=${user.role}`);
  }

  console.log(`\n✅ Done! All passwords are now: ${NEW_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
