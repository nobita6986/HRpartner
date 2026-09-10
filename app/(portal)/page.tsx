'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import Link from 'next/link';
import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
import { AreasSection } from '@/src/domains/job-board/components/landing/areas-section';
import { BestJobsSection } from '@/src/domains/job-board/components/landing/best-jobs-section';
import { Hero } from '@/src/domains/job-board/components/landing/hero';
import { RecruitmentHighlight } from '@/src/domains/job-board/components/landing/recruitment-highlight';
import { RecruitingProjectsSection } from '@/src/domains/job-board/components/landing/recruiting-projects-section';
import { ReferralStrip } from '@/src/domains/job-board/components/landing/referral-strip';
import { publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';
import { BEST_JOBS_URGENT_PREVIEW } from '@/src/domains/job-board/fixtures/best-jobs-urgent-preview';
import type {
  PublicJobDto,
  PublicJobFacets,
  PublicJobListResult,
  PublicJobOverview,
} from '@/src/domains/job-board/public.service';

// ─── UI-adapter: projection công khai → props của card ───────────────────────

interface JobSearchFilters {
  keyword: string;
  area: string;
  shift: string;
}

const EMPTY_FILTERS: JobSearchFilters = { keyword: '', area: '', shift: '' };
const EMPTY_FACETS: PublicJobFacets = { areas: [], shifts: [] };
const EMPTY_OVERVIEW: PublicJobOverview = {
  totals: { jobs: 0, slots: 0, areas: 0 },
  areaCounts: [],
  shiftCounts: [],
  newest: [],
  topPaid: [],
};
const PAGE_SIZE = 12;

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
}

const VND_FORMAT = new Intl.NumberFormat('vi-VN');

function salaryLabel(min: number | null, max: number | null): string {
  if (min === null) return 'Lương thương lượng';
  const from = VND_FORMAT.format(min);
  if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
  return `${from} đ/giờ`;
}

function enrichJob(job: PublicJobDto): EnrichedJob {
  const { salaryMinVnd, salaryMaxVnd, urgency } = job;
  return {
    id: job.id,
    slug: job.slug ?? job.id,
    title: job.title,
    locations: job.locations,
    badgeType: urgency === 'URGENT' ? 'urgent' : urgency === 'CLOSING' ? 'closing' : null,
    salaryMinVnd,
    salaryMaxVnd,
    availableSlots: job.availableSlots,
  };
}

function dedupeById(list: EnrichedJob[]): EnrichedJob[] {
  const seen = new Set<string>();
  return list.filter((job) => (seen.has(job.id) ? false : (seen.add(job.id), true)));
}

function buildQuery(filters: JobSearchFilters, offset: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  const q = filters.keyword.trim();
  if (q) params.set('q', q);
  if (filters.area) params.set('area', filters.area);
  if (filters.shift) params.set('shift', filters.shift);
  return params.toString();
}

// ─── BestJobs fetch query (limit=9, offset via state) ───────────────────────

