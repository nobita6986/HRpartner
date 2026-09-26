/**
 * page.tsx — go-live-12 / RQ-05, RQ-06, RQ-07, RQ-08, RQ-11 / DEC-01, DEC-02, DEC-06..DEC-11,
 * DEC-13, DEC-14.
 *
 * Trang chi tiết việc làm công khai `/viec-lam/{code}`, với `{code}` là `PublicJobDto.slug`
 * (= `JobPosting.slug`), theo `DEC-01` và `OD-A1-01`.
 *
 * Server Component đọc DB qua ĐÚNG `withPublicDb` (`DEC-02`, `RQ-05`): principal `MKT`,
 * transaction read-only, ba GUC đặt bên trong chính hàm đó. Trang KHÔNG mở transaction trần và
 * KHÔNG đặt GUC lẻ — đó đúng là cách defect "bề mặt công khai trả 0 dòng" của go-live-04 phát
 * sinh. Trang cũng không tự gọi API nội bộ của chính ứng dụng: thêm một chặng mạng, mất context
 * request, và làm metadata phụ thuộc base URL runtime.
 *
 * `dynamic = 'force-dynamic'` (`DEC-11`): số chỗ trống đổi theo từng đơn nộp, bản cache sẽ khoe
 * chỗ đã hết rồi người dùng nộp xong mới nhận lỗi đủ chỉ tiêu.
 *
 * `notFound()` cho 404 THẬT (`DEC-09`). Việc đã đủ chỉ tiêu vẫn mở `200` (`DEC-14`) — link đã chia
 * sẻ ra ngoài không được biến thành 404 chỉ vì hết chỗ.
 *
 * Bề mặt dữ liệu (`RQ-06`, `DEC-06`, `DEC-07`): CHỈ các khóa của `PublicJobDetailDto`. Không mức
 * lương, không tên/mã/logo khách hàng, không nhãn đơn vị tuyển dụng, không văn bản tự do của đơn
 * tuyển dụng. `RQ-13` canh bằng test tĩnh đọc chính file này THÔ, không strip comment: kể cả chú
 * thích cũng không được mang sáu chuỗi bị cấm. Vì thế cặp văn bản của metadata sinh ở
 * `src/domains/job-board/public-detail.meta.ts` — lý do đầy đủ ở docblock module đó và HANDOFF §5.
 *
 * Nút Ứng tuyển (`RQ-07`, `DEC-13`) là đảo client duy nhất của trang, ở
 * `src/domains/job-board/components/detail-apply-cta.tsx`. Nó dùng lại đúng `ApplyModal` đã tách,
 * nên trang này không tự gọi mạng và không tự dựng form thứ hai.
 *
 * go-live-18 / RQ-02, RQ-03, RQ-04 / DEC-01..DEC-04: đường đọc DB của trang đi qua limiter TRƯỚC
 * khi chạm DB. Limiter nằm TRONG `loadJob`, phía trên `withPublicDb`, vì `loadJob` là đường duy
 * nhất tới DB và được CẢ `generateMetadata` lẫn thân trang dùng lại: đặt ở thân trang thôi thì
 * lượt render metadata vẫn truy vấn, còn gọi hai lần thì đếm đôi cùng một ngân sách `JOB_BROWSE`
 * — rule đó dùng CHUNG cho danh sách và chi tiết (`EV-03`, `DEC-02`).
 *
 * Giới hạn CÓ TÊN (`DEC-03`, `RQ-04`): Server Component của Next `15.1` KHÔNG đặt được status
 * code, nên nhánh bị từ chối vẫn trả HTTP `200` kèm một khối thông báo. Điều được bảo đảm là ZERO
 * truy vấn DB ở nhánh đó, KHÔNG phải một mã `429`.
 *
 * UI04d D.A (11/09/2026): các section CMS-friendly (gallery, ctv-info, employer-sidebar, related
 * jobs, footer banner). Sections phụ thuộc editorial fields (AV2) / media (AV4) dùng skeleton với
 * `source: INTEGRATION_PENDING` hoặc render `null` an toàn. KHÔNG đổi DTO công khai, KHÔNG đổi API.
 *
 * hrp-p1-a1 (AC-03..06): rich content của JobPosting được render qua shared renderer
 * `renderJobPostingRichText` (HRP wrapper, A0 freeze) — KHÔNG dùng cơ chế set HTML
 * trực tiếp trong React, KHÔNG dùng raw HTML, KHÔNG tự viết ProseMirror→React. Corrupted payload
 * fail closed / omit section + ghi diagnostic an toàn. SEO metadata (title, mô tả ngắn,
 * `JobPosting` qua DTO chứ KHÔNG qua fixture. Lưu ý đặt tên: trang này không bao giờ chứa chuỗi
 * `des*` vì `public-detail.static.test.ts` cấm substring đó (RQ-13) — đó là lý do DTO đặt tên
 * `summary` thay vì dùng tên chứa chuỗi cấm cho phần tóm tắt.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPrisma } from '@/src/lib/db';
import { withPublicDb } from '@/src/shared/auth/with-public-db';
import { getPublicJobDetail, listPublicJobProjection } from '@/src/domains/job-board/public.service';
import type { PublicJobDto } from '@/src/domains/job-board/public.service';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { evaluateRateLimits, RATE_LIMITED_MESSAGE } from '@/src/shared/security/rate-limit-guard';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { DetailApplyCta } from '@/src/domains/job-board/components/detail-apply-cta';
import { CANONICAL_ORIGIN } from '@/src/shared/routing/portal-landing';
import {
  JOB_TYPE_LABELS,
  PUBLIC_JOB_NOT_FOUND_TITLE,
  formatDeadlineDate,
  publicJobDetailPath,
  publicJobMetaText,
} from '@/src/domains/job-board/public-detail.meta';
import { GallerySection } from '@/src/domains/job-board/components/detail/gallery-section';
import { ContentSection, CtvInfoSection } from '@/src/domains/job-board/components/detail/content-section';
import { EmployerSidebar } from '@/src/domains/job-board/components/detail/employer-sidebar';
import { RelatedJobsSection } from '@/src/domains/job-board/components/detail/related-jobs-section';
import { renderJobPostingRichText } from '@/src/shared/content/job-posting-rich-text';
import { CtvInfoSectionContent, EmployerSidebarContent, GallerySectionContent } from '@/src/domains/job-board/public-types';
import {
  STAMPS,
  STAMP_RANK,
  type StampKey,
} from '@/src/domains/job-board/components/landing/stamp-defs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageProps = { params: Promise<{ slug: string }> };

/** Route class TĨNH cho log của limiter: template, KHÔNG phải URL thật (`DEC-12` của ops-06a). */
const ROUTE_CLASS = 'GET /viec-lam/[slug]';

