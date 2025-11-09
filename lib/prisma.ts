import { PrismaClient } from '@prisma/client';
import path from 'path';

const getDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    return `file:${dbPath}`;
  }
  return process.env.DATABASE_URL;
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
