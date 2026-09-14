/**
 * intake-writer.service.ts — N1 intake writer (STEP-06).
 *
 * createCandidateSubmissionFromIntake — composite service gắn intake mới vào
 * LaborProfile + active PlacementCase + CandidateSubmission.
 *
 * Quy tắc (DEC-01..09 + RQ-07..09):
 *   - Resolve LaborProfile qua `createOrMatchLaborProfile`.
 *   - Resolve/create active PlacementCase qua `openPlacementCase`.
 *   - INSERT CandidateSubmission với `placementCaseId` link.
 *   - General Interest: `jobOpeningId`/`projectId` NULL vẫn OK.
 *   - Actor KHÔNG tự trở thành referrer/handler/beneficiary — `ctvId`/`vendorId`
 *     chỉ set khi caller declare `partnerRef` hợp lệ.
 *   - Idempotency qua `withIdempotency` ở route layer; service layer thuần.
 */

import type { Prisma } from '@prisma/client';
import { createOrMatchLaborProfile } from './labor-profile.service';
import type { ApplicantInput, CreateOrMatchResult } from './labor-profile.types';
import { openPlacementCase, type OpenPlacementCaseResult } from './placement-case.service';
import { InvalidPartnerRefError } from './intake.errors';

export type IntakeChannel =
  | 'PUBLIC_MARKETPLACE'
  | 'STAFF_INTAKE'
  | 'PARTNER_INTAKE'
  | 'ADMIN_INTAKE';

export type IntakeIntent = 'JOB_INTEREST' | 'GENERAL_INTEREST';

/** Caller declare explicit partner ref (CTV/Vendor). KHÔNG tự infer từ actorId. */
export interface PartnerRef {
  kind: 'CTV' | 'VENDOR';
  /** CTV → userId; VENDOR → vendorId. */
  userId?: string;
  vendorId?: string;
}

export interface CreateCandidateSubmissionFromIntakeInput {
  applicant: ApplicantInput;
  channel: IntakeChannel;
  intent: IntakeIntent;
  /** Optional job opening id (caller-resolved). Phase này KHÔNG lưu vào schema
   *  (CandidateSubmission không có jobOpeningId FK) — chỉ ghi cho audit metadata. */
  jobOpeningId?: string | null;
  /** Optional project link (NOT NULL ⇒ MP-2 slot/job apply — out of scope phase này). */
  projectId?: string | null;
  /** Actor id (audit only — KHÔNG set referrer). */
  actorId: string;
  /** Caller declare explicit partner ref (out of scope partner intake route). */
  partnerRef?: PartnerRef | null;
  /** Caller consent timestamp (ghi vào LaborProfile.consentAt nếu NEW_PROFILE). */
  consentAt?: Date | null;
}

export interface CreateCandidateSubmissionFromIntakeResult {
  match: CreateOrMatchResult;
  placementCase: OpenPlacementCaseResult;
  candidateSubmission: {
    id: string;
    status: 'NEW';
    placementCaseId: string;
    laborProfileId: string | null;
    projectId: string | null;
    channel: IntakeChannel;
  };
}

/**
 * Validate partnerRef shape — chỉ accept khi caller declare rõ ràng.
 */
function validatePartnerRef(ref: PartnerRef | null | undefined): {
  ctvId: string | null;
  vendorId: string | null;
} {
  if (!ref) return { ctvId: null, vendorId: null };
  if (ref.kind === 'CTV') {
    if (!ref.userId) {
      throw new InvalidPartnerRefError('CTV partnerRef phải có userId');
    }
    return { ctvId: ref.userId, vendorId: null };
  }
  if (ref.kind === 'VENDOR') {
    if (!ref.vendorId) {
      throw new InvalidPartnerRefError('VENDOR partnerRef phải có vendorId');
    }
    return { ctvId: null, vendorId: ref.vendorId };
  }
  throw new InvalidPartnerRefError(`Unknown partnerRef.kind: ${String((ref as { kind?: unknown }).kind)}`);
}

/**
 * Composite: resolve profile → open case → INSERT submission, trong cùng transaction.
 *
 * Caller wrap transaction (route layer + withDbContext + withIdempotency).
 */
export async function createCandidateSubmissionFromIntake(
  tx: Prisma.TransactionClient,
  input: CreateCandidateSubmissionFromIntakeInput,
): Promise<CreateCandidateSubmissionFromIntakeResult> {
  // 1. Resolve LaborProfile.
  const match = await createOrMatchLaborProfile(tx, input.applicant, {
    actorId: input.actorId,
    consentAt: input.consentAt,
  });

  // Xác định laborProfileId để gắn vào case + submission.
  let laborProfileId: string;
  if (match.verdict === 'EXACT_MATCH') {
    laborProfileId = match.laborProfileId;
  } else if (match.verdict === 'NEW_PROFILE' && match.laborProfileId) {
    laborProfileId = match.laborProfileId;
  } else {
    // POSSIBLE_MATCH: caller phải tự quyết (DEC-04). Phase này KHÔNG merge.
    // Trả lỗi để caller xử lý (vd trả về client với verdict POSSIBLE_MATCH + candidates).
    throw new PossibleMatchNotResolvedError(match);
  }

  // 2. Resolve/open active PlacementCase.
  const placementCase = await openPlacementCase(tx, {
    laborProfileId,
    intent: input.intent,
    actorId: input.actorId,
  });

  // 3. Validate partnerRef + INSERT CandidateSubmission.
  const partner = validatePartnerRef(input.partnerRef);

  const submission = await tx.candidateSubmission.create({
    data: {
      laborProfileId,
      placementCaseId: placementCase.placementCaseId,
      // fullName/phone là NON-OPTIONAL trên CandidateSubmission schema (required string).
      fullName: input.applicant.fullName ?? '',
      phone: input.applicant.phone ?? '',
      cccdNumber: input.applicant.cccdNumber ?? null,
      dateOfBirth: input.applicant.dateOfBirth
        ? input.applicant.dateOfBirth instanceof Date
          ? input.applicant.dateOfBirth
          : new Date(input.applicant.dateOfBirth)
        : null,
      // Phase này: KHÔNG bind jobOpeningId (CandidateSubmission chỉ có projectId/slotId
      // theo MP-2 schema; General Interest hợp lệ với cả 2 NULL). Việc nối slot/job để
      // MP-2 apply cũ xử lý. Phase này chỉ chứng minh case link + submission OK.
      projectId: input.projectId ?? null,
      ctvId: partner.ctvId,
      vendorId: partner.vendorId,
      status: 'NEW',
      // PHẢI tự đặt các field audit theo channel; KHÔNG set source = 'CTV'/'VENDOR' nếu không có partnerRef.
    },
    select: {
      id: true,
      status: true,
      placementCaseId: true,
      laborProfileId: true,
      projectId: true,
    },
  });

  return {
    match,
    placementCase,
    candidateSubmission: {
      id: submission.id,
      status: 'NEW',
      placementCaseId: submission.placementCaseId ?? '',
      laborProfileId: submission.laborProfileId ?? null,
      projectId: submission.projectId ?? null,
      channel: input.channel,
    },
  };
}

/**
 * Error khi verdict = POSSIBLE_MATCH nhưng caller chưa resolve (phase này yêu cầu
 * caller chọn rõ ràng trước khi tạo submission).
 */
export class PossibleMatchNotResolvedError extends Error {
  constructor(public readonly match: CreateOrMatchResult) {
    super('POSSIBLE_MATCH chưa được caller resolve; vui lòng chọn candidate hoặc tạo mới rõ ràng');
    this.name = 'PossibleMatchNotResolvedError';
  }
}
