/**
 * aff03-public-intake.service.ts
 * Task: hrp-v6-n2-aff-03-apply-attribution (AFF-03 Public apply attribution).
 *
 * Anonymous public intake orchestrator. Reads the signed `hrp_aff` cookie,
 * verifies HMAC integrity + server-clock expiry + key version, then looks up
 * the ReferralAttribution row by id under the writer role. Server-clock guard
 * `expires_at > now()` AND `status='ACTIVE'` are enforced BEFORE the writer
 * consumes the row. Passes `referralAttributionId` to the existing N1 intake
 * writer (`createCandidateSubmissionFromIntake`) which already has the wiring
 * to bind the attribution to the LaborProfile and create the initial
 * `LaborProfileHandlingAssignment` via `createInitialAffiliateAssignment`.
 *
 * FAIL-SAFE: forged / expired / missing / non-active cookie → silent no-op
 * (`referralAttributionId = null`). The route returns 201 with the standard
 * DTO. NO identity leak, NO log line that distinguishes forged from missing.
 *
 * RLS posture (round-2, Tier 0 verdict on BLK-01):
 *   - This slice's migration `20260918100000_aff03_writer_select_on_referral_attributions`
 *     adds `hrp_ra_select_writer` (SELECT to app_user_writer when status IN
 *     ('ACTIVE','CONSUMED')) and `hrp_ra_update_writer` (UPDATE gated to
 *     ACTIVE→CONSUMED transition).
 *   - Without that migration applied locally, `findUnique` and `update` will
 *     fail with SQLSTATE 42501. The CI Integration lane applies it before
 *     running `tests/db/aff03-public-intake.integration.test.ts`.
 *
 * IDEMPOTENCY: idempotency-key closure is wrapped at the route layer using
 * `withIdempotency` from `src/shared/integrity/idempotency.ts`. Replay
 * returns the same response without re-invoking this service, so
 * `ReferralAttribution.consumedAt` cannot be overwritten on replay.
 *
 * DTO: response keys = `{ candidateSubmissionId, laborProfileId, placementCaseId, verdict }`.
 * NEVER `referrerUserId`, NEVER `attributionId`, NEVER any referrer identity.
 */
import type { Prisma } from '@prisma/client';
import { verifyAttributionToken } from '@/src/domains/referrals/redirect-token';
import {
  createCandidateSubmissionFromIntake,
  type CreateCandidateSubmissionFromIntakeResult,
} from '@/src/domains/talent/intake-writer.service';

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
 * Public anon N1 apply orchestrator. Wraps the N1 intake writer with cookie
 * → attribution resolution. Returns a DTO that NEVER contains referrer fields.
 *
 * Silent fail-safe: any cookie verify failure, missing cookie, missing
 * attribution row, expired attribution, or non-active status returns the
 * standard DTO shape with the writer invoked in non-attributed mode.
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
  const referralAttributionId = await resolveActiveAttributionId(tx, input.hrpAffCookie);

  const outcome = await createCandidateSubmissionFromIntake(tx, {
    applicant: {
      fullName: input.applicant.fullName,
      phone: input.applicant.phone,
      cccdNumber: input.applicant.cccdNumber ?? null,
      dateOfBirth: input.applicant.dateOfBirth ?? null,
    },
    channel: input.channel ?? 'PUBLIC_MARKETPLACE',
    intent: input.intent ?? 'JOB_INTEREST',
    projectId: input.projectId ?? null,
    actorId: input.actorId,
    partnerRef: null,
    consentAt: input.applicant.consentAt ? new Date(input.applicant.consentAt) : null,
    referralAttributionId,
  });

  return mapOutcomeToDto(outcome);
}

/**
 * Resolve the signed cookie → ReferralAttribution row, with server-clock and
 * status guards. Returns null for any failure (silent fail-safe).
 *
 * Projection is minimal: `{ id, referrerUserId, status, expiresAt }` only.
 * No PII, no timestamps beyond expiresAt, no affiliateCodeSnapshot.
 */
export async function resolveActiveAttributionId(
  tx: Prisma.TransactionClient,
  hrpAffCookie: string | null,
): Promise<string | null> {
  if (!hrpAffCookie || hrpAffCookie.length === 0) return null;

  // 1. Verify HMAC + key version. The verify util already rejects expired
  //    tokens (server-clock enforcement inside the token).
  const payload = verifyAttributionToken(hrpAffCookie);
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

  // 3. Server-clock guard (RQ-09): cookie expiresAt is per the token, but the
  //    attribution row also has its own expiresAt (which is the source of
  //    truth for "the link is still good"). Tier 0 verdict: enforce
  //    `expires_at > now()` AND `status='ACTIVE'` BEFORE consume.
  if (row.status !== 'ACTIVE') return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  return row.id;
}

/**
 * Map the N1 writer outcome to the public DTO. NEVER includes referrer
 * fields — DEC-07.
 */
function mapOutcomeToDto(
  outcome: CreateCandidateSubmissionFromIntakeResult,
): PublicIntakeResult {
  const verdict = outcome.match.verdict;
  if (verdict === 'POSSIBLE_MATCH') {
    // Should not reach here: N1 writer throws PossibleMatchNotResolvedError
    // for non-resolved POSSIBLE_MATCH. Defense in depth.
    throw new Error('POSSIBLE_MATCH must be resolved before public intake');
  }
  return {
    candidateSubmissionId: outcome.candidateSubmission.id,
    laborProfileId: outcome.candidateSubmission.laborProfileId,
    placementCaseId: outcome.candidateSubmission.placementCaseId,
    verdict,
  };
}
