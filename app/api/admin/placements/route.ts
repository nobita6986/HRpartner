/**
 * POST /api/admin/placements — placement.create (RQ-01..RQ-19, contract v1.1 §4.1.1).
 *
 * Single transaction boundary (C-03) via `runPlacementCommand`:
 *   getAuthContext → role gate (ADMIN/HR_MANAGER) → strict body parsing
 *   → Idempotency-Key UUID v4 → withIdempotency
 *   → canonical tx boundary(getPrisma(), ctx, tx => placementCreate(tx, …)).
 *
 * Forbidden (C-02, C-03, C-08):
 *   - NO L1+write boundary for create/write (DEC-03 — unsafe for `create`).
 *   - NO second tx boundary inside the adapter.
 *   - NO permission catalog or seed edits.
 *   - NO outbox/event producer.
 *
 * Frozen service semantics (C-01, C-06):
 *   - Service returns exact `CreatePlacementResult` (placementId, status,
 *     serviceModelSnapshot, clientCompanyId, projectId, replayed).
 *   - Route does NOT add or rename fields.
 */
import { NextRequest } from 'next/server';
import { placementCreate, PLACEMENT_COMMAND_ROUTES } from '@/src/domains/talent/placement.commands';
import {
  runPlacementCommand,
  isUuidV4,
  PLACEMENT_CASE_ID_RE,
} from '@/src/domains/talent/placement.route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CreateBodyShape {
  placementCaseId?: unknown;
  jobOpeningId?: unknown;
  sourceCandidateSubmissionId?: unknown;
}

function validateCreateBody(raw: unknown):
  | { ok: true; value: { placementCaseId: string; jobOpeningId: string; sourceCandidateSubmissionId?: string } }
  | { ok: false; error: string; message: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là JSON object' };
  }
  const r = raw as CreateBodyShape;

  // Strict allowlist (C-06) — reject unknown fields.
  const allowed = new Set(['placementCaseId', 'jobOpeningId', 'sourceCandidateSubmissionId']);
  for (const k of Object.keys(r)) {
    if (!allowed.has(k)) {
      return { ok: false, error: 'VALIDATION', message: `Unknown field: ${k}` };
    }
  }

  if (typeof r.placementCaseId !== 'string' || !PLACEMENT_CASE_ID_RE.test(r.placementCaseId)) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: 'placementCaseId bắt buộc, phải khớp grammar CUID/non-empty canonical',
    };
  }
  if (typeof r.jobOpeningId !== 'string' || !isUuidV4(r.jobOpeningId)) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: 'jobOpeningId bắt buộc và phải là UUID v4',
    };
  }
  if (r.sourceCandidateSubmissionId !== undefined) {
    if (typeof r.sourceCandidateSubmissionId !== 'string' || !isUuidV4(r.sourceCandidateSubmissionId)) {
      return {
        ok: false,
        error: 'VALIDATION',
        message: 'sourceCandidateSubmissionId, nếu có, phải là UUID v4',
      };
    }
  }

  return {
    ok: true,
    value: {
      placementCaseId: r.placementCaseId,
      jobOpeningId: r.jobOpeningId,
      ...(r.sourceCandidateSubmissionId
        ? { sourceCandidateSubmissionId: r.sourceCandidateSubmissionId }
        : {}),
    },
  };
}

export async function POST(req: NextRequest) {
  return runPlacementCommand(req, {
    route: PLACEMENT_COMMAND_ROUTES.create,
    statusCode: 201,
    parseBody: validateCreateBody,
    run: (tx, ctx, value) =>
      placementCreate(tx, {
        actorId: ctx.userId,
        placementCaseId: value.placementCaseId,
        jobOpeningId: value.jobOpeningId,
        ...(value.sourceCandidateSubmissionId
          ? { sourceCandidateSubmissionId: value.sourceCandidateSubmissionId }
          : {}),
      }),
  });
}
