/**
 * labor-profile.types.ts — N1 intake writer (DEC-01, DEC-02, DEC-03).
 *
 * Type discriminated union cho createOrMatchLaborProfile (TIER0_HANDOVER.md §N1).
 *
 * Tên chuẩn mới: `NEW_PROFILE` (theo chỉ thị Owner 14/09 — tài liệu N1 cũ ghi
 * `NEW`; phase này dùng `NEW_PROFILE` làm tên chuẩn để phân biệt với các status
 * khác dùng từ `NEW` trong domain).
 *
 * KHÔNG auto-merge (DEC-04): POSSIBLE_MATCH trả candidate + conflictingEvidence;
 * caller tự quyết (merge thuộc V6P-007B out of scope phase này).
 */

export type CreateOrMatchVerdict =
  | 'EXACT_MATCH'
  | 'POSSIBLE_MATCH'
  | 'NEW_PROFILE';

export type ApplicantSignalKey =
  | 'normalizedPhone'
  | 'cccdNumber'
  | 'fullName'
  | 'dateOfBirth';

/**
 * Tín hiệu match giữa applicant input và một existing profile.
 * - `signalsMatched`: danh sách key khớp (≥2 cho EXACT_MATCH).
 * - `conflictingEvidence`: danh sách key mà applicant và profile giống tín hiệu
 *   đầu vào (vd cùng phone) nhưng giá trị lại khác (vd DOB khác).
 */
export interface MatchedEvidence {
  candidateId: string;
  signalsMatched: ApplicantSignalKey[];
  conflictingEvidence: ApplicantSignalKey[];
}

/**
 * Result trả về cho caller (discriminated union theo verdict).
 */
export interface CreateOrMatchNewProfile {
  verdict: 'NEW_PROFILE';
  /** Profile vừa tạo. `null` nếu caller không cần insert ngay. */
  laborProfileId: string | null;
  /** Caller đã cung cấp tín hiệu nào trước khi tạo (debug/audit). */
  signalsProvided: ApplicantSignalKey[];
}

export interface CreateOrMatchExactMatch {
  verdict: 'EXACT_MATCH';
  laborProfileId: string;
  signalsMatched: ApplicantSignalKey[];
  conflictingEvidence: never[];
}

export interface CreateOrMatchPossibleMatch {
  verdict: 'POSSIBLE_MATCH';
  /** KHÔNG tự merge — caller phải tự quyết. */
  laborProfileId: string | null;
  candidates: Array<{
    laborProfileId: string;
    signalsMatched: ApplicantSignalKey[];
    conflictingEvidence: ApplicantSignalKey[];
  }>;
  /** Có ít nhất 1 candidate có conflicting evidence — KHÔNG auto-merge. */
  hasConflict: boolean;
}

export type CreateOrMatchResult =
  | CreateOrMatchExactMatch
  | CreateOrMatchPossibleMatch
  | CreateOrMatchNewProfile;

/**
 * Input tối thiểu cho createOrMatchLaborProfile (TIER0_HANDOVER.md §N1).
 * Caller có thể cung cấp 1-n tín hiệu; phase này KHÔNG bắt buộc tất cả.
 */
export interface ApplicantInput {
  fullName?: string | null;
  phone?: string | null;
  cccdNumber?: string | null;
  dateOfBirth?: string | Date | null;
}

/**
 * Existing profile row (đủ trường để scoring).
 *
 * NOTE: LaborProfile schema hiện KHÔNG có `dateOfBirth` (chỉ Worker/User/CandidateSubmission);
 * DATE_OF_BIRTH match chỉ dùng cho identity signals của applicant input, không so với
 * LaborProfile. Phase này chỉ match trên `normalizedPhone` + `cccdNumber` + `fullName`.
 */
export interface ExistingLaborProfile {
  id: string;
  fullName: string | null;
  normalizedPhone: string | null;
  cccdNumber: string | null;
}

// ════════════════════════════════════════════════════════════════════════
// Pre-P2 hotfix (T1B) — LaborProfile edit surface types.
// ════════════════════════════════════════════════════════════════════════

/**
 * Field set mà admin LaborProfile edit PATCH cho phép.
 *
 * DEC-P2-03: `workerId` KHÔNG thuộc editable set. Conversion flow từ PR #107
 * (`linkLaborProfileWorker`, CAS-update trên `where: { id, workerId: null }`)
 * là đường duy nhất set `workerId`; route PATCH chỉ chỉnh intake fields
 * thuần. `consentAt`, `identityVerification`, `completeness` cũng không
 * thuộc editable set — completeness được server derive lại từ input.
 */
export interface LaborProfileEditableFields {
  fullName?: string;
  phone?: string;
  cccdNumber?: string | null;
}

/**
 * Server-derived completeness levels.
 *
 * DEC-P2-05: pure; nguồn là `{ fullName, phone | normalizedPhone, cccdNumber }`.
 * LaborProfile schema hiện có hai label hợp lệ `MINIMAL` và `COMPLETE`
 * (dictionary `laborProfile-ui.ts` alias `COMPLETE → "Đầy đủ"`, `FULL → "Đầy đủ"`
 * để tương thích ngược với row cũ).
 */
export type LaborProfileCompletenessLevel = 'MINIMAL' | 'COMPLETE' | 'FULL';

/**
 * Typed warning PATCH trả về khi probe thấy profile khác trùng tín hiệu
 * nhận dạng. Caller quyết định merge hay không — server KHÔNG auto-merge
 * (cùng DEC-04 với `createOrMatchLaborProfile`).
 */
export type PossibleDuplicateWarning = {
  kind: 'POSSIBLE_DUPLICATE';
  signal: 'normalizedPhone' | 'cccdNumber';
  laborProfileIds: string[];
};

/**
 * Lỗi fail-closed khi cố sửa LaborProfile đã được liên kết Worker.
 *
 * DEC-P2-06: chỉ `linkLaborProfileWorker` (PR #107) mới được ghi
 * `workerId`. PATCH endpoint phải abort typed trước khi UPDATE.
 */
export class LaborProfileAlreadyLinkedError extends Error {
  public readonly code = 'LABOR_PROFILE_ALREADY_LINKED' as const;
  constructor(public readonly workerId: string) {
    super('LaborProfile is already linked to a Worker; edit is locked');
    this.name = 'LaborProfileAlreadyLinkedError';
  }
}
