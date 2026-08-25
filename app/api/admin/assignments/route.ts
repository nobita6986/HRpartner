/**
 * POST /api/admin/assignments — MP-3C STEP-04/05 (RQ-03, RQ-05, RQ-07, DEC-01/04/08).
 *
 * Activates exactly one ACTIVE assignment for a CONVERTED CandidateSubmission.
 *
 *   auth (401) -> role gate in the service (403) -> Idempotency-Key required (400)
 *   -> pre-resolve CAN_OVERRIDE_REFERRAL_GUARD (own connection, BEFORE any lock)
 *   -> withDbContext transaction { withIdempotency -> activatePlacement }
 *
 * DEC-08: `Idempotency-Key` (or the legacy `x-idempotency-key`) is mandatory. The
 * idempotency row is written in the SAME transaction as the assignment, counters,
 * audit and outbox, so a replay of the same key+payload returns the stored result
 * without touching anything, and the same key with a different payload is a stable
 * IDEMPOTENCY_CONFLICT. The DB unique on project_assignments.submission_id is the
 * backstop if a client bypasses the key entirely.
 *
 * DEC-01: the client never supplies workerId / slotId / projectId / staffingOrderId.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  activatePlacement,
  assertPlacementRole,
  PlacementError,
  type ActivatePlacementInput,
  type ActivatePlacementResult,
} from '@/src/domains/staffing/assignment-placement.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'POST:/api/admin/assignments';

interface ActivateBody {
  submissionId?: string;
  employeeCode?: string;
  employmentType?: string;
  workSetting?: string | null;
  validFrom?: string;
  validTo?: string | null;
  reason?: string;
  override?: { overrideCase?: string; reason?: string; evidence?: string } | null;
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

  // Role gate before reading the body or touching the DB (DEC-04).
  try {
    assertPlacementRole(ctx);
  } catch (error) {
    if (error instanceof PlacementError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.httpStatus });
    }
    throw error;
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to activate an assignment' },
      { status: 400 },
    );
  }

  let body: ActivateBody;
  try {
    body = (await req.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }

  const override = body.override?.overrideCase
    ? {
        overrideCase: String(body.override.overrideCase),
        reason: String(body.override.reason ?? ''),
        evidence: body.override.evidence ? String(body.override.evidence) : undefined,
      }
    : null;

  // Pre-lock permission resolution (4.4): the resolver opens its own connection,
  // so it must never run inside the locked section of the transaction.
  let hasOverridePermission = false;
  if (override) {
    try {
      hasOverridePermission = (await resolveEffectivePermissions({ userId: ctx.userId, role: ctx.role }))
        .has('CAN_OVERRIDE_REFERRAL_GUARD');
    } catch (error) {
      console.error('[api/admin/assignments] permission resolve failed:', error);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to resolve permissions' }, { status: 500 });
    }
    if (!hasOverridePermission) {
      return NextResponse.json(
        { error: 'OVERRIDE_DENIED', message: `Role ${ctx.role} lacks CAN_OVERRIDE_REFERRAL_GUARD` },
        { status: 403 },
      );
    }
  }

  const input: ActivatePlacementInput = {
    submissionId: String(body.submissionId ?? ''),
    employeeCode: String(body.employeeCode ?? ''),
    employmentType: String(body.employmentType ?? ''),
    workSetting: body.workSetting ?? null,
    validFrom: String(body.validFrom ?? ''),
    validTo: body.validTo ?? null,
    reason: String(body.reason ?? ''),
    override,
    hasOverridePermission,
  };

  // Canonical, fixed-order payload for the idempotency hash — transport key order
  // must not change the fingerprint.
  const requestBody = [
    input.submissionId, input.employeeCode, input.employmentType, input.workSetting ?? null,
    input.validFrom, input.validTo ?? null, input.reason,
    override ? [override.overrideCase, override.reason, override.evidence ?? null] : null,
  ];

  try {
    const outcome = await withDbContext(getPrisma(), ctx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => ({ body: await activatePlacement(tx, ctx, input) }),
      }),
    );
    return NextResponse.json(
      { assignment: outcome.body as ActivatePlacementResult, replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof PlacementError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/assignments] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to activate assignment' }, { status: 500 });
  }
}
