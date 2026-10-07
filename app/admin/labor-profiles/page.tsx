import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getLaborProfilesList } from '@/src/domains/talent/labor-profile.read-service';
import {
  laborProfileIdentityVerificationLabel,
  identityVerificationTone,
  laborProfileCompletenessLabel,
  laborProfileCompletenessTone,
  laborProfileIntakeChannelLabel,
} from '@/src/domains/labor-profile/labor-profile-ui';
import { RowLink } from '@/src/shared/ui/navigation/row-link';
import { StatusBadge } from '@/src/shared/ui/status-badge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Hồ sơ ứng viên - Quản trị',
};

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

export default async function LaborProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login?returnUrl=/admin/labor-profiles');
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return (
      <div className="p-8 text-red-600">
        Bạn không có quyền truy cập danh sách hồ sơ ứng viên.
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const view = typeof resolvedSearchParams.view === 'string' ? resolvedSearchParams.view as any : undefined;
  const take = 50;
  const skip = typeof resolvedSearchParams.skip === 'string' ? parseInt(resolvedSearchParams.skip, 10) : 0;

  const prisma = getPrisma();
  const data = await withDbContext(prisma, session as any, async (tx) => {
    return getLaborProfilesList(tx, session as any, { search, view, take, skip });
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ ứng viên</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Quản lý hồ sơ ứng viên, nhận diện, người phụ trách, nguồn tiếp nhận và tiến độ của các đơn.
          </p>
        </div>
        <Link
          href="/admin/labor-profiles/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          + Tiếp nhận hồ sơ
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-2 overflow-x-auto">
        {/* DEC-P2-09: chỉ giữ 4 filter chips canonical. */}
        {[
          { label: 'Tất cả', value: '' },
          { label: 'Chưa hoàn thiện', value: 'INCOMPLETE' },
          { label: 'Cần đối chiếu', value: 'UNVERIFIED' },
          { label: 'Kho chung', value: 'COMPANY_POOL' },
        ].map(f => (
          <Link
            key={f.value}
            href={`/admin/labor-profiles${f.value ? `?view=${f.value}` : ''}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              (view || '') === f.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Họ và tên</th>
                <th className="px-6 py-4 whitespace-nowrap">Số điện thoại</th>
                <th className="px-6 py-4 whitespace-nowrap">Xác minh danh tính</th>
                <th className="px-6 py-4 whitespace-nowrap">Độ hoàn thiện</th>
                <th className="px-6 py-4 whitespace-nowrap">Job/đơn gần nhất</th>
                <th className="px-6 py-4 whitespace-nowrap">Số đơn</th>
                <th className="px-6 py-4 whitespace-nowrap">Người phụ trách</th>
                <th className="px-6 py-4 whitespace-nowrap">Nguồn tiếp nhận</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* DEC-P2-10: bỏ cột "Liên kết nhân viên" → colSpan 6 → 5. */}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Chưa có hồ sơ ứng viên nào.
                  </td>
                </tr>
              ) : (
                data.items.map(profile => (
                  <tr
                    key={profile.id}
                    className="relative transition-colors hover:bg-blue-50/50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <RowLink href={`/admin/labor-profiles/${profile.id}`}>
                        {profile.fullName || 'Chưa cập nhật'}
                      </RowLink>
                    </td>
                    <td className="px-6 py-4">{profile.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        module="labor-profile-identity-verification"
                        status={profile.identityVerification}
                        tone={identityVerificationTone(profile.identityVerification)}
                      >
                        {laborProfileIdentityVerificationLabel(profile.identityVerification)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        module="labor-profile-completeness"
                        status={profile.completeness}
                        tone={laborProfileCompletenessTone(profile.completeness)}
                      >
                        {laborProfileCompletenessLabel(profile.completeness)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {profile.latestJobLabel ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {profile.submissionsCount}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {profile.handlerName ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {profile.intakeChannelLabel ? (
                        laborProfileIntakeChannelLabel(profile.intakeChannelLabel)
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}