/**
 * Transfer service — Phase 4 slice 4A STEP-03 (RQ-02).
 *
 * DEC-08: Guided Transfer §9.9 — chuyển worker giữa project.
 *
 * Bất biến:
 *   (G14) 1 worker chỉ có 1 assignment ACTIVE tại 1 thời điểm (nửa mở [from, to)).
 *   (O9)   Project.filled = COUNT(assignment.ACTIVE).
 *
 * Thuật toán (trong advisory lock):
 *   1. SELECT assignments ACTIVE của worker (có advisory lock rồi → consistent).
 *   2. Nếu count != 1 → rollback (bất biến vi phạm).
 *   3. UPDATE old assignment: status='TRANSFERRED', validTo=transferDate.
 *   4. UPDATE project_A: filled -= 1.
 *   5. INSERT new assignment: status='ACTIVE', validFrom=transferDate.
 *   6. UPDATE project_B: filled += 1.
 *   7. COMMIT.
 *
 * Advisory lock: pg_advisory_xact_lock(hashint64(hashtext(workerId))).
 * Không await DB I/O sau lock — tất cả trong 1 tx.
 *
 * Cấm await DB I/O ngoài advisory lock.
 */

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferWorkerInput {
  workerId: string;
  fromProjectId: string;
  toProjectId: string;
  transferDate: string; // ISO date string
  /** Vị trí tại project mới — slot.id hoặc ad-hoc positionCode */
  positionCode?: string;
  positionTitle?: string;
  transferReason?: string;
}

