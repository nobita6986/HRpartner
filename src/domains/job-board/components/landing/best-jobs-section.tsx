import Link from 'next/link';
import { FeaturedJobCard } from './featured-job-card';

interface BestJobsSectionProps {
  jobs: Array<{
    id: string;
    title: string;
    salary?: string | null;
    location?: string | null;
    badgeType?: 'urgent' | 'new' | null;
  }>;
  buildHref: (jobId: string) => string;
}

export function BestJobsSection({ jobs, buildHref }: BestJobsSectionProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      data-section="bestjobs"
      aria-labelledby="hrp-best-jobs-heading"
      className="w-full bg-surface-container-low px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 3).map((job) => (
            <FeaturedJobCard key={job.id} job={job} href={buildHref(job.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
