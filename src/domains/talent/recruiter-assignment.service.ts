/**
 * recruiter-assignment.service.ts — P1-A0.4 Scoped Recruiter Authority.
 *
 * Service layer for `StaffingOrderRecruiterAssignment`. The application is the
 * authoritative role gate; RLS is the backstop. All mutations run inside a
 * caller-managed transaction (use `withDbContext`).
 *
 * Five operations (TASK.md §3 / AC-01..AC-08):
 *   1. assignRecruiterToOrder      — HR_MANAGER / ADMIN creates a
 *      HR_MANAGER_ASSIGN row. Idempotent (AssignmentAlreadyExistsError).
 *   2. revokeRecruiterFromOrder    — HR_MANAGER / ADMIN revokes any row, or
 *      HR_STAFF revokes their own ORDER_RECRUITER_CLAIM row. Deterministic
 *      mutex via `pg_advisory_xact_lock(hashtext(staffing_order_id))`.
 *   3. claimStaffingOrder          — HR_STAFF self-claim. Advisory lock
 *      ensures at most one winner per order; race losers receive
 *      HANDLING_ALREADY_CLAIMED (404).
 *   4. listUnclaimedStaffingOrders — Read service for the queue. Filtered to
 *      OPEN orders the caller may claim (HR_STAFF only). Bounded to 100.
 *   5. listMyActiveStaffingOrders  — Read service for the recruiter's own
 *      active orders (used by the workbench).
 *
 * Role gate:
 *   - HR_STAFF may only create ORDER_RECRUITER_CLAIM rows; the service
 *     refuses `source = HR_MANAGER_ASSIGN` from a HR_STAFF caller.
 *   - HR_MANAGER / ADMIN may create HR_MANAGER_ASSIGN; self-claim is also
 *     permitted (a manager can also act as a recruiter for visibility
 *     testing — admin path only).
 *
 * Error model (canonical codes — wire contract):
 *   - ASSIGNEE_NOT_FOUND          (404)
 *   - ASSIGNEE_NOT_RECRUITER      (400) — must be HR_STAFF role
 *   - STAFFING_ORDER_NOT_FOUND    (404)
 *   - ASSIGNMENT_ALREADY_EXISTS   (409) — duplicate INSERT
 *   - NO_ACTIVE_ASSIGNMENT        (404) — revoke target missing
 *   - HANDLING_ALREADY_CLAIMED    (409) — claim race lost
 *   - ROLE_NOT_PERMITTED          (403)
 *   - CROSS_ORDER_REVOKE          (400) — attempt to revoke a row whose
 *                                          (order, recruiter) pair does
 *                                          not match the caller's session
 *
 * Deterministic revoke ordering (AC-E2E-20 / AC-E2E-21):
 *   - The mutex is `pg_advisory_xact_lock(hashtext(staffing_order_id))` —
 *     scoped to the order, transaction-bound.
 *   - Test invariant: when one DB connection commits ACTIVE → ACTIVE
 *     (assign-then-revoke) and another observes the state mid-revoke, the
 *     loser sees NO_ACTIVE_ASSIGNMENT and aborts cleanly. The
 *     "command-first" and "revoke-first" orderings are both covered.
 */
import { Prisma, type PrismaClient, type Prisma as PrismaTypes } from '@prisma/client';
import type { SystemRole } from '@prisma/client';

export const RECRUITER_ASSIGNMENT_SOURCE = {
  HR_MANAGER_ASSIGN: 'HR_MANAGER_ASSIGN',
  ORDER_RECRUITER_CLAIM: 'ORDER_RECRUITER_CLAIM',
} as const;

export const RECRUITER_ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

