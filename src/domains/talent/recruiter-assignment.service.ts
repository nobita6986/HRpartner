/**
 * recruiter-assignment.service.ts — P1-A0.4 Scoped Recruiter Authority (canonical).
 *
 * Round 2 (correction batch 1/1) — T0 disposition CHANGES_REQUIRED.
 *
 * Service layer for `StaffingOrderRecruiterAssignment` (HR_MANAGER_ASSIGN only)
 * AND `LaborProfileHandlingAssignment` (claim path: ORDER_RECRUITER_CLAIM).
 *
 * The application is the authoritative role gate; RLS is the backstop. All
 * mutations run inside a caller-managed transaction (use `withDbContext`).
 *
 * Six operations (TASK.md §3 / AC-01..AC-08):
 *   1. assignRecruiterToOrder           — HR_MANAGER / ADMIN creates a
 *      HR_MANAGER_ASSIGN row. Idempotent on (order, recruiter).
 *   2. revokeRecruiterFromOrder         — HR_MANAGER / ADMIN revokes any
 *      row. Deterministic mutex via `pg_advisory_xact_lock`.
 *   3. claimCandidateSubmission         — assigned HR_STAFF claims an
 *      unclaimed candidate. The order is derived server-side via
 *      `CandidateSubmission -> slot -> StaffingOrder`. Advisory lock
 *      on the submission + the existing partial unique index on
 *      `LaborProfileHandlingAssignment` serialize the race; exactly one
 *      winner. Race losers receive `HANDLING_ALREADY_CLAIMED` (409).
 *      The winner row carries source = `ORDER_RECRUITER_CLAIM`.
 *   4. listOrderRecruiterAssignments    — read: all assignments on an order.
 *   5. listMyClaimedCandidates          — read: candidate submissions the
 *      caller has claimed (Recruiter Workbench MINE rail).
 *   6. listMaskedUnclaimedCandidatesForOrder — read: assigned recruiter
 *      sees a MASKED view (phone, cccd, dob masked) of unclaimed
 *      candidates on their assigned order. PII is NOT delivered.
 *
 * Role gate (server-side, FINAL authority):
 *   - assign / revoke: ADMIN/HR_MANAGER only.
 *   - claim: HR_STAFF with active assignment on the order.
 *
 * Error model (canonical codes — wire contract):
 *   - ASSIGNEE_NOT_FOUND                (404)
 *   - ASSIGNEE_NOT_RECRUITER            (400)
 *   - STAFFING_ORDER_NOT_FOUND          (404)
 *   - CANDIDATE_SUBMISSION_NOT_FOUND    (404)
 *   - CANDIDATE_SUBMISSION_NOT_IN_ORDER (404)
 *   - ORDER_NOT_OPEN                    (409)
 *   - ASSIGNMENT_ALREADY_EXISTS         (409)
 *   - NO_ACTIVE_ORDER_ASSIGNMENT        (403) — actor not assigned to order
 *   - NO_ACTIVE_ASSIGNMENT              (404) — revoke target missing
 *   - HANDLING_ALREADY_CLAIMED          (409) — claim race lost
 *   - ROLE_NOT_PERMITTED                (403)
 *   - INVALID_INPUT                     (400)
 *
 * Deterministic revoke ordering (AC-E2E-20 / AC-E2E-21):
 *   - Mutex: `pg_advisory_xact_lock(hashtext(staffing_order_id))`.
 *   - Test invariant: command-first + revoke-first both produce deterministic
 *     ORDER_NOT_ACTIVE / NO_ACTIVE_ASSIGNMENT outcomes.
 */
import { Prisma, type PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';
import type { SystemRole } from '@prisma/client';
import { maskPhone } from '@/src/shared/privacy/mask';

export const RECRUITER_ASSIGNMENT_SOURCE = {
  HR_MANAGER_ASSIGN: 'HR_MANAGER_ASSIGN',
} as const;

export const RECRUITER_ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

export const HANDLING_ASSIGNMENT_SOURCE = {
  AFF_INITIAL: 'AFF_INITIAL',
  MANAGER_ASSIGNMENT: 'MANAGER_ASSIGNMENT',
  CASE_RESOLUTION: 'CASE_RESOLUTION',
  ORDER_RECRUITER_CLAIM: 'ORDER_RECRUITER_CLAIM',
} as const;

export const HANDLING_ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  TRANSFERRED: 'TRANSFERRED',
  REVOKED: 'REVOKED',
} as const;

