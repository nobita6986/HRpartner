import Link from 'next/link';
import { HrMonogram } from './hr-monogram';

interface FeaturedJobCardProps {
  job: {
    id: string;
    title: string;
    salary?: string | null;
    location?: string | null;
    badgeType?: 'urgent' | 'new' | null;
  };
  href: string;
}

export function FeaturedJobCard({ job, href }: FeaturedJobCardProps) {
  return (
    <article
      data-testid={`featured-job-${job.id}`}
      className="hrp-focus group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary-container"
    >
      {job.badgeType === 'urgent' && (
        <span
          className="absolute right-4 top-4 rounded-full bg-primary-container px-3 py-1 font-label text-label-sm font-bold uppercase tracking-wider text-white"
          aria-label="Tuyển gấp"
        >
          Tuyển gấp
        </span>
      )}
      <div className="flex items-start gap-4">
        <HrMonogram size={64} />
        <div className="flex-1">
          <h3 className="font-head text-headline-md font-bold text-on-surface transition group-hover:text-primary-container">
            <Link href={href} className="hrp-focus rounded">
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 font-body text-body-md text-primary-container">HRP Việt Nam</p>
        </div>
      </div>
      <div className="flex items-center gap-2 font-body text-body-md text-on-surface-variant">
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          location_on
        </span>
        <span>{job.location ?? 'Toàn quốc'}</span>
      </div>
      {job.salary && (
        <div className="mt-auto">
          <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 font-label text-label-md font-bold text-primary-container">
            {job.salary}
          </span>
        </div>
      )}
    </article>
  );
}
