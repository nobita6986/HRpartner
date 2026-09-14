/**
 * labor-profile.service.ts — N1 intake writer (STEP-03, STEP-04).
 *
 * createOrMatchLaborProfile — authority DUY NHẤT resolve person identity cho
 * first-party intake (TIER0_HANDOVER.md §N1 + V6P-007A).
 *
 * Quy tắc (DEC-01..04):
 *   - Verdict `EXACT_MATCH` CHỈ khi ≥2 tín hiệu khớp (phone+cccd, phone+name+DOB,
 *     hoặc cccd+name+DOB).
 *   - Phone một mình KHÔNG bao giờ EXACT_MATCH (RQ-03).
 *   - `POSSIBLE_MATCH` KHÔNG auto-merge (DEC-04) — caller quyết.
 *   - `conflictingEvidence` được flag khi cùng tín hiệu đầu vào (vd phone) nhưng
 *     giá trị so sánh lại khác (vd DOB khác) — caller KHÔNG được merge thầm lặng.
 *
 * Pattern: pure scoring (`scoreAndClassify`) + async wrapper (`createOrMatchLaborProfile`).
 */
import type { Prisma } from '@prisma/client';
import { normalizePhone, normalizeFullName } from './normalize';
import type {
  ApplicantInput,
  ApplicantSignalKey,
  CreateOrMatchResult,
  ExistingLaborProfile,
  MatchedEvidence,
} from './labor-profile.types';

export type {
  ApplicantInput,
  ApplicantSignalKey,
  CreateOrMatchResult,
  ExistingLaborProfile,
} from './labor-profile.types';

/**
 * Chuẩn hoá các tín hiệu applicant → dạng canonical để so sánh.
 * Trả object các tín hiệu hợp lệ (không rỗng); key nào rỗng sẽ bị bỏ.
 */
export function extractApplicantSignals(input: ApplicantInput): Partial<Record<ApplicantSignalKey, string>> {
  const signals: Partial<Record<ApplicantSignalKey, string>> = {};
  const phone = normalizePhone(input.phone ?? null);
  if (phone) signals.normalizedPhone = phone;
  const cccd = (input.cccdNumber ?? '').trim();
  if (cccd) signals.cccdNumber = cccd;
  const name = normalizeFullName(input.fullName ?? null);
  if (name) signals.fullName = name;
  if (input.dateOfBirth != null) {
    const dob = input.dateOfBirth instanceof Date ? input.dateOfBirth : new Date(input.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      signals.dateOfBirth = dob.toISOString().slice(0, 10);
    }
  }
  return signals;
}

/**
 * Chuyển existing profile row → dạng canonical signals (dùng nội bộ).
 * LaborProfile KHÔNG có `dateOfBirth` → bỏ qua.
 */
function existingSignals(p: ExistingLaborProfile): Partial<Record<ApplicantSignalKey, string>> {
  const signals: Partial<Record<ApplicantSignalKey, string>> = {};
  if (p.normalizedPhone) signals.normalizedPhone = p.normalizedPhone;
  if (p.cccdNumber) signals.cccdNumber = p.cccdNumber;
  if (p.fullName) signals.fullName = normalizeFullName(p.fullName);
  return signals;
}

/**
 * So sánh applicant signals với existing profile (LaborProfile KHÔNG có dateOfBirth).
 * Trả danh sách tín hiệu khớp + danh sách tín hiệu conflict.
 *
 * - `signalsMatched`: key có ở cả 2 phía và giá trị bằng nhau.
 * - `conflictingEvidence`: key có mặt ở cả 2 phía (applicant cung cấp + existing có)
 *   nhưng giá trị KHÁC nhau. Caller dùng để flag "cùng phone nhưng khác fullName" v.v.
 */
