'use client';

/**
 * AdminShell — Client wrapper quanh `RoleGuardLayout` (shared/ui).
 *
 * Phase 4 slice 4A (STEP-01): dùng nav `ADMIN_NAV_PHASE4` (4 nhóm Staffing / Chấm công /
 * Đối soát / Job Board) — export từ role-guard-layout.
 *
 * DEC-17 (UI skeleton round 1): render đủ narrative F00A — không cần design polish.
 */

import * as React from 'react';
import { RoleGuardLayout } from '@/src/shared/ui/role-guard/role-guard-layout';
import type { NavItem, Role } from '@/src/shared/ui/role-guard/role-guard-layout';
import type { SystemRole } from '@prisma/client';

export interface AdminShellProps {
  role: SystemRole;
  userId: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

/**
 * Ánh xạ SystemRole (Prisma enum) → Role (shared UI hiện có).
 * 2 role ADMIN_PORTAL không nằm RoleGuardLayout module (HR_MANAGER, HR_STAFF, ACCOUNTANT).
 * - HR_MANAGER có riêng trong shared UI.
 * - HR_STAFF, ACCOUNTANT, SALE, DIRECTOR không có → mở rộng inline.
 */
const SYSTEM_TO_UI_ROLE: Record<SystemRole, Role> = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_STAFF: 'HR_STAFF',
  ACCOUNTANT: 'ACCOUNTANT',
  PM: 'PM',
  SALE: 'SALE',
  DIRECTOR: 'DIRECTOR',
  WORKER: 'WORKER',
  MKT: 'WORKER', // đường tạm — Admin portal role check sẽ reject
  VENDOR_ADMIN: 'WORKER',
  VENDOR_STAFF: 'WORKER',
  CTV: 'WORKER',
  EMPLOYEE: 'WORKER',
};

export function AdminShell({ role, userId, navItems, children }: AdminShellProps) {
  const uiRole = SYSTEM_TO_UI_ROLE[role] ?? 'ADMIN';

  return (
    <RoleGuardLayout
      role={uiRole}
      portal="admin"
      navItems={navItems}
      user={{ name: userId, avatarUrl: undefined }}
      brandTitle="HRP Admin"
      brandSubtitle="Nội bộ — Phase 4"
    >
      {children}
    </RoleGuardLayout>
  );
}
