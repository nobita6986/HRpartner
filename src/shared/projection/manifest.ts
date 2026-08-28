/**
 * Response Projection Manifest — V5-M1-09A "current field projection" (RQ-01/11/12/13).
 *
 * SOURCE OF TRUTH khai báo (declarative) cho mọi surface trả dữ liệu Worker / statement /
 * payslip / withdrawal / payroll-config. Không chứa logic runtime — chỉ định nghĩa:
 *   - 13 SystemRole canonical (EV-14) để test enumerate đủ.
 *   - Field-group allowlist (DEC-01: allowlist, KHÔNG blacklist-then-delete).
 *   - Mỗi surface: role được phép, permission hiệu lực bắt buộc (nếu có), self-rule.
 *   - Trạng thái Payment/PaymentAllocation = SCHEMA_NOT_AVAILABLE (DEC-12, defer M8-06).
 *
 * Implementation (projectWorker, các route DTO) PHẢI khớp manifest này; test cross-check
 * (manifest.test.ts) chứng minh implementation không lệch khỏi khai báo.
 *
 * Field names lấy CHÍNH XÁC từ prisma/schema.prisma (Worker, VendorStatement,
 * ClientStatement, PayrollConfig, CtvWithdrawalRequest) — KHÔNG đổi schema.
 */

/** 13 SystemRole canonical (EV-14). Test phủ đủ 13 (RQ-11/AC-10). */
export const SYSTEM_ROLES = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'ACCOUNTANT', 'MKT',
  'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
] as const;
export type ManifestRole = (typeof SYSTEM_ROLES)[number];

// ── Worker field groups (§4.3) ──────────────────────────────────────────────
/** An toàn cho mọi viewer role nội bộ đã qua row-scope. */
export const WORKER_CORE_FIELDS = [
  'id', 'userId', 'fullName', 'profileStatus', 'employmentStatus', 'riskStatus',
  'nationality', 'ownerId', 'assignedToId', 'accountUserId', 'managerId',
  'createdAt', 'updatedAt',
] as const;

/** Liên hệ/nhân thân — hiển thị cho viewer nội bộ + self; KHÔNG phải nhóm nhạy cảm CCCD/bank. */
export const WORKER_CONTACT_FIELDS = [
  'phone', 'dateOfBirth', 'gender', 'maritalStatus', 'permanentAddress',
  'currentAddress', 'hometown', 'ethnicGroup', 'religion', 'taxCode', 'insuranceCode',
] as const;

/**
 * Nhóm nhạy cảm SIX (RF-02 compat, DEC-04): mask '***' (khi có giá trị) / null (khi trống)
 * nếu KHÔNG có CAN_VIEW_WORKER_SENSITIVE hiệu lực và KHÔNG phải SELF_PROFILE.
 */
export const WORKER_SENSITIVE_MASKED_FIELDS = [
  'cccdNumber', 'cccdImageUrl', 'selfieImageUrl', 'bankAccount', 'bankName', 'bankBranch',
] as const;

/** CCCD issued metadata — chỉ lộ (real) khi được xem nhạy cảm; ngược lại null. */
export const WORKER_SENSITIVE_ISSUED_FIELDS = [
  'cccdIssuedDate', 'cccdIssuedPlace', 'cccdExpiryDate',
] as const;

/** Chip NFC/eKYC RAW — LUÔN LUÔN omit (DEC-05), kể cả self/privileged. */
export const WORKER_CHIP_RAW_FIELDS = ['cccdChipData'] as const;

// ── Statement / payslip / withdrawal / payroll field groups ─────────────────
export const STATEMENT_CORE_FIELDS = [
  'id', 'kind', 'partyId', 'partyName', 'periodMonth', 'periodYear', 'status',
  'version', 'disputeCount', 'confirmDeadlineAt', 'sentAt', 'lockedAt', 'createdAt',
] as const;
/** Vendor-side figure — vendor chỉ thấy của chính mình (DEC-07). */
export const VENDOR_FINANCIAL_FIELDS = ['totalAmount'] as const;
/** Client-side receivable — chỉ lộ khi có CAN_VIEW_STATEMENT_MARGIN hiệu lực (DEC-06). */
export const CLIENT_COMMERCIAL_FIELDS = ['totalAmount'] as const;
/** Payslip self — strict schema, KHÔNG kèm cache extras (DEC-09). */
export const PAYSLIP_SELF_FINANCIAL_FIELDS = [
  'workerId', 'periodMonth', 'periodYear', 'grossSalary', 'netSalary',
  'deductions', 'earned', 'computedAt',
] as const;
/** CTV withdrawal self — DTO OMIT ctvId (DEC-11). */
export const WITHDRAWAL_SELF_BANK_FIELDS = [
  'id', 'amountVnd', 'bankAccount', 'bankName', 'status', 'createdAt',
] as const;
/** PayrollConfig operational — OMIT createdBy (DEC-10). */
export const PAYROLL_CONFIG_OPERATIONAL_FIELDS = [
  'id', 'key', 'valueJson', 'valueType', 'description', 'legalRef', 'version',
  'effectiveFrom', 'effectiveTo', 'isActive', 'createdAt', 'updatedAt',
] as const;

