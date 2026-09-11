import { FeaturedJobCard } from './featured-job-card';
import type { NewestJobsContent } from '../../public-types';
import { publicJobDetailPath } from '../../public-detail.meta';
import type { EnrichedJob } from '@/app/(portal)/page';

/**
 * Section 1 — Việc làm mới nhất (REAL).
 *
 * Dùng `overview.newest.slice(0, 6)` — đã có sẵn từ `bootstrapBestJobs` của
 * composition task. KHÔNG mở API mới, KHÔNG tạo view-model mới trong
 * `public.service.ts`.
 *
 * KHÁC BestJobs: BestJobs hiển thị 3 jobs featured (slice 3 từ overview.newest
 * hoặc topPaid fallback); NewestJobs hiển thị 6 jobs mới nhất (slice 6 từ
 * overview.newest). Vai trò trình bày: BestJobs = curated/top, NewestJobs =
 * stream mới nhất để người dùng thấy dòng chảy việc làm mới trong ngày.
 *
 * HIDDEN nếu `enabled === false` hoặc `jobs.length === 0`. KHÔNG badge demo.
 */
export function NewestJobsSection({ content }: { content: NewestJobsContent }) {
  if (!content.enabled) return null;
  if (content.jobs.length === 0) return null;

  return (
    <section
      data-section="newest-jobs"
      data-source={content.source}
      aria-labelledby="hrp-newest-jobs-heading"
      /* Container pattern đồng bộ với BestJobs/Areas/Recruiting (HEAD đã chốt). */
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
            <span
              className="material-symbols-outlined text-base text-primary-dark"
              aria-hidden="true"
            >
              schedule
            </span>
          </span>
          <h2
            id="hrp-newest-jobs-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            {content.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.jobs.slice(0, 6).map((job: EnrichedJob) => (
            <FeaturedJobCard
              key={job.id}
              job={{
                id: job.id,
                slug: job.slug,
                title: job.title,
                salaryMinVnd: job.salaryMinVnd,
                salaryMaxVnd: job.salaryMaxVnd,
                location: job.locations[0] ?? 'Toàn quốc',
                stamps: job.stamps,
                badgeType: job.badgeType === 'urgent' ? 'urgent' : null,
                companyName: job.companyName,
                source: 'REAL',
                postedAt: job.postedAt,
              }}
              href={publicJobDetailPath(job.slug)}
              onApply={undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
