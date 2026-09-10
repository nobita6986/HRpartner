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
      {/* VIS-01: Ribbon sát góc trên-phải — chỉ khi badgeType === 'urgent' */}
      {job.badgeType === 'urgent' && (
        <span
          className="absolute top-0 right-0 rounded-bl-lg bg-primary-container text-white px-3 py-1 flex items-center gap-1 shadow-sm z-10"
          aria-label="Tuyển gấp"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">local_fire_department</span>
          <span className="text-[12px] px-2 py-0.5">Tuyển gấp</span>
        </span>
      )}
      {/* VIS-01: Title/meta wrapper — pr-[64px] when urgent to avoid ribbon collision */}
      <div className="flex items-start gap-4">
        {/* STEP-03/RQ-04/DEC-07: Logo outer 64×64 px 1 lớp — w-16 h-16 rounded-xl border border-outline-variant bg-white */}
        {/* HrMonogram con co theo padding tự nhiên — KHÔNG p-2, KHÔNG lồng 2 borders */}
        <HrMonogram size={64} className="w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0" />
        <div className={`flex-1 ${job.badgeType === 'urgent' ? 'pr-[64px]' : ''}`}>
          {/* STEP-03: Title font-headline-md font-bold */}
          <h3 className="font-head text-headline-md font-bold text-on-surface transition group-hover:text-primary-container leading-tight mb-1">
            <Link href={href} className="hrp-focus rounded">
              {job.title}
            </Link>
          </h3>
          <p className="font-body text-body-md text-primary-container">HRP Việt Nam</p>
        </div>
      </div>
      <div className="flex items-center gap-2 font-body text-body-md text-on-surface-variant">
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          location_on
        </span>
        <span>{job.location ?? 'Toàn quốc'}</span>
      </div>
      {/* VIS-02: Salary pill — bg-primary-fixed, payments icon 20px, text-primary-container */}
      {job.salary && (
        <div className="mt-auto">
          <div className="bg-primary-fixed rounded-xl p-3 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary-container" aria-hidden="true">payments</span>
            <span className="font-label text-label-md font-bold text-primary-container">{job.salary}</span>
          </div>
        </div>
      )}
    </article>
  );
}
