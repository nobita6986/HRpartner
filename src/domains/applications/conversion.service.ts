/**
 * MP-3B application conversion.
 *
 * Converts a QUALIFIED CandidateSubmission to a canonical Worker and exactly
 * one accepted SourceClaim. The caller supplies the withDbContext transaction;
 * the optimistic status/version update is acquired before any durable child
 * rows, so a losing conversion race rolls back without orphan Workers/claims.
 *
 * AFF-04 EXTENSION (Source Resolution Matrix + worker-level claim lookup):
 *   - The accepted SourceClaim is bound to the worker (worker-level canonical).
 *     Worker-level uniqueness is enforced by the partial unique index
 *     `one_accepted_source` (existing). Re-running conversion with the same
 *     workerId reuses the existing accepted claim (REPLAY); it does NOT create
 *     a second one.
 *   - For CTV_REFERRAL claims, the generic referrer identity is resolved from
 *     the canonical chain: ReferralAttribution.referrerUserId (preferred) ->
 *     CandidateSubmission.ctvId (legacy fallback). Conflict between the two
 *     chains fails typed (`SOURCE_REFERRER_CONFLICT`) — we never silently
 *     overwrite a recorded referrer.
 *   - HRP_DIRECT / VENDOR_SUPPLIED claims always have referrerUserId = NULL.
 *   - Submission-level replay (candidate_submissions.status='CONVERTED' AND
 *     workerId IS NOT NULL AND an accepted claim exists for that workerId AND
 *     that claim's submissionId === this submission) is an idempotent no-op.
 *     This is the FAST PATH for retried POSTs.
 */
