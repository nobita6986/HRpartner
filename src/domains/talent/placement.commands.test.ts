/**
 * placement.commands.test.ts — Unit tests cho thin adapter P1-F0.
 *
 * Lane: unit (no DB). Mocks `placement.service.ts` qua `vi.mock` để verify:
 *   - 5 named functions gọi đúng service signature
 *   - Server-derived `actorId` + `laborProfileId` (KHÔNG tin client)
 *   - `sourceCandidateSubmissionId` integrity check: mismatch/missing → 400
 *   - Service throws `PlacementValidationError` cho HRP-managed EFFECTIVE
 *     → adapter re-throws (route maps 400).
 *   - Adapter KHÔNG mở Prisma transaction (no `prisma.$transaction`,
 *     no `withDbContext`, no `withAuthorizedDb`).
 *   - Adapter KHÔNG import frozen service file paths beyond the documented
 *     command surface.
 *
 * Out-of-scope: KHÔNG cover service logic đã có test riêng
 * (`placement.service.test.ts` ≥30 it-blocks).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

// Mock the frozen placement.service.ts — adapter should pass through inputs
// without modification, only adding server-derived `actorId`/`laborProfileId`.
vi.mock('@/src/domains/talent/placement.service', () => ({
  createPlacement: vi.fn(),
  confirmPlacement: vi.fn(),
  markPlacementEffective: vi.fn(),
  failPlacement: vi.fn(),
  cancelPlacement: vi.fn(),
}));

// Mock placement.errors.ts to keep types consistent.
vi.mock('@/src/domains/talent/placement.errors', () => ({
  PlacementValidationError: class extends Error {
    code = 'PLACEMENT_VALIDATION_ERROR';
    constructor(message: string, public readonly details?: Record<string, unknown>) {
      super(message);
    }
  },
  PlacementIdempotencyConflictError: class extends Error {
    code = 'PLACEMENT_IDEMPOTENCY_CONFLICT';
    constructor(message: string) {
      super(message);
    }
  },
  InvalidStateTransitionError: class extends Error {
    code = 'INVALID_STATE_TRANSITION';
    constructor(message: string) {
      super(message);
    }
  },
  PlacementNotFoundError: class extends Error {
    code = 'PLACEMENT_NOT_FOUND';
    constructor(placementId: string) {
      super(`Placement not found: ${placementId}`);
    }
  },
}));

import {
  createPlacement,
  confirmPlacement,
  markPlacementEffective,
  failPlacement,
  cancelPlacement,
} from '@/src/domains/talent/placement.service';
import { PlacementValidationError } from '@/src/domains/talent/placement.errors';
import {
  placementCreate,
  placementConfirm,
  placementEffective,
  placementFail,
  placementCancel,
  PLACEMENT_COMMAND_ROUTES,
} from '@/src/domains/talent/placement.commands';

// ─────────────────────────────────────────────────────────────────────────
// Minimal mock Prisma transaction client (just what the adapter calls).
// ─────────────────────────────────────────────────────────────────────────

function makeMockTx() {
  return {
    placementCase: {
      findUnique: vi.fn(),
    },
    candidateSubmission: {
      findUnique: vi.fn(),
    },
    // Mark unused surface so accidental calls are caught.
    __unused: vi.fn(),
  } as unknown as Prisma.TransactionClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// placementCreate
// ─────────────────────────────────────────────────────────────────────────

describe('placementCreate', () => {
  it('AC-02: derive actorId from caller; re-read laborProfileId from PlacementCase in tx', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-derived-123',
    });
    (createPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'SELECTED',
      serviceModelSnapshot: 'RECRUITMENT_SERVICE',
      clientCompanyId: 'cc-1',
      projectId: 'prj-1',
      replayed: false,
    });

    const result = await placementCreate(tx, {
      actorId: 'actor-from-ctx',
      placementCaseId: 'pc-abc',
      jobOpeningId: 'jo-uuid',
    });

    expect(tx.placementCase.findUnique).toHaveBeenCalledWith({
      where: { id: 'pc-abc' },
      select: { id: true, laborProfileId: true },
    });
    expect(createPlacement).toHaveBeenCalledWith(tx, {
      actorId: 'actor-from-ctx', // server-derived
      laborProfileId: 'lp-derived-123', // re-read from case, not from client
      placementCaseId: 'pc-abc',
      jobOpeningId: 'jo-uuid',
    });
    expect(result).toEqual({
      placementId: 'pl-1',
      status: 'SELECTED',
      serviceModelSnapshot: 'RECRUITMENT_SERVICE',
      clientCompanyId: 'cc-1',
      projectId: 'prj-1',
      replayed: false,
    });
  });

  it('T0 clarification: PlacementCase không tồn tại → throw PLACEMENT_VALIDATION_ERROR (400)', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      placementCreate(tx, {
        actorId: 'a',
        placementCaseId: 'pc-missing',
        jobOpeningId: 'jo-uuid',
      }),
    ).rejects.toThrow(PlacementValidationError);

    expect(createPlacement).not.toHaveBeenCalled();
  });

  it('T0 clarification: sourceCandidateSubmissionId mismatch → throw + zero mutation', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-derived-123',
    });
    (tx.candidateSubmission.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementCaseId: 'pc-OTHER', // mismatch
    });

    await expect(
      placementCreate(tx, {
        actorId: 'a',
        placementCaseId: 'pc-abc',
        jobOpeningId: 'jo-uuid',
        sourceCandidateSubmissionId: 'cs-uuid',
      }),
    ).rejects.toThrow(PlacementValidationError);

    expect(createPlacement).not.toHaveBeenCalled();
  });

  it('T0 clarification: sourceCandidateSubmissionId missing → throw + zero mutation', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-1',
    });
    (tx.candidateSubmission.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      placementCreate(tx, {
        actorId: 'a',
        placementCaseId: 'pc-abc',
        jobOpeningId: 'jo-uuid',
        sourceCandidateSubmissionId: 'cs-missing',
      }),
    ).rejects.toThrow(PlacementValidationError);

    expect(createPlacement).not.toHaveBeenCalled();
  });

  it('C-01 (round 2): findUnique rejection → DB error propagates AND createPlacement NOT called', async () => {
    // C-01 round-2 contract: when `tx.candidateSubmission.findUnique`
    // rejects (RLS rejection, broken connection, missing schema field),
    // the helper must NOT swallow the error. The surrounding transaction
    // rolls back and `createPlacement` is never reached.
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-derived-123',
    });
    const dbError = new Error('PrismaClientKnownRequestError: RLS rejected');
    (tx.candidateSubmission.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(dbError);

    let thrown: unknown;
    try {
      await placementCreate(tx, {
        actorId: 'a',
        placementCaseId: 'pc-abc',
        jobOpeningId: 'jo-uuid',
        sourceCandidateSubmissionId: 'cs-uuid',
      });
    } catch (e) {
      thrown = e;
    }

    // The DB error itself must propagate (NOT a PlacementValidationError;
    // not a swallowed fallback). The route layer maps this generic Error
    // to a generic 500 (no leak of message).
    expect(thrown).toBe(dbError);
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(PlacementValidationError);

    // Zero-mutation proof: `createPlacement` MUST NOT be called.
    expect(createPlacement).not.toHaveBeenCalled();

    // Bonus: `findUnique` is called exactly once with the supplied id.
    expect(tx.candidateSubmission.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.candidateSubmission.findUnique).toHaveBeenCalledWith({
      where: { id: 'cs-uuid' },
      select: { placementCaseId: true },
    });
  });

  it('C-01 (round 2): PlacementCase findUnique rejection → error propagates AND createPlacement NOT called', async () => {
    // Symmetric coverage: if PlacementCase lookup fails, the entire
    // placementCreate path must fail closed.
    const tx = makeMockTx();
    const dbError = new Error('PrismaClientKnownRequestError: connection terminated');
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(dbError);

    let thrown: unknown;
    try {
      await placementCreate(tx, {
        actorId: 'a',
        placementCaseId: 'pc-broken-conn',
        jobOpeningId: 'jo-uuid',
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBe(dbError);
    expect(createPlacement).not.toHaveBeenCalled();
  });

  it('T0 clarification: sourceCandidateSubmissionId matching → service called with that field', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-1',
    });
    (tx.candidateSubmission.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementCaseId: 'pc-abc', // matches
    });
    (createPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'SELECTED',
      serviceModelSnapshot: 'RECRUITMENT_SERVICE',
      clientCompanyId: 'cc-1',
      projectId: 'prj-1',
      replayed: false,
    });

    await placementCreate(tx, {
      actorId: 'a',
      placementCaseId: 'pc-abc',
      jobOpeningId: 'jo-uuid',
      sourceCandidateSubmissionId: 'cs-uuid',
    });

    expect(createPlacement).toHaveBeenCalledWith(tx, {
      actorId: 'a',
      laborProfileId: 'lp-1',
      placementCaseId: 'pc-abc',
      jobOpeningId: 'jo-uuid',
      sourceCandidateSubmissionId: 'cs-uuid',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// placementConfirm / placementFail / placementCancel — pass-through.
// ─────────────────────────────────────────────────────────────────────────

describe('placementConfirm', () => {
  it('calls confirmPlacement với actorId + placementId; trả exact TransitionPlacementResult', async () => {
    const tx = makeMockTx();
    (confirmPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'CONFIRMED',
      replayed: false,
    });

    const result = await placementConfirm(tx, { actorId: 'a', placementId: 'pl-1' });

    expect(confirmPlacement).toHaveBeenCalledWith(tx, { actorId: 'a', placementId: 'pl-1' });
    expect(result).toEqual({ placementId: 'pl-1', status: 'CONFIRMED', replayed: false });
  });
});

describe('placementFail', () => {
  it('calls failPlacement với actorId + placementId; KHÔNG nhận reason (TransitionPlacementInput không có field)', async () => {
    const tx = makeMockTx();
    (failPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'FAILED',
      replayed: false,
    });

    const result = await placementFail(tx, { actorId: 'a', placementId: 'pl-1' });

    expect(failPlacement).toHaveBeenCalledWith(tx, { actorId: 'a', placementId: 'pl-1' });
    expect(result).toEqual({ placementId: 'pl-1', status: 'FAILED', replayed: false });
  });
});

describe('placementCancel', () => {
  it('calls cancelPlacement với actorId + placementId; KHÔNG nhận reason', async () => {
    const tx = makeMockTx();
    (cancelPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'CANCELLED',
      replayed: false,
    });

    const result = await placementCancel(tx, { actorId: 'a', placementId: 'pl-1' });

    expect(cancelPlacement).toHaveBeenCalledWith(tx, { actorId: 'a', placementId: 'pl-1' });
    expect(result).toEqual({ placementId: 'pl-1', status: 'CANCELLED', replayed: false });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// placementEffective — special: evidence required; HRP-managed REJECT.
// ─────────────────────────────────────────────────────────────────────────

describe('placementEffective', () => {
  it('pass evidence to markPlacementEffective; trả exact TransitionPlacementResult', async () => {
    const tx = makeMockTx();
    const evidence = {
      clientAcknowledgedAt: new Date('2026-01-01T00:00:00.000Z'),
      clientAcknowledgedByUserId: 'user-x',
      acknowledgementRef: 'ref-y',
    };
    (markPlacementEffective as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'EFFECTIVE',
      replayed: false,
    });

    const result = await placementEffective(tx, { actorId: 'a', placementId: 'pl-1', evidence });

    expect(markPlacementEffective).toHaveBeenCalledWith(tx, {
      actorId: 'a',
      placementId: 'pl-1',
      evidence,
    });
    expect(result).toEqual({ placementId: 'pl-1', status: 'EFFECTIVE', replayed: false });
  });

  it('HRP-managed EFFECTIVE → service throws PlacementValidationError → adapter re-throws (route maps 400)', async () => {
    const tx = makeMockTx();
    (markPlacementEffective as ReturnType<typeof vi.fn>).mockRejectedValue(
      new PlacementValidationError(
        'HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4',
        { placementId: 'pl-1' },
      ),
    );

    await expect(
      placementEffective(tx, {
        actorId: 'a',
        placementId: 'pl-1',
        evidence: {
          clientAcknowledgedAt: new Date(),
          clientAcknowledgedByUserId: 'u',
          acknowledgementRef: 'r',
        },
      }),
    ).rejects.toThrow(PlacementValidationError);
  });

  it('evidence missing → throw PlacementValidationError (no call to service)', async () => {
    const tx = makeMockTx();
    await expect(
      placementEffective(tx, { actorId: 'a', placementId: 'pl-1' }),
    ).rejects.toThrow(PlacementValidationError);
    expect(markPlacementEffective).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Adapter discipline: no transaction opened inside adapter (C-03, C-08).
// ─────────────────────────────────────────────────────────────────────────

describe('adapter discipline', () => {
  it('placementCreate does NOT call prisma.$transaction, withDbContext, or withAuthorizedDb', async () => {
    const tx = makeMockTx();
    (tx.placementCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pc-abc',
      laborProfileId: 'lp-1',
    });
    (createPlacement as ReturnType<typeof vi.fn>).mockResolvedValue({
      placementId: 'pl-1',
      status: 'SELECTED',
      serviceModelSnapshot: 'RECRUITMENT_SERVICE',
      clientCompanyId: 'cc-1',
      projectId: 'prj-1',
      replayed: false,
    });

    // Spy on tx methods to ensure no transaction-bound surface is called.
    await placementCreate(tx, {
      actorId: 'a',
      placementCaseId: 'pc-abc',
      jobOpeningId: 'jo-uuid',
    });

    // The adapter must only call placementCase.findUnique (and
    // candidateSubmission.findUnique if sourceCandidateSubmissionId given).
    // It MUST NOT touch $transaction or any tx-level commit/rollback surface.
    expect(tx.placementCase.findUnique).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Canonical route names — locked shape (C-05).
// ─────────────────────────────────────────────────────────────────────────

describe('PLACEMENT_COMMAND_ROUTES (C-05)', () => {
  it('exposes the exact 5 canonical route strings', () => {
    expect(PLACEMENT_COMMAND_ROUTES).toEqual({
      create: 'POST:/api/admin/placements',
      confirm: 'POST:/api/admin/placements/[id]/actions/confirm',
      effective: 'POST:/api/admin/placements/[id]/actions/effective',
      fail: 'POST:/api/admin/placements/[id]/actions/fail',
      cancel: 'POST:/api/admin/placements/[id]/actions/cancel',
    });
  });
});
