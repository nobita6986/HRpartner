/**
 * placement.route-helpers.ts — Shared, non-domain pipeline used by the 5
 * P1-F0 admin routes (placement.{create,confirm,effective,fail,cancel}).
 *
 * Round-2 correction batch (C-02, C-03):
 *   - C-02: ordering is `getAuthContext → role → placementId validation →
 *     body validation → Idempotency-Key → DB`. An unauthenticated request
 *     with a malformed `placementId` MUST receive 401, NOT 400. The
 *     `placementId` regex check runs inside the helper, AFTER auth.
 *   - C-02: `clientAcknowledgedAt` is now validated via a strict Zod
 *     ISO-8601 schema (`z.string().datetime(...)`) so non-ISO strings that
 *     happen to be `Date.parse`-able (e.g. `"Jan 1 2026"`) are rejected.
 *   - C-03: structured logging replaces `console.*`. The helper builds a
 *     `SafeMeta` envelope (route/method/status/actorRole/resourceType/
 *     outcome/errorCode) plus a minimal `detail` of `{ command,
 *     placementId?, replayed }`. Raw actorId, request body, evidence,
 *     acknowledgementRef, failureReason, tokens, Idempotency-Key and
 *     PII are NEVER logged. The helper does not run an extra DB read
 *     just to enrich log entries.
 *
 * Why a shared helper (C-08 library-first, no duplication across 5 routes):
 *   - All 5 routes share the same canonical pipeline (getAuthContext →
 *     role gate → strict placementId parsing → strict body parsing →
 *     Idempotency-Key UUID v4 → idempotency wrap → canonical tx boundary
 *     → command adapter → structured log → error map).
 *   - With 5 routes for F0 the duplication would be > 250 LOC of identical
 *     glue. The shared helper keeps each route's body to its command-
 *     specific body validation only.
 *
 * What this helper does NOT do (frozen service boundary):
 *   - Does NOT call the frozen placement service directly.
 *   - Does NOT open a second transaction inside the adapter.
 *   - Does NOT know about any specific command — it accepts the command
 *     adapter function (closure) as a parameter.
 *
 * Forbidden (C-03, C-08):
 *   - NO L1+write boundary (see DEC-03 — unsafe for `create`).
 *   - NO second tx boundary inside the adapter.
 *   - NO permission catalog or seed edits.
 *   - NO outbox/event producer.
 *   - NO `console.*` in the command pipeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import { info as logInfo, warn as logWarn, error as logError, type LogEntry, type SafeMeta } from '@/src/shared/observability/logger';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import {
  PlacementError,
  PlacementValidationError,
  PlacementIdempotencyConflictError,
  InvalidStateTransitionError,
  PlacementNotFoundError,
} from '@/src/domains/talent/placement.errors';

export const ALLOWED_PLACEMENT_ROLES = new Set(['ADMIN', 'HR_MANAGER'] as const);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * placementCaseId grammar — match the schema `placement_case.id` (CUID-style
 * default; the test fixture uses 64-char strings starting with "pc" or
 * similar alphanumeric). Allow `[A-Za-z0-9_-]{1,64}` to be permissive.
 */
export const PLACEMENT_CASE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// C-02: Strict ISO-8601 validator. Zod's `.datetime()` enforces RFC 3339
// shape (e.g. `2026-01-01T00:00:00Z` or `2026-01-01T00:00:00.123+07:00`).
// Strings like `Date.parse("Jan 1 2026")` return a valid timestamp but are
// NOT accepted here. We expose `parseStrictIso8601Date` so route-level
// tests can assert the failure mode directly.
export const STRICT_ISO8601 = z.string().datetime({
  offset: true,
  message: 'evidence.clientAcknowledgedAt phải là ISO-8601 nghiêm ngặt (RFC 3339)',
});

export function parseStrictIso8601Date(value: string): Date {
  return new Date(STRICT_ISO8601.parse(value));
}

export function isUuidV4(s: string): boolean {
  return UUID_V4_RE.test(s);
}

