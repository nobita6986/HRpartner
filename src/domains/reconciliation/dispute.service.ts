/**
 * Dispute Service + Cron AUTO-CONFIRMED -- Phase 4 Slice 4C STEP-15 (RQ-13, RQ-15).
 *
 * DEC-07:
 *   - Statement SM DRAFT -> SENT -> DISPUTED -> CONFIRMED -> LOCKED -> PAID
 *   - dispute_count <= 2 (vong 3 -> 409)
 *   - confirm_deadline_at = sentAt + 3 ngay -> AUTO-CONFIRMED (cron fake timer)
 *   - FORCE LOCK: ADMIN + CAN_FORCE_LOCK_STATEMENT
 *   - LOCKED bat bien (ADR-013) -> moi sua qua adjustment line
 *
 * ADR-013: Locked immutability.
 * DEC-13/F21: sau LOCKED muon sua qua adjustment line moi (StatementAdjustment).
 * D16-b: cron in-process + handler 1 chung outbox.
 */

import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatementKind = 'VENDOR' | 'CLIENT';

export interface DisputeInput {
  statementId: string;
  statementKind: StatementKind;
  reason: string;
  attachmentUrl?: string;
}

export interface SendInput {
  statementId: string;
  statementKind: StatementKind;
  // For testing: override deadline (vi SLA 3 ngay qua lau)
  deadlineDays?: number;
}

export class DisputeServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'PERMISSION_DENIED'
      | 'MAX_DISPUTES'
      | 'ALREADY_LOCKED',
    message: string,
  ) {
    super(message);
    this.name = 'DisputeServiceError';
  }
}

// ─── SM transitions ───────────────────────────────────────────────────────────

/**
 * SENT -- move DRAFT -> SENT. Set sentAt + confirmDeadlineAt = +3 ngay.
 */
export async function sendStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: SendInput,
) {
  const stmt = await loadStatement(tx, input.statementId, input.statementKind);
  if (!stmt) throw new DisputeServiceError('NOT_FOUND', `${input.statementKind}Statement ${input.statementId} khong tim thay`);
  if (stmt.status !== 'DRAFT') {
    throw new DisputeServiceError(
      'INVALID_STATE',
      `Statement ${stmt.status} khong the SENT (can DRAFT)`,
    );
  }

  const days = input.deadlineDays ?? 3;
  const sentAt = new Date();
  const deadline = new Date(sentAt.getTime() + days * 24 * 60 * 60 * 1000);

  // Guarded write (DEC-08): ràng buộc state DRAFT TẠI LÚC WRITE. Concurrent → một winner.
  const count = await guardedUpdate(
    tx,
    input.statementKind,
    { id: input.statementId, status: 'DRAFT' },
    { status: 'SENT', sentAt, confirmDeadlineAt: deadline },
  );
  if (count === 0) {
    throw new DisputeServiceError('INVALID_STATE', 'Statement bi thay doi dong thoi (khong con DRAFT)');
  }
  const updated = await readStatementOrThrow(tx, input.statementKind, input.statementId);

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: input.statementKind === 'VENDOR' ? 'VendorStatement' : 'ClientStatement',
    entityId: input.statementId,
    action: 'SEND',
    diff: { before: { status: 'DRAFT' }, after: { status: 'SENT', sentAt, confirmDeadlineAt: deadline } },
  });

  await enqueueOutbox(tx, {
    eventType: `${input.statementKind}StatementSent`,
    aggregateId: input.statementId,
    payload: { statementId: input.statementId, sentAt, confirmDeadlineAt: deadline },
  });

  return updated;
}

/**
 * DISPUTE -- vendor/client dispute.
 * - SENT -> DISPUTED, dispute_count++
 * - dispute_count > 2 -> 409 MAX_DISPUTES
 */
