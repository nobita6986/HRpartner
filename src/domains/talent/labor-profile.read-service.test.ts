import { describe, it, expect, vi } from 'vitest';
import { getLaborProfilesList, getLaborProfileDetail } from './labor-profile.read-service';
import type { Prisma } from '@prisma/client';

describe('LaborProfile Read Service', () => {
  it('getLaborProfilesList should call tx.laborProfile.findMany', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([]);
    const mockCount = vi.fn().mockResolvedValue(0);
    const mockTx = {
      laborProfile: {
        findMany: mockFindMany,
        count: mockCount,
      },
    } as unknown as Prisma.TransactionClient;

    const result = await getLaborProfilesList(mockTx, { search: 'test' });
    expect(mockFindMany).toHaveBeenCalled();
    expect(result.total).toBe(0);
  });

  it('getLaborProfileDetail should call tx.laborProfile.findUnique', async () => {
    const mockFindUnique = vi.fn().mockResolvedValue({
      id: '123',
      createdAt: new Date(),
      updatedAt: new Date(),
      intakes: [],
      submissions: [],
      episodes: [],
      placementCases: [],
    });
    const mockTx = {
      laborProfile: {
        findUnique: mockFindUnique,
      },
    } as unknown as Prisma.TransactionClient;

    const result = await getLaborProfileDetail(mockTx, '123');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: '123' },
      include: expect.any(Object),
    });
    expect(result?.id).toBe('123');
  });
});
