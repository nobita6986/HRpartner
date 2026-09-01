'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
// go-live-12 / RQ-09: hai modal đã ra khỏi file này để `/viec-lam/{code}` dùng lại đúng một bản.
// `CANONICAL_ORIGIN` đi theo `SuccessModal` — trang này không còn tham chiếu nào.
import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
// go-live-12 / RQ-10 / DEC-01: đường dẫn trang chi tiết lấy từ ĐÚNG một nguồn, không nội suy tay.
import { publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';

// ─── UI-adapter: projection công khai → props của card ───────────────────────

/**
 * go-live-05 / RQ-02, RQ-11 — card đọc ĐÚNG kiểu DTO của service, không đọc một `interface ApiJob`
 * tự khai cục bộ.
 *
 * Trước đây file này khai `interface ApiJob` riêng rồi cast `res.json()` vào đó, nên đổi tên hay bỏ
 * một khóa trong projection công khai vẫn typecheck xanh và chỉ vỡ trên trình duyệt (bài học
 * `hrp-tsc-not-a-barrier-dto-rename`). Buộc vào kiểu thật thì tsc trở thành hàng rào.
 *
 * `import type` bị xoá hoàn toàn ở bước transpile, nên ràng buộc này KHÔNG kéo Prisma vào bundle
 * client — điều đó được đo lại bằng grep trên `.next/static/chunks/*.js` ở STEP-09.
 */
import type { PublicJobDto, PublicJobFacets, PublicJobListResult } from '@/src/domains/job-board/public.service';

/** go-live-05 / DEC-09 — ba bộ lọc CÓ cột canonical đứng sau. Không nhóm nào là trang trí. */
interface JobSearchFilters {
  keyword: string;
  area: string;
  shift: string;
}

const EMPTY_FILTERS: JobSearchFilters = { keyword: '', area: '', shift: '' };
const EMPTY_FACETS: PublicJobFacets = { areas: [], shifts: [] };

/** Nhỏ hơn `total` thường gặp để load-more là đường đi THẬT, không phải nhánh chết. */
const PAGE_SIZE = 12;

interface EnrichedJob {
  id: string;
  slug: string;
  title: string;
  /** DEC-02/RQ-03: HRPartner là bên tuyển dụng; danh tính Client KHÔNG công khai ở task này. */
  recruiter: string;
  icon: string;
  positions: string[];
  locations: string[];
  shifts: string[];
  badge: string | null;
  badgeType: string | null;
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

/** DEC-04: card in tối đa ba giá trị rồi `+N`. Rỗng thì nói "đang cập nhật", không bịa một giá trị. */
const CARD_SUMMARY_LIMIT = 3;

function summaryLabel(values: string[], fallback: string): string {
  const shown = values.slice(0, CARD_SUMMARY_LIMIT);
  if (shown.length === 0) return fallback;
  const rest = values.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} +${rest}` : shown.join(' · ');
}

function enrichJob(job: PublicJobDto): EnrichedJob {
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
    recruiter: 'Tuyển dụng qua HRPartner',
    icon,
    // RQ-02/RQ-04: ba mảng này là summary THẬT của các slot còn hiệu lực, do service tính. Card
    // không suy ra gì thêm và không đắp giá trị mặc định nào lên chỗ dữ liệu trống.
    positions: job.positionTitles,
    locations: job.locations,
    shifts: job.shifts,
    badge: isFull ? 'Đã tuyển đủ' : isUrgent ? 'Tuyển gấp' : null,
    badgeType: isFull ? 'full' : isUrgent ? 'urgent' : null,
    remaining: job.availableSlots,
  };
}

/** RQ-08: append phải khử trùng theo `job.id` — retry hoặc trang chồng nhau không được nhân bản card. */
function dedupeById(list: EnrichedJob[]): EnrichedJob[] {
  const seen = new Set<string>();
  return list.filter((job) => (seen.has(job.id) ? false : (seen.add(job.id), true)));
}

/** DEC-09: query dựng bằng `URLSearchParams`; `offset` luôn tường minh nên submit reset về 0. */
function buildQuery(filters: JobSearchFilters, offset: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  const q = filters.keyword.trim();
  if (q) params.set('q', q);
  if (filters.area) params.set('area', filters.area);
  if (filters.shift) params.set('shift', filters.shift);
  return params.toString();
}

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
      className="hrp-card nav-item-lift border border-outline-variant/50 rounded-xl flex flex-col gap-4 relative h-full"
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
          <span aria-hidden="true" className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-primary-container)' }}>
            {job.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-on-surface)' }}>
              <Link
                href={detailHref}
                className="relative z-10 hrp-focus rounded hover:underline"
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
            {job.recruiter}
          </p>
          {job.remaining > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              Còn {job.remaining} vị trí
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hrp-pill flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">badge</span>
          {summaryLabel(job.positions, 'Vị trí đang cập nhật')}
        </span>
        <span className="hrp-pill-location flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">location_on</span>
          {summaryLabel(job.locations, 'Địa điểm đang cập nhật')}
        </span>
        <span className="hrp-pill flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">schedule</span>
          {summaryLabel(job.shifts, 'Thời gian đang cập nhật')}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40 mt-auto">
        <button
          onClick={() => onApply(job)}
          disabled={isApplied || isFull}
          className={
            'relative z-10 hrp-focus font-semibold px-6 min-h-11 rounded-lg ' +
            (isFull ? 'hrp-btn-muted' : isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift')
          }
        >
          {isFull ? 'Đã đủ chỉ tiêu' : isApplied ? 'Đã ứng tuyển' : 'Ứng tuyển'}
        </button>
        <button
          aria-label="Lưu việc"
          className="relative z-10 hrp-focus w-11 h-11 rounded-full border border-outline-variant flex items-center justify-center cursor-pointer transition-[border-color] hover:border-error"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">favorite</span>
        </button>
      </div>
    </div>
  );
}

// ─── Facet-backed filter control ─────────────────────────────────────────────

/**
 * go-live-05 / RQ-07, DEC-08 — một nhóm filter CHỈ được vẽ khi facet của nó có dữ liệu.
 *
 * `options` đến từ `facets` của API, vốn tính trên toàn tập public hợp lệ TRƯỚC khi áp bộ lọc của
 * người dùng, nên danh sách không co lại theo chính lựa chọn vừa rồi. `value=''` là "tất cả": nó
 * không phải một giá trị dữ liệu, nên không có nhãn nào trong DOM hứa một thứ mà DB không có.
 */
function FacetSelect({
  icon,
  heading,
  allLabel,
  value,
  options,
  onChange,
}: {
  icon: string;
  heading: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
        <span aria-hidden="true" className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary-dark)' }}>{icon}</span>
        {heading}
      </h3>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={heading}
          className="hrp-field hrp-focus w-full appearance-none border border-outline-variant min-h-11 py-2.5 pl-4 pr-10 rounded-lg cursor-pointer"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span aria-hidden="true" className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }}>
          expand_more
        </span>
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

  // Filter state — giá trị `''` nghĩa là "không lọc", nên không tồn tại giá trị giả nào trong DOM.
  const [keyword, setKeyword] = useState('');
  const [area, setArea] = useState('');
  const [shift, setShift] = useState('');
  // RQ-08: load-more phải dùng ĐÚNG bộ lọc của trang đang xem, không đọc state đang gõ dở.
  const [appliedFilters, setAppliedFilters] = useState<JobSearchFilters>(EMPTY_FILTERS);

  // DEC-08: nguồn duy nhất của dropdown là facets từ API, tính trên toàn tập public hợp lệ.
  const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);

  // Apply state
  const [applyJob, setApplyJob] = useState<EnrichedJob | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [successCode, setSuccessCode] = useState('');

  // Pagination state — `nextOffset` từ response THẬT; `null` nghĩa là hết dòng (RQ-08/RQ-17).
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // DEC-09: hai lớp chống race. `generationRef` để response cũ về muộn không ghi đè kết quả mới;
  // `AbortController` để huỷ luôn request cũ thay vì để nó chạy hết rồi mới bỏ.
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // Nút "Thử lại" phải lặp lại ĐÚNG lần gọi vừa thất bại, kể cả khi đó là một lần load-more.
  const lastAttemptRef = useRef<{ filters: JobSearchFilters; offset: number; mode: 'replace' | 'append' }>({
    filters: EMPTY_FILTERS,
    offset: 0,
    mode: 'replace',
  });

  const runQuery = useCallback(async (filters: JobSearchFilters, offset: number, mode: 'replace' | 'append') => {
    const generation = ++generationRef.current;
    lastAttemptRef.current = { filters, offset, mode };
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (mode === 'append') setLoadingMore(true);
    else setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`/api/jobs?${buildQuery(filters, offset)}`, { cache: 'no-store', signal: controller.signal });
      // OPS-06A / RQ-07: browse cũng có limiter phân tán ⇒ hiển thị trạng thái
      // thân thiện cho 429/503 thay vì "Lỗi <status>".
      if (res.status === 429) throw new Error('Bạn tải trang quá nhanh. Vui lòng thử lại sau ít phút.');
      if (res.status === 503) throw new Error('Hệ thống đang tạm thời quá tải. Vui lòng thử lại sau ít phút.');
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const data = (await res.json()) as PublicJobListResult;
      if (generation !== generationRef.current) return;
      const incoming = (Array.isArray(data.jobs) ? data.jobs : []).map(enrichJob);
      setJobs((prev) => (mode === 'append' ? dedupeById([...prev, ...incoming]) : incoming));
      setFacets(data.facets ?? EMPTY_FACETS);
      setTotal(typeof data.total === 'number' ? data.total : incoming.length);
      setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : null);
      setAppliedFilters(filters);
    } catch (e) {
      // Request bị chính ta huỷ không phải lỗi của người dùng, và không được ghi gì lên UI.
      if (controller.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
      if (generation !== generationRef.current) return;
      // RQ-09: KHÔNG xoá `jobs`. Refetch lỗi thì kết quả đang xem vẫn còn, kèm băng lỗi và nút thử lại.
      setFetchError(e instanceof Error ? e.message : 'Không thể tải danh sách việc làm');
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void runQuery(EMPTY_FILTERS, 0, 'replace');
  }, [runQuery]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || loadingMore || loading) return;
    void runQuery(appliedFilters, nextOffset, 'append');
  }, [appliedFilters, loading, loadingMore, nextOffset, runQuery]);

  // RQ-08/RQ-17: sentinel gọi ĐÚNG một request thật với `nextOffset` của response trước, thay cho
  // `setTimeout(…, 800)` chỉ tắt spinner rồi không tải gì.
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

  const currentFilters = (): JobSearchFilters => ({ keyword, area, shift });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      // DEC-09: submit luôn quay về `offset = 0` — trang 3 của bộ lọc cũ không được trộn vào kết quả mới.
      await runQuery(currentFilters(), 0, 'replace');
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

  // RQ-09 — ba trạng thái tách rời nhau, không nhóm nào che nhóm nào:
  //   * skeleton chỉ ở lần tải ĐẦU (chưa có gì trên màn hình), không ở mỗi lần refetch;
  //   * empty state chỉ khi đã đọc được API và tập kết quả thật sự rỗng;
  //   * lưới còn dữ liệu thì luôn hiển thị, kể cả khi lần gọi mới nhất lỗi.
  const showSkeleton = loading && jobs.length === 0 && !fetchError;
  const showEmptyState = !loading && !fetchError && jobs.length === 0;

  return (
    <div id="hrp-main" tabIndex={-1} className="w-full max-w-[1600px] mx-auto px-6 md:px-[5%] py-8 flex flex-col lg:flex-row gap-8">

      {/* Left Sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <form
          onSubmit={handleSearch}
          className="hrp-panel rounded-xl border border-outline-variant/50 shadow-sm flex flex-col p-6 space-y-5"
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
          <div>
            <label
              htmlFor="hrp-keyword"
              className="text-sm font-semibold mb-2 flex items-center gap-2"
              style={{ color: 'var(--color-on-surface)' }}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary-dark)' }}>
                search
              </span>
              Từ khóa tìm kiếm
            </label>
            <input
              id="hrp-keyword"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên công việc, vị trí..."
              className="hrp-field hrp-focus w-full px-4 py-3 min-h-11 rounded-lg border"
            />
          </div>

          {/* Hai nhóm còn lại lấy hết lựa chọn từ `facets` — không còn danh sách tỉnh/ca gắn cứng.
              Hai nhóm control cũ đã bị loại vì không có cột canonical chống lưng (DEC-07, DEC-13). */}
          <FacetSelect
            icon="location_on"
            heading="Vị trí"
            allLabel="Tất cả tỉnh/thành"
            value={area}
            options={facets.areas}
            onChange={setArea}
          />

          <FacetSelect
            icon="schedule"
            heading="Ca làm việc"
            allLabel="Tất cả ca làm việc"
            value={shift}
            options={facets.shifts}
            onChange={setShift}
          />

          <div className="pt-4 mt-2 border-t border-outline-variant/50">
            <button
              type="submit"
              disabled={searching}
              aria-busy={searching}
              className="hrp-btn-primary hrp-focus nav-item-lift w-full py-3 min-h-11 rounded-lg font-semibold flex justify-center items-center gap-2 disabled:cursor-wait disabled:opacity-70"
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
              {/* RQ-05: `total` là số của API sau lifecycle và sau filter, không phải độ dài trang đang xem. */}
              {jobs.length < total
                ? `Đang xem ${jobs.length} trong ${total} kết quả`
                : `Tìm thấy ${total} kết quả`}
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
              onClick={() => {
                const { filters, offset, mode } = lastAttemptRef.current;
                void runQuery(filters, offset, mode);
              }}
              className="hrp-btn-primary hrp-focus nav-item-lift px-4 min-h-11 rounded-lg font-medium"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {showSkeleton && (
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

        {/* Empty state */}
        {showEmptyState && (
          <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
            <span aria-hidden="true" className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'var(--color-outline)' }}>
              work_off
            </span>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-on-surface)' }}>
              Không tìm thấy việc làm phù hợp
            </p>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              Thử thay đổi từ khóa hoặc bộ lọc
            </p>
          </div>
        )}

        {/* Job Grid */}
        {jobs.length > 0 && (
          <>
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

            {/* Load more / end state — RQ-08/RQ-17: mọi nhánh ở đây phản ánh `nextOffset` THẬT của
                response. Sentinel tự tải khi cuộn tới, và nút bên dưới là đường dùng bàn phím cho
                cùng một hành động — người dùng không có chuột không bị chặn khỏi trang sau. */}
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
              ) : nextOffset === null ? (
                <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Đã xem toàn bộ danh sách
                </p>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="hrp-btn-ghost hrp-focus px-5 min-h-11 rounded-lg font-semibold border"
                >
                  Xem thêm việc làm
                </button>
              )}
            </div>
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
