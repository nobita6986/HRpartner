/**
 * placement.service.test.ts — N3 service layer tests (mocked Prisma).
 *
 * Cover:
 *   - createPlacement happy path + idempotent replay
 *   - createPlacement FK chain broken → reject
 *   - createPlacement JobOpening serviceModel NULL → reject (DEC-10)
 *   - confirmPlacement conditional UPDATE success / same-state no-op
 *   - markPlacementEffective HRP-managed REJECT (DEC-07)
 *   - markPlacementEffective client-managed thiếu evidence REJECT
 *   - markPlacementEffective client-managed happy path
 *   - failPlacement / cancelPlacement side exits
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

interface MockState {
  jobOpenings: Map<string, { id: string; staffingOrderId: string; serviceModel: string | null }>;
  staffingOrders: Map<string, { id: string; projectId: string | null }>;
  projects: Map<string, { id: string; clientCompanyId: string | null }>;
  clientCompanies: Map<string, { id: string }>;
  placements: Map<
    string,
    {
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
    }
  >;
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
    placement: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = state.placements.get(where.id);
        if (!row) return null;
        return {
          id: row.id,
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
      placements: new Map(),
    };
    seedHappyPathChain(state, { serviceModel: 'STAFFING_SUPPLY' });
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

  it('FK chain broken (staffingOrder NULL projectId) → reject', async () => {
    const state: MockState = {
      jobOpenings: new Map([['jo-1', { id: 'jo-1', staffingOrderId: 'so-1', serviceModel: 'STAFFING_SUPPLY' }]]),
      staffingOrders: new Map([['so-1', { id: 'so-1', projectId: null }]]),
      projects: new Map(),
      clientCompanies: new Map(),
      placements: new Map(),
    };
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
      placements: new Map(),
    };
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
 * markPlacementEffective tests
 * ────────────────────────────────────────────────────────────────────────── */

describe('placement.service — markPlacementEffective (DEC-07, DEC-08)', () => {
  function setupConfirmedPlacement(serviceModel: string): { state: MockState; placementId: string } {
    const state: MockState = {
      jobOpenings: new Map(),
      staffingOrders: new Map(),
      projects: new Map(),
      clientCompanies: new Map(),
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

  it('Client-managed EFFECTIVE happy path với evidence đầy đủ', async () => {
    const { state, placementId } = setupConfirmedPlacement('RECRUITMENT_SERVICE');
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
    expect(result.status).toBe('EFFECTIVE');
    expect(result.replayed).toBe(false);
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
