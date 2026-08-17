/**
 * StaffingOrder + StaffingOrderSlot L1 scope builder (Phase 4 slice 4A STEP-02).
 *
 * RQ-18 / RQ-01 / DEC-15: StaffingOrder + slot dùng project scope.
 * Phase 2 đã có `hrp_project_visible_for` / `hrp_project_writable` (DEV helper).
 * Ở L1 (Prisma extension), dùng `AuthContext.role` → Prisma.WhereInput.
 *
 * StaffingOrder scope = project scope (reuse `buildProjectScope`).
 * StaffingOrderSlot scope = parent staffing_order.scope.
 *
 * Pattern: mirror `scopes/{worker,project,vendor,ctv}.scope.ts` Phase 2.
 */
import type { Prisma } from '@prisma/client';
import { AuthContext } from '@/src/shared/auth/auth-context';
import { buildProjectScope } from '@/src/shared/auth/scopes/project.scope';

/**
 * L1 scope cho StaffingOrder — dùng project scope.
 * ADMIN/HR/SALE/ACCOUNTANT/DIRECTOR thấy tất cả.
 * PM chỉ thấy orders của project mình quản lý.
 * VENDOR chỉ thấy orders của vendor có submission trên project (public).
 */
export function buildStaffingOrderScope(ctx: AuthContext): Prisma.StaffingOrderWhereInput {
  // ADMIN/HR/SALE/ACCOUNTANT/DIRECTOR → all orders
  if (['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'SALE', 'DIRECTOR'].includes(ctx.role)) {
    return {};
  }

  // PM → chỉ orders thuộc project mình quản lý
  if (ctx.role === 'PM') {
    return {
      project: buildProjectScope(ctx),
    };
  }

  // VENDOR_ADMIN / VENDOR_STAFF → chỉ orders trên project public hoặc có submission của vendor
  if (['VENDOR_ADMIN', 'VENDOR_STAFF'].includes(ctx.role)) {
    return {
      project: buildProjectScope(ctx),
    };
  }

  // WORKER / CTV / MKT / others → deny-by-default
  return { id: '__IMPOSSIBLE__' };
}

/**
 * L1 scope cho StaffingOrderSlot — existence check qua parent StaffingOrder.
 * Đã có RLS L2 enforcement (STEP-21).
 * L1 cần thiết cho Prisma extension queries.
 */
export function buildStaffingOrderSlotScope(
  ctx: AuthContext,
): Prisma.StaffingOrderSlotWhereInput {
  // ADMIN/HR/SALE/ACCOUNTANT/DIRECTOR → all slots
  if (['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'SALE', 'DIRECTOR'].includes(ctx.role)) {
    return {};
  }

  // PM / VENDOR_* → slots thuộc orders có project scope
  if (['PM', 'VENDOR_ADMIN', 'VENDOR_STAFF'].includes(ctx.role)) {
    return {
      staffingOrder: buildStaffingOrderScope(ctx),
    };
  }

  // WORKER / CTV / MKT → deny
  return { id: '__IMPOSSIBLE__' };
}
