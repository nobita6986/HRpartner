import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getLaborProfileDetail } from '@/src/domains/talent/labor-profile.read-service';
import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import {
  laborProfileIdentityVerificationLabel,
  identityVerificationTone,
  laborProfileCompletenessLabel,
  laborProfileIntakeChannelLabel,
  placementCaseStatusLabel,
} from '@/src/domains/labor-profile/labor-profile-ui';
import { StatusBadge } from '@/src/shared/ui/status-badge';
import { HandlingAssignmentManager } from './handling-assignment-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Chi tiết hồ sơ người lao động - Quản trị',
};

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

export default async function LaborProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login?returnUrl=/admin/labor-profiles/' + resolvedParams.id);
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return (
      <div className="p-8 text-red-600">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const prisma = getPrisma();
  const data = await withDbContext(prisma, session as any, async (tx) => {
    return getLaborProfileDetail(tx, session as any, resolvedParams.id);
  });

  if (!data) {
    notFound();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Breadcrumb
        items={[
          { label: 'Hồ sơ người lao động', href: '/admin/labor-profiles' },
          { label: data.fullName || data.phone || 'Chi tiết hồ sơ' },
        ]}
      />

      {/* Block 8: Hành động theo trạng thái */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{data.fullName || 'Chưa cập nhật tên'}</h1>
          <p className="text-gray-500 mt-1">{data.phone || 'Chưa cập nhật SĐT'}</p>
        </div>
        <div className="flex space-x-3">
          {!data.workerId && (
            <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed opacity-70 border border-gray-200" title="Tính năng đang được phát triển">
              Chuyển đổi thành nhân viên
            </button>
          )}
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700">
            Sửa thông tin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Block 1: Nhận diện & độ tin cậy match */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nhận diện & Xác minh</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Số CCCD:</dt>
              <dd className="font-medium text-gray-900">{data.cccdNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Xác minh:</dt>
              <dd className="font-medium text-gray-900">
                <StatusBadge
                  module="labor-profile-identity-verification"
                  status={data.identityVerification}
                  tone={identityVerificationTone(data.identityVerification)}
                >
                  {laborProfileIdentityVerificationLabel(data.identityVerification)}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Độ hoàn thiện:</dt>
              <dd className="font-medium text-gray-900">{laborProfileCompletenessLabel(data.completeness)}</dd>
            </div>
          </dl>
        </div>

        {/* Block 2: Tình trạng quan hệ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tình trạng quan hệ</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Ngày đồng ý:</dt>
              <dd className="font-medium text-gray-900">
                {data.consentAt ? new Date(data.consentAt).toLocaleDateString('vi-VN') : 'Chưa có'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Số lần tiếp nhận:</dt>
              <dd className="font-medium text-gray-900">{data.intakes.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Trạng thái liên kết nhân viên:</dt>
              <dd className="font-medium text-gray-900">{data.workerId ? 'Đã liên kết' : 'Chưa'}</dd>
            </div>
          </dl>
        </div>

        {/* Block 3: Nguồn */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nguồn tiếp nhận</h2>
          {data.intakes.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {data.intakes.map(intake => (
                <li key={intake.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                  <span>{laborProfileIntakeChannelLabel(intake.channel)}</span>
                  <span className="text-gray-500 text-xs">{new Date(intake.createdAt).toLocaleDateString('vi-VN')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Chưa có thông tin nguồn.</p>
          )}
        </div>

        {/* Block 4: Người phụ trách */}
        <HandlingAssignmentManager 
          laborProfileId={data.id} 
          activeAssignment={data.activeHandlingAssignment} 
        />

        {/* Block 5: Quyền hưởng hoa hồng (Placeholder N2-5) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quyền hưởng hoa hồng</h2>
          <p className="text-sm text-gray-500 italic">Chưa đủ điều kiện</p>
        </div>

        {/* Block 6: Nhu cầu qua thời gian */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nhu cầu ứng tuyển</h2>
          {data.submissions.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {data.submissions.map(sub => (
                <li key={sub.id} className="bg-gray-50 px-3 py-2 rounded">
                  {new Date(sub.createdAt).toLocaleDateString('vi-VN')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Chưa có nhu cầu nào.</p>
          )}
        </div>

        {/* Block 7: Lịch sử làm việc */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử làm việc</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quá trình làm việc</h3>
              {data.episodes.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  {data.episodes.map(ep => (
                    <li key={ep.id} className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      Mã: {ep.id}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Chưa có quá trình làm việc.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Ca bố trí việc làm</h3>
              {data.placementCases.length > 0 ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  {data.placementCases.map(pc => (
                    <li key={pc.id} className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex justify-between">
                      <span>Mã: {pc.id}</span>
                      <span className="font-medium">{placementCaseStatusLabel(pc.status)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Chưa có ca bố trí.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