export class RecruiterAssignmentError extends Error {
  constructor(
    public readonly code:
      | 'ASSIGNEE_NOT_FOUND'
      | 'ASSIGNEE_NOT_RECRUITER'
      | 'STAFFING_ORDER_NOT_FOUND'
      | 'CANDIDATE_SUBMISSION_NOT_FOUND'
      | 'CANDIDATE_SUBMISSION_NOT_IN_ORDER'
      | 'ORDER_NOT_OPEN'
      | 'ASSIGNMENT_ALREADY_EXISTS'
      | 'NO_ACTIVE_ORDER_ASSIGNMENT'
      | 'NO_ACTIVE_ASSIGNMENT'
      | 'HANDLING_ALREADY_CLAIMED'
      | 'ROLE_NOT_PERMITTED'
      | 'INVALID_INPUT',
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RecruiterAssignmentError';
  }
}

/**
 * Acquire a deterministic order-scoped advisory lock — canonical P1-A0.4
 * contract primitive (F-02). The exact same lock key MUST be acquired by:
 *   - `assignRecruiterToOrder`         (admin/HR_MANAGER assigns recruiter)
 *   - `revokeRecruiterFromOrder`       (admin/HR_MANAGER revokes recruiter)
 *   - `claimCandidateSubmission`       (assigned HR_STAFF claims candidate)
 *   - `createPlacement`                (candidate-specific Placement create)
 *   - `runTransition`                  (placement transition commands)
 *   - `openPlacementCase` (recruiter-scoped)  (placement-case recruiter flow)
 *
 * Because all paths acquire the same `pg_advisory_xact_lock(hash, hash)`
 * keyed by `p1a04:order:<staffingOrderId>`, they serialize on a per-order
 * basis. The lock is **transaction-scoped** (`pg_advisory_xact_lock`); it
 * is automatically released when the enclosing transaction commits or
 * rolls back — no orphan locks, no risk of deadlocks from cross-process
 * lock leakage. Any error in the calling code path causes the entire
 * transaction to roll back, so a half-mutated row is impossible.
 *
 * Deterministic lock-order contract (F-02 proof):
 *   - command first → command holds lock; revoke WAITS; after command
 *     commits, revoke acquires lock and observes the (possibly new)
 *     state of the assignment.
 *   - revoke first → revoke holds lock; command WAITS; after revoke
 *     commits, command acquires lock and re-reads the assignment; if
 *     `status='ACTIVE'` no longer holds → `assertActiveRecruiterForOrder`
 *     throws NO_ACTIVE_ORDER_ASSIGNMENT and the placement mutation is
 *     rolled back atomically (no orphan row).
 */
export async function acquireOrderAdvisoryLock(
  tx: PrismaTypes.TransactionClient,
  staffingOrderId: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
    `p1a04:order:${staffingOrderId}`,
  );
}

/**
 * Acquire a deterministic submission-scoped advisory lock for claim race.
 */