function buildBestJobsQuery(offset: number): string {
  const params = new URLSearchParams({ limit: String(BEST_JOBS_PAGE_SIZE), offset: String(offset) });
  return params.toString();
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<EnrichedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState('');
  const [shift, setShift] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);
  const [overview, setOverview] = useState<PublicJobOverview>(EMPTY_OVERVIEW);
  const [applyJob, setApplyJob] = useState<EnrichedJob | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [successCode, setSuccessCode] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // DEC-05 / STEP-04: BestJobs tab state + fetch (separate from sentinel homepage search)
  const [bestJobsTab, setBestJobsTab] = useState<'all' | 'urgent'>('all');
  const [bestJobsOffset, setBestJobsOffset] = useState(0);
  const [bestJobsData, setBestJobsData] = useState<{ jobs: EnrichedJob[]; total: number; nextOffset: number | null }>({
    jobs: [],
    total: 0,
    nextOffset: null,
  });
  const [bestJobsLoading, setBestJobsLoading] = useState(false);

  const runQuery = useCallback(
    async (filters: JobSearchFilters, offset: number, mode: 'replace' | 'append') => {
      const generation = ++generationRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (mode === 'append') {
        // load-more spinner handled by sentinel UI below
      } else {
        setLoading(true);
      }
      setFetchError('');
      try {
        const res = await fetch(`/api/jobs?${buildQuery(filters, offset)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.status === 429)
          throw new Error('Bạn tải trang quá nhanh. Vui lòng thử lại sau ít phút.');
        if (res.status === 503)
          throw new Error('Hệ thống đang tạm thời quá tải. Vui lòng thử lại sau ít phút.');
        if (!res.ok) throw new Error(`Lỗi ${res.status}`);
        const data = (await res.json()) as PublicJobListResult;
        if (generation !== generationRef.current) return;
        const incoming = (Array.isArray(data.jobs) ? data.jobs : []).map(enrichJob);
        setJobs((prev) => (mode === 'append' ? dedupeById([...prev, ...incoming]) : incoming));
        setFacets(data.facets ?? EMPTY_FACETS);
        setOverview(data.overview ?? EMPTY_OVERVIEW);
        setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : null);
      } catch (e) {
        if (controller.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        if (generation !== generationRef.current) return;
        setFetchError(e instanceof Error ? e.message : 'Không thể tải danh sách việc làm');
      } finally {
        if (generation === generationRef.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runQuery(EMPTY_FILTERS, 0, 'replace');
  }, [runQuery]);

  const loadMore = useCallback(() => {
    if (nextOffset === null) return;
    void runQuery({ keyword, area, shift }, nextOffset, 'append');
  }, [keyword, area, shift, nextOffset, runQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // DEC-05 / STEP-04: Fetch BestJobs separately for tab 'all'.
  // Tab 'urgent' uses BEST_JOBS_URGENT_PREVIEW fixture.
  useEffect(() => {
    if (bestJobsTab !== 'all') return;

    let cancelled = false;
    setBestJobsLoading(true);

    fetch(`/api/jobs?${buildBestJobsQuery(bestJobsOffset)}`, { cache: 'no-store' })
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
          nextOffset: typeof data.nextOffset === 'number' ? data.nextOffset : null,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        // Error is not displayed in this scope; state not stored (out of scope)
        console.warn('BestJobs fetch error:', e instanceof Error ? e.message : e);
      })
      .finally(() => {
        if (!cancelled) setBestJobsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bestJobsTab, bestJobsOffset]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      await runQuery({ keyword, area, shift }, 0, 'replace');
    } finally {
      setSearching(false);
    }
  }

  function applyArea(value: string) {
    setArea(value);
    void runQuery({ keyword, area: value, shift }, 0, 'replace');
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
    if (tab === 'all') {
      // Reset offset and refetch
      setBestJobsOffset(0);
    }
  }

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
  const recruitingSource = (overview.newest.length > 0 ? overview.newest : overview.topPaid).slice(0, 4);
  const recruitingProjects: EnrichedJob[] = recruitingSource.map(enrichJob);

  // Areas for image card — pull top 4 from facet areaCounts (per RQ-04)
  const areasForCards: Array<{ name: string; count: number }> = facets.areas.slice(0, 4).map((name) => {
    const found = overview.areaCounts.find((entry) => entry.value === name);
    return { name, count: found?.count ?? 0 };
  });

  // DEC-05: Determine BestJobs display data based on active tab
  const bestJobsDisplayJobs = bestJobsTab === 'all' ? bestJobsData.jobs : BEST_JOBS_URGENT_PREVIEW;
  const bestJobsDisplayTotal =
    bestJobsTab === 'all' ? bestJobsData.total : BEST_JOBS_URGENT_PREVIEW.length;
  const bestJobsDisplayNextOffset = bestJobsTab === 'all' ? bestJobsData.nextOffset : null;

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
                className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface min-h-11 placeholder:text-on-surface-variant"
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
                className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface min-h-11"
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
                /* STEP-06/AC-11/AC-13: Label text-white → text-on-surface */
                className="mb-1 block font-label text-label-sm font-bold text-on-surface"
              >
                Mức lương
              </label>
              <select
                id="hrp-hero-salary"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                /* STEP-06/RQ-11/DEC-17: Select → bg-white border-outline-variant */
                className="hrp-focus w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-on-surface min-h-11"
              >
                <option value="">Mọi mức lương</option>
                <option value="25000">Từ 25.000 đ/giờ</option>
                <option value="30000">Từ 30.000 đ/giờ</option>
                <option value="40000">Từ 40.000 đ/giờ</option>
                <option value="50000">Từ 50.000 đ/giờ</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={searching}
              aria-busy={searching}
              className="hrp-btn-primary hrp-focus nav-item-lift min-h-11 rounded-lg px-6 font-label text-label-md font-semibold whitespace-nowrap"
            >
              {searching ? 'Đang tìm...' : 'Tìm việc'}
            </button>
          </form>
        </div>
        <div className="hidden w-full max-w-md flex-shrink-0 lg:block">
          <RecruitmentHighlight />
        </div>
      </Hero>

      {loading && jobs.length === 0 ? (
        <section className="w-full bg-surface-container-low px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-center">
            <p className="font-body text-body-lg text-on-surface-variant">Đang tải việc làm...</p>
          </div>
        </section>
      ) : fetchError ? (
        <section className="w-full px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3">
            <p className="font-body text-body-lg text-error">{fetchError}</p>
            <button
              type="button"
              onClick={() => void runQuery({ keyword, area, shift }, 0, 'replace')}
              className="hrp-btn-primary hrp-focus min-h-11 rounded-lg px-4 py-2 font-label text-label-md font-semibold"
            >
              Thử lại
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* DEC-01 / RQ-01, RQ-02, RQ-05, RQ-06: BestJobs tab + pagination */}
          <BestJobsSection
            jobs={bestJobsDisplayJobs}
            total={bestJobsDisplayTotal}
            pageSize={BEST_JOBS_PAGE_SIZE}
            offset={bestJobsOffset}
            nextOffset={bestJobsDisplayNextOffset}
            tab={bestJobsTab}
            onTabChange={handleBestJobsTabChange}
            onPrev={handleBestJobsPrev}
            onNext={handleBestJobsNext}
            buildHref={(jobId) => publicJobDetailPath(jobId)}
            urgentPreviewBadge="Preview"
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

          {/* Inline list of all jobs (search results) — hidden behind sentinel for pagination */}
          <section
            aria-label="Danh sách việc làm"
            className="w-full bg-surface-container-low px-4 py-12 md:px-8 md:py-16"
          >
            <div className="mx-auto w-full max-w-7xl">
              <div className="mb-6 flex flex-col gap-2">
                <h2 className="font-head text-headline-lg font-bold text-on-surface">
                  Danh sách việc làm
                </h2>
                <p className="font-body text-body-md text-on-surface-variant">
                  Tổng cộng {jobs.length} việc đang hiển thị
                  {overview.totals.jobs > jobs.length && ` / ${overview.totals.jobs}`}.
                </p>
              </div>
              <ul className="grid list-none grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-card"
                  >
                    <Link
                      href={publicJobDetailPath(job.slug)}
                      className="hrp-focus block"
                    >
                      <p className="font-head text-headline-md font-bold text-on-surface">
                        {job.title}
                      </p>
                      <p className="mt-1 font-body text-body-md text-on-surface-variant">
                        {job.locations[0] ?? 'Toàn quốc'}
                      </p>
                      <p className="mt-2 font-label text-label-md font-bold text-primary-container">
                        {salaryLabel(job.salaryMinVnd, job.salaryMaxVnd)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {nextOffset !== null && (
                <div
                  ref={sentinelRef}
                  className="mt-8 flex items-center justify-center"
                  data-testid="load-more-sentinel"
                >
                  <p className="font-body text-body-md text-on-surface-variant">
                    Đang tải thêm việc làm...
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

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
