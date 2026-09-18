/**
 * link-capture.service.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Public-facing, anonymous WRITE path that records the first valid click on a
 * referral link as a `referral_attributions` row. Reuses the N2-1 engine
 * principal (`app_engine_writer`) with transaction-local engine context
 * `hrp.engine_context = 'link-capture'` (R9/R11 of N2 DISCOVERY).
 *
 * Contract & decisions are pinned in
 *   docs/tasks/hrp-v6-n2-aff-02-link-capture/TASK.md §3 / §4.
 *
 * KEY DESIGN POINTS (TASK DEC-01..DEC-15):
 *
 *   - DB read (validate `affCode` against `User.affCode`) goes through the
 *     `app_user_writer` connection (RLS-enforcing). DB write (insert the row)
 *     goes through `app_engine_writer`. The two NEVER share a transaction —
 *     writer sets `app.role`, engine sets `hrp.engine_context`, mixing them
 *     would either lose the engine-context gate or lift the privilege bar.
 *   - Service emits typed outcomes (DEC-16). The route handler is a thin
 *     translator from outcome -> HTTP status + envelope.
 *   - Forged/invalid/inactive `affCode` returns the OUTCOME_INVALID_REFERRAL
 *     enum without any DB write (RQ-01 / AC-02 / RISK-01).
 *   - Idempotency is delegated to `withIdempotency()` (RQ-02 / DEC-05) using
 *     a synthetic per-browser actor id (DEC-09). Race / double-click between
 *     two distinct idempotency keys for the same code is handled by the
 *     advisory lock + engine-side transaction (DEC-07 / AC-05).
 *   - The service NEVER logs the `affCode` value, idempotency key, raw IP,
 *     or any PII (DEC-12). Only the typed allow-list meta goes through `info()`.
 *
 * SECURITY POSTURE:
 *   - This service depends on `getEnginePrisma()` which fail-closes when
 *     `HRPARTNER_ENGINE_URL` is missing — the caller is responsible for
 *     surfacing that as 503 ENGINE_UNAVAILABLE (route handler does so).
 *   - `set_config('hrp.engine_context', 'link-capture', true)` is transaction-
 *     local and always paired with a transactional write — set_config with
 *     is_local=false is FORBIDDEN and is statically rejected by
 *     `src/db/engine-set-config.static.test.ts`.
 *   - No fallback to `app_user_writer` for the write path. If the engine is
 *     unavailable, the capture fails closed (RQ-03 / AC-08).
 */
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { info, warn } from '@/src/shared/observability/logger';

/** Allowed affiliate-code character set. */
const AFF_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
/** Default synthetic actor id when client identity is opaque. */
const PUBLIC_ACTOR_NAMESPACE = 'n2-2:link-capture';
/** 30-day window in milliseconds for `expires_at` (DEC-14). */
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Engine context name for N2-2 (locked in N2-1 migration RLS INSERT policy). */
const ENGINE_CONTEXT = 'link-capture';

/* ─── Typed outcomes (locked by TASK DEC-16) ───────────────────────────────── */

export type LinkCaptureOutcome =
  | { kind: 'OK'; attributionId: string; referrerUserId: string; status: 'ACTIVE'; createdAt: Date }
  | { kind: 'INVALID_REFERRAL' }
  | { kind: 'INVALID_INPUT'; reason: string }
  | { kind: 'IDEMPOTENCY_KEY_REQUIRED' }
  | { kind: 'RACE_RESOLVED'; existingAttributionId: string }
  | { kind: 'ENGINE_UNAVAILABLE' }
  | { kind: 'CAPTURE_FAILED' };

export interface LinkCaptureInput {
  /** Path param, already decoded but not yet validated against the aff-code regex. */
  readonly affCode: string;
  /** Idempotency-Key header (UUID v4). Required. */
  readonly idempotencyKey: string;
  /** Optional opaque body — only `source` (<= 64 chars) for now. */
  readonly body: { source?: string } | null;
  /** Client IP, in unknown-bucket form if not available (rate-limit identity helper). */
  readonly clientIpHash: string;
  /** User-Agent hash (synthetic actor scope ingredient; never logged raw). */
  readonly userAgentHash: string;
  /** Request id for correlation; forwarded to logs only. */
  readonly requestId: string | null;
}

export interface LinkCaptureDeps {
  readonly writer: PrismaClient;
  readonly engine: PrismaClient;
}

