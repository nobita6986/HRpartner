/**
 * /admin/staffing — Server Component gate session + render StaffingListClient.
 *
 * Tier 0 directive 13/09/2026 11:03 (vòng nhỏ READ-ONLY):
 *  - Page này phải đọc session ở server để biết role hiện tại có trong
 *    CREATE_ROLES hay không. UI đồng bộ với API:
 *      + Nếu có quyền tạo → hiện button "+ Tạo Order" + câu mời trong empty state.
 *      + Nếu KHÔNG có quyền (HR_STAFF, PM, DIRECTOR, ACCOUNTANT) → ẨN button
 *        "+ Tạo Order"; empty state KHÔNG hiển thị câu mời tạo.
 *  - Nếu user cố POST trực tiếp, API vẫn 403 PERMISSION_DENIED.
 *  - Force-dynamic: re-read session mỗi request; không cache chung giữa user.
 *
 * Out of scope (vòng sau):
 *  - Tự động refresh sau khi tạo; search theo code/title; filter projectId; sort.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import StaffingListClient from './staffing-list-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Đồng bộ với `app/api/staffing/orders/route.ts:CREATE_ROLES`. */
const CREATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE'] as const);

export default async function AdminStaffingPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/staffing');
  }

  // `/admin` layout đã gate `isAdminPortalRole` rồi, nhưng đây là lớp guard
  // bổ sung nếu page được tái sử dụng ở ngoài layout.
  const role = session.role;
  const canCreate = (CREATE_ROLES as ReadonlySet<string>).has(role);

  return <StaffingListClient canCreate={canCreate} />;
}
