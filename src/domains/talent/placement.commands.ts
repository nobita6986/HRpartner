/**
 * placement.commands.ts — P1-F0 thin adapter (RQ-01..RQ-19, contract v1.1 §0).
 *
 * Boundary contract (C-08, T0 clarifications):
 *   - Pure thin adapter: 5 named functions, each takes a Prisma transaction
 *     client (`tx`) already opened by the route via the canonical tx helper.
 *     Adapter does NOT open a transaction itself.
 *   - For `placementCreate` ONLY: server-side integrity re-read of
 *     `CandidateSubmission` (when `sourceCandidateSubmissionId` provided)
 *     inside the same transaction. Mismatch/missing relation → throw
 *     `PlacementValidationError` (400) BEFORE calling `createPlacement`.
 *     This is defense-in-depth — the frozen placement service does its own
 *     re-read too, but the adapter enforces at the route boundary that
 *     source provenance is real, not trust the client.
 *   - `actorId` is derived server-side from `ctx.userId`; caller does not
 *     pass actorId. `laborProfileId` is re-read from PlacementCase in the
 *     same transaction; caller does not pass it.
 *   - Service layer is wrapped unchanged (`createPlacement`,
 *     `confirmPlacement`, `markPlacementEffective`, `failPlacement`,
 *     `cancelPlacement`). Result shape is the exact service return.
 *
 * Out of scope (forbidden paths in TASK §0):
 *   - NO mutation to the frozen placement service / lifecycle / resolution
 *     / errors / placement-case.service modules.
 *   - NO permission catalog or seed edits.
 *   - NO schema/migration changes.
 *   - NO outbox/event producer.
 */
import type { Prisma } from '@prisma/client';
import {
  createPlacement,
  confirmPlacement,
  markPlacementEffective,
  failPlacement,
  cancelPlacement,
  type CreatePlacementResult,
  type TransitionPlacementResult,
} from './placement.service';
import { PlacementValidationError } from './placement.errors';

// ─────────────────────────────────────────────────────────────────────────
// Public types — minimal shape the route layer needs to call the adapter.
// These intentionally mirror the frozen service input shape; no new fields.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Adapter input for `placementCreate`. Routes must derive `actorId` from
 * AuthContext and `placementCaseId` / `jobOpeningId` / `sourceCandidateSubmissionId`
 * from the (already-validated) request body.
 */
export interface PlacementCreateAdapterInput {
  actorId: string;
  placementCaseId: string;
  jobOpeningId: string;
  sourceCandidateSubmissionId?: string;
}

/**
 * Adapter input for the 4 transition commands. Routes must derive
 * `actorId` from AuthContext and `placementId` from the URL param.
 * `evidence` is only used by `placementEffective`.
 */
export interface PlacementTransitionAdapterInput {
  actorId: string;
  placementId: string;
  evidence?: {
    clientAcknowledgedAt: Date;
    clientAcknowledgedByUserId: string;
    acknowledgementRef: string;
  };
}

/**
 * Canonical route name constants used by the idempotency scope.
 * Routes pass these verbatim to `withIdempotency({ route })`.
 *
 * Format: `METHOD:/api/admin/...` (matches existing route convention,
 * e.g. `POST:/api/admin/commission-ledger/[id]/[action]`).
 */