/** Tiêu đề của nhánh bị từ chối. KHÔNG dùng lại nhãn 404, vì đó là nói sai sự thật (`RQ-03`). */
const RATE_LIMITED_TITLE = 'Bạn thao tác quá nhanh';

/**
 * hrp-p1-a1 (correction batch 1/1, C-06) — compatibility cho link cũ có dạng
 * `/viec-lam/PRJ-xxx`. Định danh mã dự án (`Project.code`) có hình dạng CHỮ HOA + gạch
 * ngang/gạch dưới + ký tự ASCII (ví dụ `PRJ-CANARY-001`, `PRJ-abc-1`). Khi URL slug có
 * đúng shape này:
 *   - KHÔNG 301/308 tới một detail mơ hồ (mỗi Project có thể có nhiều PUBLISHED postings).
 *   - KHÔNG 404 (HR đã chia sẻ link legacy; đây là một danh sách đã lọc, không phải "không có").
 *   - KHÔNG để router tự chọn một posting tùy ý.
 * → `redirect()` (HTTP 307) tới `/viec-lam?q=<slug>` để listing service lọc CHÍNH XÁC theo
 *   `Project.code`. `redirect()` nằm TRƯỚC `loadJob` để limiter không bị trừ cho một lượt
 *   detail đã được chuyển sang listing — limiter đếm trên URL cuối cùng, và HTTP 307 là đầu
 *   mối HTTP 1.0/1.1 chuẩn cho "đường dẫn đã đổi vị trí, giữ method" (`DEC-13`).
 *
 * Các giá trị KHÔNG có shape trên (chuỗi có dấu tiếng Việt, khoảng trắng, slug JobPosting hợp
 * lệ v.v.) đi qua nhánh detail bình thường. Regex có chủ ý KHÔNG nhận `Hanoi` hay `CaNgay`
 * (chuỗi ngắn không có `-`/`_`) để không đụng với truy vấn tiếng Việt hợp lệ.
 */
