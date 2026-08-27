/**
 * Staffing domain types — Phase 4 slice 4A (STEP-02, RQ-01).
 *
 * DEC-01: staff order CRUD + slot counter transactional.
 * DEC-08: quota 2 project trong 1 transaction (STEP-03 — transfer).
 *
 * Enums aligned với schema: StaffingOrder.status.
 * KHÔNG viết lại state machine generic (dùng state-machine.ts Phase 3 pattern cho statement/timesheet).
 */

/** StaffingOrder status — aligned với schema prisma (no enum type). */
export const STAFFING_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON', 'CLOSED', 'CANCELLED'] as const;
export type StaffingOrderStatus = (typeof STAFFING_ORDER_STATUSES)[number];

/**
 * Order còn "mở" để LIST và NHẬN submission — chính xác `OPEN|CLOSING_SOON`
 * (V5-M1-08 DEC-04). `CLOSED|CANCELLED` không list và không nhận submission.
 *
 * MỘT nguồn canonical để order list và submission mutation KHÔNG drift, đồng bộ với
 * `publish.service PUBLISHABLE_ORDER_STATUSES` và `public.service VISIBLE_ORDER_STATUSES`.
 * Lưu ý: enum StaffingOrder.status KHÔNG có `'ACTIVE'` — dùng constant này thay literal.
 */
export const OPEN_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON'] as const;
export type OpenOrderStatus = (typeof OPEN_ORDER_STATUSES)[number];

/** Predicate canonical: status của order có đang mở nhận hồ sơ không (DEC-04). */
export function isOpenOrderStatus(status: string): boolean {
  return (OPEN_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Slot fill intent — dùng trong transfer (STEP-03). */
export const FILL_INTENTS = ['NEW_ASSIGNMENT', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;
export type FillIntent = (typeof FILL_INTENTS)[number];

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** Input tạo StaffingOrder mới. */
export interface CreateStaffingOrderInput {
  projectId: string;
  title: string;
  description?: string;
  deadlineDate?: string; // ISO date string
  slots: CreateSlotInput[];
}

/** Input tạo 1 slot trong StaffingOrder. */
export interface CreateSlotInput {
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  hourlyRateVnd?: bigint | number; // BigInt VND (ADR-010)
  shiftStart?: string; // "07:00"
  shiftEnd?: string; // "17:00"
  validFrom: string; // ISO date
  validTo?: string;
  workLocation?: string;
}

/** Result sau khi fill slot thành công. */
export interface FillSlotResult {
  assignmentId: string;
  slotsRemaining: number;
  slotId: string;
}
