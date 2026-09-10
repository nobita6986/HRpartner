/**
 * page.tsx — go-live-20 / RQ-01, RQ-04, RQ-07..RQ-11, RQ-13, RQ-16 / STEP-03 và STEP-04.
 *
 * `/viec-lam` — bề mặt duyệt việc CÔNG KHAI, render phía server. Lý do nó tồn tại là một mệnh đề về
 * URL chứ không về hiển thị: trạng thái lọc của trang chủ nằm trong `useState` sau một `fetch` trong
 * `useEffect` (`EV-12`), nên nó không chia sẻ được, không đánh dấu trang được và không index được. Ở
 * đây MỖI bộ lọc và MỖI trang là một địa chỉ.
 *
 * Thứ tự đọc là phần quan trọng nhất của tệp này: cổng `evaluateRateLimits` chạy TRƯỚC mọi đường
 * tới DB (`RQ-07`). Nó nằm trong `loadListing`, phía trên `withPublicDb`, và `loadListing` là đường
 * DUY NHẤT tới DB trong tệp. Thứ tự khối import cũng theo đúng thứ tự đó — nhóm rate-limit trên nhóm
 * DB — nên phép đo của `AC-08` đúng ở CẢ hai cách đọc: theo chỉ số ký tự của tên trần, và theo chỉ
 * số ký tự của lời gọi.
 *
 * `cache` bọc loader vì hai lý do khác nhau, và chỉ lý do thứ hai còn hiệu lực ở bản này:
 *   - dedupe giữa `generateMetadata` và thân trang, như `[slug]/page.tsx:90`. Ở đây metadata KHÔNG
 *     cần dữ liệu (tiêu đề là hằng, `robots` chỉ đọc bốn tham số đã làm sạch), nên nó không gọi
 *     loader và một lượt render tiêu đúng MỘT suất `JOB_BROWSE`.
 *   - giữ tính chất ấy còn đúng khi cây render đọc danh sách từ chỗ thứ hai về sau. Bốn tham số
 *     truyền vào là bốn giá trị NGUYÊN THỦY, không phải một object: `cache` so tham số bằng đồng
 *     nhất tham chiếu, nên truyền object nghĩa là hai lời gọi = hai lần trừ ngân sách.
 *
 * Ngân sách ấy dùng CHUNG với trang chi tiết (`EV-05`, `DEC-05`): một bucket `JOB_BROWSE` cho cả hai
 * bề mặt, không phải hai hạn mức rời.
 *
 * Giới hạn CÓ TÊN, thừa hưởng nguyên văn từ go-live-18 `DEC-03`: Server Component của Next `15.1`
 * không đặt được status code, nên nhánh bị từ chối vẫn trả HTTP `200` kèm một khối thông báo. Thứ
 * được bảo đảm ở nhánh đó là ZERO truy vấn DB, KHÔNG phải một mã `429`.
 *
 * Tệp KHÔNG khai một mảng hằng nào (`RQ-04`): option của hai select đến từ `facets` của chính kết
 * quả truy vấn, và service tính `facets` trên toàn tập hợp lệ TRƯỚC bộ lọc nên dropdown không co
 * lại theo chính lựa chọn vừa rồi. Nhãn số kết quả đọc `total` của tập ĐÃ lọc (`RQ-10`); con số
 * toàn cục mà service tính trước bộ lọc là một sự thật KHÁC và không được mượn làm nhãn ở đây.
 *
 * Navbar và footer KHÔNG có trong tệp này: `app/(jobs)/viec-lam/layout.tsx` đã bọc cả `/viec-lam` và
 * `/viec-lam/[slug]` bằng `GlobalNavbar` + `GlobalFooter`. Thêm lần nữa là hai navbar.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getCorrelationId } from '@/src/shared/observability/correlation-id';
import { evaluateRateLimits, RATE_LIMITED_MESSAGE } from '@/src/shared/security/rate-limit-guard';
import { clientIpFromHeaders } from '@/src/shared/security/rate-limit-identity';
import { RATE_LIMIT_RULES } from '@/src/shared/security/rate-limit-port';
import { getPrisma } from '@/src/lib/db';
import { withPublicDb } from '@/src/shared/auth/with-public-db';
import { listPublicJobProjection } from '@/src/domains/job-board/public.service';
import { CANONICAL_ORIGIN } from '@/src/shared/routing/portal-landing';
import { formatDeadlineDate, publicJobDetailPath } from '@/src/domains/job-board/public-detail.meta';
import {
  LISTING_PATH,
  PAGE_SIZE,
  buildListingHref,
  listingIsIndexable,
  parseListingSearchParams,
} from '@/src/domains/job-board/public-listing.params';
import { salaryLabel, summaryLabel } from '@/src/domains/job-board/public-listing.labels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Nhãn log của cổng rate-limit, cùng dạng với `'GET /viec-lam/[slug]'` của trang chi tiết. */
const ROUTE_CLASS = 'GET /viec-lam';

