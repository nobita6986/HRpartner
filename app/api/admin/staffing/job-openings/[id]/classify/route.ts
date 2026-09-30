/**
 * POST /api/admin/staffing/job-openings/[id]/classify
 *
 * P1-A0.5 (canonical, contract v1.3 §STEP-02 / RQ-03 / RQ-04).
 *
 * ADMIN/HR_MANAGER sets ServiceModel on a DRAFT JobOpening. Body:
 *   { "serviceModel": "STAFFING_SUPPLY" | "LABOR_LEASING" |
 *                      "RECRUITMENT_SERVICE" | "REFERRAL_SERVICE" }
 *
 *   - NULL / missing / unknown enum → 400 INVALID_INPUT (Zod — v1.1 §C).
 *   - Missing Idempotency-Key header (or not UUID v4) → 400 IDEMPOTENCY_REQUIRED.
 *   - Non-ADMIN/HR_MANAGER → 403 PERMISSION_DENIED (typed envelope).
 *   - JobOpening missing → 404 NOT_FOUND.
 *   - JobOpening not DRAFT → 409 INVALID_STATE_TRANSITION.
 *   - Placements already exist → 409 INVALID_STATE_TRANSITION (defense in depth).
 *   - Same Idempotency-Key + same payload → 200 + `replayed: true`.
 *   - Same Idempotency-Key + different payload → 409 IDEMPOTENCY_CONFLICT.
 *
 * The route is auth-first → role gate → body validation → Idempotency-Key →
 * withDbContext → withIdempotency → service. The typed envelope is
 * `JobOpeningActivationError` (DEC-14); the safe envelope never leaks
 * `actorId` / assignment metadata / PII / DB internals.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  withIdempotency,
  IdempotencyConflictError,
} from '@/src/shared/integrity/idempotency';
import {
  classifyJobOpening,
  JobOpeningActivationError,
  SERVICE_MODEL_ENUMS,
} from '@/src/domains/staffing/job-opening-activation.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY =
  'POST:/api/admin/staffing/job-openings/[id]/classify';
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ClassifyBodySchema = z.object({
  // serviceModel MUST be one of the 4 ServiceModel enums. NULL / missing /
  // unknown → 400 INVALID_INPUT (Zod — v1.1 §C correction; v1.0 wrongly
  // allowed NULL writes).
  serviceModel: z.enum(
    SERVICE_MODEL_ENUMS as [string, ...string[]],
    {
      errorMap: () => ({
        message: `serviceModel phải là một trong ${SERVICE_MODEL_ENUMS.join(', ')} (null/missing/unknown đều bị reject)`,
      }),
    },
  ),
});

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

  // ─── (2) Role gate ────────────────────────────────────────────────────────
  if (ctx.role !== 'ADMIN' && ctx.role !== 'HR_MANAGER') {
    return NextResponse.json(
      {
        error: 'PERMISSION_DENIED',
        message: `Role ${ctx.role} cannot classify JobOpening ServiceModel (ADMIN/HR_MANAGER only)`,
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

  // ─── (4) Body validation (Zod) ───────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: 'Body phải là JSON object hợp lệ' },
      { status: 400 },
    );
  }
  const parsed = ClassifyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_INPUT',
        message: parsed.error.issues.map((i) => i.message).join('; '),
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
        requestBody: { openingId, serviceModel: parsed.data.serviceModel },
        handler: async () => ({
          body: await classifyJobOpening(tx, ctx, {
            openingId,
            serviceModel: parsed.data.serviceModel as never,
          }),
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
      '[api/admin/staffing/job-openings/classify] error:',
      error,
    );
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to classify JobOpening' },
      { status: 500 },
    );
  }
}
