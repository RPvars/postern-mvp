import { PrismaClient } from '@prisma/client';
import path from 'path';

// In production / Postgres, DATABASE_URL is the source of truth.
// In local dev with SQLite the relative URL fails depending on cwd, so we
// resolve it to an absolute path against the project root.
const getDatabaseUrl = () => {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv && !fromEnv.startsWith('file:')) {
    return fromEnv;
  }
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return `file:${dbPath}`;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: ['error', 'warn']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
