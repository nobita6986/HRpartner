import { Prisma } from '@prisma/client';

export interface HandlingAssignmentStatus {
  ACTIVE: 'ACTIVE';
  COMPLETED: 'COMPLETED';
  EXPIRED: 'EXPIRED';
  TRANSFERRED: 'TRANSFERRED';
  REVOKED: 'REVOKED';
}

export const ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  TRANSFERRED: 'TRANSFERRED',
  REVOKED: 'REVOKED',
} as const;

export const ASSIGNMENT_SOURCE = {
  AFF_INITIAL: 'AFF_INITIAL',
  MANAGER_ASSIGNMENT: 'MANAGER_ASSIGNMENT',
  CASE_RESOLUTION: 'CASE_RESOLUTION',
} as const;

export interface CreateInitialAffiliateAssignmentInput {
  laborProfileId: string;
  referrerUserId: string;
}

export async function createInitialAffiliateAssignment(
  tx: Prisma.TransactionClient,
  input: CreateInitialAffiliateAssignmentInput
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Close any existing active assignment just in case
  await tx.laborProfileHandlingAssignment.updateMany({
    where: {
      laborProfileId: input.laborProfileId,
      status: ASSIGNMENT_STATUS.ACTIVE,
    },
    data: {
      status: ASSIGNMENT_STATUS.REVOKED,
      reason: 'Replaced by initial affiliate assignment',
      updatedAt: now,
    },
  });

  try {
    return await tx.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: input.laborProfileId,
        assigneeUserId: input.referrerUserId,
        assignedByUserId: null,
        source: ASSIGNMENT_SOURCE.AFF_INITIAL,
        startsAt: now,
        expiresAt: expiresAt,
        status: ASSIGNMENT_STATUS.ACTIVE,
      },
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Race condition: another active assignment was created simultaneously.
      // Do not overwrite, just return the existing active assignment.
      const active = await getActiveHandlingAssignment(tx, input.laborProfileId);
      if (active) return active;
    }
    throw err;
  }
}

export interface ManagerAssignInput {
  laborProfileId: string;
  newAssigneeUserId: string;
  managerUserId: string;
  days: number | null;
  reason: string;
}

/**
 * AFF-05A-R2 normalized duration contract (DEC-01 / DEC-02):
 *   - property absent -> 7
 *   - property present -> finite integer in [1, 30]
 *   - explicit null, string, boolean, NaN/Infinity, fraction, 0, negative,
 *     values > 30 are rejected without coercion.
 * Detect property presence (not truthiness) so that explicit `null` is
 * distinguishable from `undefined`. The route layer is the only caller that
 * should pass a value-bearing or property-absent `days`; this function is the
 * final authority at the service boundary.
 */
export const MANAGER_ASSIGN_DAYS_DEFAULT = 7;
export const MANAGER_ASSIGN_DAYS_MIN = 1;
export const MANAGER_ASSIGN_DAYS_MAX = 30;

export class ManagerAssignDaysError extends Error {
  readonly code = 'MANAGER_ASSIGN_DAYS_INVALID';
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ManagerAssignDaysError';
  }
}

export function normalizeManagerAssignDays(
  present: boolean,
  raw: unknown,
): number {
  if (!present) return MANAGER_ASSIGN_DAYS_DEFAULT;
  if (raw === null) {
    throw new ManagerAssignDaysError('days must be a finite integer in [1,30] when provided (null is not allowed).');
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new ManagerAssignDaysError('days must be a finite integer in [1,30].');
  }
  if (!Number.isInteger(raw)) {
    throw new ManagerAssignDaysError('days must be an integer in [1,30].');
  }
  if (raw < MANAGER_ASSIGN_DAYS_MIN || raw > MANAGER_ASSIGN_DAYS_MAX) {
    throw new ManagerAssignDaysError(
      `days must be in [${MANAGER_ASSIGN_DAYS_MIN},${MANAGER_ASSIGN_DAYS_MAX}].`,
    );
  }
  return raw;
}

