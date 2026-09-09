/**
 * job-opening-status.test.ts — V6 Phase 1 STEP-02
 *
 * 5 unit test cases for summarizeAllJobOpenings:
 * 1. 0 opening → all zero, total = 0.
 * 2. mix status → counts đúng.
 * 3. status ngoài 4 giá trị KHÔNG xuất hiện trong byStatus.
 * 4. Prisma throws → bubble up.
 * 5. groupBy không có DRAFT (chỉ OPEN) → DRAFT = 0.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockPrisma = {
  jobOpening: {
    groupBy: ReturnType<typeof vi.fn>;
  };
};

function makeMockPrisma(groups: Array<{ status: string; _count: { status: number } }> | Error): MockPrisma {
  const mockGroupBy = vi.fn();
  if (groups instanceof Error) {
    mockGroupBy.mockRejectedValue(groups);
  } else {
    mockGroupBy.mockResolvedValue(groups);
  }
  return {
    jobOpening: { groupBy: mockGroupBy },
  } as unknown as MockPrisma;
}

import { summarizeAllJobOpenings } from './job-opening-status';

describe('summarizeAllJobOpenings', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('0 opening → all zero, total = 0', async () => {
    const prisma = makeMockPrisma([]);
    const result = await summarizeAllJobOpenings(prisma as any);

    expect(result.byStatus).toEqual({ DRAFT: 0, OPEN: 0, FILLED: 0, CANCELLED: 0 });
    expect(result.total).toBe(0);
  });

  it('mix status → counts đúng', async () => {
    const prisma = makeMockPrisma([
      { status: 'DRAFT', _count: { status: 3 } },
      { status: 'OPEN', _count: { status: 12 } },
      { status: 'FILLED', _count: { status: 5 } },
      { status: 'CANCELLED', _count: { status: 1 } },
    ]);
    const result = await summarizeAllJobOpenings(prisma as any);

    expect(result.byStatus).toEqual({ DRAFT: 3, OPEN: 12, FILLED: 5, CANCELLED: 1 });
    expect(result.total).toBe(21);
  });

  it('status ngoài 4 giá trị KHÔNG xuất hiện trong byStatus', async () => {
    // Simulate a stray status value in the database (e.g. legacy typo)
    const prisma = makeMockPrisma([
      { status: 'OPEN', _count: { status: 7 } },
      { status: 'SOME_OTHER_STATUS', _count: { status: 99 } },
    ]);
    const result = await summarizeAllJobOpenings(prisma as any);

    // Only OPEN should be present; the stray status must NOT appear in byStatus
    expect(result.byStatus).toEqual({ DRAFT: 0, OPEN: 7, FILLED: 0, CANCELLED: 0 });
    expect(Object.keys(result.byStatus)).toHaveLength(4);
    expect(result.total).toBe(7);
  });

  it('Prisma throws → bubble up (không nuốt lỗi)', async () => {
    const dbError = new Error('Database connection failed');
    const prisma = makeMockPrisma(dbError);

    await expect(summarizeAllJobOpenings(prisma as any)).rejects.toThrow(
      'Database connection failed',
    );
  });

  it('groupBy không có DRAFT (chỉ OPEN) → DRAFT = 0', async () => {
    const prisma = makeMockPrisma([
      { status: 'OPEN', _count: { status: 4 } },
      { status: 'FILLED', _count: { status: 2 } },
    ]);
    const result = await summarizeAllJobOpenings(prisma as any);

    expect(result.byStatus).toEqual({ DRAFT: 0, OPEN: 4, FILLED: 2, CANCELLED: 0 });
    expect(result.total).toBe(6);
  });
});
