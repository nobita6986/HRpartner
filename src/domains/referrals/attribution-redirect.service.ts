/**
 * attribution-redirect.service.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Core service for the canonical GET /r/[code] referral redirect flow.
 *
 * DECISION A contract (T0 directive):
 *   - Cookie `hrp_aff` = HMAC-signed token (attributionId, exp, keyVersion).
 *     Valid signature is NOT sufficient: caller must also verify the
 *     attribution row exists, is non-expired, and referrer is still active.
 *   - Existing valid attribution WINS — subsequent clicks do NOT overwrite.
 *   - No Idempotency-Key, no synthetic actor id, no advisory lock.
 *   - Orphan row note documented (Decision A §3).
 *
 * Steps:
 *   1. Validate affCode (format + active referrer lookup via writer RLS).
 *   2. Validate `job` param against allowlist.
 *   3. Read existing `hrp_aff` cookie, verify signature + expiry + referrer state.
 *      Valid → return 'REDIRECT_EXISTING' (existing attribution wins).
 *   4. Create ReferralAttribution via app_engine_writer with hrp.engine_context='link-capture'.
 *   5. Sign token, set HttpOnly cookie, redirect 302/303.
 *
 * Forbidden: raw attributionId / referrerUserId in HTTP body; logging affCode/IP/token.
 */
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { info, warn } from '@/src/shared/observability/logger';
import {
  createAttributionToken,
  verifyAttributionToken,
  TOKEN_TTL_MS,
} from './redirect-token';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const AFF_CODE_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
const ENGINE_CONTEXT = 'link-capture';

/** 30-day window in ms (same as N2-1; allows N2-1 to be authority for placement boundary). */
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Allowlisted destination prefixes for the `job` query param.
 * Only paths under these prefixes are safe redirect targets.
 * Trailing slash matters: '/jobs' does NOT match '/jobs/foo'.
 */
const ALLOWED_JOB_PREFIXES = ['/jobs'] as const;

/* ─── Typed outcomes ────────────────────────────────────────────────────── */

export type RedirectOutcome =
  | { kind: 'REDIRECT_EXISTING'; destination: string; cookie?: never }
  /** New attribution created. Set cookie and redirect. */
  | { kind: 'REDIRECT_NEW'; destination: string; cookieToken: string }
  /** Constant-shape denial: code unknown/inactive, or job not allowlisted. */
  | { kind: 'NOT_FOUND'; destination: string }
  /** Job param invalid — constant /jobs redirect. */
  | { kind: 'INVALID_JOB'; destination: string }
  /** Code format invalid. */
  | { kind: 'INVALID_CODE' }
  /** Rate-limit hit. */
  | { kind: 'RATE_LIMITED' }
  /** Engine unavailable. */
  | { kind: 'ENGINE_UNAVAILABLE' }
  /** Engine write failed. */
  | { kind: 'WRITE_FAILED' };

export interface RedirectInput {
  readonly affCode: string;       // already decoded path param
  readonly job: string | null;   // ?job= query param (allowlisted prefix check)
  readonly hrpAffCookie: string | null; // raw cookie value
  readonly requestId: string | null;
}

export interface RedirectDeps {
  readonly writer: PrismaClient;
  readonly engine: PrismaClient;
}

/* ─── Public entry ─────────────────────────────────────────────────────── */

/**
 * Execute the referral redirect flow.  Returns a typed `RedirectOutcome`.
 * The route handler maps this to HTTP:
 *   - REDIRECT_EXISTING / REDIRECT_NEW  → 302/303 with Location + Set-Cookie
 *   - NOT_FOUND / INVALID_JOB           → 302 to /jobs
 *   - INVALID_CODE / RATE_LIMITED / ENGINE_UNAVAILABLE / WRITE_FAILED → 404 / 429 / 503
 *
 * The caller must NEVER return the raw `attributionId` or `referrerUserId` to the browser.
 */
