/**
 * /api/admin/recruiter/placements/route.ts
 *
 * P1-A0.4 R3-B03 — Recruiter-scoped Placement creation route. HR_STAFF only.
 *
 * The canonical Placement creation path (`/api/admin/placements`) is gated to
 * ADMIN/HR_MANAGER. This dedicated surface lets a winning HR_STAFF recruiter
 * (who holds both the order assignment AND the handling claim) complete the
 * canonical flow:
 *
 *   POST /api/admin/recruiter/placements  { sourceCandidateSubmissionId }
 *
 * Server-derived canonical IDs (DEC-01):
 *   - slot.staffingOrderId
 *   - slot.jobOpeningId
 *   - submission.laborProfileId
 *   - submission.placementCaseId
 *
 * The adapter `recruiterPlacementCreate` runs the dual-authority predicate
 * (order assignment ACTIVE + handling claim ACTIVE) inside the same tx as
 * the Placement insert. A concurrent revoke observed at any point rolls
 * back the entire mutation.
 *
 * ADMIN/HR_MANAGER MUST continue to use `/api/admin/placements` — this is
 * the recruiter-scoped (HR_STAFF) path.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  recruiterPlacementCreate,
  RecruiterPlacementCreateInput,
} from '@/src/domains/talent/recruiter-placement.adapter';
import { RecruiterAssignmentError } from '@/src/domains/talent/recruiter-assignment.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/recruiter/placements';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreateBodyShape {
  sourceCandidateSubmissionId?: unknown;
}

function validateCreateBody(
  raw: unknown,
):
  | { ok: true; value: { sourceCandidateSubmissionId: string } }
  | { ok: false; error: string; message: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'VALIDATION', message: 'Body phải là JSON object' };
  }
  const r = raw as CreateBodyShape;
  if (typeof r.sourceCandidateSubmissionId !== 'string' || !UUID_V4.test(r.sourceCandidateSubmissionId)) {
    return {
      ok: false,
      error: 'VALIDATION',
      message: 'sourceCandidateSubmissionId là UUID v4 bắt buộc',
    };
  }
  return { ok: true, value: { sourceCandidateSubmissionId: r.sourceCandidateSubmissionId } };
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // HR_STAFF only — ADMIN/HR_MANAGER use the canonical /api/admin/placements.
  if (ctx.role !== 'HR_STAFF') {
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot use the recruiter-scoped placement route` },
      { status: 403 },
    );
  }

  let body: { sourceCandidateSubmissionId: string };
  try {
    const parsed = validateCreateBody(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });
    }
    body = parsed.value;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }

  const idempotencyKey = (req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? '').trim();
  if (!idempotencyKey || !UUID_V4.test(idempotencyKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Header Idempotency-Key (UUID v4) is required' },
      { status: 400 },
    );
  }

  try {
    const input: RecruiterPlacementCreateInput = {
      sourceCandidateSubmissionId: body.sourceCandidateSubmissionId,
      actorId: ctx.userId,
      actorRole: 'HR_STAFF',
    };
    const outcome = await withDbContext(getPrisma(), ctx, (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: { sourceCandidateSubmissionId: body.sourceCandidateSubmissionId },
        handler: async () => ({
          body: await recruiterPlacementCreate(tx, input),
          statusCode: 201,
        }),
      }),
    );
    return NextResponse.json(
      { placement: outcome.body, replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof RecruiterAssignmentError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/recruiter/placements] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create placement' }, { status: 500 });
  }
}
