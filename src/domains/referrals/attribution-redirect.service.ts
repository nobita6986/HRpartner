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
 * Security model:
 *   - Referrer lookup: `findActivePublicReferrerByAffCode` named boundary
 *     (src/domains/referrals/referral-public-lookup.ts).  Boundary enforces
 *     writer role/grant — there is no row-level policy on `users` today; that
 *     is a separate CRITICAL additive slice (BLK-01).  Fixed projection (`id`
 *     only) prevents PII leakage.  Fail-closed: any DB error throws.
 *   - Cookie row verification: engine tx + writer role lookup (split client).
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
} from './redirect-token';
import {
  findActivePublicReferrerByAffCode,
} from './referral-public-lookup';

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

  // 4. Check existing attribution cookie (independent of currently-clicked code).
  // DEC-AFF-010 (first valid source wins): the cookie's row IS the authority.
  // The currently-clicked code's referrer is irrelevant here — we re-verify
  // the row itself (still ACTIVE, not expired, referrer still active).  Any
  // failure → cookie is untrusted, fall through to a fresh write from the
  // current click's code.
  if (input.hrpAffCookie) {
    const parsed = verifyAttributionToken(input.hrpAffCookie);
    if (parsed) {
      const verified = await verifyCookieAgainstRow(
        deps.engine,
        deps.writer,
        parsed.attributionId,
      );
      if (verified.kind === 'OK') {
        info('referral.redirect.existing_wins', input.requestId, {
          route: 'GET /r/[code]',
          outcome: 'redirect_existing',
        });
        return { kind: 'REDIRECT_EXISTING', destination };
      }
      // ROW_GONE / REFERRER_INACTIVE / ERROR → untrusted, fall through.
    }
  }

  // 5. Create new attribution via engine writer.
  // No Idempotency-Key, no advisory lock, no synthetic actor (Decision A §3).
  // Concurrent initial clicks without a cookie may create orphan rows in
  // dev/test — explicitly accepted as out-of-scope for N2-2 per Decision A.
  let attributionId: string;
  try {
    attributionId = await writeAttributionViaEngine(deps.engine, {
      referrerUserId: referrer.userId,
      affiliateCodeSnapshot: input.affCode.trim(),
    });
  } catch (err) {
    // NOTE: We do NOT special-case P2002 here.  No business-key unique
    // constraint supports a race-winner claim, and even if the underlying
    // PK insert collided (astronomically rare UUID collision), mapping to
    // REDIRECT_EXISTING without a cookie for the race winner would set the
    // browser's cookie to *this* request's value — which is NOT the winner.
    // Decision A §3 explicitly accepts orphan initial rows; treating any
    // write failure as WRITE_FAILED is the correct fail-closed posture.
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

/**
 * Lookup the active referrer via the `referral-public-lookup` named boundary.
 *
 * P2 fix (round-5 audit): replaced direct `writer.$queryRaw` with the named
 * boundary so downstream code (including static gates) can audit the exact
 * projection and surface.  Fail-closed: any DB error → `ERROR`.
 */
async function lookupActiveReferrer(
  writer: PrismaClient,
  affCode: string,
): Promise<ReferrerResult> {
  try {
    const row = await findActivePublicReferrerByAffCode(writer, affCode);
    if (!row) return { kind: 'MISSING' };
    return { kind: 'FOUND', userId: row.id };
  } catch {
    return { kind: 'ERROR' };
  }
}

/* ─── Cookie row verification (independent of currently-clicked code) ── */

/**
 * Cookie verification result.
 * - OK: row exists, ACTIVE, not expired, row's referrer is still active in `users`.
 * - ROW_GONE: row was deleted / expired / revoked / status != ACTIVE.
 * - REFERRER_INACTIVE: row is otherwise valid but its stored referrer is no longer
 *   active.  Treat as untrusted (cookie carries an attribution that can no longer
 *   be honored downstream).
 * - ERROR: lookup itself failed (DB unreachable / RLS deny / unexpected).  Caller
 *   should also treat as untrusted.
 */
type CookieVerification =
  | { kind: 'OK' }
  | { kind: 'ROW_GONE' }
  | { kind: 'REFERRER_INACTIVE' }
  | { kind: 'ERROR' };

/**
 * Verify the cookie's row exists, is valid, and its own referrer is still active.
 *
 * CRITICAL: this verification is INDEPENDENT of the currently-clicked affiliate code.
 * Per DEC-AFF-010, the cookie's row is the authority for attribution — switching
 * to a different referrer's code does NOT overwrite the existing attribution.
 *
 * Reads are split across two clients (engine + writer) because:
 *   - The row read needs `app_engine_writer` + `hrp.engine_context='link-capture'`
 *     (set_config enforced transaction-locally to satisfy the `hrp_ra_select_engine`
 *     RLS policy — see N2-1 migration).
 *   - The `users` referrer lookup must go through `app_user_writer` RLS (the engine
 *     role has no read policy on `users`); we deliberately use writer-side so the
 *     answer reflects the user-facing definition of "active referrer".
 */
async function verifyCookieAgainstRow(
  engine: PrismaClient,
  writer: PrismaClient,
  attributionId: string,
): Promise<CookieVerification> {
  // 1. Read the row via engine (RLS-gated read).
  let rowReferrerUserId: string;
  try {
    const rows = await engine.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('hrp.engine_context', $1, true)`,
        ENGINE_CONTEXT,
      );
      return tx.$queryRaw<Array<{ referrer_user_id: string }>>(
        Prisma.sql`
          SELECT referrer_user_id::text AS referrer_user_id
          FROM referral_attributions
          WHERE id = ${attributionId}
            AND status = 'ACTIVE'
            AND expires_at > NOW()
          LIMIT 1
        `,
      );
    });
    const row = rows[0];
    if (!row) return { kind: 'ROW_GONE' };
    rowReferrerUserId = row.referrer_user_id;
  } catch {
    return { kind: 'ERROR' };
  }

  // 2. Verify the row's OWN referrer is still active in `users` (writer-side RLS).
  // This is intentionally NOT the currently-clicked code's referrer.
  try {
    const users = await writer.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id::text AS id
        FROM "users"
        WHERE id = ${rowReferrerUserId}::text
          AND "is_active" = true
        LIMIT 1
      `,
    );
    if (!users[0]) return { kind: 'REFERRER_INACTIVE' };
    return { kind: 'OK' };
  } catch {
    return { kind: 'ERROR' };
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