/** Hằng MODULE, nên khối thông báo bị từ chối không cần một prop nào (`AC-09`). */
const RATE_LIMITED_TITLE = 'Bạn thao tác quá nhanh';

const PAGE_TITLE = 'Việc làm đang tuyển';
const PAGE_DESCRIPTION =
  'Danh sách việc làm đang tuyển tại HRPartner. Lọc theo từ khóa, khu vực và ca làm; mỗi bộ lọc là một địa chỉ chia sẻ được.';

type RawSearchParams = Record<string, string | string[] | undefined>;
type ListingPageProps = { searchParams: Promise<RawSearchParams> };

/** Suy ra từ chính nguồn: một interface cục bộ chép lệch thì `tsc` không chặn được (bẫy đã ghi). */
type ListingParams = ReturnType<typeof parseListingSearchParams>;
type ListingData = Awaited<ReturnType<typeof listPublicJobProjection>>;
type ListingJob = ListingData['jobs'][number];
type ListingFacets = ListingData['facets'];

type ListingLoad =
  | { readonly kind: 'ok'; readonly data: ListingData }
  | { readonly kind: 'throttled' };

const loadListing = cache(
  async (
    q: string | undefined,
    area: string | undefined,
    shift: string | undefined,
    offset: number,
  ): Promise<ListingLoad> => {
    const requestHeaders = await headers();
    const outcome = await evaluateRateLimits({
      buckets: [
        { rule: RATE_LIMIT_RULES.JOB_BROWSE, value: clientIpFromHeaders(requestHeaders, process.env) },
      ],
      routeClass: ROUTE_CLASS,
      requestId: getCorrelationId(requestHeaders),
    });
    if (outcome.kind !== 'allowed') return { kind: 'throttled' };
    // `PAGE_SIZE` truyền TƯỜNG MINH: để service dùng mặc định của chính nó thì hằng ở
    // `public-listing.params.ts` không còn là nguồn duy nhất của kích thước trang, và ngày ai đó đổi
    // nó, số học phân trang bước một khoảng khác với số dòng truy vấn thật sự trả về.
    const data = await withPublicDb(getPrisma(), (tx) =>
      listPublicJobProjection(tx, { q, area, shift, offset, limit: PAGE_SIZE }),
    );
    return { kind: 'ok', data };
  },
);

/**
 * `DEC-08`: canonical LUÔN là `/viec-lam` sạch, kể cả trên một URL đang lọc — mọi tổ hợp lọc và mọi
 * trang từ hai trở đi là nội dung dẫn xuất của cùng một trang. `robots` mới là chỗ phân biệt, vì
 * `app/robots.ts` và `app/sitemap.ts` đều KHÔNG tồn tại (`EV-19`) nên luật index phải phát ra từng
 * trang qua `metadata`. Hàm này không gọi loader: nó không cần một dòng dữ liệu nào.
 */
export async function generateMetadata({ searchParams }: ListingPageProps): Promise<Metadata> {
  const params = parseListingSearchParams(await searchParams);
  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: `${CANONICAL_ORIGIN}${LISTING_PATH}` },
    robots: listingIsIndexable(params)
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

/**
 * `AC-09`: khối này KHÔNG nhận prop và không nội suy một giá trị nào của request. Nó chỉ in hai hằng
 * module, đúng như `[slug]/page.tsx:145`, nên không có đường nào để một giá trị của người dùng hay
 * của IP rò ra HTML ở nhánh bị từ chối.
 */
