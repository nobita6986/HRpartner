import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaClientConstructor, sharedClient } = vi.hoisted(() => {
  const client = { marker: 'shared-prisma-client' };
  return {
    sharedClient: client,
    prismaClientConstructor: vi.fn(function PrismaClientMock() {
      return client;
    }),
  };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: prismaClientConstructor,
}));

import { getPrisma } from '@/src/lib/db';

describe('getPrisma singleton', () => {
  beforeEach(() => {
    globalThis.__hrpPrisma = undefined;
    prismaClientConstructor.mockClear();
  });

  it('reuses one client across a concurrent request burst', async () => {
    const clients = await Promise.all(
      Array.from({ length: 64 }, async () => getPrisma()),
    );

    expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    expect(new Set(clients)).toEqual(new Set([sharedClient]));
  });
});