/** Read Idempotency-Key from header — case-insensitive, prefer repo convention. */
export function readIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? req.headers.get('Idempotency-Key') ?? undefined;
}

/** Map PlacementError → HTTP status (C-07 canonical mapping). */
export function placementErrorStatus(e: PlacementError): { status: number; code: string } {
  if (e instanceof PlacementValidationError) return { status: 400, code: e.code };
  if (e instanceof InvalidStateTransitionError) return { status: 409, code: e.code };
  if (e instanceof PlacementNotFoundError) return { status: 404, code: e.code };
  if (e instanceof PlacementIdempotencyConflictError) return { status: 409, code: e.code };
  return { status: 500, code: 'INTERNAL' };
}

/** Resource type literal used in structured log envelope. */
const RESOURCE_TYPE = 'placement_command';

/**
 * Standard pipeline (round-2 — auth-first + strict validation + structured log):
 *   1. extract correlation id from inbound `x-request-id` (or generate UUID)
 *   2. getAuthContext → 401 on missing/invalid session
 *   3. role gate (ADMIN/HR_MANAGER) → 403 otherwise
 *   4. placementId validation (UUID v4) — runs ONLY after auth; missing/malformed
 *      placementId with no session → 401, with session → 400 VALIDATION
 *   5. strict body parsing (route-supplied parser) → 400 VALIDATION if invalid
 *   6. read Idempotency-Key UUID v4 → 400 IDEMPOTENCY_REQUIRED if missing/bad
 *   7. withIdempotency wrap (raw PrismaClient, NOT inside tx — C-04)
 *   8. inside idempotency, withDbContext(prisma, ctx, tx => run(tx, ctx, parsed))
 *   9. surface idempotent replay with `replayed: true`
 *  10. map PlacementError → canonical HTTP status (C-07)
 *  11. structured log (C-03): SafeMeta envelope + minimal detail, never raw
 *      actorId, body, evidence, acknowledgementRef, failureReason, token,
 *      Idempotency-Key or PII.
 *
 * @param req NextRequest
 * @param args.route canonical route string (matches `withIdempotency.scope`)
 * @param args.command canonical command name (e.g. `placement.confirm`) used in log detail
 * @param args.placementId URL param value; validated AFTER auth (C-02)
 * @param args.parseBody strict body parser — returns `{ ok, value }` or `{ ok:false, error, message }`
 * @param args.run the command-specific adapter invocation `(tx, ctx, parsed) => Promise<unknown>`
 * @param args.statusCode success status (201 for create, 200 for transitions)
 */
