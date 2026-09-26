/**
 * placement.route-helpers.ts — Shared, non-domain pipeline used by the 5
 * P1-F0 admin routes (placement.{create,confirm,effective,fail,cancel}).
 *
 * Why a shared helper (C-08 library-first, no duplication across 5 routes):
 *   - All 5 routes share the same canonical pipeline (getAuthContext →
 *     role gate → strict body parsing → Idempotency-Key UUID v4 →
 *     idempotency wrap → canonical tx boundary → command adapter →
 *     error map).
 *   - The repo convention (e.g. `commission-ledger/[id]/[action]/route.ts`)
 *     inlines the same boilerplate; but with 5 routes for F0 the duplication
 *     would be > 250 LOC of identical glue. The shared helper is the smallest
 *     surface that keeps each route's body to its command-specific body
 *     validation.
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
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, PrismaClient } from '@prisma/client';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext, type AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
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

/**
 * Standard pipeline:
 *   1. getAuthContext → 401 on missing/invalid session
 *   2. role gate (ADMIN/HR_MANAGER) → 403 otherwise
 *   3. parse JSON body (route-supplied parser) → 400 VALIDATION if invalid
 *   4. read Idempotency-Key UUID v4 → 400 IDEMPOTENCY_REQUIRED if missing/bad
 *   5. withIdempotency wrap (with raw PrismaClient, NOT inside tx — C-04):
 *        handler() => withDbContext(prisma, ctx, tx => run(tx, ctx, parsed))
 *   6. surface idempotent replay with `replayed: true` (C-04)
 *   7. map PlacementError → canonical HTTP status (C-07)
 *
 * @param req NextRequest
 * @param route canonical route string (matches `withIdempotency.scope`)
 * @param parseBody strict body parser — returns `{ ok, value }` or `{ ok:false, error, message }`
 * @param run the command-specific adapter invocation `(tx, ctx, parsed) => Promise<unknown>`
 * @param statusCode success status (201 for create, 200 for transitions)
 */
export async function runPlacementCommand<TParsed, TResult>(
  req: NextRequest,
  args: {
    route: string;
    parseBody: (raw: unknown) =>
      | { ok: true; value: TParsed }
      | { ok: false; error: string; message: string };
    run: (tx: Prisma.TransactionClient, ctx: AuthContext, value: TParsed) => Promise<TResult>;
    statusCode: number;
  },
): Promise<NextResponse> {
  // 1. Auth
  let ctx: AuthContext;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  // 2. Role gate
  if (!ALLOWED_PLACEMENT_ROLES.has(ctx.role as 'ADMIN' | 'HR_MANAGER')) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền placement command` },
      { status: 403 },
    );
  }

  // 3. Strict body parsing
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }
  const parsed = args.parseBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });
  }

  // 4. Idempotency-Key UUID v4
  const idemKey = readIdempotencyKey(req);
  if (!idemKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header x-idempotency-key (UUID v4) bắt buộc' },
      { status: 400 },
    );
  }
  if (!isUuidV4(idemKey)) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key phải là UUID v4' },
      { status: 400 },
    );
  }

  const prisma: PrismaClient = getPrisma();

  // 5. Single transaction boundary (C-03): withDbContext wraps the command.
  //    withIdempotency runs OUTSIDE the transaction (C-04) — its `prisma` arg
  //    is the raw client, NOT `tx`.
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
    return NextResponse.json(
      { ...(result.body as object), replayed: result.replayed },
      { status: result.statusCode },
    );
  } catch (e) {
    if (e instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: e.message }, { status: 409 });
    }
    if (e instanceof PlacementError) {
      const { status, code } = placementErrorStatus(e);
      const body: Record<string, unknown> = { error: code, message: e.message };
      if (e instanceof PlacementValidationError && e.details) body.details = e.details;
      return NextResponse.json(body, { status });
    }
    // Generic 500 — do NOT leak internal error message (C-07).
    console.error(
      `[placement command ${args.route}] error:`,
      e instanceof Error ? e.message : 'unknown',
    );
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
