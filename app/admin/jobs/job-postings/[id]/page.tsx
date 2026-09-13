/**
 * /admin/jobs/job-postings/[id] — AV2 JobPosting viewer + editor shell.
 *
 * Vòng này là READ-ONLY ở persistence nhưng vẫn là editor shell thật — có
 * form chỉnh nội dung trong state cục bộ + preview phản ánh nội dung vừa
 * nhập (xem component con `editor-shell.tsx`). KHÔNG có nút Lưu/Publish
 * vì backend ghi JobPosting/section content chưa có.
 *
 * RLS Phase 2 (DEC-02): JobPosting có FORCE ROW LEVEL SECURITY. Mọi SELECT
 * phải qua `withDbContext(prisma, ctx, ...)` để `applyRlsContext` set GUC
 * transaction-local (`app.user_id`, `app.role`) — RLS policy
 * `job_postings_select` (gọi `hrp_project_visible_for`) mới chạy đúng.
 *
 * Quyền page — đồng bộ với chính sách dữ liệu thực tế:
 *  - VIEWER_ROLES = { ADMIN, HR_MANAGER, PM, SALE, DIRECTOR } (5 role).
 *    HR_STAFF/ACCOUNTANT KHÔNG vào vì RLS `hrp_project_visible_for` không
 *    nhánh cho họ (xem `prisma/migrations/20260821103500_m13_restore_rls_matrix`).
 *    WORKER/MKT/VENDOR/CTV RLS cho phép nhưng mục tiêu editor shell là
 *    Admin/Sale — không mở rộng.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getJobPostingForAdmin } from '@/src/domains/staffing/job-posting-list.service';
import type { SystemRole } from '@prisma/client';

import { JobPostingEditorShell } from './editor-shell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'JobPosting viewer — Admin',
};

const VIEWER_ROLES: ReadonlySet<SystemRole> = new Set([
  'ADMIN',
  'HR_MANAGER',
  'PM',
  'SALE',
  'DIRECTOR',
]);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminJobPostingDetailPage({ params }: PageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?callback=/admin/jobs/job-postings');
  }
  if (!VIEWER_ROLES.has(session.role)) {
    redirect('/forbidden');
  }

  const { id } = await params;
  const ctx = { userId: session.userId, role: session.role };
  const prisma = getPrisma();
  const posting = await withDbContext(prisma, ctx, async (tx) => {
    return getJobPostingForAdmin(tx, id);
  });
  if (!posting) {
    // Có thể là (a) id không tồn tại, hoặc (b) RLS policy deny (role không
    // đọc được project liên quan). Trang public `/viec-lam/[slug]` cũng đọc
    // qua Project (chưa gắn JobPosting), nên ta KHÔNG đoán đây là 404 vì
    // trang public có thể tồn tại — chỉ trả notFound khi service đã chạy
    // đầy đủ và cho null.
    notFound();
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <Link href="/admin/jobs" className="hover:underline">Admin Jobs</Link>
          <span aria-hidden="true">/</span>
          <Link href="/admin/jobs/job-postings" className="hover:underline">JobPosting viewer</Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono">{posting.slug}</span>
        </div>

        {/* Header metadata */}
        <header className="mb-6 rounded-xl border p-5" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>
                {posting.slug}
              </h1>
              <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                ID: <span className="font-mono">{posting.id}</span>
              </p>
            </div>
            <StatusBadge status={posting.status} />
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Slug" value={posting.slug} mono />
            <Fact label="Revision" value={`v${posting.revision}`} />
            <Fact
              label="JobOpening"
              value={posting.opening?.staffingOrderCode ?? '(orphan)'}
              mono
            />
            <Fact
              label="JobOpening status"
              value={posting.opening?.status ?? '—'}
            />
            <Fact label="Created" value={new Date(posting.createdAt).toLocaleString('vi-VN')} />
            <Fact label="Updated" value={new Date(posting.updatedAt).toLocaleString('vi-VN')} />
            <Fact
              label="Published at"
              value={posting.publishedAt ? new Date(posting.publishedAt).toLocaleString('vi-VN') : '—'}
            />
            <Fact
              label="Archived at"
              value={posting.archivedAt ? new Date(posting.archivedAt).toLocaleString('vi-VN') : '—'}
            />
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Liên kết tới /viec-lam/[slug] đã được cố ý bỏ: trang public
                hiện vẫn tra Project (getPublicJobDetail), chưa gắn với
                JobPosting. Sẽ khôi phục khi có ánh xạ JobPosting.slug → Project.code
                hợp lệ (chờ AV6 CMS). Xem footer note bên dưới. */}
            <Link
              href="/admin/jobs/job-postings"
              className="rounded border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: 'var(--outline)', color: 'var(--on-surface)' }}
            >
              ← Quay lại danh sách
            </Link>
          </div>
        </header>

        {/* Editor shell — form + preview cặp cho từng section content */}
        <JobPostingEditorShell />

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
            <li><strong>Lưu bản nháp section content</strong> (mọi thay đổi trong form phía trên) → chờ AV2 backend (Postgres persistence + API ghi). Hiện chỉ tồn tại trong state cục bộ của tab.</li>
            <li><strong>Publish JobPosting</strong> (DRAFT → PUBLISHED) → chờ contract N3 (gắn JobPosting với JobOpening status transition).</li>
            <li><strong>Section content thật (REAL)</strong> thay vì fixture DEMO khởi đầu → chờ AV2 backend + AV6 CMS.</li>
            <li><strong>Gallery media</strong> (chỗ attach ảnh) → chờ AV4 Media Library integration với JobPosting owner.</li>
            <li><strong>Mở JobPosting ở trang public</strong> (<code>/viec-lam/[slug]</code>) → trang public hiện vẫn tra Project (qua <code>getPublicJobDetail</code>), chưa gắn với JobPosting. Sẽ khôi phục liên kết khi ánh xạ JobPosting.slug → Project.code hợp lệ (chờ AV6 CMS).</li>
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
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </dt>
      <dd
        className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--on-surface)' }}
      >
        {value}
      </dd>
    </div>
  );
}
