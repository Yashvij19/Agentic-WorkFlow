import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;
let pgPoolInstance: pg.Pool;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
  pgPoolInstance = (globalForPrisma as any).pgPool;
} else {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new pg.Pool({
    connectionString,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  });

  pgPoolInstance = pool;
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
    (globalForPrisma as any).pgPool = pgPoolInstance;
  }
}

export const prisma = prismaInstance;
export const pgPool = pgPoolInstance;