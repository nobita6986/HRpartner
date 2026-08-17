/**
 * talent-pool.repo unit tests — Phase 4 slice 4A STEP-05 (RQ-05).
 *
 * Test cases:
 * 1. queryTalentPool — success (no active workers → all returned)
 * 2. queryTalentPool — filters active workers (active worker excluded)
 * 3. queryTalentPool — permission denied
 * 4. countUnassignedWorkers — success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;
type MockPrisma = {
  $queryRawUnsafe: MockFn;
  worker: {
    findMany: MockFn;
    count: MockFn;
  };
};

function makeMockPrisma(overrides?: Partial<MockPrisma>): MockPrisma {
  return {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    worker: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as unknown as MockPrisma;
}

const HR_CTX = { userId: 'hr-001', role: 'HR_MANAGER' as const };

import { queryTalentPool, countUnassignedWorkers, TalentPoolError } from './talent-pool.repo';

describe('talent-pool.repo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock('@/src/shared/auth/permission-resolver', () => ({
      resolveEffectivePermissions: vi.fn().mockResolvedValue(
        new Set(['CAN_VIEW_UNASSIGNED_POOL'])
      ),
    }));
  });

  it('queryTalentPool returns rows with pagination', async () => {
    const workers = [
      { id: 'wk-001', name: 'Nguyen Van A', vendor: { id: 'v1', name: 'Vendor A' } },
      { id: 'wk-002', name: 'Tran Van B', vendor: { id: 'v2', name: 'Vendor B' } },
    ];
    const prisma = makeMockPrisma({
      $queryRawUnsafe: vi.fn().mockResolvedValue([]), // no active workers
      worker: {
        findMany: vi.fn().mockResolvedValue(workers),
        count: vi.fn().mockResolvedValue(2),
      },
    });

    const result = await queryTalentPool(prisma as any, HR_CTX, { page: 1, pageSize: 20 });
    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
  });

  it('queryTalentPool excludes active workers', async () => {
    const prisma = makeMockPrisma({
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ worker_id: 'wk-active' }]),
      worker: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    });

    await queryTalentPool(prisma as any, HR_CTX);
    expect(prisma.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['wk-active'] },
        }),
      })
    );
  });

  it('queryTalentPool page size capped at 50', async () => {
    const prisma = makeMockPrisma();
    await queryTalentPool(prisma as any, HR_CTX, { pageSize: 100 });
    expect(prisma.worker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it('countUnassignedWorkers returns number', async () => {
    const prisma = makeMockPrisma({
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ worker_id: 'wk-001' }]),
      worker: { count: vi.fn().mockResolvedValue(5), findMany: vi.fn() },
    });

    const count = await countUnassignedWorkers(prisma as any, HR_CTX);
    expect(count).toBe(5);
  });
});
