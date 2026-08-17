/**
 * Talent Pool repository — Phase 4 slice 4A STEP-05 (RQ-05).
 *
 * Cung cấp query cho danh sách worker chưa assign (`CAN_VIEW_UNASSIGNED_POOL`).
 * Worker unassigned = KHÔNG có assignment ACTIVE (hoặc assignment đã ENDED/CANCELLED/TRANSFERRED).
 *
 * Dùng trong:
 * - Bulk transfer (STEP-05): chọn worker từ pool để assign vào project
 * - UI talent pool page (STEP-06): hiển thị danh sách worker không active ở project nào
 *
 * L1 scope: Worker scope đã có (Phase 2). Thêm filter: assignment ACTIVE = empty.
 */

import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { SCOPE_REGISTRY } from '@/src/shared/auth/scopes';
import type { ScopeBuilder } from '@/src/shared/auth/scopes';

export class TalentPoolError extends Error {
  constructor(
    public readonly code: 'PERMISSION_DENIED' | 'INTERNAL',
    message: string,
  ) {
    super(message);
    this.name = 'TalentPoolError';
  }
}

/** Check actor có CAN_VIEW_UNASSIGNED_POOL. */
export async function requireTalentPoolAccess(actor: AuthContext): Promise<void> {
  const effPerms = await resolveEffectivePermissions({
    userId: actor.userId,
    role: actor.role,
  });
  if (!effPerms.has('CAN_VIEW_UNASSIGNED_POOL')) {
    throw new TalentPoolError(
      'PERMISSION_DENIED',
      `Role ${actor.role} lacks CAN_VIEW_UNASSIGNED_POOL`,
    );
  }
}

/** Step 1: get active worker IDs as raw query (returns string[]). */
async function getActiveWorkerIds(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ worker_id: string }>>(
    `SELECT DISTINCT pa.worker_id FROM project_assignments pa WHERE pa.status = 'ACTIVE'`,
  );
  return rows.map(r => r.worker_id);
}

/**
 * Tìm worker KHÔNG có assignment ACTIVE nào (unassigned pool).
 *
 * Algorithm (2-step):
 *   1. Get active worker IDs (raw SQL).
 *   2. Query workers NOT IN (active IDs) + L1 scope filter.
 *
 * @param prisma - PrismaClient instance
 * @param ctx - AuthContext (cho L1 scope)
 * @param filters - optional: page/pagination
 */
export async function queryTalentPool(
  prisma: PrismaClient,
  ctx: AuthContext,
  filters?: {
    page?: number;
    pageSize?: number;
  },
) {
  await requireTalentPoolAccess(ctx);

  const workerScopeBuilder = SCOPE_REGISTRY['Worker'] as ScopeBuilder | undefined;
  const workerScope = workerScopeBuilder ? workerScopeBuilder(ctx) : {};

  const activeWorkerIds = await getActiveWorkerIds(prisma);

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  // Worker unassigned = NOT IN active IDs
  const rows = await prisma.worker.findMany({
    where: {
      ...workerScope,
      ...(activeWorkerIds.length > 0 && { id: { notIn: activeWorkerIds } }),
      // NOTE: skill/vendor filter → join qua assignments/slots → raw SQL
    },
    include: {
      sourceClaims: {
        where: { accepted: true },
        select: { id: true, claimType: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip,
  });

  const total = await prisma.worker.count({
    where: {
      ...workerScope,
      ...(activeWorkerIds.length > 0 && { id: { notIn: activeWorkerIds } }),
    },
  });

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Đếm unassigned workers (cho dashboard counter). */
export async function countUnassignedWorkers(
  prisma: PrismaClient,
  ctx: AuthContext,
): Promise<number> {
  await requireTalentPoolAccess(ctx);

  const workerScopeBuilder = SCOPE_REGISTRY['Worker'] as ScopeBuilder | undefined;
  const workerScope = workerScopeBuilder ? workerScopeBuilder(ctx) : {};

  const activeWorkerIds = await getActiveWorkerIds(prisma);

  return prisma.worker.count({
    where: {
      ...workerScope,
      ...(activeWorkerIds.length > 0 && { id: { notIn: activeWorkerIds } }),
    },
  });
}