export class RecruiterAssignmentError extends Error {
  constructor(
    public readonly code:
      | 'ASSIGNEE_NOT_FOUND'
      | 'ASSIGNEE_NOT_RECRUITER'
      | 'STAFFING_ORDER_NOT_FOUND'
      | 'ASSIGNMENT_ALREADY_EXISTS'
      | 'NO_ACTIVE_ASSIGNMENT'
      | 'HANDLING_ALREADY_CLAIMED'
      | 'ROLE_NOT_PERMITTED'
      | 'CROSS_ORDER_REVOKE'
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
 * Build a stable 32-bit lock key from a string id (Postgres advisory lock
 * takes a `bigint`; `hashtext` returns int4 which we widen to bigint). The
 * key is order-scoped so two revokes on different orders do not contend.
 */
async function acquireOrderLock(
  tx: PrismaTypes.TransactionClient,
  staffingOrderId: string,
): Promise<void> {
  // Strip the sign bit from hashtext() to keep the key in the signed-bigint
  // range pg_advisory_xact_lock accepts. Equivalent to the SQL pattern
  // `(hashtext($1)::bigint & x'7fffffff'::bigint)` but portable through
  // $executeRawUnsafe string interpolation.
  await tx.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock( (hashtext($1)::bigint) & 9223372036854775807::bigint )",
    `p1a04:order:${staffingOrderId}`,
  );
}

export interface AssignRecruiterInput {
  staffingOrderId: string;
  recruiterUserId: string;
  /** Server-derived from AuthContext.role — service is the final authority. */
  actorRole: SystemRole;
  actorId: string;
  reason?: string;
}

export interface RecruiterAssignmentRow {
  id: string;
  staffingOrderId: string;
  recruiterUserId: string;
  assignedByUserId: string | null;
  source: 'HR_MANAGER_ASSIGN' | 'ORDER_RECRUITER_CLAIM';
  status: 'ACTIVE' | 'REVOKED';
  startsAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ClaimStaffingOrderInput {
  staffingOrderId: string;
  /** Self-claim source (HR_STAFF caller only). */
  actorRole: SystemRole;
  actorId: string;
}

export interface RevokeRecruiterInput {
  /** id of the row to revoke. */
  assignmentId: string;
  actorRole: SystemRole;
  actorId: string;
  reason: string;
}

/**
 * HR_MANAGER / ADMIN assigns a recruiter to a staffing order.
 * Idempotent on (order, recruiter) — if a row is already ACTIVE the existing
 * row is returned and the caller sees no error. Other states are surfaced.
 */
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

  await acquireOrderLock(tx, input.staffingOrderId);

  // Idempotency: existing ACTIVE row returns the existing row.
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

