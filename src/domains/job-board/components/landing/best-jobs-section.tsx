import Link from 'next/link';
import { FeaturedJobCard } from './featured-job-card';
import type { EnrichedJob } from '@/app/(portal)/page';

export interface BestJobsSectionProps {
  // Jobs data
  jobs: EnrichedJob[];
  // Pagination metadata
  total: number;
  pageSize: number;
  offset: number;
  nextOffset: number | null;
  // Tab control
  tab: 'all' | 'urgent';
  onTabChange: (tab: 'all' | 'urgent') => void;
  // Pagination actions
  onPrev: () => void;
  onNext: () => void;
  // Helpers
  buildHref: (jobSlug: string) => string;
  /**
   * Called when a REAL card CTA is clicked.
   * DEC-04: BestJobsSection closes over the EnrichedJob and passes a no-arg callback.
   */
  onApply?: (job: EnrichedJob) => void;
}

function salaryLabel(min: number | null, max: number | null): string {
  if (min === null) return 'Lương thương lượng';
  const VND_FORMAT = new Intl.NumberFormat('vi-VN');
  const from = VND_FORMAT.format(min);
  if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
  return `${from} đ/giờ`;
}

export function BestJobsSection({
  jobs,
  total,
  pageSize,
  offset,
  nextOffset,
  tab,
  onTabChange,
  onPrev,
  onNext,
  buildHref,
  onApply,
}: BestJobsSectionProps) {
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);
  // STEP-04/STEP-05/STEP-06: pagination works for both tabs when total > pageSize
  const showPagination = total > pageSize;

  return (
    <section
      data-section="bestjobs"
      aria-labelledby="hrp-best-jobs-heading"
      className="w-full bg-surface-container-low px-4 py-12 md:px-8 md:py-16"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-[1080px] */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6">
        <div className="mb-6 flex flex-col gap-2">
          {/* STEP-04/RQ-07/DEC-11: Section header icon local_fire_department trong w-10 h-10 bg-secondary-container rounded-full */}
          <p className="font-label text-label-sm font-bold uppercase tracking-widest text-primary-dark">
            <span className="w-10 h-10 bg-secondary-container rounded-full inline-flex items-center justify-center mr-2 align-middle">
              <span className="material-symbols-outlined text-base text-primary-dark" aria-hidden="true">local_fire_department</span>
            </span>
            Gợi ý cho bạn
          </p>
          <h2
            id="hrp-best-jobs-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            Việc làm tốt nhất
          </h2>
          <p className="max-w-2xl font-body text-body-md text-on-surface-variant">
            Các vị trí đang tuyển nhiều ứng viên nhất, cập nhật liên tục từ dữ liệu thật của HRP.
          </p>
          {/* STEP-04/RQ-07/DEC-12: "Xem tất cả" link → /viec-lam */}
          <div className="mt-2">
            <Link
              href="/viec-lam"
              className="font-label text-label-md font-semibold text-primary-dark hover:text-primary-container transition-colors"
            >
              Xem tất cả →
            </Link>
          </div>
        </div>

        {/* DEC-01: Tab filter — Tất cả / Tuyển gấp */}
        <div className="mb-6" role="tablist" aria-label="Bộ lọc việc làm tốt nhất">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            onClick={() => onTabChange('all')}
            className={`mr-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md font-semibold transition-colors ${
              tab === 'all'
                ? 'bg-primary-container text-white font-bold'
                : 'bg-surface text-on-surface'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'urgent'}
            onClick={() => onTabChange('urgent')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-label text-label-md font-semibold transition-colors ${
              tab === 'urgent'
                ? 'bg-primary-container text-white font-bold'
                : 'bg-surface text-on-surface'
            }`}
          >
            Tuyển gấp
          </button>
        </div>

        {/* STEP-07: No preview banner — URGENT tab uses live data */}

        {/* DEC-01: Job grid — render from props, driven by pageSize prop (DEC-04) */}
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <FeaturedJobCard
                key={job.id}
                job={{
                  id: job.id,
                  slug: job.slug,
                  title: job.title,
                  salaryMinVnd: job.salaryMinVnd,
                  salaryMaxVnd: job.salaryMaxVnd,
                  location: job.locations[0] ?? 'Toàn quốc',
                  badgeType: job.badgeType === 'urgent' ? 'urgent' : null,
                  // DEC-08: phân biệt preview card qua source field
                  source: (job as { source?: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING' }).source,
                }}
                href={buildHref(job.slug)}
                onApply={onApply ? () => onApply(job) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low py-12">
            <p className="font-body text-body-md text-on-surface-variant">
              {tab === 'urgent' ? 'Hiện chưa có việc tuyển gấp.' : 'Không có việc làm nào.'}
            </p>
          </div>
        )}

        {/* DEC-03: Pagination control — only shown when tab === 'all' && total > pageSize */}
        {showPagination && (
          <div
            className="mt-8 flex items-center justify-center gap-4"
            role="group"
            aria-label="Phân trang"
          >
            <button
              type="button"
              onClick={onPrev}
              disabled={offset === 0}
              className="hrp-btn-primary hrp-focus inline-flex items-center gap-1 rounded-lg px-4 py-2 font-label text-label-md font-semibold disabled:opacity-40"
              aria-label="Trang trước"
            >
              ← Trước
            </button>
            <span className="font-body text-body-md text-on-surface-variant" aria-live="polite">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={nextOffset === null || offset + pageSize >= total}
              className="hrp-btn-primary hrp-focus inline-flex items-center gap-1 rounded-lg px-4 py-2 font-label text-label-md font-semibold disabled:opacity-40"
              aria-label="Trang sau"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
