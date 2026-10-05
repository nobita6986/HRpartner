'use client';

import Link from 'next/link';
import { MapPin, Clock3, Banknote } from 'lucide-react';
import { HrMonogram } from './hr-monogram';
import { formatPublicSalary } from '@/src/domains/job-board/public-listing.labels';
import { JobStampOverlay } from './stamp-overlay';

export interface FeaturedJobCardProps {
  /** Job data — EnrichedJob shape from page.tsx */
  job: {
    id: string;
    slug: string;
    title: string;
    salaryMinVnd: number | null;
    salaryMaxVnd: number | null;
    location?: string | null;
    /** Backward compat (single urgent flag). Deprecated — dùng 4 flag trực tiếp. */
    badgeType?: 'urgent' | 'new' | null;
    /** Y10.4/UI04g: tên công ty/nhà máy — render thay hardcoded "HRP Việt Nam". */
    companyName?: string | null;
    source?: 'REAL' | 'DEMO' | 'INTEGRATION_PENDING';
    /** RQ-20: ISO timestamp of newest visible order — render only when truthy */
    postedAt?: string | null;
    /** Y10.4/UI04g: pass stamps array (legacy field, KHÔNG dùng trên public card T1A+).
     *  Deprecated sau RC-02 fix — `<JobStampOverlay>` derive trực tiếp từ 4 flag dưới. */
    stamps?: string[];
    /** hrp-ui-v1-public-card-truth-correction (T1A / RQ-07, RC-02): 4 canonical flag truyền
     *  xuống `<JobStampOverlay>`. Trước đây 2 flag đầu (`isHot`, `isUrgent`) đến từ
     *  `EnrichedJob` (page.tsx enrich) và chưa là prop trực tiếp của card — T1A đưa cả 4
     *  vào prop để caller chủ động cung cấp, KHÔNG pre-compute `stamps` array. */
    isHot?: boolean;
    isUrgent?: boolean;
    /** hrp-ui-v1-job-card-stamps-brand (T1B / DEC-06 / RQ-07): 2 canonical flag mới. */
    isHighReward?: boolean;
    isExpiringSoon?: boolean;
    /**
     * hrp-ui-v1-public-card-truth-correction (T1A / RQ-06): author-entered salaryDisplay
     * từ `JobPosting.salaryDisplay`. Khi trim() non-empty, card render nguyên văn
     * (precedence 1 trong `formatPublicSalary`).
     */
    salaryDisplay?: string | null;
  };
  /** Canonical detail URL built by BestJobsSection via buildHref(job.slug) */
  href: string;
  /** Called when REAL card CTA is clicked — triggers ApplyModal via page-level closure. */
  onApply?: () => void;
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
  // hrp-ui-v1-public-card-truth-correction (T1A / RQ-13): salary pill dùng shared resolver
  // `formatPublicSalary`. Precedence 1: salaryDisplay.trim() non-empty → render nguyên văn.
  // Precedence 2/3: hourly fallback hoặc "Lương thương lượng".
  const displaySalary = formatPublicSalary({
    salaryDisplay: job.salaryDisplay ?? null,
    salaryMinVnd: job.salaryMinVnd,
    salaryMaxVnd: job.salaryMaxVnd,
  });
  // Khi salaryDisplay non-empty, KHÔNG prefix `₫` (đó là chuỗi HR/Owner tự gõ, không phải VND amount).
  const showVndPrefix = !job.salaryDisplay?.trim();
  const postedAtDisplay = postedAtLabel(job.postedAt);
  // Y10.8+: Strip prefix "Tuyển ..." khỏi title (vd "Tuyển nhân viên Kho Yên Phong 3" → "Nhân viên Kho Yên Phong 3")
  // — title trong DB thường có prefix "Tuyển" / "Tuyển gấp" / "Tuyển dụng" nhưng UI không cần.
  const displayTitle = job.title.replace(/^(tuyển\s*(gấp|dụng)?\s*)/i, '').trim() || job.title;
  // Monogram cũng dùng displayTitle để khớp với chữ cái đầu của role thật (vd "Nhân viên Kho..." -> "NK").
  const monogram = deriveMonogram(displayTitle);

  return (
    <article
      data-testid={`featured-job-${job.id}`}
      /* RQ-14: Minimal SaaS surface — white bg + slate border + rounded-xl + shadow-sm.
         hrp-ui-v1-public-card-truth-correction (T1A / DEC-03): `relative` để `<JobStampOverlay>`
         (position: absolute) neo đúng; KHÔNG `overflow-hidden` để stamp tràn ra ngoài card
         (3D overflow) trên cả 3 bề mặt (homepage, /viec-lam, /viec-lam/[slug]). */
      className="hrp-focus group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {/* hrp-ui-v1-public-card-truth-correction (T1A / DEC-01, DEC-02, RQ-01, RQ-06): dùng shared
          `<JobStampOverlay>` (3D tilted, ink, overflow) thay vì local `RubberStamp`. Derive flags
          qua `deriveStampsFromFlags` từ `stamp-defs.ts` (single source of truth). KHÔNG có
          `stamps?` override — đó là RC-02 root cause (mảng 2 flag nuốt 4 boolean). */}
      <JobStampOverlay
        isHot={Boolean(job.isHot)}
        isUrgent={Boolean(job.isUrgent)}
        isHighReward={Boolean(job.isHighReward)}
        isExpiringSoon={Boolean(job.isExpiringSoon)}
        size="sm"
      />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      {/* Y10.8+: Header min-h-[4.75rem] (không fixed) để salary pill vẫn đồng bộ ngang giữa các card
          trên desktop khi card thấp nhất đúng 4.75rem, nhưng mobile title 2-dòng dài có thể co giãn
          xuống thêm (chứa logo 48px + 2-line title + 1-line company mà không tràn ra body). */}
      <div className="flex items-start gap-3 p-4 min-h-[4.75rem]">
        {/* Y10.2/UI04f: monogram = abbreviation từ title job (vd "Yên Phong 3" -> "YP"). */}
        <HrMonogram
          size={48}
          label={monogram}
          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white"
        />
        {/* Content column — tự co giãn theo title 1-2 dòng + company 1 dòng. */}
        <div className="min-w-0 flex-1">
          {/* Y10.4/UI04g: hover tên job từ blue-700 → primary-dark (tone cam). */}
          <h3
            className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-primary-dark mb-0.5"
            title={job.title}
          >
            {displayTitle}
          </h3>
          {/* Y10.4/UI04g fix: render companyName từ API (tên nhà máy), fallback "HRP Việt Nam". */}
          <p className="text-sm font-medium text-slate-500 leading-tight">
            {job.companyName ?? 'HRP Việt Nam'}
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
          TRƯỚC footer nút bấm. hrp-ui-v1-public-card-truth-correction (T1A / RQ-13): pill
          gọi `formatPublicSalary` (salaryDisplay > hourly > thương lượng). Khi salaryDisplay
          non-empty, KHÔNG prefix `₫` — đó là chuỗi HR tự gõ. */}
      <div className="px-4 pb-3">
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
          {showVndPrefix ? <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
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
            ${preview || !onApply
              ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
              : 'bg-primary text-white hover:bg-primary-dark focus-visible:outline-primary'
            }`}
          aria-label={preview ? 'Bản xem trước' : !onApply ? 'Xem chi tiết' : 'Ứng tuyển nhanh'}
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