export async function acquireSubmissionLock(
  tx: PrismaTypes.TransactionClient,
  submissionId: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
    `p1a04:candidate:${submissionId}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. assignRecruiterToOrder
// ═══════════════════════════════════════════════════════════════════════════

export interface AssignRecruiterInput {
  staffingOrderId: string;
  recruiterUserId: string;
  actorRole: SystemRole;
  actorId: string;
  reason?: string;
}

export interface RecruiterAssignmentRow {
  id: string;
  staffingOrderId: string;
  recruiterUserId: string;
  assignedByUserId: string;
  source: 'HR_MANAGER_ASSIGN';
  status: 'ACTIVE' | 'REVOKED';
  assignedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export async function assignRecruiterToOrder(
  tx: PrismaTypes.TransactionClient,
  input: AssignRecruiterInput,
): Promise<RecruiterAssignmentRow> {
  if (input.actorRole !== 'HR_MANAGER' && input.actorRole !== 'ADMIN') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${input.actorRole} cannot assign recruiters to staffing orders`,
      403,
    );
  }
  if (!input.recruiterUserId || !input.staffingOrderId) {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'recruiterUserId and staffingOrderId are required', 400);
  }
  const assignee = await tx.user.findUnique({
    where: { id: input.recruiterUserId },
    select: { id: true, role: true, isActive: true },
  });
  if (!assignee) {
    throw new RecruiterAssignmentError('ASSIGNEE_NOT_FOUND', `User ${input.recruiterUserId} not found`, 404);
  }
  if (assignee.role !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ASSIGNEE_NOT_RECRUITER',
      `User ${input.recruiterUserId} is ${assignee.role}, must be HR_STAFF to be assigned as recruiter`,
      400,
      { userId: input.recruiterUserId, role: assignee.role },
    );
  }
  const order = await tx.staffingOrder.findUnique({
    where: { id: input.staffingOrderId },
    select: { id: true, status: true },
  });
  if (!order) {
    throw new RecruiterAssignmentError('STAFFING_ORDER_NOT_FOUND', `StaffingOrder ${input.staffingOrderId} not found`, 404);
  }

  await acquireOrderAdvisoryLock(tx, input.staffingOrderId);

  // Idempotency on (order, recruiter): existing ACTIVE row returns the existing row.
  const existing = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId: input.staffingOrderId,
      recruiterUserId: input.recruiterUserId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
  });
  if (existing) {
    return mapRow(existing);
  }

  try {
    const created = await tx.staffingOrderRecruiterAssignment.create({
      data: {
        staffingOrderId: input.staffingOrderId,
        recruiterUserId: input.recruiterUserId,
        assignedByUserId: input.actorId,
        source: RECRUITER_ASSIGNMENT_SOURCE.HR_MANAGER_ASSIGN,
        status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
        reason: input.reason ?? null,
        assignedAt: new Date(),
      },
    });
    return mapRow(created);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
    ) {
      throw new RecruiterAssignmentError(
        'ASSIGNMENT_ALREADY_EXISTS',
        `Recruiter ${input.recruiterUserId} already has an ACTIVE assignment on order ${input.staffingOrderId}`,
        409,
        { staffingOrderId: input.staffingOrderId, recruiterUserId: input.recruiterUserId },
      );
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. revokeRecruiterFromOrder
// ═══════════════════════════════════════════════════════════════════════════

export interface RevokeRecruiterInput {
  /** Server-derived orderId from the URL — required. */
  staffingOrderId: string;
  assignmentId: string;
  actorRole: SystemRole;
  actorId: string;
  reason: string;
}

export async function revokeRecruiterFromOrder(
  tx: PrismaTypes.TransactionClient,
  input: RevokeRecruiterInput,
): Promise<RecruiterAssignmentRow> {
  if (!input.assignmentId) {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'assignmentId is required', 400);
  }
  if (!input.staffingOrderId) {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'staffingOrderId is required (derived from URL)', 400);
  }
  if (input.actorRole !== 'HR_MANAGER' && input.actorRole !== 'ADMIN') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${input.actorRole} cannot revoke recruiter assignments`,
      403,
    );
  }
  if (!input.reason || typeof input.reason !== 'string' || input.reason.trim() === '') {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'reason is required for revocation', 400);
  }

  const target = await tx.staffingOrderRecruiterAssignment.findUnique({
    where: { id: input.assignmentId },
    select: { id: true, staffingOrderId: true, recruiterUserId: true, source: true, status: true },
  });
  if (!target) {
    // Privacy-safe 404 — do not leak whether the assignment id exists.
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Assignment ${input.assignmentId} not found`,
      404,
    );
  }

  // F-01 binding: the URL-derived orderId MUST equal the assignment's parent order.
  // Mismatch returns a privacy-safe 404 with zero mutation (no row touched, no
  // advisory lock acquired on the unrelated order).
  if (target.staffingOrderId !== input.staffingOrderId) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Assignment ${input.assignmentId} is not on order ${input.staffingOrderId}`,
      404,
    );
  }

  await acquireOrderAdvisoryLock(tx, target.staffingOrderId);

  const now = new Date();
  const result = await tx.staffingOrderRecruiterAssignment.updateMany({
    where: {
      id: input.assignmentId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    data: {
      status: RECRUITER_ASSIGNMENT_STATUS.REVOKED,
      revokedAt: now,
      revokedByUserId: input.actorId,
      reason: input.reason,
      updatedAt: now,
    },
  });
  if (result.count === 0) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Assignment ${input.assignmentId} is no longer ACTIVE`,
      404,
    );
  }
  const updated = await tx.staffingOrderRecruiterAssignment.findUnique({ where: { id: input.assignmentId } });
  if (!updated) {
    throw new RecruiterAssignmentError('NO_ACTIVE_ASSIGNMENT', `Assignment ${input.assignmentId} disappeared`, 404);
  }
  return mapRow(updated);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. claimCandidateSubmission (HR_STAFF candidate-claim)
// ═══════════════════════════════════════════════════════════════════════════

export interface ClaimCandidateInput {
  submissionId: string;
  actorRole: SystemRole;
  actorId: string;
}

export interface ClaimCandidateResult {
  handlingAssignmentId: string;
  submissionId: string;
  staffingOrderId: string;
  slotId: string;
  laborProfileId: string | null;
  assigneeUserId: string;
  source: typeof HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM;
  startsAt: Date;
  expiresAt: Date;
}

