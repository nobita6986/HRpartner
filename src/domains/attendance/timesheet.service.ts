/**
 * Timesheet Service — Phase 4 slice 4B STEP-10 (RQ-09, RQ-10).
 *
 * DEC-12: TimesheetPeriod SM PENDING → REVIEWED → APPROVED → LOCKED.
 * D06: maker ≠ checker — maker tạo period, checker approve.
 * F21: mở lại sau LOCKED → version+1, dữ liệu cũ giữ nguyên.
 *
 * ADR-011: xây TRÊN generic state-machine.ts (Phase 3).
 *
 * Workflow:
 *   PENDING (maker tạo)
 *     ↓ REVIEW
 *   REVIEWED (đang xem/xử lý exception)
 *     ↓ APPROVE
 *   APPROVED (checker duyệt)
 *     ↓ LOCK
 *   LOCKED (bất biến — chỉ adjustment/version mới)
 *     ↓ REOPEN (T1/T2/S3 override)
 *   PENDING (version mới)
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import {
  IllegalTransitionError,
  guardTransition,
} from '@/src/shared/integrity/state-machine';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ─── State Machine Definition ─────────────────────────────────────────────────

export const TIMESHEET_STATUSES = ['PENDING', 'REVIEWED', 'APPROVED', 'LOCKED'] as const;
export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const TIMESHEET_ACTIONS = ['REVIEW', 'APPROVE', 'LOCK', 'REOPEN'] as const;
export type TimesheetAction = (typeof TIMESHEET_ACTIONS)[number];

type TimesheetRole = 'ADMIN' | 'HR_MANAGER' | 'HR_STAFF' | 'PM' | 'ACCOUNTANT' | 'DIRECTOR';

export const TIMESHEET_TRANSITIONS: Readonly<
  Partial<
    Record<
      TimesheetStatus,
      Partial<Record<TimesheetAction, { to: TimesheetStatus; allowedRoles: readonly TimesheetRole[] }>>
    >
  >
> = {
  PENDING: {
    REVIEW: { to: 'REVIEWED', allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM'] },
  },
  REVIEWED: {
    APPROVE: { to: 'APPROVED', allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR'] },
  },
  APPROVED: {
    LOCK: { to: 'LOCKED', allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR'] },
  },
  // LOCKED → PENDING (reopen với version+1)
  LOCKED: {
    REOPEN: { to: 'PENDING', allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_STAFF'] },
  },
};

// ─── Errors ─────────────────────────────────────────────────────────────────

export class TimesheetServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'PERMISSION_DENIED'
      | 'MAKER_EQ_CHECKER'
      | 'PERIOD_EXISTS'
      | 'ALREADY_LOCKED',
    message: string,
  ) {
    super(message);
    this.name = 'TimesheetServiceError';
  }
}

// ─── Create Period ─────────────────────────────────────────────────────────────

export interface CreateTimesheetPeriodInput {
  projectId?: string;
  month: number;
  year: number;
}

export async function createTimesheetPeriod(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: CreateTimesheetPeriodInput,
): Promise<Prisma.TimesheetPeriodGetPayload<{ include: { lines: true } }>> {
  // Verify unique: (projectId, month, year, version=1)
  const existing = await tx.timesheetPeriod.findFirst({
    where: {
      projectId: input.projectId ?? null,
      month: input.month,
      year: input.year,
      version: 1,
    },
  });

  if (existing) {
    throw new TimesheetServiceError(
      'PERIOD_EXISTS',
      `TimesheetPeriod (project=${input.projectId ?? 'null'}, month=${input.month}, year=${input.year}) đã tồn tại`,
    );
  }

  return tx.timesheetPeriod.create({
    data: {
      projectId: input.projectId ?? null,
      month: input.month,
      year: input.year,
      status: 'PENDING',
      version: 1,
    },
    include: { lines: true },
  });
}

// ─── Transition ───────────────────────────────────────────────────────────────

export async function transitionTimesheetPeriod(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  periodId: string,
  action: TimesheetAction,
  metadata?: { note?: string },
): Promise<Prisma.TimesheetPeriodGetPayload<{ select: { id: true; status: true; version: true } }>> {
  const period = await tx.timesheetPeriod.findUnique({
    where: { id: periodId },
    select: { id: true, status: true, projectId: true, month: true, year: true, version: true },
  });

  if (!period) throw new TimesheetServiceError('NOT_FOUND', `TimesheetPeriod ${periodId} không tìm thấy`);

  // Special: REOPEN after LOCKED → create new version
  if (period.status === 'LOCKED' && action === 'REOPEN') {
    return reopenPeriod(tx, ctx, period);
  }

  // Generic guard
  try {
    guardTransition(period.status, action, TIMESHEET_TRANSITIONS as any, {
      actorRole: ctx.role,
    });
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      throw new TimesheetServiceError('INVALID_TRANSITION', err.message);
    }
    throw err;
  }

  const def = (TIMESHEET_TRANSITIONS as any)[period.status]?.[action];
  const toStatus = def.to as TimesheetStatus;

  // D06: maker ≠ checker — check APPROVE/LOCK không cùng người tạo
  if (action === 'APPROVE' || action === 'LOCK') {
    const createdBy = await tx.auditLog.findFirst({
      where: {
        entityType: 'TimesheetPeriod',
        entityId: periodId,
        action: 'STATE_TRANSITION',
      },
      orderBy: { createdAt: 'asc' },
    });
    if (createdBy?.actorId === ctx.userId) {
      throw new TimesheetServiceError(
        'MAKER_EQ_CHECKER',
        `Maker = Checker: ${ctx.userId} đã tạo period này, không thể tự duyệt/khóa`,
      );
    }
  }

  // Update status
  const updateData: Prisma.TimesheetPeriodUpdateInput = { status: toStatus };
  if (toStatus === 'LOCKED') {
    updateData.lockedAt = new Date();
  }

  const updated = await tx.timesheetPeriod.update({
    where: { id: periodId },
    data: updateData,
    select: { id: true, status: true, version: true },
  });

  // Audit log
  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'TimesheetPeriod',
    entityId: periodId,
    action,
    reason: metadata?.note,
    diff: { before: { status: period.status }, after: { status: toStatus } },
  });

  // Outbox
  await enqueueOutbox(tx, {
    eventType: 'TimesheetPeriodTransition',
    aggregateId: periodId,
    payload: {
      periodId,
      fromStatus: period.status,
      toStatus,
      action,
      changedBy: ctx.userId,
    },
  });

  return updated;
}

// ─── Reopen (F21) ──────────────────────────────────────────────────────────

async function reopenPeriod(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  period: { id: string; projectId: string | null; month: number; year: number; version: number },
): Promise<Prisma.TimesheetPeriodGetPayload<{ select: { id: true; status: true; version: true } }>> {
  const nextVersion = period.version + 1;

  // Create new period version
  const newPeriod = await tx.timesheetPeriod.create({
    data: {
      projectId: period.projectId,
      month: period.month,
      year: period.year,
      status: 'PENDING',
      version: nextVersion,
    },
    select: { id: true, status: true, version: true },
  });

  // Audit log for reopen
  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'TimesheetPeriod',
    entityId: newPeriod.id,
    action: 'REOPEN',
    reason: `Reopen v${period.version} → v${nextVersion}`,
    diff: { before: { version: period.version, status: 'LOCKED' }, after: { version: nextVersion, status: 'PENDING' } },
  });

  await enqueueOutbox(tx, {
    eventType: 'TimesheetPeriodReopened',
    aggregateId: newPeriod.id,
    payload: {
      newPeriodId: newPeriod.id,
      oldPeriodId: period.id,
      oldVersion: period.version,
      newVersion: nextVersion,
      reopenedBy: ctx.userId,
    },
  });

  return newPeriod;
}

// ─── List / Get ─────────────────────────────────────────────────────────────

export async function listTimesheetPeriods(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  opts?: { take?: number; skip?: number; status?: TimesheetStatus; projectId?: string },
) {
  const take = Math.min(50, opts?.take ?? 20);
  const skip = opts?.skip ?? 0;
  const where: Prisma.TimesheetPeriodWhereInput = {};
  if (opts?.status) where.status = opts.status;
  if (opts?.projectId) where.projectId = opts.projectId;

  const [rows, total] = await Promise.all([
    tx.timesheetPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take,
      skip,
    }),
    tx.timesheetPeriod.count({ where }),
  ]);

  return { rows, total };
}

export async function getTimesheetPeriod(
  tx: Prisma.TransactionClient,
  periodId: string,
) {
  return tx.timesheetPeriod.findUnique({
    where: { id: periodId },
    include: {
      lines: {
        orderBy: { workDate: 'asc' },
      },
    },
  });
}
