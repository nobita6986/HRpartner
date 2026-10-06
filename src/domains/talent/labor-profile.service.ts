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

// ═══════════════════════════════════════════════════════════════════════════
// Pre-P2 hotfix (T1B) — LaborProfile edit surface (DEC-P2-02..08).
//
// `updateLaborProfileIntakeProfile` là PATCH writer DUY NHẤT trên LaborProfile
// mà admin portal exposed. Nó:
//   1. Từ chối typed nếu row đã có `workerId` (DEC-P2-06; CAS-conversion ở
//      PR #107 là đường duy nhất ghi `workerId`).
//   2. Tự `normalizePhone` + `deriveCompleteness` (DEC-P2-04, DEC-P2-05).
//   3. KHÔNG bao giờ chấp nhận `workerId` từ input (zod `.strict()` ở route
//      layer bảo vệ thêm 1 lớp).
//   4. Probe duplicate post-write (cùng signal với `createOrMatchLaborProfile`
//      DEC-04: typed warning, KHÔNG auto-merge).
//
// Hàm pure `deriveCompleteness` tách riêng để unit test không cần DB.
// ═══════════════════════════════════════════════════════════════════════════

import {
  LaborProfileAlreadyLinkedError,
  type LaborProfileEditableFields,
  type LaborProfileCompletenessLevel,
  type PossibleDuplicateWarning,
} from './labor-profile.types';

/**
 * DEC-P2-05 — Pure server-side completeness recompute.
 *
 * Quy tắc (input lấy từ LaborProfile row + edit payload, sau khi đã chuẩn hoá):
 *   - Có `fullName` (non-null, non-empty) AND có phone (`phone` hoặc
 *     `normalizedPhone` non-null, non-empty) AND có `cccdNumber` (non-null,
 *     non-empty) → 'COMPLETE' (alias 'FULL' trong dictionary hiện có).
 *   - Ngược lại → 'MINIMAL'.
 *
 * Hàm pure: không phụ thuộc DB, không phụ thuộc thời gian; test trực tiếp.
 * Caller (PATCH route) dùng giá trị này để ghi `completeness` xuống DB; UI
 * đọc qua `laborProfileCompletenessLabel` (đã alias COMPLETE/FULL → "Đầy đủ").
 */
export function deriveCompleteness(input: {
  fullName: string | null | undefined;
  phone: string | null | undefined;
  normalizedPhone: string | null | undefined;
  cccdNumber: string | null | undefined;
}): LaborProfileCompletenessLevel {
  const nameOk = typeof input.fullName === 'string' && input.fullName.trim().length > 0;
  const phoneOk =
    (typeof input.phone === 'string' && input.phone.trim().length > 0) ||
    (typeof input.normalizedPhone === 'string' && input.normalizedPhone.trim().length > 0);
  const cccdOk = typeof input.cccdNumber === 'string' && input.cccdNumber.trim().length > 0;
  if (nameOk && phoneOk && cccdOk) return 'COMPLETE';
  return 'MINIMAL';
}

export interface UpdateLaborProfileIntakeInput extends LaborProfileEditableFields {
  id: string;
  actorId: string;
}

export interface UpdateLaborProfileIntakeResult {
  id: string;
  fullName: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  cccdNumber: string | null;
  completeness: LaborProfileCompletenessLevel;
  workerId: string | null;
  warnings: PossibleDuplicateWarning[];
}

/**
 * PATCH writer (DEC-P2-02..08). Single-row update trên LaborProfile
 * với guards sau:
 *
 *   - 409 typed: nếu `current.workerId != null` (đã liên kết Worker).
 *   - Không bao giờ set `workerId` từ payload.
 *   - `normalizedPhone` được derive từ `normalizePhone(phone)`.
 *   - `completeness` được recompute từ full set sau update.
 *   - Post-write: probe profile khác (exclude self) trùng `normalizedPhone`
 *     hoặc `cccdNumber` → typed warning; KHÔNG auto-merge.
 *
 * NOTE: Hàm này KHÔNG throw `LaborProfileAlreadyLinkedError` ra ngoài tx —
 * caller (route layer) catch + map thành 409. Tx rollback tự nhiên vì
 * exception ném ra trước `tx.laborProfile.update`.
 */
