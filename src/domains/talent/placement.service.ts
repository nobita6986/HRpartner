/**
 * placement.service.ts — N3 (V6 Phase 1+) authority commands (DEC-05..DEC-12).
 *
 * 5 commands:
 *   - createPlacement       → SELECTED
 *   - confirmPlacement      → SELECTED → CONFIRMED
 *   - markPlacementEffective → CONFIRMED → EFFECTIVE (chỉ CLIENT_MANAGED — DEC-07)
 *     - Persist evidence + đóng PlacementCase SUCCESS (AC-07)
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
 *   - Client-managed EFFECTIVE: yêu cầu evidence (clientAcknowledgedAt + by + ref);
 *     evidence phải được PERSIST vào DB columns (AC-07) để audit/trace.
 *   - Client-managed EFFECTIVE SUCCESS: đóng PlacementCase với status='CLOSED' +
 *     closedAt + closeReason='PLACEMENT_EFFECTIVE'. Đây là atomic closure.
 *
 * Idempotency (DEC-09):
 *   - SELECTED: theo (laborProfileId, placementCaseId, jobOpeningId) qua partial unique index.
 *   - Các command khác: theo placementId qua conditional UPDATE (same status → no-op).
 *   - Race-loser path: trả replayed=true CHỈ KHI trạng thái mới = trạng thái caller yêu cầu
 *     (state unchanged). Nếu concurrent command đổi sang terminal khác → trả status mới,
 *     replayed=false — caller xử lý theo state hiện tại (fix round-3 review).
 */

import { Prisma, type PlacementStatus, type ServiceModel, type PlacementCaseStatus } from '@prisma/client';
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
  /** Chỉ dùng cho markPlacementEffective — DEC-08 / AC-07. */
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

/** PlacementCase ACTIVE statuses — case phải còn ACTIVE mới được tạo Placement mới. */
const ACTIVE_CASE_STATUSES: PlacementCaseStatus[] = ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'];

// ═══════════════════════════════════════════════════════════════════════════
// createPlacement — SELECTED (DEC-04a, DEC-06, DEC-09, DEC-10)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tạo Placement SELECTED. Race-safe nhờ partial unique index.
 *
 * Retry trong khi Placement còn SELECTED/CONFIRMED → trả placement hiện tại (P2002 path).
 * Sau FAILED/CANCELLED → INSERT mới thành công (index giải phóng slot).
 *
 * Round-3 review fix:
 *   - Verify PlacementCase thuộc đúng LaborProfile (N1 invariant) — REJECT nếu lệch.
 *   - Verify PlacementCase còn ACTIVE (status ∈ ACTIVE_CASE_STATUSES) — REJECT nếu CLOSED.
 */
