'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
// go-live-12 / RQ-09: hai modal đã ra khỏi file này để `/viec-lam/{code}` dùng lại đúng một bản.
// `CANONICAL_ORIGIN` đi theo `SuccessModal` — trang này không còn tham chiếu nào.
import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
// go-live-12 / RQ-10 / DEC-01: đường dẫn trang chi tiết lấy từ ĐÚNG một nguồn, không nội suy tay.
import { publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';

// ─── API Types ───────────────────────────────────────────────────────────────

interface ApiJob {
  id: string;
  /** PublicJobDto.slug (= project.code) — khoá của canonical apply endpoint. */
  slug: string;
  title: string;
  isPublic: boolean;
  availableSlots: number;
  location?: string | null;
  shift?: string | null;
  industry?: string;
  shiftType?: string | null;
  jobType?: string;
}

interface JobSearchFilters {
  keyword: string;
  location: string;
  industry: string;
  workTypes: string[];
  jobTypes: string[];
}

// ─── UI-adapter: enrich API shape → full card props ─────────────────────────

interface EnrichedJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  icon: string;
  location: string;
  schedule: string;
  badge: string | null;
  badgeType: string | null;
  filled: string | null;
  remaining: number;
}

const FALLBACK_ICON = 'work';

const ICONS_BY_KEYWORD: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['lắp ráp', 'linh kiện', 'assembly'], icon: 'precision_manufacturing' },
  { keywords: ['may', 'thời trang', 'sewing'], icon: 'checkroom' },
  { keywords: ['cơ khí', 'mechanics', 'máy'], icon: 'hardware' },
  { keywords: ['cnc', 'vận hành'], icon: 'build' },
  { keywords: ['kho', 'vận', 'warehouse'], icon: 'inventory_2' },
  { keywords: ['qa', 'qc', 'chất lượng'], icon: 'verified' },
  { keywords: ['điện', 'bảo trì', 'electrical'], icon: 'electrical_services' },
  { keywords: ['đóng gói', 'packaging', 'gói'], icon: 'package_2' },
];

function enrichJob(job: ApiJob): EnrichedJob {
  const lowerTitle = job.title.toLowerCase();
  const matched = ICONS_BY_KEYWORD.find(({ keywords }) =>
    keywords.some((kw) => lowerTitle.includes(kw)),
  );
  const icon = matched?.icon ?? FALLBACK_ICON;

  const isFull = job.availableSlots === 0;
  const isUrgent = job.availableSlots > 0 && job.availableSlots <= 5;

  return {
    id: job.id,
    slug: job.slug ?? job.id,
    title: job.title,
    company: 'HRP Partners',
    icon,
    location: job.location?.trim() || 'Địa điểm đang cập nhật',
    schedule: job.shift?.trim() || 'Thời gian đang cập nhật',
    badge: isFull ? 'Đã tuyển đủ' : isUrgent ? 'Tuyển gấp' : null,
    badgeType: isFull ? 'full' : isUrgent ? 'urgent' : null,
    filled: null,
    remaining: job.availableSlots,
  };
}

// ─── Static filter options ────────────────────────────────────────────────────

