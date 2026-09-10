import Link from 'next/link';
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

export function FeaturedJobCard({ job, href, onApply }: FeaturedJobCardProps) {
  const preview = isPreview(job);
  const hasSalary = job.salaryMinVnd !== null;
  const displaySalary = salaryLabel(job.salaryMinVnd, job.salaryMaxVnd);
  const ctaLabel = preview ? 'Bản xem trước' : 'Ứng tuyển nhanh';

  return (
    <article
      data-testid={`featured-job-${job.id}`}
      className="hrp-focus group relative card flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary-container"
    >
      {/* VIS-01: Ribbon sát góc trên-phải — chỉ khi badgeType === 'urgent' */}
      {job.badgeType === 'urgent' && (
        <span
          className="absolute top-0 right-0 z-20 flex items-center gap-1 rounded-bl-lg bg-primary-container px-3 py-1 text-white shadow-sm"
          aria-label="Tuyển gấp"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            local_fire_department
          </span>
          <span className="px-2 py-0.5 text-[12px]">Tuyển gấp</span>
        </span>
      )}

      {/* ─── Card content: semantic Link (DEC-01) ─────────────────────────── */}
      {/* DEC-01: Link bọc content; CTA button là sibling bên ngoài Link */}
      {/* KHÔNG nested interactive element — Link và CTA là siblings */}
      <Link
        href={href}
        className="hrp-focus flex flex-1 flex-col gap-4 rounded outline-none"
        /* RQ-05: Focus indicator via hrp-focus class */
      >
        {/* Title/meta wrapper — pr-[72px] when urgent to avoid ribbon collision */}
        <div className="flex items-start gap-4">
          <HrMonogram
            size={64}
            className="w-16 h-16 shrink-0 rounded-xl border border-outline-variant bg-white"
          />
          <div className={`flex-1 ${job.badgeType === 'urgent' ? 'pr-[72px]' : ''}`}>
            <h3 className="font-head text-headline-md font-bold leading-tight text-on-surface transition group-hover:text-primary-container mb-1">
              {job.title}
            </h3>
            <p className="font-body text-body-md text-primary-container">
              HRP Việt Nam
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-body text-body-md text-on-surface-variant">
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            location_on
          </span>
          <span>{job.location ?? 'Toàn quốc'}</span>
        </div>
      </Link>

      {/* ─── Action area: CSS 3D flip (DEC-02) ─────────────────────────── */}
      {/*
       * DEC-02: Flip chỉ áp dụng vùng action/salary area — KHÔNG flip toàn bộ card.
       * Chiều cao CỐ ĐỊNH để grid không reflow khi flip.
       * Dùng CSS 3D transform với perspective + transform-style: preserve-3d + backface-visibility.
       */}
      <div className="action-area-container relative h-[52px] overflow-hidden md:h-[56px]">
        <div className="action-area-wrapper absolute inset-0" data-testid="action-area-wrapper">

          {/* ── Front face: salary badge ── */}
          {/*
           * Mặt trước: salary badge thật hoặc "Lương thương lượng" (DEC-09).
           * Hiển thị khi: (a) card có salary) HOẶC (b) không salary nhưng vẫn flip được.
           */}
          <div
            className="action-area-front absolute inset-0 flex items-center justify-center rounded-xl bg-primary-fixed p-3 backface-hidden"
            data-testid="action-area-front"
            aria-hidden="false"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className="material-symbols-outlined text-[20px] text-primary-container"
                aria-hidden="true"
              >
                payments
              </span>
              <span className="font-label text-label-md font-bold text-primary-container">
                {displaySalary}
              </span>
            </div>
          </div>

          {/* ── Back face: CTA button ── */}
          {/*
           * Mặt sau: CTA "Ứng tuyển nhanh".
           * DEC-01: CTA là sibling của Link, KHÔNG nested trong Link.
           * KHÔNG dùng aria-hidden trên CTA vì nó có thể focus (RQ-05 / DEC-13).
           */}
          <div
            className="action-area-back absolute inset-0 flex items-center justify-center rounded-xl bg-primary-container p-3 rotate-x-180 backface-hidden"
            data-testid="action-area-back"
            aria-hidden="false"
          >
            <button
              type="button"
              disabled={preview}
              onClick={preview ? undefined : onApply}
              className={`
                flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2
                font-label text-label-md font-semibold
                transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                ${
                  preview
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60'
                    : 'bg-primary text-white hover:bg-primary-container hover:text-primary-container focus-visible:outline-primary-container'
                }
              `}
              aria-label={ctaLabel}
              data-testid="featured-job-cta"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                how_to_reg
              </span>
              <span>{ctaLabel}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ─── DEC-02 / RQ-02: CSS 3D flip transform ─── */
        .action-area-container {
          perspective: 600px;
        }

        .action-area-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        /* ─── RQ-03 / AC-05: hover/focus-within trigger flip ─── */
        /* Desktop: khi pointer vào card → mặt sau (CTA) ra */
        article:is(:hover, :focus-within) .action-area-wrapper {
          transform: rotateX(180deg);
        }

        /* Fixed height để grid không reflow (DEC-02) */
        .action-area-front,
        .action-area-back {
          height: 100%;
        }

        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        /* Mặt sau quay 180° để bắt đầu ẩn */
        .rotate-x-180 {
          transform: rotateX(180deg);
        }

        /* ─── RQ-04 / AC-06: mobile — hiển thị salary + CTA song song (side by side) ─── */
        @media (hover: none) and (pointer: coarse) {
          /* Touch device: hiển thị cả salary và CTA không cần hover */
          .action-area-container {
            height: auto;
            perspective: none;
          }

          .action-area-wrapper {
            position: static;
            transform: none !important;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .action-area-front,
          .action-area-back {
            position: static;
            transform: none !important;
            height: auto;
            min-height: 48px;
          }
        }

        @media (max-width: 767px) {
          .action-area-container {
            height: auto;
            perspective: none;
          }

          .action-area-wrapper {
            position: static;
            transform: none !important;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .action-area-front,
          .action-area-back {
            position: static;
            transform: none !important;
            height: auto;
            min-height: 48px;
          }
        }

        /* ─── RQ-06 / AC-07 / DEC-07: prefers-reduced-motion ─── */
        @media (prefers-reduced-motion: reduce) {
          .action-area-wrapper {
            transition: none;
            transform: none !important;
          }

          /* Luôn hiện cả salary và CTA song song khi reduced motion */
          .action-area-container {
            height: auto;
            perspective: none;
          }

          .action-area-wrapper {
            position: static;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .action-area-front,
          .action-area-back {
            position: static;
            transform: none !important;
            height: auto;
            min-height: 48px;
          }
        }
      `}</style>
    </article>
  );
}
