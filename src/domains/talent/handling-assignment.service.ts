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

export async function managerAssign(
  tx: Prisma.TransactionClient,
  input: ManagerAssignInput
) {
  const now = new Date();
  const expiresAt = input.days ? new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000) : null;

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

  const activeAssignment = await getActiveHandlingAssignment(tx, input.laborProfileId);

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
  laborProfileId: string
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

  const now = new Date();
  if (activeAssignment.expiresAt && activeAssignment.expiresAt < now) {
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
  const activeAssignment = await getActiveHandlingAssignment(tx, input.laborProfileId);

  if (!activeAssignment) {
    return null;
  }

  const actor = await tx.user.findUnique({
    where: { id: input.actorId },
    select: { name: true },
  });
  const actorName = actor?.name || input.actorId;

  const now = new Date();
  return tx.laborProfileHandlingAssignment.update({
    where: { id: activeAssignment.id },
    data: {
      status: ASSIGNMENT_STATUS.EXPIRED,
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