// ── Surface declarations ────────────────────────────────────────────────────
export interface ProjectionSurface {
  /** Route + method (documentation). */
  route: string;
  /** Role được phép chạm surface (gate TRƯỚC field projection, DEC-02). */
  allowedRoles: readonly ManifestRole[];
  /** Permission hiệu lực điều khiển field visibility (null nếu surface không gate theo perm). */
  gatingPermission: string | null;
  /** Self-rule: caller chỉ thấy dữ liệu của chính mình (server-derived owner). */
  selfScoped: boolean;
  /** Field-group hiển thị (chỉ để tài liệu hoá + test coverage). */
  fieldGroups: readonly string[];
}

const INTERNAL_VIEWERS: readonly ManifestRole[] = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'ACCOUNTANT', 'SALE', 'DIRECTOR'];

export const PROJECTION_SURFACES: Record<string, ProjectionSurface> = {
  WORKER_LIST: {
    route: 'GET /api/workers',
    allowedRoles: INTERNAL_VIEWERS,
    gatingPermission: 'CAN_VIEW_WORKER_SENSITIVE',
    selfScoped: false,
    fieldGroups: ['WORKER_CORE', 'WORKER_CONTACT', 'WORKER_SENSITIVE_MASKED', 'WORKER_SENSITIVE_ISSUED'],
  },
  WORKER_MUTATE: {
    route: 'POST /api/workers · PUT /api/workers/[id]',
    allowedRoles: ['ADMIN', 'HR_MANAGER'],
    gatingPermission: 'CAN_VIEW_WORKER_SENSITIVE',
    selfScoped: false,
    fieldGroups: ['WORKER_CORE', 'WORKER_CONTACT', 'WORKER_SENSITIVE_MASKED', 'WORKER_SENSITIVE_ISSUED'],
  },
  WORKER_SELF: {
    route: 'GET /api/workers/me',
    allowedRoles: ['WORKER'],
    gatingPermission: null, // SELF_PROFILE luôn thấy CCCD/bank của chính mình (DEC-05)
    selfScoped: true,
    fieldGroups: ['WORKER_CORE', 'WORKER_CONTACT', 'WORKER_SENSITIVE_MASKED', 'WORKER_SENSITIVE_ISSUED'],
  },
  STATEMENT_LIST: {
    route: 'GET /api/statements',
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'],
    gatingPermission: 'CAN_VIEW_STATEMENT_MARGIN', // gate CLIENT totalAmount (DEC-06)
    selfScoped: false,
    fieldGroups: ['STATEMENT_CORE', 'VENDOR_FINANCIAL', 'CLIENT_COMMERCIAL'],
  },
  STATEMENT_MARGIN: {
    route: 'GET /api/statements/margin',
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'DIRECTOR'],
    gatingPermission: 'CAN_VIEW_STATEMENT_MARGIN',
    selfScoped: false,
    fieldGroups: ['CLIENT_COMMERCIAL', 'VENDOR_FINANCIAL'],
  },
  STATEMENT_GENERATE: {
    route: 'POST /api/statements/generate',
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DIRECTOR'],
    gatingPermission: null, // command-result DTO (id/kind/status/created) — không lộ figure (DEC-08)
    selfScoped: false,
    fieldGroups: ['STATEMENT_CORE'],
  },
  VENDOR_STATEMENT_LIST: {
    route: 'GET /api/vendor/statements',
    allowedRoles: ['VENDOR_ADMIN', 'VENDOR_STAFF'],
    gatingPermission: null,
    selfScoped: true,
    fieldGroups: ['STATEMENT_CORE', 'VENDOR_FINANCIAL'],
  },
  VENDOR_STATEMENT_EXPORT: {
    route: 'GET /api/vendor/statements/[id]/export',
    allowedRoles: ['VENDOR_ADMIN', 'VENDOR_STAFF'],
    gatingPermission: null,
    selfScoped: true,
    fieldGroups: ['STATEMENT_CORE', 'VENDOR_FINANCIAL'],
  },
  PAYSLIP_SELF: {
    route: 'GET /api/webhook/payslip',
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'WORKER'],
    gatingPermission: null,
    selfScoped: true, // WORKER → ctx.workerId; privileged → workerId tường minh
    fieldGroups: ['PAYSLIP_SELF_FINANCIAL'],
  },
  CTV_WITHDRAWAL_SELF: {
    route: 'GET/POST /api/ctv/withdrawals',
    allowedRoles: ['CTV'],
    gatingPermission: null,
    selfScoped: true,
    fieldGroups: ['WITHDRAWAL_SELF_BANK'],
  },
  PAYROLL_CONFIG_LIST: {
    route: 'GET /api/payroll',
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT'],
    gatingPermission: null,
    selfScoped: false,
    fieldGroups: ['PAYROLL_CONFIG_OPERATIONAL'],
  },
};

/**
 * Payment / PaymentAllocation (M1-09B) — SCHEMA_NOT_AVAILABLE (DEC-12).
 * Model canonical chưa tồn tại trong prisma/schema.prisma tại 2026-08-28 → KHÔNG projection,
 * KHÔNG mock-pass. Defer tới M8-06. Test khẳng định trạng thái này (RQ-13), KHÔNG PASS giả.
 */
export const PAYMENT_PROJECTION = {
  status: 'SCHEMA_NOT_AVAILABLE',
  models: ['Payment', 'PaymentAllocation'] as const,
  deferredTo: 'M8-06 (M1-09B)',
  note: 'Canonical Payment schema chưa tồn tại; projection sẽ định nghĩa khi model được thêm.',
} as const;
