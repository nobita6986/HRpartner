/**
 * placement.lifecycle.ts — N3 (V6 Phase 1+) DEC-05.
 *
 * Pure state machine cho Placement lifecycle. KHÔNG phụ thuộc Prisma/DB.
 * Mục đích: một nguồn duy nhất cho state transition rules — unit test đầy đủ,
 * service layer gọi để validate trước khi touch DB.
 *
 * Quy tắc (DEC-05):
 *   - SELECTED → CONFIRMED (next normal)
 *   - CONFIRMED → EFFECTIVE (chỉ client-managed; HRP-managed REJECT — DEC-07)
 *   - Side exits: SELECTED | CONFIRMED → FAILED | CANCELLED
 *   - EFFECTIVE KHÔNG revert trong N3 (correction/void out of scope — V6P-020A)
 *   - FAILED | CANCELLED KHÔNG revert về SELECTED trong N3
 *
 * Pure function: cùng (current, target) trả cùng kết quả. Idempotent trong chính nó.
 */

import { PlacementStatus, ServiceModel } from '@prisma/client';

/** Pure: classify ServiceModel → managementMode (DEC-02). */
export type ManagementMode = 'HRP_MANAGED' | 'CLIENT_MANAGED';

export function computeManagementMode(serviceModel: ServiceModel | null): ManagementMode | null {
  if (serviceModel === null) return null;
  switch (serviceModel) {
    case 'STAFFING_SUPPLY':
    case 'LABOR_LEASING':
      return 'HRP_MANAGED';
    case 'RECRUITMENT_SERVICE':
    case 'REFERRAL_SERVICE':
      return 'CLIENT_MANAGED';
  }
}

/** Result type cho transition query. */
export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID_TRANSITION' | 'HRP_EFFECTIVE_FORBIDDEN' | 'EFFECTIVE_TERMINAL' | 'TERMINAL_STATE' };

/**
 * Pure: check (current → target) có hợp lệ không.
 *
 * @param current Status hiện tại của Placement.
 * @param target Status muốn chuyển tới.
 * @param managementMode null nếu chưa phân loại ServiceModel (DEC-10 reject).
 *
 * Lưu ý: hàm này KHÔNG kiểm tra managementMode cho EFFECTIVE — caller (service layer)
 * truyền đúng managementMode vào. Nếu managementMode = HRP_MANAGED và target = EFFECTIVE,
 * trả `{ ok: false, reason: 'HRP_EFFECTIVE_FORBIDDEN' }` (DEC-07).
 */
export function canTransition(
  current: PlacementStatus,
  target: PlacementStatus,
  managementMode: ManagementMode | null,
): TransitionResult {
  // Same state → ok (idempotent).
  if (current === target) return { ok: true };

  // EFFECTIVE là terminal trong N3 (DEC-05).
  if (current === 'EFFECTIVE') {
    return { ok: false, reason: 'EFFECTIVE_TERMINAL' };
  }

  // FAILED | CANCELLED cũng terminal trong N3 — không revert.
  if (current === 'FAILED' || current === 'CANCELLED') {
    return { ok: false, reason: 'TERMINAL_STATE' };
  }

  // HRP-managed: KHÔNG cho EFFECTIVE (DEC-07).
  if (managementMode === 'HRP_MANAGED' && target === 'EFFECTIVE') {
    return { ok: false, reason: 'HRP_EFFECTIVE_FORBIDDEN' };
  }

  // SELECTED → CONFIRMED | FAILED | CANCELLED.
  if (current === 'SELECTED') {
    if (target === 'CONFIRMED' || target === 'FAILED' || target === 'CANCELLED') return { ok: true };
    return { ok: false, reason: 'INVALID_TRANSITION' };
  }

  // CONFIRMED → EFFECTIVE (client-managed only — guard trên) | FAILED | CANCELLED.
  if (current === 'CONFIRMED') {
    if (target === 'EFFECTIVE' || target === 'FAILED' || target === 'CANCELLED') return { ok: true };
    return { ok: false, reason: 'INVALID_TRANSITION' };
  }

  // SELECTED → SELECTED đã handle ở trên (same state).
  return { ok: false, reason: 'INVALID_TRANSITION' };
}

/**
 * Pure: check Placement còn "active" (SELECTED hoặc CONFIRMED) — dùng cho query patterns.
 */
export function isActivePlacement(status: PlacementStatus): boolean {
  return status === 'SELECTED' || status === 'CONFIRMED';
}

/**
 * Pure: check Placement ở terminal state.
 */
export function isTerminalPlacement(status: PlacementStatus): boolean {
  return status === 'EFFECTIVE' || status === 'FAILED' || status === 'CANCELLED';
}

/**
 * Pure: liệt kê transitions hợp lệ từ một state (dùng cho debug/test).
 */
export function allowedTransitions(
  current: PlacementStatus,
  managementMode: ManagementMode | null,
): PlacementStatus[] {
  const candidates: PlacementStatus[] = ['SELECTED', 'CONFIRMED', 'EFFECTIVE', 'FAILED', 'CANCELLED'];
  return candidates.filter((target) => canTransition(current, target, managementMode).ok);
}
