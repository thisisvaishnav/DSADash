import { PrismaClient } from '@repo/db';
import { isDevelopment } from '../../config/env.config';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

/** Singleton Prisma client — reuses the same instance in development to avoid exhausting connections on hot reload */
export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (isDevelopment) {
  globalThis.prismaGlobal = db;
}

/** Graceful shutdown helper */
export const disconnectDB = async (): Promise<void> => {
  await db.$disconnect();
  console.log('🔌 Database disconnected');
};
