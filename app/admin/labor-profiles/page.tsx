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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          {/* T0 T1C — PRE-P2 HOTFIX: page title = "Hồ sơ ứng viên" (shorter;
              the sidebar slot uses the same short label, while the metadata
              title carries the canonical "- Quản trị" suffix). */}
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ ứng viên</h1>
          <p className="text-gray-500 mt-2 text-sm">Quản lý hồ sơ ứng viên, nhận diện và đối chiếu trùng lặp.</p>
        </div>
        <Link 
          href="/admin/labor-profiles/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          + Tiếp nhận hồ sơ
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-2 overflow-x-auto">
        {/* DEC-P2-09: chỉ giữ 4 filter chips canonical.
            - '': Tất cả (mặc định)
            - 'INCOMPLETE': Chưa hoàn thiện (completeness = MINIMAL)
            - 'UNVERIFIED': Cần đối chiếu (identityVerification = UNVERIFIED)
            - 'COMPANY_POOL': Kho chung (không có handlingAssignment ACTIVE)
            3 chip cũ (NEVER_WORKED | WORKING | TERMINATED) đã bỏ vì:
              - Profiles đã chuyển thành Worker (`workerId != null`) đã bị
                `getLaborProfilesList` filter mặc định ra khỏi intake list
                (DEC-P2-01). Nếu họ "Đang làm" thì thuộc `/admin/workers`.
              - Episode status không còn là tín hiệu intake-scope nữa.
        */}
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
              {/* T1B-OPS DEC-T1B-OPS-09: thay cột SĐT (PII) & Ngày tạo
                  bằng 3 cột vận hành hữu ích: Job gần nhất (kèm số đơn
                  ứng tuyển), Người phụ trách, Trạng thái (Xác minh +
                  Hoàn thiện + Nguồn tiếp nhận); giữ Ngày tiếp nhận (đã
                  có sẵn từ createdAt). Giữ tổng số cột 5 (DEC-P2-10
                  invariant: 5 <th> + colSpan 5). */}
              <tr>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Job gần nhất</th>
                <th className="px-6 py-4">Người phụ trách</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Ngày tiếp nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* DEC-P2-10: bỏ cột "Liên kết nhân viên" → colSpan 6 → 5.
                  Mọi row trong list mặc định là unlinked (DEC-P2-01); cột
                  này luôn "Chưa liên kết" → thừa, bỏ để giảm nhiễu.
                  NOTE: comment đặt NGOÀI cấu trúc <tr>...</tr> vì nếu đặt
                  giữa sẽ tạo "{}" rỗng giữa <tr> và <td> sau khi strip
                  comment → phá regex trong static test. */}
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Chưa có hồ sơ ứng viên nào.
                  </td>
                </tr>
              ) : (
                /* T0 T1B — HOTFIX UI NGƯỜI LAO ĐỘNG: table-HTML fix.
                   Previous markup wrapped a <tr> in <RowLink> (which renders an
                   <a>), then put <td> children inside that <a>. That produced
                   invalid HTML: <tbody><a><td>…</td></a></tbody> — browsers
                   react by hoisting the <a> out of the <tbody> and re-parenting
                   the <td>s, which misaligns columns and clips the last cell.

                   The contract used by RowLink (`src/shared/ui/navigation/
                   row-link.tsx`) is the opposite: the <tr> must be the
                   outermost element with class `relative`, and RowLink is
                   placed inside a single <td>. The whole row stays clickable
                   via RowLink's `before:absolute before:inset-0` pseudo-link
                   overlay, the inner <a> is a real anchor (focusable, middle-
                   click to open in a new tab, right-click → "Open in new
                   tab"), and there is exactly one <a> per row (no nested
                   links). The same pattern is already used by
                   `app/admin/clients/page.tsx` and
                   `app/admin/projects/projects-table-client.tsx`, so this is a
                   convergent alignment with the canonical RowLink contract. */
                data.items.map((profile) => (
                  <tr
                    key={profile.id}
                    className="relative transition-colors hover:bg-blue-50/50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <RowLink href={`/admin/labor-profiles/${profile.id}`}>
                        {profile.fullName || 'Chưa cập nhật'}
                      </RowLink>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {profile.latestJob
                        ? `${profile.latestJob.code ?? '—'}${profile.latestJob.name ? ` · ${profile.latestJob.name}` : ''}`
                        : '—'}
                      {profile.applicationCount > 0 ? (
                        <span
                          className={`ml-2 inline-flex items-center justify-center min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            'bg-blue-100 text-blue-700'
                          }`}
                          title={`${profile.applicationCount} đơn ứng tuyển`}
                        >
                          {profile.applicationCount}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {profile.handler ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          module="labor-profile-identity-verification"
                          status={profile.identityVerification}
                          tone={identityVerificationTone(profile.identityVerification)}
                        >
                          {laborProfileIdentityVerificationLabel(profile.identityVerification)}
                        </StatusBadge>
                        <StatusBadge
                          module="labor-profile-completeness"
                          status={profile.completeness}
                          tone={laborProfileCompletenessTone(profile.completeness)}
                        >
                          {laborProfileCompletenessLabel(profile.completeness)}
                        </StatusBadge>
                        {profile.intakeSource ? (
                          <span className="text-[11px] text-gray-500" title="Nguồn tiếp nhận">
                            Nguồn: {profile.intakeSource}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {profile.intakeDate
                        ? new Date(profile.intakeDate).toLocaleDateString('vi-VN')
                        : new Date(profile.createdAt).toLocaleDateString('vi-VN')}
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