const LEGACY_PROJECT_CODE_RE = /^[A-Z][A-Z0-9]*[-_][A-Za-z0-9_-]*$/;

/** Lấy kiểu từ chính service, nên không có khai báo thứ hai nào phải giữ đồng bộ bằng tay. */
type LoadedJob = NonNullable<Awaited<ReturnType<typeof getPublicJobDetail>>>;

/** Ba kết cục PHÂN BIỆT được: có việc, không có việc, và bị limiter từ chối (`RQ-03`). */
type JobLoadResult =
  | { readonly kind: 'ok'; readonly job: LoadedJob; readonly relatedJobs: PublicJobDto[] }
  | { readonly kind: 'missing' }
  | { readonly kind: 'throttled' };

/**
 * `cache` của React gộp hai lần gọi trong CÙNG một request render (metadata và thân trang) thành
 * một truy vấn. Đây không phải cache giữa các request nên `force-dynamic` giữ nguyên hiệu lực.
 *
 * Vì gộp, limiter đặt ở ĐÂY chạy ĐÚNG một lần mỗi request render và chặn cả hai đường vào DB một
 * lượt (`RQ-02`). Dùng `evaluateRateLimits` — điểm vào chỉ-trả-quyết-định của `DEC-01` — vì một
 * Server Component không trả được `NextResponse`.
 *
 * UI04d D.A: lấy thêm `relatedJobs` qua một transaction công khai riêng. Không
 * giữ truy vấn projection rộng trong transaction đọc detail: interactive
 * transaction mặc định của Prisma có thể hết hạn trước truy vấn thứ hai trên
 * dữ liệu production và làm toàn bộ trang trả 500/P2028.
 */
const loadJob = cache(async (slug: string): Promise<JobLoadResult> => {
  const requestHeaders = await headers();
  const outcome = await evaluateRateLimits({
    buckets: [
      { rule: RATE_LIMIT_RULES.JOB_BROWSE, value: clientIpFromHeaders(requestHeaders, process.env) },
    ],
    routeClass: ROUTE_CLASS,
    requestId: getCorrelationId(requestHeaders),
  });
  // Cả `rate-limited` lẫn `unavailable` đều KHÔNG được chạm DB: fail-closed (`DEC-02`).
  if (outcome.kind !== 'allowed') return { kind: 'throttled' };

  return loadJobAndRelated(slug);
});

async function loadJobAndRelated(slug: string): Promise<JobLoadResult> {
  const prisma = getPrisma();
  const job = await withPublicDb(prisma, (tx) => getPublicJobDetail(tx, slug));
  if (!job) return { kind: 'missing' };

  // Transaction riêng vẫn giữ đúng principal/RLS công khai và tránh kéo dài
  // transaction đọc detail. Không tự gọi API nội bộ của chính ứng dụng.
  const list = await withPublicDb(prisma, (tx) =>
    listPublicJobProjection(tx, { limit: 20, offset: 0 }),
  );
  const relatedJobs = list.jobs.filter((candidate) => {
    if (candidate.id === job.id) return false;
    if (candidate.slug === job.slug) return false;
    const areaOverlap = candidate.locations.some((loc) =>
      job.locations.some((jLoc) => jLoc && loc && jLoc.trim().toLowerCase() === loc.trim().toLowerCase()),
    );
    const shiftOverlap = candidate.shifts.some((s) =>
      job.shifts.some((jS) => jS && s && jS.trim().toLowerCase() === s.trim().toLowerCase()),
    );
    return areaOverlap || shiftOverlap;
  }).slice(0, 4);

  return { kind: 'ok', job, relatedJobs };
}

