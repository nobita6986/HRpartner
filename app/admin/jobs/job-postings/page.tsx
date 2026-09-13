/**
 * /admin/jobs/job-postings — AV2 JobPosting viewer + editor shell.
 *
 * Vòng này là READ-ONLY ở persistence, nhưng vẫn có form chỉnh nội dung
 * trong state cục bộ (xem component con) + preview phản ánh đúng nội dung
 * vừa nhập — đó là phần "editor shell". KHÔNG có nút Lưu/Publish/Sửa slug
 * vì backend ghi chưa có (chờ AV2 backend, contract N3, AV6 CMS).
 *
 * RLS Phase 2 (DEC-02): JobPosting có FORCE ROW LEVEL SECURITY. Mọi SELECT
 * phải qua `withDbContext(prisma, ctx, ...)` để `applyRlsContext` set GUC
 * transaction-local (`app.user_id`, `app.role`) — RLS policy
 * `job_postings_select` (gọi `hrp_project_visible_for`) mới chạy đúng.
 *
 * Quyền page — đồng bộ với chính sách dữ liệu thực tế:
 *  - RLS (`hrp_project_visible_for`) cho phép đọc JobPosting qua project
 *    visibility của: ADMIN, HR_MANAGER, DIRECTOR, SALE (all projects);
 *    PM (chỉ projects làm PM); WORKER, MKT, VENDOR_*, CTV (chỉ is_public).
 *  - HR_STAFF và ACCOUNTANT KHÔNG có nhánh đọc trong RLS project → 0 rows
 *    → KHÔNG mở page (vào thì thấy bảng rỗng mà không hiểu vì sao — UX xấu).
 *  - WORKER/MKT/VENDOR/CTV: RLS cho phép nhưng editor shell này mục tiêu
 *    Admin/Sale, không public; nếu mở cho các role này sẽ bị lộ workflow
 *    nội bộ (status DRAFT chưa publish). Giữ page là Admin/Sale only.
 *  - VIEWER_ROLES = { ADMIN, HR_MANAGER, PM, SALE, DIRECTOR } (5 role).
 *    KHÔNG copy nguyên tập role của `/api/admin/job-opening-status` (đó đếm
 *    trạng thái — RLS cho HR_STAFF/ACCOUNTANT đọc `job_openings` theo policy
 *    riêng, không áp dụng cho JobPosting vì job_postings đi qua
 *    project visibility).
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  listJobPostingsForAdmin,
  clampPositiveInt,
  type JobPostingListItemDto,
} from '@/src/domains/staffing/job-posting-list.service';
import type { SystemRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'JobPosting viewer — Admin',
};

// AV2 editor shell — đồng bộ với RLS HRP matrix (hrp_project_visible_for).
const VIEWER_ROLES: ReadonlySet<SystemRole> = new Set([
  'ADMIN',
  'HR_MANAGER',
  'PM',
  'SALE',
  'DIRECTOR',
]);

const DEFAULT_TAKE = 25;
const MAX_TAKE = 100;

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
type PostingStatus = (typeof STATUSES)[number];

function isPostingStatus(value: string | undefined): value is PostingStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED';
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminJobPostingsListPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/jobs/job-postings');
  }
  if (!VIEWER_ROLES.has(session.role)) {
    redirect('/forbidden');
  }

  const params = await searchParams;
  const take = clampPositiveInt(DEFAULT_TAKE, { default: DEFAULT_TAKE, max: MAX_TAKE });
  // page phải là số nguyên dương có giới hạn — ?page=1.5 → 1, ?page=abc → 1,
  // ?page=-1 → 1, ?page=99999 → cap 10000.
  const pageRaw = Number(params.page);
  const page = clampPositiveInt(Number.isFinite(pageRaw) ? pageRaw : undefined, {
    default: 1,
    max: 10_000,
  });
  const skip = (page - 1) * take;
  const statusFilter = isPostingStatus(params.status) ? params.status : undefined;

  // RLS Phase 2 — mở transaction đã set GUC theo session trước khi đọc JobPosting.
  // vì `getServerSession` chỉ trả {userId, role} (không có vendorId/workerId),
  // ta build AuthContext tối thiểu — Phase 2 JobPosting RLS chỉ cần userId+role.
  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();
  const result = await withDbContext(prisma, ctx, async (tx) => {
    return listJobPostingsForAdmin(tx, { take, skip, status: statusFilter });
  });

  const totalPages = Math.max(1, Math.ceil(result.total / take));
  const showingFrom = result.total === 0 ? 0 : skip + 1;
  const showingTo = Math.min(skip + take, result.total);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              <Link href="/admin/jobs" className="hover:underline">Admin Jobs</Link>
              <span aria-hidden="true">/</span>
              <span>JobPosting viewer (bản nháp)</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
              JobPosting viewer — soạn bản nháp
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Xem JobPosting đã tạo ở V6 Phase 1 và chỉnh nội dung bản nháp trong state
              cục bộ. Lưu/Publish chờ AV2 backend + contract N3 — xem banner phía dưới.
            </p>
          </div>
          <Link
            href="/admin/jobs"
            className="rounded px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
          >
            ← Quay lại Admin Jobs
          </Link>
        </div>

        {/* Filter */}
        <form className="mb-4 flex flex-wrap items-center gap-2 text-sm" method="get">
          <label htmlFor="status" className="font-medium" style={{ color: 'var(--on-surface)' }}>
            Trạng thái:
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFilter ?? ''}
            className="rounded border px-2 py-1 text-sm"
            style={{ borderColor: 'var(--outline)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <option value="">Tất cả</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded border px-3 py-1 text-sm font-medium"
            style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
          >
            Lọc
          </button>
          {statusFilter && (
            <Link
              href="/admin/jobs/job-postings"
              className="text-xs underline"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Bỏ lọc
            </Link>
          )}
        </form>

        {/* Bảng dữ liệu */}
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--outline)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--primary-container)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Staffing Order
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Revision
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Cập nhật
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    {statusFilter
                      ? `Chưa có JobPosting nào ở trạng thái ${statusFilter}${VIEWER_ROLES.has(session.role) ? '' : ' (role hiện tại không đọc được — xem banner)'}.`
                      : 'Chưa có JobPosting nào trong hệ thống (hoặc role hiện tại không đọc được — xem banner).'}
                  </td>
                </tr>
              ) : (
                result.items.map((item: JobPostingListItemDto, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--outline)' : 'none',
                    }}
                    className="transition-colors hover:bg-[var(--color-surface-container)]"
                  >
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--on-surface)' }}>
                      {item.slug}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {item.openingStaffingOrderCode ? (
                        <>
                          <span className="font-mono">{item.openingStaffingOrderCode}</span>
                          {item.openingStatus && (
                            <span className="ml-2 text-xs">
                              (JobOpening: {item.openingStatus})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs italic">(orphan — JobOpening đã xoá)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      v{item.revision}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {new Date(item.updatedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <Link
                        href={`/admin/jobs/job-postings/${item.id}`}
                        className="rounded border px-3 py-1 text-sm font-medium"
                        style={{ borderColor: 'var(--outline)', color: 'var(--primary)' }}
                      >
                        Mở editor shell
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination + count */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <div>
            Hiển thị {showingFrom}–{showingTo} / {result.total} JobPosting
            {statusFilter && ` (lọc: ${statusFilter})`}
          </div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/admin/jobs/job-postings?${new URLSearchParams({ ...(statusFilter && { status: statusFilter }), page: String(page - 1) }).toString()}`}
                className="rounded border px-3 py-1"
                style={{ borderColor: 'var(--outline)' }}
              >
                ← Trước
              </Link>
            )}
            <span>
              Trang {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/admin/jobs/job-postings?${new URLSearchParams({ ...(statusFilter && { status: statusFilter }), page: String(page + 1) }).toString()}`}
                className="rounded border px-3 py-1"
                style={{ borderColor: 'var(--outline)' }}
              >
                Sau →
              </Link>
            )}
          </div>
        </div>

        {/* Footer note — phần bị khóa */}
        <section
          className="mt-6 rounded-lg border p-4 text-sm"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--on-surface-variant)',
          }}
          aria-label="Phần bị khóa"
        >
          <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            Phần bị khóa (chờ bước sau)
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Lưu bản nháp section content</strong> (giới thiệu, yêu cầu, lương, hỗ trợ, hướng dẫn ứng tuyển, footer banner) → chờ AV2 backend (Postgres persistence + API ghi).</li>
            <li><strong>Publish JobPosting</strong> (chuyển DRAFT → PUBLISHED) → chờ contract N3 (gắn JobPosting với JobOpening status transition).</li>
            <li><strong>Section content thật (REAL)</strong> thay vì fixture DEMO → chờ AV2 backend + AV6 CMS editor (bước sau AV2).</li>
            <li><strong>Sửa slug / revision</strong> → chờ AV2 backend (xử lý @@unique([slug]) và idempotency).</li>
            <li><strong>Mở JobPosting ở trang public</strong> (<code>/viec-lam/[slug]</code>) → trang public hiện vẫn tra Project (qua <code>getPublicJobDetail</code>), chưa gắn với JobPosting. Sẽ khôi phục liên kết khi ánh xạ JobPosting.slug → Project.code hợp lệ.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: 'var(--color-surface-container-high)', fg: 'var(--on-surface-variant)' },
    PUBLISHED: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary-dark)' },
    ARCHIVED: { bg: 'var(--color-surface-container)', fg: 'var(--on-surface-variant)' },
  };
  const c = colorMap[status] ?? colorMap.DRAFT;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}
