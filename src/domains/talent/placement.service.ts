/**
 * placement.service.ts — N3 (V6 Phase 1+) authority commands (DEC-05..DEC-12).
 *
 * 5 commands:
 *   - createPlacement       → SELECTED
 *   - confirmPlacement      → SELECTED → CONFIRMED
 *   - markPlacementEffective → CONFIRMED → EFFECTIVE (chỉ CLIENT_MANAGED — DEC-07)
 *   - failPlacement         → SELECTED | CONFIRMED → FAILED
 *   - cancelPlacement       → SELECTED | CONFIRMED → CANCELLED
 *
 * Quy tắc chung (DEC-12):
 *   - Mỗi command chạy trong transaction (caller quản lý boundary qua withDbContext).
 *   - createPlacement chống race nhờ DB-level unique partial index
 *     `placements_active_unique` (DEC-04a). Bắt P2002 → trả placement hiện tại.
 *   - Transition commands dùng conditional UPDATE với status guard
 *     (DEC-12: không read-modify-write trong app).
 *   - HRP-managed: markPlacementEffective REJECT (DEC-07). Atomic workforce bridge thuộc N4.
 *   - Client-managed EFFECTIVE: yêu cầu evidence (clientAcknowledgedAt + by + ref).
 *
 * Idempotency (DEC-09):
 *   - SELECTED: theo (laborProfileId, placementCaseId, jobOpeningId) qua partial unique index.
 *   - Các command khác: theo placementId qua conditional UPDATE (same status → no-op).
 */

import { Prisma, type PlacementStatus, type ServiceModel } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import {
  InvalidStateTransitionError,
  PlacementIdempotencyConflictError,
  PlacementNotFoundError,
  PlacementValidationError,
} from './placement.errors';
import { canTransition, isActivePlacement, isTerminalPlacement } from './placement.lifecycle';
import { resolveClientCompanyIdForJobOpening, assertClassifiedJobOpening } from './placement.resolution';

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

export interface CreatePlacementInput {
  laborProfileId: string;
  placementCaseId: string;
  jobOpeningId: string;
  /** Caller đã verify quyền CAN_MANAGE_TALENT_CASE hoặc ADMIN/HR_MANAGER. */
  actorId: string;
  sourceCandidateSubmissionId?: string;
}

export interface CreatePlacementResult {
  placementId: string;
  status: PlacementStatus;
  serviceModelSnapshot: ServiceModel;
  clientCompanyId: string;
  projectId: string;
  /** True nếu trả về placement đã có sẵn (idempotent replay — DEC-09). */
  replayed: boolean;
}

export interface TransitionPlacementInput {
  placementId: string;
  actorId: string;
  /** Chỉ dùng cho markPlacementEffective — DEC-08. */
  evidence?: PlacementEffectivenessEvidence;
}

export interface PlacementEffectivenessEvidence {
  clientAcknowledgedAt: Date;
  clientAcknowledgedByUserId: string;
  acknowledgementRef: string;
}