export async function disputeStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  input: DisputeInput,
) {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new DisputeServiceError('INVALID_STATE', 'Ly do dispute bat buoc (RQ-13)');
  }

  const stmt = await loadStatement(tx, input.statementId, input.statementKind);
  if (!stmt) throw new DisputeServiceError('NOT_FOUND', `${input.statementKind}Statement ${input.statementId} khong tim thay`);
  if (stmt.status !== 'SENT' && stmt.status !== 'DISPUTED') {
    throw new DisputeServiceError(
      'INVALID_STATE',
      `Statement ${stmt.status} khong the dispute (can SENT/DISPUTED)`,
    );
  }

  // Max 2 vong (DEC-07)
  if (stmt.disputeCount >= 2) {
    throw new DisputeServiceError(
      'MAX_DISPUTES',
      `Statement da dispute ${stmt.disputeCount} lan (max 2 vong) -- can FORCE LOCK hoac CONFIRM`,
    );
  }

  // Guarded write (DEC-08): state∈{SENT,DISPUTED} AND disputeCount<2 TẠI LÚC WRITE.
  const count = await guardedUpdate(
    tx,
    input.statementKind,
    { id: input.statementId, status: { in: ['SENT', 'DISPUTED'] }, disputeCount: { lt: 2 } },
    { status: 'DISPUTED', disputeCount: { increment: 1 } },
  );
  if (count === 0) {
    // Loser: phân loại lại trạng thái đã commit (concurrent winner đã đổi state/count).
    const cur = await loadStatement(tx, input.statementId, input.statementKind);
    if (!cur) throw new DisputeServiceError('NOT_FOUND', `${input.statementKind}Statement ${input.statementId} khong tim thay`);
    if (cur.disputeCount >= 2) throw new DisputeServiceError('MAX_DISPUTES', `Statement da dispute ${cur.disputeCount} lan (max 2 vong)`);
    throw new DisputeServiceError('INVALID_STATE', `Statement ${cur.status} khong the dispute (bi thay doi dong thoi)`);
  }
  const updated = await readStatementOrThrow(tx, input.statementKind, input.statementId);

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: input.statementKind === 'VENDOR' ? 'VendorStatement' : 'ClientStatement',
    entityId: input.statementId,
    action: 'DISPUTE',
    reason: input.reason,
    diff: { before: { status: stmt.status, disputeCount: stmt.disputeCount }, after: { status: 'DISPUTED', disputeCount: updated.disputeCount } },
  });

  await enqueueOutbox(tx, {
    eventType: `${input.statementKind}StatementDisputed`,
    aggregateId: input.statementId,
    payload: { statementId: input.statementId, reason: input.reason, attachmentUrl: input.attachmentUrl ?? null },
  });

  return updated;
}

/**
 * CONFIRM -- vendor/client accept. DISPUTED -> CONFIRMED.
 */
export async function confirmStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  statementId: string,
  statementKind: StatementKind,
) {
  const stmt = await loadStatement(tx, statementId, statementKind);
  if (!stmt) throw new DisputeServiceError('NOT_FOUND', `${statementKind}Statement ${statementId} khong tim thay`);
  if (stmt.status !== 'SENT' && stmt.status !== 'DISPUTED') {
    throw new DisputeServiceError(
      'INVALID_STATE',
      `Statement ${stmt.status} khong the CONFIRM (can SENT/DISPUTED)`,
    );
  }

  // Guarded write (DEC-08): state∈{SENT,DISPUTED} TẠI LÚC WRITE.
  const count = await guardedUpdate(
    tx,
    statementKind,
    { id: statementId, status: { in: ['SENT', 'DISPUTED'] } },
    { status: 'CONFIRMED' },
  );
  if (count === 0) {
    throw new DisputeServiceError('INVALID_STATE', 'Statement bi thay doi dong thoi (khong con SENT/DISPUTED)');
  }
  const updated = await readStatementOrThrow(tx, statementKind, statementId);

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: statementKind === 'VENDOR' ? 'VendorStatement' : 'ClientStatement',
    entityId: statementId,
    action: 'CONFIRM',
    diff: { before: { status: stmt.status }, after: { status: 'CONFIRMED' } },
  });

  await enqueueOutbox(tx, {
    eventType: `${statementKind}StatementConfirmed`,
    aggregateId: statementId,
    payload: { statementId },
  });

  return updated;
}

/**
 * LOCK -- normal lock. CONFIRMED -> LOCKED.
 * ADR-013: LOCKED bat bien, moi sua qua adjustment line.
 */
