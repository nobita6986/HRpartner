/**
 * role-labels.ts — T1B Wave 1 Foundation shared role labels.
 *
 * Binding per `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md`
 * §3.4 (T0 §2 #3): SystemRole enum values are canonical and MUST NOT change.
 * They appear in `aria-label` / technical hint only. The operator-facing label
 * comes from this dictionary.
 *
 * Boundary rule:
 * - This file owns ONLY the SystemRole → Vietnamese label map.
 * - It does NOT own action / status / form labels (those live in
 *   `action-dictionary.ts`, the domain-owned dictionaries, `form-dictionary.ts`).
 * - It does NOT own the Worker Portal's brand-portal subtitel ("HRP" / etc.).
 *
 * The `roleLabel()` helper accepts `string` (not `SystemRole`) so the shared
 * `RoleGuardLayout`'s local `Role` enum (admin / worker / vendor portal) can
 * reuse the lookup. Prisma `SystemRole` is the binding source; the helper
 * dispatches on the string value.
 */

import type { SystemRole } from '@prisma/client';

export const ROLE_LABELS: Readonly<Record<SystemRole, string>> = {
  ADMIN: 'Quản trị viên',
  HR_MANAGER: 'Quản lý nhân sự',
  DIRECTOR: 'Giám đốc',
  HR_STAFF: 'Chuyên viên nhân sự',
  SALE: 'Sale',
  PM: 'PM',
  ACCOUNTANT: 'Kế toán',
  MKT: 'Marketing',
  VENDOR_ADMIN: 'Quản trị NCC',
  VENDOR_STAFF: 'Nhân viên NCC',
  CTV: 'Cộng tác viên',
  WORKER: 'Người lao động',
  EMPLOYEE: 'Nhân viên',
};

/**
 * Lookup helper. Returns the Vietnamese operator-facing label for a SystemRole.
 *
 * Accepts `string` (not strictly `SystemRole`) so that the shared
 * `RoleGuardLayout` local `Role` enum can reuse the lookup. Values not in the
 * dictionary fall back to the canonical enum string.
 *
 * The local `Role` enum aliases that map to a different Prisma SystemRole:
 *   - `Role.VENDOR`  → label "Quản trị NCC" (closest match; both VENDOR_ADMIN
 *     and VENDOR_STAFF share "Quản trị NCC" / "Nhân viên NCC" labels — the
 *     vendor portal renders the umbrella brand).
 *
 * The fallback case is logged via the comment in `ROLE_LABELS`; production
 * code MUST NOT branch on the fallback.
 */
const LOCAL_ROLE_ALIASES: Readonly<Record<string, SystemRole>> = {
  VENDOR: 'VENDOR_ADMIN',
};

export function roleLabel(role: string): string {
  const canonical = LOCAL_ROLE_ALIASES[role] ?? (role as SystemRole);
  return ROLE_LABELS[canonical] ?? role;
}