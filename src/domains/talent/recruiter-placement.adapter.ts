/**
 * recruiter-placement.adapter.ts — P1-A0.4 R3-B03 recruiter-scoped production adapter.
 *
 * Why this exists:
 *   The canonical `placement.commands.ts` adapter (`placementCreate`,
 *   `placementConfirm`, …) is gated to ADMIN/HR_MANAGER only
 *   (`ALLOWED_PLACEMENT_ROLES`). A winning HR_STAFF recruiter who completed
 *   the canonical flow (assign → claim → MINE → …) cannot reach those
 *   routes today.
 *
 *   This adapter is the production path that closes the loop: the
 *   recruiter who holds an ACTIVE `StaffingOrderRecruiterAssignment` AND an
 *   ACTIVE `LaborProfileHandlingAssignment` MAY invoke Placement commands
 *   through the dedicated `/api/admin/recruiter/placements/...` surface.
 *
 *   The adapter NEVER trusts client-supplied canonical IDs — `slot`,
 *   `staffingOrderId`, `jobOpeningId`, and `laborProfileId` are all
 *   derived server-side from the `sourceCandidateSubmissionId`.
 *
 * Mandatory authority checks (P1-A0.4 DEC-12):
 *   (1) Submission exists and is RECRUITER-RELEVANT (has slot + labor profile).
 *   (2) `StaffingOrderRecruiterAssignment` for (actorId, derived orderId) is
 *       ACTIVE.
 *   (3) `LaborProfileHandlingAssignment` for (actorId, derived laborProfileId)
 *       is ACTIVE.
 *   (4) Only after BOTH clear do we hand off to the canonical PlacementCase
 *       / Placement service.
 *
 * Concurrent revoke contract:
 *   Both authority checks fire inside the same `withDbContext` transaction
 *   AND under the canonical order advisory lock. A revoke that committed
 *   between the pre-check and the lock acquisition is observed; the
 *   mutation rolls back atomically.
 *
 * Public/system intake:
 *   The public intake path (`createCandidateSubmissionFromIntake`,
 *   `/api/public/...`) remains untouched. It does NOT need recruiter
 *   authority — anon applicants do not have a recruiter assignment. The
 *   canonical PlacementCase opening (`openPlacementCase`) remains reachable
 *   through `intake-writer.service.ts` for that flow.
 *
 * ADMIN/HR_MANAGER:
 *   Continue to use the canonical `placement.commands.ts` adapter
 *   (`/api/admin/placements`). Bypass per DEC-25 — recruiter-scoped
 *   adapter is the HR_STAFF path; canonical adapter is the privileged path.
 */

import type { Prisma } from '@prisma/client';
import {
  assertRecruiterAndHandlingDualAuthorityForPlacement,
  RecruiterAssignmentError,
} from '@/src/domains/talent/recruiter-assignment.service';
import {
  createPlacement,
  confirmPlacement,
  markPlacementEffective,
  failPlacement,
  cancelPlacement,
  type TransitionPlacementResult,
} from '@/src/domains/talent/placement.service';
import { openPlacementCase } from '@/src/domains/talent/placement-case.service';

export interface RecruiterPlacementCreateInput {
  /** Server-derived anchor — client never names the slot/order/case. */
  sourceCandidateSubmissionId: string;
  actorId: string;
  /** Server-derived role — never optional on the recruiter-scoped path. */
  actorRole: 'HR_STAFF';
}

export interface RecruiterPlacementCreateResult {
  placementId: string;
  placementCaseId: string;
  staffingOrderId: string;
  laborProfileId: string;
  jobOpeningId: string;
  status: 'SELECTED';
  /** True if `createPlacement` returned an existing row (DEC-09 idempotent). */
  replayed: boolean;
}

