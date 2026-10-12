/**
 * /admin/staffing-orders/[id] — Trang quản lý Nhu cầu tuyển dụng.
 *
 * t1a-staffing-order-management (T0 directive):
 *
 *   - Trước đây: page này CHỈ hiển thị `RecruiterAssignmentManager` (màn phân
 *     công chuyên viên) và 403 cứng cho mọi role ngoài ADMIN/HR_MANAGER.
 *   - Sau vòng này: page là full management surface — header (code, title,
 *     project, description, deadline, status) + bảng vị trí + bảng
 *     JobOpenings/Postings liên kết + section chuyên viên (gated) + toolbar
 *     (Sửa / Đánh dấu sắp đóng / Mở lại / Đóng / Hủy / Xóa vĩnh viễn).
 *   - Quyền view: GIỮ NGUYÊN authority hiện tại (LIST_ROLES ở GET
 *     `/api/staffing/orders/[id]`). Role có API read access mở được trang ở
 *     chế độ read-only; KHÔNG redirect 403 cứng.
 *   - Quyền mutate: `ADMIN/HR_MANAGER/SALE` (edit + status) và `ADMIN/HR_MANAGER`
 *     (phân công chuyên viên) — đồng bộ với API.
 *   - Xóa vĩnh viễn: chỉ `ADMIN`.
 *
 * Force-dynamic: re-read session + detail mỗi request.
 *
 * Out of scope: KHÔNG thêm status mới, KHÔNG sửa schema/RLS.
 */

import { notFound, redirect } from 'next/navigation';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getStaffingOrderDetail,
  StaffingOrderServiceError,
} from '@/src/domains/staffing/order.service';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

import { OrderManagementClient } from './order-management-client';
import type { StaffingOrderCapability, StaffingOrderDetailDto } from './order-management-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Nhu cầu tuyển dụng - HRPartner Admin',
};

/** Quyền xem Nhu cầu tuyển dụng — đồng bộ với LIST_ROLES của GET
 * `/api/staffing/orders/[id]`. HR_STAFF/PM/DIRECTOR/ACCOUNTANT mở được
 * ở chế độ read-only. */
const VIEW_ROLES = new Set([
  'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'SALE', 'DIRECTOR', 'ACCOUNTANT',
] as const);

/** Quyền edit/status — đồng bộ với UPDATE_ROLES của PATCH/PUT. */
const MUTATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'SALE'] as const);

/** Quyền phân công chuyên viên — đồng bộ với MANAGE_ROLES của
 * `/api/admin/staffing/orders/[orderId]/recruiters`. */
const ASSIGN_ROLES = new Set(['ADMIN', 'HR_MANAGER'] as const);

/** Quyền xóa vĩnh viễn — chỉ ADMIN, đồng bộ với DELETE_ROLES. */
const DELETE_ROLES = new Set(['ADMIN'] as const);

/** BigInt trong Prisma (slot.hourlyRateVnd) không serialize được qua
 * `JSON.stringify` mặc định — chuyển sang number khi truyền xuống client. */
function bigintSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
  );
}

export default async function StaffingOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await getServerSession();

  if (!session) {
    redirect('/login?callback=/admin/staffing-orders/' + params.id);
  }

  if (!VIEW_ROLES.has(session.role as typeof VIEW_ROLES extends Set<infer T> ? T : never)) {
    // Role không có quyền xem Nhu cầu tuyển dụng — dùng 404 thay vì 403 để
    // không lộ sự tồn tại của order (đồng bộ với `/admin/projects/[id]`).
    notFound();
  }

  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();

  let order: StaffingOrderDetailDto | null = null;
  let loadError: string | null = null;

  try {
    const raw = await withDbContext(prisma, ctx, (tx) =>
      getStaffingOrderDetail(tx, ctx, params.id),
    );
    order = bigintSafe(raw) as StaffingOrderDetailDto;
  } catch (e) {
    if (e instanceof StaffingOrderServiceError) {
      if (e.code === 'NOT_FOUND') {
        notFound();
      }
      loadError = e.message;
    } else if (e instanceof AuthScopeError) {
      // L1 scope chặn → tương đương "không có quyền". T0: view giữ nguyên
      // authority — không mở rộng, không nới lỏng.
      notFound();
    } else {
      console.error('[admin/staffing-orders/[id] page] detail error:', e);
      loadError = 'Không tải được chi tiết nhu cầu tuyển dụng.';
    }
  }

  const role = session.role;
  const capability: StaffingOrderCapability = {
    canView: true,
    canEdit: MUTATE_ROLES.has(role as typeof MUTATE_ROLES extends Set<infer T> ? T : never),
    canChangeStatus: MUTATE_ROLES.has(role as typeof MUTATE_ROLES extends Set<infer T> ? T : never),
    canAssign: ASSIGN_ROLES.has(role as typeof ASSIGN_ROLES extends Set<infer T> ? T : never),
    canDelete: DELETE_ROLES.has(role as typeof DELETE_ROLES extends Set<infer T> ? T : never),
  };

  return (
    <OrderManagementClient
      order={order}
      loadError={loadError}
      capability={capability}
      role={role}
    />
  );
}
