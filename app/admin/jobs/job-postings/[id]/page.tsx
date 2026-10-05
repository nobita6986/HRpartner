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
 * UI truth baseline (hrp-p1-a0.2 / T1C):
 *   - Canonical public JobPosting detail (`/viec-lam/[slug]`) đã được
 *     cutover sang JobPosting PUBLISHED trong P1-A1 (ACCEPTED). Không còn
 *     fallback về `getPublicJobDetail` qua Project cho posting hiện hữu.
 *   - Anonymous apply RPC (`/api/public/jobs/[slug]/applications`) đã bind
 *     với JobPosting PUBLISHED + OPEN + linked slot trong P1-B (ACCEPTED),
 *     dùng SECURITY DEFINER RPC `hrp_public_apply_submission` server-derived
 *     canonical chain — không còn truy vấn Project/Slot cũ.
 *   - Hai claim trên là UI truth baseline, không được ghi ngược
 *     "chờ P1-A1" / "CandidateSubmission.jobPostingId chưa có" trên UI
 *     production.
 *
 * Còn hạn chế thật sự:
 *   - Slug rename sau first PUBLISHED: schema lock slug immutability ở
 *     PUBLISHED (P1-A0 AC-11). Pre-publish rename route chưa được expose —
 *     vẫn phải tạo JobOpening mới để đổi slug ở trạng thái này.
 *   - hrp-t1c-jobposting-media-youtube (RQ-01, RQ-05): gallery media + YouTube
 *     URL đã tích hợp ở T1C — pre-load qua `listJobPostingMedia` (RQ-05) và
 *     gắn vào JobPostingEditorShell, không còn "AV4 còn chờ" trên UI này.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Breadcrumb } from '@/src/shared/ui/navigation/breadcrumb';
import { RelatedObjects } from '@/src/shared/ui/data-display/related-objects';
import { StatusBadge } from '@/src/shared/ui/status-badge';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getJobPostingForAdmin } from '@/src/domains/staffing/job-posting-list.service';
import {
  JOB_POSTING_MODULE,
  jobPostingStatusLabel,
  jobPostingStatusTone,
} from '@/src/domains/staffing/job-posting-ui';
import { jobOpeningStatusLabel } from '@/src/domains/staffing/job-opening-ui';
// hrp-t1c-jobposting-media-youtube (RQ-05): pre-fetch gallery ở Server Component
// để tránh waterfall khi client mount. listJobPostingMedia trả JobPostingMediaAssignmentDto
// (cover-first, order ASC, status='PUBLIC' only).
import {
  listJobPostingMedia,
  type JobPostingMediaAssignmentDto,
} from '@/src/domains/staffing/job-posting-media.service';
import type { SystemRole } from '@prisma/client';