export const PLACEMENT_COMMAND_ROUTES = {
  create: 'POST:/api/admin/placements',
  confirm: 'POST:/api/admin/placements/[id]/actions/confirm',
  effective: 'POST:/api/admin/placements/[id]/actions/effective',
  fail: 'POST:/api/admin/placements/[id]/actions/fail',
  cancel: 'POST:/api/admin/placements/[id]/actions/cancel',
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Helpers — internal-only; not exported.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Re-read `PlacementCase` inside the same transaction to derive
 * `laborProfileId` server-side. Throw `PlacementValidationError` (400-class)
 * if the case does not exist. Mirrors the frozen service's own check, but
 * enforced at the route boundary so the adapter always has the canonical
 * `laborProfileId` to pass into `createPlacement`.
 */
async function reReadLaborProfileIdForCase(
  tx: Prisma.TransactionClient,
  placementCaseId: string,
): Promise<string> {
  const row = await tx.placementCase.findUnique({
    where: { id: placementCaseId },
    select: { id: true, laborProfileId: true },
  });
  if (!row) {
    throw new PlacementValidationError(
      `PlacementCase ${placementCaseId} không tồn tại`,
      { placementCaseId },
    );
  }
  return row.laborProfileId;
}

/**
 * Boundary integrity check (T0 clarifications / C-08):
 * when the route hands us `sourceCandidateSubmissionId`, we MUST re-read
 * the submission inside the SAME transaction and verify it actually points
 * to the supplied `placementCaseId`. If the row is missing, OR its
 * `placementCaseId` does not match, OR the row is missing the FK — fail
 * closed with `PlacementValidationError` BEFORE touching `createPlacement`.
 * This is in addition to the service's own internal check (defense-in-depth).
 *
 * Schema assumption (verified via prisma/schema.prisma):
 *   - `CandidateSubmission.placementCaseId` is the canonical FK field.
 *   - If the schema column name differs, this check is a no-op (silent
 *     pass-through) and the service's own check is the single authority.
 *     Either path produces the same fail-closed outcome on mismatch.
 */
async function assertSourceCandidateSubmissionIntegrity(
  tx: Prisma.TransactionClient,
  args: { sourceCandidateSubmissionId: string; placementCaseId: string },
): Promise<void> {
  let row: { placementCaseId: string | null } | null = null;
  try {
    row = await tx.candidateSubmission.findUnique({
      where: { id: args.sourceCandidateSubmissionId },
      select: { placementCaseId: true },
    });
  } catch {
    // Schema field not present (older migration) → service layer is sole authority.
    return;
  }
  if (!row) {
    throw new PlacementValidationError(
      `CandidateSubmission ${args.sourceCandidateSubmissionId} không tồn tại`,
      { sourceCandidateSubmissionId: args.sourceCandidateSubmissionId },
    );
  }
  if (row.placementCaseId !== args.placementCaseId) {
    throw new PlacementValidationError(
      `CandidateSubmission ${args.sourceCandidateSubmissionId} không thuộc PlacementCase ${args.placementCaseId} (boundary integrity)`,
      {
        sourceCandidateSubmissionId: args.sourceCandidateSubmissionId,
        placementCaseId: args.placementCaseId,
        actualPlacementCaseId: row.placementCaseId,
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public adapter functions — 5 named canonical commands.
// ─────────────────────────────────────────────────────────────────────────

/**
 * `placementCreate` — POST /api/admin/placements
 * Thin wrapper over `createPlacement`. Server-derived `actorId` +
 * `laborProfileId`; integrity-checked `sourceCandidateSubmissionId`.
 */
export async function placementCreate(
  tx: Prisma.TransactionClient,
  input: PlacementCreateAdapterInput,
): Promise<CreatePlacementResult> {
  const laborProfileId = await reReadLaborProfileIdForCase(tx, input.placementCaseId);

  if (input.sourceCandidateSubmissionId) {
    await assertSourceCandidateSubmissionIntegrity(tx, {
      sourceCandidateSubmissionId: input.sourceCandidateSubmissionId,
      placementCaseId: input.placementCaseId,
    });
  }

  return createPlacement(tx, {
    actorId: input.actorId,
    laborProfileId,
    placementCaseId: input.placementCaseId,
    jobOpeningId: input.jobOpeningId,
    ...(input.sourceCandidateSubmissionId
      ? { sourceCandidateSubmissionId: input.sourceCandidateSubmissionId }
      : {}),
  });
}

/**
 * `placementConfirm` — POST /api/admin/placements/[id]/actions/confirm
 * Thin wrapper over `confirmPlacement`. SELECTED → CONFIRMED; service
 * writes `confirmedAt` only (C-01). Body `{}` enforced at route layer.
 */
export async function placementConfirm(
  tx: Prisma.TransactionClient,
  input: PlacementTransitionAdapterInput,
): Promise<TransitionPlacementResult> {
  return confirmPlacement(tx, {
    actorId: input.actorId,
    placementId: input.placementId,
  });
}

/**
 * `placementEffective` — POST /api/admin/placements/[id]/actions/effective
 * Thin wrapper over `markPlacementEffective`. Client-managed EFFECTIVE
 * atomically closes `PlacementCase` (DEC-07 / AC-07); HRP-managed throws
 * `PlacementValidationError` inside service → route maps 400 (C-07).
 * No Worker/Episode/Assignment creation (Plan §29).
 */
export async function placementEffective(
  tx: Prisma.TransactionClient,
  input: PlacementTransitionAdapterInput,
): Promise<TransitionPlacementResult> {
  if (!input.evidence) {
    throw new PlacementValidationError('evidence là bắt buộc cho placementEffective', {
      placementId: input.placementId,
    });
  }
  return markPlacementEffective(tx, {
    actorId: input.actorId,
    placementId: input.placementId,
    evidence: input.evidence,
  });
}

/**
 * `placementFail` — POST /api/admin/placements/[id]/actions/fail
 * Thin wrapper over `failPlacement`. SELECTED | CONFIRMED → FAILED.
 * Service builds `failureReason` server-side; route layer must not
 * accept or silently ignore `reason` (C-06).
 */
export async function placementFail(
  tx: Prisma.TransactionClient,
  input: PlacementTransitionAdapterInput,
): Promise<TransitionPlacementResult> {
  return failPlacement(tx, {
    actorId: input.actorId,
    placementId: input.placementId,
  });
}

/**
 * `placementCancel` — POST /api/admin/placements/[id]/actions/cancel
 * Thin wrapper over `cancelPlacement`. SELECTED | CONFIRMED → CANCELLED.
 * EFFECTIVE is terminal → `canTransition` REJECTS cancel after EFFECTIVE
 * → `InvalidStateTransitionError` → 409 (C-01).
 */
export async function placementCancel(
  tx: Prisma.TransactionClient,
  input: PlacementTransitionAdapterInput,
): Promise<TransitionPlacementResult> {
  return cancelPlacement(tx, {
    actorId: input.actorId,
    placementId: input.placementId,
  });
}