export async function updateLaborProfileIntakeProfile(
  tx: Prisma.TransactionClient,
  input: UpdateLaborProfileIntakeInput,
): Promise<UpdateLaborProfileIntakeResult> {
  // 1. Read current row (idempotent re-read; 1 lần SELECT).
  const current = await tx.laborProfile.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      fullName: true,
      phone: true,
      normalizedPhone: true,
      cccdNumber: true,
      workerId: true,
    },
  });
  if (!current) {
    const err = new Error('LABOR_PROFILE_NOT_FOUND');
    (err as Error & { code: string }).code = 'LABOR_PROFILE_NOT_FOUND';
    throw err;
  }

  // 2. DEC-P2-06: lock nếu đã liên kết Worker.
  if (current.workerId) {
    throw new LaborProfileAlreadyLinkedError(current.workerId);
  }

  // 3. Compose the post-update value set.
  //    Nếu caller không truyền field nào → giữ nguyên; nếu truyền null
  //    (cccdNumber) → set null; nếu truyền string rỗng → set null.
  const nextFullName =
    input.fullName !== undefined
      ? input.fullName.trim().length > 0
        ? input.fullName.trim()
        : null
      : current.fullName;

  // DEC-P2-04: phone normalization cùng helper intake writer đang dùng.
  let nextPhone: string | null;
  let nextNormalizedPhone: string | null;
  if (input.phone !== undefined) {
    const trimmed = input.phone.trim();
    if (!trimmed) {
      nextPhone = null;
      nextNormalizedPhone = null;
    } else {
      nextPhone = trimmed;
      const norm = normalizePhone(trimmed);
      nextNormalizedPhone = norm.length > 0 ? norm : null;
    }
  } else {
    nextPhone = current.phone;
    nextNormalizedPhone = current.normalizedPhone;
  }

  const nextCccd =
    input.cccdNumber !== undefined
      ? input.cccdNumber !== null && input.cccdNumber.trim().length > 0
        ? input.cccdNumber.trim()
        : null
      : current.cccdNumber;

  const nextCompleteness = deriveCompleteness({
    fullName: nextFullName,
    phone: nextPhone,
    normalizedPhone: nextNormalizedPhone,
    cccdNumber: nextCccd,
  });

  // 4. DEC-P2-03 + DEC-P2-08: update CHỈ 3 field, KHÔNG workerId.
  //    `prisma.laborProfile.update` KHÔNG có option để set workerId từ input
  //    — type system Prisma cũng không cho nếu payload không truyền key.
  const updated = await tx.laborProfile.update({
    where: { id: input.id },
    data: {
      fullName: nextFullName,
      phone: nextPhone,
      normalizedPhone: nextNormalizedPhone,
      cccdNumber: nextCccd,
      completeness: nextCompleteness,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      normalizedPhone: true,
      cccdNumber: true,
      completeness: true,
      workerId: true,
    },
  });

  // 5. Post-write duplicate probe (DEC-P2-07).
  const orClauses: Prisma.LaborProfileWhereInput[] = [];
  if (nextNormalizedPhone) {
    orClauses.push({ normalizedPhone: nextNormalizedPhone });
  }
  if (nextCccd) {
    orClauses.push({ cccdNumber: nextCccd });
  }
  const warnings: PossibleDuplicateWarning[] = [];
  if (orClauses.length > 0) {
    const others = await tx.laborProfile.findMany({
      where: {
        id: { not: input.id },
        workerId: null, // chỉ probe trong intake list (intake-only dedup hint)
        OR: orClauses,
      },
      select: { id: true, normalizedPhone: true, cccdNumber: true },
      take: 25, // safety cap
    });
    const phoneIds = new Set<string>();
    const cccdIds = new Set<string>();
    for (const o of others) {
      if (nextNormalizedPhone && o.normalizedPhone === nextNormalizedPhone) phoneIds.add(o.id);
      if (nextCccd && o.cccdNumber === nextCccd) cccdIds.add(o.id);
    }
    if (phoneIds.size > 0) {
      warnings.push({
        kind: 'POSSIBLE_DUPLICATE',
        signal: 'normalizedPhone',
        laborProfileIds: Array.from(phoneIds),
      });
    }
    if (cccdIds.size > 0) {
      warnings.push({
        kind: 'POSSIBLE_DUPLICATE',
        signal: 'cccdNumber',
        laborProfileIds: Array.from(cccdIds),
      });
    }
  }

  return {
    id: updated.id,
    fullName: updated.fullName,
    phone: updated.phone,
    normalizedPhone: updated.normalizedPhone,
    cccdNumber: updated.cccdNumber,
    completeness: updated.completeness as LaborProfileCompletenessLevel,
    workerId: updated.workerId,
    warnings,
  };
}
