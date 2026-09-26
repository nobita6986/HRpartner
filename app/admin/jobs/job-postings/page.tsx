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

import { EmptyState } from '@/src/shared/ui/data-display/empty-state';
import { RowLink } from '@/src/shared/ui/navigation/row-link';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  listJobPostingsForAdmin,
  listEligibleSlotsForNewJobPosting,
  clampPositiveInt,
  type JobPostingListItemDto,
  type JobPostingSlotSelectorDto,
} from '@/src/domains/staffing/job-posting-list.service';
import {
  CreateJobPostingForm,
  type EligibleSlotDto,
} from './create-job-posting-form';
import type { SystemRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'JobPosting viewer — Admin',
};

/**
 * hrp-p1-a0-1 (T0 §1, §2): mở rộng VIEWER_ROLES để HR_STAFF có thể vào `/admin/jobs/job-postings`
 * để chọn StaffingOrderSlot đủ điều kiện và tạo/reuse JobPosting DRAFT.
 *
 * HR_STAFF KHÔNG có nhánh đọc JobPosting trong RLS `hrp_project_visible_for` (xem comment cũ ở
 * `:18..22`), nên bảng danh sách hiển thị 0 hàng với role này — đó là kết quả ĐÚNG, không phải UX
 * xấu. Trang này vẫn hữu ích cho HR_STAFF vì họ cần form tạo draft. Khi tạo xong, họ chuyển sang
 * editor `/admin/jobs/job-postings/[id]` (POST đã authorize HR_STAFF qua `ALLOWED_MUTATION_ROLES`).
 *
 * `CREATE_ROLES` (subset) — chỉ những role này MỚI thấy nút "+ Tạo JobPosting mới" và form tạo.
 * Mutation authority đã freeze ở P1-A0 (`ALLOWED_MUTATION_ROLES` trong
 * `job-posting-authoring.service.ts`); trang này chỉ REUSE cùng tập role.
 */
const VIEWER_ROLES: ReadonlySet<SystemRole> = new Set([
  'ADMIN',
  'HR_MANAGER',
  'PM',
  'SALE',
  'DIRECTOR',
  'HR_STAFF',
]);

const CREATE_ROLES: ReadonlySet<SystemRole> = new Set([
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
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

  /**
   * hrp-p1-a0-1 (DEC-02, DEC-03): load eligible-slot DTO qua service canonical
   * `listEligibleSlotsForNewJobPosting`. Server Component truyền DTO vào client form;
   * selector client KHÔNG phải authorization authority. Nếu service lỗi (vd ENV_BLOCKED
   * khi thiếu synthetic DB), truyền `loadError` xuống form để hiển thị banner thay vì
   * crash toàn trang.
   */
  let eligibleSlots: EligibleSlotDto[] = [];
  let slotLoadError: { code: string; message: string } | null = null;
  if (CREATE_ROLES.has(session.role)) {
    try {
      const rawSlots: JobPostingSlotSelectorDto[] = await withDbContext(prisma, ctx, async (tx) =>
        listEligibleSlotsForNewJobPosting(tx, { limit: 100 }),
      );
      eligibleSlots = rawSlots.map((slot) => ({
        slotId: slot.id,
        staffingOrderId: slot.staffingOrderId,
        staffingOrderCode: slot.staffingOrderCode,
        positionTitle: slot.positionTitle,
        positionCode: slot.positionCode,
        location: slot.workLocation,
        // Service predicate đã bảo đảm `slots_filled < slots_needed` nên hiệu luôn >= 1.
        slotsAvailable: Math.max(0, slot.slotsNeeded - slot.slotsFilled),
        // Service predicate đã filter `status IN ('OPEN','CLOSING_SOON')` — đây là type narrowing.
        orderStatus: 'OPEN' as const,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      slotLoadError = { code: 'ELIGIBLE_SLOTS_LOAD_FAILED', message };
    }
  }

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
              <span>JobPosting authoring &amp; publish</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--on-surface)' }}>
              JobPosting — authoring &amp; publish
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Chọn một JobPosting để chỉnh nội dung, lưu bản nháp, publish/unpublish/archive.
              Bản P1-A0: tạo/reuse JobOpening từ StaffingOrderSlot, schema JobPosting mở rộng
              với rich content (Tiptap, contentSchemaVersion=1).
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

        {/* hrp-p1-a0-1 (DEC-01..04): form tạo JobPosting mới — chỉ hiển thị cho
            CREATE_ROLES (ADMIN/HR_MANAGER/HR_STAFF), dùng POST endpoint hiện hữu,
            idempotency handled ở client form (UUID per submit attempt) + server
            (withIdempotency). */}
        {CREATE_ROLES.has(session.role) ? (
          <div className="mb-6">
            <CreateJobPostingForm
              eligibleSlots={eligibleSlots}
              actionUrl="/api/admin/jobs/job-postings"
              loadError={slotLoadError}
            />
          </div>
        ) : null}

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
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <EmptyState
                      title="Chưa có dữ liệu"
                      description={statusFilter
                        ? `Chưa có JobPosting nào ở trạng thái ${statusFilter}${VIEWER_ROLES.has(session.role) ? '' : ' (role hiện tại không đọc được — xem banner)'}.`
                        : 'Chưa có JobPosting nào trong hệ thống (hoặc role hiện tại không đọc được — xem banner).'}
                    />
                  </td>
                </tr>
              ) : (
                result.items.map((item: JobPostingListItemDto, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--outline)' : 'none',
                    }}
                    className="relative transition-colors hover:bg-[var(--color-surface-container)]"
                  >
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--on-surface)' }}>
                      <RowLink href={`/admin/jobs/job-postings/${item.id}`}>
                        {item.slug}
                      </RowLink>
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
            <li><strong>Tạo mới draft từ slot</strong> ở list page → form chọn StaffingOrderSlot chưa dựng (P1-A0 POST API đã sẵn sàng, UI form sẽ thêm ở bước sau).</li>
            <li><strong>Mở JobPosting ở trang public</strong> (<code>/viec-lam/[slug]</code>) → trang public hiện vẫn tra Project (qua <code>getPublicJobDetail</code>), chưa gắn với JobPosting. Sẽ được khôi phục khi <code>P1-A1</code> hoàn tất ánh xạ.</li>
            <li><strong>Gallery media</strong> (ảnh đính kèm JobPosting) → chờ AV4 Media Library integration.</li>
            <li><strong>Anonymous apply RPC gắn JobPosting</strong> → chờ P1-A1 (CandidateSubmission.jobPostingId).</li>
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
