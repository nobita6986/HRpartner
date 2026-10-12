/**
 * /admin/projects/[id] — Trang quản trị Dự án.
 *
 * T1A PRE-P2 PROJECT MANAGEMENT HOTFIX (T0 directive):
 *   - Trang chi tiết có đầy đủ capability quản trị: Sửa, Kích hoạt/Tạm dừng,
 *     Hoàn thành, Huỷ, Xoá vĩnh viễn (ADMIN-only).
 *   - Việt hoá toàn bộ copy operator-facing; map enum ra nhãn tiếng Việt
 *     qua `projectStatusLabel` / `projectStatusTone`. KHÔNG dịch mã/ID do
 *     người dùng nhập.
 *   - Capability dẫn xuất từ session role, mirror authority backend.
 *   - Bốn action trạng thái chỉ render khi `canChangeStatus` VÀ transition
 *     hợp lệ từ state hiện tại; COMPLETED/CANCELLED = terminal ⇒ toolbar
 *     chuyển trạng thái ẩN.
 *   - Mỗi nhu cầu tuyển dụng link tới `/admin/staffing-orders/{id}`; vị trí
 *     cần tuyển chỉ link khi route detail thực sự tồn tại.
 *
 * Không sửa schema/RLS; backend authority ở
 *   - PUT   /api/projects/[id]   (`ADMIN_ROLES = ADMIN,PM,HR_MANAGER`)
 *   - PATCH /api/projects/[id]   (`PROJECT_UPDATE_ROLES`)
 *   - DELETE /api/projects/[id]  (`PROJECT_DELETE_ROLES = ADMIN`)
 */

import { notFound, redirect } from 'next/navigation';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getProjectForManagement } from '@/src/domains/crm/project-read.service';
import {
  PROJECT_DELETE_ROLES,
  PROJECT_UPDATE_ROLES,
} from '@/src/domains/crm/project-management.service';
import {
  ProjectDetailClient,
  type ProjectCapability,
} from './project-detail-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Quyền xem — mirror GET /api/projects (route handler `route.ts`).
 * ADMIN/HR_MANAGER/HR_STAFF/PM/ACCOUNTANT/DIRECTOR. SALE bị chặn 403 ở backend
 * nhưng để UI fail-closed nhanh. */
const VIEW_ROLES = new Set([
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
  'PM',
  'ACCOUNTANT',
  'DIRECTOR',
] as const);

export const metadata = {
  title: 'Dự án - HRPartner Admin',
};

/**
 * Xác định route detail `/admin/job-openings/[id]` có tồn tại hay không.
 * T0 §B.2 cấm tạo link chết — chỉ render link khi file route hiện hữu.
 * Fail-closed: nếu thiếu file ⇒ không link (text `—`).
 */
async function jobOpeningDetailRouteExists(): Promise<boolean> {
  try {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    return existsSync(join(process.cwd(), 'app/admin/job-openings/[id]/page.tsx'));
  } catch {
    return false;
  }
}

function deriveProjectCapability(role: string | undefined): ProjectCapability {
  const isAdmin = role === 'ADMIN';
  const isMutator = role !== undefined &&
    (PROJECT_UPDATE_ROLES as ReadonlyArray<string>).includes(role);
  const isDeleter = role !== undefined &&
    (PROJECT_DELETE_ROLES as ReadonlyArray<string>).includes(role);
  const canView = role !== undefined &&
    (VIEW_ROLES as ReadonlySet<string>).has(role);
  return {
    canView,
    canEdit: isMutator,
    canChangeStatus: isMutator,
    canDelete: isAdmin,
  };
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?callback=/admin/projects/${params.id}`);
  }

  if (!(VIEW_ROLES as ReadonlySet<string>).has(session.role)) {
    // Role ngoài authority backend ⇒ 404 fail-closed (không lộ sự tồn tại).
    notFound();
  }

  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();

  const project = await withDbContext(prisma, ctx, (tx) =>
    getProjectForManagement(tx, params.id),
  );

  if (!project) {
    notFound();
  }

  const capability = deriveProjectCapability(session.role);
  const detailRouteExists = await jobOpeningDetailRouteExists();

  return (
    <ProjectDetailClient
      project={project}
      capability={capability}
      role={session.role}
      jobOpeningDetailRouteExists={detailRouteExists}
    />
  );
}