/**
 * hrp-p1-a1 (C-06): redirect legacy PRJ-shaped slug sang listing filtered by exact
 * `Project.code`. Đặt ở đây (TRƯỚC `loadJob`) để limiter không ăn suất cho một lượt
 * detail rồi mới 307. Cả `generateMetadata` và thân trang đều gọi qua cùng một `cache`
 * để hai đường vào DB chỉ đếm một.
 */
const maybeRedirectLegacyProjectCode = cache((slug: string): null => {
  if (LEGACY_PROJECT_CODE_RE.test(slug)) {
    redirect(`/viec-lam?q=${encodeURIComponent(slug)}`);
  }
  return null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // C-06: redirect xảy ra ở đây để metadata cũng đi theo 307 — không có metadata cho
  // một URL đã được chuyển sang listing.
  maybeRedirectLegacyProjectCode(slug);
  const result = await loadJob(slug);
  // `RQ-03`: nhánh bị từ chối không được nói việc làm không tồn tại, kể cả trong thẻ tiêu đề.
  if (result.kind === 'throttled') return { title: RATE_LIMITED_TITLE };

  const job = result.kind === 'ok' ? result.job : null;
  if (!job) return { title: PUBLIC_JOB_NOT_FOUND_TITLE };

  const text = publicJobMetaText(job);
  return {
    ...text,
    openGraph: { ...text },
    alternates: { canonical: `${CANONICAL_ORIGIN}${publicJobDetailPath(job.slug)}` },
  };
}

/** Chip đúng lớp, đúng token và đúng khoảng cách của chip trên card ở `/` (`DEC-08`). */
function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container)' }}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</dt>
      <dd className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>{value}</dd>
    </div>
  );
}

/**
 * Nhánh bị limiter từ chối (`RQ-03`, `AC-06`). KHÔNG nhận một prop nào, nên không có đường nào để
 * slug, IP hay bất kỳ giá trị request nào lọt lên màn hình. Cũng KHÔNG gọi `notFound()`: nói rằng
 * việc làm không tồn tại là nói sai sự thật về một bản ghi chưa hề được đọc.
 */
function ThrottledNotice() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/viec-lam"
        className="inline-flex items-center gap-1 text-sm font-medium rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--color-primary-dark)' }}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Quay lại danh sách việc làm
      </Link>

      <section
        className="mt-4 rounded-xl border p-5 sm:p-6"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
        aria-live="polite"
      >
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {RATE_LIMITED_TITLE}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          {RATE_LIMITED_MESSAGE}
        </p>
      </section>
    </div>
  );
}

/**
 * UI04d D.A: build các section view-model từ `PublicJobDetailDto` + fixtures.
 * Skeleton dùng `source: 'INTEGRATION_PENDING'` + data rỗng; demo dùng fixture
 * typed. KHÔNG đổi DTO — chỉ derive thêm trường view-model.
 */
function buildGallerySection(): GallerySectionContent {
  return {
    id: 'gallery',
    enabled: true,
    order: 20,
    source: 'INTEGRATION_PENDING',
    media: [],
  };
}

function buildCtvInfoSection(): CtvInfoSectionContent {
  return {
    id: 'ctv-info',
    enabled: true,
    order: 60,
    source: 'DEMO',
    title: 'Thông tin dành cho CTV',
    blocks: [
      {
        type: 'paragraph',
        text: 'Bạn là CTV? HRP có chính sách hoa hồng và hỗ trợ riêng cho cộng tác viên giới thiệu ứng viên.',
      },
      {
        type: 'list',
        ordered: false,
        items: [
          'Hoa hồng theo bậc, thanh toán theo tháng',
          'Hỗ trợ marketing và tài liệu tuyển dụng',
          'Theo dõi trạng thái giới thiệu trực tuyến',
        ],
      },
    ],
  };
}

function buildEmployerSidebar(
  job: LoadedJob,
): EmployerSidebarContent {
  return {
    id: 'employer-sidebar',
    enabled: true,
    order: 80,
    source: 'REAL',
    companyName: job.companyName,
    logoUrl: null,
    address: job.siteAddress?.trim() || job.location?.trim() || 'Địa chỉ đang cập nhật',
    mapUrl: null,
  };
}

