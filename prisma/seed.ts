import { PrismaClient } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding platform settings...');

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      feePercentage: 3.0,
      feeFixed: 200.0,
      currencyDefault: 'NGN',
    },
  });

  console.log('Default platform settings seeded successfully.');
  await pool.end();
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });
