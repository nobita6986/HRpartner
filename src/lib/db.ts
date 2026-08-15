import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __hrpPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__hrpPrisma) {
    globalThis.__hrpPrisma = new PrismaClient();
  }
  return globalThis.__hrpPrisma;
}
