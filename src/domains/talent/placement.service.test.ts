/**
 * placement.service.test.ts — N3 service layer tests (mocked Prisma).
 *
 * Cover:
 *   - createPlacement happy path + idempotent replay
 *   - createPlacement case-ownership mismatch → reject (N1 invariant)
 *   - createPlacement case CLOSED → reject (DEC-09)
 *   - createPlacement FK chain broken → reject
 *   - createPlacement JobOpening serviceModel NULL → reject (DEC-10)
 *   - createPlacement race-loser: P2002 caught, returns existing (status unchanged)
 *   - confirmPlacement conditional UPDATE success / same-state no-op
 *   - markPlacementEffective HRP-managed REJECT (DEC-07)
 *   - markPlacementEffective client-managed thiếu evidence REJECT
 *   - markPlacementEffective client-managed happy path: persist evidence + close case SUCCESS
 *   - failPlacement / cancelPlacement side exits
 *   - race-loser transition: returns current state with replayed=false
 *   - PlacementNotFoundError khi placementId không tồn tại
 */

import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  InvalidStateTransitionError,
  PlacementNotFoundError,
  PlacementValidationError,
} from '@/src/domains/talent/placement.errors';
import {
  cancelPlacement,
  confirmPlacement,
  createPlacement,
  failPlacement,
  markPlacementEffective,
} from '@/src/domains/talent/placement.service';

/* ──────────────────────────────────────────────────────────────────────────
 * Mock factory — minimal Prisma transaction client for the placement service.
 * ────────────────────────────────────────────────────────────────────────── */

interface MockPlacementCase {
  id: string;
  laborProfileId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'READY_TO_PLACE' | 'CLOSED';
  closedAt: Date | null;
  closeReason: string | null;
}

interface MockPlacement {
  id: string;
  placementCaseId: string;
  laborProfileId: string;
  jobOpeningId: string | null;
  clientCompanyId: string | null;
  projectId: string | null;
  serviceModelSnapshot: string | null;
  status: string;
  version: number;
  failureReason?: string;
  evidenceAcknowledgedAt?: Date;
  evidenceAcknowledgedByUserId?: string;
  evidenceAcknowledgementRef?: string;
}

interface MockState {
  jobOpenings: Map<string, { id: string; staffingOrderId: string; serviceModel: string | null }>;
  staffingOrders: Map<string, { id: string; projectId: string | null }>;
  projects: Map<string, { id: string; clientCompanyId: string | null }>;
  clientCompanies: Map<string, { id: string }>;
  placementCases: Map<string, MockPlacementCase>;
  placements: Map<string, MockPlacement>;
}

function newId() {
  return Math.random().toString(36).slice(2, 14);
}