export async function createPlacement(
  tx: PrismaTypes.TransactionClient,
  input: CreatePlacementInput,
): Promise<CreatePlacementResult> {
  // Bước 1: verify PlacementCase thuộc đúng LaborProfile + còn ACTIVE.
  const placementCase = await tx.placementCase.findUnique({
    where: { id: input.placementCaseId },
    select: { id: true, laborProfileId: true, status: true },
  });
  if (!placementCase) {
    throw new PlacementValidationError(`PlacementCase ${input.placementCaseId} không tồn tại`, {
      placementCaseId: input.placementCaseId,
    });
  }
  if (placementCase.laborProfileId !== input.laborProfileId) {
    throw new PlacementValidationError(
      `PlacementCase ${input.placementCaseId} thuộc LaborProfile khác (case.laborProfileId=${placementCase.laborProfileId}, input.laborProfileId=${input.laborProfileId}). N1 invariant: mỗi case thuộc đúng một LaborProfile.`,
      {
        placementCaseId: input.placementCaseId,
        caseLaborProfileId: placementCase.laborProfileId,
        inputLaborProfileId: input.laborProfileId,
      },
    );
  }
  if (!ACTIVE_CASE_STATUSES.includes(placementCase.status)) {
    throw new PlacementValidationError(
      `PlacementCase ${input.placementCaseId} đã CLOSED (status=${placementCase.status}). Không thể tạo Placement mới trên case đã đóng.`,
      { placementCaseId: input.placementCaseId, caseStatus: placementCase.status },
    );
  }

  // Bước 2: verify JobOpening + resolve clientCompanyId qua FK chain (DEC-06, DEC-10).
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

  // Bước 3: idempotent replay (DEC-09).
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
      // Round-3 fix: race-loser returns replayed=true CHỈ KHI current state = SELECTED
      // (caller's intent). Nếu current state = CONFIRMED (concurrent confirm đã xảy ra),
      // trả replayed=false để caller biết state đã đổi, không phải no-op INSERT.
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
          replayed: winner.status === 'SELECTED', // SELECTED = caller intent match → idempotent
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
  placementCaseId: string;
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
      placementCaseId: true,
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

  // AC-07 / DEC-08: validate evidence cho Client-managed EFFECTIVE.
  if (args.to === 'EFFECTIVE' && managementMode === 'CLIENT_MANAGED') {
    if (!ctx.evidence) {
      throw new PlacementValidationError(
        'Client-managed EFFECTIVE yêu cầu evidence (clientAcknowledgedAt + clientAcknowledgedByUserId + acknowledgementRef)',
        { placementId: row.id },
      );
    }
    if (
      !ctx.evidence.clientAcknowledgedAt ||
      !ctx.evidence.clientAcknowledgedByUserId ||
      !ctx.evidence.acknowledgementRef
    ) {
      throw new PlacementValidationError('Evidence EFFECTIVE thiếu field bắt buộc', {
        placementId: row.id,
        evidence: ctx.evidence,
      });
    }
  }

  // Conditional UPDATE — database-level invariant (DEC-12).
  const now = new Date();
  const updateData: Prisma.PlacementUpdateInput = { status: args.to, version: { increment: 1 } };
  if (args.to === 'CONFIRMED') updateData.confirmedAt = now;
  if (args.to === 'EFFECTIVE') {
    updateData.effectiveAt = now;
    // AC-07: persist evidence columns cho audit/trace.
    if (ctx.evidence) {
      updateData.evidenceAcknowledgedAt = ctx.evidence.clientAcknowledgedAt;
      updateData.evidenceAcknowledgedByUserId = ctx.evidence.clientAcknowledgedByUserId;
      updateData.evidenceAcknowledgementRef = ctx.evidence.acknowledgementRef;
    }
  }
  if (args.to === 'FAILED' || args.to === 'CANCELLED') {
    updateData.failureReason = `Marked ${args.to} by ${args.actorId} at ${now.toISOString()}`;
  }

  const result = await args.tx.placement.updateMany({
    where: { id: row.id, status: row.status }, // status guard
    data: updateData,
  });

  if (result.count === 0) {
    // Status changed by concurrent command. Round-3 fix: return CURRENT status
    // with replayed=false so caller biết command KHÔNG idempotent (state khác
    // target caller yêu cầu). Nếu may mắn current=target (e.g. concurrent
    // confirm thành công), caller xử lý theo state thực tế.
    const refreshed = await findPlacementForTransition(args.tx, row.id);
    return { placementId: refreshed.id, status: refreshed.status, replayed: false };
  }

  // AC-07: client-managed EFFECTIVE thành công → đóng PlacementCase (atomic closure).
  if (args.to === 'EFFECTIVE' && managementMode === 'CLIENT_MANAGED') {
    await closePlacementCaseSuccess(args.tx, row.placementCaseId, args.actorId, now);
  }

  return { placementId: row.id, status: args.to, replayed: false };
}

/**
 * Close PlacementCase SUCCESS (atomic) sau khi Client-managed EFFECTIVE thành công.
 * Đây là AC-07: client-managed EFFECTIVE đóng case SUCCESS + record Placement —
 * KHÔNG tạo Worker/Episode/Assignment (đó là N4).
 */
async function closePlacementCaseSuccess(
  tx: PrismaTypes.TransactionClient,
  placementCaseId: string,
  actorId: string,
  closedAt: Date,
): Promise<void> {
  await tx.placementCase.updateMany({
    where: { id: placementCaseId, status: { in: ACTIVE_CASE_STATUSES } },
    data: {
      status: 'CLOSED',
      closedAt,
      closeReason: `PLACEMENT_EFFECTIVE by ${actorId} at ${closedAt.toISOString()}`,
    },
  });
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
