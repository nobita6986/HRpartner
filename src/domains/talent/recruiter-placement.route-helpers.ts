/**
 * recruiter-placement.route-helpers.ts — Shared pipeline for the
 * recruiter-scoped Placement transition routes (B-08).
 *
 * Pipeline (mirrors `placement.route-helpers.ts` but for HR_STAFF):
 *   1. correlation id from inbound `x-request-id`.
 *   2. getAuthContext → 401 on missing/invalid session.
 *   3. role gate (HR_STAFF only) → 403 otherwise.
 *   4. placementId validation (UUID v4) — AFTER auth, so missing session
 *      + bad id yields 401 (not 400).
 *   5. body parsing — route-supplied parser → 400 VALIDATION on failure.
 *   6. Idempotency-Key UUID v4 → 400 IDEMPOTENCY_REQUIRED on missing/bad.
 *   7. withIdempotency → withDbContext → command adapter.
 *   8. Map RecruiterAssignmentError → canonical envelope (NO_ACTIVE_* / ROLE_*).
 *   9. Map PlacementError → canonical HTTP status (mirror runPlacementCommand).
 *  10. structured logging — NEVER raw actorId, body, evidence, ackRef, token,
 *      Idempotency-Key or PII.
 *
 * Why a separate helper (vs reusing `placement.route-helpers.ts`):
 *   - Role gate is HR_STAFF-only, not ADMIN/HR_MANAGER.
 *   - The transition command adapters live in `recruiter-placement.adapter`
 *     and run `derivePlacementAnchors + assertDualAuthority` BEFORE the
 *     canonical service — the canonical helper does not.
 *   - The error envelope is `RecruiterAssignmentError` (canonical wire code
 *     NO_ACTIVE_*) + PlacementError, not just PlacementError.
 *
 * ADMIN/HR_MANAGER continue to use `/api/admin/placements/[id]/actions/*`.
 */
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import {
  AuthSessionError,
  getAuthContext,
  type AuthContext,
} from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import { info as logInfo, warn as logWarn, error as logError } from '@/src/shared/observability/logger';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { RecruiterAssignmentError } from './recruiter-assignment.service';
import {
  PlacementError,
  PlacementValidationError,
  PlacementIdempotencyConflictError,
  InvalidStateTransitionError,
  PlacementNotFoundError,
} from './placement.errors';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(s: string): boolean {
  return UUID_V4_RE.test(s);
}

export function readIdempotencyKey(nReq: NextRequest): string | undefined {
  return nReq.headers.get('x-idempotency-key') ?? nReq.headers.get('Idempotency-Key') ?? undefined;
}

/**
 * Strict ISO-8601 datetime parser for evidence.clientAcknowledgedAt.
 * Re-exported here so the recruiter routes can validate client-side body
 * without depending on the canonical placement-route-helpers (which is
 * ADMIN/HR_MANAGER-only and would couple the recruiter scope to it).
 */
export const STRICT_ISO8601 = z.string().datetime({
  offset: true,
  message: 'evidence.clientAcknowledgedAt phải là ISO-8601 nghiêm ngặt (RFC 3339)',
});

export function parseStrictIso8601Date(value: string): Date {
  return new Date(STRICT_ISO8601.parse(value));
}

export function placementErrorStatus(e: PlacementError): { status: number; code: string } {
  if (e instanceof PlacementValidationError) return { status: 400, code: e.code };
  if (e instanceof InvalidStateTransitionError) return { status: 409, code: e.code };
  if (e instanceof PlacementNotFoundError) return { status: 404, code: e.code };
  if (e instanceof PlacementIdempotencyConflictError) return { status: 409, code: e.code };
  return { status: 500, code: 'INTERNAL' };
}

const RESOURCE_TYPE = 'recruiter_placement_command';

export interface RunRecruiterPlacementCommandArgs<TParsed> {
  route: string;
  command:
    | 'recruiter_placement.confirm'
    | 'recruiter_placement.effective'
    | 'recruiter_placement.fail'
    | 'recruiter_placement.cancel';
  placementId: string;
  parseBody: (raw: unknown) =>
    | { ok: true; value: TParsed }
    | { ok: false; error: string; message: string };
  run: (tx: Prisma.TransactionClient, ctx: AuthContext, value: TParsed) => Promise<unknown>;
  statusCode: number;
}

