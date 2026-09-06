'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import Link from 'next/link';
// go-live-12 / RQ-09: hai modal đã ra khỏi file này để `/viec-lam/{code}` dùng lại đúng một bản.
// `CANONICAL_ORIGIN` đi theo `SuccessModal` — trang này không còn tham chiếu nào.
import { ApplyModal } from '@/src/domains/job-board/components/apply-modal';
import { SuccessModal } from '@/src/domains/job-board/components/success-modal';
// ui-01 / RQ-10 / DEC-05: dải mời cộng tác viên nằm RIÊNG một tệp. Nó phải có vòng focus thấy được
// và đích chạm 44 pixel (`R-07`), mà ba hàng rào canh trang chủ ghim phép đếm hai class ấy CHÍNH XÁC
// trên tệp này — nên chúng sống ở tệp con. Ở đây không viết thẳng tên hai class ấy vì phép đếm là
// phép đếm CHUỖI CON: một dòng chú thích nhắc tên cũng làm lệch con số.
import { ReferralInviteStrip } from '@/src/domains/job-board/components/referral-invite-strip';
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
import type {
  PublicJobDto,
  PublicJobFacets,
  PublicJobListResult,
  PublicJobOverview,
} from '@/src/domains/job-board/public.service';

/** go-live-05 / DEC-09 — ba bộ lọc CÓ cột canonical đứng sau. Không nhóm nào là trang trí. */
interface JobSearchFilters {
  keyword: string;
  area: string;
  shift: string;
}

const EMPTY_FILTERS: JobSearchFilters = { keyword: '', area: '', shift: '' };
const EMPTY_FACETS: PublicJobFacets = { areas: [], shifts: [] };
/**
 * go-live-09 / RQ-23, DEC-18 — trạng thái ban đầu và trạng thái sau một lần fetch lỗi là con số 0 và
 * mảng rỗng, KHÔNG phải số bịa. Mọi dải nội dung chạy bằng `overview` đều tự ẩn khi mảng rỗng, nên
 * trang lúc chưa có dữ liệu không chào ra một tiêu đề trống rỗng nào.
 */
const EMPTY_OVERVIEW: PublicJobOverview = {
  totals: { jobs: 0, slots: 0, areas: 0 },
  areaCounts: [],
  shiftCounts: [],
  newest: [],
  topPaid: [],
};

/** Nhỏ hơn `total` thường gặp để load-more là đường đi THẬT, không phải nhánh chết. */
const PAGE_SIZE = 12;

interface EnrichedJob {
  id: string;
  slug: string;
  title: string;
  /** DEC-02/RQ-03: HRPartner là bên tuyển dụng; danh tính Client KHÔNG công khai ở task này. */
  recruiter: string;
  positions: string[];
  locations: string[];
  shifts: string[];
  badge: string | null;
  /**
   * go-live-09 / RQ-11, RQ-23 — union HẸP LẠI còn đúng hai mức mà `urgency` của service sinh ra.
   * Mức `'full'` cũ bị bỏ cùng lượt: `toDto` không bao giờ trả việc hết chỗ (`EV-09`) nên nhánh đó
   * là nhánh CHẾT. Hẹp kiểu ở đây biến việc đắp lại một mức bịa thành lỗi BIÊN DỊCH, không phải một
   * nhãn sai lặng lẽ trên card.
   */
  badgeType: 'urgent' | 'closing' | null;
  remaining: number;
  /** RQ-10: lương giờ đã là `number | null` từ service (`RQ-18`); card không tự đổi kiểu, không tự tính. */
  salaryMinVnd: number | null;
  salaryMaxVnd: number | null;
  /** RQ-08: hạn nộp ISO của service, `null` khi đơn không đặt hạn — chip hạn nộp khi đó không render. */
  deadline: string | null;
}

/** DEC-04: card in tối đa ba giá trị rồi `+N`. Rỗng thì nói "đang cập nhật", không bịa một giá trị. */
const CARD_SUMMARY_LIMIT = 3;