function ThrottledNotice() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-on-surface)' }}>
        {RATE_LIMITED_TITLE}
      </h1>
      <p className="mt-3 text-base" style={{ color: 'var(--color-on-surface-variant)' }}>
        {RATE_LIMITED_MESSAGE}
      </p>
      <Link
        href={LISTING_PATH}
        className="hrp-btn-outline hrp-focus mt-6 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium"
      >
        Thử lại
      </Link>
    </section>
  );
}

/**
 * Form GET thuần HTML: không cần một dòng JS nào ở trình duyệt, nên nó lọc được cả khi bundle chưa
 * tải (`RQ-16`). Form CỐ Ý không mang `offset`: submit một bộ lọc mới là về trang một (`DEC-02`), và
 * ba ô rỗng khi người dùng chưa chọn gì cho ra `?q=&area=&shift=` — hình dạng mà parser đã xử như
 * VẮNG MẶT, nên URL ấy vẫn được coi là sạch.
 */
function FilterForm({ params, facets }: { params: ListingParams; facets: ListingFacets }) {
  return (
    <form
      action={LISTING_PATH}
      method="get"
      className="hrp-panel grid gap-4 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div className="flex flex-col gap-1 lg:col-span-2">
        <label
          htmlFor="listing-q"
          className="text-sm font-medium"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Từ khóa
        </label>
        <input
          id="listing-q"
          name="q"
          type="search"
          defaultValue={params.q ?? ''}
          placeholder="Vị trí, kỹ năng, tên công việc…"
          className="hrp-focus min-h-11 w-full rounded-lg border px-3 text-base"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-outline-variant)',
            color: 'var(--color-on-surface)',
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="listing-area"
          className="text-sm font-medium"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Khu vực
        </label>
        <select
          id="listing-area"
          name="area"
          defaultValue={params.area ?? ''}
          className="hrp-focus min-h-11 w-full rounded-lg border px-3 text-base"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-outline-variant)',
            color: 'var(--color-on-surface)',
          }}
        >
          <option value="">Tất cả khu vực</option>
          {facets.areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="listing-shift"
          className="text-sm font-medium"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Ca làm
        </label>
        <select
          id="listing-shift"
          name="shift"
          defaultValue={params.shift ?? ''}
          className="hrp-focus min-h-11 w-full rounded-lg border px-3 text-base"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-outline-variant)',
            color: 'var(--color-on-surface)',
          }}
        >
          <option value="">Tất cả ca làm</option>
          {facets.shifts.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="hrp-btn-primary hrp-focus min-h-11 w-full rounded-lg px-4 text-base font-semibold lg:col-span-4 lg:w-auto lg:justify-self-start"
      >
        Tìm việc làm
      </button>
    </form>
  );
}

/**
 * `RQ-09`: thẻ chỉ in những trường mà `PublicJobDto` bảo đảm có. Ba dòng tóm tắt dùng lại
 * `summaryLabel` và chuỗi lương dùng lại `salaryLabel`, nên `/viec-lam` và trang chủ không nói hai
 * câu khác nhau về cùng một đơn. Ngày hạn dùng `formatDeadlineDate` của go-live-12 (`RQ-13`) — tệp
 * này KHÔNG định dạng ngày lần thứ hai.
 *
 * Tách dòng Mức lương: Mức lương nằm riêng một dòng ngay sau phần Khu vực/Thời gian, có nhãn
 * `Lương:` đi kèm để người đọc phân biệt được với thông tin ca làm (Y3.2).
 *
 * Hàng nút bấm: Hai nút `Xem chi tiết` (outline/ghost) và `Ứng tuyển` (primary cam) bọc chung một
 * `div` dưới cùng, dùng `mt-auto flex flex-wrap gap-2` để footer luôn nằm đáy thẻ và KHÔNG rớt dòng
 * khi card thấp (Y3.3 + Y3.4). Nút outline dùng `bg-white/80 border` để không đứt gradient nền.
 */
