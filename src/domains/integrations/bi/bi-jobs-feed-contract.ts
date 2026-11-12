/**
 * bi-jobs-feed-contract.ts — hrp-bi-jobs-feed-sync-v1 (RQ-01, DEC-01)
 *
 * Canonical contract for:
 *  1. BI Public Jobs Feed (`https://bi.hrpartner.vn/feeds/jobs.v1.json`)
 *  2. Standardized 4-section "Phiếu yêu cầu tuyển dụng dự án" form on HRP Admin
 *
 * Kept 100% aligned with `mini-bi/src/lib/recruitment-posts/contract.ts`.
 */

export const RECRUITMENT_ENVIRONMENT_TYPES = [
  'CLEAN_ROOM',
  'NORMAL_ROOM',
  'SEMI_CLEAN_ROOM',
] as const;
export type RecruitmentEnvironmentType = (typeof RECRUITMENT_ENVIRONMENT_TYPES)[number];

export const RECRUITMENT_WORK_POSTURES = ['STANDING', 'SITTING'] as const;
export type RecruitmentWorkPosture = (typeof RECRUITMENT_WORK_POSTURES)[number];

export const RECRUITMENT_SHIFT_PATTERNS = [
  'DAY_ONLY',
  'TWO_SHIFTS',
  'THREE_SHIFTS',
  'OTHER',
] as const;
export type RecruitmentShiftPattern = (typeof RECRUITMENT_SHIFT_PATTERNS)[number];

export const RECRUITMENT_GENDER_REQUIREMENTS = ['FEMALE', 'MALE', 'ANY'] as const;
export type RecruitmentGenderRequirement = (typeof RECRUITMENT_GENDER_REQUIREMENTS)[number];

export const RECRUITMENT_EDUCATION_REQUIREMENTS = [
  'SECONDARY',
  'HIGH_SCHOOL',
  'NONE',
] as const;
export type RecruitmentEducationRequirement = (typeof RECRUITMENT_EDUCATION_REQUIREMENTS)[number];

export const ENVIRONMENT_TYPE_LABELS: Readonly<Record<RecruitmentEnvironmentType, string>> = {
  CLEAN_ROOM: 'Phòng sạch',
  NORMAL_ROOM: 'Phòng thường',
  SEMI_CLEAN_ROOM: 'Bán phòng sạch',
};

export const WORK_POSTURE_LABELS: Readonly<Record<RecruitmentWorkPosture, string>> = {
  STANDING: 'Làm đứng',
  SITTING: 'Làm ngồi',
};

export const SHIFT_PATTERN_LABELS: Readonly<Record<RecruitmentShiftPattern, string>> = {
  DAY_ONLY: 'Chuyên ngày',
  TWO_SHIFTS: '2 ca (ngày / đêm)',
  THREE_SHIFTS: '3 ca',
  OTHER: 'Ca khác',
};

export const GENDER_REQUIREMENT_LABELS: Readonly<Record<RecruitmentGenderRequirement, string>> = {
  FEMALE: 'Nữ',
  MALE: 'Nam',
  ANY: 'Nam / Nữ',
};

export const EDUCATION_REQUIREMENT_LABELS: Readonly<Record<RecruitmentEducationRequirement, string>> = {
  SECONDARY: 'THCS (Tốt nghiệp cấp 2)',
  HIGH_SCHOOL: 'THPT (Tốt nghiệp cấp 3)',
  NONE: 'Không yêu cầu bằng cấp',
};

export interface RecruitmentPostPublicLaborTypeItemV1 {
  labor_type_key: string;
  display_name: string;
}

export interface RecruitmentPostPublicLocationV1 {
  province_code: string;
  province_name: string;
  industrial_park_code: string;
  industrial_park_name: string;
}

export interface RecruitmentPostPublicGeneralV1 {
  customer_name: string;
  investment_origin: string | null;
  manufacturing_industry: string | null;
  job_description: string;
  environment_types: RecruitmentEnvironmentType[];
  work_postures: RecruitmentWorkPosture[];
  shift_pattern: RecruitmentShiftPattern;
  shift_details: string | null;
  labor_types: RecruitmentPostPublicLaborTypeItemV1[];
  supply_schedule_text: string | null;
  expected_headcount: number | null;
}

