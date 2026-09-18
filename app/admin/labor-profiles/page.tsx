import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getLaborProfilesList } from '@/src/domains/talent/labor-profile.read-service';
import { RowLink } from '@/src/shared/ui/navigation/row-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Hồ sơ NLD - Admin',
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
        Bạn không có quyền truy cập danh sách Hồ sơ NLD.
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const take = 50;
  const skip = typeof resolvedSearchParams.skip === 'string' ? parseInt(resolvedSearchParams.skip, 10) : 0;

  const prisma = getPrisma();
  const data = await withDbContext(prisma, session as any, async (tx) => {
    return getLaborProfilesList(tx, { search, take, skip });
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ NLD</h1>
          <p className="text-gray-500 mt-2 text-sm">Quản lý hồ sơ người lao động, nhận diện và đối chiếu trùng lặp.</p>
        </div>
        <Link 
          href="/admin/labor-profiles/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          Tiếp nhận NLD
        </Link>
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
                <th className="px-6 py-4">Liên kết Worker</th>
                <th className="px-6 py-4 text-right">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Chưa có hồ sơ NLD nào.
                  </td>
                </tr>
              ) : (
                data.items.map((profile) => (
                  <RowLink key={profile.id} href={`/admin/labor-profiles/${profile.id}`} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{profile.fullName || 'Chưa cập nhật'}</td>
                    <td className="px-6 py-4">{profile.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.identityVerification === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {profile.identityVerification === 'VERIFIED' ? 'Đã xác minh' : 'Chưa xác minh'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.completeness === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {profile.completeness === 'FULL' ? 'Đầy đủ' : 'Cơ bản'}
                      </span>
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
