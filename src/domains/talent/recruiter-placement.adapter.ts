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
import { createPlacement, confirmPlacement, cancelPlacement } from '@/src/domains/talent/placement.service';
import type { TransitionPlacementResult } from '@/src/domains/talent/placement.service';
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
 * Throws `RecruiterAssignmentError` with the canonical safe envelope when
 * ANY required anchor is missing. This is the only place where the
 * submission → slot/order/case resolution happens; downstream callers MUST
 * trust these IDs.
 */
async function deriveSubmissionAnchors(
  tx: Prisma.TransactionClient,
  sourceCandidateSubmissionId: string,
): Promise<{
  laborProfileId: string;
  staffingOrderId: string;
  jobOpeningId: string;
  placementCaseId: string;
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
  if (!submission.laborProfileId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission thiếu LaborProfile anchor',
      404,
      { reason: 'labor_profile_missing' },
    );
  }
  if (!submission.slot) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission thiếu slot anchor',
      404,
      { reason: 'slot_missing' },
    );
  }
  if (!submission.placementCaseId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      'CandidateSubmission thiếu PlacementCase anchor',
      404,
      { reason: 'placement_case_missing' },
    );
  }
  return {
    laborProfileId: submission.laborProfileId,
    staffingOrderId: submission.slot.staffingOrderId,
    jobOpeningId: submission.slot.jobOpeningId,
    placementCaseId: submission.placementCaseId,
  } as {
    laborProfileId: string;
    staffingOrderId: string;
    jobOpeningId: string;
    placementCaseId: string;
  };
}

/**
 * Recruiter-scoped Placement creation. HR_STAFF only.
 *
 * Flow:
 *   1. deriveSubmissionAnchors — fail closed on missing anchors.
 *   2. assertRecruiterAndHandlingDualAuthorityForPlacement — fails closed
 *      with NO_ACTIVE_ORDER_ASSIGNMENT or NO_ACTIVE_ASSIGNMENT.
 *   3. openPlacementCase — canonical case opener (idempotent).
 *   4. createPlacement — canonical service. Dual-authority predicate fires
 *      AGAIN inside `createPlacement` (defense in depth).
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
  //    under the same tx + order advisory lock.
  await assertRecruiterAndHandlingDualAuthorityForPlacement(tx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    staffingOrderId: anchors.staffingOrderId,
    laborProfileId: anchors.laborProfileId,
  });

  // 3. Canonical case opener — idempotent.
  const caseResult = await openPlacementCase(tx, {
    laborProfileId: anchors.laborProfileId,
    intent: 'JOB_INTEREST',
    actorId: input.actorId,
  });

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

export interface RecruiterPlacementTransitionInput {
  placementId: string;
  actorId: string;
  actorRole: 'HR_STAFF';
}

/**
 * Recruiter-scoped Placement confirm. HR_STAFF only. Dual-authority is
 * enforced inside the canonical `confirmPlacement` service.
 */
export async function recruiterPlacementConfirm(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  return confirmPlacement(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });
}

/**
 * Recruiter-scoped Placement cancel. HR_STAFF only. Same dual-authority
 * contract as confirm.
 */
export async function recruiterPlacementCancel(
  tx: Prisma.TransactionClient,
  input: RecruiterPlacementTransitionInput,
): Promise<TransitionPlacementResult> {
  return cancelPlacement(tx, {
    placementId: input.placementId,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });
}
