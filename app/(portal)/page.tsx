'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
import { AreasSection } from '@/src/domains/job-board/components/landing/areas-section';
import { BestJobsSection } from '@/src/domains/job-board/components/landing/best-jobs-section';
import { Hero } from '@/src/domains/job-board/components/landing/hero';
import { RecruitmentHighlight } from '@/src/domains/job-board/components/landing/recruitment-highlight';
import { RecruitingProjectsSection } from '@/src/domains/job-board/components/landing/recruiting-projects-section';
import { ReferralStrip } from '@/src/domains/job-board/components/landing/referral-strip';
import { HrpIntroSection } from '@/src/domains/job-board/components/landing/hrp-intro-section';
import { NewsSection } from '@/src/domains/job-board/components/landing/news-section';
import {
  demoHrpIntro,
  demoNewsSection,
} from '@/src/domains/job-board/fixtures/demo-content';
import { publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';
import { buildListingHref } from '@/src/domains/job-board/public-listing.params';
import type {
  PublicJobDto,
  PublicJobFacets,
  PublicJobListResult,
  PublicJobOverview,
} from '@/src/domains/job-board/public.service';

// ─── UI-adapter: projection công khai → props của card ───────────────────────

const EMPTY_FACETS: PublicJobFacets = { areas: [], shifts: [] };
const EMPTY_OVERVIEW: PublicJobOverview = {
  totals: { jobs: 0, slots: 0, areas: 0 },
  areaCounts: [],
  shiftCounts: [],
  newest: [],
  topPaid: [],
};

// DEC-04 / STEP-04: BestJobs pageSize hardcoded 9 literal, passed via prop.
// Y10.8: 3 cột × 3 hàng = 9 jobs/page.
const BEST_JOBS_PAGE_SIZE = 9;

export interface EnrichedJob {
  id: string;
  slug: string;
  title: string;
  locations: string[];
  badgeType: 'urgent' | 'closing' | null;
  salaryMinVnd: number | null;
  salaryMaxVnd: number | null;
  availableSlots: number;
  /** RQ-20 / STEP-10: postedAt from PublicJobDto for recruitment time display */
  postedAt: string | null;
  /** Y10.4/UI04g: stamp tags render góc trên phải card (UI-only mock distribution). */
  stamps: StampKey[];
  /** Y10.4/UI04g fix: tên công ty/nhà máy (project.name), hiển thị dưới title job. */
  companyName: string | null;
}

import type { StampKey } from '@/src/domains/job-board/components/landing/stamp-defs';

/** Y10.4/UI04g: hash-based stamp distribution để mock cards trên UI.
    Khi admin form ready → thay bằng server-provided stamps[] từ DB. */
function deriveStamps(args: {
  /** Stable seed từ job (id hoặc slug). */
  seed: string;
  urgency: 'URGENT' | 'CLOSING' | 'NONE';
  salaryMinVnd: number | null;
  salaryMaxVnd: number | null;
  postedAt: string | null;
}): StampKey[] {
  const stamps: StampKey[] = [];
  if (args.urgency === 'URGENT') stamps.push('tuyen-gap');
  // "thuong-cao" nếu max >= 30k VND/giờ
  if (args.salaryMaxVnd !== null && args.salaryMaxVnd >= 30000) stamps.push('thuong-cao');
  // "moi" nếu posted trong 3 ngày gần đây
  if (args.postedAt) {
    const d = new Date(args.postedAt).getTime();
    if (Date.now() - d < 3 * 24 * 60 * 60 * 1000) stamps.push('moi');
  }
  // "tuyen-gap" distributed qua hash (50% jobs) — đảm bảo ~một nửa card có tuyển gấp.
  // Y10.8: bỏ stamp "hot", đổi sang "tuyen-gap" để đồng bộ nhánh brand HRP (Tiếng Việt).
  let h = 0;
  for (let i = 0; i < args.seed.length; i++) h = (h * 31 + args.seed.charCodeAt(i)) | 0;
  if (Math.abs(h) % 2 === 0) stamps.push('tuyen-gap');
  return stamps;
}

function enrichJob(job: PublicJobDto): EnrichedJob {
  const { salaryMinVnd, salaryMaxVnd, urgency, postedAt, companyName } = job;
  return {
    id: job.id,
    slug: job.slug ?? job.id,
    title: job.title,
    locations: job.locations,
    badgeType: urgency === 'URGENT' ? 'urgent' : urgency === 'CLOSING' ? 'closing' : null,
    salaryMinVnd,
    salaryMaxVnd,
    availableSlots: job.availableSlots,
    postedAt: postedAt ?? null,
    // Y10.4/UI04g: derive stamps from urgency + salary + postedAt + seed-based hash.
    stamps: deriveStamps({
      seed: job.id,
      urgency,
      salaryMinVnd,
      salaryMaxVnd,
      postedAt: postedAt ?? null,
    }),
    // Y10.4/UI04g fix: companyName = tên nhà máy từ API, hiển thị dưới title.
    companyName: companyName ?? null,
  };
}

// ─── BestJobs fetch query (limit=9, offset via state) ───────────────────────

function buildBestJobsQuery(offset: number): string {
  const params = new URLSearchParams({ limit: String(BEST_JOBS_PAGE_SIZE), offset: String(offset) });
  return params.toString();
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const router = useRouter();

  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState('');
  const [shift, setShift] = useState('');
  const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);
  const [overview, setOverview] = useState<PublicJobOverview>(EMPTY_OVERVIEW);
  const [applyJob, setApplyJob] = useState<EnrichedJob | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [successCode, setSuccessCode] = useState('');

  const [bestJobsOffset, setBestJobsOffset] = useState(0);
  const [bestJobsData, setBestJobsData] = useState<{ jobs: EnrichedJob[]; total: number; bestJobsNextOffset: number | null }>({
    jobs: [],
    total: 0,
    bestJobsNextOffset: null,
  });
  const [bestJobsLoading, setBestJobsLoading] = useState(false);

  // DEC-02 / STEP-02: bootstrapBestJobs — DUY NHẤT, chỉ tải page BestJobs + set bestJobsData + facets + overview.
  // KHÔNG có mode append, KHÔNG jobs state, KHÔNG nextOffset (chỉ bestJobsOffset), KHÔNG generation/sentinel/observer.
  const bootstrapBestJobs = useCallback(
    (offset: number) => {
      let cancelled = false;
      setBestJobsLoading(true);

      fetch(`/api/jobs?${buildBestJobsQuery(offset)}`, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`Lỗi ${res.status}`);
          return res.json() as Promise<PublicJobListResult>;
        })
        .then((data) => {
          if (cancelled) return;
          const incoming = (Array.isArray(data.jobs) ? data.jobs : []).map(enrichJob);
          setBestJobsData({
            jobs: incoming,
            total: typeof data.total === 'number' ? data.total : 0,
            bestJobsNextOffset: typeof data.nextOffset === 'number' ? data.nextOffset : null,
          });
          setFacets(data.facets ?? EMPTY_FACETS);
          setOverview(data.overview ?? EMPTY_OVERVIEW);
        })
        .catch((e) => {
          if (cancelled) return;
          console.warn('bootstrapBestJobs error:', e instanceof Error ? e.message : e);
        })
        .finally(() => {
          if (!cancelled) setBestJobsLoading(false);
        });
    },
    [],
  );

  // bootstrapBestJobs chạy khi mount và khi bestJobsOffset đổi
  useEffect(() => {
    bootstrapBestJobs(bestJobsOffset);
  }, [bestJobsOffset, bootstrapBestJobs]);

  // DEC-01 / STEP-02: Hero form submit → navigate tới /viec-lam với offset: 0
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildListingHref({ q: keyword.trim() || undefined, area: area || undefined, shift: shift || undefined, offset: 0 }));
  }

  // DEC-01 / STEP-02: applyArea → navigate tới /viec-lam với area mới, giữ keyword/shift hiện tại, offset: 0
  function applyArea(value: string) {
    setArea(value);
    router.push(buildListingHref({ q: keyword.trim() || undefined, area: value || undefined, shift: shift || undefined, offset: 0 }));
  }

  function handleApply(job: EnrichedJob) {
    setApplyJob(job);
    setSuccessCode('');
  }

  function handleApplySuccess(code: string) {
    if (applyJob) setAppliedIds((prev) => [...prev, applyJob.id]);
    setApplyJob(null);
    setSuccessCode(code);
  }

  // Y10.4/UI04g: Bỏ tabs — chỉ dùng 1 data set + pagination
  function handleBestJobsPrev() {
    setBestJobsOffset((prev) => Math.max(0, prev - BEST_JOBS_PAGE_SIZE));
  }

  function handleBestJobsNext() {
    setBestJobsOffset((prev) => prev + BEST_JOBS_PAGE_SIZE);
  }

  // Featured source — newest first, topPaid fallback (per RQ-03 / RQ-11)
  const featuredSource = overview.newest[0] ?? overview.topPaid[0] ?? null;
  const featuredJobs = (overview.newest.length > 0 ? overview.newest : overview.topPaid)
    .slice(0, 3)
    .map(enrichJob);

  // Recruiting project source — newest fallback topPaid, max 4 (per RQ-05 / DEC-04)
  // Y10.8+: hiển thị 8 dự án (2 hàng × 4 cột).
  const recruitingSource = (overview.newest.length > 0 ? overview.newest : overview.topPaid).slice(0, 8);
  const recruitingProjects: EnrichedJob[] = recruitingSource.map(enrichJob);

  // Areas for image card — pull top 8 from facet areaCounts (Y10.8+: 2 hàng × 4 cột).
  const areasForCards: Array<{ name: string; count: number }> = facets.areas.slice(0, 8).map((name) => {
    const found = overview.areaCounts.find((entry) => entry.value === name);
    return { name, count: found?.count ?? 0 };
  });

  return (
    <main id="hrp-main" tabIndex={-1} className="flex w-full flex-col items-stretch gap-0">
      <Hero>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 text-on-primary">
          <p className="font-label text-label-md font-bold uppercase tracking-widest text-secondary-fixed">
            Cùng tìm kiếm
          </p>
          <h1 className="font-head text-headline-xl font-bold leading-tight text-on-primary">
            Công việc mơ ước của bạn
          </h1>
          <p className="font-body text-body-lg text-on-primary/90">
            {overview.totals.jobs > 0
              ? `Đang tuyển ${overview.totals.jobs} việc làm tại ${overview.totals.areas} khu vực. Ứng tuyển không cần tài khoản.`
              : 'Việc làm theo ca, ứng tuyển không cần tài khoản.'}
          </p>
          <form
            onSubmit={handleSearch}
            /* STEP-06/RQ-11/DEC-17: A16 search card wrapper đổi từ glass sang nền trắng */
            className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-white p-3 sm:flex-row sm:items-end sm:p-4"
            data-testid="hero-search-card"
          >
            <div className="flex-1">
              <label
                htmlFor="hrp-hero-keyword"
                /* STEP-06/AC-11/AC-13: Label text-white → text-on-surface (WCAG AA contrast) */
                className="mb-1 block font-label text-label-sm font-bold text-on-surface"
              >
                Từ khóa
              </label>
              <input
                id="hrp-hero-keyword"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tên công việc, vị trí..."
                /* STEP-06/RQ-11/DEC-17: Input → bg-white border-outline-variant */
                className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface text-sm min-h-11 placeholder:text-on-surface-variant"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="hrp-hero-area"
                /* STEP-06/AC-11/AC-13: Label text-white → text-on-surface */
                className="mb-1 block font-label text-label-sm font-bold text-on-surface"
              >
                Khu vực
              </label>
              <select
                id="hrp-hero-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                /* STEP-06/RQ-11/DEC-17: Select → bg-white border-outline-variant */
                className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface text-sm min-h-11"
              >
                <option value="">Tất cả khu vực</option>
                {facets.areas.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="hrp-hero-salary"
                /* DEC-08: salary disabled — Mức lương — sắp có */
                className="mb-1 block font-label text-label-sm font-bold text-on-surface"
              >
                Mức lương — sắp có
              </label>
              <select
                id="hrp-hero-salary"
                disabled
                aria-disabled="true"
                className="hrp-focus w-full cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-on-surface-variant text-sm opacity-70 min-h-11"
              >
                <option value="">Mọi mức lương</option>
              </select>
            </div>
            <button
              type="submit"
              aria-busy={false}
              className="hrp-btn-primary hrp-focus nav-item-lift min-h-11 rounded-lg px-6 font-label text-label-md font-semibold whitespace-nowrap"
            >
              Tìm việc
            </button>
          </form>
        </div>
        <div className="hidden w-full max-w-md flex-shrink-0 lg:block">
          <RecruitmentHighlight />
        </div>
      </Hero>

      {/* Y10.8: BestJobs section — 3 cột × 3 hàng (9 jobs/page) */}
      <BestJobsSection
        jobs={bestJobsData.jobs}
        total={bestJobsData.total}
        pageSize={BEST_JOBS_PAGE_SIZE}
        offset={bestJobsOffset}
        nextOffset={bestJobsData.bestJobsNextOffset}
        onPrev={handleBestJobsPrev}
        onNext={handleBestJobsNext}
        /* DEC-06: dùng job.slug, KHÔNG job.id */
        buildHref={(jobSlug) => publicJobDetailPath(jobSlug)}
        /* DEC-04: prop chain chốt — page.tsx closure → BestJobsSection → FeaturedJobCard */
        onApply={handleApply}
      />

      <AreasSection areas={areasForCards} onPick={applyArea} />

      {/* ─── UI04d Task D v1.9 (11/09/2026): Đưa HrpIntro (Về HRP) lên trên RecruitingProjects.
          Thu hẹp nội dung (3 values thay vì 4, 1 paragraph thay vì 2, đổi ảnh industrial-location-04 — không trùng ReferralStrip).
          Bỏ NewestJobs (trùng BestJobs), PartnerStrip ("Đối tác"), MobileBanner ("Trải nghiệm di động").
          Đưa ReferralStrip ("Chương trình Cộng tác viên") lên trên News ("Tin tức & Cẩm nang"). */}
      <HrpIntroSection content={demoHrpIntro} />

      <RecruitingProjectsSection
        jobs={recruitingProjects.map((job) => ({
          id: job.id,
          title: job.title,
          availableSlots: job.availableSlots,
        }))}
        buildHref={(jobId) => publicJobDetailPath(jobId)}
      />

      <ReferralStrip />

      <NewsSection content={demoNewsSection} />

      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {successCode && <SuccessModal code={successCode} onClose={() => setSuccessCode('')} />}
    </main>
  );
}
