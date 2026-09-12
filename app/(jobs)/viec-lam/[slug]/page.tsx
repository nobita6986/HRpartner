/**
 * page.tsx — go-live-12 / RQ-05, RQ-06, RQ-07, RQ-08, RQ-11 / DEC-01, DEC-02, DEC-06..DEC-11,
 * DEC-13, DEC-14.
 *
 * Trang chi tiết việc làm công khai `/viec-lam/{code}`, với `{code}` là `PublicJobDto.slug`
 * (= `project.code`), theo `DEC-01`.
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
 * UI04d D.A (11/09/2026): mở rộng với các section editor thân thiện với CMS
 * phía sau (gallery, benefits, support, ctv-info, requirements, employer-sidebar,
 * apply instructions, related jobs, footer banner). Sections phụ thuộc
 * editorial fields (AV2) / media (AV4) dùng demo fixture hoặc render skeleton
 * với `source: INTEGRATION_PENDING`. KHÔNG đổi DTO công khai, KHÔNG đổi API.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { BenefitsSection } from '@/src/domains/job-board/components/detail/benefits-section';
import { SupportSection } from '@/src/domains/job-board/components/detail/support-section';
import { EmployerSidebar } from '@/src/domains/job-board/components/detail/employer-sidebar';
import { RelatedJobsSection } from '@/src/domains/job-board/components/detail/related-jobs-section';
import { FooterBannerSection } from '@/src/domains/job-board/components/detail/footer-banner-section';
import {
  demoIntroductionContent,
  demoRequirementsContent,
  demoCompensationContent as demoBenefitsContent,
  demoSupportContent,
  demoApplyInstructionsContent,
  demoFooterBannerContent,
} from '@/src/domains/job-board/fixtures/detail-sections.fixture';
import type {
  GallerySectionContent,
  CtvInfoSectionContent,
  EmployerSidebarContent,
} from '@/src/domains/job-board/public-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageProps = { params: Promise<{ slug: string }> };

/** Route class TĨNH cho log của limiter: template, KHÔNG phải URL thật (`DEC-12` của ops-06a). */
const ROUTE_CLASS = 'GET /viec-lam/[slug]';

/** Tiêu đề của nhánh bị từ chối. KHÔNG dùng lại nhãn 404, vì đó là nói sai sự thật (`RQ-03`). */
const RATE_LIMITED_TITLE = 'Bạn thao tác quá nhanh';

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
 * UI04d D.A: trong cùng transaction công khai, lấy thêm `relatedJobs` (lọc
 * trong bộ nhớ theo area/shift overlap) để render section related mà không
 * thêm một roundtrip DB.
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

  return withPublicDb(getPrisma(), (tx) => loadJobAndRelated(tx, slug));
});

async function loadJobAndRelated(
  tx: Parameters<typeof getPublicJobDetail>[0],
  slug: string,
): Promise<JobLoadResult> {
  const job = await getPublicJobDetail(tx, slug);
  if (!job) return { kind: 'missing' };

  // Lấy 20 dòng eligible, lọc trong bộ nhớ cho related (giữ RLS công khai và
  // không tự gọi API nội bộ). 20 → 4 sau khi overlap area/shift.
  const list = await listPublicJobProjection(tx, { limit: 20, offset: 0 });
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
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
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-on-surface)' }}>{job.title}</h1>
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

      {/* SECTIONS 2..13 — UI04d D.A */}
      <div className="mt-6 flex flex-col gap-4">
        {/* GALLERY (skeleton — chờ AV4 Media) */}
        <GallerySection content={gallery} />

        {/* GRID: editorial + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* INTRODUCTION (DEMO) */}
            <ContentSection content={demoIntroductionContent} />

            {/* BENEFITS (DEMO) */}
            <BenefitsSection content={demoBenefitsContent} />

            {/* SUPPORT (DEMO) */}
            <SupportSection content={demoSupportContent} />

            {/* CTV INFO (DEMO, AFF-gated) */}
            <CtvInfoSection content={ctvInfo} visible={showCtvInfo} />

            {/* REQUIREMENTS (DEMO) */}
            <ContentSection content={demoRequirementsContent} />
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

        {/* APPLY INSTRUCTIONS (DEMO) */}
        <ContentSection content={demoApplyInstructionsContent} />

        {/* RELATED JOBS (REAL) */}
        <RelatedJobsSection relatedJobs={result.kind === 'ok' ? result.relatedJobs : []} />

        {/* FOOTER BANNER (DEMO) */}
        <FooterBannerSection content={demoFooterBannerContent} />
      </div>
    </div>
  );
}