const LOCATIONS = ['Tất cả tỉnh/thành', 'Bắc Ninh', 'Bắc Giang', 'Hà Nội', 'Hải Phòng', 'Hưng Yên', 'Vĩnh Phúc'];
const INDUSTRIES = ['Tất cả ngành nghề', 'Công nghiệp chế tạo', 'May mặc', 'Kho vận', 'Điện tử', 'Thực phẩm'];
const WORK_TYPES = [
  { id: 'ca_ngay', label: 'Ca ngày' },
  { id: 'ca_dem', label: 'Ca đêm' },
  { id: 'xoay_ca', label: 'Xoay ca' },
];
const JOB_TYPES = [
  { id: 'toan_thoi_gian', label: 'Toàn thời gian' },
  { id: 'ban_thoi_gian', label: 'Bán thời gian' },
  { id: 'thoi_vu', label: 'Thời vụ' },
];

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onApply,
  isApplied,
}: {
  job: EnrichedJob;
  onApply: (job: EnrichedJob) => void;
  isApplied: boolean;
}) {
  const isFull = job.badgeType === 'full';
  // go-live-12 / RQ-10 / DEC-03: card điều hướng tới trang chi tiết bằng LINK THẬT, không bằng
  // `onClick` + `router.push`: giữ được middle-click, ctrl-click, "mở tab mới" và crawler đọc được.
  // Tiêu đề là link có thể focus (đường dùng bàn phím), phần phủ `absolute inset-0` chỉ mở rộng
  // vùng bấm bằng chuột nên bị ẩn khỏi cây trợ năng để không đọc trùng cùng một đích. Hai nút được
  // nâng `relative z-10` lên trên phần phủ — chúng là SIBLING của phần phủ, không lồng trong nó,
  // nên bấm nút không bao giờ chạm link, và không cần `stopPropagation` để chặn điều hướng.
  const detailHref = publicJobDetailPath(job.slug);

  return (
    <div
      className="bg-surface border border-outline-variant/50 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 relative h-full p-4"
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: 'var(--color-primary-container)' }}
      />
      <Link
        href={detailHref}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex items-start gap-4 pt-2">
        <div
          className="w-12 h-12 rounded-lg border border-outline-variant/30 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-surface-container-low)' }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-primary-container)' }}>
            {job.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-on-surface)' }}>
              <Link
                href={detailHref}
                className="relative z-10 rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {job.title}
              </Link>
            </h3>
            {job.badge && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={
                  job.badgeType === 'urgent'
                    ? { color: 'var(--color-error)', backgroundColor: 'var(--color-error-container)' }
                    : { color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container-high)' }
                }
              >
                {job.badge}
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
            {job.company}
          </p>
          {job.remaining > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              Còn {job.remaining} vị trí
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container)' }}
        >
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {job.location}
        </span>
        <span
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container)' }}
        >
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {job.schedule}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40 mt-auto">
        <button
          onClick={() => onApply(job)}
          disabled={isApplied || isFull}
          className="relative z-10 font-semibold px-6 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={
            isFull
              ? { backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)', cursor: 'not-allowed' }
              : isApplied
                ? { backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)', cursor: 'default' }
                : { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }
          }
        >
          {isFull ? 'Đã đủ chỉ tiêu' : isApplied ? 'Đã ứng tuyển' : 'Ứng tuyển'}
        </button>
        <button
          aria-label="Lưu việc"
          className="relative z-10 w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center transition-colors hover:border-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          <span className="material-symbols-outlined text-[18px]">favorite</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<EnrichedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searching, setSearching] = useState(false);

  // Filter state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);

  // Apply state
  const [applyJob, setApplyJob] = useState<EnrichedJob | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [successCode, setSuccessCode] = useState('');

  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (filters?: JobSearchFilters) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      const q = filters?.keyword.trim();
      if (q) params.set('q', q);
      if (filters?.location && filters.location !== LOCATIONS[0]) params.set('area', filters.location);
      if (filters?.industry && filters.industry !== INDUSTRIES[0]) params.set('industry', filters.industry);
      for (const shiftType of filters?.workTypes ?? []) params.append('shiftType', shiftType);
      for (const jobType of filters?.jobTypes ?? []) params.append('jobType', jobType);

      const res = await fetch(`/api/jobs?${params.toString()}`, { cache: 'no-store' });
      // OPS-06A / RQ-07: browse cũng có limiter phân tán ⇒ hiển thị trạng thái
      // thân thiện cho 429/503 thay vì "Lỗi <status>".
      if (res.status === 429) throw new Error('Bạn tải trang quá nhanh. Vui lòng thử lại sau ít phút.');
      if (res.status === 503) throw new Error('Hệ thống đang tạm thời quá tải. Vui lòng thử lại sau ít phút.');
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const data = await res.json();
      const apiJobs: ApiJob[] = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(apiJobs.map(enrichJob));
      setHasMore(false); // API doesn't support pagination yet
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Không thể tải danh sách việc làm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          setTimeout(() => setLoadingMore(false), 800);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const toggleCheckbox = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      await fetchJobs({ keyword, location, industry, workTypes, jobTypes });
    } finally {
      setSearching(false);
    }
  }

  function handleApply(job: ReturnType<typeof enrichJob>) {
    setApplyJob(job);
    setSuccessCode('');
  }

  function handleApplySuccess(code: string) {
    if (applyJob) setAppliedIds((prev) => [...prev, applyJob.id]);
    setApplyJob(null);
    setSuccessCode(code);
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 md:px-[5%] py-8 flex flex-col lg:flex-row gap-8">

      {/* Left Sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <form
          onSubmit={handleSearch}
          className="bg-surface rounded-xl border border-outline-variant/50 shadow-sm flex flex-col p-6 space-y-5"
        >
          <div className="mb-2">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              Bộ lọc tìm kiếm
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
              Tìm kiếm việc làm phù hợp
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl" style={{ color: 'var(--color-on-surface-variant)' }}>
              search
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên công việc, vị trí..."
              aria-label="Từ khóa tìm kiếm"
              className="w-full pl-10 pr-4 py-3 rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--color-outline-variant)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-on-surface)',
              }}
            />
          </div>

          {/* Vị trí */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)' }}>location_on</span>
              Vị trí
            </h3>
            <div className="relative">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Tỉnh/thành"
                className="w-full appearance-none border border-outline-variant text-on-surface py-2.5 pl-4 pr-10 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }}>
                expand_more
              </span>
            </div>
          </div>

          {/* Ngành nghề */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)' }}>work</span>
              Ngành nghề
            </h3>
            <div className="relative">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Ngành nghề"
                className="w-full appearance-none border border-outline-variant py-2.5 pl-4 pr-10 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }}>
                expand_more
              </span>
            </div>
          </div>

          {/* Ca làm việc */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)' }}>schedule</span>
              Ca làm việc
            </h3>
            <div className="space-y-2">
              {WORK_TYPES.map((wt) => (
                <label key={wt.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={workTypes.includes(wt.id)}
                    onChange={() => toggleCheckbox(wt.id, workTypes, setWorkTypes)}
                    className="w-5 h-5 rounded border-outline-variant transition-colors cursor-pointer"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span className="text-sm transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {wt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Loại công việc */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)' }}>category</span>
              Loại công việc
            </h3>
            <div className="space-y-2">
              {JOB_TYPES.map((jt) => (
                <label key={jt.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(jt.id)}
                    onChange={() => toggleCheckbox(jt.id, jobTypes, setJobTypes)}
                    className="w-5 h-5 rounded border-outline-variant transition-colors cursor-pointer"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span className="text-sm transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {jt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-outline-variant/50">
            <button
              type="submit"
              disabled={searching}
              aria-busy={searching}
              className="w-full py-3 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2 disabled:cursor-wait disabled:opacity-70"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {searching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tìm...
                </>
              ) : (
                'Tìm kiếm'
              )}
            </button>
          </div>
        </form>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Việc làm nổi bật
          </h1>
          {!loading && (
            <span className="text-sm whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
              Tìm thấy {jobs.length} kết quả
            </span>
          )}
        </div>

        {/* Error state */}
        {fetchError && (
          <div
            className="rounded-xl p-6 text-center border"
            style={{ backgroundColor: 'var(--color-error-container)', borderColor: 'var(--color-outline-variant)' }}
          >
            <p className="mb-3" style={{ color: 'var(--color-on-error-container)' }}>
              {fetchError}
            </p>
            <button
              onClick={() => void fetchJobs({ keyword, location, industry, workTypes, jobTypes })}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !fetchError && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-outline-variant/50 p-4 animate-pulse"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-low)' }} />
                  <div className="flex-1 space-y-2 pt-2">
                    <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--color-surface-container)' }} />
                    <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--color-surface-container)' }} />
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="h-5 w-24 rounded-full" style={{ backgroundColor: 'var(--color-surface-container)' }} />
                  <div className="h-5 w-20 rounded-full" style={{ backgroundColor: 'var(--color-surface-container)' }} />
                </div>
                <div className="h-9 rounded-lg w-1/3" style={{ backgroundColor: 'var(--color-surface-container)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Job Grid */}
        {!loading && !fetchError && (
          <>
            {jobs.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'var(--color-outline)' }}>
                  work_off
                </span>
                <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-on-surface)' }}>
                  Không tìm thấy việc làm phù hợp
                </p>
                <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Thử thay đổi từ khóa hoặc bộ lọc
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApply={handleApply}
                    isApplied={appliedIds.includes(job.id)}
                  />
                ))}
              </div>
            )}

            {/* Load more / end state */}
            {!loading && !fetchError && jobs.length > 0 && (
              <div className="flex flex-col items-center justify-center py-6 gap-3 w-full" ref={sentinelRef}>
                {loadingMore ? (
                  <>
                    <div
                      className="w-8 h-8 border-4 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(242, 101, 34, 0.3)', borderTopColor: 'var(--color-primary)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Đang tải thêm việc làm...
                    </p>
                  </>
                ) : !hasMore ? (
                  <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Đã xem toàn bộ danh sách
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Success Modal */}
      {successCode && (
        <SuccessModal code={successCode} onClose={() => setSuccessCode('')} />
      )}
    </div>
  );
}
