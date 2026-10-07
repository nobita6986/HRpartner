/**
 * /admin/projects — Server Component gate session + role-aware capability +
 * render the role-aware `ProjectsTableClient`.
 *
 * correction 1/1 (T0 PR #104) — role-aware UI:
 *   - ADMIN, HR_MANAGER → quản lý dự án (Thêm / Sửa) + công bố (Công bố dự án /
 *     Bỏ công bố dự án).
 *   - PM → quản lý dự án (Thêm / Sửa), KHÔNG có nút Công bố.
 *   - HR_STAFF → chỉ xem danh sách / slot trống / trạng thái công bố; KHÔNG
 *     Thêm, KHÔNG Sửa, KHÔNG Công bố.
 *   - SALE → backend `GET /api/projects` không mở rộng (SALE không có trong
 *     VIEWER_ROLES = ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR). Sidebar
 *     đã ẩn mục Dự án với SALE. Nếu SALE gõ URL trực tiếp, server page sẽ
 *     trả 403 — đây là incompatibility có sẵn của backend, không phải do
 *     correction này tạo ra.
 *
 * Capability is computed from `getServerSession()` so the visible buttons
 * match the API authority:
 *   - `canCreate` / `canEdit` ⇔ `ADMIN_ROLES` trong
 *     `app/api/projects/route.ts` (`['ADMIN','PM','HR_MANAGER']`).
 *   - `canPublish` ⇔ `PUBLISH_SCOPE_ROLES` trong
 *     `app/api/projects/[id]/publish/route.ts` (`['ADMIN','HR_MANAGER','SALE','DIRECTOR']`).
 *
 * Backend / auth / RLS / API permission KHÔNG bị sửa — capability là projection
 * từ `AuthContext.role` đã có, chỉ dùng để ẩn nút ở client cho đúng role.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import ProjectsTableClient, { type ProjectsCapability } from './projects-table-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mirror of `app/api/projects/route.ts` ADMIN_ROLES (POST /api/projects).
const ADMIN_ROLES = new Set(['ADMIN', 'PM', 'HR_MANAGER'] as const);
// Mirror of `app/api/projects/[id]/publish/route.ts` PUBLISH_SCOPE_ROLES.
const PUBLISH_SCOPE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE', 'DIRECTOR'] as const);
// Roles allowed to view project list — backend authority is
// `app/api/projects/route.ts` VIEWER_ROLES. SALE is intentionally excluded
// from the viewer set in the backend; if a SALE user reaches this page via
// a bookmark the API will return 403 and the client shows the "incompatibility
// có sẵn" message.
const VIEWER_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'DIRECTOR',
] as const);

function deriveCapability(role: string | undefined): ProjectsCapability {
  if (!role) {
    return { canView: false, canCreate: false, canEdit: false, canPublish: false };
  }
  const roleStr = String(role);
  return {
    canView: (VIEWER_ROLES as ReadonlySet<string>).has(roleStr),
    canCreate: (ADMIN_ROLES as ReadonlySet<string>).has(roleStr),
    canEdit: (ADMIN_ROLES as ReadonlySet<string>).has(roleStr),
    canPublish: (PUBLISH_SCOPE_ROLES as ReadonlySet<string>).has(roleStr),
  };
}

export default async function AdminProjectsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/projects');
  }

  // `/admin` layout đã gate `isAdminPortalRole` rồi, nhưng đây là lớp guard
  // bổ sung nếu page được tái sử dụng ở ngoài layout.
  const capability = deriveCapability(session.role);

  return <ProjectsTableClient capability={capability} role={session.role} />;
}
