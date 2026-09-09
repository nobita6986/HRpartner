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
          <p className="font-label text-label-sm font-bold uppercase tracking-widest text-primary-dark">
            <span className="material-symbols-outlined mr-1 align-middle text-base" aria-hidden="true">
              workspace_premium
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