export async function lockStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  statementId: string,
  statementKind: StatementKind,
) {
  const stmt = await loadStatement(tx, statementId, statementKind);
  if (!stmt) throw new DisputeServiceError('NOT_FOUND', `${statementKind}Statement ${statementId} khong tim thay`);
  if (stmt.status !== 'CONFIRMED') {
    throw new DisputeServiceError(
      'INVALID_STATE',
      `Statement ${stmt.status} khong the LOCK (can CONFIRMED)`,
    );
  }

  // Guarded write (DEC-08): state CONFIRMED TẠI LÚC WRITE.
  const count = await guardedUpdate(
    tx,
    statementKind,
    { id: statementId, status: 'CONFIRMED' },
    { status: 'LOCKED', lockedAt: new Date() },
  );
  if (count === 0) {
    throw new DisputeServiceError('INVALID_STATE', 'Statement bi thay doi dong thoi (khong con CONFIRMED)');
  }
  const updated = await readStatementOrThrow(tx, statementKind, statementId);

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: statementKind === 'VENDOR' ? 'VendorStatement' : 'ClientStatement',
    entityId: statementId,
    action: 'LOCK',
    diff: { before: { status: 'CONFIRMED' }, after: { status: 'LOCKED', lockedAt: updated.lockedAt } },
  });

  return updated;
}

/**
 * FORCE LOCK -- can CAN_FORCE_LOCK_STATEMENT. Skip CONFIRMED check, tu SENT/DISPUTED -> LOCKED.
 * Dung cho reconciliation cuoi ky khi vendor khong respond (qua SLA) hoac max disputes.
 */
export async function forceLockStatement(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  statementId: string,
  statementKind: StatementKind,
) {
  if (!(await hasPermission({ userId: ctx.userId, role: ctx.role }, 'CAN_FORCE_LOCK_STATEMENT'))) {
    throw new DisputeServiceError(
      'PERMISSION_DENIED',
      `Role ${ctx.role} khong co CAN_FORCE_LOCK_STATEMENT`,
    );
  }

  const stmt = await loadStatement(tx, statementId, statementKind);
  if (!stmt) throw new DisputeServiceError('NOT_FOUND', `${statementKind}Statement ${statementId} khong tim thay`);
  if (stmt.status === 'LOCKED' || stmt.status === 'PAID') {
    throw new DisputeServiceError(
      'ALREADY_LOCKED',
      `Statement ${stmt.status} da LOCKED roi`,
    );
  }
  if (stmt.status === 'DRAFT') {
    throw new DisputeServiceError(
      'INVALID_STATE',
      'Statement DRAFT chua gui -- can SENT truoc khi FORCE LOCK',
    );
  }

  // Guarded write (DEC-08): state∈{SENT,DISPUTED,CONFIRMED} TẠI LÚC WRITE (bỏ qua CONFIRMED-only).
  const count = await guardedUpdate(
    tx,
    statementKind,
    { id: statementId, status: { in: ['SENT', 'DISPUTED', 'CONFIRMED'] } },
    { status: 'LOCKED', lockedAt: new Date() },
  );
  if (count === 0) {
    // Loser: phân loại lại trạng thái đã commit.
    const cur = await loadStatement(tx, statementId, statementKind);
    if (!cur) throw new DisputeServiceError('NOT_FOUND', `${statementKind}Statement ${statementId} khong tim thay`);
    if (cur.status === 'LOCKED' || cur.status === 'PAID') throw new DisputeServiceError('ALREADY_LOCKED', `Statement ${cur.status} da LOCKED roi`);
    throw new DisputeServiceError('INVALID_STATE', `Statement ${cur.status} khong the FORCE LOCK (bi thay doi dong thoi)`);
  }
  const updated = await readStatementOrThrow(tx, statementKind, statementId);

  await writeAuditLog({
    prisma: tx,
    actor: { id: ctx.userId, role: ctx.role },
    entityType: statementKind === 'VENDOR' ? 'VendorStatement' : 'ClientStatement',
    entityId: statementId,
    action: 'FORCE_LOCK',
    reason: 'Force lock: SLA qua hoac max disputes',
    diff: { before: { status: stmt.status }, after: { status: 'LOCKED', lockedAt: updated.lockedAt } },
  });

  await enqueueOutbox(tx, {
    eventType: `${statementKind}StatementForceLocked`,
    aggregateId: statementId,
    payload: { statementId, reason: 'FORCE_LOCK', lockedAt: updated.lockedAt },
  });

  return updated;
}

