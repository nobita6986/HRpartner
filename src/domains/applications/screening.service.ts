/**
 * MP-3A screening commands.
 *
 * Each command is role-gated, optimistic-lock protected, idempotent when the
 * target state is already reached, and writes status history + audit in the
 * caller's withDbContext transaction.
 */
import { Prisma, type CandidateSubmissionStatus } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import {
  assertMp3ActionTransition,
  StatusTransitionError,
  targetForScreeningAction,
  type ScreeningAction,
} from './status-machine';

const ACTION_ROLES: Readonly<Record<ScreeningAction, ReadonlySet<string>>> = {
  screen: new Set(['ADMIN', 'HR_MANAGER', 'SALE']),
  qualify: new Set(['ADMIN', 'HR_MANAGER']),
  reject: new Set(['ADMIN', 'HR_MANAGER']),
};

export class ScreeningCommandError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'REASON_REQUIRED'
      | 'STALE_VERSION',
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'ScreeningCommandError';
  }
}

export interface ScreeningCommandInput {
  reason: string;
  expectedVersion?: number;
}

export interface ScreeningCommandResult {
  id: string;
  status: CandidateSubmissionStatus;
  version: number;
  changed: boolean;
}

export async function executeScreeningAction(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
  action: ScreeningAction,
  input: ScreeningCommandInput,
): Promise<ScreeningCommandResult> {
  if (!ACTION_ROLES[action].has(ctx.role)) {
    throw new ScreeningCommandError('FORBIDDEN', 403, `Role ${ctx.role} cannot ${action} applications`);
  }

  const current = await tx.candidateSubmission.findUnique({
    where: { id },
    select: { id: true, status: true, version: true },
  });
  if (!current) {
    throw new ScreeningCommandError('NOT_FOUND', 404, 'Application not found');
  }
  if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) {
    throw new ScreeningCommandError('STALE_VERSION', 409, 'Application version is stale');
  }

  let target: CandidateSubmissionStatus;
  try {
    target = assertMp3ActionTransition(action, current.status, input.reason);
  } catch (error) {
    if (error instanceof StatusTransitionError) {
      throw new ScreeningCommandError(
        error.code,
        error.code === 'REASON_REQUIRED' ? 400 : 409,
        error.message,
      );
    }
    throw error;
  }

  if (current.status === target) {
    return { id, status: target, version: current.version, changed: false };
  }

  const updated = await tx.candidateSubmission.updateMany({
    where: { id, status: current.status, version: current.version },
    data: {
      status: target,
      version: { increment: 1 },
      reviewedBy: ctx.userId,
      reviewNote: input.reason.trim(),
    },
  });
  if (updated.count !== 1) {
    throw new ScreeningCommandError('STALE_VERSION', 409, 'Application changed concurrently');
  }

  await tx.applicationStatusHistory.create({
    data: {
      submissionId: id,
      fromStatus: current.status,
      toStatus: target,
      actorUserId: ctx.userId,
      reason: input.reason.trim(),
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: ctx.userId,
      actorRole: ctx.role,
      entityType: 'CandidateSubmission',
      entityId: id,
      action: `APPLICATION_${action.toUpperCase()}`,
      reason: input.reason.trim(),
      diff: {
        before: { status: current.status, version: current.version },
        after: { status: target, version: current.version + 1 },
      } as Prisma.InputJsonValue,
    },
  });

  return { id, status: target, version: current.version + 1, changed: true };
}

export function isScreeningAction(value: string): value is ScreeningAction {
  return value === 'screen' || value === 'qualify' || value === 'reject';
}

export { targetForScreeningAction };