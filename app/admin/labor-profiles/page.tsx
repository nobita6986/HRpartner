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
} from '@/src/domains/labor-profile/labor-profile-ui';
import { RowLink } from '@/src/shared/ui/navigation/row-link';
import { StatusBadge } from '@/src/shared/ui/status-badge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Hồ sơ người lao động - Quản trị',
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
        Bạn không có quyền truy cập danh sách hồ sơ người lao động.
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ người lao động</h1>
          <p className="text-gray-500 mt-2 text-sm">Quản lý hồ sơ người lao động, nhận diện và đối chiếu trùng lặp.</p>
        </div>
        <Link 
          href="/admin/labor-profiles/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          Tiếp nhận hồ sơ người lao động
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-2 overflow-x-auto">
        {[
          { label: 'Tất cả', value: '' },
          { label: 'Chưa hoàn thiện', value: 'INCOMPLETE' },
          { label: 'Cần đối chiếu', value: 'UNVERIFIED' },
          { label: 'Chưa từng làm', value: 'NEVER_WORKED' },
          { label: 'Đang làm', value: 'WORKING' },
          { label: 'Đã nghỉ', value: 'TERMINATED' },
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
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Xác minh danh tính</th>
                <th className="px-6 py-4">Độ hoàn thiện</th>
                <th className="px-6 py-4">Liên kết nhân viên</th>
                <th className="px-6 py-4 text-right">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Chưa có hồ sơ người lao động nào.
                  </td>
                </tr>
              ) : (
                data.items.map((profile) => (
                  <RowLink key={profile.id} href={`/admin/labor-profiles/${profile.id}`} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{profile.fullName || 'Chưa cập nhật'}</td>
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
                    <td className="px-6 py-4">
                      {profile.workerId ? (
                        <span className="text-green-600 font-medium">Đã liên kết</span>
                      ) : (
                        <span className="text-gray-400">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </RowLink>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