/**
 * Internal helper: derive the canonical anchors for a candidate submission.
 *
 * For an eligible claimed submission:
 *   - `laborProfileId` MUST be present (N1 invariant).
 *   - `slot` MUST be present (slot anchors both opening and order).
 *   - `placementCaseId` MAY be null (the recruiter-scoped adapter will open
 *     the canonical case on demand — see `recruiterPlacementCreate`).
 *
 * This helper returns `placementCaseId: string | null` and lets the caller
 * decide whether to open a case. Throws `RecruiterAssignmentError` with
 * the canonical safe envelope when ANY required (non-null) anchor is
 * missing. This is the only place where the submission →
 * slot/order resolution happens; downstream callers MUST trust these IDs.
 */
async function deriveSubmissionAnchors(
  tx: Prisma.TransactionClient,
  sourceCandidateSubmissionId: string,
): Promise<{
  laborProfileId: string;
  staffingOrderId: string;
  jobOpeningId: string;
  placementCaseId: string | null;
}> {
  const submission = await tx.candidateSubmission.findUnique({
    where: { id: sourceCandidateSubmissionId },
    select: {
      id: true,
      laborProfileId: true,
      placementCaseId: true,
      slot: {
        select: {
          staffingOrderId: true,
          jobOpeningId: true,
        },
      },
    },
  });
  if (!submission) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission không tồn tại',
      404,
      { reason: 'submission_not_found' },
    );
  }
  const laborProfileId = submission.laborProfileId;
  if (!laborProfileId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission thiếu LaborProfile anchor',
      404,
      { reason: 'labor_profile_missing' },
    );
  }
  const slot = submission.slot;
  if (!slot) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission thiếu slot anchor',
      404,
      { reason: 'slot_missing' },
    );
  }
  const result: {
    laborProfileId: string;
    staffingOrderId: string;
    jobOpeningId: string;
    placementCaseId: string | null;
  } = {
    laborProfileId,
    staffingOrderId: slot.staffingOrderId,
    jobOpeningId: slot.jobOpeningId as string,
    placementCaseId: submission.placementCaseId as string | null,
  };
  return result;
}

/**
 * Recruiter-scoped Placement creation. HR_STAFF only.
 *
 * Flow:
 *   1. deriveSubmissionAnchors — fail closed on missing required anchors.
 *      `placementCaseId` MAY be null; in that case the adapter opens the
 *      canonical PlacementCase on demand (B-07).
 *   2. assertRecruiterAndHandlingDualAuthorityForPlacement — fails closed
 *      with NO_ACTIVE_ORDER_ASSIGNMENT or NO_ACTIVE_ASSIGNMENT. Runs
 *      BEFORE any case-open / placement-create so a revoked actor never
 *      causes a row to be persisted (defense-in-depth ordering).
 *   3. openPlacementCase — canonical case opener (idempotent). If the
 *      submission had no case, this returns a fresh case ID. The
 *      submission is then linked to the case in the same tx so the
 *      invariant "each submission → exactly one active case" holds.
 *   4. createPlacement — canonical service. Dual-authority predicate fires
 *      AGAIN inside `createPlacement` (defense in depth) under the same
 *      lock.
 *
 * Both authority checks fire under the same tx + order advisory lock as
 * the canonical service. A concurrent revoke observed at any point rolls
 * back the entire tx; no half-mutated row is persisted.
 */
