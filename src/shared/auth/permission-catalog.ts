/**
 * Permission Catalog — Phase 1 identity-core (RQ-01, DEC-02).
 *
 * Danh mục permission codes — KHÔNG hardcode quyền trong code.
 * Mỗi code phải được seed vào bảng `permissions` (prisma/seed.mjs §4.2 + §Plan).
 * Resolver đọc từ DB để quyết định allow/deny (src/shared/auth/permission-resolver.ts).
 *
 * Convention: prefix `CAN_` cho action permission, không có cho nhóm.
 * Group dùng để UI phân tab/filter (PAYROLL, CONTRACT, TICKET, REFERRAL, STATEMENT, WORKER, SYSTEM).
 */
export const PERMISSION_GROUPS = {
  SYSTEM: 'SYSTEM',
  PAYROLL: 'PAYROLL',
  CONTRACT: 'CONTRACT',
  TICKET: 'TICKET',
  REFERRAL: 'REFERRAL',
  STATEMENT: 'STATEMENT',
  WORKER: 'WORKER',
} as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS];

export interface PermissionDescriptor {
  code: string;
  group: PermissionGroup;
  description: string;
}

/**
 * 10 codes (DEC-02 — ≥10):
 *  - 8 codes theo data-scope-security §4.2 (Sprint 1 seed mẫu)
 *  - 2 codes bổ sung Planner:
 *    + CAN_VIEW_WORKER_SENSITIVE (Phase 2 masking dùng)
 *    + CAN_PROCESS_TICKET (nhóm TICKET — cancel/pay/reject)
 */
export const PERMISSION_CATALOG: readonly PermissionDescriptor[] = [
  {
    code: 'CAN_MANAGE_PERMISSIONS',
    group: PERMISSION_GROUPS.SYSTEM,
    description: 'Cấp/thu quyền cho user khác (chỉ root cấp được — G22).',
  },
  {
    code: 'CAN_CREATE_WORKER',
    group: PERMISSION_GROUPS.WORKER,
    description: 'Tạo hồ sơ worker mới (Sale/HR tạo nguồn).',
  },
  {
    code: 'CAN_VIEW_UNASSIGNED_POOL',
    group: PERMISSION_GROUPS.WORKER,
    description: 'Xem pool worker chưa phân công (assignedToId = null).',
  },
  {
    code: 'CAN_VIEW_WORKER_SENSITIVE',
    group: PERMISSION_GROUPS.WORKER,
    description: 'Xem trường nhạy cảm (CCCD, bankAccount, selfie) — Phase 2 masking.',
  },
  {
    code: 'CAN_APPROVE_PAYROLL',
    group: PERMISSION_GROUPS.PAYROLL,
    description: 'Duyệt bảng lương (HR_MANAGER + ACCOUNTANT).',
  },
  {
    code: 'CAN_FORCE_LOCK_STATEMENT',
    group: PERMISSION_GROUPS.STATEMENT,
    description: 'Khóa statement cưỡng bức (reconciliation cuối kỳ).',
  },
  {
    code: 'CAN_VIEW_STATEMENT_MARGIN',
    group: PERMISSION_GROUPS.STATEMENT,
    description: 'Xem margin statement (ADMIN + ACCOUNTANT). PM khong xem (DEC-06).',
  },
  {
    code: 'CAN_OVERRIDE_REFERRAL_GUARD',
    group: PERMISSION_GROUPS.REFERRAL,
    description: 'Bỏ qua referral guard (SOP S1/S2/S3 §9.3.1).',
  },
  {
    code: 'CAN_APPROVE_TICKET_LEVEL2',
    group: PERMISSION_GROUPS.TICKET,
    description: 'Duyệt ticket level 2 (duyệt 2 chữ ký cho ADVANCE_SALARY).',
  },
  {
    code: 'CAN_PROCESS_TICKET',
    group: PERMISSION_GROUPS.TICKET,
    description: 'Xử lý ticket (cancel/pay/reject — Planner bổ sung nhóm TICKET).',
  },
  {
    code: 'CAN_EDIT_CONTRACT',
    group: PERMISSION_GROUPS.CONTRACT,
    description: 'Sửa hợp đồng worker (HR_MANAGER).',
  },
] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]['code'];

/** Set lookup O(1) — dùng cho validate input. */
export const PERMISSION_CODE_SET: ReadonlySet<string> = new Set(
  PERMISSION_CATALOG.map((p) => p.code),
);

/** Check code có trong catalog không (fail-closed — code lạ = reject). */
export function isKnownPermissionCode(code: string): code is PermissionCode {
  return PERMISSION_CODE_SET.has(code);
}

/** Get descriptor theo code — throw nếu lạ (fail-closed). */
export function getPermissionDescriptor(code: string): PermissionDescriptor {
  if (!isKnownPermissionCode(code)) {
    throw new Error(`UNKNOWN_PERMISSION_CODE: ${code}`);
  }
  return PERMISSION_CATALOG.find((p) => p.code === code)!;
}