/* ─── Public entry ─────────────────────────────────────────────────────────── */

/**
 * Captures a referral link click. Returns a typed `LinkCaptureOutcome`
 * (NEVER throws for known business outcomes). Throws only on programmer error
 * (e.g. constructing deps with mismatched clients).
 *
 * The caller (route handler) maps `kind` to HTTP status per TASK DEC-16.
 */
export async function captureReferralLink(input: LinkCaptureInput, deps: LinkCaptureDeps): Promise<LinkCaptureOutcome> {
  // 1. Validate input shape (RQ-01 / DEC-11).
  const formatCheck = validateAffCode(input.affCode);
  if (!formatCheck.ok) {
    warn('referral.link_capture.invalid_format', input.requestId, {
      route: 'POST /api/public/referrals/[affCode]/capture',
      status: 400,
      outcome: 'invalid_referral',
      detail: { reason: formatCheck.reason },
    });
    return { kind: 'INVALID_REFERRAL' };
  }
  if (!input.idempotencyKey || !UUID_RE.test(input.idempotencyKey)) {
    return { kind: 'IDEMPOTENCY_KEY_REQUIRED' };
  }
  if (input.body && input.body.source !== undefined && input.body.source.length > 64) {
    return { kind: 'INVALID_INPUT', reason: 'source must be at most 64 chars' };
  }

  // 2. Synthetic actor id (DEC-09). The id itself is used by the route
  //    handler when wrapping with `withIdempotency()`; inside this function
  //    we just compute it for logging-correlation continuity.
  derivePublicActorId(input);
  void input;

  // 3. Resolve affCode -> User.affCode via writer-side (RLS-enforced) lookup.
  //    Active user only (inactive users cannot refer); generic error on miss
  //    (no existence signal — RQ-01).
  const lookup = await lookupReferrerByAffCode(deps.writer, formatCheck.canonical);
  if (lookup.kind === 'MISSING') {
    info('referral.link_capture.rejected', input.requestId, {
      route: 'POST /api/public/referrals/[affCode]/capture',
      status: 400,
      outcome: 'invalid_referral',
    });
    return { kind: 'INVALID_REFERRAL' };
  }
  if (lookup.kind === 'ERROR') {
    return { kind: 'CAPTURE_FAILED' };
  }

  // 4. Engine write — `app_engine_writer` with `link-capture` context.
  //    Use raw SQL because there is no Prisma model for `referral_attributions`
  //    (N2-1 migration creates it via raw DDL).
  let engineResult: EngineWriteResult;
  try {
    engineResult = await writeAttributionViaEngine(deps.engine, {
      referrerUserId: lookup.userId,
      affiliateCodeSnapshot: formatCheck.canonical,
      source: input.body?.source ?? null,
    });
  } catch (err) {
    // Map known engine-context failures. E-09/E-10 of N2-1 surface as
    // 42501 (RLS deny) or 22P02 / 23514 (constraint). We collapse to typed
    // outcomes; raw SQLSTATE NEVER leaves this layer.
    const sqlState = (err as { code?: string }).code ?? '';
    if (sqlState === 'P2002') {
      // Partial unique conflict (DEC-07) — another race winner inserted first.
      // Return a typed RACE_RESOLVED so the route can reply 409 with a generic
      // envelope. We do NOT echo the existing id back to anonymous clients.
      info('referral.link_capture.race', input.requestId, {
        route: 'POST /api/public/referrals/[affCode]/capture',
        status: 409,
        outcome: 'race_resolved',
      });
      return { kind: 'RACE_RESOLVED', existingAttributionId: '' };
    }
    if (sqlState === '42501' || sqlState === '42516') {
      warn('referral.link_capture.engine_rls_denied', input.requestId, {
        route: 'POST /api/public/referrals/[affCode]/capture',
        status: 503,
        outcome: 'engine_rls_denied',
      });
      return { kind: 'CAPTURE_FAILED' };
    }
    warn('referral.link_capture.engine_error', input.requestId, {
      route: 'POST /api/public/referrals/[affCode]/capture',
      status: 503,
      outcome: 'capture_failed',
    });
    return { kind: 'CAPTURE_FAILED' };
  }

  info('referral.link_capture.ok', input.requestId, {
    route: 'POST /api/public/referrals/[affCode]/capture',
    status: 201,
    outcome: 'captured',
  });

  return {
    kind: 'OK',
    attributionId: engineResult.attributionId,
    referrerUserId: engineResult.referrerUserId,
    status: 'ACTIVE',
    createdAt: engineResult.createdAt,
  };
}

