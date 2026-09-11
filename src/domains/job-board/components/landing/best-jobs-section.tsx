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
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl (đồng bộ với Hero + SearchSection) */}
      <div className="mx-auto w-full max-w-7xl">
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

        {/* DEC-01: Tab filter — Tất cả / Tuyển gấp (đẩy lên ngay dưới tiêu đề). */}
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
                  // Y10.4/UI04g: pass stamps array (tuyen-gap + hot + thuong-cao + moi).
                  // badgeType chỉ giữ backward compat cho filter 'urgent' tab.
                  stamps: job.stamps,
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

        {/* DEC-03: Pagination control — works for both tabs when total > pageSize */}
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