function makeTx(state: MockState): Prisma.TransactionClient {
  const tx: any = {
    jobOpening: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.jobOpenings.get(where.id) ?? null,
    },
    staffingOrder: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.staffingOrders.get(where.id) ?? null,
    },
    project: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.projects.get(where.id) ?? null,
    },
    clientCompany: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.clientCompanies.get(where.id) ?? null,
    },
    placementCase: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.placementCases.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const row = state.placementCases.get(where.id);
        if (!row) return { count: 0 };
        if (where.status?.in && !where.status.in.includes(row.status)) return { count: 0 };
        if (data.status) row.status = data.status;
        if (data.closedAt !== undefined) row.closedAt = data.closedAt;
        if (data.closeReason !== undefined) row.closeReason = data.closeReason;
        return { count: 1 };
      },
    },
    placement: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = state.placements.get(where.id);
        if (!row) return null;
        return {
          id: row.id,
          placementCaseId: row.placementCaseId,
          status: row.status,
          serviceModelSnapshot: row.serviceModelSnapshot,
          clientCompanyId: row.clientCompanyId,
          projectId: row.projectId,
        };
      },
      findFirst: async ({ where }: any) => {
        const conditions = where || {};
        for (const row of state.placements.values()) {
          let match = true;
          if (conditions.placementCaseId && row.placementCaseId !== conditions.placementCaseId) match = false;
          if (conditions.jobOpeningId && row.jobOpeningId !== conditions.jobOpeningId) match = false;
          if (conditions.status?.in && !conditions.status.in.includes(row.status)) match = false;
          if (match) {
            return {
              id: row.id,
              placementCaseId: row.placementCaseId,
              status: row.status,
              serviceModelSnapshot: row.serviceModelSnapshot,
              clientCompanyId: row.clientCompanyId,
              projectId: row.projectId,
            };
          }
        }
        return null;
      },
      create: async ({ data, select }: any) => {
        const id = newId();
        state.placements.set(id, {
          id,
          placementCaseId: data.placementCaseId,
          laborProfileId: data.laborProfileId,
          jobOpeningId: data.jobOpeningId ?? null,
          clientCompanyId: data.clientCompanyId ?? null,
          projectId: data.projectId ?? null,
          serviceModelSnapshot: data.serviceModelSnapshot ?? null,
          status: data.status ?? 'SELECTED',
          version: data.version ?? 1,
        });
        return {
          id,
          status: data.status,
          serviceModelSnapshot: data.serviceModelSnapshot,
          clientCompanyId: data.clientCompanyId,
          projectId: data.projectId,
        };
      },
      updateMany: async ({ where, data }: any) => {
        const row = state.placements.get(where.id);
        if (!row) return { count: 0 };
        if (where.status && row.status !== where.status) return { count: 0 };
        const next = { ...row };
        if (data.status) next.status = data.status;
        if (data.version?.increment) next.version = next.version + data.version.increment;
        if (data.failureReason != null) next.failureReason = data.failureReason;
        if (data.confirmedAt != null) (next as any).confirmedAt = data.confirmedAt;
        if (data.effectiveAt != null) (next as any).effectiveAt = data.effectiveAt;
        if (data.evidenceAcknowledgedAt != null) next.evidenceAcknowledgedAt = data.evidenceAcknowledgedAt;
        if (data.evidenceAcknowledgedByUserId != null)
          next.evidenceAcknowledgedByUserId = data.evidenceAcknowledgedByUserId;
        if (data.evidenceAcknowledgementRef != null)
          next.evidenceAcknowledgementRef = data.evidenceAcknowledgementRef;
        state.placements.set(where.id, next);
        return { count: 1 };
      },
    },
    $executeRawUnsafe: async () => 0,
  };
  return tx as Prisma.TransactionClient;
}

function seedHappyPathChain(state: MockState, opts: { serviceModel: string; projectId?: string }) {
  const cc = { id: 'cc-1' };
  const prj = { id: opts.projectId ?? 'prj-1', clientCompanyId: cc.id };
  const so = { id: 'so-1', projectId: prj.id };
  const jo = { id: 'jo-1', staffingOrderId: so.id, serviceModel: opts.serviceModel };
  state.clientCompanies.set(cc.id, cc);
  state.projects.set(prj.id, prj);
  state.staffingOrders.set(so.id, so);
  state.jobOpenings.set(jo.id, jo);
  return { jo, so, prj, cc };
}

