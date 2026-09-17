import { describe, it, expect, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { getJobOpeningDetail } from './job-opening-read.service';

function makeMockTx(overrides: any = {}): Prisma.TransactionClient {
  return {
    jobOpening: {
      findUnique: vi.fn().mockResolvedValue(overrides.jobOpening ?? null),
    },
    candidateSubmission: { count: vi.fn().mockResolvedValue(overrides.submissionsCount ?? 0) },
    projectAssignment: { count: vi.fn().mockResolvedValue(overrides.assignmentsCount ?? 0) },
  } as unknown as Prisma.TransactionClient;
}

describe('getJobOpeningDetail', () => {
  it('trả về null nếu JobOpening không tồn tại', async () => {
    const tx = makeMockTx({ jobOpening: null });
    const result = await getJobOpeningDetail(tx, 'missing');
    expect(result).toBeNull();
  });

  it('map đúng dữ liệu và deduplicate slot', async () => {
    const mockOpenedAt = new Date('2026-06-01T08:00:00Z');
    
    const mockOpening = {
      id: 'jo-1',
      status: 'OPEN',
      openedAt: mockOpenedAt,
      closedAt: null,
      staffingOrder: {
        id: 'so-1', code: 'SO-1', title: 'Order 1',
        project: { id: 'p-1', code: 'P-1', name: 'Project 1' }
      },
      posting: { id: 'jp-1', slug: 'slug-1', status: 'DRAFT' },
      staffingOrderSlot: { id: 'slot-1', positionCode: 'DEV', positionTitle: 'Developer' },
      slots: [
        { id: 'slot-1', positionCode: 'DEV', positionTitle: 'Developer' }, // Duplicated with staffingOrderSlot
        { id: 'slot-2', positionCode: 'TEST', positionTitle: 'Tester' }
      ]
    };

    const tx = makeMockTx({ jobOpening: mockOpening, submissionsCount: 4, assignmentsCount: 1 });
    const result = await getJobOpeningDetail(tx, 'jo-1');

    expect(result).not.toBeNull();
    expect(result?.openedAt).toBe('2026-06-01T08:00:00.000Z');
    expect(result?.closedAt).toBeNull();
    expect(result?.jobPosting?.slug).toBe('slug-1');
    
    // Check deduplication
    expect(result?.associatedSlots.length).toBe(2);
    expect(result?.associatedSlots.map(s => s.id)).toEqual(expect.arrayContaining(['slot-1', 'slot-2']));
    
    // Check metrics
    expect(result?.metrics.submissionsCount).toBe(4);
    expect(result?.metrics.assignmentsCount).toBe(1);
  });
});
