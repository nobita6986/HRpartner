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