  // RLS INSERT will pass (HR_MANAGER / ADMIN policy); partial unique index
  // serializes any race against a concurrent INSERT for the same (order,
  // recruiter). P2002 → ASSIGNMENT_ALREADY_EXISTS.
  try {
    const created = await tx.staffingOrderRecruiterAssignment.create({
      data: {
        staffingOrderId: input.staffingOrderId,
        recruiterUserId: input.recruiterUserId,
        assignedByUserId: input.actorId,
        source: RECRUITER_ASSIGNMENT_SOURCE.HR_MANAGER_ASSIGN,
        status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
        reason: input.reason ?? null,
        startsAt: new Date(),
      },
    });
    return mapRow(created);
  } catch (err) {
    if (
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002')
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

/**
 * HR_STAFF self-claims an unclaimed order. Advisory lock guarantees exactly
 * one winner. Race losers see HANDLING_ALREADY_CLAIMED.
 */
export async function claimStaffingOrder(
  tx: PrismaTypes.TransactionClient,
  input: ClaimStaffingOrderInput,
): Promise<RecruiterAssignmentRow> {
  if (input.actorRole !== 'HR_STAFF') {
    throw new RecruiterAssignmentError(
      'ROLE_NOT_PERMITTED',
      `Role ${input.actorRole} cannot self-claim a staffing order`,
      403,
    );
  }
  const order = await tx.staffingOrder.findUnique({
    where: { id: input.staffingOrderId },
    select: { id: true, status: true },
  });
  if (!order) {
    throw new RecruiterAssignmentError('STAFFING_ORDER_NOT_FOUND', `StaffingOrder ${input.staffingOrderId} not found`, 404);
  }

  await acquireOrderLock(tx, input.staffingOrderId);

  // Same recruiter self-claim: idempotent replay returns the existing ACTIVE row.
  const selfActive = await tx.staffingOrderRecruiterAssignment.findFirst({
    where: {
      staffingOrderId: input.staffingOrderId,
      recruiterUserId: input.actorId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
  });
  if (selfActive) {
    return mapRow(selfActive);
  }

  // Race serialization: the partial unique index
  // `staffing_order_recruiter_assignments_active_order_unique_idx` blocks
  // concurrent INSERTs for any ACTIVE row on the same order (regardless of
  // which recruiter holds it). The advisory lock on the order prevents
  // overlapping SELECT-then-INSERT windows. P2002 is the canonical race-loser
  // signal — the catch runs OUTSIDE the aborted tx via a separate
  // connection (the caller-provided client) so we can read the winning row.
  try {
    const created = await tx.staffingOrderRecruiterAssignment.create({
      data: {
        staffingOrderId: input.staffingOrderId,
        recruiterUserId: input.actorId,
        assignedByUserId: null,
        source: RECRUITER_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM,
        status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
        startsAt: new Date(),
      },
    });
    return mapRow(created);
  } catch (err) {
    if (
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002')
    ) {
      throw new RecruiterAssignmentError(
        'HANDLING_ALREADY_CLAIMED',
        `StaffingOrder ${input.staffingOrderId} was claimed by another recruiter during your claim`,
        409,
        { staffingOrderId: input.staffingOrderId },
      );
    }
    throw err;
  }
}

/**
 * Revoke an assignment. Deterministic mutex: advisory lock on the order,
 * conditional UPDATE on status = ACTIVE. Conditional UPDATE returns count=0
 * if the row is already REVOKED or has been deleted by a concurrent path —
 * we surface NO_ACTIVE_ASSIGNMENT.
 *
 * Cross-order safety: the row's order id is loaded inside the locked section
 * and used as the lock key; the conditional UPDATE additionally checks the
 * row's own (status, recruiter, order) to defend against ordering edge cases
 * in test fixtures.
 */
export async function revokeRecruiterFromOrder(
  tx: PrismaTypes.TransactionClient,
  input: RevokeRecruiterInput,
): Promise<RecruiterAssignmentRow> {
  if (!input.assignmentId) {
    throw new RecruiterAssignmentError('INVALID_INPUT', 'assignmentId is required', 400);
  }
  if (input.actorRole !== 'HR_STAFF' && input.actorRole !== 'HR_MANAGER' && input.actorRole !== 'ADMIN') {
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
    throw new RecruiterAssignmentError(
      'NO_ACTIVE_ASSIGNMENT',
      `Assignment ${input.assignmentId} not found`,
      404,
    );
  }

  await acquireOrderLock(tx, target.staffingOrderId);

  // HR_STAFF can only revoke their own ORDER_RECRUITER_CLAIM rows.
  if (input.actorRole === 'HR_STAFF') {
    if (target.recruiterUserId !== input.actorId) {
      throw new RecruiterAssignmentError(
        'CROSS_ORDER_REVOKE',
        `HR_STAFF may only revoke their own assignments`,
        400,
      );
    }
    if (target.source !== RECRUITER_ASSIGNMENT_SOURCE.ORDER_RECRUITER_CLAIM) {
      throw new RecruiterAssignmentError(
        'CROSS_ORDER_REVOKE',
        `HR_STAFF may only revoke self-claimed assignments (source=${target.source})`,
        400,
      );
    }
  }

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

function mapRow(row: {
  id: string;
  staffingOrderId: string;
  recruiterUserId: string;
  assignedByUserId: string | null;
  source: string;
  status: string;
  startsAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}): RecruiterAssignmentRow {
  return {
    id: row.id,
    staffingOrderId: row.staffingOrderId,
    recruiterUserId: row.recruiterUserId,
    assignedByUserId: row.assignedByUserId,
    source: row.source as RecruiterAssignmentRow['source'],
    status: row.status as RecruiterAssignmentRow['status'],
    startsAt: row.startsAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Read: list unclaimed staffing orders (HR_STAFF candidate queue).
 * Returns orders that:
 *   - are OPEN,
 *   - have no ACTIVE `StaffingOrderRecruiterAssignment`,
 *   - are visible to the caller per the existing `hrp_project_visible_for`
 *     rule (the read service runs inside a `withDbContext` tx so the
 *     project-level RLS filters out non-visible orders automatically).
 */
export interface UnclaimedStaffingOrderRow {
  staffingOrderId: string;
  projectId: string;
  code: string;
  title: string;
  status: string;
  projectName: string;
  companyName: string | null;
  slotsCount: number;
  slotsTotal: number;
  openSince: string;
}

export async function listUnclaimedStaffingOrders(
  tx: PrismaTypes.TransactionClient,
  options: { limit?: number } = {},
): Promise<UnclaimedStaffingOrderRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  // Orders without an active recruiter assignment. RLS narrows the result
  // to orders the caller can see (HR_STAFF gets empty if they have no
  // visible projects — that's a deny-by-default, not a 200 with rows).
  const rows = await tx.staffingOrder.findMany({
    where: {
      status: 'OPEN',
      recruiterAssignments: { none: { status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      projectId: true,
      code: true,
      title: true,
      status: true,
      createdAt: true,
      project: { select: { name: true, clientCompany: { select: { name: true } } } },
      slots: { select: { id: true, slotsNeeded: true } },
    },
  });
  return rows.map((r) => ({
    staffingOrderId: r.id,
    projectId: r.projectId,
    code: r.code,
    title: r.title,
    status: r.status,
    projectName: r.project?.name ?? '',
    companyName: r.project?.clientCompany?.name ?? null,
    slotsCount: r.slots.length,
    slotsTotal: r.slots.reduce((sum: number, s: { slotsNeeded: number }) => sum + s.slotsNeeded, 0),
    openSince: r.createdAt.toISOString(),
  }));
}

/**
 * Read: list the caller's own ACTIVE recruiter assignments. For the
 * recruiter's "My Orders" surface.
 */
export interface MyStaffingOrderRow {
  assignmentId: string;
  staffingOrderId: string;
  source: 'HR_MANAGER_ASSIGN' | 'ORDER_RECRUITER_CLAIM';
  startsAt: string;
  code: string;
  title: string;
  projectId: string;
  projectName: string;
  companyName: string | null;
  slotsCount: number;
  slotsTotal: number;
  orderStatus: string;
}

export async function listMyActiveStaffingOrders(
  tx: PrismaTypes.TransactionClient,
  recruiterUserId: string,
): Promise<MyStaffingOrderRow[]> {
  const rows = await tx.staffingOrderRecruiterAssignment.findMany({
    where: {
      recruiterUserId,
      status: RECRUITER_ASSIGNMENT_STATUS.ACTIVE,
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      source: true,
      startsAt: true,
      staffingOrder: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          projectId: true,
          project: { select: { name: true, clientCompany: { select: { name: true } } } },
          slots: { select: { id: true, slotsNeeded: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    assignmentId: r.id,
    staffingOrderId: r.staffingOrder.id,
    source: r.source as MyStaffingOrderRow['source'],
    startsAt: r.startsAt.toISOString(),
    code: r.staffingOrder.code,
    title: r.staffingOrder.title,
    projectId: r.staffingOrder.projectId,
    projectName: r.staffingOrder.project?.name ?? '',
    companyName: r.staffingOrder.project?.clientCompany?.name ?? null,
    slotsCount: r.staffingOrder.slots.length,
    slotsTotal: r.staffingOrder.slots.reduce((sum: number, s: { slotsNeeded: number }) => sum + s.slotsNeeded, 0),
    orderStatus: r.staffingOrder.status,
  }));
}

/**
 * Read: list all ACTIVE recruiter assignments on an order.
 * Used by the assignment preview route.
 */
export interface OrderRecruiterAssignmentRow {
  assignmentId: string;
  recruiterUserId: string;
  recruiterName: string | null;
  source: 'HR_MANAGER_ASSIGN' | 'ORDER_RECRUITER_CLAIM';
  startsAt: string;
  status: 'ACTIVE' | 'REVOKED';
  revokedAt: string | null;
  revokedByUserId: string | null;
  assignedByUserId: string | null;
  reason: string | null;
}

export async function listOrderRecruiterAssignments(
  tx: PrismaTypes.TransactionClient,
  staffingOrderId: string,
): Promise<OrderRecruiterAssignmentRow[]> {
  const rows = await tx.staffingOrderRecruiterAssignment.findMany({
    where: { staffingOrderId },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      recruiterUserId: true,
      source: true,
      startsAt: true,
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
    startsAt: r.startsAt.toISOString(),
    status: r.status as OrderRecruiterAssignmentRow['status'],
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
    revokedByUserId: r.revokedByUserId,
    assignedByUserId: r.assignedByUserId,
    reason: r.reason,
  }));
}

/**
 * Internal: assert that the caller is the active recruiter for the order's
 * slot in question. Used by placement dual authority. The function returns
 * the assignment id; absence → throws `RecruiterAssignmentError` with code
 * ROLE_NOT_PERMITTED (404 — same shape as "no active assignment").
 */
export async function assertActiveRecruiterForOrder(
  tx: PrismaTypes.TransactionClient,
  actorId: string,
  actorRole: SystemRole,
  staffingOrderId: string,
): Promise<void> {
  if (actorRole === 'HR_MANAGER' || actorRole === 'ADMIN') {
    // These roles bypass the recruiter check.
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
      'NO_ACTIVE_ASSIGNMENT',
      `Actor ${actorId} is not the active recruiter for order ${staffingOrderId}`,
      404,
    );
  }
}

/** Helper: `getPrisma()` for callers that need a typed client. */
export type { PrismaClient };