export function compareSignals(
  applicant: Partial<Record<ApplicantSignalKey, string>>,
  existing: Partial<Record<ApplicantSignalKey, string>>,
): { signalsMatched: ApplicantSignalKey[]; conflictingEvidence: ApplicantSignalKey[] } {
  const matched: ApplicantSignalKey[] = [];
  const conflict: ApplicantSignalKey[] = [];
  for (const key of Object.keys(applicant) as ApplicantSignalKey[]) {
    // dateOfBirth không có trên LaborProfile schema; bỏ qua nếu existing thiếu.
    if (existing[key] == null) continue;
    const a = applicant[key]!;
    const e = existing[key]!;
    if (a === e) {
      matched.push(key);
    } else {
      conflict.push(key);
    }
  }
  return { signalsMatched: matched, conflictingEvidence: conflict };
}

/**
 * Scoring thuần (pure) — quyết định verdict + matched + conflicting evidence.
 *
 * DEC-01: ≥2 tín hiệu khớp → EXACT_MATCH (chỉ khi không có conflict).
 * DEC-02: 1 tín hiệu khớp, no conflict → POSSIBLE_MATCH (no conflict, multi-candidate OK).
 * DEC-03: Bất kỳ conflict nào → POSSIBLE_MATCH + conflictingEvidence (KHÔNG merge).
 * Else: NEW_PROFILE.
 */
export function scoreAndClassify(
  applicant: ApplicantInput,
  existing: ExistingLaborProfile[],
): {
  verdict: 'EXACT_MATCH' | 'POSSIBLE_MATCH' | 'NEW_PROFILE';
  candidate: { laborProfileId: string; signalsMatched: ApplicantSignalKey[]; conflictingEvidence: ApplicantSignalKey[] } | null;
  candidates: Array<{ laborProfileId: string; signalsMatched: ApplicantSignalKey[]; conflictingEvidence: ApplicantSignalKey[] }>;
  hasConflict: boolean;
  signalsProvided: ApplicantSignalKey[];
} {
  const applicantSignals = extractApplicantSignals(applicant);
  const signalsProvided = Object.keys(applicantSignals) as ApplicantSignalKey[];

  // Empty existing → NEW_PROFILE (dù applicant có signal).
  if (existing.length === 0) {
    return {
      verdict: 'NEW_PROFILE',
      candidate: null,
      candidates: [],
      hasConflict: false,
      signalsProvided,
    };
  }

  // Applicant không cung cấp tín hiệu nào → NEW_PROFILE (không có cách match).
  if (signalsProvided.length === 0) {
    return {
      verdict: 'NEW_PROFILE',
      candidate: null,
      candidates: [],
      hasConflict: false,
      signalsProvided,
    };
  }

  // So với từng existing profile.
  const candidates: MatchedEvidence[] = existing.map((p) => {
    const cmp = compareSignals(applicantSignals, existingSignals(p));
    return {
      candidateId: p.id,
      signalsMatched: cmp.signalsMatched,
      conflictingEvidence: cmp.conflictingEvidence,
    };
  });

  // Lọc candidate có ≥1 tín hiệu khớp (matched.length > 0).
  const matching = candidates.filter((c) => c.signalsMatched.length > 0);

  if (matching.length === 0) {
    return {
      verdict: 'NEW_PROFILE',
      candidate: null,
      candidates: [],
      hasConflict: false,
      signalsProvided,
    };
  }

  // Có conflict (bất kỳ candidate nào) → POSSIBLE_MATCH + hasConflict.
  const hasConflict = matching.some((c) => c.conflictingEvidence.length > 0);

  // EXACT_MATCH chỉ khi có 1 candidate với ≥2 signals matched VÀ không có conflict.
  const exactCandidates = matching.filter(
    (c) => c.signalsMatched.length >= 2 && c.conflictingEvidence.length === 0,
  );
  if (exactCandidates.length === 1 && !hasConflict) {
    const winner = exactCandidates[0]!;
    return {
      verdict: 'EXACT_MATCH',
      candidate: {
        laborProfileId: winner.candidateId,
        signalsMatched: winner.signalsMatched,
        conflictingEvidence: winner.conflictingEvidence,
      },
      candidates: matching.map((c) => ({
        laborProfileId: c.candidateId,
        signalsMatched: c.signalsMatched,
        conflictingEvidence: c.conflictingEvidence,
      })),
      hasConflict: false,
      signalsProvided,
    };
  }

  // Mọi trường hợp còn lại → POSSIBLE_MATCH (DEC-02, DEC-03, RQ-03).
  // KHÔNG auto-merge.
  return {
    verdict: 'POSSIBLE_MATCH',
    candidate: null,
    candidates: matching.map((c) => ({
      laborProfileId: c.candidateId,
      signalsMatched: c.signalsMatched,
      conflictingEvidence: c.conflictingEvidence,
    })),
    hasConflict,
    signalsProvided,
  };
}

