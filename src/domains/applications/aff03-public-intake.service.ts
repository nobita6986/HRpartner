/**
 * aff03-public-intake.service.ts
 * Task: hrp-v6-n2-aff-03b-rls-runtime-fix (slice 03b of hrp-v6-n2-aff-03-apply-attribution).
 *
 * Anonymous public intake orchestrator (rounds 0..4, T0 verdict ACCEPTED).
 * Reads the signed `hrp_aff` cookie, verifies HMAC integrity + server-clock
 * expiry + key version, looks up the ReferralAttribution row by id under
 * the writer role. The service-level pre-filter enforces
 * `status='ACTIVE' AND expires_at > now()` BEFORE handing a non-null
 * `referralAttributionId` to the RPC.
 *
 * The full write chain — signal normalization + `scoreAndClassify` (≥2-signal
 * EXACT_MATCH rule preserved, mirrors `src/domains/talent/labor-profile.service.ts:108-184`)
 * + `INSERT labor_profiles` + `INSERT placement_cases` + `INSERT candidate_submissions`
 * + `UPDATE referral_attributions` + `INSERT labor_profile_handling_assignments`
 * — is owned by the SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)`
 * (migration `20260919100000_aff03b_public_intake_rpc`). The RPC runs under
 * `hrp_public_rpc` (NOLOGIN BYPASSRLS, DEC-14); RLS policies do not apply to
 * the definer path, so the only DB-level guard on the UPDATE is the WHERE
 * predicate `AND status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL`
 * (DEC-11 (c)).
 *
 * The Prisma writer `createCandidateSubmissionFromIntake` is **NOT** called
 * from this service for the anon path (DEC-01, DEC-11). It is preserved for
 * non-anon flows (staff intake, admin tools) and its semantics are unchanged.
 *
 * FAIL-SAFE: forged / expired / missing / non-active cookie → silent no-op
 * (`referralAttributionId = null`). The route returns 201 with the standard
 * DTO. NO identity leak, NO log line that distinguishes forged from missing.
 *
 * RLS posture (DEC-14):
 *   - The anon route does NOT set `app.role` GUC; the writer connection runs
 *     as `app_user_writer` with FORCE RLS enabled.
 *   - `INSERT labor_profiles` under FORCE RLS via the Prisma writer is denied
 *     by `hrp_labor_profile_scope` → SQLSTATE 42501. We work around it by
 *     delegating to the SECURITY DEFINER RPC, which runs as `hrp_public_rpc`
 *     (BYPASSRLS) and therefore is not gated by the writer policies.
 *   - The 2 writer policies from `20260918100000_*`
 *     (`hrp_ra_select_writer`, `hrp_ra_update_writer`) stay in place for
 *     non-anon paths that still use the Prisma writer.
 *
 * IDEMPOTENCY: idempotency-key closure is wrapped at the route layer using
 * `withIdempotency` from `src/shared/integrity/idempotency.ts`. Replay
 * returns the same response without re-invoking this service, so
 * `ReferralAttribution.consumedAt` cannot be overwritten on replay (the RPC
 * body's WHERE predicate also gates this — DEC-11 (c)).
 *
 * DTO: response keys = `{ candidateSubmissionId, laborProfileId, placementCaseId, verdict }`.
 * NEVER `referrerUserId`, NEVER `attributionId`, NEVER any referrer identity.
 */
import type { Prisma } from '@prisma/client';
import { verifyAttributionToken } from '@/src/domains/referrals/redirect-token';

/** Name of the HttpOnly cookie set by `/r/[code]` (N2-2). */
export const HRP_AFF_COOKIE = 'hrp_aff';

export interface PublicIntakeInput {
  fullName: string;
  phone: string;
  cccdNumber?: string | null;
  dateOfBirth?: string | null;
  consentAt?: string | Date | null;
}

export interface PublicIntakeResult {
  candidateSubmissionId: string;
  laborProfileId: string | null;
  placementCaseId: string;
  verdict: 'EXACT_MATCH' | 'POSSIBLE_MATCH' | 'NEW_PROFILE';
}

