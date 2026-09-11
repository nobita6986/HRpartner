import Link from 'next/link';
import { MapPin, Clock3, Banknote, Flame } from 'lucide-react';
import type { EnrichedJob } from '@/app/(portal)/page';
import { HrMonogram } from './hr-monogram';

export interface FeaturedJobCardProps {
  /** Job data — EnrichedJob shape from page.tsx */
  job: {
    id: string;
    slug: string;
    title: string;
    salaryMinVnd: number | null;
    salaryMaxVnd: number | null;
    location?: string | null;
    badgeType?: 'urgent' | 'new' | null;
    source?: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';
    /** RQ-20: ISO timestamp of newest visible order — render only when truthy */
    postedAt?: string | null;
  };
  /** Canonical detail URL built by BestJobsSection via buildHref(job.slug) */
  href: string;
  /** Called when REAL card CTA is clicked — triggers ApplyModal via page-level closure. */
  onApply?: () => void;
}

/** Formats VND salary range for display. */
function salaryLabel(min: number | null, max: number | null): string {
  if (min === null) return 'Lương thương lượng';
  const VND_FORMAT = new Intl.NumberFormat('vi-VN');
  const from = VND_FORMAT.format(min);
  if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
  return `${from} đ/giờ`;
}

/** True when the card should behave as a preview/DEMO (fixture data, not live). */
function isPreview(job: FeaturedJobCardProps['job']): boolean {
  return (
    job.source === 'DEMO' ||
    job.source === 'INTEGRATION_PENDING' ||
    job.id.startsWith('preview-')
  );
}

/** Y10.2/UI04f: derive 2-3 letter monogram từ job title (vd "Kỹ thuật viên điện tử Yên Phong 3" -> "KY", "Chuyên viên nhân sự Khổng Tiên" -> "CH"). */
function deriveMonogram(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => w.replace(/[^A-Za-zÀ-ỹ]/g, '').charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || 'HRP';
}

/** Formats postedAt ISO to a short date label for display. */
function postedAtLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

export function FeaturedJobCard({ job, href, onApply }: FeaturedJobCardProps) {
  const preview = isPreview(job);
  const displaySalary = salaryLabel(job.salaryMinVnd, job.salaryMaxVnd);
  const postedAtDisplay = postedAtLabel(job.postedAt);
  // Y10.2/UI04f: monogram = abbreviation từ title job (demo logo đại diện tên project/công ty).
  const monogram = deriveMonogram(job.title);

  return (
    <article
      data-testid={`featured-job-${job.id}`}
      /* RQ-14: Minimal SaaS surface — white bg + slate border + rounded-xl + shadow-sm */
      className="hrp-focus group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {/* RQ-09/RQ-10/RQ-23: Ribbon compact — top-right overlay, pointer-events-none, ~24-28px height */}
      {job.badgeType === 'urgent' && (
        <span
          /* pointer-events-none: overlay does not push content; RQ-09: no pr-[72px] on title */
          className="pointer-events-none absolute top-0 right-0 z-20 flex items-center gap-1 rounded-bl-md border-l border-b border-orange-300/40 bg-orange-500/75 px-2 py-1 text-white backdrop-blur-[1px]"
          aria-label="Tuyển gấp"
        >
          <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-semibold leading-none">Tuyển gấp</span>
        </span>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      {/* RQ-15: 2-col layout — logo fixed 48px square + content column with min-w-0 */}
      <div className="flex items-start gap-3 p-4">
        {/* Y10.2/UI04f: monogram = abbreviation từ title job (vd "Yên Phong 3" -> "YP"). */}
        <HrMonogram
          size={48}
          label={monogram}
          className="h-12 w-12 shrink-0 rounded-lg border border-slate-100 bg-white"
        />
        <div className="min-w-0 flex-1">
          {/* Y10.2/UI04f: hover tên job từ blue-700 → primary-dark (tone cam). */}
          <h3
            className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-primary-dark mb-0.5"
            title={job.title}
          >
            {job.title}
          </h3>
          <p className="text-sm font-medium text-slate-500">
            HRP Việt Nam
          </p>
        </div>
      </div>

      {/* ─── Body / Metadata ───────────────────────────────────────────── */}
      {/* RQ-16: responsive row with Lucide icons */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3">
        {job.location && (
          <span className="inline-flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{job.location}</span>
          </span>
        )}
        {postedAtDisplay && (
          <span className="inline-flex items-center gap-1 text-sm text-slate-500">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{postedAtDisplay}</span>
          </span>
        )}
      </div>

      {/* Y3.2: Tách dòng Mức lương — đứng riêng ngay sau phần địa điểm/thời gian,
          TRƯỚC footer nút bấm. Giữ nguyên className pill emerald để fence test pass. */}
      <div className="px-4 pb-3">
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
          <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{displaySalary}</span>
        </span>
      </div>

      {/* ─── Footer / Actions ──────────────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between flex-wrap gap-2 border-t border-slate-200 px-4 py-3 sm:gap-3">
        {/* RQ-18/RQ-24: Xem chi tiết — outline/ghost (Secondary). Y3.3+Y3.4: 2 nút nằm cùng 1 hàng ngang dưới cùng thẻ. */}
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          <span>Xem chi tiết</span>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        {/* RQ-18/RQ-19: Ứng tuyển — primary cam thương hiệu (Primary). */}
        <button
          type="button"
          disabled={preview}
          onClick={preview ? undefined : (e => { e.stopPropagation(); e.preventDefault(); onApply?.(); })}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
            ${preview
              ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
              : 'bg-primary text-white hover:bg-primary-dark focus-visible:outline-primary'
            }`}
          aria-label={preview ? 'Bản xem trước' : 'Ứng tuyển nhanh'}
          data-testid="featured-job-cta"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span>{preview ? 'Bản xem trước' : 'Ứng tuyển'}</span>
        </button>
      </div>
    </article>
  );
}
