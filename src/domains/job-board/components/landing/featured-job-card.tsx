import Link from 'next/link';
import { MapPin, Clock3, Banknote } from 'lucide-react';
import type { EnrichedJob } from '@/app/(portal)/page';
import { HrMonogram } from './hr-monogram';
import { STAMPS, STAMP_RANK, type StampKey } from './stamp-defs';

export interface FeaturedJobCardProps {
  /** Job data — EnrichedJob shape from page.tsx */
  job: {
    id: string;
    slug: string;
    title: string;
    salaryMinVnd: number | null;
    salaryMaxVnd: number | null;
    location?: string | null;
    /** Backward compat (single urgent flag). Deprecated — dùng `stamps`. */
    badgeType?: 'urgent' | 'new' | null;
    /** Y10.4/UI04g: list các stamp sẽ render trên card góc trên phải. */
    stamps?: StampKey[];
    /** Y10.4/UI04g: tên công ty/nhà máy — render thay hardcoded "HRP Việt Nam". */
    companyName?: string | null;
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

/**
 * Y10.6/UI04j r3: rubber stamp redesign với SVG grunge ink filter —
 * hiệu ứng mực lốm đốm, viền tròn không đều (kiểu con dấu cao su thật).
 *
 * Workflow:
 * 1. Define 1 SVG filter duy nhất (GrungeInkFilter) — turbulence + displacementMap
 *    làm méo các shape của stamp → tạo cảm giác mực không đều.
 * 2. Stamp body dùng clipPath tròn + fill mực cam → áp filter để có hiệu ứng grunge.
 * 3. Inner ring + icon + text đặt trên overlay, không bị filter làm méo chữ.
 */
function GrungeInkFilter() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
      <defs>
        {/* R3: noise filter mạnh — tạo hiệu ứng grunge realistic */}
        <filter id="hrp-stamp-grunge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 2 -0.8"
            result="texture"
          />
          <feComposite in="texture" in2="SourceGraphic" operator="in" result="textureClipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="textureClipped" />
          </feMerge>
        </filter>

        {/* R3: displacement filter — làm méo viền tròn, tạo cảm giác con dấu thật */}
        <filter id="hrp-stamp-distort" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="turb" />
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

function RubberStamp({ stampKey }: { stampKey: StampKey }) {
  const def = STAMPS[stampKey];
  const Icon = def.Icon;
  return (
    <div
      className="pointer-events-none absolute -top-5 -right-5 z-30"
      data-testid="job-stamp"
      aria-label={def.ariaLabel}
      style={{ transform: `rotate(${def.rotateDeg}deg)` }}
    >
      <GrungeInkFilter />

      {/* Stamp body: SVG-based để có hiệu ứng grunge distortion chân thực */}
      <div
        className="relative"
        style={{
          // Shadow mạnh có màu mực để 3D pop
          filter: `drop-shadow(0 6px 8px ${def.ringClass.includes('amber') ? 'rgba(217,119,6,0.55)' : def.ringClass.includes('orange') ? 'rgba(249,115,22,0.55)' : 'rgba(239,68,68,0.55)'}) drop-shadow(0 2px 4px rgba(0,0,0,0.25))`,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="block"
          style={{ filter: 'url(#hrp-stamp-distort)' }}
        >
          {/* Vòng tròn mực chính — áp grunge filter */}
          <circle
            cx="60"
            cy="60"
            r="52"
            className={def.bgClass}
            filter="url(#hrp-stamp-grunge)"
          />

          {/* Lỗ hổng grunge trắng — tạo đốm mực loang lổ */}
          <g opacity="0.55" filter="url(#hrp-stamp-grunge)">
            <circle cx="35" cy="45" r="3" fill="white" />
            <circle cx="82" cy="38" r="2.5" fill="white" />
            <circle cx="45" cy="80" r="4" fill="white" />
            <circle cx="78" cy="75" r="2" fill="white" />
            <circle cx="60" cy="35" r="2" fill="white" />
            <circle cx="55" cy="92" r="2.5" fill="white" />
            <circle cx="92" cy="62" r="1.8" fill="white" />
            <circle cx="28" cy="65" r="2" fill="white" />
          </g>

          {/* Đốm đậm (mực in đè) */}
          <g opacity="0.45" filter="url(#hrp-stamp-grunge)">
            <circle cx="50" cy="55" r="2" fill="black" />
            <circle cx="72" cy="50" r="1.5" fill="black" />
            <circle cx="68" cy="78" r="2.5" fill="black" />
            <circle cx="40" cy="70" r="1.8" fill="black" />
          </g>

          {/* Inner ring — vòng tròn mực bên trong kiểu con dấu */}
          <circle
            cx="60"
            cy="60"
            r="40"
            fill="none"
            className={def.borderClass}
            strokeWidth="2"
            opacity="0.7"
            filter="url(#hrp-stamp-grunge)"
          />
        </svg>

        {/* Text + Icon overlay (không bị filter làm méo) */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center ${def.fgClass}`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="mt-0.5 text-[10px] font-black uppercase tracking-widest leading-none whitespace-nowrap">
            {def.label}
          </span>
        </div>

        {/* Grunge dots văng ra ngoài — hạt mực */}
        <div
          className={`pointer-events-none absolute -left-1 top-1/3 h-1.5 w-1.5 rounded-full ${def.bgClass}`}
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-1 w-1 rounded-full ${def.bgClass}`}
          style={{ opacity: 0.45 }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute -right-1 bottom-1/4 h-1 w-1.5 rounded-full ${def.bgClass}`}
          style={{ opacity: 0.4 }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute -top-1 -left-0.5 h-1 w-1 rounded-full ${def.bgClass}`}
          style={{ opacity: 0.5 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
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
      /* RQ-14: Minimal SaaS surface — white bg + slate border + rounded-xl + shadow-sm.
         Y10.6/UI04j: bỏ overflow-hidden để RubberStamp tràn ra ngoài card (3D overflow).
         Border-radius vẫn áp dụng cho nội dung bên trong vì không có element nào tràn qua edge. */
      className="hrp-focus group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {/* Y10.4/UI04g: Single rubber stamp badge — tilted stamp style với tone cam HRP.
          Chỉ hiển thị 1 stamp (admin chọn khi tạo job). */}
      {(() => {
        // Lấy stamp đầu tiên (quan trọng nhất theo STAMP_RANK)
        const stamps: StampKey[] = (job.stamps && job.stamps.length > 0)
          ? [...job.stamps].sort((a, b) => STAMP_RANK[a] - STAMP_RANK[b])
          : (job.badgeType === 'urgent' ? ['tuyen-gap'] : []);
        if (stamps.length === 0) return null;
        return <RubberStamp stampKey={stamps[0]} />;
      })()}

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
          {/* Y10.4/UI04g: hover tên job từ blue-700 → primary-dark (tone cam). */}
          <h3
            className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-primary-dark mb-0.5"
            title={job.title}
          >
            {job.title}
          </h3>
          {/* Y10.4/UI04g fix: render companyName từ API (tên nhà máy), fallback "HRP Việt Nam". */}
          <p className="text-sm font-medium text-slate-500">
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