/**
 * Minimal projection of `hrp_score_labor_profile.candidate` for the
 * POSSIBLE_MATCH_NOT_RESOLVED error surface. Mirrors the
 * `LaborProfileMatchResult.candidates` shape from
 * src/domains/talent/labor-profile.types.ts.
 */
export interface PossibleMatchCandidateRow {
  laborProfileId: string;
  signalsMatched: string[];
  conflictingEvidence: Array<{ signal: string; existing: unknown }>;
}

export class PossibleMatchNotResolvedError extends Error {
  constructor(
    public readonly match: {
      verdict: 'POSSIBLE_MATCH';
      candidates: PossibleMatchCandidateRow[];
      signalsProvided: number;
    },
  ) {
    super('POSSIBLE_MATCH chưa được caller resolve; vui lòng chọn candidate hoặc tạo mới rõ ràng');
    this.name = 'PossibleMatchNotResolvedError';
  }
}

/** Row shape returned by `hrp_public_intake_submission`. */
interface IntakeRpcRow {
  labor_profile_id: string | null;
  candidate_submission_id: string | null;
  placement_case_id: string | null;
  verdict: 'EXACT_MATCH' | 'NEW_PROFILE' | 'POSSIBLE_MATCH';
  possible_match: unknown | null;
  attribution_consumed: boolean;
}

/**
 * Public anon N1 apply orchestrator (slice 03b). Delegates the full write
 * chain to the SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)`.
 *
 * The Prisma writer `createCandidateSubmissionFromIntake` is NOT called
 * here — that path is for non-anon flows (staff intake, admin tools).
 *
 * Silent fail-safe: any cookie verify failure (forged / expired / missing
 * secret / TOKEN_SIGNING_ERROR) or attribution row miss → returns the
 * standard DTO with `referralAttributionId = null`; the RPC still runs and
 * creates the LaborProfile + PlacementCase + CandidateSubmission without an
 * attribution bind.
 */
export async function submitPublicIntake(
  tx: Prisma.TransactionClient,
  input: {
    applicant: PublicIntakeInput;
    channel?: 'PUBLIC_MARKETPLACE';
    intent?: 'JOB_INTEREST' | 'GENERAL_INTEREST';
    projectId?: string | null;
    /** Optional jobOpeningId (audit metadata only; NOT persisted to schema). */
    jobOpeningId?: string | null;
    /** The raw `hrp_aff` cookie value (or null if absent). */
    hrpAffCookie: string | null;
    /** Anonymous actor id for audit (a stable system id; not a referrer). */
    actorId: string;
  },
): Promise<PublicIntakeResult> {
  // (a) Service-level pre-filter: silent fail-safe (DEC-04, DEC-11 (a)).
  const referralAttributionId = await resolveActiveAttributionId(tx, input.hrpAffCookie);

  // (b)+(c) RPC-body probe + WHERE predicate handle the DB-level guard
  // (DEC-11 (b)+(c)). The Prisma $queryRaw goes through the SECURITY DEFINER
  // RPC which runs as hrp_public_rpc (BYPASSRLS, DEC-14).
  const payload = {
    fullName: input.applicant.fullName,
    phone: input.applicant.phone,
    cccdNumber: input.applicant.cccdNumber ?? null,
    dateOfBirth: input.applicant.dateOfBirth ?? null,
    consentAt: input.applicant.consentAt
      ? input.applicant.consentAt instanceof Date
        ? input.applicant.consentAt.toISOString()
        : input.applicant.consentAt
      : null,
    intent: input.intent ?? 'JOB_INTEREST',
    channel: input.channel ?? 'PUBLIC_MARKETPLACE',
    projectId: input.projectId ?? null,
    jobOpeningId: input.jobOpeningId ?? null,
    actorId: input.actorId,
    referralAttributionId,
  };

  const rows = await tx.$queryRaw<IntakeRpcRow[]>`
    SELECT * FROM hrp_public_intake_submission(${JSON.stringify(payload)}::jsonb)
  `;

  return mapRpcToDto(rows);
}