import { JobPostingEditorShell } from './editor-shell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  // EP §3.5 #47 — breadcrumb + H1 binding.
  title: 'Tin tuyển dụng — trang xem — Admin',
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
  const { posting, initialMedia } = await withDbContext(prisma, ctx, async (tx) => {
    const [posting, initialMedia] = await Promise.all([
      getJobPostingForAdmin(tx, id),
      // hrp-t1c-jobposting-media-youtube (RQ-05): pre-load gallery. Nếu posting
      // không tồn tại / không đọc được, listJobPostingMedia sẽ throw NOT_FOUND —
      // page đã trả notFound ở nhánh dưới nên ta trả mảng rỗng để không mask lỗi.
      canMutate
        ? listJobPostingMedia(tx, ctx, id).catch((): JobPostingMediaAssignmentDto[] => [])
        : Promise.resolve([] as JobPostingMediaAssignmentDto[]),
    ]);
    return { posting, initialMedia };
  });
  if (!posting) {
    // Có thể là (a) id không tồn tại, hoặc (b) RLS policy deny (role không
    // đọc được project liên quan). Trang public `/viec-lam/[slug]` đã cutover
    // sang JobPosting PUBLISHED ở P1-A1, KHÔNG còn fallback Project-only —
    // không thể dùng slug-style fallback ở đây; chỉ trả notFound khi service
    // đã chạy đầy đủ và cho null.
    notFound();
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb — EP §3.5 #46/#47/#48 binding */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: 'Danh sách nhu cầu', href: '/admin/jobs' },
              { label: 'Tin tuyển dụng — trang xem', href: '/admin/jobs/job-postings' },
              { label: 'Tin tuyển dụng' },
            ]}
          />
        </div>

        {/* Header metadata */}
        <header className="mb-6 rounded-xl border p-5" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--color-surface)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>
                {posting.title || 'Tin tuyển dụng'}
              </h1>
            </div>
            <StatusBadge
              module={JOB_POSTING_MODULE}
              status={posting.status}
              tone={jobPostingStatusTone(posting.status)}
              testId={`job-posting-detail-status-${posting.id}`}
            >
              {jobPostingStatusLabel(posting.status)}
            </StatusBadge>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Đường dẫn công khai" value={posting.slug} mono />
            <Fact label="Phiên bản chỉnh sửa" value={`v${posting.revision}`} />
            <Fact label="Ngày tạo" value={new Date(posting.createdAt).toLocaleString('vi-VN')} />
            <Fact label="Ngày cập nhật" value={new Date(posting.updatedAt).toLocaleString('vi-VN')} />
            <Fact
              label="Ngày đăng"
              value={posting.publishedAt ? new Date(posting.publishedAt).toLocaleString('vi-VN') : '—'}
            />
            <Fact
              label="Ngày lưu trữ"
              value={posting.archivedAt ? new Date(posting.archivedAt).toLocaleString('vi-VN') : '—'}
            />
          </dl>

          <div className="mt-6">
            <RelatedObjects
              title="Đợt tuyển dụng"
              items={posting.opening ? [{
                // hrp-t1a-postdeploy-runtime-correction-2 (round 2):
                // wire JobOpening UUID as the React key + add href so the
                // card deep-links into /admin/job-openings/[id] (was missing).
                id: posting.opening.id,
                title: <span className="flex flex-wrap items-center gap-2"><span className="font-mono">{posting.opening.staffingOrderCode}</span><span className="text-xs" style={{ color: 'var(--on-surface-variant)' }} data-testid="opening-subtitle">{jobOpeningStatusLabel(posting.opening.status)}</span></span>,
                statusLabel: jobOpeningStatusLabel(posting.opening.status),
                href: `/admin/job-openings/${posting.opening.id}`,
              }] : []}
              emptyState="Chưa được gắn với đợt tuyển dụng nào."
            />

            {/* hrp-t1a-postdeploy-runtime-correction-2 (round 2):
                Server publish route is fail-closed — POST /publish returns
                409 JOB_OPENING_NOT_OPEN until linked JobOpening reaches OPEN.
                Show a one-line hint on the JobPosting page so admin sees
                the next-step bridge before clicking Publish (which is
                disabled with a reason on the editor shell itself). */}
            {posting.opening && posting.opening.status !== 'OPEN' && (
              <p
                className="mt-2 text-xs italic"
                style={{ color: 'var(--on-surface-variant)' }}
                data-testid="opening-cta-hint"
              >
                Có thể đăng tin sau khi đợt tuyển dụng được mở. Mở đợt tuyển dụng qua liên kết ở trên để tiếp tục.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Liên kết tới /viec-lam/[slug] đã được cố ý bỏ trên UI admin này:
                canonical public detail ở P1-A1 là JobPosting-slug lookup, không
                dùng internal UUID. URL kiểu `/viec-lam/${slug}` chỉ hợp lệ với
                slug đã publish; admin cần copy slug từ panel nếu muốn xem
                render thật. Footer note bên dưới liệt kê phần còn hạn chế. */}
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
        <JobPostingEditorShell initial={posting} initialMedia={initialMedia} canMutate={canMutate} />

        {/* Footer note — UI truth baseline (hrp-p1-a0.2 / T1C).
            *
            *  Chỉ giữ lại những capability thật sự còn hạn chế. Những claim về
            *  "public detail còn Project-backed / anonymous apply chờ P1-A1 /
            *  CandidateSubmission.jobPostingId chưa có" đã được P1-A1 và P1-B
            *  (cả hai ACCEPTED trên main) giải quyết — không ghi ngược trên
            *  UI production. Slug rename là schema-level immutability của
            *  P1-A0 AC-11 chứ không phải khóa tạm thời.
            *
            *  Items còn hạn chế:
            *  - Gallery media integration: chưa có — AV4 còn chờ. JobPosting
            *    chỉ mang 4 rich-text field (description/requirements/benefits/
            *    applicationInstructions).
            *  - Slug rename sau first PUBLISHED: schema lock slug (P1-A0
            *    AC-11: published slug immutable). Pre-publish rename route
            *    chưa được expose; vẫn phải tạo JobOpening mới để đổi slug.
            */}
        <section
          className="mt-6 rounded-lg border p-4 text-sm"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--on-surface-variant)',
          }}
          aria-label="Tính năng chưa khả dụng"
          data-testid="locked-section-detail"
        >
          <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            Tính năng chưa khả dụng
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Sau khi đăng tin, đường dẫn không thể thay đổi. Nếu cần dùng đường dẫn khác,
              hãy tạo một đợt tuyển dụng mới.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// T1B Wave 2 (EP §3.2.3): the inline `colorMap` + local `StatusBadge`
// component previously at the bottom of this file is replaced by the
// shared `<StatusBadge module={JOB_POSTING_MODULE}>` primitive + the
// domain-owned `jobPostingStatusLabel()` / `jobPostingStatusTone()`
// helpers from `src/domains/staffing/job-posting-ui.ts`. There is no
// local StatusBadge or colorMap in this file anymore.

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
