/**
 * Resolve & Adjustment Service — Phase 4 slice 4B STEP-13 (RQ-10, ADR-013).
 *
 * F00A bước 7: Resolve drawer — map rawEmployeeCode (e.g. AP-QM-1048) → worker.
 * DEC-11: unmatched rows có status=UNMATCHED; sau resolve → UPDATE matchedWorkerId + status=MATCHED.
 *
 * ADR-013: LOCKED bất biến — mọi sửa sau LOCKED qua TimesheetAdjustment.
 * RQ-10: adjustment cần reason + audit.
 *
 * 3 loại exception resolve:
 *   1. Map unmatched employee code → worker (batch row correction)
 *   2. Tạo TimesheetAdjustment sau khi period REVIEWED/APPROVED (pre-lock)
 *   3. Tạo TimesheetAdjustment sau khi period LOCKED (post-lock — F21)
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResolveRowInput {
  rowId: string;
  matchedWorkerId: string;
  note?: string;
}

export interface CreateAdjustmentInput {
  periodId: string;
  workerId: string;
  workDate?: string; // ISO date string YYYY-MM-DD
  deltaHours: number; // positive = thêm giờ, negative = bớt giờ
  reason: string;
}

export class ResolveServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATUS'
      | 'ROW_NOT_UNMATCHED'
      | 'PERMISSION_DENIED'
      | 'ALREADY_RESOLVED',
    message: string,
  ) {
    super(message);
    this.name = 'ResolveServiceError';
  }
}

export class AdjustmentServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATUS'
      | 'MISSING_REASON'
      | 'PERMISSION_DENIED',
    message: string,
  ) {
    super(message);
    this.name = 'AdjustmentServiceError';
  }
}

// ─── Resolve batch rows ───────────────────────────────────────────────────────

/**
 * Resolve unmatched batch rows — map rawEmployeeCode → matchedWorkerId.
 *
 * F00A bước 7: "Click exception → Resolve drawer (map AP-QM-1048 → Mai)"
 *
 * Pre-condition: row status = UNMATCHED or ANOMALY.
 * Post-condition: row status = MATCHED, matchedWorkerId set.
 */
export async function resolveUnmatchedRows(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  batchId: string,
  resolves: ResolveRowInput[],
): Promise<{ updatedCount: number }> {
  // Verify batch exists and is PREVIEWED (not COMMITTED)
  const batch = await tx.attendanceImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true },
  });

  if (!batch) throw new ResolveServiceError('NOT_FOUND', `Batch ${batchId} không tìm thấy`);
  if (batch.status === 'COMMITTED') {
    throw new ResolveServiceError('INVALID_STATUS', 'Batch đã commit — không thể resolve');
  }

  // Verify all rows exist and are resolvable
  const rowIds = resolves.map(r => r.rowId);
  const rows = await tx.attendanceImportRow.findMany({
    where: { id: { in: rowIds }, batchId },
    select: { id: true, status: true },
  });

  if (rows.length !== rowIds.length) {
    throw new ResolveServiceError('NOT_FOUND', 'Một số row không tìm thấy trong batch');
  }

  for (const row of rows) {
    if (row.status === 'COMMITTED' || row.status === 'MATCHED') {
      throw new ResolveServiceError(
        'ALREADY_RESOLVED',
        `Row ${row.id} đã được resolve hoặc commit`,
      );
    }
  }

  // Update rows
  await tx.attendanceImportRow.updateMany({
    where: { id: { in: rowIds }, batchId },
    data: resolves.reduce((acc, r, i) => {
      acc[`_p${i}`] = r.matchedWorkerId;
      return acc;
    }, {} as Record<string, string>),
  });

  // Build update using raw SQL for flexibility
  let updatedCount = 0;
  for (const resolve of resolves) {
    const result = await tx.$executeRawUnsafe(
      `UPDATE attendance_import_rows
       SET matched_worker_id = $1, status = 'MATCHED', anomaly_type = NULL, anomaly_note = $2
       WHERE id = $3 AND batch_id = $4`,
      resolve.matchedWorkerId,
      resolve.note ?? null,
      resolve.rowId,
      batchId,
    );
    updatedCount += result;
  }

  // Re-count matched/unmatched after resolve
  const [matched, unmatched] = await Promise.all([
    tx.attendanceImportRow.count({ where: { batchId, status: 'MATCHED' } }),
    tx.attendanceImportRow.count({ where: { batchId, status: 'UNMATCHED' } }),
  ]);

  await tx.attendanceImportBatch.update({
    where: { id: batchId },
    data: { matchedRows: matched, unmatchedRows: unmatched },
  });

  // Audit log
  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'AttendanceImportBatch',
    entityId: batchId,
    action: 'RESOLVE_UNMATCHED',
    reason: `${resolves.length} row(s) resolved`,
    diff: {
      before: { resolved: 0 },
      after: { resolved: resolves.length, rowIds },
    },
  });

  await enqueueOutbox(tx, {
    eventType: 'UnmatchedRowsResolved',
    aggregateId: batchId,
    payload: {
      batchId,
      resolvedCount: resolves.length,
      resolvedBy: ctx.userId,
    },
  });

  return { updatedCount };
}