export interface TransferResult {
  oldAssignmentId: string;
  newAssignmentId: string;
  fromProjectId: string;
  toProjectId: string;
  workerId: string;
  transferDate: string;
  // AFF-04: inherited referrer identity (server-derived from canonical accepted
  // SourceClaim). null for HRP_DIRECT / VENDOR_SUPPLIED claims.
  referrerId: string | null;
  sourceClaimId: string | null;
  sourceClaimType: string | null;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class TransferServiceError extends Error {
  constructor(
    public readonly code:
      | 'NO_ACTIVE_ASSIGNMENT'
      | 'MULTIPLE_ACTIVE_ASSIGNMENTS'
      | 'SAME_PROJECT'
      | 'WORKER_NOT_FOUND'
      | 'PERMISSION_DENIED'
      | 'PROJECT_QUOTA_FULL'
      | 'INTERNAL',
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'TransferServiceError';
  }
}

// ─── Advisory lock helper ────────────────────────────────────────────────────

/**
 * Acquire advisory lock (transaction-scoped) cho workerId.
 * Chỉ gọi 1 lần đầu tiên trong transaction — không re-acquire sau I/O.
 */
async function acquireWorkerLock(tx: Prisma.TransactionClient, workerId: string): Promise<void> {
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext($1::text))`,
    workerId,
  );
}

// ─── Main transfer ────────────────────────────────────────────────────────────

/**
 * Guided Transfer worker giữa 2 project.
 *
 * Require roles: ADMIN, HR_MANAGER, HR_STAFF.
 *
 * @throws TransferServiceError tương ứng.
 * @throws Prisma unique constraint → rollback auto.
 */
export async function transferWorker(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: TransferWorkerInput,
): Promise<TransferResult> {
  // ── Permission gate ──────────────────────────────────────────────────────
  if (!['ADMIN', 'HR_MANAGER', 'HR_STAFF'].includes(ctx.role)) {
    throw new TransferServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} không có quyền transfer worker`,
    );
  }

  // ── Basic validation ─────────────────────────────────────────────────────
  if (input.fromProjectId === input.toProjectId) {
    throw new TransferServiceError(
      'SAME_PROJECT',
      'fromProjectId và toProjectId phải khác nhau',
    );
  }

  // ── Advisory lock (FIRST I/O sau validate) ─────────────────────────────
  await acquireWorkerLock(tx, input.workerId);

  // ── Check current ACTIVE assignments ──────────────────────────────────────
  const activeAssignments = await tx.$queryRawUnsafe<Array<{
    id: string;
    project_id: string;
    valid_from: Date;
  }>>(
    `SELECT id, project_id, valid_from
     FROM project_assignments
     WHERE worker_id = $1 AND status = 'ACTIVE'`,
    input.workerId,
  );

  if (activeAssignments.length === 0) {
    throw new TransferServiceError(
      'NO_ACTIVE_ASSIGNMENT',
      `Worker ${input.workerId} không có assignment ACTIVE nào — không có gì để transfer`,
    );
  }

  if (activeAssignments.length > 1) {
    // Bất biến 1-ACTIVE vi phạm — có thể do bug hoặc race condition.
    // Rollback toàn bộ transaction.
    throw new TransferServiceError(
      'MULTIPLE_ACTIVE_ASSIGNMENTS',
      `Worker ${input.workerId} có ${activeAssignments.length} assignment ACTIVE (bất biến 1-ACTIVE vi phạm) — rollback`,
    );
  }

  const oldAssignment = activeAssignments[0];

  // Verify đúng assignment đang ở fromProjectId
  if (oldAssignment.project_id !== input.fromProjectId) {
    throw new TransferServiceError(
      'NO_ACTIVE_ASSIGNMENT',
      `Worker ${input.workerId} ACTIVE ở project ${oldAssignment.project_id}, không phải ${input.fromProjectId}`,
    );
  }

  // AFF-04 (DEC-09, RQ-08): re-read the canonical accepted SourceClaim for this
  // worker UNDER THE LOCK. The referrer identity of the new assignment is
  // SERVER-DERIVED from the worker-level accepted claim — never from request
  // body, never from the old assignment's referrerId (which may have been
  // written before AFF-04 and could be stale).
  //
  // Inheritance Matrix:
  //   HRP_DIRECT (referrerUserId=null)        -> new.referrerId = null
  //   CTV_REFERRAL with referrerUserId=X      -> new.referrerId = X (inherit)
  //   CTV_REFERRAL with referrerUserId=null   -> new.referrerId = legacy CTV ctvId
  //                                             (covers pre-AFF-04 claims backfilled
  //                                              with NULL referrerUserId but valid ctvId)
  //   VENDOR_SUPPLIED                         -> new.referrerId = null (no referrer)
  //   Self-referral (canonical worker.user_id === canonical referrerUserId):
  //       classify by canonical identity (CTV/CTV) and retain provenance.
  //       AFF-04 must NOT create CommissionLedger rows — that is AFF-05B.
  const workerClaim = await tx.sourceClaim.findFirst({
    where: { workerId: input.workerId, accepted: true },
    select: {
      id: true,
      claimType: true,
      referrerUserId: true,
      ctvId: true,
      worker: { select: { userId: true } },
    },
  });
  let inheritedReferrerId: string | null = null;
  if (workerClaim) {
    if (workerClaim.referrerUserId) {
      inheritedReferrerId = workerClaim.referrerUserId;
    } else if (workerClaim.claimType === 'CTV_REFERRAL' && workerClaim.ctvId) {
      // Pre-AFF-04 accepted claim: legacy ctvId is the canonical referrer.
      // This is the LEGACY path of the Source Resolution Matrix — preserved
      // here so transfers never silently drop CTV provenance.
      inheritedReferrerId = workerClaim.ctvId;
    }
  }
  // self-referral note: if worker.worker.userId === inheritedReferrerId, the
  // worker IS the referrer. AFF-04 does not modify CommissionLedger (that is
  // AFF-05B). Self-referral stays as a normal assignment with referrerId set;
  // downstream commission code (out of scope here) will decide how to handle it.

  const transferDate = new Date(input.transferDate);

  // ── Close old assignment ──────────────────────────────────────────────────
  const oldUpdated = await tx.projectAssignment.update({
    where: { id: oldAssignment.id },
    data: {
      status: 'TRANSFERRED',
      validTo: transferDate,
      transferReason: input.transferReason ?? null,
    },
    select: { id: true, projectId: true },
  });
  void oldUpdated; // confirm

  // ── Update project A quota (filled -= 1) ────────────────────────────────
  const fromProject = await tx.project.update({
    where: { id: input.fromProjectId },
    data: { filled: { decrement: 1 } },
    select: { id: true, filled: true },
  });

  // ── Insert new assignment ───────────────────────────────────────────────
  // positionCode default = 'TRANSFERRED'
  const positionCode = input.positionCode ?? 'TRANSFER';
  const positionTitle = input.positionTitle ?? 'Nhân viên chuyển';
  const employeeCode = `${input.workerId.slice(0, 8).toUpperCase()}-T`;

  const newAssignment = await tx.projectAssignment.create({
    data: {
      workerId: input.workerId,
      projectId: input.toProjectId,
      staffingOrderId: null,
      employeeCode,
      employmentType: 'OUTSOURCED',
      validFrom: transferDate,
      status: 'ACTIVE',
      isPrimary: true,
      managerId: null,
      // AFF-04: inherit the referrer identity from the canonical accepted
      // SourceClaim — server-derived, never from request body.
      referrerId: inheritedReferrerId,
      salaryPerDayVnd: 0n,
      salaryType: 'DAILY',
    },
    select: { id: true, projectId: true },
  });

  // ── Update project B quota (filled += 1) ────────────────────────────────
  const toProject = await tx.project.update({
    where: { id: input.toProjectId },
    data: { filled: { increment: 1 } },
    select: { id: true, filled: true, quota: true },
  });

  // Check quota not exceeded
  if (toProject.filled > toProject.quota) {
    throw new TransferServiceError(
      'PROJECT_QUOTA_FULL',
      `Project ${input.toProjectId} quota=${toProject.quota} sẽ bị vượt sau transfer (filled=${toProject.filled})`,
    );
  }

  // Outbox: publish event
  await enqueueOutbox(tx, {
    eventType: 'WorkerTransferred',
    aggregateId: newAssignment.id,
    payload: {
      workerId: input.workerId,
      fromProjectId: input.fromProjectId,
      toProjectId: input.toProjectId,
      oldAssignmentId: oldAssignment.id,
      newAssignmentId: newAssignment.id,
      transferDate: input.transferDate,
      transferredBy: ctx.userId,
      // AFF-04: surface the inherited referrer identity so consumers can build
      // their own provenance view without an extra lookup. PII-free (user ID only).
      referrerId: inheritedReferrerId,
      sourceClaimId: workerClaim?.id ?? null,
      sourceClaimType: workerClaim?.claimType ?? null,
    },
  });

  return {
    oldAssignmentId: oldAssignment.id,
    newAssignmentId: newAssignment.id,
    fromProjectId: input.fromProjectId,
    toProjectId: input.toProjectId,
    workerId: input.workerId,
    transferDate: input.transferDate,
    // AFF-04: caller can verify the propagated referrer without an extra query.
    referrerId: inheritedReferrerId,
    sourceClaimId: workerClaim?.id ?? null,
    sourceClaimType: workerClaim?.claimType ?? null,
  };
}

/**
 * Bulk transfer -- N worker 1 lệnh.
 * 1 transaction độc lập mỗi worker: nếu 1 người fail, những người khác vẫn thành công (G15).
 * Mỗi worker đi qua withDbContext → transaction riêng ĐÃ set GUC (L2 RLS) rồi mới transferWorker.
 * (V5-M1-06d/STEP-04: trước đây dùng prisma.$transaction trần → thiếu applyRlsContext, bulk chạy
 *  ngoài L2. Chuyển sang withDbContext giữ nguyên per-item isolation + advisory-lock + quota + outbox.)
 */
export async function bulkTransferWorker(
  prisma: PrismaClient,
  ctx: AuthContext,
  inputs: TransferWorkerInput[],
): Promise<{
  success: TransferResult[];
  failed: Array<{ input: TransferWorkerInput; error: string }>;
}> {
  const success: TransferResult[] = [];
  const failed: Array<{ input: TransferWorkerInput; error: string }> = [];

  for (const input of inputs) {
    try {
      const result = await withDbContext(prisma, ctx, (tx) => transferWorker(tx, ctx, input));
      success.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ input, error: msg });
    }
  }

  return { success, failed };
}