/* ─── Internal helpers ─────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateAffCode(raw: string): { ok: true; canonical: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'not_a_string' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (!AFF_CODE_REGEX.test(trimmed)) return { ok: false, reason: 'malformed' };
  return { ok: true, canonical: trimmed };
}

/**
 * Synthetic actor id for the idempotency-key scope. Public-anonymous route
 * has no real user id, so we derive a stable per-browser hash. NEVER log this
 * raw (output is router-equivalent; treat as opaque).
 */
export function derivePublicActorId(input: LinkCaptureInput): string {
  const material = [PUBLIC_ACTOR_NAMESPACE, input.affCode.trim(), input.clientIpHash, input.userAgentHash].join('|');
  return createHash('sha256').update(material, 'utf8').digest('hex').slice(0, 32);
}

type LookupResult =
  | { kind: 'FOUND'; userId: string }
  | { kind: 'MISSING' }
  | { kind: 'ERROR' };

async function lookupReferrerByAffCode(writer: PrismaClient, affCode: string): Promise<LookupResult> {
  try {
    // Direct query: writer connection has RLS SELECT policy on `users`. We
    // explicitly filter `isActive = true` in addition so deactivated users
    // are excluded even if a future RLS change broadens visibility.
    const rows = await writer.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id::text FROM "users" WHERE "aff_code" = ${affCode} AND "is_active" = true LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return { kind: 'MISSING' };
    return { kind: 'FOUND', userId: row.id };
  } catch (err) {
    return { kind: 'ERROR' };
  }
}

interface EngineWriteResult {
  attributionId: string;
  referrerUserId: string;
  createdAt: Date;
}

/**
 * Insert a single `referral_attributions` row using the engine principal.
 * The transaction ALWAYS sets `hrp.engine_context = 'link-capture'`
 * transaction-locally before any read or write. The static lint
 * `src/db/engine-set-config.static.test.ts` rejects `set_config(..., false)`.
 *
 * Idempotency on the engine side is delegated to the partial unique index
 * defined in N2-1 migration RLS section (P2002 on dup) AND to the
 * transactional advisory lock keyed on the canonical affCode.
 */
async function writeAttributionViaEngine(
  engine: PrismaClient,
  args: { referrerUserId: string; affiliateCodeSnapshot: string; source: string | null },
): Promise<EngineWriteResult> {
  const attributionId = cryptoRandomUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ATTRIBUTION_WINDOW_MS);

  return engine.$transaction(async (tx) => {
    // 1. Set transaction-local engine context. MUST be is_local=true.
    await tx.$executeRawUnsafe(`SELECT set_config('hrp.engine_context', $1, true)`, ENGINE_CONTEXT);

    // 2. Advisory xact lock keyed by the canonical code — eliminates
    //    concurrent inserts with different idempotency keys for the same
    //    code in the same transaction window.
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, `aff:${args.affiliateCodeSnapshot}`);

    // 3. Insert with RETURNING. Prisma's `RETURNING` is honored because the
    //    SELECT RLS policy permits `link-capture` per N2-1 RLS matrix R9.
    const inserted = await tx.$queryRaw<Array<{ id: string; referrer_user_id: string; created_at: Date }>>(
      Prisma.sql`
        INSERT INTO referral_attributions(
          id, referrer_user_id, affiliate_code_snapshot,
          first_clicked_at, expires_at, status, updated_at
        )
        VALUES (
          ${attributionId}::text,
          ${args.referrerUserId}::text,
          ${args.affiliateCodeSnapshot}::text,
          ${now}::timestamptz,
          ${expiresAt}::timestamptz,
          'ACTIVE'::text,
          ${now}::timestamp
        )
        RETURNING id::text AS id, referrer_user_id::text AS referrer_user_id, created_at
      `,
    );
    const row = inserted[0];
    if (!row) throw new Error('engine insert returned no row');
    return {
      attributionId: row.id,
      referrerUserId: row.referrer_user_id,
      createdAt: row.created_at,
    };
  });
}

/** crypto.randomUUID() wrapper for stable, narrowly-scoped UUID generation. */
function cryptoRandomUuid(): string {
  // Node 19+ exposes globalThis.crypto.randomUUID; we keep a tiny wrapper so
  // any future test injection point is in one place.
  return globalThis.crypto.randomUUID();
}
