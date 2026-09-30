/**
 * POST /api/admin/staffing/job-openings/[id]/open
 *
 * P1-A0.5 (canonical, contract v1.3 §STEP-04 / RQ-05 / RQ-06 / RQ-07).
 *
 * Open a DRAFT JobOpening (DRAFT → OPEN). ADMIN/HR_MANAGER ∪ scoped
 * HR_STAFF (with active `StaffingOrderRecruiterAssignment` on the parent
 * StaffingOrder). Body is **strictly empty** (v1.1 §D correction: no
 * `expectedOpeningVersion` ignored field).
 *
 *   - Non-empty body → 400 INVALID_INPUT.
 *   - Missing Idempotency-Key header (or not UUID v4) → 400 IDEMPOTENCY_REQUIRED.
 *   - Caller outside the admission set → 403 PERMISSION_DENIED.
 *   - HR_STAFF without active assignment on the parent order → 403
 *     NO_ACTIVE_ORDER_ASSIGNMENT.
 *   - JobOpening missing → 404 NOT_FOUND.
 *   - JobOpening not DRAFT → 409 INVALID_STATE_TRANSITION.
 *   - serviceModel null → 422 SERVICE_MODEL_REQUIRED.
 *   - Parent StaffingOrder.status !== 'OPEN' (STRICT; CLOSING_SOON → 409
 *     ORDER_NOT_OPEN, pre-audit correction batch 1/1 §D).
 *   - Slot / order deadline / over-filled → 409 SLOT_NOT_ELIGIBLE.
 *   - Same Idempotency-Key + same payload → 200 + `replayed: true`.
 *   - Same Idempotency-Key + different payload → 409 IDEMPOTENCY_CONFLICT.
 *
 * Atomic + race-safe (RQ-07): service acquires `SELECT ... FOR UPDATE` on
 * the JobOpening row inside `withDbContext`. Distinct-key racing callers
 * serialize on the row lock; exactly one wins (200), the other gets 409
 * INVALID_STATE_TRANSITION.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  withIdempotency,
  IdempotencyConflictError,
} from '@/src/shared/integrity/idempotency';
import {
  openJobOpening,
  JobOpeningActivationError,
} from '@/src/domains/staffing/job-opening-activation.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/staffing/job-openings/[id]/open';
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolved = await params;
  const openingId = resolved?.id;
  if (!openingId) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'openingId is required' },
      { status: 400 },
    );
  }

  // ─── (1) Auth-first ───────────────────────────────────────────────────────
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL', message: 'auth failed' },
      { status: 500 },
    );
  }

  // ─── (2) Outer role admission (g) — service does the fine-grained
  //         StaffingOrderRecruiterAssignment check for HR_STAFF. Here we
  //         reject roles that are NEVER eligible, regardless of assignment.
  if (
    ctx.role !== 'ADMIN' &&
    ctx.role !== 'HR_MANAGER' &&
    ctx.role !== 'HR_STAFF'
  ) {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Role ${ctx.role} cannot open JobOpening`,
      },
      { status: 403 },
    );
  }

  // ─── (3) Idempotency-Key (UUID v4 required) ──────────────────────────────
  const idempotencyKey =
    (req.headers.get('idempotency-key') ??
      req.headers.get('x-idempotency-key') ??
      '').trim();
  if (!idempotencyKey || !UUID_V4.test(idempotencyKey)) {
    return NextResponse.json(
      {
        error: 'IDEMPOTENCY_REQUIRED',
        message: 'Header Idempotency-Key (UUID v4) is required',
      },
      { status: 400 },
    );
  }

  // ─── (4) Body MUST be empty (pre-audit correction batch 1/1 §H).
  //         Strict-empty contract: any non-empty body — `{}`, `null`, arrays,
  //         text, JSON object — is rejected with 400 INVALID_INPUT. The
  //         only accepted payload is the absence of a body (Content-Length
  //         absent or 0). v1.1 §D correction: no `expectedOpeningVersion`
  //         ignored field.
  const rawContentLength = req.headers.get('content-length');
  let rawBodyText = '';
  try {
    // req.text() always succeeds; we just check if anything was sent.
    rawBodyText = await req.text();
  } catch {
    rawBodyText = '';
  }
  const trimmed = rawBodyText.trim();
  if (trimmed.length > 0) {
    // Reject any payload — `{}`, `null`, arrays, JSON objects, plain text.
    // The opening transition needs nothing from the client; presence of a
    // body is a contract violation (LOCK-06 + pre-audit §H).
    return NextResponse.json(
      {
        error: 'INVALID_INPUT',
        message:
          'Body phải rỗng cho /open (KHÔNG kỳ vọng payload; pre-audit correction batch 1/1 §H)',
      },
      { status: 400 },
    );
  }
  // Belt + suspenders: content-length header, when present, must be 0.
  if (
    rawContentLength !== null &&
    rawContentLength !== '' &&
    rawContentLength !== '0'
  ) {
    return NextResponse.json(
      {
        error: 'INVALID_INPUT',
        message: 'Body phải rỗng cho /open (Content-Length phải là 0)',
      },
      { status: 400 },
    );
  }

  // ─── (5) Service call inside withDbContext + withIdempotency ─────────────
  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        // Hash payload is the URL id + the (empty) request body — distinct
        // routes for distinct openings remain separate idempotency keys via
        // the route+actor+key triple.
        requestBody: { openingId, body: '' },
        handler: async () => ({
          body: await openJobOpening(tx, ctx, { openingId }),
          statusCode: 200,
        }),
      }),
    );
    return NextResponse.json(
      { ...(result.body as Record<string, unknown>), replayed: result.replayed },
      { status: result.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: error.message },
        { status: 409 },
      );
    }
    if (error instanceof JobOpeningActivationError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.httpStatus },
      );
    }
    console.error(
      '[api/admin/staffing/job-openings/open] error:',
      error,
    );
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to open JobOpening' },
      { status: 500 },
    );
  }
}