export async function recruiterPlacementCreate(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementCreateInput,
): Promise<RecruiterPlacementCreateResult> {
  // 1. Derive anchors server-side.
  const anchors = await deriveSubmissionAnchors(tx, input.sourceCandidateSubmissionId);

  // 2. Dual-authority (order assignment ACTIVE + handling claim ACTIVE)
  //    under the same tx + order advisory lock. Runs BEFORE case-open so a
  //    revoked actor never causes a PlacementCase row to be inserted.
  await assertRecruiterAndHandlingDualAuthorityForPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    staffingOrderId: anchors.staffingOrderId,
    laborProfileId: anchors.laborProfileId,
  });

  // 3. Canonical case opener — idempotent. If the submission already had
  //    a placementCaseId, the partial-unique index on PlacementCase ensures
  //    we reuse the same case (race-safe). If it did not, openPlacementCase
  //    creates a fresh active case for the LaborProfile.
  const caseResult = await openPlacementCase(tx, {
    laborProfileId: anchors.laborProfileId,
    intent: 'JOB_INTEREST',
    actorId: input.actorId,
  });

  // 3a. If the submission had no case, link it to the case we just opened
  //     (or reused). Use a conditional UPDATE keyed by the OLD
  //     `placementCaseId` value to avoid clobbering a concurrent
  //     intake-writer that linked the submission to the same case in
  //     parallel. If another writer wins, the canonical active case for
  //     this LaborProfile is still returned by openPlacementCase — we just
  //     leave the submission row untouched and proceed.
  if (anchors.placementCaseId === null) {
    await tx.candidateSubmission.updateMany({
      where: { id: input.sourceCandidateSubmissionId, placementCaseId: null },
      data: { placementCaseId: caseResult.placementCaseId },
    });
  }

  // 4. Canonical Placement creation. The dual-authority predicate fires
  //    AGAIN inside createPlacement (defense in depth) under the same lock.
  const created = await createPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    laborProfileId: anchors.laborProfileId,
    placementCaseId: caseResult.placementCaseId,
    jobOpeningId: anchors.jobOpeningId,
    sourceCandidateSubmissionId: input.sourceCandidateSubmissionId,
  });

  return {
    placementId: created.placementId,
    placementCaseId: caseResult.placementCaseId,
    staffingOrderId: anchors.staffingOrderId,
    laborProfileId: anchors.laborProfileId,
    jobOpeningId: anchors.jobOpeningId,
    status: 'SELECTED',
    replayed: created.replayed,
  };
}

/**
 * Internal helper: derive the canonical anchors for a Placement row.
 *
 *   - placement.placementCaseId    → PlacementCase row → re-derives laborProfileId.
 *   - placement.jobOpeningId       → JobOpening row → re-derives staffingOrderId.
 *   - placement.laborProfileId    → used to anchor the handling claim.
 *
 * Used by the recruiter-scoped transition commands (confirm / effective /
 * fail / cancel) so the dual-authority predicate fires BEFORE the canonical
 * service runs (defense in depth — the canonical `runTransition` also fires
 * the predicate itself, but the adapter enforces it again at the route
 * boundary so a revoked recruiter NEVER reaches the canonical service in the
 * first place).
 *
 * Throws `RecruiterAssignmentError` with the canonical envelope when any
 * anchor is missing or stale.
 */
async function derivePlacementAnchors(
  tx: Prisma.TransactionClient,
  placementId: string,
): Promise<{
  laborProfileId: string;
  staffingOrderId: string;
  jobOpeningId: string;
  placementCaseId: string;
}> {
  const placement = await tx.placement.findUnique({
    where: { id: placementId },
    select: {
      id: true,
      laborProfileId: true,
      placementCaseId: true,
      jobOpeningId: true,
      jobOpening: { select: { staffingOrderId: true } },
    },
  });
  if (!placement) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Placement ${placementId} không tồn tại`,
      404,
      { reason: 'placement_not_found' },
    );
  }
  const placementCaseId = placement.placementCaseId;
  if (!placementCaseId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Placement ${placementId} chưa gắn PlacementCase`,
      409,
      { reason: 'placement_case_missing' },
    );
  }
  const laborProfileId = placement.laborProfileId;
  if (!laborProfileId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Placement ${placementId} chưa gắn LaborProfile`,
      409,
      { reason: 'labor_profile_missing' },
    );
  }
  const jobOpeningId = placement.jobOpeningId;
  const jobOpening = placement.jobOpening;
  const staffingOrderId = jobOpening?.staffingOrderId;
  if (!jobOpeningId || !staffingOrderId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Placement ${placementId} chưa gắn JobOpening anchor (placement.jobOpeningId=${jobOpeningId ?? 'NULL'})`,
      409,
      { reason: 'job_opening_missing' },
    );
  }
  return {
    laborProfileId,
    staffingOrderId,
    jobOpeningId,
    placementCaseId,
  };
}