export async function runRecruiterPlacementCommand<TParsed>(
  req: NextRequest,
  args: RunRecruiterPlacementCommandArgs<TParsed>,
): Promise<NextResponse> {
  const correlationId = getCorrelationId(req.headers);
  const httpMethod = (req.method ?? 'POST').toUpperCase();

  // 1. Auth — runs BEFORE placementId/body validation.
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError && e.code !== 'INTERNAL') {
      logWarn('recruiter_placement.command.auth_failed', correlationId, {
        route: args.route,
        method: httpMethod,
        actorRole: undefined,
        resourceType: RESOURCE_TYPE,
        outcome: 'auth_failed',
        errorCode: e.code,
        detail: { command: args.command },
      });
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    logError('recruiter_placement.command.auth_internal_error', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: undefined,
      resourceType: RESOURCE_TYPE,
      outcome: 'auth_internal_error',
      errorCode: 'INTERNAL',
      detail: { command: args.command },
    });
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // 2. Role gate (HR_STAFF only).
  if (ctx.role !== 'HR_STAFF') {
    logWarn('recruiter_placement.command.forbidden', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'forbidden',
      errorCode: 'ROLE_NOT_PERMITTED',
      detail: { command: args.command },
    });
    return NextResponse.json(
      { error: 'ROLE_NOT_PERMITTED', message: `Role ${ctx.role} cannot use the recruiter-scoped placement route` },
      { status: 403 },
    );
  }

  // 3. placementId validation — AFTER auth so unauthenticated + bad id → 401.
  if (!isUuidV4(args.placementId)) {
    logWarn('recruiter_placement.command.validation_failed', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'validation_failed',
      errorCode: 'VALIDATION',
      detail: { command: args.command },
    });
    return NextResponse.json(
      { error: 'VALIDATION', message: 'placementId phải là UUID v4' },
      { status: 400 },
    );
  }

  // 4. Body parsing.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }
  const parsed = args.parseBody(rawBody);
  if (!parsed.ok) {
    logWarn('recruiter_placement.command.validation_failed', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'validation_failed',
      errorCode: parsed.error,
      detail: { command: args.command },
    });
    return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });
  }

  // 5. Idempotency-Key UUID v4.
  const idemKey = readIdempotencyKey(req);
  if (!idemKey) {
    logWarn('recruiter_placement.command.idempotency_missing', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'idempotency_missing',
      errorCode: 'IDEMPOTENCY_REQUIRED',
      detail: { command: args.command },
    });
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header x-idempotency-key (UUID v4) bắt buộc' },
      { status: 400 },
    );
  }
  if (!isUuidV4(idemKey)) {
    logWarn('recruiter_placement.command.idempotency_invalid', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'idempotency_invalid',
      errorCode: 'IDEMPOTENCY_REQUIRED',
      detail: { command: args.command },
    });
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key phải là UUID v4' },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, async (tx) =>
      withIdempotency<unknown>({
        prisma: tx,
        route: args.route,
        actorId: ctx.userId,
        key: idemKey,
        requestBody: { placementId: args.placementId, body: parsed.value },
        handler: async () => {
          const out = await args.run(tx, ctx, parsed.value);
          return { body: out, statusCode: args.statusCode };
        },
      }),
    );
    logInfo('recruiter_placement.command.success', correlationId, {
      route: args.route,
      method: httpMethod,
      status: result.statusCode,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'success',
      detail: {
        command: args.command,
        placementId: args.placementId,
        replayed: result.replayed,
      },
    });
    return NextResponse.json(
      { ...(result.body as object), replayed: result.replayed },
      { status: result.statusCode },
    );
  } catch (e) {
    if (e instanceof IdempotencyConflictError) {
      logWarn('recruiter_placement.command.idempotency_conflict', correlationId, {
        route: args.route,
        method: httpMethod,
        status: 409,
        actorRole: ctx.role,
        resourceType: RESOURCE_TYPE,
        outcome: 'idempotency_conflict',
        errorCode: 'IDEMPOTENCY_CONFLICT',
        detail: { command: args.command, placementId: args.placementId },
      });
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    if (e instanceof RecruiterAssignmentError) {
      logWarn('recruiter_placement.command.recruiter_error', correlationId, {
        route: args.route,
        method: httpMethod,
        status: e.httpStatus,
        actorRole: ctx.role,
        resourceType: RESOURCE_TYPE,
        outcome: 'recruiter_error',
        errorCode: e.code,
        detail: { command: args.command, placementId: args.placementId },
      });
      return NextResponse.json(
        { error: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) },
        { status: e.httpStatus },
      );
    }
    if (e instanceof PlacementError) {
      const { status, code } = placementErrorStatus(e);
      const body: Record<string, unknown> = { error: code, message: e.message };
      if (e instanceof PlacementValidationError && e.details) body.details = e.details;
      logWarn('recruiter_placement.command.placement_error', correlationId, {
        route: args.route,
        method: httpMethod,
        status,
        actorRole: ctx.role,
        resourceType: RESOURCE_TYPE,
        outcome: 'placement_error',
        errorCode: code,
        detail: { command: args.command, placementId: args.placementId },
      });
      return NextResponse.json(body, { status });
    }
    logError('recruiter_placement.command.unexpected_error', correlationId, {
      route: args.route,
      method: httpMethod,
      status: 500,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'unexpected_error',
      errorCode: 'INTERNAL',
      detail: { command: args.command, placementId: args.placementId },
    });
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}