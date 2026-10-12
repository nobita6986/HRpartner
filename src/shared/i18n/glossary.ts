/**
 * Cross-module Vietnamese glossary (T1B Wave 1 Foundation).
 *
 * Single source of truth for shared cross-module Vietnamese terms. Module-owned
 * dictionaries (e.g. `placement-ui.ts`, `project-ui.ts` future) MUST import the
 * cross-module terms they reuse from this file and MUST NOT redefine them.
 *
 * Authority binding (do NOT reopen):
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md §3.1
 * - docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md §3
 *
 * Architecture rule: this file owns ONLY cross-module Vietnamese terms. It does
 * NOT own:
 * - Status enum values (lives in domain-owned dictionaries; e.g. Application
 *   status in `src/domains/applications/placement-ui.ts`).
 * - Role enum values (lives in `src/shared/i18n/role-labels.ts`).
 * - Action labels (lives in `src/shared/i18n/action-dictionary.ts`).
 * - Common form/table labels (lives in `src/shared/i18n/form-dictionary.ts`).
 *
 * No global aggregator for status/action/role lives in this file or anywhere
 * else. T0 §3.C forbids it.
 */

export type GlossaryCode =
  | 'project'
  | 'staffing'
  | 'staffing_order'
  | 'staffing_order_slot'
  | 'job_opening'
  | 'job_posting'
  | 'candidate_submission'
  | 'project_assignment'
  | 'placement'
  | 'labor_profile_long'
  | 'labor_profile_short'
  | 'worker'
  | 'recruiter_workbench'
  | 'worker_id'
  | 'slug'
  | 'revision'
  | 'content_schema_version';

export interface GlossaryEntry {
  /** Stable identifier (canonical). Unique across the dictionary. */
  readonly code: GlossaryCode;
  /** Operator-facing Vietnamese label (binding). */
  readonly label: string;
  /**
   * Optional Vietnamese label WITH a technical hint in parens — used in
   * tooltips or where the canonical identifier must remain visible. Mirrors the
   * column from EP §3.1.
   */
  readonly labelWithTechnicalHint?: string;
  /** Free-form reference to the binding owner (T0 §2 item). */
  readonly ownerSource: string;
}

export const GLOSSARY: Readonly<Record<GlossaryCode, GlossaryEntry>> = {
  project: {
    code: 'project',
    label: 'Dự án',
    ownerSource: 'EP §3.1 #1 / T0 §2 #1',
  },
  staffing: {
    code: 'staffing',
    label: 'Nhu cầu tuyển dụng',
    ownerSource: 'EP §3.1 #2 / T0 §2 #4',
  },
  staffing_order: {
    code: 'staffing_order',
    label: 'Nhu cầu tuyển dụng',
    ownerSource: 'EP §3.1 #3 / T0 §2 #4',
  },
  staffing_order_slot: {
    code: 'staffing_order_slot',
    label: 'Vị trí cần tuyển',
    labelWithTechnicalHint: 'Vị trí cần tuyển (Slot)',
    ownerSource: 'EP §3.1 #4 / T0 §2 #5',
  },
  job_opening: {
    code: 'job_opening',
    label: 'Đợt tuyển dụng',
    labelWithTechnicalHint: 'Đợt tuyển dụng (JobOpening)',
    ownerSource: 'EP §3.1 #5 / T0 §2 #6',
  },
  job_posting: {
    code: 'job_posting',
    label: 'Tin tuyển dụng',
    labelWithTechnicalHint: 'Tin tuyển dụng (JobPosting)',
    ownerSource: 'EP §3.1 #6 / T0 §2 #7',
  },
  candidate_submission: {
    code: 'candidate_submission',
    label: 'Đơn ứng tuyển',
    ownerSource: 'EP §3.1 #7 / T0 §2 #8',
  },
  project_assignment: {
    code: 'project_assignment',
    label: 'Phân công dự án',
    labelWithTechnicalHint: 'Phân công dự án (Project Assignment)',
    ownerSource: 'EP §3.1 #8 / T0 §2 #9',
  },
  placement: {
    code: 'placement',
    label: 'Bố trí việc làm',
    labelWithTechnicalHint: 'Bố trí việc làm (Placement)',
    ownerSource: 'EP §3.1 #9 / T0 §2 #10',
  },
  labor_profile_long: {
    code: 'labor_profile_long',
    label: 'Hồ sơ người lao động',
    labelWithTechnicalHint: 'Hồ sơ người lao động (LaborProfile)',
    ownerSource: 'EP §3.1 #10 / T0 §2 #11',
  },
  labor_profile_short: {
    code: 'labor_profile_short',
    label: 'Hồ sơ NLĐ',
    ownerSource: 'EP §3.1 #11 / T0 §2 #11',
  },
  worker: {
    code: 'worker',
    label: 'Người lao động',
    labelWithTechnicalHint: 'Người lao động (Worker)',
    ownerSource: 'EP §3.1 #12 / T0 §2 #12',
  },
  recruiter_workbench: {
    code: 'recruiter_workbench',
    label: 'Bàn làm việc tuyển dụng',
    ownerSource: 'EP §3.1 #13 / T0 §2 #13',
  },
  worker_id: {
    code: 'worker_id',
    label: 'Mã người lao động',
    ownerSource: 'EP §3.1 #14 / T0 §2 #14',
  },
  slug: {
    code: 'slug',
    label: 'Đường dẫn tin',
    labelWithTechnicalHint: 'Đường dẫn tin (slug)',
    ownerSource: 'EP §3.1 #15',
  },
  revision: {
    code: 'revision',
    label: 'Phiên bản chỉnh sửa',
    labelWithTechnicalHint: 'Phiên bản chỉnh sửa (revision)',
    ownerSource: 'EP §3.1 #16',
  },
  content_schema_version: {
    code: 'content_schema_version',
    label: 'Phiên bản schema nội dung',
    labelWithTechnicalHint: 'Phiên bản schema nội dung (contentSchemaVersion)',
    ownerSource: 'EP §3.1 #17',
  },
};

/**
 * Lookup helper. Returns the operator-facing Vietnamese label for a glossary
 * code. Falls back to the canonical code itself if the entry is missing — the
 * caller MUST treat the fallback as a Wave 1 contract violation and either
 * add the entry or open a T0 decision.
 */
export function glossaryLabel(code: GlossaryCode): string {
  return GLOSSARY[code]?.label ?? code;
}

/** Same as `glossaryLabel` but returns the tooltip-with-hint variant if present. */
export function glossaryLabelWithHint(code: GlossaryCode): string {
  return GLOSSARY[code]?.labelWithTechnicalHint ?? GLOSSARY[code]?.label ?? code;
}