/**
 * Enforce the dual-authority predicate at the adapter boundary. Runs
 * `assertRecruiterAndHandlingDualAuthorityForPlacement` which acquires the
 * canonical order advisory lock and re-reads BOTH authority rows after the
 * lock. A concurrent revoke observed at any point rolls back the entire tx.
 */
async function enforceDualAuthorityFromPlacement(
  tx: Prisma.TransactionClient,
  args: { actorId: string; actorRole: 'HR_STAFF'; anchors: { staffingOrderId: string; laborProfileId: string } },
): Promise<void> {
  await assertRecruiterAndHandlingDualAuthorityForPlacement(tx, {
    actorId: args.actorId,
    actorRole: args.actorRole,
    staffingOrderId: args.anchors.staffingOrderId,
    laborProfileId: args.anchors.laborProfileId,
  });
}

export interface RecruiterPlacementTransitionInput {
  placementId: string;
  actorId: string;
  actorRole: 'HR_STAFF';
  /**
   * Optional: forwarded to `markPlacementEffective`. Required when
   * invoking `recruiterPlacementEffective`. Has no effect on the other
   * transition commands.
   */
  evidence?: {
    clientAcknowledgedAt: Date;
    clientAcknowledgedByUserId: string;
    acknowledgementRef: string;
  };
}

/**
 * Recruiter-scoped Placement confirm. HR_STAFF only.
 *
 * B-08: derives canonical anchors server-side, enforces dual-authority
 * BEFORE invoking the canonical service (defense in depth), then delegates
 * the actual transition to `confirmPlacement`. The canonical service fires
 * the dual-authority predicate AGAIN under the same order advisory lock.
 *
 * Concurrent revoke contract: A revoke that committed before the
 * dual-authority lock acquisition causes the predicate to throw
 * `NO_ACTIVE_ORDER_ASSIGNMENT`; the surrounding transaction rolls back
 * atomically so no transition UPDATE is persisted.
 */
export async function recruiterPlacementConfirm(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  const anchors = await derivePlacementAnchors(tx, input.placementId);
  await enforceDualAuthorityFromPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    anchors,
  });
  return confirmPlacement(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });
}

/**
 * Recruiter-scoped Placement effective. HR_STAFF only.
 *
 * B-08: derives anchors, enforces dual-authority, then delegates to
 * `markPlacementEffective`. `evidence` is forwarded as-is — the canonical
 * service validates it. HRP-managed placements fail closed inside the
 * service (DEC-07); the route returns 400.
 */
export async function recruiterPlacementEffective(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  const anchors = await derivePlacementAnchors(tx, input.placementId);
  await enforceDualAuthorityFromPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    anchors,
  });
  if (!input.evidence) {
    throw new RecruiterAssignmentError(
      'INVALID_INPUT',
      'evidence là bắt buộc cho placement.effective (client-managed acknowledgement)',
      400,
      { reason: 'evidence_required' },
    );
  }
  return markPlacementEffective(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    evidence: input.evidence,
  });
}

/**
 * Recruiter-scoped Placement fail. HR_STAFF only.
 *
 * B-08: derives anchors, enforces dual-authority, then delegates to
 * `failPlacement`. Same contract as confirm/effective.
 */
export async function recruiterPlacementFail(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  const anchors = await derivePlacementAnchors(tx, input.placementId);
  await enforceDualAuthorityFromPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    anchors,
  });
  return failPlacement(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });
}

/**
 * Recruiter-scoped Placement cancel. HR_STAFF only.
 *
 * B-08: derives anchors, enforces dual-authority, then delegates to
 * `cancelPlacement`. Same contract as confirm/effective/fail.
 */
export async function recruiterPlacementCancel(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  const anchors = await derivePlacementAnchors(tx, input.placementId);
  await enforceDualAuthorityFromPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    anchors,
  });
  return cancelPlacement(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });
}
