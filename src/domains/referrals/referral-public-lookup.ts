/**
 * referral-public-lookup.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * NAMED PUBLIC-LOOKUP BOUNDARY for the canonical GET /r/[code] redirect flow.
 *
 * Why this file exists (T0 directive — finding P2 of round-5 audit):
 *   - `attribution-redirect.service.ts` previously called `writer.$queryRaw`
 *     directly to read `users` by `aff_code + is_active`.  That bypassed the
 *     "no raw queryRaw in route/service" invariant enforced by static gates.
 *   - There is no row-level policy on `users` today (deliberately — adding
 *     `users` RLS is a separate CRITICAL additive production slice, see
 *     BLK-01 of HANDOFF.md).  Therefore the lookup is bounded by the **runtime
 *     writer role/grant** (`app_user_writer` LOGIN role + table GRANTs), NOT
 *     by a row-policy.
 *   - This helper packages that lookup with a FIXED PROJECTION (`id` only)
 *     so downstream code never sees PII fields, and with FAIL-CLOSED semantics
 *     (any error bubbles up — no silent fallback).
 *
 * Contract pin (mirrors `preauth-db.ts` shape — single named boundary, no
 * route/service can do this lookup by writing raw SQL).
 *
 *   - Caller passes the canonicalized affiliate code (already validated by
 *     `canonicalTrackingCode` / the service layer's `AFF_CODE_REGEX`).
 *   - Returns `{ id } | null` — `null` is the constant-shape "unknown or
 *     inactive" answer.  The route maps `null` to a 302 /jobs with no
 *     existence signal.
 *   - FAIL-CLOSED: any Prisma/Postgres error is thrown.  The caller decides
 *     the failure mode (typically `WRITE_FAILED` → 503).
 *
 * Out of scope (explicitly NOT done in N2-2):
 *   - Adding row-level policies to `users` (CRITICAL additive slice, BLK-01).
 *   - Adding an ADMIN GUC bootstrap here.  The writer role's GRANTs are the
 *     boundary today; if a future schema change adds a `users` row policy,
 *     this helper must evolve with it.
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * FIXED PROJECTION — do not extend.  Adding fields here would leak PII
 * (`phone`, `email`, `passwordHash`, …) into the service layer.
 *
 * The service only needs `id` to write the `referral_attributions` row.
 */
export interface PublicReferrerLookupRow {
  readonly id: string;
}

/**
 * Find an active referrer (user with `aff_code = :code AND is_active = true`).
 *
 * Returns `null` for "unknown or inactive" — caller must map this to the
 * constant-shape `NOT_FOUND` outcome (no existence signal).
 *
 * Throws on any database error (fail-closed).
 */
export async function findActivePublicReferrerByAffCode(
  writer: PrismaClient,
  affCode: string,
): Promise<PublicReferrerLookupRow | null> {
  const rows = await writer.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id::text AS id
      FROM "users"
      WHERE "aff_code" = ${affCode}::text
        AND "is_active" = true
      LIMIT 1
    `,
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id };
}
