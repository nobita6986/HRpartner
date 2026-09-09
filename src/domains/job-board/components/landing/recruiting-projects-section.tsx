import { HrMonogram } from './hr-monogram';

interface RecruitingProject {
  id: string;
  title: string;
  availableSlots: number;
}

interface RecruitingProjectsSectionProps {
  jobs: RecruitingProject[];
  buildHref: (jobId: string) => string;
}

export function RecruitingProjectsSection({ jobs, buildHref }: RecruitingProjectsSectionProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      data-section="recruiting"
      aria-labelledby="hrp-recruiting-heading"
      className="w-full bg-surface-container-low px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <p className="font-label text-label-sm font-bold uppercase tracking-widest text-primary-dark">
            <span className="material-symbols-outlined mr-1 align-middle text-base" aria-hidden="true">
              engineering
            </span>
            Cơ hội mới
          </p>
          <h2
            id="hrp-recruiting-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            Dự án đang tuyển
          </h2>
          <p className="max-w-2xl font-body text-body-md text-on-surface-variant">
            Các dự án đang mở tuyển, hiển thị số slot thật từ dữ liệu HRP.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.slice(0, 4).map((job) => (
            <a
              key={job.id}
              href={buildHref(job.id)}
              data-testid={`recruiting-card-${job.id}`}
              className="hrp-focus flex flex-col items-center gap-3 rounded-2xl border border-outline-variant bg-surface p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary-container"
            >
              <HrMonogram size={64} />
              <p className="font-head text-headline-md font-bold text-on-surface">{job.title}</p>
              <p className="font-label text-label-md text-primary-container">
                {job.availableSlots} slot đang mở
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