/**
 * Cron AUTO-CONFIRMED -- scan statements SENT qua deadline -> AUTO-CONFIRMED.
 * D16-b: 1 cron handler in-process, idempotent.
 *
 * Note: This is "fake timer" -- caller tu goi voi now tuong lai trong test.
 */
export async function autoConfirmExpiredStatements(
  tx: Prisma.TransactionClient,
  now: Date = new Date(),
): Promise<{ vendorConfirmed: number; clientConfirmed: number }> {
  const vendorExpired = await tx.vendorStatement.findMany({
    where: {
      status: 'SENT',
      confirmDeadlineAt: { lt: now },
    },
    select: { id: true },
  });

  const clientExpired = await tx.clientStatement.findMany({
    where: {
      status: 'SENT',
      confirmDeadlineAt: { lt: now },
    },
    select: { id: true },
  });

  let vendorConfirmed = 0;
  for (const v of vendorExpired) {
    // Guarded (DEC-08/RQ-07): chỉ SENT mới AUTO-CONFIRMED. Nếu vendor vừa confirm/dispute
    // (không còn SENT) → count=0, KHÔNG clobber và KHÔNG ghi audit thừa (exactly-once).
    const res = await tx.vendorStatement.updateMany({
      where: { id: v.id, status: 'SENT' },
      data: { status: 'CONFIRMED' },
    });
    if (res.count === 0) continue;
    await writeAuditLog({
      prisma: tx,
      actor: { id: 'system:cron', role: 'SYSTEM' },
      entityType: 'VendorStatement',
      entityId: v.id,
      action: 'AUTO_CONFIRMED',
      reason: 'SLA 3 ngay qua -- AUTO-CONFIRMED',
      diff: { before: { status: 'SENT' }, after: { status: 'CONFIRMED' } },
    });
    vendorConfirmed++;
  }

  let clientConfirmed = 0;
  for (const c of clientExpired) {
    const res = await tx.clientStatement.updateMany({
      where: { id: c.id, status: 'SENT' },
      data: { status: 'CONFIRMED' },
    });
    if (res.count === 0) continue;
    await writeAuditLog({
      prisma: tx,
      actor: { id: 'system:cron', role: 'SYSTEM' },
      entityType: 'ClientStatement',
      entityId: c.id,
      action: 'AUTO_CONFIRMED',
      reason: 'SLA 3 ngay qua -- AUTO-CONFIRMED',
      diff: { before: { status: 'SENT' }, after: { status: 'CONFIRMED' } },
    });
    clientConfirmed++;
  }

  return { vendorConfirmed, clientConfirmed };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadStatement(
  tx: Prisma.TransactionClient,
  id: string,
  kind: StatementKind,
): Promise<{ id: string; status: string; disputeCount: number; lockedAt: Date | null } | null> {
  if (kind === 'VENDOR') {
    const s = await tx.vendorStatement.findUnique({
      where: { id },
      select: { id: true, status: true, disputeCount: true, lockedAt: true },
    });
    return s;
  }
  const s = await tx.clientStatement.findUnique({
    where: { id },
    select: { id: true, status: true, disputeCount: true, lockedAt: true },
  });
  return s;
}

/** Guarded conditional write (DEC-08): số row khớp precondition TẠI LÚC WRITE (0 hoặc 1). */
async function guardedUpdate(
  tx: Prisma.TransactionClient,
  kind: StatementKind,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<number> {
  if (kind === 'VENDOR') {
    const res = await tx.vendorStatement.updateMany({ where: where as any, data: data as any });
    return res.count;
  }
  const res = await tx.clientStatement.updateMany({ where: where as any, data: data as any });
  return res.count;
}

/** Đọc lại full row đã commit trong tx (giữ lock) → response giữ nguyên shape (DEC-10). */
async function readStatementOrThrow(
  tx: Prisma.TransactionClient,
  kind: StatementKind,
  id: string,
) {
  const row =
    kind === 'VENDOR'
      ? await tx.vendorStatement.findUnique({ where: { id } })
      : await tx.clientStatement.findUnique({ where: { id } });
  if (!row) throw new DisputeServiceError('NOT_FOUND', `${kind}Statement ${id} khong tim thay`);
  return row;
}