/**
 * HR_STAFF claims an unclaimed candidate on their assigned order.
 *
 * Steps inside one tx:
 *   1. Re-read submission server-side, derive `slot -> staffing_order_id`
 *      and `slot -> placement_case_id -> labor_profile_id` (no client trust).
 *   2. Verify actor has an ACTIVE `StaffingOrderRecruiterAssignment` on the
 *      derived order; fail closed with NO_ACTIVE_ORDER_ASSIGNMENT otherwise.
 *   3. Verify the order is OPEN; fail closed with ORDER_NOT_OPEN otherwise.
 *   4. Acquire submission-scoped advisory lock (defense in depth).
 *   5. If an ACTIVE `LaborProfileHandlingAssignment` for the same
 *      `labor_profile_id` (or same submission) already exists → return it
 *      (idempotent replay) AND verify the assignee is the actor; otherwise
 *      raise HANDLING_ALREADY_CLAIMED (409).
 *   6. Create the LaborProfileHandlingAssignment with
 *      source = ORDER_RECRUITER_CLAIM. The default 7-day handling window
 *      matches AFF-05A-R2 canonical contract.
 *
 * The candidate is delivered to the winner as the canonical "claimed"
 * outcome; non-winners receive HANDLING_ALREADY_CLAIMED.
 */
