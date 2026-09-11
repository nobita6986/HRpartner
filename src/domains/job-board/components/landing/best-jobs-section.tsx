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

export function BestJobsSection({
  jobs,
  total,
  pageSize,
  offset,
  nextOffset,
  onPrev,
  onNext,
  buildHref,
  onApply,
}: BestJobsSectionProps) {
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);
  // Pagination works when total > pageSize
  const showPagination = total > pageSize;

  return (
    <section
      data-section="bestjobs"
      aria-labelledby="hrp-best-jobs-heading"
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl + px-4 md:px-6 (đồng bộ với Areas section) */}
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {/* Y2: chỉ giữ icon ngọn lửa + tiêu đề "Việc làm tốt nhất"; bỏ 'Gợi ý cho bạn',
            mô tả và link 'Xem tất cả →'. Tab đẩy thẳng xuống dưới tiêu đề. */}
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
            <span
              className="material-symbols-outlined text-base text-primary-dark"
              aria-hidden="true"
            >
              local_fire_department
            </span>
          </span>
          <h2
            id="hrp-best-jobs-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            Việc làm tốt nhất
          </h2>
        </div>

        {/* Y10.4/UI04g: No tabs — all jobs displayed together */}

        {/* DEC-01: Job grid 3 hàng x 3 cột — render from props, driven by pageSize prop (DEC-04) */}
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  // Y10.4/UI04g: pass stamps array (admin chọn khi tạo job).
                  stamps: job.stamps,
                  badgeType: job.badgeType === 'urgent' ? 'urgent' : null,
                  // Y10.4/UI04g fix: companyName = tên nhà máy từ API.
                  companyName: job.companyName,
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
              Không có việc làm nào.
            </p>
          </div>
        )}

        {/* DEC-03: Pagination control */}
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