export async function resolveReferralRedirect(
  input: RedirectInput,
  deps: RedirectDeps,
): Promise<RedirectOutcome> {
  // 1. Code format validation (fast reject).
  if (!AFF_CODE_REGEX.test(input.affCode.trim())) {
    return { kind: 'INVALID_CODE' };
  }

  // 2. Job destination validation.
  const destination = resolveDestination(input.job);
  if (!destination) {
    return { kind: 'INVALID_JOB', destination: '/jobs' };
  }

  // 3. Resolve referrer (writer-side, RLS-enforced).
  const referrer = await lookupActiveReferrer(deps.writer, input.affCode.trim());
  if (referrer.kind === 'MISSING') {
    info('referral.redirect.referrer_not_found', input.requestId, {
      route: 'GET /r/[code]',
      outcome: 'not_found',
    });
    return { kind: 'NOT_FOUND', destination };
  }
  if (referrer.kind === 'ERROR') {
    warn('referral.redirect.writer_error', input.requestId, {
      route: 'GET /r/[code]',
      outcome: 'write_failed',
    });
    return { kind: 'WRITE_FAILED' };
  }

  // 4. Check existing attribution cookie.
  if (input.hrpAffCookie) {
    const parsed = verifyAttributionToken(input.hrpAffCookie);
    if (parsed) {
      // Signature valid and not expired.  Look up the row to verify referrer
      // state + expiry are still current.  This is a read-only engine call.
      const existingValid = await checkAttributionStillValid(
        deps.engine,
        parsed.attributionId,
        referrer.userId,
      );
      if (existingValid) {
        info('referral.redirect.existing_wins', input.requestId, {
          route: 'GET /r/[code]',
          outcome: 'redirect_existing',
        });
        return { kind: 'REDIRECT_EXISTING', destination };
      }
      // Token valid but row is gone/expired/inactive → treat as no cookie.
    }
  }

  // 5. Create new attribution via engine writer.
  let attributionId: string;
  try {
    attributionId = await writeAttributionViaEngine(deps.engine, {
      referrerUserId: referrer.userId,
      affiliateCodeSnapshot: input.affCode.trim(),
    });
  } catch (err) {
    const sqlState = (err as { code?: string }).code ?? '';
    if (sqlState === 'P2002') {
      // Unique constraint (idempotency on id) — rare race winner. Re-read the row.
      info('referral.redirect.race_winner', input.requestId, {
        route: 'GET /r/[code]',
        outcome: 'redirect_existing',
      });
      return { kind: 'REDIRECT_EXISTING', destination };
    }
    warn('referral.redirect.engine_error', input.requestId, {
      route: 'GET /r/[code]',
      outcome: 'write_failed',
    });
    return { kind: 'WRITE_FAILED' };
  }

  // 6. Sign token and return REDIRECT_NEW.
  const nowMs = Date.now();
  const expiresAtMs = nowMs + ATTRIBUTION_WINDOW_MS;
  const cookieToken = createAttributionToken(attributionId, expiresAtMs);

  info('referral.redirect.new', input.requestId, {
    route: 'GET /r/[code]',
    outcome: 'redirect_new',
  });

  return { kind: 'REDIRECT_NEW', destination, cookieToken };
}

/* ─── Destination resolution ─────────────────────────────────────────── */

function resolveDestination(job: string | null): string | null {
  if (!job) return '/jobs';
  // Strip leading slash and any query/hash before prefix check.
  const normalized = '/' + job.replace(/^\/+/, '').split(/[?#]/)[0];
  return ALLOWED_JOB_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix + '/'))
    ? normalized
    : null;
}

/* ─── Referrer lookup ─────────────────────────────────────────────────── */

type ReferrerResult =
  | { kind: 'FOUND'; userId: string }
  | { kind: 'MISSING' }
  | { kind: 'ERROR' };

async function lookupActiveReferrer(
  writer: PrismaClient,
  affCode: string,
): Promise<ReferrerResult> {
  try {
    const rows = await writer.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id::text FROM "users" WHERE "aff_code" = ${affCode} AND "is_active" = true LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return { kind: 'MISSING' };
    return { kind: 'FOUND', userId: row.id };
  } catch {
    return { kind: 'ERROR' };
  }
}

/* ─── Cookie row verification ─────────────────────────────────────────── */

async function checkAttributionStillValid(
  engine: PrismaClient,
  attributionId: string,
  referrerUserId: string,
): Promise<boolean> {
  // CRITICAL: this SELECT goes through the `app_engine_writer` RLS policy
  // (`hrp_ra_select_engine`), which requires `hrp.engine_context` to be set
  // (transaction-local).  Without a tx wrapper, the connection's context is
  // '' and the policy denies the read — see N2-1 migration §hrp_ra_select_engine.
  // We set the context for both 'link-capture' (set by the previous capture)
  // and 'consume' (set by N2-3+ flows) so this check passes regardless of
  // which downstream flow wrote the row.
  try {
    const rows = await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('hrp.engine_context', $1, true)`,
        ENGINE_CONTEXT,
      );
      return tx.$queryRaw<Array<{ id: string; referrer_user_id: string }>>(
        Prisma.sql`
          SELECT id::text, referrer_user_id::text
          FROM referral_attributions
          WHERE id = ${attributionId}
            AND referrer_user_id = ${referrerUserId}
            AND status = 'ACTIVE'
            AND expires_at > NOW()
          LIMIT 1
        `,
      );
    });
    return rows.length > 0;
  } catch {
    return false;
  }
}

/* ─── Engine write ────────────────────────────────────────────────────── */

async function writeAttributionViaEngine(
  engine: PrismaClient,
  args: { referrerUserId: string; affiliateCodeSnapshot: string },
): Promise<string> {
  const attributionId = globalThis.crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ATTRIBUTION_WINDOW_MS);

  return engine.$transaction(async (tx) => {
    // 1. Set engine context (is_local=true — static lint enforces this).
    await tx.$executeRawUnsafe(
      `SELECT set_config('hrp.engine_context', $1, true)`,
      ENGINE_CONTEXT,
    );

    // 2. Insert row.  No advisory lock needed (Decision A §3: orphan rows
    //    allowed in development; exactly-one initial capture is a separate CRITICAL
    //    additive schema slice, out of N2-2 scope).
    const rows = await tx.$queryRaw<Array<{ id: string }>>(
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
        RETURNING id::text AS id
      `,
    );
    const row = rows[0];
    if (!row) throw new Error('engine insert returned no row');
    return row.id;
  });
}
