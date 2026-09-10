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
}

function enrichJob(job: PublicJobDto): EnrichedJob {
  const { salaryMinVnd, salaryMaxVnd, urgency, postedAt } = job;
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

  // DEC-05 / STEP-04: BestJobs tab state + fetch (separate from sentinel homepage search)
  const [bestJobsTab, setBestJobsTab] = useState<'all' | 'urgent'>('all');
  const [bestJobsOffset, setBestJobsOffset] = useState(0);
  const [bestJobsData, setBestJobsData] = useState<{ jobs: EnrichedJob[]; total: number; bestJobsNextOffset: number | null }>({
    jobs: [],
    total: 0,
    bestJobsNextOffset: null,
  });
  // STEP-04/STEP-05: URGENT tab separate data state + offset (race-safe: tab-specific)
  const [bestJobsUrgentOffset, setBestJobsUrgentOffset] = useState(0);
  const [bestJobsUrgentData, setBestJobsUrgentData] = useState<{ jobs: EnrichedJob[]; total: number; bestJobsNextOffset: number | null }>({
    jobs: [],
    total: 0,
    bestJobsNextOffset: null,
  });
  const [bestJobsLoading, setBestJobsLoading] = useState(false);

  // DEC-02 / STEP-02: bootstrapBestJobs — DUY NHẤT, chỉ tải page BestJobs + set bestJobsData + facets + overview.
  // KHÔNG có mode append, KHÔNG jobs state, KHÔNG nextOffset (chỉ bestJobsOffset), KHÔNG generation/sentinel/observer.
  const bootstrapBestJobs = useCallback(
    (offset: number) => {
      if (bestJobsTab !== 'all') return;

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
    [bestJobsTab],
  );

  // bootstrapBestJobs chạy khi mount và khi bestJobsOffset đổi
  useEffect(() => {
    bootstrapBestJobs(bestJobsOffset);
  }, [bestJobsOffset, bootstrapBestJobs]);

  // STEP-04/STEP-05: bootstrapBestJobsUrgent — URGENT tab fetch; separate from 'all' tab; does NOT set facets/overview (RQ-07)
  const bootstrapBestJobsUrgent = useCallback(
    (offset: number) => {
      if (bestJobsTab !== 'urgent') return;

      let cancelled = false;
      setBestJobsLoading(true);

      fetch(`/api/jobs?urgency=URGENT&${buildBestJobsQuery(offset)}`, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`Lỗi ${res.status}`);
          return res.json() as Promise<PublicJobListResult>;
        })
        .then((data) => {
          if (cancelled) return;
          const incoming = (Array.isArray(data.jobs) ? data.jobs : []).map(enrichJob);
          // RQ-07: URGENT response does NOT update global facets/overview — only 'all' tab does
          setBestJobsUrgentData({
            jobs: incoming,
            total: typeof data.total === 'number' ? data.total : 0,
            bestJobsNextOffset: typeof data.nextOffset === 'number' ? data.nextOffset : null,
          });
        })
        .catch((e) => {
          if (cancelled) return;
          console.warn('bootstrapBestJobsUrgent error:', e instanceof Error ? e.message : e);
        })
        .finally(() => {
          if (!cancelled) setBestJobsLoading(false);
        });
    },
    [bestJobsTab],
  );

  // bootstrapBestJobsUrgent runs when urgent offset changes
  useEffect(() => {
    bootstrapBestJobsUrgent(bestJobsUrgentOffset);
  }, [bestJobsUrgentOffset, bootstrapBestJobsUrgent]);

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

  // BestJobs tab handlers
  function handleBestJobsTabChange(tab: 'all' | 'urgent') {
    setBestJobsTab(tab);
    // STEP-05: race-safe — reset offset on tab change
    if (tab === 'all') {
      setBestJobsOffset(0);
    } else {
      setBestJobsUrgentOffset(0);
    }
  }

  function handleBestJobsPrev() {
    if (bestJobsTab === 'all') {
      setBestJobsOffset((prev) => Math.max(0, prev - BEST_JOBS_PAGE_SIZE));
    } else {
      setBestJobsUrgentOffset((prev) => Math.max(0, prev - BEST_JOBS_PAGE_SIZE));
    }
  }

  function handleBestJobsNext() {
    if (bestJobsTab === 'all') {
      setBestJobsOffset((prev) => prev + BEST_JOBS_PAGE_SIZE);
    } else {
      setBestJobsUrgentOffset((prev) => prev + BEST_JOBS_PAGE_SIZE);
    }
  }

  // Featured source — newest first, topPaid fallback (per RQ-03 / RQ-11)
  const featuredSource = overview.newest[0] ?? overview.topPaid[0] ?? null;
  const featuredJobs = (overview.newest.length > 0 ? overview.newest : overview.topPaid)
    .slice(0, 3)
    .map(enrichJob);

  // Recruiting project source — newest fallback topPaid, max 4 (per RQ-05 / DEC-04)
  const recruitingSource = (overview.newest.length > 0 ? overview.newest : overview.topPaid).slice(0, 4);
  const recruitingProjects: EnrichedJob[] = recruitingSource.map(enrichJob);

  // Areas for image card — pull top 4 from facet areaCounts (per RQ-04)
  const areasForCards: Array<{ name: string; count: number }> = facets.areas.slice(0, 4).map((name) => {
    const found = overview.areaCounts.find((entry) => entry.value === name);
    return { name, count: found?.count ?? 0 };
  });

  // STEP-04: Determine BestJobs display data based on active tab — live data, no fixture
  const bestJobsDisplayJobs = bestJobsTab === 'all' ? bestJobsData.jobs : bestJobsUrgentData.jobs;
  const bestJobsDisplayTotal =
    bestJobsTab === 'all' ? bestJobsData.total : bestJobsUrgentData.total;
  const bestJobsDisplayNextOffset = bestJobsTab === 'all' ? bestJobsData.bestJobsNextOffset : bestJobsUrgentData.bestJobsNextOffset;

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

      {/* STEP-04 / STEP-05 / STEP-06: BestJobs tab + pagination — live URGENT data */}
      <BestJobsSection
        jobs={bestJobsDisplayJobs}
        total={bestJobsDisplayTotal}
        pageSize={BEST_JOBS_PAGE_SIZE}
        offset={bestJobsTab === 'all' ? bestJobsOffset : bestJobsUrgentOffset}
        nextOffset={bestJobsDisplayNextOffset}
        tab={bestJobsTab}
        onTabChange={handleBestJobsTabChange}
        onPrev={handleBestJobsPrev}
        onNext={handleBestJobsNext}
        /* DEC-06: dùng job.slug, KHÔNG job.id */
        buildHref={(jobSlug) => publicJobDetailPath(jobSlug)}
        /* DEC-04: prop chain chốt — page.tsx closure → BestJobsSection → FeaturedJobCard */
        onApply={handleApply}
      />

      <AreasSection areas={areasForCards} onPick={applyArea} />

      <RecruitingProjectsSection
        jobs={recruitingProjects.map((job) => ({
          id: job.id,
          title: job.title,
          availableSlots: job.availableSlots,
        }))}
        buildHref={(jobId) => publicJobDetailPath(jobId)}
      />

      <ReferralStrip />

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
