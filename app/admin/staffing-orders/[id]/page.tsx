/**
 * /admin/staffing-orders/[id] — Server Component gate session + render RecruiterAssignmentManager.
 *
 * P1-A0.4 R3-F07/B-04: Real admin surface for managing recruiter
 * assignments (Chuyên viên tuyển dụng) on a staffing order.
 *
 * - ADMIN/HR_MANAGER → canManage=true → assign + revoke controls visible.
 * - HR_STAFF → canManage=false → read-only banner.
 * - Other roles → 403 page.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { RecruiterAssignmentManager } from './recruiter-assignment-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Chi tiết Order - Quản lý chuyên viên tuyển dụng',
};

const MANAGE_ROLES = new Set(['ADMIN', 'HR_MANAGER'] as const);
const VIEW_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF'] as const);

export default async function StaffingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login?returnUrl=/admin/staffing-orders/' + resolvedParams.id);
  }
  if (!VIEW_ROLES.has(session.role as 'ADMIN' | 'HR_MANAGER' | 'HR_STAFF')) {
    return (
      <div className="p-8 text-red-600">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const canManage = MANAGE_ROLES.has(session.role as 'ADMIN' | 'HR_MANAGER');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>
          Staffing Order {resolvedParams.id}
        </h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Quản lý chuyên viên tuyển dụng cho order này.
        </p>
      </header>
      <RecruiterAssignmentManager
        staffingOrderId={resolvedParams.id}
        canManage={canManage}
        actorId={session.userId}
      />
    </div>
  );
}