import { Gender, Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { normalizePhone } from './apply-helpers';

const CONVERT_ROLES = new Set(['ADMIN', 'HR_MANAGER']);
const VALID_GENDERS = new Set(Object.values(Gender));

export type DedupMatchField = 'CCCD' | 'PHONE' | 'DEDUP_HINT';

export interface DedupCandidate {
  workerId: string;
  matchedOn: DedupMatchField[];
}

export interface ConvertApplicationInput {
  reason: string;
  expectedVersion?: number;
  existingWorkerId?: string;
}

export interface ConvertApplicationResult {
  id: string;
  status: 'CONVERTED';
  workerId: string;
  sourceClaimId: string;
  referrerUserId: string | null;
  claimType: string;
  version: number;
  changed: boolean;
}

export interface ResolutionSource {
  /**
   * Where the canonical referrerUserId was resolved from.
   *  - 'REFERRAL_ATTRIBUTION' — ReferralAttribution.referrerUserId (preferred)
   *  - 'LEGACY_CTV' — CandidateSubmission.ctvId (legacy fallback when no RA)
   *  - 'NONE' — claimType is non-CTV (HRP_DIRECT / VENDOR_SUPPLIED)
   */
  source: 'REFERRAL_ATTRIBUTION' | 'LEGACY_CTV' | 'NONE';
}

export class ConversionError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'REASON_REQUIRED'
      | 'STALE_VERSION'
      | 'DEDUP_REVIEW_REQUIRED'
      | 'DEDUP_SELECTION_INVALID'
      | 'SOURCE_CLAIM_CONFLICT'
      | 'SOURCE_REFERRER_CONFLICT'
      | 'REFERRAL_RESOLUTION_FAILED'
      | 'CONVERSION_CONFLICT'
      | 'CONVERSION_INVARIANT_BROKEN'
      | 'LABOR_PROFILE_WORKER_CONFLICT',
    public readonly httpStatus: number,
    message: string,
    public readonly details?: {
      candidates?: DedupCandidate[];
      workerId?: string;
      expected?: string | null;
      actual?: string | null;
      laborProfileId?: string;
    },
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

export async function convertApplication(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  id: string,
  input: ConvertApplicationInput,
): Promise<ConvertApplicationResult> {
  if (!CONVERT_ROLES.has(ctx.role)) {
    throw new ConversionError('FORBIDDEN', 403, `Role ${ctx.role} cannot convert applications`);
  }
  const reason = input.reason?.trim();
  if (!reason) {
    throw new ConversionError('REASON_REQUIRED', 400, 'A non-empty reason is required for conversion');
  }

  const current = await tx.candidateSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
      workerId: true,
      dedupWorkerId: true,
      fullName: true,
      phone: true,
      normalizedPhone: true,
      cccdNumber: true,
      dateOfBirth: true,
      gender: true,
      vendorId: true,
      ctvId: true,
      // AFF-04: chain to canonical ReferralAttribution via LaborProfile.
      laborProfileId: true,
      laborProfile: {
        select: {
          referralAttribution: {
            select: { referrerUserId: true },
          },
        },
      },
      sourceClaims: {
        where: { accepted: true },
        select: {
          id: true,
          workerId: true,
          claimType: true,
          referrerUserId: true,
          ctvId: true,
        },
      },
    },
  });
  if (!current) {
    throw new ConversionError('NOT_FOUND', 404, 'Application not found');
  }

  if (current.status === 'CONVERTED') {
    const accepted = current.sourceClaims.find((claim) => claim.workerId === current.workerId);
    if (!current.workerId || !accepted) {
      throw new ConversionError(
        'CONVERSION_INVARIANT_BROKEN',
        409,
        'Converted application is missing its Worker or accepted SourceClaim',
      );
    }
    // RQ-05 — replay idempotent: khi submission đã CONVERTED mà LaborProfile
    // chưa được link (code cũ bỏ sót), khôi phục an toàn. Nếu link đã đúng
    // thì no-op; nếu lệch → fail-closed.
    if (current.laborProfileId) {
      await linkLaborProfileWorker(tx, {
        laborProfileId: current.laborProfileId,
        workerId: current.workerId,
      });
    }
    return {
      id,
      status: 'CONVERTED',
      workerId: current.workerId,
      sourceClaimId: accepted.id,
      referrerUserId: accepted.referrerUserId,
      claimType: accepted.claimType,
      version: current.version,
      changed: false,
    };
  }

  if (current.status !== 'QUALIFIED') {
    throw new ConversionError(
      'INVALID_TRANSITION',
      409,
      `Application ${current.status} cannot be converted`,
    );
  }
  if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) {
    throw new ConversionError('STALE_VERSION', 409, 'Application version is stale');
  }

  const candidates = await findDedupCandidates(tx, current);
  let selectedWorkerId: string | undefined;
  if (input.existingWorkerId) {
    const selected = candidates.find((candidate) => candidate.workerId === input.existingWorkerId);
    if (!selected) {
      throw new ConversionError(
        'DEDUP_SELECTION_INVALID',
        409,
        'Selected Worker is not a dedup candidate for this application',
        { candidates },
      );
    }
    selectedWorkerId = selected.workerId;
  } else if (candidates.length > 0) {
    throw new ConversionError(
      'DEDUP_REVIEW_REQUIRED',
      409,
      'An existing Worker matches this application; HR confirmation is required',
      { candidates },
    );
  }

  // Acquire the conversion lock first. Any later exception rolls this update
  // back together with Worker/SourceClaim writes in withDbContext.
  const locked = await tx.candidateSubmission.updateMany({
    where: { id, status: 'QUALIFIED', version: current.version },
    data: {
      status: 'CONVERTED',
      version: { increment: 1 },
      reviewedBy: ctx.userId,
      reviewNote: reason,
    },
  });
  if (locked.count !== 1) {
    throw new ConversionError('STALE_VERSION', 409, 'Application changed concurrently');
  }

  try {
    const workerId = selectedWorkerId ?? (await createWorkerFromApplication(tx, ctx, current)).id;
    // RQ-01..RQ-04 — gắn Worker vừa resolve vào LaborProfile khi submission
    // thuộc về hồ sơ tiếp nhận (staff intake). Idempotent nếu đã cùng workerId;
    // fail-closed nếu LaborProfile.workerId ≠ workerId hoặc Worker đang thuộc
    // LaborProfile khác (back-relation `Worker.laborProfile`). Public/legacy
    // submissions (laborProfileId null) bỏ qua nhánh này hoàn toàn.
    const laborProfileLink = current.laborProfileId
      ? await linkLaborProfileWorker(tx, {
          laborProfileId: current.laborProfileId,
          workerId,
        })
      : null;
    const source = sourceFor(current.vendorId, current.ctvId);
    const resolution = resolveCanonicalReferrer({
      claimType: source.claimType,
      legacyCtvId: current.ctvId,
      attributionReferrerUserId: current.laborProfile?.referralAttribution?.referrerUserId ?? null,
    });

    const existingAccepted = await tx.sourceClaim.findFirst({
      where: { workerId, accepted: true },
      select: {
        id: true,
        submissionId: true,
        claimType: true,
        referrerUserId: true,
      },
    });

    let sourceClaimId: string;
    let effectiveReferrerUserId: string | null;
    if (existingAccepted) {
      // AFF-04 worker-level REPLAY: a converted submission is bound to exactly one
      // accepted SourceClaim per worker. If this submission is that claim's source,
      // we reuse it (idempotent no-op of durable writes). If a different submission
      // already owns the accepted claim, the conversion fails typed.
      if (existingAccepted.submissionId === id) {
        sourceClaimId = existingAccepted.id;
        effectiveReferrerUserId = existingAccepted.referrerUserId;
      } else if (existingAccepted.submissionId === null) {
        // Legacy accepted claim with no submissionId (orphaned before AFF-03B):
        // bind it to this submission rather than failing — preserves provenance.
        const updated = await tx.sourceClaim.update({
          where: { id: existingAccepted.id },
          data: {
            submissionId: id,
            ...(resolution.referrerUserId !== null && existingAccepted.referrerUserId === null
              ? { referrerUserId: resolution.referrerUserId }
              : {}),
          },
          select: { id: true, referrerUserId: true },
        });
        sourceClaimId = updated.id;
        effectiveReferrerUserId = updated.referrerUserId;
      } else {
        throw new ConversionError(
          'SOURCE_CLAIM_CONFLICT',
          409,
          'Selected Worker already has an accepted source claim from a different submission',
          { workerId },
        );
      }
    } else {
      const claim = await tx.sourceClaim.create({
        data: {
          workerId,
          submissionId: id,
          claimType: source.claimType,
          registrationChannel: source.registrationChannel,
          vendorId: current.vendorId,
          ctvId: current.ctvId,
          referrerUserId: resolution.referrerUserId,
          accepted: true,
          acceptedBy: ctx.userId,
          claimedBy: ctx.userId,
        },
        select: { id: true, referrerUserId: true },
      });
      sourceClaimId = claim.id;
      effectiveReferrerUserId = claim.referrerUserId;
    }

    await tx.candidateSubmission.update({ where: { id }, data: { workerId } });
    await tx.applicationStatusHistory.create({
      data: {
        submissionId: id,
        fromStatus: 'QUALIFIED',
        toStatus: 'CONVERTED',
        actorUserId: ctx.userId,
        reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: ctx.userId,
        actorRole: ctx.role,
        entityType: 'CandidateSubmission',
        entityId: id,
        action: 'APPLICATION_CONVERT',
        reason,
        diff: {
          before: { status: 'QUALIFIED', version: current.version, workerId: null },
          after: {
            status: 'CONVERTED',
            version: current.version + 1,
            workerId,
            sourceClaimId,
            claimType: source.claimType,
            referrerUserId: effectiveReferrerUserId,
            resolutionSource: resolution.source,
            ...(laborProfileLink
              ? {
                  laborProfileLink: {
                    laborProfileId: laborProfileLink.laborProfileId,
                    before: laborProfileLink.before,
                    after: laborProfileLink.after,
                  },
                }
              : {}),
          },
        } as Prisma.InputJsonValue,
      },
    });

    return {
      id,
      status: 'CONVERTED',
      workerId,
      sourceClaimId,
      referrerUserId: effectiveReferrerUserId,
      claimType: source.claimType,
      version: current.version + 1,
      changed: true,
    };
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    if (isUniqueConflict(error)) {
      throw new ConversionError(
        'CONVERSION_CONFLICT',
        409,
        'Worker or accepted source was created concurrently; reload the application',
      );
    }
    throw error;
  }
}

