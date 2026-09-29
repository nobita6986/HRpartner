/**
 * /admin/staffing-orders/[id] — Server Component gate session + render RecruiterAssignmentManager.
 *
 * P1-A0.4 R3-F07/B-04/B-09: Real admin surface for managing recruiter
 * assignments (Chuyên viên tuyển dụng) on a staffing order.
 *
 * Role gate (B-09):
 *   - ADMIN/HR_MANAGER → canManage=true → render the full manager with
 *     assign + revoke controls + selectable HR_STAFF dropdown.
 *   - HR_STAFF (and any other non-managing role) → 403 page; HR_STAFF has
 *     no operational authority on this surface. They DO see the canonical
 *     Recruiter Workbench MINE rail at `/admin/recruiter-workbench` for
 *     their own claimed candidates.
 *
 * The previous round-7 read-only HR_STAFF banner was removed per T0 §B-09
 * role-contradiction mandate ("keep this assignment-management page
 * ADMIN/HR_MANAGER only").
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
  if (!MANAGE_ROLES.has(session.role as 'ADMIN' | 'HR_MANAGER')) {
    return (
      <div className="p-8 text-red-600">
        Bạn không có quyền truy cập trang này. Trang quản lý chuyên viên
        tuyển dụng chỉ dành cho ADMIN hoặc HR_MANAGER. Chuyên viên tuyển dụng
        dùng <a className="underline" href="/admin/recruiter-workbench?view=MINE">Bảng tuyển dụng của tôi</a>.
      </div>
    );
  }

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
        canManage={true}
      />
    </div>
  );
}