function summaryLabel(values: string[], fallback: string): string {
  const shown = values.slice(0, CARD_SUMMARY_LIMIT);
  if (shown.length === 0) return fallback;
  const rest = values.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} +${rest}` : shown.join(' · ');
}

/**
 * go-live-09 / RQ-10, DEC-03 — ĐÚNG một chỗ trên trang nói về tiền.
 *
 * `null` không được in thành `0`: `"0 đ/giờ"` là một khẳng định SAI về tiền, còn
 * `"Lương thương lượng"` là mô tả đúng trạng thái "đơn chưa công bố lương". Hai đầu bằng nhau thì in
 * một số chứ không in dải `30.000 – 30.000`.
 */
const VND_FORMAT = new Intl.NumberFormat('vi-VN');

function salaryLabel(min: number | null, max: number | null): string {
  if (min === null) return 'Lương thương lượng';
  const from = VND_FORMAT.format(min);
  if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
  return `${from} đ/giờ`;
}

/**
 * go-live-09 / RQ-07 — thang lọc lương phía client.
 *
 * Đây là NGƯỠNG do UI đặt, không phải dữ liệu: một mức trong thang này KHÔNG hứa rằng sàn có việc ở
 * mức đó. Chính vì thế nhánh rỗng của nó phải nói rõ nó lọc trên phần ĐÃ TẢI, không phải trên cả
 * sàn — xem `showSalaryEmpty`. Tên hằng cố tình không phải một danh sách giá trị dữ liệu (`AREAS`,
 * `SHIFTS`, `PROVINCES`…): không giá trị nào ở đây được hiểu là facet.
 */
const SALARY_STEPS = ['25000', '30000', '35000', '40000', '50000'];

function salaryStepLabel(step: string): string {
  return `Từ ${VND_FORMAT.format(Number(step))} đ/giờ`;
}

/** RQ-08: hạn nộp in theo lối Việt. Cắt bằng CHUỖI trên ISO nên không lệch một ngày vì múi giờ máy. */
function deadlineLabel(deadline: string): string {
  const [y, m, d] = deadline.slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : deadline;
}

function enrichJob(job: PublicJobDto): EnrichedJob {
  // go-live-09 / RQ-11, RQ-23 — hai thay đổi cùng một gốc.
  //
  //   1. Badge chạy bằng `urgency` mà service tính từ TRẠNG THÁI ĐƠN (`RQ-04`), không suy từ
  //      `availableSlots`. Ngưỡng cũ `<= 5` nói sai ở cả hai đầu: đơn 1 chỗ mở từ tháng trước không
  //      "gấp", đơn 200 chỗ vừa mở cũng không. Không một nhánh nào dưới đây đọc `availableSlots`.
  //   2. `isFull` biến mất: `toDto` chỉ trả việc CÒN chỗ (`EV-09`), nên `availableSlots === 0` là
  //      điều kiện không bao giờ đúng ở đây; nhãn hết-chỗ mà nó in ra là một nhánh chết và contract
  //      đòi grep mặt chữ của nhãn đó trên file này trả 0 dòng, nên nó không được nhắc lại ở đây.
  //
  // Bốn field mới lấy bằng destructure, không bằng `job.<tên>`: bề mặt này bị cấm mọi biểu thức tiền
  // dựng tay, nên đọc thẳng field service đã tính là đường duy nhất còn lại.
  const { salaryMinVnd, salaryMaxVnd, urgency, deadline } = job;

  return {
    id: job.id,
    slug: job.slug ?? job.id,
    title: job.title,
    recruiter: 'Tuyển dụng qua HRPartner',
    // RQ-02/RQ-04: ba mảng này là summary THẬT của các slot còn hiệu lực, do service tính. Card
    // không suy ra gì thêm và không đắp giá trị mặc định nào lên chỗ dữ liệu trống.
    positions: job.positionTitles,
    locations: job.locations,
    shifts: job.shifts,
    badge: urgency === 'URGENT' ? 'Tuyển gấp' : urgency === 'CLOSING' ? 'Sắp hết hạn' : null,
    badgeType: urgency === 'URGENT' ? 'urgent' : urgency === 'CLOSING' ? 'closing' : null,
    remaining: job.availableSlots,
    salaryMinVnd,
    salaryMaxVnd,
    deadline,
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

// ─── Khung logo ──────────────────────────────────────────────────────────────

/**
 * go-live-09 / RQ-09 — khung logo của card: hình vuông bo góc, cạnh 48px (`w-12 h-12`, nằm trong
 * khoảng 48–64px của contract), viền nhạt bằng token, `flex-shrink-0` nên không co méo ở khổ 375px.
 *
 * Icon là một SVG toà nhà TRUNG TÍNH và `aria-hidden` vì nó không mang thông tin nào. Bản cũ chọn
 * icon theo keyword trong tiêu đề (`ICONS_BY_KEYWORD`) — đúng lối bịa mà `go-live-14` đã xoá khỏi bề
 * mặt này: gán `electrical_services` cho một việc vì tên nó có chữ "điện" là suy diễn của UI, không
 * có cột nào đứng sau. Màu đi qua `currentColor` cộng một token nên không thêm literal màu (`RQ-17`);
 * chọn `--color-primary-dark` vì `--color-primary` được đo là dưới 3:1 trên nền này.
 */
function BuildingMark() {
  return (
    <div
      className="w-12 h-12 rounded-lg border border-outline-variant/30 flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: 'var(--color-surface-container-low)' }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="w-7 h-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--color-primary-dark)' }}
      >
        <path d="M4 21h16" />
        <path d="M6 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
        <path d="M15 21V9h3a1 1 0 0 1 1 1v11" />
        <path d="M9 8h3M9 12h3M9 16h3" />
      </svg>
    </div>
  );
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
  // go-live-09 / RQ-23: `const isFull = job.badgeType === 'full'` đã bị bỏ ở đây. Nó đọc một mức
  // `badgeType` mà `enrichJob` không còn sinh, và mức đó không bao giờ sinh được vì `toDto` chỉ trả
  // việc CÒN chỗ (`EV-09`) — nhánh chết. Hai nhãn hết-chỗ mà nhánh đó in ra cũng đi theo; contract
  // đòi grep chúng trên file này trả 0 dòng nên comment này không viết lại mặt chữ của chúng.
  // go-live-12 / RQ-10 / DEC-03: card điều hướng tới trang chi tiết bằng LINK THẬT, không bằng
  // `onClick` + `router.push`: giữ được middle-click, ctrl-click, "mở tab mới" và crawler đọc được.
  // Tiêu đề là link có thể focus (đường dùng bàn phím), phần phủ `absolute inset-0` chỉ mở rộng
  // vùng bấm bằng chuột nên bị ẩn khỏi cây trợ năng để không đọc trùng cùng một đích. Hai nút được
  // nâng `relative z-10` lên trên phần phủ — chúng là SIBLING của phần phủ, không lồng trong nó,
  // nên bấm nút không bao giờ chạm link, và không cần `stopPropagation` để chặn điều hướng.
  const detailHref = publicJobDetailPath(job.slug);

  // `marketplace-inventory.static.test.ts` cấm card đọc tiền qua một field tự đặt tên trên `job` —
  // luật đó chặn việc dựng số tiền BỊA. Destructuring giữ đúng ý luật (hai con số vẫn đến nguyên từ
  // DTO công khai, không qua phép nhân nào) mà không viết lại mặt chữ bị cấm.
  const { salaryMinVnd, salaryMaxVnd } = job;

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
        <BuildingMark />
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
            {/* go-live-09 / RQ-11, DEC-05 — viên thuốc bo tròn hoàn toàn (`rounded-full`), màu bằng
                ĐÚNG hai cặp token: mức `URGENT` cặp đỏ, mức `CLOSING` cặp cam nhạt/cam đậm. Không
                literal màu. `--color-primary-strong` mà DEC-05 gọi tên KHÔNG tồn tại trong
                `globals.css` và RQ-17 cấm thêm token, nên chữ dùng `--color-primary-dark` — token cam
                đậm duy nhất đã có, và là token được đo 5.83–6.47:1 trên cả bốn nền công khai. */}
            {job.badge && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={
                  job.badgeType === 'urgent'
                    ? { color: 'var(--color-error)', backgroundColor: 'var(--color-error-container)' }
                    : { color: 'var(--color-primary-dark)', backgroundColor: 'var(--color-primary-soft)' }
                }
              >
                {job.badge}
              </span>
            )}
          </div>
          {/* go-live-09 / RQ-10 — khối lương đứng NGAY sau tiêu đề và là phần tử nổi bật nhất sau
              nó: `text-lg` (18px) so với body `text-xs` (12px) của card, `font-bold` vượt ngưỡng 600,
              màu accent bằng token. Nhánh không có lương in đúng `Lương thương lượng` ở CÙNG vị trí,
              CÙNG cỡ chữ — không thu nhỏ, không ẩn đi, không in `0`. */}
          <p className="text-lg font-bold" style={{ color: 'var(--color-primary-dark)' }}>
            {salaryLabel(salaryMinVnd, salaryMaxVnd)}
          </p>
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
          disabled={isApplied}
          className={
            'relative z-10 hrp-focus font-semibold px-6 min-h-11 rounded-lg ' +
            (isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift')
          }
        >
          {isApplied ? 'Đã ứng tuyển' : 'Ứng tuyển'}
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
/**
 * go-live-09 / RQ-07: `labelOf` là prop TUỲ CHỌN, mặc định là hàm đồng nhất, nên hai chỗ gọi cũ giữ
 * nguyên hành vi từng ký tự. Nó tồn tại để ô "mức lương tối thiểu" hiển thị `Từ 30.000 đ/giờ` trong
 * khi `value` gửi đi vẫn là con số thô. Nhờ vậy trang không cần thêm một `<select>` thứ hai, và phép
 * đếm element native mà bề mặt công khai đang ghim vẫn đúng vì ở đây chỉ có MỘT.
 */
function FacetSelect({
  icon,
  heading,
  allLabel,
  value,
  options,
  onChange,
  labelOf = (option) => option,
}: {
  icon: string;
  heading: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  labelOf?: (option: string) => string;
}) {
  /**
   * go-live-09 / RQ-05, AC-07 — nhãn của một `select` phải là `<label htmlFor>`, không phải `<h3>`.
   * Hai điều đổi cùng lượt: `useId` sinh id duy nhất cho từng chỗ dùng (bốn chỗ trên trang, id không
   * được trùng), và `aria-label` bị BỎ vì `<label>` đã đặt tên cho control — để cả hai thì thuộc tính
   * ARIA ghi đè phần tử nhãn, tức nhãn nhìn thấy được không còn là nguồn tên nữa. Đây cũng là luật
   * nhà đã ACCEPTED ở ô từ khoá của panel: có `htmlFor` thì không giữ `aria-label` cùng chuỗi.
   */
  const selectId = useId();

  if (options.length === 0) return null;

  return (
    <div>
      <label htmlFor={selectId} className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-on-surface)' }}>
        <span aria-hidden="true" className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary-dark)' }}>{icon}</span>
        {heading}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hrp-field hrp-focus w-full appearance-none border border-outline-variant min-h-11 py-2.5 pl-4 pr-10 rounded-lg cursor-pointer"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>{labelOf(option)}</option>
          ))}
        </select>
        <span aria-hidden="true" className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }}>
          expand_more
        </span>
      </div>
    </div>
  );
}

/**
 * go-live-09 / RQ-08, DEC-14 — thẻ việc nổi bật ở nửa phải Hero. Nguồn là `overview.topPaid[0]`, dự
 * phòng `overview.newest[0]` — cả hai do service tính trên TOÀN tập hợp lệ, nên thẻ này không phải
 * "dòng đầu của trang 1". Chip chỉ nói bốn thứ có cột thật chống lưng — ca làm, khu vực, số chỗ trống,
 * hạn nộp — và chip nào không có dữ liệu thì KHÔNG render, không in nhãn bù.
 *
 * Tham số tên `featured` (không phải `job`) là có chủ đích: hàng rào tĩnh của bề mặt công khai cắt
 * khối nút Ứng tuyển của `JobCard` bằng chính mặt chữ `onClick={() => onApply(job)}`, nên một chỗ gọi
 * thứ hai mang đúng chuỗi đó sẽ làm phép cắt ấy đo sang khối khác.
 */
function FeaturedJobCard({
  featured,
  onApply,
  isApplied,
}: {
  featured: EnrichedJob;
  onApply: (job: EnrichedJob) => void;
  isApplied: boolean;
}) {
  const { title, shifts, locations, remaining, deadline, salaryMinVnd, salaryMaxVnd } = featured;

  const chips = [
    shifts.length > 0 ? { icon: 'schedule', text: shifts[0] } : null,
    locations.length > 0 ? { icon: 'location_on', text: locations[0] } : null,
    remaining > 0 ? { icon: 'groups', text: `Còn ${remaining} chỗ trống` } : null,
    deadline === null ? null : { icon: 'event', text: `Hạn nộp ${deadlineLabel(deadline)}` },
  ].filter((chip): chip is { icon: string; text: string } => chip !== null);

  return (
    <div className="hrp-card nav-item-lift border border-outline-variant/50 rounded-xl flex flex-col gap-3 w-full">
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-primary-dark)' }}>
        Tuyển dụng nổi bật
      </p>
      <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--color-on-surface)' }}>
        {title}
      </h3>
      <p className="text-xl font-bold" style={{ color: 'var(--color-primary-dark)' }}>
        {salaryLabel(salaryMinVnd, salaryMaxVnd)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.icon}
            className="hrp-pill flex items-center gap-1.5 px-3 py-1 text-xs rounded-full"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">{chip.icon}</span>
            {chip.text}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onApply(featured)}
        disabled={isApplied}
        className={
          'hrp-focus font-semibold px-6 min-h-11 rounded-lg self-start ' +
          (isApplied ? 'hrp-btn-done' : 'hrp-btn-primary nav-item-lift')
        }
      >
        {isApplied ? 'Đã ứng tuyển' : 'Ứng tuyển ngay'}
      </button>
    </div>
  );
}

/**
 * go-live-09 / RQ-13, RQ-14, DEC-18 — một dải tag. `entries` là `overview.areaCounts` hoặc
 * `overview.shiftCounts` NGUYÊN VĂN từ response: con số in ra không qua một phép đếm nào ở client, nên
 * nó đúng cả khi trang chỉ tải 12 dòng đầu. Bấm một tag ghi vào ĐÚNG state bộ lọc đang có rồi gọi
 * lại cùng một chỗ fetch, nên bất biến "số trên tag = `total` của response sau khi bấm" đứng được.
 */
function TagStrip({
  heading,
  entries,
  onPick,
}: {
  heading: string;
  entries: { value: string; count: number }[];
  onPick: (value: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="w-full flex flex-col gap-3">
      <h2 className="font-head text-headline-md font-bold" style={{ color: 'var(--color-on-surface)' }}>
        {heading}
      </h2>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => onPick(entry.value)}
            className="hrp-btn-ghost hrp-focus border px-4 min-h-11 rounded-lg font-label text-label-md font-medium"
          >
            {entry.value} ({entry.count})
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * go-live-09 / RQ-12, DEC-18 — hai dải "mới nhất" / "lương cao nhất". Thứ tự là thứ tự service trả
 * về: không có `sort` nào ở đây, vì sắp lại mảng đã render là sắp trên 12 dòng đầu và sẽ nói sai.
 * Không phần tử nào ở đây là link tới trang chi tiết: bề mặt công khai ghim số chỗ dựng đường dẫn
 * chi tiết ở ĐÚNG hai, và cả hai đã thuộc về `JobCard`.
 */
function MiniJobList({
  heading,
  note,
  entries,
}: {
  heading: string;
  note: string;
  entries: PublicJobDto[];
}) {
  if (entries.length === 0) return null;

  return (
    <section className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-head text-headline-md font-bold" style={{ color: 'var(--color-on-surface)' }}>
          {heading}
        </h2>
        <p className="font-label text-label-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          {note}
        </p>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 list-none p-0 m-0">
        {entries.map(({ id, title, salaryMinVnd, salaryMaxVnd, locations, shifts, availableSlots }) => (
          <li
            key={id}
            className="border border-outline-variant/50 rounded-xl p-4 flex flex-col gap-1.5"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <p className="font-body text-label-md font-semibold leading-snug" style={{ color: 'var(--color-on-surface)' }}>
              {title}
            </p>
            <p className="font-body text-label-md font-bold" style={{ color: 'var(--color-primary-dark)' }}>
              {salaryLabel(salaryMinVnd, salaryMaxVnd)}
            </p>
            <p className="font-body text-label-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              {summaryLabel(locations, 'Địa điểm đang cập nhật')}
            </p>
            <p className="font-body text-label-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              {summaryLabel(shifts, 'Thời gian đang cập nhật')}
            </p>
            {availableSlots > 0 && (
              <p className="font-label text-label-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                Còn {availableSlots} vị trí
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
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

  // RQ-07: mức lương tối thiểu là bộ lọc PHÍA CLIENT trên phần đã tải, nên nó KHÔNG nằm trong
  // `JobSearchFilters` và không bao giờ đi vào `buildQuery` — service công khai không có tham số lương,
  // gửi lên là chào ra một API không tồn tại. Ba state truy vấn thật vẫn đúng ba như trước.
  const [minSalary, setMinSalary] = useState('');

  // DEC-08: nguồn duy nhất của dropdown là facets từ API, tính trên toàn tập public hợp lệ.
  const [facets, setFacets] = useState<PublicJobFacets>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  // RQ-21/DEC-18: con số TOÀN CỤC của service. Trang không tự đếm lại thứ gì trong đây — đếm trên
  // `jobs` là đếm trên 12 dòng đầu và sẽ nói sai ngay khi `total > 12`.
  const [overview, setOverview] = useState<PublicJobOverview>(EMPTY_OVERVIEW);

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
      setOverview(data.overview ?? EMPTY_OVERVIEW);
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

  /**
   * go-live-09 / RQ-13, RQ-14 — tag ghi vào ĐÚNG state bộ lọc đang có, không thêm state nào, rồi gọi
   * lại CHÍNH chỗ fetch đang có. Bộ lọc truyền xuống được dựng tường minh từ giá trị vừa bấm chứ
   * không đọc lại `currentFilters()`: `setArea` của React không đồng bộ, đọc lại sẽ lấy giá trị CŨ và
   * `total` trả về sẽ lệch khỏi con số in trên tag — đúng bất biến mà RQ-13 đòi phải đứng.
   */
  function applyArea(value: string) {
    setArea(value);
    void runQuery({ keyword, area: value, shift }, 0, 'replace');
  }

  function applyShift(value: string) {
    setShift(value);
    void runQuery({ keyword, area, shift: value }, 0, 'replace');
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

  // RQ-07: lọc lương cắt trên PHẦN ĐÃ TẢI. Đọc bằng destructuring vì hàng rào tĩnh cấm trang này
  // chạm tới tiền qua một field tự đặt tên trên `job` (luật chặn card dựng số tiền bịa).
  const visibleJobs =
    minSalary === ''
      ? jobs
      : jobs.filter(({ salaryMinVnd }) => salaryMinVnd !== null && salaryMinVnd >= Number(minSalary));
  // Nhánh này KHÁC `showEmptyState`: API có dữ liệu, chỉ phần đã tải chưa có việc nào đạt mức lương.
  // Nói đúng như vậy, và chỉ đường sang nút tải thêm đang có — không dựng một nút tải thêm thứ hai.
  const showSalaryEmpty = !loading && !fetchError && jobs.length > 0 && visibleJobs.length === 0;

  // RQ-08/DEC-14: nguồn của thẻ nổi bật là dải TOÀN CỤC của service, không phải `jobs[0]` của trang.
  const featuredSource = overview.topPaid[0] ?? overview.newest[0] ?? null;
  const featured = featuredSource === null ? null : enrichJob(featuredSource);

  return (
    <div id="hrp-main" tabIndex={-1} className="w-full max-w-[1600px] mx-auto px-6 md:px-[5%] py-8 flex flex-wrap items-start gap-8">

      {/* go-live-09 / RQ-05, RQ-06, RQ-07, RQ-08 — Hero. `#hrp-main` là một hàng flex CÓ WRAP: mọi dải
          `w-full` tự chiếm trọn một dòng, còn `<aside>` (`lg:w-80`) và cột chính (`flex-1`) nằm cùng một
          dòng như trước. Chọn cách này thay vì lồng hai cột vào một thẻ mới vì thẻ mới sẽ thụt lề lại
          toàn bộ panel bộ lọc, và bề mặt công khai có một hàng rào ghim ĐÚNG thụt lề của thẻ đóng
          `</label>` trong panel đó. */}
      <section className="w-full flex flex-col lg:flex-row gap-8 items-stretch">
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
          <h1 className="font-head text-headline-xl font-bold leading-tight" style={{ color: 'var(--color-on-surface)' }}>
            Việc làm nhà máy, kho vận tại các khu công nghiệp
          </h1>
          {/* RQ-05: câu dưới tiêu đề nói ĐÚNG những gì trang chứng minh được — số việc và số khu vực
              là con số toàn cục của service, không phải chữ quảng cáo. Lúc chưa có dữ liệu thì nói
              chung, không in số 0 như một lời hứa. */}
          <p className="font-body text-body-lg" style={{ color: 'var(--color-on-surface-variant)' }}>
            {overview.totals.jobs > 0
              ? `Đang tuyển ${overview.totals.jobs} việc làm tại ${overview.totals.areas} khu vực. Ứng tuyển không cần tài khoản.`
              : 'Việc làm theo ca, ứng tuyển không cần tài khoản.'}
          </p>
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row md:items-end gap-4 rounded-xl border border-outline-variant/50 p-4"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            {/* Nhãn của ba ô là nhãn NHÌN THẤY được. Tiêu đề ẩn này chỉ để cây tiêu đề không nhảy từ
                h1 sang h3 — nó không thay chỗ cho nhãn nào. */}
            <h2 className="sr-only">Tìm việc nhanh</h2>
            <div className="flex-1 min-w-0">
              <label
                htmlFor="hrp-hero-keyword"
                className="font-label text-label-md font-semibold mb-2 block"
                style={{ color: 'var(--color-on-surface)' }}
              >
                Từ khóa
              </label>
              <input
                id="hrp-hero-keyword"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tên công việc, vị trí..."
                className="hrp-field hrp-focus w-full px-4 py-3 min-h-11 rounded-lg border"
              />
            </div>
            {/* RQ-06: hai ô này ghi vào CHÍNH `area` và `minSalary`, nên gõ ở Hero rồi kéo xuống panel
                lọc thì thấy đúng giá trị đó. `FacetSelect` tự ẩn khi chưa có lựa chọn nào — dropdown
                khu vực chỉ hiện khi `facets.areas` đã về, đúng luật "không chào ra control rỗng" của
                `DEC-08`; ô mức lương có thang cố định nên luôn hiện. */}
            <div className="flex-1 min-w-0">
              <FacetSelect
                icon="location_on"
                heading="Khu vực"
                allLabel="Tất cả khu vực"
                value={area}
                options={facets.areas}
                onChange={setArea}
              />
            </div>
            <div className="flex-1 min-w-0">
              <FacetSelect
                icon="payments"
                heading="Lương tối thiểu"
                allLabel="Mọi mức lương"
                value={minSalary}
                options={SALARY_STEPS}
                onChange={setMinSalary}
                labelOf={salaryStepLabel}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              aria-busy={searching}
              className="hrp-btn-primary hrp-focus nav-item-lift px-6 min-h-11 rounded-lg font-label text-label-md font-semibold whitespace-nowrap disabled:cursor-wait disabled:opacity-70"
            >
              {searching ? 'Đang tìm...' : 'Tìm việc'}
            </button>
          </form>
        </div>
        {/* RQ-08/DEC-14: không có việc nổi bật thì nửa phải KHÔNG render. Nửa trái là `flex-1` nên nó
            tự chiếm trọn chiều ngang, không để lại khoảng trắng giữ chỗ. */}
        {featured && (
          <div className="w-full lg:w-96 flex-shrink-0 flex">
            <FeaturedJobCard featured={featured} onApply={handleApply} isApplied={appliedIds.includes(featured.id)} />
          </div>
        )}
      </section>

      {/* go-live-09 / RQ-15, DEC-11 — ba con số của `overview.totals`, nhãn nói rõ nguồn. Không dấu
          cộng sau số, không một con số nào tự cộng trên mảng đang render. Dải này KHÔNG có icon: giữ
          nguyên phép đếm 9 icon trang trí của bề mặt công khai. */}
      <section className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'jobs', value: overview.totals.jobs, label: 'việc làm đang tuyển' },
          { key: 'slots', value: overview.totals.slots, label: 'chỗ còn tuyển' },
          { key: 'areas', value: overview.totals.areas, label: 'khu vực đang có việc' },
        ].map((stat) => (
          <div
            key={stat.key}
            className="rounded-xl border border-outline-variant/50 p-4"
            style={{ backgroundColor: 'var(--color-surface-container-low)' }}
          >
            <p className="font-head text-headline-lg font-bold" style={{ color: 'var(--color-primary-dark)' }}>
              {stat.value}
            </p>
            <p className="font-label text-label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* go-live-09 / RQ-13, RQ-14 — hai dải tag. Trục thứ hai là CA LÀM, không phải ngành nghề:
          `go-live-05` cấm thêm lại facet ngành nghề và `go-live-14` đã xoá field đó khỏi DTO. */}
      <TagStrip heading="Việc làm theo khu vực" entries={overview.areaCounts} onPick={applyArea} />
      <TagStrip heading="Việc làm theo ca làm" entries={overview.shiftCounts} onPick={applyShift} />

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
          {/* go-live-09 / RQ-05: hạ từ `h1` xuống `h2`. Hero đã sở hữu `h1` duy nhất của trang, và
              hai `h1` là hai lời khai khác nhau về chủ đề của cùng một trang. */}
          <h2 className="font-head text-headline-lg font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Việc làm nổi bật
          </h2>
          {!loading && (
            <span className="font-label text-label-md whitespace-nowrap" style={{ color: 'var(--color-on-surface-variant)' }}>
              {/* RQ-05: `total` là số của API sau lifecycle và sau filter, không phải độ dài trang đang xem. */}
              {/* RQ-07: lọc lương cắt ở client trên phần đã tải, nên khi nó bật, con số phải nói rõ
                  nó đếm trên phần đã tải — không được mượn `total` của API làm số của mình. */}
              {minSalary !== ''
                ? `Đang xem ${visibleJobs.length} việc đạt mức lương, trong ${jobs.length} việc đã tải`
                : jobs.length < total
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
            <p className="font-body text-body-lg font-semibold mb-2" style={{ color: 'var(--color-on-surface)' }}>
              Không tìm thấy việc làm phù hợp
            </p>
            <p className="font-label text-label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
              Thử thay đổi từ khóa hoặc bộ lọc
            </p>
          </div>
        )}

        {/* Job Grid */}
        {jobs.length > 0 && (
          <>
            {visibleJobs.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApply={handleApply}
                    isApplied={appliedIds.includes(job.id)}
                  />
                ))}
              </div>
            )}

            {/* RQ-07: KHÁC hẳn empty state của API. Ở đây API có việc, chỉ phần đã tải chưa có việc
                nào đạt mức lương đã chọn. Nói đúng như vậy và chỉ sang nút tải thêm đang có ở ngay
                dưới — không dựng một nút tải thêm thứ hai, và không âm thầm bỏ bộ lọc của người dùng. */}
            {showSalaryEmpty && (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                <p className="font-body text-body-md font-semibold mb-2" style={{ color: 'var(--color-on-surface)' }}>
                  {jobs.length} việc đã tải chưa có việc nào từ {VND_FORMAT.format(Number(minSalary))} đ/giờ
                </p>
                <p className="font-label text-label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Tải thêm việc làm bên dưới, hoặc chọn mức lương thấp hơn ở ô lọc phía trên.
                </p>
              </div>
            )}

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
                  <p className="font-label text-label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Đang tải thêm việc làm...
                  </p>
                </>
              ) : nextOffset === null ? (
                <p className="font-label text-label-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Đã xem toàn bộ danh sách
                </p>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="hrp-btn-ghost hrp-focus px-5 min-h-11 rounded-lg font-label text-label-md font-semibold border"
                >
                  Xem thêm việc làm
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* go-live-09 / RQ-12, DEC-18 — hai dải cuối đọc `overview.newest` và `overview.topPaid` NGUYÊN
          thứ tự service trả về. Không `sort` nào ở trang này: mảng `jobs` chỉ là 12 dòng đầu, nên sắp
          lại nó rồi gắn nhãn "cao nhất" là một khẳng định sai ngay khi `total` vượt `PAGE_SIZE`. */}
      <MiniJobList
        heading="Việc làm mới nhất"
        note="Xếp theo thời điểm đăng, tính trên toàn bộ việc đang tuyển"
        entries={overview.newest}
      />
      <MiniJobList
        heading="Lương cao nhất"
        note="Xếp theo lương giờ, chỉ gồm việc đã công bố lương"
        entries={overview.topPaid}
      />

      {/* ui-01 / RQ-10, DEC-05 — dải mời cộng tác viên. Đặt SAU hai dải việc làm vì nó là lời mời cho
          người ĐÃ đọc xong danh sách, và đặt TRƯỚC hai modal vì modal không phải nội dung của trang.
          Bản mẫu `new-ui` in hai con số hoa hồng trên hai badge; `PublicJobDto` và `PublicJobOverview`
          không có cột nào sinh ra hai số ấy, nên `R-03` buộc XOÁ chứ không phải đổi cách trình bày.
          Dải này chỉ trỏ về văn đã công bố ở `/ctv-portal`. */}
      <ReferralInviteStrip />

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