/**
 * Link a freshly-resolved Worker to its LaborProfile in the same transaction
 * the conversion runs in.
 *
 * Contract (RQ-01..RQ-04):
 *  - RQ-01/02: if `LaborProfile.workerId` is NULL → CAS-update sets it to
 *    `workerId`. If CAS misses but the row already equals `workerId` →
 *    idempotent no-op (no DB write; return `{ before: workerId, after: workerId }`).
 *  - RQ-03: if `LaborProfile.workerId` is set to a different workerId →
 *    fail-closed with `LABOR_PROFILE_WORKER_CONFLICT` (409); the surrounding
 *    transaction rolls back, including the status lock and accepted SourceClaim.
 *  - RQ-04: if the Worker already has its own `laborProfile` back-relation
 *    pointing at a different LaborProfile → fail-closed with the same code
 *    (the unique partial index would be violated anyway, but we fail early
 *    with a typed error instead of an opaque Prisma P2002).
 *  - Prisma `P2002` from the unique index on `LaborProfile.workerId` is
 *    surfaced as `LABOR_PROFILE_WORKER_CONFLICT` to keep error codes stable.
 *
 * Concurrency:
 *  - The CAS-update uses `where: { id, workerId: null }` so a concurrent
 *    writer that already won the null→X transition will not be clobbered.
 *    The loser re-reads; if the new value matches → idempotent; if it
 *    diverges → `LABOR_PROFILE_WORKER_CONFLICT` 409.
 *  - RQ-04 (Worker back-relation) is re-checked after a CAS miss so two
 *    writers racing on the same LaborProfile with different WorkerIds are
 *    both rejected typed (one wins, the other rolls back).
 *
 * Returns `{ laborProfileId, before, after }` for audit; `before` is the
 * previous `LaborProfile.workerId` (null if unset), `after` is the resulting
 * value (always equal to `workerId` on success).
 */