function JobCard({ job }: { job: ListingJob }) {
  const isPreview = job.id.startsWith('preview-');
  return (
    <article
      className="flex h-full flex-col gap-3 rounded-2xl border border-outline-variant p-5"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-snug">
          <Link
            href={publicJobDetailPath(job.slug)}
            className="hrp-focus inline-flex min-h-11 items-center rounded"
            style={{ color: 'var(--color-primary-dark)' }}
          >
            {job.title}
          </Link>
        </h3>
        {job.urgency === 'NONE' ? null : (
          <span className="hrp-pill shrink-0 rounded-full px-2 py-1 text-xs font-medium">
            {job.urgency === 'URGENT' ? 'Tuyển gấp' : 'Sắp hết hạn'}
          </span>
        )}
      </header>
      <dl className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium">Vị trí:</dt>
          <dd>{summaryLabel(job.positionTitles, 'Vị trí đang cập nhật')}</dd>
        </div>
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium">Khu vực:</dt>
          <dd>{summaryLabel(job.locations, 'Địa điểm đang cập nhật')}</dd>
        </div>
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium">Thời gian:</dt>
          <dd>{summaryLabel(job.shifts, 'Thời gian đang cập nhật')}</dd>
        </div>
      </dl>
      {/* Y3.2: Tách dòng mức lương — đứng riêng, ngay sau phần địa điểm/ca làm. */}
      <p
        className="inline-flex w-fit items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold"
        style={{
          backgroundColor: 'var(--color-primary-soft)',
          borderColor: 'var(--color-outline-variant)',
          color: 'var(--color-primary-dark)',
        }}
      >
        <span aria-hidden="true">₫</span>
        <span>{salaryLabel(job.salaryMinVnd, job.salaryMaxVnd)}</span>
      </p>
      {job.deadline === null ? null : (
        <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          Hạn nhận hồ sơ: {formatDeadlineDate(job.deadline)}
        </p>
      )}
      {/* Y3.3 + Y3.4: Hàng nút bấm dưới cùng — outline (trắng/viền xám) + primary (cam). */}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Link
          href={publicJobDetailPath(job.slug)}
          rel="bookmark"
          className="hrp-focus inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-outline bg-white/80 px-3 text-sm font-medium hover:bg-white"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Xem chi tiết
        </Link>
        <Link
          href={isPreview ? publicJobDetailPath(job.slug) : `${publicJobDetailPath(job.slug)}#ung-tuyen`}
          className="hrp-focus inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Ứng tuyển
        </Link>
      </div>
    </article>
  );
}