export interface TransitionPlacementResult {
  placementId: string;
  status: PlacementStatus;
  /** True nếu đã ở target state từ trước (idempotent no-op — DEC-09). */
  replayed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// createPlacement — SELECTED (DEC-04a, DEC-06, DEC-09, DEC-10)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tạo Placement SELECTED. Race-safe nhờ partial unique index.
 *
 * Retry trong khi Placement còn SELECTED/CONFIRMED → trả placement hiện tại (P2002 path).
 * Sau FAILED/CANCELLED → INSERT mới thành công (index giải phóng slot).
 */
export async function createPlacement(
  tx: PrismaTypes.TransactionClient,
  input: CreatePlacementInput,
): Promise<CreatePlacementResult> {
  const jobOpening = await tx.jobOpening.findUnique({
    where: { id: input.jobOpeningId },
    select: { id: true, staffingOrderId: true, serviceModel: true },
  });
  if (!jobOpening) {
    throw new PlacementValidationError(`JobOpening ${input.jobOpeningId} không tồn tại`, {
      jobOpeningId: input.jobOpeningId,
    });
  }
  assertClassifiedJobOpening(jobOpening);

  const resolved = await resolveClientCompanyIdForJobOpening(tx, jobOpening);

  const existing = await findActivePlacement(tx, {
    placementCaseId: input.placementCaseId,
    jobOpeningId: input.jobOpeningId,
  });
  if (existing) {
    return {
      placementId: existing.id,
      status: existing.status,
      serviceModelSnapshot: existing.serviceModelSnapshot,
      clientCompanyId: existing.clientCompanyId,
      projectId: existing.projectId,
      replayed: true,
    };
  }

  // SAVEPOINT/ROLLBACK TO pattern (N1 round-5 verified) — catch P2002 mà không phá transaction.
  const sp = `n3pl_insert_${Math.random().toString(36).slice(2, 10)}`;
  await tx.$executeRawUnsafe(`SAVEPOINT ${sp}`);
  try {
    const created = await tx.placement.create({
      data: {
        placementCaseId: input.placementCaseId,
        laborProfileId: input.laborProfileId,
        jobOpeningId: input.jobOpeningId,
        clientCompanyId: resolved.clientCompanyId,
        projectId: resolved.projectId,
        serviceModelSnapshot: resolved.serviceModel,
        status: 'SELECTED',
        selectedAt: new Date(),
        sourceCandidateSubmissionId: input.sourceCandidateSubmissionId,
        createdByUserId: input.actorId,
        version: 1,
      },
      select: {
        id: true,
        status: true,
        serviceModelSnapshot: true,
        clientCompanyId: true,
        projectId: true,
      },
    });
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
    return {
      placementId: created.id,
      status: created.status,
      serviceModelSnapshot: created.serviceModelSnapshot!,
      clientCompanyId: created.clientCompanyId!,
      projectId: created.projectId!,
      replayed: false,
    };
  } catch (err) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`);
    const isUniqueViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
      (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002');
    if (isUniqueViolation) {
      const winner = await findActivePlacement(tx, {
        placementCaseId: input.placementCaseId,
        jobOpeningId: input.jobOpeningId,
      });
      if (winner) {
        return {
          placementId: winner.id,
          status: winner.status,
          serviceModelSnapshot: winner.serviceModelSnapshot,
          clientCompanyId: winner.clientCompanyId,
          projectId: winner.projectId,
          replayed: true,
        };
      }
      throw new PlacementIdempotencyConflictError(
        'P2002 trên unique partial index nhưng không tìm thấy active placement — bất thường',
      );
    }
    throw err;
  }
}

interface ActivePlacementSummary {
  id: string;
  status: PlacementStatus;
  serviceModelSnapshot: ServiceModel;
  clientCompanyId: string;
  projectId: string;
}

async function findActivePlacement(
  tx: PrismaTypes.TransactionClient,
  filter: { placementCaseId: string; jobOpeningId: string },
): Promise<ActivePlacementSummary | null> {
  const row = await tx.placement.findFirst({
    where: {
      placementCaseId: filter.placementCaseId,
      jobOpeningId: filter.jobOpeningId,
      status: { in: ['SELECTED', 'CONFIRMED'] },
    },
    select: {
      id: true,
      status: true,
      serviceModelSnapshot: true,
      clientCompanyId: true,
      projectId: true,
    },
  });
  if (!row) return null;
  // Service layer caller (createPlacement) đã qua resolveClientCompanyIdForJobOpening;
  // SELECTED placements luôn có clientCompanyId/projectId/serviceModelSnapshot (đã set khi INSERT).
  // Cast là an toàn vì DB-level constraint đảm bảo.
  return {
    id: row.id,
    status: row.status,
    serviceModelSnapshot: row.serviceModelSnapshot as ServiceModel,
    clientCompanyId: row.clientCompanyId as string,
    projectId: row.projectId as string,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Transition helpers (DEC-05, DEC-07, DEC-08, DEC-12)
// ═══════════════════════════════════════════════════════════════════════════

interface PlacementTransitionRow {
  id: string;
  status: PlacementStatus;
  serviceModelSnapshot: ServiceModel | null;
  clientCompanyId: string | null;
  projectId: string | null;
}

async function findPlacementForTransition(
  tx: PrismaTypes.TransactionClient,
  placementId: string,
): Promise<PlacementTransitionRow> {
  const row = await tx.placement.findUnique({
    where: { id: placementId },
    select: {
      id: true,
      status: true,
      serviceModelSnapshot: true,
      clientCompanyId: true,
      projectId: true,
    },
  });
  if (!row) throw new PlacementNotFoundError(placementId);
  return row;
}

interface RunTransitionInput {
  tx: PrismaTypes.TransactionClient;
  placementId: string;
  actorId: string;
  to: PlacementStatus;
}

interface RunTransitionContext {
  managementMode: 'HRP_MANAGED' | 'CLIENT_MANAGED' | null;
  evidence?: PlacementEffectivenessEvidence;
}

type RunTransitionContextInput = Partial<RunTransitionContext>;

async function runTransition(
  args: RunTransitionInput,
  ctx: RunTransitionContextInput,
): Promise<TransitionPlacementResult> {
  const row = await findPlacementForTransition(args.tx, args.placementId);

  // Same state → idempotent no-op.
  if (row.status === args.to) {
    return { placementId: row.id, status: row.status, replayed: true };
  }

  const managementMode: 'HRP_MANAGED' | 'CLIENT_MANAGED' | null = row.serviceModelSnapshot
    ? deriveModeFromSnapshot(row.serviceModelSnapshot)
    : ctx.managementMode ?? null;

  const check = canTransition(row.status, args.to, managementMode);
  if (!check.ok) {
    if (check.reason === 'HRP_EFFECTIVE_FORBIDDEN') {
      throw new PlacementValidationError(
        'HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4',
        { placementId: row.id, from: row.status, to: args.to },
      );
    }
    throw new InvalidStateTransitionError(
      `Transition không hợp lệ: ${row.status} → ${args.to} (${check.reason})`,
      row.status,
      args.to,
      check.reason,
    );
  }

  if (args.to === 'EFFECTIVE' && managementMode === 'CLIENT_MANAGED') {
    if (!ctx.evidence) {
      throw new PlacementValidationError(
        'Client-managed EFFECTIVE yêu cầu evidence (clientAcknowledgedAt + clientAcknowledgedByUserId + acknowledgementRef)',
        { placementId: row.id },
      );
    }
    if (!ctx.evidence.clientAcknowledgedAt || !ctx.evidence.clientAcknowledgedByUserId || !ctx.evidence.acknowledgementRef) {
      throw new PlacementValidationError(
        'Evidence EFFECTIVE thiếu field bắt buộc',
        { placementId: row.id, evidence: ctx.evidence },
      );
    }
  }

  // Conditional UPDATE — database-level invariant (DEC-12).
  const now = new Date();
  const updateData: Prisma.PlacementUpdateInput = { status: args.to, version: { increment: 1 } };
  if (args.to === 'CONFIRMED') updateData.confirmedAt = now;
  if (args.to === 'EFFECTIVE') updateData.effectiveAt = now;
  if (args.to === 'FAILED' || args.to === 'CANCELLED') {
    updateData.failureReason = `Marked ${args.to} by ${args.actorId} at ${now.toISOString()}`;
  }

  const result = await args.tx.placement.updateMany({
    where: { id: row.id, status: row.status }, // status guard
    data: updateData,
  });

  if (result.count === 0) {
    // Status changed by concurrent command → idempotent no-op cho caller.
    const refreshed = await findPlacementForTransition(args.tx, row.id);
    return { placementId: refreshed.id, status: refreshed.status, replayed: true };
  }

  return { placementId: row.id, status: args.to, replayed: false };
}

function deriveModeFromSnapshot(snapshot: ServiceModel): 'HRP_MANAGED' | 'CLIENT_MANAGED' {
  if (snapshot === 'STAFFING_SUPPLY' || snapshot === 'LABOR_LEASING') return 'HRP_MANAGED';
  return 'CLIENT_MANAGED';
}

// ═══════════════════════════════════════════════════════════════════════════
// Public transition commands
// ═══════════════════════════════════════════════════════════════════════════

export function confirmPlacement(tx: PrismaTypes.TransactionClient, input: TransitionPlacementInput) {
  return runTransition({ tx, placementId: input.placementId, actorId: input.actorId, to: 'CONFIRMED' }, {});
}

export function markPlacementEffective(
  tx: PrismaTypes.TransactionClient,
  input: TransitionPlacementInput,
) {
  return runTransition(
    { tx, placementId: input.placementId, actorId: input.actorId, to: 'EFFECTIVE' },
    { managementMode: null, evidence: input.evidence },
  );
}

export function failPlacement(tx: PrismaTypes.TransactionClient, input: TransitionPlacementInput) {
  return runTransition({ tx, placementId: input.placementId, actorId: input.actorId, to: 'FAILED' }, {});
}

export function cancelPlacement(tx: PrismaTypes.TransactionClient, input: TransitionPlacementInput) {
  return runTransition({ tx, placementId: input.placementId, actorId: input.actorId, to: 'CANCELLED' }, {});
}

/** Helper export để service khác (vd PlacementCase close) kiểm tra placement đã terminal. */
export { isActivePlacement, isTerminalPlacement };