// ─── Timesheet Adjustment ──────────────────────────────────────────────────────

/**
 * Tạo TimesheetAdjustment cho kỳ công.
 *
 * ADR-013: LOCKED bất biến — adjustments được tạo sau khi period APPROVED,
 * trước khi LOCK (pre-lock) hoặc sau khi REOPEN (post-lock).
 *
 * RQ-10: adjustment phải có reason + audit.
 */
export async function createTimesheetAdjustment(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: CreateAdjustmentInput,
) {
  // Verify period exists
  const period = await tx.timesheetPeriod.findUnique({
    where: { id: input.periodId },
    select: { id: true, status: true, month: true, year: true, version: true },
  });

  if (!period) throw new AdjustmentServiceError('NOT_FOUND', `Period ${input.periodId} không tìm thấy`);

  // Allow adjustments for REVIEWED or APPROVED periods (pre-lock)
  // After LOCKED, period must be REOPEN'd first (F21)
  const allowStatuses = new Set(['PENDING', 'REVIEWED', 'APPROVED']);
  if (!allowStatuses.has(period.status)) {
    throw new AdjustmentServiceError(
      'INVALID_STATUS',
      `Period ở trạng thái ${period.status} — không thể tạo adjustment. Cần reopen kỳ trước.`,
    );
  }

  // RQ-10: reason bắt buộc
  if (!input.reason || input.reason.trim().length === 0) {
    throw new AdjustmentServiceError('MISSING_REASON', 'Adjustment phải có lý do (reason)');
  }

  const adjustment = await tx.timesheetAdjustment.create({
    data: {
      periodId: input.periodId,
      workerId: input.workerId,
      workDate: input.workDate ? new Date(input.workDate) : null,
      deltaHours: input.deltaHours,
      reason: input.reason.trim(),
      createdBy: ctx.userId,
    },
  });

  // Audit log
  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: 'TimesheetAdjustment',
    entityId: adjustment.id,
    action: 'CREATE',
    reason: input.reason,
    diff: {
      before: {},
      after: {
        periodId: input.periodId,
        workerId: input.workerId,
        deltaHours: input.deltaHours,
        reason: input.reason,
      },
    },
  });

  await enqueueOutbox(tx, {
    eventType: 'TimesheetAdjustmentCreated',
    aggregateId: adjustment.id,
    payload: {
      adjustmentId: adjustment.id,
      periodId: input.periodId,
      workerId: input.workerId,
      deltaHours: input.deltaHours,
      reason: input.reason,
      createdBy: ctx.userId,
    },
  });

  return adjustment;
}

/**
 * List adjustments cho một period.
 */
export async function listTimesheetAdjustments(
  tx: Prisma.TransactionClient,
  periodId: string,
) {
  return tx.timesheetAdjustment.findMany({
    where: { periodId },
    orderBy: { createdAt: 'desc' },
  });
}
