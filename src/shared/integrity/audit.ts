/**
 * Audit writer (Phase 3 / RQ-03 / DEC-03 / PHASE_KHOAHOC DoD).
 *
 * Chu�n hoá 5 thành phần cho AuditLog:
 *   1. actorId + actorRole (ai làm)
 *   2. reason (lý do — Text)
 *   3. ipAddress + userAgent (từ SessionUser)
 *   4. diff { before, after } JSON (state trước/sau)
 *   5. metadata tuỳ chọn (không nhét PII/IP ở đây — đã có cột riêng)
 *
 * Refactor: `ticket.service.writeAuditLog` private chuyển sang helper này.
 * Mọi mutation ticket (create/approve/reject/cancel/pay) dùng writer này.
 */

import {
  Prisma,
  type PrismaClient,
  type AuditLog,
} from '@prisma/client';

export type AuditPrisma = PrismaClient | Prisma.TransactionClient;

export interface AuditActor {
  id: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  name?: string | null;
}

export interface AuditDiff {
  before: unknown;
  after: unknown;
}

export interface AuditWriteInput {
  prisma: AuditPrisma;
  actor: AuditActor;
  entityType: string;
  entityId: string;
  action: string;
  diff: AuditDiff;
  /** Lý do (vd `note` khi approve, `reason` khi reject, `input.description` khi create). */
  reason?: string | null;
  metadata?: Record<string, unknown>;
  /** Tuỳ chọn: tiêm custom audit logger (vd ghi thêm Sentry/Datadog). */
  customLogger?: AuditLogger;
}

export type AuditLogger = (
  prisma: AuditPrisma,
  row: Prisma.AuditLogCreateInput,
) => Promise<AuditLog>;

export async function writeAuditLog(input: AuditWriteInput): Promise<AuditLog> {
  const row: Prisma.AuditLogCreateInput = {
    actorId: input.actor.id,
    actorRole: input.actor.role,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    diff: input.diff as unknown as Prisma.InputJsonValue,
    metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    reason: input.reason ?? null,
    ipAddress: input.actor.ipAddress ?? null,
    userAgent: input.actor.userAgent ?? null,
  };

  if (input.customLogger) {
    return input.customLogger(input.prisma, row);
  }

  return input.prisma.auditLog.create({ data: row });
}
