/**
 * MP-3B application conversion.
 *
 * Converts a QUALIFIED CandidateSubmission to a canonical Worker and exactly
 * one accepted SourceClaim. The caller supplies the withDbContext transaction;
 * the optimistic status/version update is acquired before any durable child
 * rows, so a losing conversion race rolls back without orphan Workers/claims.
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
  version: number;
  changed: boolean;
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
      | 'CONVERSION_CONFLICT'
      | 'CONVERSION_INVARIANT_BROKEN',
    public readonly httpStatus: number,
    message: string,
    public readonly details?: { candidates?: DedupCandidate[]; workerId?: string },
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
      sourceClaims: {
        where: { accepted: true },
        select: { id: true, workerId: true },
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
    return {
      id,
      status: 'CONVERTED',
      workerId: current.workerId,
      sourceClaimId: accepted.id,
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
    const existingAccepted = await tx.sourceClaim.findFirst({
      where: { workerId, accepted: true },
      select: { id: true, submissionId: true },
    });

    let sourceClaimId: string;
    if (existingAccepted) {
      if (existingAccepted.submissionId !== id) {
        throw new ConversionError(
          'SOURCE_CLAIM_CONFLICT',
          409,
          'Selected Worker already has an accepted source claim',
          { workerId },
        );
      }
      sourceClaimId = existingAccepted.id;
    } else {
      const source = sourceFor(current.vendorId, current.ctvId);
      const claim = await tx.sourceClaim.create({
        data: {
          workerId,
          submissionId: id,
          claimType: source.claimType,
          registrationChannel: source.registrationChannel,
          vendorId: current.vendorId,
          ctvId: current.ctvId,
          accepted: true,
          acceptedBy: ctx.userId,
          claimedBy: ctx.userId,
        },
        select: { id: true },
      });
      sourceClaimId = claim.id;
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
          after: { status: 'CONVERTED', version: current.version + 1, workerId, sourceClaimId },
        } as Prisma.InputJsonValue,
      },
    });

    return {
      id,
      status: 'CONVERTED',
      workerId,
      sourceClaimId,
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

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}