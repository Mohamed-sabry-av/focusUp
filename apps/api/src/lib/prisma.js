import { env } from '@focusUp/env/server';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
const globalForPrisma = global;
function createPrismaClient() {
    const adapter = new PrismaPg({
        connectionString: env.DATABASE_URL,
    });
    return new PrismaClient({
        adapter,
        log: ['query', 'info', 'warn', 'error'],
    });
}
export const prisma = globalForPrisma.prisma ||
    (process.env.NODE_ENV === 'test'
        ? {} // Should be mocked anyway
        : createPrismaClient());
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
export default prisma;