export async function claimCandidateSubmission(
  tx: PrismaTypes.TransactionClient,
  input: ClaimCandidateInput,
): Promise<ClaimCandidateResult> {
  if (input.actorRole !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${input.actorRole} cannot claim candidates`,
      403,
    );
  }
  if (!input.submissionId || typeof input.submissionId !== 'string') {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'submissionId is required', 400);
  }

  // (1) Server-derive the canonical chain. NEVER trust client-supplied
  //     orderId or profileId — both are re-read here inside the same tx.
  const submission = await tx.candidateSubmission.findUnique({
    where: { id: input.submissionId },
    select: {
      id: true,
      slotId: true,
      placementCaseId: true,
      slot: {
        select: {
          id: true,
          staffingOrderId: true,
        },
      },
      placementCase: {
        select: { id: true, laborProfileId: true },
      },
    },
  });
  if (!submission) {
    throw new RecruiterAssignmentError(
      'CANDIDATE_SUBMISSION_NOT_FOUND',
      `CandidateSubmission ${input.submissionId} not found`,
      404,
    );
  }
  if (!submission.slot) {
    throw new RecruiterAssignmentError(
      'CANDIDATE_SUBMISSION_NOT_IN_ORDER',
      `CandidateSubmission ${input.submissionId} is not bound to a slot (no StaffingOrder)`,
      404,
    );
  }
  const staffingOrderId = submission.slot.staffingOrderId;
  const laborProfileId = submission.placementCase?.laborProfileId ?? null;

  // (2) Order-level authority check.
  const orderAssignment = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId,
      recruiterUserId: input.actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    select: { id: true },
  });
  if (!orderAssignment) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ORDER_ASSIGNMENT',
      `Actor ${input.actorId} is not an ACTIVE recruiter for StaffingOrder ${staffingOrderId}`,
      403,
    );
  }

  // (2b) Acquire the canonical order-scoped advisory lock (F-02). The claim
  //      path and the revoke path share this lock; an in-flight revoke will
  //      either commit before us (we re-read ACTIVE → fail closed) or wait
  //      until our tx commits. Either way no half-mutated row is possible.
  await acquireOrderAdvisoryLock(tx, staffingOrderId);

  // (2c) Re-verify the order assignment is still ACTIVE after acquiring the
  //      lock — a concurrent revoke that committed between the pre-check
  //      and our lock acquisition would have changed the state. Re-read
  //      fails closed.
  const stillActive = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId,
      recruiterUserId: input.actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    select: { id: true },
  });
  if (!stillActive) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ORDER_ASSIGNMENT',
      `Actor ${input.actorId} is no longer an ACTIVE recruiter for StaffingOrder ${staffingOrderId} after order lock acquisition`,
      403,
    );
  }

  // (3) Order must be OPEN.
  const order = await tx.staffingOrder.findUnique({
    where: { id: staffingOrderId },
    select: { status: true },
  });
  if (!order || order.status !== 'OPEN') {
    throw new RecruiterAssignmentError(
      'ORDER_NOT_OPEN',
      `StaffingOrder ${staffingOrderId} is not OPEN (status=${order?.status ?? 'missing'})`,
      409,
    );
  }

  // (4) Submission-scoped advisory lock to serialize concurrent claim attempts
  //     on the SAME submission. The handling-assignment partial unique index
  //     serializes per-profile at the DB level. Both are required: the index
  //     alone catches the common case; the lock prevents races on submissions
  //     that don't yet have a profile (race-to-create).
  await acquireSubmissionLock(tx, input.submissionId);

  // (5) Idempotent replay: if an ACTIVE handling assignment already exists
  //     for this labor profile AND the assignee is the actor, return it.
  //     Otherwise: HANDLING_ALREADY_CLAIMED.
  const now = new Date();
  if (laborProfileId) {
    const existingActive = await tx.laborProfileHandlingAssignment.findFirst({
      where: {
        laborProfileId,
        status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
      },
      select: { id: true, assigneeUserId: true, startsAt: true, expiresAt: true, source: true },
    });
    if (existingActive) {
      if (existingActive.assigneeUserId === input.actorId) {
        // Idempotent replay — same winner, same row.
        return {
          handlingAssignmentId: existingActive.id,
          submissionId: input.submissionId,
          staffingOrderId,
          slotId: submission.slotId!,
          laborProfileId,
          assigneeUserId: existingActive.assigneeUserId,
          source: HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
          startsAt: existingActive.startsAt,
          expiresAt: existingActive.expiresAt ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        };
      }
      throw new RecruiterAssignmentError(
        'HANDLING_ALREADY_CLAIMED',
        `LaborProfile ${laborProfileId} is already claimed by another recruiter (assignmentId=${existingActive.id})`,
        409,
        { submissionId: input.submissionId, staffingOrderId },
      );
    }
  }

  // (6) Create the handling assignment. Without a labor profile (rare — no
  //     placement case yet), we still need a profile-id-like anchor. The
  //     schema requires laborProfileId NOT NULL, so we cannot create a
  //     handling assignment without one. If the submission is unlinked to
  //     a placement case, this is a contract violation by the submission
  //     (no candidate profile yet). Fail closed.
  if (!laborProfileId) {
    throw new RecruiterAssignmentError(
      'CANDIDATE_SUBMISSION_NOT_IN_ORDER',
      `CandidateSubmission ${input.submissionId} has no LaborProfile anchor (placementCaseId=${submission.placementCaseId ?? 'missing'}); cannot claim`,
      404,
    );
  }

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const created = await tx.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId,
        assigneeUserId: input.actorId,
        assignedByUserId: null,
        source: HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
        startsAt: now,
        expiresAt,
        status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
      },
      select: { id: true, startsAt: true, expiresAt: true, assigneeUserId: true },
    });
    return {
      handlingAssignmentId: created.id,
      submissionId: input.submissionId,
      staffingOrderId,
      slotId: submission.slotId!,
      laborProfileId,
      assigneeUserId: created.assigneeUserId,
      source: HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
      startsAt: created.startsAt,
      expiresAt: created.expiresAt ?? expiresAt,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Lost the race to another concurrent claim attempt. Re-read to surface
      // the canonical HANDLING_ALREADY_CLAIMED message.
      throw new RecruiterAssignmentError(
        'HANDLING_ALREADY_CLAIMED',
        `CandidateSubmission ${input.submissionId} was claimed by another recruiter during your claim`,
        409,
        { submissionId: input.submissionId, staffingOrderId },
      );
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. listOrderRecruiterAssignments
// ═══════════════════════════════════════════════════════════════════════════

export interface OrderRecruiterAssignmentRow {
  assignmentId: string;
  recruiterUserId: string;
  recruiterName: string | null;
  source: 'HR_MANAGER_ASSIGN';
  assignedAt: string;
  status: 'ACTIVE' | 'REVOKED';
  revokedAt: string | null;
  revokedByUserId: string | null;
  assignedByUserId: string;
  reason: string | null;
}

export async function listOrderRecruiterAssignments(
  tx: PrismaTypes.TransactionClient,
  staffingOrderId: string,
): Promise<OrderRecruiterAssignmentRow[]> {
  const rows = await tx.staffingOrderRecruiterAssignment.findMany({
    where: { staffingOrderId },
    orderBy: { assignedAt: 'asc' },
    select: {
      id: true,
      recruiterUserId: true,
      source: true,
      assignedAt: true,
      status: true,
      revokedAt: true,
      revokedByUserId: true,
      assignedByUserId: true,
      reason: true,
      recruiter: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    assignmentId: r.id,
    recruiterUserId: r.recruiterUserId,
    recruiterName: r.recruiter?.name ?? null,
    source: r.source as OrderRecruiterAssignmentRow['source'],
    assignedAt: r.assignedAt.toISOString(),
    status: r.status as OrderRecruiterAssignmentRow['status'],
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
    revokedByUserId: r.revokedByUserId,
    assignedByUserId: r.assignedByUserId,
    reason: r.reason,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. listMyClaimedCandidates (Recruiter Workbench MINE rail)
// ═══════════════════════════════════════════════════════════════════════════

export interface ClaimedCandidateRow {
  submissionId: string;
  staffingOrderId: string;
  staffingOrderCode: string;
  staffingOrderTitle: string;
  slotId: string;
  slotPositionTitle: string;
  handlingAssignmentId: string;
  candidateFullName: string;
  /**
   * Pre-claim queue: ALWAYS masked (see `listMaskedUnclaimedCandidatesForOrder`).
   * Post-claim / MINE rail (F-05): the active winning handler receives the
   * FULL phone value (this is what the recruiter needs to call the candidate).
   * Loser, revoked, or unrelated HR_STAFF receives the MASKED form.
   * CCCD image and raw evidence are NEVER included in this surface — the
   * existing evidence authorization path remains the canonical path for
   * sensitive PII.
   */
  candidatePhone: string | null;
  /**
   * Masked phone (always delivered). `null` only when the source phone is
   * itself `null` (no phone on file). The pre-claim queue is ALWAYS masked;
   * the post-claim MINE rail always provides this AND optionally the full
   * value via `candidatePhone` (gated on F-05 active-handler predicate).
   */
  candidatePhoneMasked: string | null;
  candidateStatus: string;
  claimedAt: string;
  expiresAt: string;
  /**
   * True iff the caller is the current ACTIVE winning handler for this
   * submission/labor-profile. Tells the UI whether to surface `candidatePhone`
   * (full) or only `candidatePhoneMasked`.
   */
  isActiveHandler: boolean;
}

export async function listMyClaimedCandidates(
  tx: PrismaTypes.TransactionClient,
  recruiterUserId: string,
  options?: { canSeeSensitive?: boolean; actorRole?: string },
): Promise<ClaimedCandidateRow[]> {
  // Pull ACTIVE handling assignments where source = ORDER_RECRUITER_CLAIM
  // AND the assignee is the caller. Derive submission through
  // laborProfile -> placementCase -> candidateSubmission (the canonical chain).
  const rows = await tx.laborProfileHandlingAssignment.findMany({
    where: {
      assigneeUserId: recruiterUserId,
      status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
      source: HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      startsAt: true,
      expiresAt: true,
      laborProfile: {
        select: {
          id: true,
          placementCases: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              submissions: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  status: true,
                  slotId: true,
                  slot: {
                    select: {
                      id: true,
                      positionTitle: true,
                      staffingOrderId: true,
                      staffingOrder: {
                        select: { id: true, code: true, title: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const out: ClaimedCandidateRow[] = [];
  for (const r of rows) {
    const cs = r.laborProfile?.placementCases?.[0]?.submissions?.[0];
    if (!cs || !cs.slot) continue;
    // F-05 contact-data boundary (R3-F05): the caller is the assigneeUserId
    // by construction (the findMany above filters on it). The `isActiveHandler`
    // predicate alone is not enough — the canonical R3-F05 contract requires
    // BOTH the active `LaborProfileHandlingAssignment` (which holds here)
    // AND the active `StaffingOrderRecruiterAssignment` for the candidate's
    // exact order. After a `revokeRecruiterFromOrder` the LPHA stays ACTIVE
    // (the LPHA is the historical "claimed" record) but the order assignment
    // is REVOKED, so the caller is no longer the "active winning recruiter"
    // for placement authority purposes. The full phone MUST disappear in
    // that state. We re-read the order-assignment here inside the same tx
    // so the boundary reflects the CURRENT order authority.
    const orderAssignment = await tx.staffingOrderRecruiterAssignment.findFirst({
      where: {
        staffingOrderId: cs.slot.staffingOrderId,
        recruiterUserId: recruiterUserId,
        status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
      },
      select: { id: true },
    });
    const hasActiveOrderAssignment = orderAssignment !== null;
    const isActiveHandler = hasActiveOrderAssignment; // both halves required
    const canSeeSensitive = options?.canSeeSensitive === true;
    const isHrStaff = options?.actorRole === 'HR_STAFF';
    const exposeFullPhone = isActiveHandler && (isHrStaff || canSeeSensitive);
    out.push({
      submissionId: cs.id,
      staffingOrderId: cs.slot.staffingOrderId,
      staffingOrderCode: cs.slot.staffingOrder.code,
      staffingOrderTitle: cs.slot.staffingOrder.title,
      slotId: cs.slot.id,
      slotPositionTitle: cs.slot.positionTitle,
      handlingAssignmentId: r.id,
      candidateFullName: cs.fullName,
      // F-05 + R3-F05: post-claim active handler receives the FULL phone
      // (recruiter-contact field) ONLY when BOTH halves of the dual authority
      // are active. Loser, revoked, or unrelated HR_STAFF receive the masked
      // form (or zero rows when filter excludes them entirely).
      candidatePhone: exposeFullPhone ? cs.phone : null,
      candidatePhoneMasked: maskPhone(cs.phone),
      candidateStatus: cs.status,
      claimedAt: r.startsAt.toISOString(),
      expiresAt: (r.expiresAt ?? new Date(r.startsAt.getTime() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
      isActiveHandler,
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. listMaskedUnclaimedCandidatesForOrder (assigned-recruiter candidate queue)
// ═══════════════════════════════════════════════════════════════════════════

export interface MaskedCandidateRow {
  submissionId: string;
  slotId: string;
  slotPositionTitle: string;
  candidateFullName: string;
  /** ALWAYS masked for this view. */
  candidatePhoneMasked: string | null;
  candidateStatus: string;
  submittedAt: string;
}

export async function listMaskedUnclaimedCandidatesForOrder(
  tx: PrismaTypes.TransactionClient,
  staffingOrderId: string,
  actorId: string,
): Promise<MaskedCandidateRow[]> {
  // Server-side authority: actor must have an ACTIVE assignment on the order.
  const active = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId,
      recruiterUserId: actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    select: { id: true },
  });
  if (!active) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ORDER_ASSIGNMENT',
      `Actor ${actorId} is not an ACTIVE recruiter for StaffingOrder ${staffingOrderId}`,
      403,
    );
  }

  // Candidates: slots under the order, submissions on those slots, no ACTIVE
  // handling assignment with source = ORDER_RECRUITER_CLAIM on the linked
  // labor profile.
  const candidates = await tx.candidateSubmission.findMany({
    where: {
      slot: { staffingOrderId },
      OR: [
        { placementCase: null },
        {
          placementCase: {
            laborProfile: {
              handlingAssignments: {
                none: {
                  status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
                  source: HANDLING_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
                },
              },
            },
          },
        },
      ],
    },
    take: 200,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      slotId: true,
      fullName: true,
      phone: true,
      status: true,
      createdAt: true,
      slot: { select: { positionTitle: true } },
    },
  });
  return candidates.map((c) => ({
    submissionId: c.id,
    slotId: c.slotId!,
    slotPositionTitle: c.slot?.positionTitle ?? '',
    candidateFullName: c.fullName,
    candidatePhoneMasked: maskPhone(c.phone),
    candidateStatus: c.status,
    submittedAt: c.createdAt.toISOString(),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. assertActiveRecruiterForOrder (placement dual authority — first half)
// ═══════════════════════════════════════════════════════════════════════════

export async function assertActiveRecruiterForOrder(
  tx: PrismaTypes.TransactionClient,
  actorId: string,
  actorRole: SystemRole,
  staffingOrderId: string,
): Promise<void> {
  if (actorRole === 'HR_MANAGER' || actorRole === 'ADMIN') {
    // Bypass for non-recruiter roles.
    return;
  }
  if (actorRole !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${actorRole} cannot act on a recruiter-scoped placement`,
      403,
    );
  }
  const active = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId,
      recruiterUserId: actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    select: { id: true },
  });
  if (!active) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ORDER_ASSIGNMENT',
      `Actor ${actorId} is not the active recruiter for order ${staffingOrderId}`,
      403,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. assertActiveHandlingForLaborProfile (placement dual authority — second half)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify the actor has an ACTIVE `LaborProfileHandlingAssignment` for the
 * given LaborProfile. Required by the canonical Placement dual-authority
 * contract (P1-A0.4 v1.3 §6).
 */
