import { describe, it, expect, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { getProjectDetail } from './project-read.service';

function makeMockTx(overrides: any = {}): Prisma.TransactionClient {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue(overrides.project ?? null),
    },
    projectAssignment: { count: vi.fn().mockResolvedValue(overrides.assignmentsCount ?? 0) },
    candidateSubmission: { count: vi.fn().mockResolvedValue(overrides.submissionsCount ?? 0) },
  } as unknown as Prisma.TransactionClient;
}

describe('getProjectDetail', () => {
  it('trả về null nếu project không tồn tại (missing/invisible)', async () => {
    const tx = makeMockTx({ project: null });
    const result = await getProjectDetail(tx, 'invalid');
    expect(result).toBeNull();
  });

  it('serialize Date thành chuỗi ISO', async () => {
    const mockDate1 = new Date('2026-01-01T10:00:00Z');
    const mockDate2 = new Date('2026-12-31T10:00:00Z');
    
    const mockProject = {
      id: 'p1', code: 'P01', name: 'Proj 1', status: 'ACTIVE',
      startDate: mockDate1, endDate: mockDate2,
      clientCompany: { id: 'c1', name: 'Client 1' },
      staffingOrders: []
    };

    const tx = makeMockTx({ project: mockProject, assignmentsCount: 3, submissionsCount: 7 });
    const result = await getProjectDetail(tx, 'p1');

    expect(result).not.toBeNull();
    expect(result?.startDate).toBe('2026-01-01T10:00:00.000Z');
    expect(result?.endDate).toBe('2026-12-31T10:00:00.000Z');
    expect(result?.metrics.assignmentsCount).toBe(3);
    expect(result?.metrics.submissionsCount).toBe(7);
  });
});
