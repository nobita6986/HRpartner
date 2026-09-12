/**
 * related-jobs-section.tsx — UI04d D.A
 *
 * Hiển thị danh sách việc làm liên quan (cùng area hoặc shift).
 * source: REAL dùng PublicJobDto[].
 *
 * Reuse FeaturedJobCard component đã có trong landing/.
 */
import { FeaturedJobCard } from '../landing/featured-job-card';
import type { PublicJobDto } from '../../public.service';
import { publicJobDetailPath } from '../../public-detail.meta';

export function RelatedJobsSection({
  relatedJobs,
}: {
  relatedJobs: PublicJobDto[];
}) {
  if (relatedJobs.length === 0) return null;

  return (
    <section
      data-section="related-jobs"
      data-source="REAL"
      aria-label="Việc làm liên quan"
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-outline-variant)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
          Việc làm liên quan
        </h2>
        <a
          href="/viec-lam"
          className="inline-flex items-center gap-1 text-xs font-medium rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--color-primary-dark)' }}
        >
          Xem tất cả
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            arrow_forward
          </span>
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {relatedJobs.slice(0, 4).map((job) => (
          <FeaturedJobCard
            key={job.id}
            job={{
              id: job.id,
              slug: job.slug,
              title: job.title,
              salaryMinVnd: job.salaryMinVnd,
              salaryMaxVnd: job.salaryMaxVnd,
              location: job.location ?? null,
              companyName: job.companyName,
              source: 'REAL',
              postedAt: job.postedAt,
            }}
            href={publicJobDetailPath(job.slug)}
          />
        ))}
      </div>
    </section>
  );
}