export async function assertActiveHandlingForLaborProfile(
  tx: PrismaTypes.TransactionClient,
  actorId: string,
  actorRole: SystemRole,
  laborProfileId: string,
): Promise<void> {
  if (actorRole === 'HR_MANAGER' || actorRole === 'ADMIN') {
    return;
  }
  if (actorRole !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${actorRole} cannot act on a placement under labor profile ${laborProfileId}`,
      403,
    );
  }
  const now = new Date();
  const active = await tx.laborProfileHandlingAssignment.findFirst({
    where: {
      laborProfileId,
      assigneeUserId: actorId,
      status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  if (!active) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Actor ${actorId} has no ACTIVE handling assignment for LaborProfile ${laborProfileId}`,
      403,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. assertRecruiterAndHandlingDualAuthorityForPlacement (F-02 + F-03)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Same-transaction dual-authority check for candidate-specific Placement
 * commands (F-03, DEC-25). Mandatory for HR_STAFF; bypass for
 * ADMIN/HR_MANAGER (per DEC-25 canonical behavior). The contract:
 *
 *   1. Acquire the order-scoped advisory lock (F-02 canonical primitive).
 *      This serializes the call with any in-flight `revokeRecruiterFromOrder`
 *      on the SAME `staffingOrderId`. The lock is `xact`-scoped, so it is
 *      released automatically when the surrounding tx commits or rolls back.
 *   2. After acquiring the lock, re-verify BOTH authority rows are still
 *      ACTIVE. The pre-lock check is advisory only; the post-lock check is
 *      authoritative. A concurrent revoke that committed before our lock
 *      acquisition will have flipped `status='ACTIVE' → 'REVOKED'` (or
 *      removed the handling row); the post-lock re-read detects it and
 *      throws `NO_ACTIVE_ORDER_ASSIGNMENT` / `NO_ACTIVE_ASSIGNMENT`. The
 *      surrounding transaction rolls back, so no half-mutated row is
 *      persisted.
 *   3. The mutation (e.g. `placement.create` INSERT or
 *      `placement.transition` UPDATE) runs in the SAME transaction as the
 *      lock + the post-lock re-read + the authority check — atomicity is
 *      enforced by Prisma `tx`.
 *
 * Must be called from inside the calling service's `tx` (the same
 * transaction that performs the mutation). The lock is the same lock
 * used by `assignRecruiterToOrder`, `revokeRecruiterFromOrder`, and
 * `claimCandidateSubmission` — they all serialize on the order.
 *
 * Error model (canonical wire codes):
 *   - NO_ACTIVE_ORDER_ASSIGNMENT — order-level recruiter row not ACTIVE.
 *   - NO_ACTIVE_ASSIGNMENT       — handling row not ACTIVE.
 *   - ROLE_NOT_PERMITTED         — non-HR_STAFF, non-bypass role.
 */
export async function assertRecruiterAndHandlingDualAuthorityForPlacement(
  tx: PrismaTypes.TransactionClient,
  args: {
    actorId: string;
    actorRole: SystemRole;
    staffingOrderId: string;
    laborProfileId: string;
  },
): Promise<void> {
  // ADMIN / HR_MANAGER bypass — same canonical behavior as
  // `assertActiveRecruiterForOrder` (DEC-25).
  if (args.actorRole === 'HR_MANAGER' || args.actorRole === 'ADMIN') {
    return;
  }
  if (args.actorRole !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${args.actorRole} cannot act on a recruiter-scoped placement`,
      403,
    );
  }

  // (1) Order-scoped advisory lock — same primitive as assign/revoke/claim.
  //     The lock is `xact`-scoped; auto-released on commit/rollback. No
  //     orphan locks even on error paths.
  await acquireOrderAdvisoryLock(tx, args.staffingOrderId);

  // (2) Re-read BOTH authority rows after the lock. A concurrent revoke
  //     that committed before our lock would have flipped the assignment
  //     status. The post-lock check is authoritative.
  const stillOrderActive = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId: args.staffingOrderId,
      recruiterUserId: args.actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    select: { id: true },
  });
  if (!stillOrderActive) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ORDER_ASSIGNMENT',
      `Actor ${args.actorId} is no longer an ACTIVE recruiter for order ${args.staffingOrderId} after order lock acquisition`,
      403,
    );
  }

  const now = new Date();
  const stillHandlingActive = await tx.laborProfileHandlingAssignment.findFirst({
    where: {
      laborProfileId: args.laborProfileId,
      assigneeUserId: args.actorId,
      status: HANDLING_ASSIGNMENT_STATUS.ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  if (!stillHandlingActive) {
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Actor ${args.actorId} no longer has an ACTIVE handling assignment for LaborProfile ${args.laborProfileId} after order lock acquisition`,
      403,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// helpers
// ═══════════════════════════════════════════════════════════════════════════

function mapRow(row: {
  id: string;
  staffingOrderId: string;
  recruiterUserId: string;
  assignedByUserId: string;
  source: string;
  status: string;
  assignedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}): RecruiterAssignmentRow {
  return {
    id: row.id,
    staffingOrderId: row.staffingOrderId,
    recruiterUserId: row.recruiterUserId,
    assignedByUserId: row.assignedByUserId,
    source: 'HR_MANAGER_ASSIGN',
    status: row.status as RecruiterAssignmentRow['status'],
    assignedAt: row.assignedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export type { PrismaClient };
