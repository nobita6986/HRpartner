import type { Prisma } from '@prisma/client';

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

  return tx.laborProfileHandlingAssignment.create({
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
