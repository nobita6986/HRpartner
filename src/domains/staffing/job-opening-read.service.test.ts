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
      serviceModel: null,
      _count: { placements: 0 },
      staffingOrder: {
        id: 'so-1', code: 'SO-1', title: 'Order 1',
        status: 'OPEN',
        deadlineDate: null,
        project: { id: 'p-1', code: 'P-1', name: 'Project 1' }
      },
      posting: { id: 'jp-1', slug: 'slug-1', status: 'DRAFT' },
      staffingOrderSlot: {
        id: 'slot-1', positionCode: 'DEV', positionTitle: 'Developer',
        validTo: null, slotsFilled: 0, slotsNeeded: 1
      },
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

describe('JobOpeningDetailDto — P1-A0.5 additive fields (RQ-14 / v1.2 §I-06)', () => {
  it('surfaces serviceModel (null when unclassified)', async () => {
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-2',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: null,
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-2');
    expect(result?.serviceModel).toBeNull();
  });

  it('surfaces serviceModel (RECRUITMENT_SERVICE when classified)', async () => {
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-3',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: 'RECRUITMENT_SERVICE',
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-3');
    expect(result?.serviceModel).toBe('RECRUITMENT_SERVICE');
  });

  it('surfaces placementCount (defense in depth for canClassify)', async () => {
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-4',
        status: 'OPEN',
        openedAt: new Date(),
        closedAt: null,
        serviceModel: 'STAFFING_SUPPLY',
        _count: { placements: 3 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-4');
    expect(result?.placementCount).toBe(3);
  });

  it('surfaces parent StaffingOrder.status (exact source field)', async () => {
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-5',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: null,
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'CLOSING_SOON', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-5');
    expect(result?.staffingOrder.status).toBe('CLOSING_SOON');
  });

  it('surfaces StaffingOrder.deadlineDate (exact source field name)', async () => {
    const dd = new Date('2026-12-31T00:00:00Z');
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-6',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: null,
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: dd, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-6');
    expect(result?.staffingOrder.deadlineDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('surfaces StaffingOrderSlot.validTo (exact source field name) and capacity', async () => {
    const vt = new Date('2027-06-30T00:00:00Z');
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-7',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: null,
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: {
          id: 'slot-1', positionCode: 'DEV', positionTitle: 'Developer',
          validTo: vt, slotsFilled: 1, slotsNeeded: 3,
        },
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-7');
    expect(result?.slot?.validTo).toBe('2027-06-30T00:00:00.000Z');
    expect(result?.slot?.slotsFilled).toBe(1);
    expect(result?.slot?.slotsNeeded).toBe(3);
  });

  it('DTO does NOT expose actorId / assigneeId / assignment audit metadata (no leak)', async () => {
    const tx = makeMockTx({
      jobOpening: {
        id: 'jo-8',
        status: 'DRAFT',
        openedAt: null,
        closedAt: null,
        serviceModel: null,
        _count: { placements: 0 },
        staffingOrder: { id: 'so-1', code: 'S1', title: 'O1', status: 'OPEN', deadlineDate: null, project: { id: 'p-1', code: 'P1', name: 'N1' } },
        posting: null,
        staffingOrderSlot: null,
        slots: [],
      },
    });
    const result = await getJobOpeningDetail(tx, 'jo-8');
    const dto = result as unknown as Record<string, unknown>;
    // Forbidden fields per RQ-14: actorId, assigneeId, assignment metadata.
    expect(dto.actorId).toBeUndefined();
    expect(dto.assigneeId).toBeUndefined();
    expect(dto.actor).toBeUndefined();
    expect(dto.assignmentAudit).toBeUndefined();
    expect(dto.recruiterAssignments).toBeUndefined();
  });
});
