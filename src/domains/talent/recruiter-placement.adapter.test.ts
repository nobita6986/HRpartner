/**
 * src/domains/talent/recruiter-placement.adapter.test.ts
 *
 * P1-A0.4 R3-B03 — Adapter-level unit tests for the recruiter-scoped
 * production adapter. The adapter wraps `openPlacementCase` +
 * `createPlacement` behind explicit authority checks.
 *
 * These tests prove:
 *   - ANY missing anchor (submission / slot / laborProfileId / placementCase)
 *     → fail closed with NO_ACTIVE_ASSIGNMENT envelope.
 *   - Revoked order assignment → assertRecruiterAndHandlingDualAuthorityForPlacement
 *     throws NO_ACTIVE_ORDER_ASSIGNMENT; createPlacement NEVER invoked.
 *   - Revoked handling claim → throws NO_ACTIVE_ASSIGNMENT; openPlacementCase
 *     and createPlacement NEVER invoked.
 *   - Happy path: all authority checks pass → openPlacementCase + createPlacement
 *     are invoked with server-derived canonical IDs.
 *
 * The canonical public/system intake flow (`createCandidateSubmissionFromIntake`
 * → `openPlacementCase`) is exercised separately in N1 integration tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  candidateSubmissionFindUnique: vi.fn(),
  candidateSubmissionUpdate: vi.fn(async () => ({ count: 0 })),
  $executeRawUnsafe: vi.fn(async () => undefined),
  assertDual: vi.fn(),
  openPlacementCase: vi.fn(),
  createPlacement: vi.fn(),
}));

vi.mock('@/src/domains/talent/recruiter-assignment.service', () => {
  class RecruiterAssignmentError extends Error {
    code: string;
    httpStatus: number;
    details?: Record<string, unknown>;
    constructor(code: string, message: string, httpStatus: number, details?: Record<string, unknown>) {
      super(message);
      this.name = 'RecruiterAssignmentError';
      this.code = code;
      this.httpStatus = httpStatus;
      this.details = details;
    }
  }
  return {
    assertRecruiterAndHandlingDualAuthorityForPlacement: mocks.assertDual,
    RecruiterAssignmentError,
  };
});

vi.mock('@/src/domains/talent/placement.service', () => ({
  createPlacement: mocks.createPlacement,
  confirmPlacement: vi.fn(),
  cancelPlacement: vi.fn(),
}));

vi.mock('@/src/domains/talent/placement-case.service', () => ({
  openPlacementCase: mocks.openPlacementCase,
}));

import {
  recruiterPlacementCreate,
} from '@/src/domains/talent/recruiter-placement.adapter';
import { RecruiterAssignmentError } from '@/src/domains/talent/recruiter-assignment.service';

function fakeTx() {
  return {
    candidateSubmission: {
      findUnique: mocks.candidateSubmissionFindUnique,
      updateMany: mocks.candidateSubmissionUpdate,
    },
    $executeRawUnsafe: mocks.$executeRawUnsafe,
  };
}

const SUBMISSION_ID = 'sub-1';
const LP_ID = 'lp-1';
const ORDER_ID = 'ord-1';
const OPENING_ID = 'op-1';
const CASE_ID = 'case-1';
const ACTOR = 'rec-1';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.$executeRawUnsafe.mockResolvedValue(undefined);
  mocks.openPlacementCase.mockResolvedValue({
    placementCaseId: CASE_ID,
    status: 'OPEN',
    laborProfileId: LP_ID,
    replayed: false,
  });
  mocks.createPlacement.mockResolvedValue({
    placementId: 'pl-1',
    status: 'SELECTED',
    serviceModelSnapshot: 'HRP_MANAGED',
    clientCompanyId: 'cc-1',
    projectId: 'prj-1',
    replayed: false,
  });
});

describe('recruiter-placement.adapter — recruiter-scoped production adapter (B-03)', () => {
  it('happy path: all authority checks pass → createPlacement runs with derived IDs', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockResolvedValue(undefined);

    const out = await recruiterPlacementCreate(fakeTx() as any, {
      sourceCandidateSubmissionId: SUBMISSION_ID,
      actorId: ACTOR,
      actorRole: 'HR_STAFF',
    });

    expect(mocks.assertDual).toHaveBeenCalledOnce();
    expect(mocks.assertDual.mock.calls[0][1]).toMatchObject({
      actorId: ACTOR,
      actorRole: 'HR_STAFF',
      staffingOrderId: ORDER_ID,
      laborProfileId: LP_ID,
    });
    expect(mocks.openPlacementCase).toHaveBeenCalledOnce();
    expect(mocks.createPlacement).toHaveBeenCalledOnce();
    const createInput = mocks.createPlacement.mock.calls[0][1];
    expect(createInput).toMatchObject({
      actorId: ACTOR,
      actorRole: 'HR_STAFF',
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      jobOpeningId: OPENING_ID,
      sourceCandidateSubmissionId: SUBMISSION_ID,
    });
    expect(out).toMatchObject({
      placementId: 'pl-1',
      placementCaseId: CASE_ID,
      staffingOrderId: ORDER_ID,
      laborProfileId: LP_ID,
      jobOpeningId: OPENING_ID,
      status: 'SELECTED',
      replayed: false,
    });
  });

  it('missing submission → NO_ACTIVE_ASSIGNMENT, no authority, no canonical service', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue(null);
    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ASSIGNMENT', httpStatus: 404, details: { reason: 'submission_not_found' } });
    expect(mocks.assertDual).not.toHaveBeenCalled();
    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
  });

  it('B-07 placementCaseId=null is NOT rejected (it triggers canonical case opener)', async () => {
    // The pre-B-07 behaviour rejected `placementCaseId = null` with
    // `placement_case_missing`. B-07 changes that: the recruiter-scoped
    // adapter now opens a canonical case on demand for an eligible claimed
    // submission that has no case yet. This test guards against regressing
    // back to the rejection path.
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: null,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockResolvedValue(undefined);
    mocks.candidateSubmissionUpdate.mockResolvedValue({ count: 1 });

    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).resolves.toMatchObject({ placementCaseId: CASE_ID });

    // openPlacementCase IS invoked (B-07: on-demand canonical opener).
    expect(mocks.openPlacementCase).toHaveBeenCalledOnce();
  });

  it('missing slot → NO_ACTIVE_ASSIGNMENT, no authority, no canonical service', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      slot: null,
    });
    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ASSIGNMENT', details: { reason: 'slot_missing' } });
    expect(mocks.assertDual).not.toHaveBeenCalled();
    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
  });

  it('missing laborProfileId → NO_ACTIVE_ASSIGNMENT, no authority, no canonical service', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: null,
      placementCaseId: CASE_ID,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ASSIGNMENT', details: { reason: 'labor_profile_missing' } });
    expect(mocks.assertDual).not.toHaveBeenCalled();
    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
  });

  it('revoked order assignment → NO_ACTIVE_ORDER_ASSIGNMENT, NO canonical services', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockRejectedValue(
      new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment not active', 403, {
        reason: 'assignment_revoked',
      }),
    );
    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ORDER_ASSIGNMENT' });
    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
  });

  it('revoked handling claim → NO_ACTIVE_ASSIGNMENT, openPlacementCase + createPlacement NOT invoked', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockRejectedValue(
      new RecruiterAssignmentError('NO_ACTIVE_ASSIGNMENT', 'Handling claim not active', 403),
    );
    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ASSIGNMENT' });
    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
  });

  it('B-07 placementCaseId=null → openPlacementCase opens a case, createPlacement uses it, updateMany links the submission', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: null, // B-07: claimed submission without a PlacementCase
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockResolvedValue(undefined);
    // updateMany is now invoked on the submission to link it to the new case.
    const updateMany = vi.fn(async () => ({ count: 1 }));
    mocks.candidateSubmissionUpdate.mockResolvedValue({ count: 1 });

    const out = await recruiterPlacementCreate(fakeTx() as any, {
      sourceCandidateSubmissionId: SUBMISSION_ID,
      actorId: ACTOR,
      actorRole: 'HR_STAFF',
    });

    // Dual-authority runs FIRST (revoked recruiter never opens a case).
    expect(mocks.assertDual).toHaveBeenCalledOnce();
    expect(mocks.openPlacementCase).toHaveBeenCalledOnce();
    expect(mocks.createPlacement).toHaveBeenCalledOnce();

    // createPlacement receives the case from openPlacementCase (NOT the null
    // submission row), and the LP / opening IDs derived from the submission.
    const createInput = mocks.createPlacement.mock.calls[0][1];
    expect(createInput.placementCaseId).toBe(CASE_ID);
    expect(createInput.laborProfileId).toBe(LP_ID);
    expect(createInput.jobOpeningId).toBe(OPENING_ID);
    expect(createInput.sourceCandidateSubmissionId).toBe(SUBMISSION_ID);

    // Submission row linked to the newly opened case.
    expect(mocks.candidateSubmissionUpdate).toHaveBeenCalledOnce();
    expect(mocks.candidateSubmissionUpdate).toHaveBeenCalledWith({
      where: { id: SUBMISSION_ID, placementCaseId: null },
      data: { placementCaseId: CASE_ID },
    });

    // Result surface reflects the canonical case, not the null row.
    expect(out).toMatchObject({
      placementId: 'pl-1',
      placementCaseId: CASE_ID,
      staffingOrderId: ORDER_ID,
      laborProfileId: LP_ID,
      jobOpeningId: OPENING_ID,
      status: 'SELECTED',
      replayed: false,
    });
  });

  it('B-07 revoked actor + placementCaseId=null → NO canonical rows persisted, no openPlacementCase, no createPlacement', async () => {
    // Defense-in-depth ordering: dual-authority runs BEFORE openPlacementCase,
    // so a revoked actor never causes a PlacementCase row to be inserted and
    // never causes a CandidateSubmission.placementCaseId to be set.
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: null,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockRejectedValue(
      new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment not active', 403, {
        reason: 'assignment_revoked',
      }),
    );

    await expect(
      recruiterPlacementCreate(fakeTx() as any, {
        sourceCandidateSubmissionId: SUBMISSION_ID,
        actorId: ACTOR,
        actorRole: 'HR_STAFF',
      }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_ORDER_ASSIGNMENT' });

    expect(mocks.openPlacementCase).not.toHaveBeenCalled();
    expect(mocks.createPlacement).not.toHaveBeenCalled();
    expect(mocks.candidateSubmissionUpdate).not.toHaveBeenCalled();
  });

  it('propagates actorRole=HR_STAFF to the dual-authority helper (no optional-bypass)', async () => {
    mocks.candidateSubmissionFindUnique.mockResolvedValue({
      id: SUBMISSION_ID,
      laborProfileId: LP_ID,
      placementCaseId: CASE_ID,
      slot: { staffingOrderId: ORDER_ID, jobOpeningId: OPENING_ID },
    });
    mocks.assertDual.mockResolvedValue(undefined);
    await recruiterPlacementCreate(fakeTx() as any, {
      sourceCandidateSubmissionId: SUBMISSION_ID,
      actorId: ACTOR,
      actorRole: 'HR_STAFF',
    });
    const dualInput = mocks.assertDual.mock.calls[0][1];
    expect(dualInput.actorRole).toBe('HR_STAFF');
    expect(dualInput.actorId).toBe(ACTOR);
  });
});
