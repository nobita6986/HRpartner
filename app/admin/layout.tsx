/**
 * /admin layout (Phase 4 slice 4A STEP-01 — RQ-18, RQ-19).
 *
 * Server Component: guard session + render AdminShell (Client) với nav 4 nhóm slice.
 *
 * Flow:
 *   1. Read session từ `hrp_token` cookie (Phase 1).
 *   2. Nếu không có session → redirect /login.
 *   3. Nếu role không phải admin portal → redirect /forbidden (TODO Phase 4 page).
 *   4. Render AdminShell (client) với nav items theo role.
 *
 * Stub cho Phase 4 skeleton (DEC-17): UI mount 4 nhóm (Staffing / Chấm công /
 * Đối soát / Job Board) + role-guard. Polish round sau.
 *
 * Out of scope: KHÔNG đụng `app/job-board/*`,
 * `app/api/auth/`, `app/api/me/`, `middleware.ts`, vùng cấm auth core.
 */
import { redirect } from 'next/navigation';
import { ADMIN_NAV_PHASE4 } from '@/src/shared/ui/role-guard/role-guard-layout';
import { isAdminPortalRole, getServerSession } from '@/src/shared/auth/server-session';
import { AdminShell } from './admin-shell';

export const metadata = {
  title: 'Quản trị',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login?callback=/admin');
  }
  if (!isAdminPortalRole(session.role)) {
    // Worker và Vendor vào cổng khác; CTV/CTV_ADMIN cũng không có quyền admin.
    redirect('/forbidden');
  }

  return (
    <AdminShell
      role={session.role}
      userId={session.userId}
      navItems={ADMIN_NAV_PHASE4}
    >
      {children}
    </AdminShell>
  );
}