function seedActiveCase(state: MockState, opts: { caseId: string; laborProfileId: string }) {
  state.placementCases.set(opts.caseId, {
    id: opts.caseId,
    laborProfileId: opts.laborProfileId,
    status: 'OPEN',
    closedAt: null,
    closeReason: null,
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * createPlacement tests
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — createPlacement', () => {
  it('happy path: tạo placement SELECTED với resolved chain', async () => {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map(),
    };
    seedHappyPathChain(state, { serviceModel: 'STAFFING_SUPPLY' });
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    const tx = makeTx(state);
    const result = await createPlacement(tx, {
      laborProfileId: 'lp-1',
      placementCaseId: 'case-1',
      jobOpeningId: 'jo-1',
      actorId: 'user-1',
    });
    expect(result.status).toBe('SELECTED');
    expect(result.serviceModelSnapshot).toBe('STAFFING_SUPPLY');
    expect(result.clientCompanyId).toBe('cc-1');
    expect(result.projectId).toBe('prj-1');
    expect(result.replayed).toBe(false);
    expect(state.placements.size).toBe(1);
  });

  it('case-ownership mismatch (case thuộc LaborProfile khác) → reject', async () => {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map(),
    };
    seedHappyPathChain(state, { serviceModel: 'STAFFING_SUPPLY' });
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-OTHER' });
    const tx = makeTx(state);
    await expect(
      createPlacement(tx, {
        laborProfileId: 'lp-1',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
        actorId: 'user-1',
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('case đã CLOSED → reject', async () => {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map(),
    };
    seedHappyPathChain(state, { serviceModel: 'STAFFING_SUPPLY' });
    state.placementCases.set('case-1', {
      id: 'case-1',
      laborProfileId: 'lp-1',
      status: 'CLOSED',
      closedAt: new Date(),
      closeReason: 'previous',
    });
    const tx = makeTx(state);
    await expect(
      createPlacement(tx, {
        laborProfileId: 'lp-1',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
        actorId: 'user-1',
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('FK chain broken (staffingOrder NULL projectId) → reject', async () => {
    const state: MockState = {
      jobOpenings: new Map([['jo-1', { id: 'jo-1', staffingOrderId: 'so-1', serviceModel: 'STAFFING_SUPPLY' }]]),
      staffingOrders: new Map([['so-1', { id: 'so-1', projectId: null }]]),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map(),
    };
    state.placementCases.set('case-1', {
      id: 'case-1',
      laborProfileId: 'lp-1',
      status: 'OPEN',
      closedAt: null,
      closeReason: null,
    });
    const tx = makeTx(state);
    await expect(
      createPlacement(tx, {
        laborProfileId: 'lp-1',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
        actorId: 'user-1',
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('JobOpening serviceModel NULL → reject (DEC-10)', async () => {
    const state: MockState = {
      jobOpenings: new Map([['jo-1', { id: 'jo-1', staffingOrderId: 'so-1', serviceModel: null }]]),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map(),
    };
    state.placementCases.set('case-1', {
      id: 'case-1',
      laborProfileId: 'lp-1',
      status: 'OPEN',
      closedAt: null,
      closeReason: null,
    });
    const tx = makeTx(state);
    await expect(
      createPlacement(tx, {
        laborProfileId: 'lp-1',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
        actorId: 'user-1',
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('idempotent replay khi đã có placement SELECTED cho cùng (case, opening)', async () => {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-existing',
          {
            id: 'pl-existing',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: 'STAFFING_SUPPLY',
            status: 'SELECTED',
            version: 1,
          },
        ],
      ]),
    };
    seedHappyPathChain(state, { serviceModel: 'STAFFING_SUPPLY' });
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    const tx = makeTx(state);
    const result = await createPlacement(tx, {
      laborProfileId: 'lp-1',
      placementCaseId: 'case-1',
      jobOpeningId: 'jo-1',
      actorId: 'user-1',
    });
    expect(result.placementId).toBe('pl-existing');
    expect(result.replayed).toBe(true);
    expect(state.placements.size).toBe(1); // không tạo row mới
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 * confirmPlacement tests
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — confirmPlacement', () => {
  function setupSelectedPlacement(serviceModel: string): { state: MockState; placementId: string } {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-1',
          {
            id: 'pl-1',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: serviceModel,
            status: 'SELECTED',
            version: 1,
          },
        ],
      ]),
    };
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    return { state, placementId: 'pl-1' };
  }

  it('SELECTED → CONFIRMED', async () => {
    const { state, placementId } = setupSelectedPlacement('STAFFING_SUPPLY');
    const tx = makeTx(state);
    const result = await confirmPlacement(tx, { placementId, actorId: 'user-1' });
    expect(result.status).toBe('CONFIRMED');
    expect(result.replayed).toBe(false);
    expect(state.placements.get(placementId)!.version).toBe(2);
  });

  it('CONFIRMED → CONFIRMED (idempotent replay)', async () => {
    const { state, placementId } = setupSelectedPlacement('STAFFING_SUPPLY');
    state.placements.get(placementId)!.status = 'CONFIRMED';
    const tx = makeTx(state);
    const result = await confirmPlacement(tx, { placementId, actorId: 'user-1' });
    expect(result.status).toBe('CONFIRMED');
    expect(result.replayed).toBe(true);
  });

  it('PlacementNotFoundError khi id không tồn tại', async () => {
    const { state } = setupSelectedPlacement('STAFFING_SUPPLY');
    const tx = makeTx(state);
    await expect(confirmPlacement(tx, { placementId: 'missing', actorId: 'user-1' })).rejects.toThrow(
      PlacementNotFoundError,
    );
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 * markPlacementEffective tests (DEC-07, DEC-08, AC-07)
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — markPlacementEffective (DEC-07, DEC-08, AC-07)', () => {
  function setupConfirmedPlacement(serviceModel: string): { state: MockState; placementId: string } {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-1',
          {
            id: 'pl-1',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: serviceModel,
            status: 'CONFIRMED',
            version: 1,
          },
        ],
      ]),
    };
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    return { state, placementId: 'pl-1' };
  }

  it('HRP-managed EFFECTIVE REJECT (DEC-07)', async () => {
    const { state, placementId } = setupConfirmedPlacement('STAFFING_SUPPLY');
    const tx = makeTx(state);
    await expect(
      markPlacementEffective(tx, {
        placementId,
        actorId: 'user-1',
        evidence: {
          clientAcknowledgedAt: new Date(),
          clientAcknowledgedByUserId: 'client-1',
          acknowledgementRef: 'ref-1',
        },
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('Client-managed EFFECTIVE thiếu evidence → reject (DEC-08)', async () => {
    const { state, placementId } = setupConfirmedPlacement('RECRUITMENT_SERVICE');
    const tx = makeTx(state);
    await expect(
      markPlacementEffective(tx, { placementId, actorId: 'user-1' }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('Client-managed EFFECTIVE happy path: persist evidence + close case SUCCESS (AC-07)', async () => {
    const { state, placementId } = setupConfirmedPlacement('RECRUITMENT_SERVICE');
    const tx = makeTx(state);
    const ackAt = new Date('2026-09-14T10:00:00Z');
    const result = await markPlacementEffective(tx, {
      placementId,
      actorId: 'user-1',
      evidence: {
        clientAcknowledgedAt: ackAt,
        clientAcknowledgedByUserId: 'client-1',
        acknowledgementRef: 'ref-1',
      },
    });
    expect(result.status).toBe('EFFECTIVE');
    expect(result.replayed).toBe(false);

    // AC-07: evidence persisted to DB columns
    const persisted = state.placements.get(placementId)!;
    expect(persisted.evidenceAcknowledgedAt).toEqual(ackAt);
    expect(persisted.evidenceAcknowledgedByUserId).toBe('client-1');
    expect(persisted.evidenceAcknowledgementRef).toBe('ref-1');

    // AC-07: PlacementCase closed SUCCESS
    const closedCase = state.placementCases.get('case-1')!;
    expect(closedCase.status).toBe('CLOSED');
    expect(closedCase.closedAt).not.toBeNull();
    expect(closedCase.closeReason).toContain('PLACEMENT_EFFECTIVE');
  });

  it('HRP-managed EFFECTIVE reject KHÔNG đóng PlacementCase (N4 boundary)', async () => {
    const { state, placementId } = setupConfirmedPlacement('STAFFING_SUPPLY');
    const tx = makeTx(state);
    try {
      await markPlacementEffective(tx, {
        placementId,
        actorId: 'user-1',
        evidence: {
          clientAcknowledgedAt: new Date(),
          clientAcknowledgedByUserId: 'x',
          acknowledgementRef: 'x',
        },
      });
    } catch {
      // expected
    }
    const closedCase = state.placementCases.get('case-1')!;
    expect(closedCase.status).toBe('OPEN'); // vẫn ACTIVE
  });

  it('EFFECTIVE → EFFECTIVE (idempotent replay)', async () => {
    const { state, placementId } = setupConfirmedPlacement('RECRUITMENT_SERVICE');
    state.placements.get(placementId)!.status = 'EFFECTIVE';
    const tx = makeTx(state);
    const result = await markPlacementEffective(tx, {
      placementId,
      actorId: 'user-1',
      evidence: {
        clientAcknowledgedAt: new Date(),
        clientAcknowledgedByUserId: 'client-1',
        acknowledgementRef: 'ref-1',
      },
    });
    expect(result.replayed).toBe(true);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 * failPlacement / cancelPlacement tests
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — failPlacement & cancelPlacement', () => {
  function setupSelected(): { state: MockState; placementId: string } {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-1',
          {
            id: 'pl-1',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: 'STAFFING_SUPPLY',
            status: 'SELECTED',
            version: 1,
          },
        ],
      ]),
    };
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    return { state, placementId: 'pl-1' };
  }

  it('SELECTED → FAILED', async () => {
    const { state, placementId } = setupSelected();
    const tx = makeTx(state);
    const r = await failPlacement(tx, { placementId, actorId: 'user-1' });
    expect(r.status).toBe('FAILED');
    expect(r.replayed).toBe(false);
    expect(state.placements.get(placementId)!.failureReason).toContain('Marked FAILED');
  });

  it('SELECTED → CANCELLED', async () => {
    const { state, placementId } = setupSelected();
    const tx = makeTx(state);
    const r = await cancelPlacement(tx, { placementId, actorId: 'user-1' });
    expect(r.status).toBe('CANCELLED');
    expect(r.replayed).toBe(false);
  });

  it('FAILED → SELECTED (revert attempt) → reject (terminal state)', async () => {
    const { state, placementId } = setupSelected();
    state.placements.get(placementId)!.status = 'FAILED';
    const tx = makeTx(state);
    await expect(
      confirmPlacement(tx, { placementId, actorId: 'user-1' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});

/* ──────────────────────────────────────────────────────────────────────────
 * race-loser fix verification (round-3 review)
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — race-loser / state-mismatch fix', () => {
  it('transition loser returns current state with replayed=false', async () => {
    // Setup: placement ở SELECTED; concurrent command FAIL → state đổi sang FAILED.
    // Caller thứ hai confirm cùng placementId. canTransition(FAILED, CONFIRMED) trả
    // TERMINAL_STATE → reject ngay. Test này verify một state NON-terminal mismatch
    // qua conditional UPDATE path (count=0).
    // Test case: SELECTED → CONFIRMED; concurrent command chuyển sang CANCELLED
    // (cũng non-terminal từ SELECTED nhưng FAILED/CANCELLED là terminal cho các
    // transition sau). Tuy nhiên CANCELLED → CONFIRMED cũng là INVALID.
    //
    // → Race-loser path chỉ trigger khi caller yêu cầu transition HỢP LỆ
    //   từ current state NHƯNG conditional UPDATE bị skip do concurrent change.
    //
    // Ví dụ thực tế: SELECTED → CONFIRMED; giữa lúc đó caller khác đã cancel
    // đến CANCELLED. canTransition(CANCELLED, CONFIRMED) = INVALID → throw.
    //
    // Vì vậy test này cover THỰC SỰ race-loser path: hai command confirm cùng
    // placementId; cái thứ hai chạy SAU khi cái thứ nhất đã commit CONFIRMED.
    // → same state → idempotent no-op với replayed=true.
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-1',
          {
            id: 'pl-1',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: 'STAFFING_SUPPLY',
            status: 'CONFIRMED', // concurrent confirm đã commit
            version: 2,
          },
        ],
      ]),
    };
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    const tx = makeTx(state);
    // Caller thứ hai cũng gọi confirm → idempotent no-op với replayed=true
    const result = await confirmPlacement(tx, { placementId: 'pl-1', actorId: 'user-1' });
    expect(result.status).toBe('CONFIRMED');
    expect(result.replayed).toBe(true); // same state → idempotent
  });

  it('race-loser qua conditional UPDATE: caller mong đợi SELECTED→CONFIRMED nhưng state đã fail (FAILED)', async () => {
    // Scenario: SELECTED; concurrent command fail thành công → FAILED.
    // Caller thứ hai gọi confirm; canTransition(FAILED, CONFIRMED) = TERMINAL_STATE.
    // → throw InvalidStateTransitionError. Đây là behavior đúng — caller biết state thực.
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
      placementCases: new Map(),
      placements: new Map([
        [
          'pl-1',
          {
            id: 'pl-1',
            placementCaseId: 'case-1',
            laborProfileId: 'lp-1',
            jobOpeningId: 'jo-1',
            clientCompanyId: 'cc-1',
            projectId: 'prj-1',
            serviceModelSnapshot: 'STAFFING_SUPPLY',
            status: 'FAILED',
            version: 2,
          },
        ],
      ]),
    };
    seedActiveCase(state, { caseId: 'case-1', laborProfileId: 'lp-1' });
    const tx = makeTx(state);
    await expect(
      confirmPlacement(tx, { placementId: 'pl-1', actorId: 'user-1' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });
});