/**
 * Async wrapper — query existing profiles qua Prisma transaction rồi gọi
 * `scoreAndClassify`.
 *
 * Caller dùng `tx` (Prisma.TransactionClient) để đảm bảo SELECT + INSERT (nếu
 * có) cùng transaction với caller (idempotency wrapper, etc).
 *
 * KHÔNG tự INSERT LaborProfile khi verdict = POSSIBLE_MATCH (DEC-04).
 */
export async function createOrMatchLaborProfile(
  tx: Prisma.TransactionClient,
  input: ApplicantInput,
  options: { actorId: string | null; consentAt?: Date | null } = { actorId: null },
): Promise<CreateOrMatchResult> {
  const applicantSignals = extractApplicantSignals(input);
  const signalsProvided = Object.keys(applicantSignals) as ApplicantSignalKey[];

  // Tìm existing profiles theo các tín hiệu applicant cung cấp.
  // Phase này: query OR theo normalizedPhone HOẶC cccdNumber (đủ rẻ; chưa tối ưu).
  const OR: Prisma.LaborProfileWhereInput[] = [];
  if (applicantSignals.normalizedPhone) {
    OR.push({ normalizedPhone: applicantSignals.normalizedPhone });
  }
  if (applicantSignals.cccdNumber) {
    OR.push({ cccdNumber: applicantSignals.cccdNumber });
  }

  const existing: ExistingLaborProfile[] =
    OR.length > 0
      ? await tx.laborProfile.findMany({
          where: { OR },
          select: {
            id: true,
            fullName: true,
            normalizedPhone: true,
            cccdNumber: true,
          },
          take: 50, // safety cap; hiếm khi > 1 candidate cùng phone+cccd
        })
      : [];

  const scoring = scoreAndClassify(input, existing);

  if (scoring.verdict === 'EXACT_MATCH' && scoring.candidate) {
    return {
      verdict: 'EXACT_MATCH',
      laborProfileId: scoring.candidate.laborProfileId,
      signalsMatched: scoring.candidate.signalsMatched,
      conflictingEvidence: [],
    };
  }

  if (scoring.verdict === 'POSSIBLE_MATCH') {
    return {
      verdict: 'POSSIBLE_MATCH',
      laborProfileId: null, // KHÔNG tự merge
      candidates: scoring.candidates,
      hasConflict: scoring.hasConflict,
    };
  }

  // NEW_PROFILE — INSERT LaborProfile mới.
  const normalizedPhone = applicantSignals.normalizedPhone ?? null;
  const newProfile = await tx.laborProfile.create({
    data: {
      fullName: input.fullName ?? null,
      phone: input.phone ?? null,
      normalizedPhone,
      cccdNumber: applicantSignals.cccdNumber ?? null,
      consentAt: options.consentAt ?? null,
      // capturedByUserId chỉ set nếu caller là actor auth — KHÔNG tự set referrer.
      // (Intake evidence thuộc LaborProfileIntake; phase này chưa ghi.)
    },
    select: { id: true },
  });

  return {
    verdict: 'NEW_PROFILE',
    laborProfileId: newProfile.id,
    signalsProvided,
  };
}