export interface RecruitmentPostPublicCandidateV1 {
  age_min: number | null;
  age_max: number | null;
  gender_requirement: RecruitmentGenderRequirement;
  gender_label: 'Nữ' | 'Nam' | 'Nam/Nữ' | string;
  education_requirement: RecruitmentEducationRequirement;
  experience_required: boolean;
  experience_details: string | null;
  accept_former_customer_workers: boolean;
  entry_assessment_text: string | null;
  other_requirements_text: string | null;
}

export interface RecruitmentPostPublicCompensationV1 {
  base_salary_vnd: string | null;
  base_salary_conditions: string | null;
  attendance_bonus_vnd: string | null;
  attendance_bonus_conditions: string | null;
  living_allowance_vnd: string | null;
  living_allowance_conditions: string | null;
  seniority_allowance_vnd: string | null;
  seniority_allowance_conditions: string | null;
  eyesight_allowance_vnd: string | null;
  eyesight_allowance_conditions: string | null;
  other_allowance_text: string | null;
  average_income_min_vnd: string | null;
  average_income_max_vnd: string | null;
  salary_payment_schedule: string | null;
  salary_advance_available: boolean;
  salary_advance_amount_vnd: string | null;
  salary_advance_schedule: string | null;
  weekly_salary_available: boolean;
  weekly_salary_payment_schedule: string | null;
  day_shift_8h_vnd: string | null;
  day_shift_11h_vnd: string | null;
  night_shift_8h_vnd: string | null;
  night_shift_11h_vnd: string | null;
  sunday_day_11h_vnd: string | null;
  sunday_night_11h_vnd: string | null;
  holiday_day_11h_vnd: string | null;
  holiday_night_11h_vnd: string | null;
  ppe_provided: boolean;
  ppe_details: string | null;
  other_benefits: string | null;
}

export interface RecruitmentPostPublicDocumentsV1 {
  require_original_cccd_and_copy: boolean;
  require_certified_resume: boolean;
  require_health_certificate_within_6_months: boolean;
  require_photo_3x4: boolean;
  require_degree_or_certificate: boolean;
  require_social_insurance_book: boolean;
  require_other_documents: boolean;
  other_documents_text: string | null;
}

export interface RecruitmentPostPublicJobItemV1 {
  id: string;
  brief_id: string;
  version: number;
  published_at: string;
  updated_at: string;
  location: RecruitmentPostPublicLocationV1;
  general: RecruitmentPostPublicGeneralV1;
  candidate: RecruitmentPostPublicCandidateV1;
  compensation: RecruitmentPostPublicCompensationV1;
  documents: RecruitmentPostPublicDocumentsV1;
}

export interface RecruitmentPostPublicFeedV1 {
  schema_version: 1;
  jobs: RecruitmentPostPublicJobItemV1[];
}

/**
 * Shared 4-section input model used by BOTH:
 *  - BI Public Feed mapper (`RecruitmentPostPublicJobItemV1`)
 *  - HRP Admin 4-Section Standard Form ("Phiếu yêu cầu tuyển dụng dự án")
 */
export interface StandardRecruitmentBriefInput {
  project_name?: string | null;
  location: RecruitmentPostPublicLocationV1;
  general: RecruitmentPostPublicGeneralV1;
  candidate: RecruitmentPostPublicCandidateV1;
  compensation: RecruitmentPostPublicCompensationV1;
  documents: RecruitmentPostPublicDocumentsV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
}

function asNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function isEnvironmentType(v: unknown): v is RecruitmentEnvironmentType {
  return typeof v === 'string' && (RECRUITMENT_ENVIRONMENT_TYPES as readonly string[]).includes(v);
}

function isWorkPosture(v: unknown): v is RecruitmentWorkPosture {
  return typeof v === 'string' && (RECRUITMENT_WORK_POSTURES as readonly string[]).includes(v);
}

function isShiftPattern(v: unknown): v is RecruitmentShiftPattern {
  return typeof v === 'string' && (RECRUITMENT_SHIFT_PATTERNS as readonly string[]).includes(v);
}

function isGenderRequirement(v: unknown): v is RecruitmentGenderRequirement {
  return typeof v === 'string' && (RECRUITMENT_GENDER_REQUIREMENTS as readonly string[]).includes(v);
}

function isEducationRequirement(v: unknown): v is RecruitmentEducationRequirement {
  return typeof v === 'string' && (RECRUITMENT_EDUCATION_REQUIREMENTS as readonly string[]).includes(v);
}

export type ParseBiJobsFeedResult =
  | { ok: true; data: RecruitmentPostPublicFeedV1 }
  | { ok: false; code: 'INVALID_FEED_PAYLOAD'; message: string };

