import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { buildProjectScope } from '@/src/shared/auth/scopes/project.scope';
import { writeAuditLog } from '@/src/shared/integrity/audit';

export type PublishJobInput = {
  projectId: string;
  isPublic: boolean;
  expectedVersion?: number;
  reason?: string;
};

export class PublishJobServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'STALE_VERSION' | 'PERMISSION_DENIED',
    message: string,
  ) {
    super(message);
    this.name = 'PublishJobServiceError';
  }
}

const PUBLISHABLE_ORDER_STATUSES = new Set(['OPEN', 'CLOSING_SOON']);

function availableSlots(project: {
  staffingOrders: Array<{ status: string; deadlineDate: Date | null; slots: Array<{ slotsNeeded: number; slotsFilled: number; validTo: Date | null }> }>;
}): number {
  const now = new Date();
  return project.staffingOrders.reduce((total, order) => {
    if (!PUBLISHABLE_ORDER_STATUSES.has(order.status)) return total;
    if (order.deadlineDate && order.deadlineDate < now) return total;
    return total + order.slots.reduce((sum, slot) => {
      if (slot.validTo && slot.validTo < now) return sum;
      return sum + Math.max(0, slot.slotsNeeded - slot.slotsFilled);
    }, 0);
  }, 0);
}

export async function publishJob(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: PublishJobInput,
) {
  const scope = buildProjectScope(ctx);
  const project = await tx.project.findFirst({
    where: { id: input.projectId, ...scope },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isPublic: true,
      version: true,
      staffingOrders: {
        select: {
          status: true,
          deadlineDate: true,
          slots: { select: { slotsNeeded: true, slotsFilled: true, validTo: true } },
        },
      },
    },
  });

  if (!project) {
    throw new PublishJobServiceError('NOT_FOUND', 'Project not found or outside your scope');
  }
  if (input.expectedVersion !== undefined && project.version !== input.expectedVersion) {
    throw new PublishJobServiceError('STALE_VERSION', 'Project version is stale');
  }
  if (input.isPublic && project.status !== 'ACTIVE') {
    throw new PublishJobServiceError('INVALID_STATE', 'Only ACTIVE projects can be published');
  }
  if (input.isPublic && availableSlots(project) <= 0) {
    throw new PublishJobServiceError('INVALID_STATE', 'Project must have an open order with available slots');
  }

  if (project.isPublic === input.isPublic) {
    return { project, changed: false };
  }

  const updated = await tx.project.updateMany({
    where: {
      id: input.projectId,
      version: project.version,
      ...scope,
    },
    data: { isPublic: input.isPublic, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    throw new PublishJobServiceError('STALE_VERSION', 'Project changed before publish completed');
  }

  const result = {
    id: project.id,
    code: project.code,
    name: project.name,
    isPublic: input.isPublic,
    version: project.version + 1,
  };

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'Project',
    entityId: project.id,
    action: input.isPublic ? 'PUBLISH' : 'UNPUBLISH',
    reason: input.reason ?? null,
    diff: { before: { isPublic: project.isPublic, version: project.version }, after: result },
    metadata: { projectCode: project.code },
  });

  return { project: result, changed: true };
}