/**
 * Resolve the signed cookie → ReferralAttribution row, with server-clock and
 * status guards. Returns null for any failure (silent fail-safe).
 *
 * Projection is minimal: `{ id, referrerUserId, status, expiresAt }` only.
 * No PII, no timestamps beyond expiresAt, no affiliateCodeSnapshot.
 *
 * DEC-05: `TOKEN_SIGNING_ERROR` (missing/short `RATE_LIMIT_HASH_SECRET`) is
 * caught here and converted to null — NOT re-thrown. The route returns 201
 * with `referralAttributionId=null`.
 */
export async function resolveActiveAttributionId(
  tx: Prisma.TransactionClient,
  hrpAffCookie: string | null,
): Promise<string | null> {
  if (!hrpAffCookie || hrpAffCookie.length === 0) return null;

  // 1. Verify HMAC + key version. The verify util rejects expired tokens
  //    (server-clock enforcement inside the token). DEC-05: catch
  //    TOKEN_SIGNING_ERROR (missing/short secret) and silent-no-op.
  let payload: { attributionId: string; expiresAt: number; keyVersion: number } | null = null;
  try {
    payload = verifyAttributionToken(hrpAffCookie);
  } catch {
    return null;
  }
  if (!payload) return null;

  // 2. Look up the row by id. Projection is minimal (DEC-07).
  const row = await tx.referralAttribution.findUnique({
    where: { id: payload.attributionId },
    select: {
      id: true,
      referrerUserId: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!row) return null;

  // 3. Server-clock guard (RQ-09, DEC-04, DEC-11 (a)): cookie expiresAt is
  //    per the token, but the attribution row also has its own expiresAt
  //    (source of truth for "the link is still good"). Enforce
  //    `expires_at > now()` AND `status='ACTIVE'` BEFORE handing the id to
  //    the RPC.
  if (row.status !== 'ACTIVE') return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  return row.id;
}

/**
 * Map the SECURITY DEFINER RPC's 6-tuple row to the public DTO. Translates
 * `POSSIBLE_MATCH` into a thrown `PossibleMatchNotResolvedError` so the
 * route's existing catch block emits `409 POSSIBLE_MATCH_NOT_RESOLVED`
 * (matches legacy behavior).
 */
function mapRpcToDto(rows: IntakeRpcRow[]): PublicIntakeResult {
  if (rows.length !== 1) {
    throw new Error(`hrp_public_intake_submission returned ${rows.length} rows; expected 1`);
  }
  const r = rows[0];

  if (r.verdict === 'POSSIBLE_MATCH') {
    const possibleMatch = (r.possible_match ?? {}) as {
      candidates?: unknown;
      signalsProvided?: number;
    };
    const candidates = Array.isArray(possibleMatch.candidates)
      ? (possibleMatch.candidates as PossibleMatchCandidateRow[])
      : [];
    throw new PossibleMatchNotResolvedError({
      verdict: 'POSSIBLE_MATCH',
      candidates,
      signalsProvided: Number(possibleMatch.signalsProvided ?? 0),
    });
  }

  if (r.verdict !== 'EXACT_MATCH' && r.verdict !== 'NEW_PROFILE') {
    throw new Error(`Unexpected verdict from hrp_public_intake_submission: ${r.verdict}`);
  }

  if (
    !r.labor_profile_id ||
    !r.candidate_submission_id ||
    !r.placement_case_id
  ) {
    throw new Error(
      `hrp_public_intake_submission returned NULL ids for verdict=${r.verdict}`,
    );
  }

  return {
    candidateSubmissionId: r.candidate_submission_id,
    laborProfileId: r.labor_profile_id,
    placementCaseId: r.placement_case_id,
    verdict: r.verdict,
  };
}