export default async function PublicJobDetailPage({ params }: PageProps) {
  const { slug } = await params;
  // C-06: redirect legacy PRJ-shape slug tới listing TRƯỚC khi limiter ăn suất.
  // Hàm `redirect()` throws một control-flow exception trong Next Server Component — từ đây
  // trở xuống không chạy nữa.
  maybeRedirectLegacyProjectCode(slug);
  const result = await loadJob(slug);
  if (result.kind === 'throttled') return <ThrottledNotice />;

  const job = result.kind === 'ok' ? result.job : null;
  if (!job) notFound();

  const isFull = job.availableSlots === 0;

  // UI04d D.A: AFF-gated (chưa có role CTV → mặc định false; sau này sẽ đọc từ session).
  const showCtvInfo = false;

  const gallery = buildGallerySection();
  const ctvInfo = buildCtvInfoSection();
  const employerSidebar = buildEmployerSidebar(job);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <Link
        href="/viec-lam"
        className="inline-flex items-center gap-1 text-sm font-medium rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--color-primary-dark)' }}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Quay lại danh sách việc làm
      </Link>

      {/* SUMMARY — section 1, REAL */}
      <article
        className="mt-4 rounded-xl border p-5 sm:p-6"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-on-surface)' }}>{job.title}</h1>
            {/* hrp-p1-a0-1 (DEC-05, T0 §1.4): detail page render stamps từ canonical boolean
                `JobPosting.isHot`/`isUrgent` — KHÔNG từ legacy `urgency`. Mỗi stamp có wrapper
                `.job-stamp-attention` riêng để chỉ stamp animate (0.7↔1.0), KHÔNG animate toàn page,
                và reduced-motion tắt animation. */}
            {(() => {
              const detailStamps: StampKey[] = [
                ...(job.isUrgent ? (['tuyen-gap'] as const) : []),
                ...(job.isHot ? (['hot'] as const) : []),
              ].sort((a, b) => STAMP_RANK[a] - STAMP_RANK[b]);
              if (detailStamps.length === 0) return null;
              return (
                <div className="flex items-start gap-1">
                  {detailStamps.map((stampKey, idx) => {
                    const def = STAMPS[stampKey];
                    return (
                      <span
                        key={`detail-stamp-${stampKey}-${idx}`}
                        className={`job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100 ${def.bgClass} ${def.fgClass} inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold`}
                        data-testid="job-stamp"
                        data-stamp-key={stampKey}
                        data-stamp-index={idx}
                        aria-label={def.ariaLabel}
                      >
                        {def.label}
                      </span>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={
              isFull
                ? { color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container-high)' }
                : { color: 'var(--color-primary-dark)', backgroundColor: 'var(--color-primary-soft)' }
            }
          >
            {job.statusLabel}
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          Mã việc làm: <span className="font-semibold">{job.jobCode}</span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip icon="location_on" label={job.location?.trim() || 'Địa điểm đang cập nhật'} />
          <Chip icon="schedule" label={job.shift?.trim() || 'Thời gian đang cập nhật'} />
          <Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Fact
            label="Chỗ trống"
            value={isFull ? job.statusLabel : `Còn ${job.availableSlots} chỗ trống`}
          />
          <Fact label="Chỉ tiêu đã tuyển" value={`${job.totalSlotsFilled}/${job.totalSlotsNeeded}`} />
          {job.deadline && <Fact label="Hạn nhận hồ sơ" value={formatDeadlineDate(job.deadline)} />}
        </dl>

        <div className="mt-6">
          <DetailApplyCta job={{ slug: job.slug, title: job.title }} isFull={isFull} />
        </div>
      </article>

        {/* SECTIONS 2..13 — UI04d D.A + hrp-p1-a1 (RQ-02/AC-03..05) */}
        <div className="mt-6 flex flex-col gap-4">
          {/* GALLERY (skeleton — chờ AV4 Media) */}
          <GallerySection content={gallery} />

          {/* GRID: editorial + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* INTRODUCTION (REAL) — JobPosting.summary → shared renderer */}
              <RichTextSection title="Mô tả công việc" doc={job.summary} schemaVersion={job.contentSchemaVersion} />

              {/* BENEFITS (REAL) — JobPosting.benefits → shared renderer */}
              <RichTextSection title="Phúc lợi" doc={job.benefits} schemaVersion={job.contentSchemaVersion} />

              {/* REQUIREMENTS (REAL) — JobPosting.requirements → shared renderer */}
              <RichTextSection title="Yêu cầu ứng viên" doc={job.requirements} schemaVersion={job.contentSchemaVersion} />

              {/* APPLICATION STEPS (REAL) — JobPosting.applicationSteps → shared renderer */}
              <RichTextSection title="Hướng dẫn ứng tuyển" doc={job.applicationSteps} schemaVersion={job.contentSchemaVersion} />

              {/* CTV INFO (AFF-gated) */}
              <CtvInfoSection content={ctvInfo} visible={showCtvInfo} />
            </div>

            <aside className="flex flex-col gap-4">
              {/* EMPLOYER SIDEBAR (REAL) */}
              <EmployerSidebar content={employerSidebar} />

              {/* POSITIONS (REAL, existing) */}
              <div
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-outline-variant)',
                }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
                  Vị trí tuyển dụng ({job.positions.length})
                </h3>
                <ul className="flex flex-col gap-3">
                  {job.positions.map((position, index) => (
                    <li
                      key={`${position.positionCode}-${index}`}
                      className="rounded-lg border p-3"
                      style={{ borderColor: 'var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                          {position.positionTitle}
                        </h4>
                        <span
                          className="text-xs font-semibold whitespace-nowrap"
                          style={{ color: position.available > 0 ? 'var(--color-primary-dark)' : 'var(--color-on-surface-variant)' }}
                        >
                          {position.available > 0 ? `Còn ${position.available} chỗ trống` : 'Đã đủ chỉ tiêu'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Chip icon="schedule" label={position.shift?.trim() || 'Thời gian đang cập nhật'} />
                        <Chip icon="location_on" label={position.workLocation?.trim() || 'Địa điểm đang cập nhật'} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          {/* RELATED JOBS (REAL) */}
          <RelatedJobsSection relatedJobs={result.kind === 'ok' ? result.relatedJobs : []} />
        </div>
      </div>
  );
}

/**
 * hrp-p1-a1 (AC-03..05) — section khung cho một khối rich-text từ JobPosting.
 *
 * `doc` đi qua `renderJobPostingRichText` (HRP wrapper, A0 freeze) — KHÔNG dùng
 * cơ chế set HTML trực tiếp trong React, KHÔNG tự viết ProseMirror→React. Renderer fail closed khi
 * `schemaVersion` lệch hoặc `doc` không qua validator: section bị ẨN HOÀN TOÀN khỏi DOM — không
 * render fallback "Nội dung đang được cập nhật", không render raw JSON payload, không leak bất kỳ
 * trường nào của `doc` ra DOM. Diagnostic chỉ ghi log an toàn (`title` + `reason`, KHÔNG có PII /
 * KHÔNG có raw JSON) để test tĩnh phát hiện (C-07 correction batch 1/1).
 */
function RichTextSection({
  title,
  doc,
  schemaVersion,
}: {
  title: string;
  doc: unknown | null;
  schemaVersion: number | null;
}) {
  // Fail-closed: invalid/corrupt/schema mismatch → omit section (C-07).
  if (doc === null || doc === undefined || schemaVersion === null) return null;
  const rendered = renderJobPostingRichText(schemaVersion, doc);
  if (!rendered.ok) {
    // Diagnostic an toàn: chỉ ghi `title` + `reason`, KHÔNG ghi `doc` (tránh PII / raw payload leak).
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[viec-lam detail] omit section "${title}": ${rendered.reason}`);
    }
    return null;
  }
  return (
    <section
      data-section="rich-text"
      data-source="REAL"
      aria-label={title}
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-on-surface)' }}>
        {title}
      </h2>
      <div className="prose-like" style={{ color: 'var(--color-on-surface)' }}>
        {rendered.element}
      </div>
    </section>
  );
}