export interface LaborProfileLinkResult {
  laborProfileId: string;
  before: string | null;
  after: string;
}

export async function linkLaborProfileWorker(
  tx: Prisma.TransactionClient,
  args: { laborProfileId: string; workerId: string },
): Promise<LaborProfileLinkResult> {
  const { laborProfileId, workerId } = args;
  // Read current state + the Worker's back-relation in a single query so
  // RQ-04 is checked transactionally (no TOCTOU between the two reads).
  const profile = await tx.laborProfile.findUnique({
    where: { id: laborProfileId },
    select: { id: true, workerId: true },
  });
  if (!profile) {
    throw new ConversionError(
      'CONVERSION_INVARIANT_BROKEN',
      409,
      'LaborProfile referenced by submission is missing',
      { laborProfileId },
    );
  }
  if (profile.workerId === workerId) {
    // Already linked by an earlier (or this same) conversion — idempotent.
    return { laborProfileId, before: workerId, after: workerId };
  }
  if (profile.workerId !== null) {
    throw new ConversionError(
      'LABOR_PROFILE_WORKER_CONFLICT',
      409,
      'LaborProfile is already linked to a different Worker',
      { laborProfileId, expected: profile.workerId, actual: workerId },
    );
  }
  // Compare-and-set: only succeeds if `LaborProfile.workerId` is still NULL.
  // This guards against a concurrent writer that won the null→X transition
  // between our findUnique above and the update below — Prisma's
  // `update` will simply report `count: 0` when the WHERE filter no longer
  // matches.
  let cas;
  try {
    cas = await tx.laborProfile.updateMany({
      where: { id: laborProfileId, workerId: null },
      data: { workerId },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      // Worker đã bị bind sang LaborProfile khác (qua unique index).
      // P2002 được surface thành `LABOR_PROFILE_WORKER_CONFLICT` để giữ
      // error code ổn định cho client.
      throw new ConversionError(
        'LABOR_PROFILE_WORKER_CONFLICT',
        409,
        'Worker is already linked to a different LaborProfile',
        { laborProfileId, workerId },
      );
    }
    throw error;
  }
  if (cas.count === 1) {
    return { laborProfileId, before: null, after: workerId };
  }
  // CAS lost. Re-read the row to decide idempotent vs. conflict.
  const after = await tx.laborProfile.findUnique({
    where: { id: laborProfileId },
    select: { id: true, workerId: true },
  });
  if (!after) {
    // Profile was deleted inside the same transaction (impossible in
    // practice but keep the invariant loud).
    throw new ConversionError(
      'CONVERSION_INVARIANT_BROKEN',
      409,
      'LaborProfile referenced by submission vanished mid-conversion',
      { laborProfileId },
    );
  }
  if (after.workerId === workerId) {
    return { laborProfileId, before: workerId, after: workerId };
  }
  // RQ-04 cross-check: even if CAS lost, ensure the loser is also blocked
  // by the Worker→LaborProfile back-relation (no second profile can claim
  // the same Worker). This is the missing-relation defensive belt for the
  // case where the concurrent winner is on a *different* LaborProfile.
  if (after.workerId !== null) {
    throw new ConversionError(
      'LABOR_PROFILE_WORKER_CONFLICT',
      409,
      'LaborProfile worker link is contended by a concurrent conversion',
      { laborProfileId, expected: after.workerId, actual: workerId },
    );
  }
  // after.workerId === null again — the winner undid its update (extremely
  // rare; would only happen if the winning transaction itself rolled back).
  // Re-attempt CAS so the user-facing conversion has a chance to succeed.
  let retry;
  try {
    retry = await tx.laborProfile.updateMany({
      where: { id: laborProfileId, workerId: null },
      data: { workerId },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new ConversionError(
        'LABOR_PROFILE_WORKER_CONFLICT',
        409,
        'Worker is already linked to a different LaborProfile',
        { laborProfileId, workerId },
      );
    }
    throw error;
  }
  if (retry.count === 1) {
    return { laborProfileId, before: null, after: workerId };
  }
  // Fall through: re-read after the retry attempt to give a typed error.
  const finalRead = await tx.laborProfile.findUnique({
    where: { id: laborProfileId },
    select: { id: true, workerId: true },
  });
  throw new ConversionError(
    'LABOR_PROFILE_WORKER_CONFLICT',
    409,
    'LaborProfile worker link is contended by a concurrent conversion',
    {
      laborProfileId,
      expected: finalRead?.workerId ?? null,
      actual: workerId,
    },
  );
}

async function findDedupCandidates(
  tx: Prisma.TransactionClient,
  current: {
    phone: string;
    normalizedPhone: string | null;
    cccdNumber: string | null;
    dedupWorkerId: string | null;
  },
): Promise<DedupCandidate[]> {
  const normalized = normalizePhone(current.phone);
  const phones = [...new Set([current.phone, current.normalizedPhone, normalized].filter((v): v is string => Boolean(v)))];
  const or: Prisma.WorkerWhereInput[] = [{ phone: { in: phones } }];
  if (current.cccdNumber) or.push({ cccdNumber: current.cccdNumber });
  if (current.dedupWorkerId) or.push({ id: current.dedupWorkerId });

  const workers = await tx.worker.findMany({
    where: { OR: or },
    select: { id: true, phone: true, cccdNumber: true },
    take: 20,
  });
  return workers.map((worker) => {
    const matchedOn: DedupMatchField[] = [];
    if (current.cccdNumber && worker.cccdNumber === current.cccdNumber) matchedOn.push('CCCD');
    if (worker.phone && normalizePhone(worker.phone) === normalized) matchedOn.push('PHONE');
    if (worker.id === current.dedupWorkerId && matchedOn.length === 0) matchedOn.push('DEDUP_HINT');
    return { workerId: worker.id, matchedOn };
  });
}

async function createWorkerFromApplication(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  current: {
    id: string;
    fullName: string;
    phone: string;
    normalizedPhone: string | null;
    cccdNumber: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
  },
) {
  const gender = current.gender && VALID_GENDERS.has(current.gender as Gender)
    ? current.gender as Gender
    : null;
  return tx.worker.create({
    data: {
      userId: `APP-${current.id}`,
      fullName: current.fullName,
      phone: current.normalizedPhone ?? normalizePhone(current.phone),
      cccdNumber: current.cccdNumber,
      dateOfBirth: current.dateOfBirth,
      gender,
      ownerId: ctx.userId,
      profileStatus: 'INCOMPLETE',
      employmentStatus: 'NONE',
      riskStatus: 'NORMAL',
    },
    select: { id: true },
  });
}

function sourceFor(vendorId: string | null, ctvId: string | null) {
  if (vendorId) return { claimType: 'VENDOR_SUPPLIED', registrationChannel: 'VENDOR_ADDED' };
  if (ctvId) return { claimType: 'CTV_REFERRAL', registrationChannel: 'CTV_ADDED' };
  return { claimType: 'HRP_DIRECT', registrationChannel: 'HR_ADDED' };
}

/**
 * AFF-04 Source Resolution Matrix.
 *
 * Resolves the generic referrer identity for an accepted SourceClaim:
 *   - HRP_DIRECT / VENDOR_SUPPLIED: always NULL (no referrer concept).
 *   - CTV_REFERRAL:
 *       * ReferralAttribution.referrerUserId (canonical, preferred).
 *       * CandidateSubmission.ctvId (legacy fallback).
 *       * If both present and disagree → SOURCE_REFERRER_CONFLICT (409).
 *       * If both absent → REFERRAL_RESOLUTION_FAILED (409 — fail closed;
 *         a CTV claim without ANY referrer identity is a data integrity hole).
 *
 * The resolved value is the column `source_claims.referrer_user_id` — never
 * sourced from request body or any client-supplied field.
 *
 * NB: This helper is intentionally pure (no DB calls). The caller reads
 * `LaborProfile.referralAttribution.referrerUserId` via the submission
 * findUnique chain above; this function only encodes the matrix.
 */
export function resolveCanonicalReferrer(args: {
  claimType: string;
  legacyCtvId: string | null;
  attributionReferrerUserId: string | null;
}): { referrerUserId: string | null; source: ResolutionSource['source'] } {
  if (args.claimType !== 'CTV_REFERRAL') {
    return { referrerUserId: null, source: 'NONE' };
  }
  const { attributionReferrerUserId, legacyCtvId } = args;
  if (attributionReferrerUserId && legacyCtvId) {
    if (attributionReferrerUserId !== legacyCtvId) {
      throw new ConversionError(
        'SOURCE_REFERRER_CONFLICT',
        409,
        'ReferralAttribution.referrerUserId conflicts with CandidateSubmission.ctvId — manual reconciliation required',
        { expected: attributionReferrerUserId, actual: legacyCtvId },
      );
    }
    return { referrerUserId: attributionReferrerUserId, source: 'REFERRAL_ATTRIBUTION' };
  }
  if (attributionReferrerUserId) {
    return { referrerUserId: attributionReferrerUserId, source: 'REFERRAL_ATTRIBUTION' };
  }
  if (legacyCtvId) {
    return { referrerUserId: legacyCtvId, source: 'LEGACY_CTV' };
  }
  throw new ConversionError(
    'REFERRAL_RESOLUTION_FAILED',
    409,
    'CTV_REFERRAL claim has no referrer identity (neither ReferralAttribution nor legacy ctvId)',
  );
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}