async function expireElapsedHandlingAssignments(
  tx: Prisma.TransactionClient,
  laborProfileId: string,
  now: Date,
) {
  return tx.laborProfileHandlingAssignment.updateMany({
    where: {
      laborProfileId,
      status: ASSIGNMENT_STATUS.ACTIVE,
      expiresAt: { lte: now },
    },
    data: {
      status: ASSIGNMENT_STATUS.EXPIRED,
      updatedAt: now,
    },
  });
}

export async function managerAssign(
  tx: Prisma.TransactionClient,
  input: ManagerAssignInput
) {
  // AFF-05A-R2: single server `now` snapshot used for expiry sweep, active
  // lookup, transfer history and new startsAt/expiresAt calculation. Days must
  // already be a validated finite integer in [1,30] at this point (the route
  // enforces it via normalizeManagerAssignDays; if the service is called from
  // a non-route caller, we re-validate and throw typed error).
  const daysValidated = normalizeManagerAssignDays(true, input.days);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + daysValidated * 24 * 60 * 60 * 1000,
  );

  await expireElapsedHandlingAssignments(tx, input.laborProfileId, now);

  // Validate assignee role (P1-4)
  const newAssignee = await tx.user.findUnique({
    where: { id: input.newAssigneeUserId },
    select: { role: true },
  });
  if (!newAssignee) {
    throw new Error('Assignee not found');
  }
  if (newAssignee.role !== 'HR_STAFF' && newAssignee.role !== 'HR_MANAGER') {
    throw new Error('Only HR_STAFF or HR_MANAGER can be assigned to handle Labor Profiles');
  }

  const activeAssignment = await getActiveHandlingAssignment(tx, input.laborProfileId, now);

  if (activeAssignment) {
    await tx.laborProfileHandlingAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        status: ASSIGNMENT_STATUS.TRANSFERRED,
        reason: 'Manager reassigned',
        updatedAt: now,
      },
    });
  }

  return tx.laborProfileHandlingAssignment.create({
    data: {
      laborProfileId: input.laborProfileId,
      assigneeUserId: input.newAssigneeUserId,
      assignedByUserId: input.managerUserId,
      source: ASSIGNMENT_SOURCE.MANAGER_ASSIGNMENT,
      startsAt: now,
      expiresAt: expiresAt,
      status: ASSIGNMENT_STATUS.ACTIVE,
      reason: input.reason,
      previousAssignmentId: activeAssignment?.id || null,
    },
  });
}

export async function getActiveHandlingAssignment(
  tx: Prisma.TransactionClient,
  laborProfileId: string,
  asOf = new Date(),
) {
  const activeAssignment = await tx.laborProfileHandlingAssignment.findFirst({
    where: {
      laborProfileId,
      status: ASSIGNMENT_STATUS.ACTIVE,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!activeAssignment) {
    return null;
  }

  // Expired when expiresAt <= asOf (same semantics as sweep's lte)
  if (activeAssignment.expiresAt && activeAssignment.expiresAt <= asOf) {
    return null; // Treated as expired (in Company Pool)
  }

  return activeAssignment;
}

export interface ReleaseHandlingAssignmentInput {
  laborProfileId: string;
  actorId: string;
  reason: string;
}

export async function releaseHandlingAssignment(
  tx: Prisma.TransactionClient,
  input: ReleaseHandlingAssignmentInput
) {
  const now = new Date();
  await expireElapsedHandlingAssignments(tx, input.laborProfileId, now);

  const activeAssignment = await getActiveHandlingAssignment(tx, input.laborProfileId, now);

  if (!activeAssignment) {
    return null;
  }

  const actor = await tx.user.findUnique({
    where: { id: input.actorId },
    select: { name: true },
  });
  const actorName = actor?.name || input.actorId;

  return tx.laborProfileHandlingAssignment.update({
    where: { id: activeAssignment.id },
    data: {
      status: ASSIGNMENT_STATUS.REVOKED,
      reason: `[Thu hồi bởi ${actorName}] ${input.reason}`,
      updatedAt: now,
    },
  });
}

export async function getHandlingAssignmentHistory(
  tx: Prisma.TransactionClient,
  laborProfileId: string
) {
  return tx.laborProfileHandlingAssignment.findMany({
    where: { laborProfileId },
    orderBy: { createdAt: 'desc' },
    include: {
      assigneeUser: { select: { name: true } },
      assignedByUser: { select: { name: true } },
    }
  });
}