/**
 * Strictly validates the JSON response from `https://bi.hrpartner.vn/feeds/jobs.v1.json`.
 * Fails closed if `schema_version !== 1` or `jobs` is not an array of valid items.
 */
export function parseBiJobsPublicFeedV1(raw: unknown): ParseBiJobsFeedResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      code: 'INVALID_FEED_PAYLOAD',
      message: 'Feed payload must be a JSON object.',
    };
  }

  if (raw.schema_version !== 1) {
    return {
      ok: false,
      code: 'INVALID_FEED_PAYLOAD',
      message: `Unsupported schema_version: ${String(raw.schema_version)}`,
    };
  }

  if (!Array.isArray(raw.jobs)) {
    return {
      ok: false,
      code: 'INVALID_FEED_PAYLOAD',
      message: 'Feed jobs field must be an array.',
    };
  }

  const jobs: RecruitmentPostPublicJobItemV1[] = [];

  for (let i = 0; i < raw.jobs.length; i += 1) {
    const item = raw.jobs[i];
    if (!isRecord(item)) {
      return {
        ok: false,
        code: 'INVALID_FEED_PAYLOAD',
        message: `jobs[${i}] must be an object.`,
      };
    }

    const briefId = asNullableString(item.brief_id) ?? asNullableString(item.id);
    const id = asNullableString(item.id) ?? briefId;
    const version = asNullableInt(item.version);
    const publishedAt = asNullableString(item.published_at);
    const updatedAt = asNullableString(item.updated_at) ?? publishedAt;

    if (!briefId || !id || version === null || version < 1 || !publishedAt || !updatedAt) {
      return {
        ok: false,
        code: 'INVALID_FEED_PAYLOAD',
        message: `jobs[${i}] missing required identity/version/timestamps.`,
      };
    }

    if (
      !isRecord(item.location) ||
      !isRecord(item.general) ||
      !isRecord(item.candidate) ||
      !isRecord(item.compensation) ||
      !isRecord(item.documents)
    ) {
      return {
        ok: false,
        code: 'INVALID_FEED_PAYLOAD',
        message: `jobs[${i}] (${briefId}) missing required 4-section blocks.`,
      };
    }

    const loc = item.location;
    const gen = item.general;
    const cand = item.candidate;
    const comp = item.compensation;
    const docs = item.documents;

    const provinceCode = asNullableString(loc.province_code) ?? 'OTHER';
    const provinceName = asNullableString(loc.province_name);
    const industrialParkCode = asNullableString(loc.industrial_park_code) ?? 'OTHER_PARK';
    const industrialParkName = asNullableString(loc.industrial_park_name);
    const customerName = asNullableString(gen.customer_name);
    const jobDescription = asNullableString(gen.job_description);

    if (!provinceName || !industrialParkName || !customerName || !jobDescription) {
      return {
        ok: false,
        code: 'INVALID_FEED_PAYLOAD',
        message: `jobs[${i}] (${briefId}) missing required location or general fields.`,
      };
    }

    const envTypes = Array.isArray(gen.environment_types)
      ? gen.environment_types.filter(isEnvironmentType)
      : [];
    const workPostures = Array.isArray(gen.work_postures)
      ? gen.work_postures.filter(isWorkPosture)
      : [];
    const shiftPattern: RecruitmentShiftPattern = isShiftPattern(gen.shift_pattern)
      ? gen.shift_pattern
      : 'OTHER';

    const laborTypes: RecruitmentPostPublicLaborTypeItemV1[] = Array.isArray(gen.labor_types)
      ? gen.labor_types
          .filter(isRecord)
          .map((lt) => ({
            labor_type_key: asNullableString(lt.labor_type_key) ?? 'GENERAL',
            display_name: asNullableString(lt.display_name) ?? 'Lao động phổ thông',
          }))
      : [];

    const genderReq: RecruitmentGenderRequirement = isGenderRequirement(cand.gender_requirement)
      ? cand.gender_requirement
      : 'ANY';
    const eduReq: RecruitmentEducationRequirement = isEducationRequirement(cand.education_requirement)
      ? cand.education_requirement
      : 'NONE';

    jobs.push({
      id,
      brief_id: briefId,
      version,
      published_at: publishedAt,
      updated_at: updatedAt,
      location: {
        province_code: provinceCode,
        province_name: provinceName,
        industrial_park_code: industrialParkCode,
        industrial_park_name: industrialParkName,
      },
      general: {
        customer_name: customerName,
        investment_origin: asNullableString(gen.investment_origin),
        manufacturing_industry: asNullableString(gen.manufacturing_industry),
        job_description: jobDescription,
        environment_types: envTypes,
        work_postures: workPostures,
        shift_pattern: shiftPattern,
        shift_details: asNullableString(gen.shift_details),
        labor_types: laborTypes,
        supply_schedule_text: asNullableString(gen.supply_schedule_text),
        expected_headcount: asNullableInt(gen.expected_headcount),
      },
      candidate: {
        age_min: asNullableInt(cand.age_min),
        age_max: asNullableInt(cand.age_max),
        gender_requirement: genderReq,
        gender_label: asNullableString(cand.gender_label) ?? GENDER_REQUIREMENT_LABELS[genderReq],
        education_requirement: eduReq,
        experience_required: asBoolean(cand.experience_required),
        experience_details: asNullableString(cand.experience_details),
        accept_former_customer_workers: asBoolean(cand.accept_former_customer_workers),
        entry_assessment_text: asNullableString(cand.entry_assessment_text),
        other_requirements_text: asNullableString(cand.other_requirements_text),
      },
      compensation: {
        base_salary_vnd: asNullableString(comp.base_salary_vnd),
        base_salary_conditions: asNullableString(comp.base_salary_conditions),
        attendance_bonus_vnd: asNullableString(comp.attendance_bonus_vnd),
        attendance_bonus_conditions: asNullableString(comp.attendance_bonus_conditions),
        living_allowance_vnd: asNullableString(comp.living_allowance_vnd),
        living_allowance_conditions: asNullableString(comp.living_allowance_conditions),
        seniority_allowance_vnd: asNullableString(comp.seniority_allowance_vnd),
        seniority_allowance_conditions: asNullableString(comp.seniority_allowance_conditions),
        eyesight_allowance_vnd: asNullableString(comp.eyesight_allowance_vnd),
        eyesight_allowance_conditions: asNullableString(comp.eyesight_allowance_conditions),
        other_allowance_text: asNullableString(comp.other_allowance_text),
        average_income_min_vnd: asNullableString(comp.average_income_min_vnd),
        average_income_max_vnd: asNullableString(comp.average_income_max_vnd),
        salary_payment_schedule: asNullableString(comp.salary_payment_schedule),
        salary_advance_available: asBoolean(comp.salary_advance_available),
        salary_advance_amount_vnd: asNullableString(comp.salary_advance_amount_vnd),
        salary_advance_schedule: asNullableString(comp.salary_advance_schedule),
        weekly_salary_available: asBoolean(comp.weekly_salary_available),
        weekly_salary_payment_schedule: asNullableString(comp.weekly_salary_payment_schedule),
        day_shift_8h_vnd: asNullableString(comp.day_shift_8h_vnd),
        day_shift_11h_vnd: asNullableString(comp.day_shift_11h_vnd),
        night_shift_8h_vnd: asNullableString(comp.night_shift_8h_vnd),
        night_shift_11h_vnd: asNullableString(comp.night_shift_11h_vnd),
        sunday_day_11h_vnd: asNullableString(comp.sunday_day_11h_vnd),
        sunday_night_11h_vnd: asNullableString(comp.sunday_night_11h_vnd),
        holiday_day_11h_vnd: asNullableString(comp.holiday_day_11h_vnd),
        holiday_night_11h_vnd: asNullableString(comp.holiday_night_11h_vnd),
        ppe_provided: asBoolean(comp.ppe_provided),
        ppe_details: asNullableString(comp.ppe_details),
        other_benefits: asNullableString(comp.other_benefits),
      },
      documents: {
        require_original_cccd_and_copy: asBoolean(docs.require_original_cccd_and_copy),
        require_certified_resume: asBoolean(docs.require_certified_resume),
        require_health_certificate_within_6_months: asBoolean(
          docs.require_health_certificate_within_6_months,
        ),
        require_photo_3x4: asBoolean(docs.require_photo_3x4),
        require_degree_or_certificate: asBoolean(docs.require_degree_or_certificate),
        require_social_insurance_book: asBoolean(docs.require_social_insurance_book),
        require_other_documents: asBoolean(docs.require_other_documents),
        other_documents_text: asNullableString(docs.other_documents_text),
      },
    });
  }

  return {
    ok: true,
    data: {
      schema_version: 1,
      jobs,
    },
  };
}