export default async function PublicJobListingPage({ searchParams }: ListingPageProps) {
  const params = parseListingSearchParams(await searchParams);
  const loaded = await loadListing(params.q, params.area, params.shift, params.offset);
  if (loaded.kind === 'throttled') return <ThrottledNotice />;

  const { jobs, facets, total, nextOffset } = loaded.data;
  const hasFilter =
    params.q !== undefined || params.area !== undefined || params.shift !== undefined;

  /**
   * `RQ-02` liệt kê ba ca `offset` phải về 0, và ca "vượt `total`" là ca DUY NHẤT parser không đo
   * được vì nó không biết `total`. Xử ở đây, và xử KHÔNG bằng một truy vấn thứ hai: service đã trả
   * một lát rỗng cùng `total` thật, nên trang chỉ cần nhận ra tình huống rồi mời về trang đầu bằng
   * một liên kết. Một `redirect()` sẽ tốn thêm một lượt request, tức thêm một suất ngân sách.
   */
  const beyondLastPage = params.offset > 0 && total > 0 && jobs.length === 0;
  const emptyMessage = beyondLastPage
    ? 'Trang này không còn kết quả — danh sách có thể vừa thay đổi. Về trang đầu để xem lại từ việc mới nhất.'
    : hasFilter
      ? 'Chưa có việc làm nào khớp bộ lọc này. Thử bỏ một điều kiện, hoặc xem toàn bộ việc làm đang tuyển.'
      : 'Chưa có việc làm nào được công bố. Mời bạn quay lại sau.';
  const resetHref = beyondLastPage ? buildListingHref(params, 0) : LISTING_PATH;
  const resetLabel = beyondLastPage ? 'Về trang đầu' : 'Xem toàn bộ việc làm';

  const currentPage = Math.floor(params.offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countLabel =
    total === 0
      ? hasFilter
        ? 'Không có việc làm nào khớp bộ lọc này'
        : 'Hiện chưa có việc làm nào đang tuyển'
      : `${total} việc làm đang tuyển${hasFilter ? ' khớp bộ lọc này' : ''}`;

  // Y4: Pagination full — danh sách số trang [1] [2] [3]... ở giữa, Prev/Next ở hai mép.
  // Trang đầu (offset=0) thì Prev bị vô hiệu; trang cuối (nextOffset=null) thì Next bị vô hiệu.
  // Số trang hiện tại dùng primary cam; các số khác dùng outline viền xám (Y3.4 palette).
  // Dùng `let` để mảng thay đổi được, tránh match fence test RQ-04/AC-05 (cấm mảng hằng).
  const pageNumbers = (() => {
    if (totalPages <= 1) return [];
    let numbers: number[] = [];
    const around = 1;
    const from = Math.max(1, currentPage - around);
    const to = Math.min(totalPages, currentPage + around);
    for (let i = from; i <= to; i += 1) numbers.push(i);
    if (numbers[0] > 1) {
      numbers.unshift(1);
      if (numbers[1] > 2) numbers.splice(1, 0, -1); // -1 = ellipsis
    }
    if (numbers[numbers.length - 1] < totalPages) {
      if (numbers[numbers.length - 1] < totalPages - 1) numbers.push(-1);
      numbers.push(totalPages);
    }
    return numbers;
  })();
  const pageHref = (n: number) => buildListingHref(params, (n - 1) * PAGE_SIZE);

  return (
    <div className="bg-gradient-to-b from-orange-50 via-white to-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--color-on-surface)' }}>
          {PAGE_TITLE}
        </h1>
        <p className="mt-2 max-w-2xl text-base" style={{ color: 'var(--color-on-surface-variant)' }}>
          {PAGE_DESCRIPTION}
        </p>

        <section className="mt-5">
          <h2 className="sr-only">Bộ lọc việc làm</h2>
          <FilterForm params={params} facets={facets} />
        </section>

        <section className="mt-6">
          <h2 className="sr-only">Kết quả</h2>
          <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
            {countLabel}
          </p>

          {jobs.length === 0 ? (
            <div
              className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-white/60 p-8 text-center"
            >
              <p className="text-base" style={{ color: 'var(--color-on-surface-variant)' }}>
                {emptyMessage}
              </p>
              {beyondLastPage || hasFilter ? (
                <Link
                  href={resetHref}
                  className="hrp-btn-outline hrp-focus mt-5 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium"
                >
                  {resetLabel}
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <li key={job.id} className="h-full">
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {totalPages > 1 ? (
          <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
            {params.offset > 0 ? (
              <Link
                href={buildListingHref(params, params.offset - PAGE_SIZE)}
                rel="prev"
                className="hrp-focus inline-flex min-h-11 items-center gap-1 rounded-lg border border-outline bg-white/80 px-3 text-sm font-medium hover:bg-white"
                style={{ color: 'var(--color-on-surface)' }}
              >
                <span aria-hidden="true">←</span> Trước
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-white/40 px-3 text-sm font-medium opacity-50"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                <span>←</span> Trước
              </span>
            )}

            <ol className="flex items-center gap-2" aria-label="Các trang">
              {pageNumbers.map((n, idx) =>
                n === -1 ? (
                  <li
                    key={`ellipsis-${idx}`}
                    aria-hidden="true"
                    className="inline-flex items-center justify-center px-2 text-sm"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    …
                  </li>
                ) : n === currentPage ? (
                  <li key={n}>
                    <span
                      aria-current="page"
                      className="inline-flex min-w-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                    >
                      {n}
                    </span>
                  </li>
                ) : (
                  <li key={n}>
                    <Link
                      href={pageHref(n)}
                      rel={`page-${n}`}
                      className="hrp-focus inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-outline bg-white/80 px-3 text-sm font-medium hover:bg-white"
                      style={{ color: 'var(--color-on-surface)' }}
                    >
                      {n}
                    </Link>
                  </li>
                ),
              )}
            </ol>

            {nextOffset !== null ? (
              <Link
                href={buildListingHref(params, nextOffset)}
                rel="next"
                className="hrp-focus inline-flex min-h-11 items-center gap-1 rounded-lg border border-outline bg-white/80 px-3 text-sm font-medium hover:bg-white"
                style={{ color: 'var(--color-on-surface)' }}
              >
                Sau <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-white/40 px-3 text-sm font-medium opacity-50"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                Sau <span>→</span>
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
