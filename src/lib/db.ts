import { PrismaClient } from '../../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isSupabase = process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('pooler');

if (!globalForPrisma.prisma) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on inactive database pool client:', err);
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
