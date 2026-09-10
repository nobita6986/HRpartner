import Link from 'next/link';
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
      /* Y2: bỏ bg-surface-container-low, thu hẹp padding */
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-[1080px] */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-2">
          {/* STEP-05/RQ-08/DEC-13: Icon apartment trong vòng tròn nhẹ bg-secondary-container rounded-full */}
          {/* STEP-05/RQ-10/DEC-15: Bỏ eyebrow + sub-heading kỹ thuật */}
          <h2
            id="hrp-recruiting-heading"
            className="font-head text-headline-lg font-bold text-on-surface flex items-center gap-2"
          >
            <span className="w-10 h-10 bg-secondary-container rounded-full inline-flex items-center justify-center">
              <span className="material-symbols-outlined text-base text-primary-dark" aria-hidden="true">apartment</span>
            </span>
            Dự án đang tuyển
          </h2>
        </div>
        {/* STEP-05/RQ-09: Card 4-col md / 2-col mobile, KHÔNG anchor giả — dùng Link */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.slice(0, 4).map((job) => (
            <Link
              key={job.id}
              href={buildHref(job.id)}
              data-testid={`recruiting-card-${job.id}`}
              className="hrp-focus flex flex-col items-center gap-3 rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary-container"
            >
              {/* STEP-05/RQ-09/DEC-14: Logo monogram 64×64 px outer */}
              <HrMonogram size={64} className="w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0" />
              <p className="font-head text-headline-md font-bold text-on-surface leading-tight">{job.title}</p>
              {/* STEP-05/RQ-09/DEC-16: Copy "Cần tuyển {n} người", n = availableSlots */}
              <p className="font-label text-label-md text-primary-container font-bold">
                Cần tuyển {job.availableSlots} người
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
