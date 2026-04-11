import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  (process.env.NODE_ENV === 'test'
    ? ({} as PrismaClient) // Should be mocked anyway
    : new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      }));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
