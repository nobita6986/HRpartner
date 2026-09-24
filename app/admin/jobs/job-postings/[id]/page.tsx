/**
 * /admin/jobs/job-postings/[id] — P1-A0 admin authoring.
 *
 * Server Component: reads the JobPosting through RLS via `withDbContext`,
 * then hands the row to the client editor shell. The shell drives the real
 * PATCH / publish / unpublish / archive API.
 *
 * RLS Phase 2 (DEC-02): JobPosting có FORCE ROW LEVEL SECURITY. Mọi SELECT
 * phải qua `withDbContext(prisma, ctx, ...)` để `applyRlsContext` set GUC
 * transaction-local (`app.user_id`, `app.role`).
 *
 * Quyền page:
 *   - MUTATION_ROLES = { ADMIN, HR_MANAGER, HR_STAFF } — đồng bộ với service.
 *     Những role này được xem + ghi (publish/unpublish/archive).
 *   - VIEWER_ROLES = { PM, SALE, DIRECTOR } — đồng bộ với RLS project visibility
 *     của `hrp_project_visible_for` để HR_STAFF/ACCOUNTANT không thấy DRAFT
 *     nội bộ (chờ chính sách phân quyền rõ ràng hơn).
 *
 * Public anonymous apply RPC (`/api/public/jobs/[slug]/applications`) KHÔNG
 * bị ảnh hưởng — vẫn tra Project qua `getPublicJobDetail`. A1 sẽ gắn nó với
 * JobPosting khi schema mapping được chốt.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';

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

const MUTATION_ROLES: ReadonlySet<SystemRole> = new Set([
  'ADMIN',
  'HR_MANAGER',
  'HR_STAFF',
]);

const VIEWER_ROLES: ReadonlySet<SystemRole> = new Set([
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
  const allowed = MUTATION_ROLES.has(session.role) || VIEWER_ROLES.has(session.role);
  if (!allowed) {
    redirect('/forbidden');
  }
  const canMutate = MUTATION_ROLES.has(session.role);

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
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: 'Admin Jobs', href: '/admin/jobs' },
              { label: 'JobPosting viewer', href: '/admin/jobs/job-postings' },
              { label: posting.slug },
            ]}
          />
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

          <div className="mt-6">
            <RelatedObjects
              title="Job Opening"
              items={posting.opening ? [{
                id: posting.opening.staffingOrderCode,
                title: <span className="font-mono">{posting.opening.staffingOrderCode}</span>,
                statusLabel: posting.opening.status,
              }] : []}
              emptyState="Chưa được gắn với JobOpening nào (orphan)."
            />
          </div>

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

        {/* Editor shell — P1-A0: real Tiptap wrapper + real persistence API */}
        <JobPostingEditorShell initial={posting} canMutate={canMutate} />

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
            <li><strong>Mở JobPosting ở trang public</strong> (<code>/viec-lam/[slug]</code>) → trang public hiện vẫn tra Project (qua <code>getPublicJobDetail</code>), chưa gắn với JobPosting. Sẽ được khôi phục khi <code>P1-A1</code> hoàn tất ánh xạ JobPosting.slug → Project.</li>
            <li><strong>Gallery media</strong> (ảnh đính kèm JobPosting) → chờ AV4 Media Library integration với JobPosting owner.</li>
            <li><strong>Anonymous apply RPC gắn JobPosting</strong> (tạo CandidateSubmission.jobPostingId) → chờ P1-A1. Hiện tại vẫn qua Project/Slot cũ, không thay đổi.</li>
            <li><strong>Sửa slug trước publish</strong> → schema lock slug sau first PUBLISHED; pre-publish rename hiện chưa expose. Cần tạo JobOpening mới nếu muốn đổi slug.</li>
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