export async function runPlacementCommand<TParsed, TResult>(
  req: NextRequest,
  args: {
    route: string;
    command: 'placement.create' | 'placement.confirm' | 'placement.effective' | 'placement.fail' | 'placement.cancel';
    placementId?: string;
    parseBody: (raw: unknown) =>
      | { ok: true; value: TParsed }
      | { ok: false; error: string; message: string };
    run: (tx: Prisma.TransactionClient, ctx: AuthContext, value: TParsed) => Promise<TResult>;
    statusCode: number;
  },
): Promise<NextResponse> {
  // 0. correlation id (always present; logger carries it through every emit).
  const correlationId = getCorrelationId(req.headers);
  const httpMethod = (req.method ?? 'POST').toUpperCase();

  // 1. Auth — runs BEFORE placementId/body validation (C-02 round 2).
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    // C-03 round-2: only NO_TOKEN / INVALID_TOKEN / USER_INACTIVE / USER_NOT_FOUND
    // map to 401. INTERNAL means auth-context build itself failed (DB blip,
    // JWT verify misconfigured) → 500, not 401.
    if (e instanceof AuthSessionError && e.code !== 'INTERNAL') {
      logWarn('placement.command.auth_failed', correlationId, {
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
    logError('placement.command.auth_internal_error', correlationId, {
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

  // 2. Role gate (C-02).
  if (!ALLOWED_PLACEMENT_ROLES.has(ctx.role as 'ADMIN' | 'HR_MANAGER')) {
    logWarn('placement.command.forbidden', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'forbidden',
      errorCode: 'FORBIDDEN',
      detail: { command: args.command },
    });
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền placement command` },
      { status: 403 },
    );
  }

  // 3. placementId validation — runs AFTER auth (C-02 round 2). A malformed
  //    placementId with no session now yields 401, not 400.
  if (args.placementId !== undefined) {
    if (!isUuidV4(args.placementId)) {
      logWarn('placement.command.validation_failed', correlationId, {
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
  }

  // 4. Strict body parsing.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    logWarn('placement.command.validation_failed', correlationId, {
      route: args.route,
      method: httpMethod,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'validation_failed',
      errorCode: 'VALIDATION',
      detail: { command: args.command },
    });
    return NextResponse.json({ error: 'VALIDATION', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }
  const parsed = args.parseBody(rawBody);
  if (!parsed.ok) {
    logWarn('placement.command.validation_failed', correlationId, {
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
    logWarn('placement.command.idempotency_missing', correlationId, {
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
    logWarn('placement.command.idempotency_invalid', correlationId, {
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

  const prisma: PrismaClient = getPrisma();

  // 6. withIdempotency → withDbContext → command adapter.
  try {
    const result = await withIdempotency<unknown>({
      prisma,
      route: args.route,
      actorId: ctx.userId,
      key: idemKey,
      requestBody: parsed.value,
      handler: async () => {
        const out = await withDbContext(prisma, ctx, (tx) => args.run(tx, ctx, parsed.value));
        return { body: out, statusCode: args.statusCode };
      },
    });
    logInfo('placement.command.success', correlationId, {
      route: args.route,
      method: httpMethod,
      status: result.statusCode,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'success',
      detail: {
        command: args.command,
        ...(args.placementId ? { placementId: args.placementId } : {}),
        replayed: result.replayed,
      },
    });
    return NextResponse.json(
      { ...(result.body as object), replayed: result.replayed },
      { status: result.statusCode },
    );
  } catch (e) {
    // 7a. Idempotency conflict → 409.
    if (e instanceof IdempotencyConflictError) {
      logWarn('placement.command.idempotency_conflict', correlationId, {
        route: args.route,
        method: httpMethod,
        status: 409,
        actorRole: ctx.role,
        resourceType: RESOURCE_TYPE,
        outcome: 'idempotency_conflict',
        errorCode: 'IDEMPOTENCY_CONFLICT',
        detail: {
          command: args.command,
          ...(args.placementId ? { placementId: args.placementId } : {}),
        },
      });
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    // 7b. PlacementError → canonical mapping (C-07).
    if (e instanceof PlacementError) {
      const { status, code } = placementErrorStatus(e);
      const body: Record<string, unknown> = { error: code, message: e.message };
      if (e instanceof PlacementValidationError && e.details) body.details = e.details;
      logWarn('placement.command.placement_error', correlationId, {
        route: args.route,
        method: httpMethod,
        status,
        actorRole: ctx.role,
        resourceType: RESOURCE_TYPE,
        outcome: 'placement_error',
        errorCode: code,
        detail: {
          command: args.command,
          ...(args.placementId ? { placementId: args.placementId } : {}),
        },
      });
      return NextResponse.json(body, { status });
    }
    // 7c. Generic 500 — DO NOT leak internal error message. Never raw actorId,
    //     body, evidence, acknowledgementRef, failureReason, token, Idempotency-
    //     Key or PII. Detail only carries command + placementId.
    logError('placement.command.unexpected_error', correlationId, {
      route: args.route,
      method: httpMethod,
      status: 500,
      actorRole: ctx.role,
      resourceType: RESOURCE_TYPE,
      outcome: 'unexpected_error',
      errorCode: 'INTERNAL',
      detail: {
        command: args.command,
        ...(args.placementId ? { placementId: args.placementId } : {}),
      },
    });
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

/** Re-export so route-level tests can introspect captured entries. */
export type { LogEntry, SafeMeta };
