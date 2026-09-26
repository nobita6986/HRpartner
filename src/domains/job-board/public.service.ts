import { Prisma } from '@prisma/client';

/**
 * Projection công khai của một việc làm — allow-list, deny-by-default (go-live-05 / RQ-10, DEC-10).
 * Mọi khóa ở đây có nguồn thật trong `projects` / `staffing_orders` / `staffing_order_slots`. KHÔNG
 * có `clientCompanyId`, `hourlyRateVnd`, `internalNotes`, và không có `bigint` nào (`RISK-07`:
 * `JSON.stringify` ném trên BigInt, nên một khóa như vậy làm chết cả route chứ không chỉ rò rỉ).
 *
 * `shiftType` chỉ còn `'ca_ngay' | 'ca_dem' | null` — `'xoay_ca'` đã bị bỏ theo `DEC-07`, xem
 * `classifyShift`.
 *
 * go-live-14 / RQ-02: khoá `industry` ĐÃ BỊ BỎ khỏi allow-list này. Nó là khoá duy nhất không truy
 * nguyên được về một cột canonical: giá trị do một hàm regex đọc văn bản tự do của dự án và của đơn
 * (kể cả `description` nội bộ của HR) rồi đặt ra một nhãn ngành, mặc định `'Công nghiệp chế tạo'`.
 * Cột `ClientCompany.industry` có thật và do người nhập, nhưng `client_companies` ở posture FORCE
 * RLS và principal công khai `MKT` không có policy đọc nó, nên nó KHÔNG phải nguồn của khoá này.
 * Muốn trả nhãn ngành ra bề mặt công khai thì phải có cột đọc được từ đường công khai trước.
 */
export interface PublicJobDto {
  id: string;
  slug: string;
  title: string;
  /** Y10.4/UI04g fix: companyName = tên công ty/nhà máy (project.name), hiển thị dưới title job. */
  companyName: string;
  position: string;
  shift: string | null;
  location: string | null;
  shiftType: 'ca_ngay' | 'ca_dem' | null;
  jobType: 'toan_thoi_gian' | 'ban_thoi_gian' | 'thoi_vu';
  availableSlots: number;
  deadline: string | null;
  /**
   * go-live-09 / RQ-04, DEC-04 — thôi là hằng: `'Sắp hết hạn'` khi `urgency` khác `'NONE'`,
   * `'Đang tuyển'` khi `'NONE'`. Khóa KHÔNG bị xóa vì cả card, trang chi tiết và
   * `public-detail.meta.ts` đang đọc nó.
   */
  statusLabel: string;
  /**
   * go-live-09 / RQ-02, DEC-01/DEC-03 — lương GIỜ của người lao động, đọc từ
   * `StaffingOrderSlot.hourlyRateVnd` của ĐÚNG tập slot còn nhận người. Hai điều cố ý:
   *
   *   1. Tên khóa công khai là `salaryMinVnd`/`salaryMaxVnd`, KHÔNG phải `hourlyRateVnd`. Chuỗi tên
   *      cột nội bộ vẫn bị cấm xuất hiện trong payload (`DEC-19`), và giá bán cho khách nằm ở
   *      `client_rate_cards` nên công bố con số này không lộ margin.
   *   2. Kiểu là `number`, không phải `bigint`. Cột là `BigInt?` trong Prisma; trả thẳng ra thì
   *      `NextResponse.json` ném `TypeError: Do not know how to serialize a BigInt` lúc chạy thật
   *      trong khi mọi gate tĩnh vẫn xanh.
   *
   * `null` khi không slot nào còn nhận người có lương — UI in `"Lương thương lượng"`, KHÔNG in
   * `"0 đ"` (`DEC-03`). Nhánh `null` là nhánh phổ biến ở dev nên nó là thiết kế bậc một.
   */
  salaryMinVnd: number | null;
  salaryMaxVnd: number | null;
  /**
   * go-live-09 / RQ-03, DEC-04 — mức khẩn chạy bằng TRẠNG THÁI THẬT của đơn, không bằng ngưỡng số
   * chỗ trống. Không một nhánh nào của phép tính này đọc `availableSlots`: một đơn 200 chỗ vừa mở
   * không phải "gấp", và một đơn 3 chỗ mở từ tháng trước cũng không phải "gấp".
   */
  urgency: 'NONE' | 'CLOSING' | 'URGENT';
  /** hrp-p1-a0-1 (DEC-05): stamp flag "Hot" — canonical boolean từ `JobPosting.isHot`. */
  isHot: boolean;
  /** hrp-p1-a0-1 (DEC-05): stamp flag "Tuyển gấp" — canonical boolean từ `JobPosting.isUrgent`. */
  isUrgent: boolean;
  /** go-live-09 / RQ-02 — ISO của `createdAt` ĐƠN còn hiệu lực mới nhất; trục sắp của `overview.newest`. */
  postedAt: string | null;
  /**
   * go-live-05 / RQ-04, DEC-03/DEC-04 — TẤT CẢ giá trị của các slot còn hiệu lực, unique, bỏ rỗng,
   * sort ổn định. Ba field đơn `position`/`shift`/`location` ở trên là phần tử đầu của đúng ba mảng
   * này, nên card không còn cộng tổng chỗ trống của mọi slot rồi mô tả bằng chữ của một slot.
   *
   * ĐỘ LỆCH CÓ Ý THỨC so với `DEC-03`: contract đặt tên mảng vị trí là `positions`, nhưng
   * `PublicJobDetailDto extends PublicJobDto` (go-live-12) đã có `positions: PublicJobPositionDto[]`
   * với kiểu khác; trùng tên là lỗi compiler, và `RQ-15` cấm sửa mã go-live-12. Tên dùng ở đây là
   * `positionTitles`. Ghi trong HANDOFF.
   */
  positionTitles: string[];
  locations: string[];
  shifts: string[];
}

/**
 * go-live-05 / RQ-06, DEC-08 — nguồn dữ liệu cho các control lọc của UI.
 *
 * Derive từ TOÀN TẬP public hợp lệ (sau lifecycle `DEC-05`, TRƯỚC filter của người dùng). Hai hệ quả
 * cố ý: (1) UI không được hardcode danh sách tỉnh hay ca nào nữa — mọi option đến từ dữ liệu thật,
 * nên không còn option nào lọc ra 0 kết quả; (2) dropdown KHÔNG co lại theo chính lựa chọn vừa rồi,
 * vì facet không đọc bộ lọc đang áp.
 *
 * `DEC-13`/`RQ-18` — KHÔNG có facet ngành nghề, và không được thêm lại. go-live-14 đã đi hết một
 * bước nữa: hàm suy diễn nhãn ngành và cả khoá DTO đọc nó đều đã bị bỏ, nên giờ không còn giá trị
 * nào để dựng facet đó lên kể cả khi ai muốn. Cột `ClientCompany.industry` có thật nhưng
 * `client_companies` bị FORCE RLS và principal công khai `MKT` không có policy đọc nó (`EV-09`).
 * Một facet mới chỉ hợp lệ khi truy nguyên được về một cột canonical đọc được từ đường công khai —
 * `areas` về địa điểm slot, `shifts` về nhãn ca của slot.
 */
export interface PublicJobFacets {
  areas: string[];
  shifts: string[];
}

/** Một cặp `{ tên, số việc }` của `overview`. Mục có `count === 0` KHÔNG bao giờ được trả về. */
export interface PublicJobOverviewEntry {
  value: string;
  count: number;
}

/**
 * go-live-09 / RQ-21, DEC-18 — MỌI con số toàn cục của bề mặt công khai sinh ở đây.
 *
 * Tính trên tập eligible **trước bộ lọc và trước phân trang**, cùng chỗ với `facets`. Lý do là
 * `EV-18`: trang chỉ tải `PAGE_SIZE = 12` dòng, nên mọi phép đếm, phép tổng hay phép xếp hạng chạy
 * trên mảng đang render là sự thật của MỘT TRANG, và nó nói sai đúng vào lúc dữ liệu nhiều lên —
 * một dải tên "Lương cao nhất" mà chỉ cao nhất trong 12 dòng đầu là một khẳng định sai.
 *
 * `areaCounts` đếm bằng ĐÚNG vị từ mà bộ lọc `area` dùng (`areaHaystack`, đã fold dấu, gồm cả
 * `siteAddress`), nên số trên tag bằng đúng `total` của lần gọi lại với `area` đó. Client KHÔNG thể
 * tự tính con số này: `siteAddress` không có trong DTO. `shiftCounts` đếm bằng đúng vị từ
 * `job.shifts.some` với so khớp chuỗi con KHÔNG fold dấu — cũng đúng vị từ của bộ lọc `shift`.
 *
 * `newest` và `topPaid` mang `PublicJobDto` ĐẦY ĐỦ chứ không chỉ `slug`: một `slug` không nằm trong
 * trang đang tải thì trang không có gì để render, và nếu client chỉ render các slug tình cờ đã tải
 * thì dải bị cắt ngắn trong im lặng. Giá phải trả là tối đa 12 DTO thêm trong response, và chúng đi
 * qua đúng `toDto` nên chịu đúng allow-list của card.
 */
export interface PublicJobOverview {
  totals: { jobs: number; slots: number; areas: number };
  areaCounts: PublicJobOverviewEntry[];
  shiftCounts: PublicJobOverviewEntry[];
  newest: PublicJobDto[];
  topPaid: PublicJobDto[];
}

export interface PublicJobListResult {
  jobs: PublicJobDto[];
  nextOffset: number | null;
  total: number;
  facets: PublicJobFacets;
  /** go-live-09 / RQ-21 — khóa THUẦN CỘNG thứ năm; bốn khóa trên không đổi tên, kiểu hay cách tính. */
  overview: PublicJobOverview;
}

/**
 * Một vị trí tuyển dụng trên trang chi tiết (go-live-12 / RQ-01). Đúng bảy khóa, mọi khóa có
 * nguồn thật trong `staffing_order_slots`; `available` là số chỗ còn trống của CHÍNH vị trí đó.
 */
export interface PublicJobPositionDto {
  positionCode: string;
  positionTitle: string;
  shift: string | null;
  workLocation: string | null;
  slotsNeeded: number;
  slotsFilled: number;
  available: number;
}

/**
 * DTO của trang chi tiết (go-live-12 / RQ-01, DEC-05). `extends PublicJobDto` là cách bắt chính
 * compiler canh điều kiện "chứa MỌI khóa của `PublicJobDto` với đúng kiểu đang có": xóa một khóa
 * hay đổi kiểu nó ở trên thì `npm run typecheck` đỏ, không cần test nào canh hộ.
 *
 * Additive theo `DEC-05`: `getPublicJobProjection` và hình dạng `{ job }` của `/api/jobs/{slug}`
 * KHÔNG đổi một khóa nào (RQ-04).
 *
 * hrp-p1-a1 — các khóa `summary/requirements/benefits/applicationSteps` chứa JSON ProseMirror
 * lấy từ `JobPosting` A0; chúng ĐƯỢC phép rỗng đối với DTO nhưng PHẢI render bằng
 * `renderJobPostingRichText` ở Server Component — KHÔNG bao giờ qua `dangerouslySetInnerHTML`.
 * `contentSchemaVersion` kèm schema version để server-side renderer xác nhận payload thuộc đúng
 * phiên bản trước khi cho render (fail-closed khi schemaVersion lệch).
 *
 * Lưu ý đặt tên: tránh chuỗi 'description' vì `tests/db/public-detail.static.test.ts` cấm
 * substring đó trong `app/(jobs)/viec-lam/[slug]/page.tsx` (RQ-13). Tên cũ `description`/`howToApply`
 * đã được chuyển sang `summary`/`applicationSteps` để trang render được mà không vi phạm static guard.
 */
export interface PublicJobDetailDto extends PublicJobDto {
  jobCode: string;
  siteAddress: string | null;
  totalSlotsNeeded: number;
  totalSlotsFilled: number;
  positions: PublicJobPositionDto[];
  /** hrp-p1-a1: rich-text doc từ JobPosting.descriptionJson (nullable cho legacy posting). */
  summary: unknown | null;
  requirements: unknown | null;
  benefits: unknown | null;
  /** hrp-p1-a1: rich-text doc từ JobPosting.applicationInstructionsJson. */
  applicationSteps: unknown | null;
  /** hrp-p1-a1: phiên bản schema rich-text của posting này (đồng bộ với `contentSchemaVersion`). */
  contentSchemaVersion: number | null;
  /** hrp-p1-a1: text lương hiển thị từ JobPosting.salaryDisplay (string ngắn; KHÔNG phải rich text). */
  salaryDisplay: string | null;
}

const VISIBLE_ORDER_STATUSES = ['OPEN', 'CLOSING_SOON'];

type ShiftType = NonNullable<PublicJobDto['shiftType']>;
type JobType = PublicJobDto['jobType'];

function foldVietnamese(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function minutesOfDay(value: string | null): number | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * go-live-05 / RQ-07, DEC-07 — `'xoay_ca'` KHÔNG được suy từ giờ bắt đầu/kết thúc.
 *
 * Idiom cũ (`new Set(ranges).size > 1 → 'xoay_ca'`) đọc "dự án có nhiều ca khác nhau" thành "một
 * người phải xoay ca", hai chuyện khác nhau: một dự án hai kíp cố định không phải việc xoay ca, và
 * ứng viên lọc theo "Xoay ca" sẽ nhận đúng những việc KHÔNG xoay ca. Không có field canonical nào
 * nói ca có xoay hay không, nên nhãn đó bị bỏ khỏi cả DTO lẫn UI.
 *
 * Còn lại là hai hạng đo được từ giờ thật. Xét TẤT CẢ slot còn hiệu lực (không phải `slots[0]`, vì
 * DB không hứa thứ tự nào): các slot cùng một hạng thì trả hạng đó; không cùng hạng thì trả `null` —
 * "không biết" là câu trả lời trung thực, và `null` bị loại khỏi filter `shiftType` thay vì mang một
 * nhãn bịa.
 */
function classifyShift(slots: Array<{ shiftStart: string | null; shiftEnd: string | null }>): ShiftType | null {
  const classes = new Set<ShiftType>();
  for (const slot of slots) {
    const single = classifyOneShift(slot);
    if (single) classes.add(single);
  }
  return classes.size === 1 ? [...classes][0] : null;
}

function classifyOneShift(slot: { shiftStart: string | null; shiftEnd: string | null }): ShiftType | null {
  const start = minutesOfDay(slot.shiftStart);
  const end = minutesOfDay(slot.shiftEnd);
  if (start === null && end === null) return null;
  if ((start !== null && start >= 18 * 60) || (end !== null && end <= 6 * 60) || (start !== null && end !== null && end <= start)) {
    return 'ca_dem';
  }
  return 'ca_ngay';
}

function classifyJobType(
  text: string,
  slots: Array<{ shiftStart: string | null; shiftEnd: string | null }>,
): JobType {
  const folded = foldVietnamese(text);
  if (/thoi vu|seasonal/.test(folded)) return 'thoi_vu';

  const start = minutesOfDay(slots[0]?.shiftStart ?? null);
  const end = minutesOfDay(slots[0]?.shiftEnd ?? null);
  if (start !== null && end !== null) {
    const duration = end > start ? end - start : end + 24 * 60 - start;
    if (duration < 7 * 60) return 'ban_thoi_gian';
  }
  return 'toan_thoi_gian';
}

function isExpired(date: Date | null, now: Date): boolean {
  return Boolean(date && date < now);
}

/** Hình dạng dòng mà `publicSelect` trả về. Đặt tên để `toDto` và `toDetailDto` dùng đúng một kiểu. */
type PublicSlotRow = { positionCode: string; positionTitle: string; slotsNeeded: number; slotsFilled: number; shiftStart: string | null; shiftEnd: string | null; validTo: Date | null; workLocation: string | null; hourlyRateVnd: bigint | null };
/**
 * hrp-p1-a1 (correction batch 1/1, C-02) — Hình dạng StaffingOrderSlot canonical bound tới
 * JobOpening. Một JobPosting ↔ một JobOpening ↔ một StaffingOrderSlot, nên mỗi JobPosting chỉ
 * project ĐÚNG slot được `JobOpening.staffingOrderSlotId` chỉ tới. Sibling slots của cùng
 * StaffingOrder nhưng thuộc JobOpening khác KHÔNG bao giờ xuất hiện trong DTO.
 */
type PublicCanonicalSlotRow = { id: string; positionCode: string; positionTitle: string; slotsNeeded: number; slotsFilled: number; shiftStart: string | null; shiftEnd: string | null; validTo: Date | null; workLocation: string | null; hourlyRateVnd: bigint | null };
type PublicOrderRow = { status: string; title: string; description: string | null; deadlineDate: Date | null; createdAt: Date; canonicalSlot: PublicCanonicalSlotRow | null };
/**
 * hrp-p1-a1 (correction batch 1/1, C-02) — RAW Prisma shape trước khi mapper gắn
 * `canonicalSlot` vào StaffingOrder. Prisma không trả về `canonicalSlot` cho
 * `jobPosting → jobOpening → staffingOrder` vì nó là derived/added ở
 * `projectRowFromPosting`. Tách kiểu để signature `projectRowFromPosting` chỉ chấp nhận
 * payload thô (không cần `canonicalSlot`), còn mọi consumer phía dưới (`toDto`,
 * `toDetailDto`,...) tiếp tục xài `PublicOrderRow`.
 */
type PublicOrderRowRaw = Omit<PublicOrderRow, 'canonicalSlot'>;
type PublicProjectRow = {
  id: string;
  code: string;
  name: string;
  siteAddress: string | null;
  clientCompanyName: string | null;
  staffingOrders: PublicOrderRow[];
  /** hrp-p1-a1 (correction batch 1/1, C-06): dùng cho lọc legacy `PRJ-xxx` ở listing, KHÔNG phát ra DTO. */
  projectCode: string;
  /**
   * hrp-p1-a0-1 (DEC-05): canonical stamp flags từ JobPosting row — KHÔNG phát ra DTO cho đến khi
   * mapper `toDto` / `toDetailDto` copy vào output. Field dùng internal-only, mapper là gate duy
   * nhất giữa Prisma row và public DTO.
   */
  isHot: boolean;
  isUrgent: boolean;
};

/**
 * hrp-p1-a1 — RAW SELECT payload từ Prisma cho JobPosting chain.
 *
 * Đây là hình dạng Prisma trả về (chưa mapped sang `PublicProjectRow`). Khác ở ba điểm so với
 * baseline pre-A1: (1) nguồn là `jobPosting` chứ không phải `project`; (2) `siteAddress` /
 * `clientCompanyName` đến từ `staffingOrder.project` chứ không phải top-level; (3) `staffingOrders`
 * thu gọn còn đúng một phần tử (một JobPosting ↔ một JobOpening ↔ một StaffingOrder).
 *
 * Hàm `projectRowFromPosting` chịu trách nhiệm map sang `PublicProjectRow` để toàn bộ mapper phía
 * dưới (`toDto`/`toDetailDto`/`jobHeadline`/`summarizeSlots`/...) vẫn dùng được nguyên xi.
 */
type PublicJobPostingSelectPayload = {
  id: string;
  slug: string;
  title: string | null;
  salaryDisplay: string | null;
  descriptionJson: unknown | null;
  requirementsJson: unknown | null;
  benefitsJson: unknown | null;
  applicationInstructionsJson: unknown | null;
  contentSchemaVersion: number;
  // hrp-p1-a0-1: canonical stamp flags từ JobPosting row (DEC-05 / DEC-06).
  isHot: boolean;
  isUrgent: boolean;
  jobOpening: {
    staffingOrder: PublicOrderRowRaw & {
      project: { code: string; siteAddress: string | null; clientCompanyName: string | null };
    };
    // C-02: linked canonical slot (một JobOpening ↔ đúng một StaffingOrderSlot).
    staffingOrderSlot: PublicCanonicalSlotRow | null;
  } | null;
};

// RQ-03 / AC-03 / RISK-07: ĐÚNG MỘT định nghĩa cho mỗi vị từ lọc, gọi từ cả đường danh sách và
// đường chi tiết. Hai biểu thức song song — dù hôm nay giống nhau từng ký tự — sẽ lệch ở lần sửa
// đầu tiên, và khi đó số chỗ trống trên card khác số trên trang chi tiết trong im lặng.
function isOrderVisible(order: Pick<PublicOrderRow, 'status' | 'deadlineDate'>, now: Date): boolean {
  return VISIBLE_ORDER_STATUSES.includes(order.status) && !isExpired(order.deadlineDate, now);
}

function isSlotLive(slot: Pick<PublicSlotRow, 'validTo'>, now: Date): boolean {
  return !isExpired(slot.validTo, now);
}

/** Slot còn hiệu lực của một dự án theo đúng hai vị từ trên. Nguồn duy nhất cho cả hai đường. */
function visibleSlots(orders: PublicOrderRow[], now: Date): PublicSlotRow[] {
  return orders
    .filter((order) => isOrderVisible(order, now))
    .flatMap((order) => {
      // C-02: CHỈ map linked `jobOpening.staffingOrderSlot` (canonical) vào DTO. Sibling slots
      // thuộc cùng StaffingOrder nhưng gắn với JobOpening khác bị filter tại đây. Khi chain
      // thiếu hoặc drift (legacy rows, JobOpening.staffingOrderSlotId NULL, hoặc reverse FK
      // không trỏ về opening.id) thì slot không xuất hiện trong DTO ⇒ fail closed cho mọi
      // đường read (listing + detail + apply authority).
      if (!order.canonicalSlot) return [];
      const slot = order.canonicalSlot;
      return isSlotLive(slot, now) ? [slot] : [];
    });
}

/** Số chỗ còn trống của một slot. Công thức duy nhất, dùng cho cả tổng của card và `available`. */
function slotAvailable(slot: Pick<PublicSlotRow, 'slotsNeeded' | 'slotsFilled'>): number {
  return Math.max(0, slot.slotsNeeded - slot.slotsFilled);
}

/** Nhãn ca làm của một slot; giữ đúng biểu thức `toDto` đang dùng, kể cả nhánh chỉ có giờ vào. */
function slotShiftLabel(slot: Pick<PublicSlotRow, 'shiftStart' | 'shiftEnd'>): string | null {
  return slot.shiftStart && slot.shiftEnd ? `${slot.shiftStart}-${slot.shiftEnd}` : slot.shiftStart;
}

/**
 * go-live-05 / DEC-04 — thứ tự ổn định cho MỌI danh sách bề mặt công khai.
 *
 * So sánh trên dạng đã fold dấu (nên "Đà Nẵng" đứng cạnh "Da Nang", không bị đẩy về cuối bảng mã),
 * tie-break bằng chuỗi thô để quan hệ là thứ tự toàn phần ⇒ kết quả sort không phụ thuộc thuật toán
 * sort của engine. Cố ý KHÔNG dùng `localeCompare('vi')`: nó phụ thuộc bản ICU của Node, tức cùng mã
 * nguồn có thể ra hai thứ tự trên hai máy, và đó là loại khác biệt không ai đo.
 */
function compareLabel(a: string, b: string): number {
  const foldedA = foldVietnamese(a);
  const foldedB = foldVietnamese(b);
  if (foldedA !== foldedB) return foldedA < foldedB ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** DEC-04: unique, bỏ chuỗi rỗng/chỉ có khoảng trắng, sort ổn định. Dùng cho cả card và facet. */
function summarize(values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) unique.add(trimmed);
  }
  return [...unique].sort(compareLabel);
}

/**
 * Thứ tự slot ổn định. `findMany` KHÔNG hứa thứ tự của nhánh quan hệ, nên mọi phép suy diễn đọc
 * "slot đầu tiên" (`classifyJobType`) phải đọc cùng một slot ở mọi lần chạy, nếu không cùng một dòng
 * dữ liệu có thể sinh hai DTO khác nhau và không phép đo nào giải thích được vì sao.
 */
function sortSlots(slots: PublicSlotRow[]): PublicSlotRow[] {
  const key = (slot: PublicSlotRow) =>
    [slot.positionTitle, slotShiftLabel(slot) ?? '', slot.workLocation ?? '', slot.positionCode].join('\u0000');
  return [...slots].sort((a, b) => compareLabel(key(a), key(b)));
}

/** DEC-03/DEC-04 — summary của MỘT việc làm, tính từ đúng tập slot còn hiệu lực. */
function summarizeSlots(slots: PublicSlotRow[], project: PublicProjectRow) {
  return {
    positionTitles: summarize(slots.map((slot) => slot.positionTitle)),
    // `?? ` một mình thì `workLocation: '   '` là "có giá trị" ⇒ không fallback, rồi `summarize`
    // trim thành rỗng và bỏ luôn ⇒ card nói "Địa điểm đang cập nhật" trong khi `siteAddress` thật
    // đang nằm ngay đó. `trim() ||` làm chuỗi trắng đi cùng đường với NULL, đúng chữ "fallback".
    locations: summarize(slots.map((slot) => slot.workLocation?.trim() || project.siteAddress)),
    shifts: summarize(slots.map((slot) => slotShiftLabel(slot))),
  };
}

/**
 * Text để suy `jobType`. Gộp mọi trường text đã select; KHÔNG in ra bề mặt nào.
 *
 * go-live-14: text này TỪNG nuôi cả nhãn ngành, và đó là lỗi — `order.description` là văn HR nội bộ,
 * nên một lượt sửa mô tả đổi lặng lẽ một nhãn đang in cho khách ẩn danh. Nay nó chỉ còn nuôi
 * `classifyJobType`, thứ trả về một enum đóng (`toan_thoi_gian`/`ban_thoi_gian`/`thoi_vu`) chứ không
 * phải một nhãn tự do in nguyên văn ra bề mặt.
 */
function searchableTextOf(project: PublicProjectRow): string {
  return [
    project.name,
    ...project.staffingOrders.flatMap((order) => {
      // C-02: chỉ scan linked `canonicalSlot`, không scan toàn bộ slots của StaffingOrder.
      const slot = order.canonicalSlot;
      return [
        order.title,
        order.description ?? '',
        ...(slot ? [slot.positionCode, slot.positionTitle] : []),
      ];
    }),
  ].join(' ');
}

/** Hạn nhận hồ sơ sớm nhất trong các đơn của dự án. */
function earliestDeadline(orders: PublicOrderRow[]): Date | null {
  return orders
    .map((order) => order.deadlineDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}

/** go-live-09 / RQ-03 — ngưỡng "hạn kề" của `urgency`. Một con số, đặt một chỗ. */
const URGENT_WITHIN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Thứ tự nặng dần của `urgency`, để gộp nhiều đơn của cùng một dự án về một giá trị. */
const URGENCY_RANK: Record<PublicJobDto['urgency'], number> = { NONE: 0, CLOSING: 1, URGENT: 2 };

/**
 * `urgency` của MỘT đơn, đúng ba nhánh của `RQ-03`.
 *
 * Nhánh `deadlineDate === null` trả `'CLOSING'` chứ không `'NONE'`: đơn đã được người vận hành đánh
 * dấu `CLOSING_SOON` là một sự thật do con người khẳng định, và việc thiếu ngày hạn không xoá sự thật
 * đó — nó chỉ làm ta không biết còn bao lâu, nên nói "sắp đóng" mà không nói "gấp".
 */
function orderUrgency(order: Pick<PublicOrderRow, 'status' | 'deadlineDate'>, now: Date): PublicJobDto['urgency'] {
  if (order.status !== 'CLOSING_SOON') return 'NONE';
  if (!order.deadlineDate) return 'CLOSING';
  return order.deadlineDate.getTime() - now.getTime() < URGENT_WITHIN_DAYS * DAY_MS ? 'URGENT' : 'CLOSING';
}

/**
 * go-live-09 / RQ-02, RQ-03, RQ-24, DEC-21 — bốn field mới sinh ở ĐÚNG MỘT chỗ.
 *
 * Cả `toDto` và `toDetailDto` gọi hàm này với cùng `project.staffingOrders`, nên bất biến "hai mapper
 * nói cùng một sự thật" của `RQ-24` đúng do CẤU TẠO, không phải do fixture may mắn. Nếu mỗi mapper tự
 * derive lương từ tập slot riêng của nó thì bất biến chỉ xanh trên những hàng hai tập tình cờ trùng
 * nhau — đúng loại "AC đúng mặt chữ mà vô giá trị".
 *
 * Tập lấy lương là slot còn hiệu lực CÒN NHẬN NGƯỜI (`slotAvailable > 0`), cố ý hẹp hơn tập của
 * `toDetailDto`: một mức lương của vị trí đã đủ chỉ tiêu không phải thứ ứng viên còn ứng được, nên
 * để nó vào dải "Lương cao nhất" là quảng cáo một con số không mua được.
 *
 * `Number(rate)` là chỗ `BigInt` chết: cột là `BigInt?`, và `NextResponse.json` ném
 * `TypeError: Do not know how to serialize a BigInt` nếu giá trị thô đi tới response. Lương giờ tối
 * đa cỡ vài trăm nghìn nên không có rủi ro mất chính xác ở `Number`.
 */
function jobHeadline(
  orders: PublicOrderRow[],
  now: Date,
): Pick<PublicJobDto, 'salaryMinVnd' | 'salaryMaxVnd' | 'urgency' | 'postedAt'> {
  const visible = orders.filter((order) => isOrderVisible(order, now));

  const rates = visibleSlots(orders, now)
    .filter((slot) => slotAvailable(slot) > 0)
    .map((slot) => slot.hourlyRateVnd)
    .filter((rate): rate is bigint => rate !== null)
    .map((rate) => Number(rate));

  let urgency: PublicJobDto['urgency'] = 'NONE';
  for (const order of visible) {
    const candidate = orderUrgency(order, now);
    if (URGENCY_RANK[candidate] > URGENCY_RANK[urgency]) urgency = candidate;
  }

  // `postedAt` là `createdAt` MỚI NHẤT trong các đơn còn hiệu lực: một dự án cũ vừa mở thêm đơn thì
  // đúng là vừa có việc mới, và `orderBy` của `Project` (cấm chạm) không nói được điều đó.
  const postedMs = visible.map((order) => order.createdAt.getTime());

  return {
    salaryMinVnd: rates.length > 0 ? Math.min(...rates) : null,
    salaryMaxVnd: rates.length > 0 ? Math.max(...rates) : null,
    urgency,
    postedAt: postedMs.length > 0 ? new Date(Math.max(...postedMs)).toISOString() : null,
  };
}

function toDto(project: PublicProjectRow, now: Date): PublicJobDto | null {
  const live = sortSlots(visibleSlots(project.staffingOrders, now));
  const availableSlots = live.reduce((sum, slot) => sum + slotAvailable(slot), 0);
  if (availableSlots <= 0 || live.length === 0) return null;

  /**
   * go-live-05 / RQ-04, DEC-05 — card CHỈ mô tả những slot còn nhận người.
   *
   * `isSlotLive` không nói gì về chỗ trống, nên một slot đã đủ chỉ tiêu vẫn nằm trong `live`. Để nó
   * trong tập derive thì card quảng cáo một vị trí không thể ứng tuyển được (`RQ-04` gọi đúng ca đó
   * là FAIL), và tệ hơn: `classifyShift` thấy một kíp đêm ĐÃ ĐỦ NGƯỜI sẽ trả `null`, làm cả việc
   * rơi khỏi bộ lọc "ca ngày" dù kíp ngày của nó vẫn đang tuyển.
   *
   * `availableSlots` KHÔNG đổi vì slot đủ chỉ tiêu góp đúng 0. Trang chi tiết cố ý KHÔNG dùng cửa
   * này — xem đoạn tương ứng trong `toDetailDto`.
   */
  const slots = live.filter((slot) => slotAvailable(slot) > 0);

  const summary = summarizeSlots(slots, project);
  const searchableText = searchableTextOf(project);
  const deadline = earliestDeadline(project.staffingOrders);
  // go-live-09 / RQ-24: MỘT lời gọi, dùng chung với `toDetailDto`. Xem `jobHeadline`.
  const headline = jobHeadline(project.staffingOrders, now);

  return {
    id: project.id,
    slug: project.code,
    title: project.name,
    /** Y10.4/UI04g fix: companyName = tên nhà máy/công ty (denormalized vào project.clientCompanyName),
     *  position = tên công việc (project.name). */
    companyName: project.clientCompanyName ?? project.name,
    // DEC-03: field đơn là phần tử ĐẦU của chính mảng summary đã sort, không phải chữ của một slot
    // ngẫu nhiên. Nhánh `??` chỉ đỡ trường hợp dữ liệu rỗng — `summarize` đã bỏ chuỗi trắng.
    position: summary.positionTitles[0] ?? slots[0].positionTitle,
    shift: summary.shifts[0] ?? null,
    location: summary.locations[0] ?? null,
    shiftType: classifyShift(slots),
    jobType: classifyJobType(searchableText, slots),
    availableSlots,
    deadline: deadline?.toISOString() ?? null,
    // go-live-09 / RQ-04: nhãn theo `urgency`, KHÔNG theo `availableSlots`. Nhãn cũ là hằng
    // `'Đang tuyển'` nên nó nói y một câu cho cả đơn còn 45 ngày và đơn còn 2 ngày.
    statusLabel: headline.urgency === 'NONE' ? 'Đang tuyển' : 'Sắp hết hạn',
    ...headline,
    positionTitles: summary.positionTitles,
    locations: summary.locations,
    shifts: summary.shifts,
    // hrp-p1-a0-1 (DEC-05): stamp flags từ JobPosting canonical row.
    isHot: project.isHot,
    isUrgent: project.isUrgent,
  };
}

/**
 * Projection của trang chi tiết (go-live-12 / RQ-01, RQ-03, DEC-14).
 *
 * KHÔNG thừa hưởng cửa chặn `availableSlots <= 0` của `toDto`: một việc đã đủ chỉ tiêu vẫn phải mở
 * được `200` vì link đã chia sẻ ra ngoài không được biến thành 404, và nút Ứng tuyển sẽ ở trạng thái
 * vô hiệu. Chỉ khi không còn slot nào còn hiệu lực thì mới trả null để trang `404`. Cửa của `toDto`
 * đúng cho danh sách — list không nên khoe việc đã đủ — và sai cho trang chi tiết.
 *
 * hrp-p1-a1: `rich` mang các trường rich-text (description/requirements/benefits/
 * applicationInstructions + contentSchemaVersion + salaryDisplay) từ JobPosting; mapper truyền
 * nguyên vẹn xuống DTO để Server Component gọi `renderJobPostingRichText` ở request path.
 */
function toDetailDto(
  project: PublicProjectRow,
  rich: {
    descriptionJson: unknown | null;
    requirementsJson: unknown | null;
    benefitsJson: unknown | null;
    applicationInstructionsJson: unknown | null;
    contentSchemaVersion: number;
    salaryDisplay: string | null;
  },
  now: Date,
): PublicJobDetailDto | null {
  const slots = sortSlots(visibleSlots(project.staffingOrders, now));
  if (slots.length === 0) return null;

  const positions: PublicJobPositionDto[] = slots.map((slot) => ({
    positionCode: slot.positionCode,
    positionTitle: slot.positionTitle,
    shift: slotShiftLabel(slot),
    workLocation: slot.workLocation ?? project.siteAddress,
    slotsNeeded: slot.slotsNeeded,
    slotsFilled: slot.slotsFilled,
    available: slotAvailable(slot),
  }));
  const availableSlots = positions.reduce((sum, position) => sum + position.available, 0);

  const summary = summarizeSlots(slots, project);
  const searchableText = searchableTextOf(project);
  const deadline = earliestDeadline(project.staffingOrders);

  return {
    id: project.id,
    slug: project.code,
    jobCode: project.code,
    title: project.name,
    /** Y10.4/UI04g fix: companyName = tên công ty/nhà máy (denormalized). */
    companyName: project.clientCompanyName ?? project.name,
    // go-live-05 / RQ-11: cùng một PHÉP derive với card (`summarizeSlots` trên tập đã `sortSlots`),
    // nhưng cố ý trên tập slot RỘNG HƠN. Trước đây cả hai bề mặt đọc `slots[0]` theo thứ tự DB nên
    // có thể mô tả cùng một việc bằng hai ca khác nhau; nay thứ tự đã ổn định ở cả hai.
    // ĐỘ LỆCH CÓ Ý THỨC: `toDto` lọc thêm `slotAvailable > 0`, `toDetailDto` thì không, vì `DEC-14`
    // buộc trang chi tiết vẫn liệt kê MỌI vị trí của một việc đã đủ chỉ tiêu (`available: 0`) —
    // lọc ở đây sẽ làm `positionTitles`/`shift`/`location` của chính việc đó rỗng đi. Hệ quả đo
    // được: card kể những vị trí còn nhận người, trang chi tiết kể tất cả. Ghi trong HANDOFF.
    position: summary.positionTitles[0] ?? slots[0].positionTitle,
    shift: summary.shifts[0] ?? null,
    location: summary.locations[0] ?? null,
    siteAddress: project.siteAddress,
    shiftType: classifyShift(slots),
    jobType: classifyJobType(searchableText, slots),
    availableSlots,
    totalSlotsNeeded: positions.reduce((sum, position) => sum + position.slotsNeeded, 0),
    totalSlotsFilled: positions.reduce((sum, position) => sum + position.slotsFilled, 0),
    positions,
    deadline: deadline?.toISOString() ?? null,
    // go-live-09 / RQ-24 CÓ Ý KHÔNG chạm nhãn này. `RQ-04` nói về hằng `'Đang tuyển'` của `toDto`;
    // nhãn ở đây đã động từ `go-live-12` và mang một sự thật KHÁC mà `DEC-14` buộc trang chi tiết
    // phải nói: một việc đã đủ chỉ tiêu vẫn mở được `200` và phải tự khai `'Đã đủ chỉ tiêu'`. Ghi
    // `'Sắp hết hạn'` lên đó sẽ xoá đúng câu đó. Bốn field của `RQ-02` thì bằng đúng `toDto`.
    statusLabel: availableSlots > 0 ? 'Đang tuyển' : 'Đã đủ chỉ tiêu',
    ...jobHeadline(project.staffingOrders, now),
    positionTitles: summary.positionTitles,
    locations: summary.locations,
    shifts: summary.shifts,
    // hrp-p1-a1: rich-text payload từ JobPosting (RQ-02, AC-03..05). Trả raw doc để
    // Server Component `app/(jobs)/viec-lam/[slug]/page.tsx` gọi `renderJobPostingRichText`
    // (server-side, KHÔNG dùng editor client). Renderer fail closed khi schemaVersion lệch
    // hoặc payload không qua validator; UI sẽ omit section + log diagnostic an toàn (DEC-04).
    summary: rich.descriptionJson,
    requirements: rich.requirementsJson,
    benefits: rich.benefitsJson,
    applicationSteps: rich.applicationInstructionsJson,
    contentSchemaVersion: rich.contentSchemaVersion,
    salaryDisplay: rich.salaryDisplay,
    // hrp-p1-a0-1 (DEC-05): stamp flags từ JobPosting canonical row (override sau spread `...jobHeadline`
    // để đảm bảo cùng nguồn `project.isHot` / `project.isUrgent` cho cả card và detail).
    isHot: project.isHot,
    isUrgent: project.isUrgent,
  };
}

// hrp-p1-a1 — nguồn của phép chiếu công khai chuyển từ `Project` sang `JobPosting`.
//
// Lý do cốt lõi: A0 đã freeze canonical slug thuộc `JobPosting` (`@unique([slug])`) và chỉ các bản
// ghi `status='PUBLISHED'` mới được phép xuất hiện ngoài bề mặt công khai. A1 đọc từ bảng đó,
// duyệt chain `jobOpening → staffingOrder → project` để lấy `siteAddress`/`clientCompanyName`/
// `staffingOrder.status`/`staffingOrder.canonicalSlot` — các trường vốn nằm trên `Project`/`StaffingOrder`
// ở baseline. `DRAFT`/`ARCHIVED` JobPosting bị `where` loại trước khi tới mapper; `jobOpening`
// nullable (legacy rows có thể không có) thì bị skip tại `projectRowFromPosting`.
//
// C-02 (correction batch 1/1): canonical slot chain. Trước đây `staffingOrder.slots` trả MỌI slot
// thuộc cùng StaffingOrder — sibling slot của JobOpening khác có thể xuất hiện trong DTO. Nay
// chỉ project đúng `jobOpening.staffingOrderSlot` (theo FK ngược `staffing_order_slots.job_opening_id`
// = `job_openings.id` + `job_openings.staffing_order_slot_id` = `staffing_order_slots.id`), đảm bảo
// `JobPosting` cho opening A chỉ render slot A và reject sibling slot ngay tại read projection.
// Service-layer và RPC authority dùng chuỗi canonical này — không có đường nào fetch toàn bộ
// `staffingOrder.slots` cho một JobPosting.
//
// Hàng rào: `public-select.static.test.ts` đọc cây nguồn và assert khóa ngoài cùng. Đổi `select`
// thì phải cập nhật allowlist ở đó MỘT CÁCH CÓ Ý THỨC — không được kéo lại quan hệ mà principal
// công khai `MKT` không đọc được (`client_companies`).
const publicSelect = Prisma.validator<Prisma.JobPostingSelect>()({
  id: true,
  slug: true,
  title: true,
  // hrp-p1-a1: rich-text fields cho shared renderer (RQ-02, AC-03..05). Validator của
  // `src/shared/content/job-posting-rich-text` check schemaVersion trước khi render, nên
  // payload rỗng/schemaVersion lệch fail closed mà KHÔNG render raw.
  salaryDisplay: true,
  descriptionJson: true,
  requirementsJson: true,
  benefitsJson: true,
  applicationInstructionsJson: true,
  contentSchemaVersion: true,
  // hrp-p1-a0-1 (DEC-05 / DEC-06 / T0 §2): canonical stamp flags. Public projection
  // chỉ đọc boolean — KHÔNG suy từ Project legacy, urgency, salary, postedAt hay hash.
  // Static test fence ở `public-select.static.test.ts` allowlist top-level keys;
  // thêm field ở đây phải cập nhật allowlist MỘT CÁCH CÓ Ý THỨC.
  isHot: true,
  isUrgent: true,
  jobOpening: {
    select: {
      staffingOrder: {
        select: {
          status: true,
          title: true,
          description: true,
          deadlineDate: true,
          createdAt: true,
          project: {
            select: {
              siteAddress: true,
              // Y10.4/UI04g: denormalized company name (MKT role không đọc được client_companies do RLS)
              clientCompanyName: true,
              // hrp-p1-a1 (C-06): đưa về listing để lọc legacy `PRJ-xxx`. KHÔNG phát ra DTO công khai;
              // chỉ phục vụ nhánh `q` có hình dạng mã dự án ở `listPublicJobProjection`.
              code: true,
            },
          },
        },
      },
      // C-02: chính xác một `staffingOrderSlot` được link qua `job_openings.staffing_order_slot_id`.
      // Đây là đường duy nhất vào DTO; `staffingOrder.slots` đã bị bỏ để chặn sibling slot.
      staffingOrderSlot: {
        select: {
          id: true,
          positionCode: true,
          positionTitle: true,
          slotsNeeded: true,
          slotsFilled: true,
          shiftStart: true,
          shiftEnd: true,
          validTo: true,
          workLocation: true,
          hourlyRateVnd: true,
        },
      },
    },
  },
});

/**
 * hrp-p1-a0-1 — Map một dòng JobPosting (Prisma payload) sang hình `PublicProjectRow` mà mapper phía
 * dưới đang dùng. Duy trì tính đối xứng: hai đường đọc (`listPublicJobProjection` /
 * `getPublicJobDetail`) cùng phải chạy qua map này, nếu không số chỗ trống / facet / urgency / stamp
 * của card và trang chi tiết sẽ lệch nhau trong im lặng — đúng defect go-live-09 / RQ-24.
 *
 * C-02 (correction batch 1/1): `canonicalSlot` được derive TỪ `jobOpening.staffingOrderSlot`
 * (một Prisma relation 0..1 tới `StaffingOrderSlot` qua FK `job_openings.staffing_order_slot_id`).
 * KHÔNG lấy `staffingOrder.slots` (toàn bộ sibling slots). Sibling slot thuộc StaffingOrder nhưng
 * gắn JobOpening khác KHÔNG thể vào DTO.
 *
 * Trả `null` khi JobPosting thiếu `jobOpening` (legacy row, hoặc chain bị xoá) — caller sẽ filter
 * tiếp tại vòng lặp ngoài. Khi `jobOpening.staffingOrderSlot` là `null` (chain bị drift), mapper
 * trả về DTO với `canonicalSlot: null` và `visibleSlots` trả `[]` — fail closed ở read projection.
 */
function projectRowFromPosting(posting: PublicJobPostingSelectPayload): PublicProjectRow | null {
  const opening = posting.jobOpening;
  if (!opening) return null;
  const order = opening.staffingOrder;
  const project = order.project;
  return {
    id: posting.id,
    code: posting.slug,
    name: posting.title ?? '',
    siteAddress: project.siteAddress ?? null,
    clientCompanyName: project.clientCompanyName ?? null,
    staffingOrders: [{ ...order, canonicalSlot: opening.staffingOrderSlot }],
    // hrp-p1-a1 (C-06): mapping internal Project.code cho lọc legacy ở listing. KHÔNG bao giờ
    // chạm DTO.
    projectCode: project.code,
    // hrp-p1-a0-1 (DEC-05): canonical stamp flags từ JobPosting row. Mapper `toDto` /
    // `toDetailDto` đọc thẳng từ đây để gắn vào DTO — KHÔNG heuristic suy từ urgency / salary /
    // postedAt / hash. Default false cho row pre-P1-A0.1 (migration backfilled via DEFAULT).
    isHot: posting.isHot,
    isUrgent: posting.isUrgent,
  };
}

/**
 * go-live-05 / RQ-06, DEC-08 — chuỗi để khớp `q` trong bộ nhớ.
 *
 * ĐÚNG tập field mà predicate SQL cũ quét, không rộng hơn: tên và mã dự án, địa chỉ site, tiêu đề đơn
 * còn hiệu lực, tên vị trí và địa điểm của các slot còn hiệu lực. Cố ý KHÔNG gộp `order.description`
 * (SQL cũ cũng không) — khớp vào một đoạn văn không hề in trên card thì ứng viên không giải thích
 * được vì sao kết quả đó xuất hiện.
 *
 * Khác biệt duy nhất so với `contains … mode: 'insensitive'` cũ: hai bên đều fold dấu, nên "bac ninh"
 * tìm ra "Bắc Ninh". Đó là mở rộng có chủ ý, và nó cho `q` với `area` cùng một quy tắc so khớp —
 * so khớp có gập dấu KHÔNG phải một khẳng định in ra cho người dùng (`RQ-18`).
 */
function keywordHaystack(row: PublicProjectRow, job: PublicJobDto, now: Date): string {
  return foldVietnamese([
    job.title,
    job.slug,
    row.siteAddress ?? '',
    ...row.staffingOrders.filter((order) => isOrderVisible(order, now)).map((order) => order.title),
    ...job.positionTitles,
    ...job.locations,
  ].join(' '));
}

/** Chuỗi để khớp `area`: `siteAddress` của dự án cộng địa điểm slot — đúng hai nhánh của SQL cũ. */
function areaHaystack(row: PublicProjectRow, job: PublicJobDto): string {
  return foldVietnamese([row.siteAddress ?? '', ...job.locations].join(' '));
}

export async function listPublicJobProjection(
  tx: Prisma.TransactionClient,
  opts: { q?: string; area?: string; shift?: string; shiftTypes?: string[]; jobTypes?: string[]; offset?: number; limit?: number; urgency?: 'URGENT' } = {},
): Promise<PublicJobListResult> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  // §4.3: MỘT `now` cho cả request. Trước đây `new Date()` được gọi lại bên trong `.map`, nên hai dự
  // án được xét trên hai mốc thời gian khác nhau; một slot hết hạn giữa vòng lặp là đủ để `total`
  // không còn khớp trang trả về, và không log nào ghi lại chuyện đó.
  const now = new Date();
  // DEC-08: `where` CHỈ mang cửa chặn public + lifecycle, KHÔNG mang `q`/`area`. Nếu hai bộ lọc đó
  // nằm trong SQL thì facet bên dưới chỉ còn là facet của tập ĐÃ bị lọc — dropdown co lại theo chính
  // lựa chọn vừa rồi, và người dùng không quay lại được. Đổi lại, `q`/`area` khớp trong bộ nhớ; ngân
  // sách của việc này đo bằng fixture lớn và ghi ở HANDOFF theo `DEC-12`/`RISK-03`.
  //
  // hrp-p1-a1: nguồn chuyển từ `Project` sang `JobPosting` với `status='PUBLISHED'`. Đây là điều kiện
  // duy nhất bảo đảm DRAFT/ARCHIVED KHÔNG bao giờ xuất hiện trên card. Lifecycle của JobOpening phía
  // dưới (OPEN/CLOSING_SOON/...) vẫn được mapper áp dụng như trước đây.
  const postings = await tx.jobPosting.findMany({
    where: { status: 'PUBLISHED' },
    select: publicSelect,
    orderBy: { publishedAt: 'desc' },
  });

  // Giữ dòng gốc bên cạnh DTO: `q`/`area` cần `siteAddress` và tiêu đề đơn, hai thứ KHÔNG có trong
  // DTO công khai và không được thêm vào (allow-list `DEC-10`).
  const eligible: Array<{ row: PublicProjectRow; job: PublicJobDto }> = [];
  for (const posting of postings) {
    const row = projectRowFromPosting(posting);
    if (!row) continue;
    const job = toDto(row, now);
    if (job) eligible.push({ row, job });
  }

  // DEC-08 — facet tính TRƯỚC filter, trên toàn tập hợp lệ.
  const facets: PublicJobFacets = {
    areas: summarize(eligible.flatMap(({ job }) => job.locations)),
    shifts: summarize(eligible.flatMap(({ job }) => job.shifts)),
  };

  /**
   * go-live-09 / RQ-21, DEC-18 — `overview` sinh Ở ĐÂY, cạnh `facets`, trên cùng tập `eligible`, tức
   * TRƯỚC bộ lọc và TRƯỚC phân trang.
   *
   * Vì sao không để client tính: theo `EV-18` trang chỉ tải `PAGE_SIZE = 12` dòng, nên mọi phép đếm
   * hay xếp hạng chạy trên mảng đang render là sự thật của MỘT TRANG. Nó nói đúng lúc dữ liệu ít và
   * nói sai đúng vào lúc dữ liệu nhiều lên — loại lỗi không có test nào bắt được vì fixture nhỏ.
   *
   * Và với `areaCounts` thì client không chỉ sai, client KHÔNG THỂ đúng: vị từ của bộ lọc `area` so
   * trên `areaHaystack`, chuỗi có cả `row.siteAddress` — thứ cố ý không có trong DTO (`DEC-10`). Một
   * dự án ở Bắc Ninh nhưng `workLocation` ghi tên khu công nghiệp sẽ KHỚP `area=Bắc Ninh` mà
   * `job.locations` của nó không chứa chữ đó. Nên số duy nhất đúng là số đếm bằng CHÍNH vị từ ấy, và
   * chỉ service có nó. Bất biến đo được: số trên tag bằng `total` của lần gọi lại với `area` đó.
   */
  // Y10.8+: tăng lên 8 để đủ cung cấp cho 2 section Areas + Recruiting (mỗi cái 8 cards).
  const overviewStripSize = 8;
  const countBy = (
    values: string[],
    matches: (entry: { row: PublicProjectRow; job: PublicJobDto }, value: string) => boolean,
  ): PublicJobOverviewEntry[] =>
    values
      .map((value) => ({ value, count: eligible.filter((entry) => matches(entry, value)).length }))
      // Tag `"Bắc Giang (0)"` là mời người dùng bấm vào một trang trống. Bỏ ở service để không lớp
      // nào phải nhớ lọc lại.
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || compareLabel(a.value, b.value));

  const areaCounts = countBy(facets.areas, ({ row, job }, value) => areaHaystack(row, job).includes(foldVietnamese(value)));
  const shiftCounts = countBy(facets.shifts, ({ job }, value) => job.shifts.some((label) => label.includes(value)));
  const overview: PublicJobOverview = {
    totals: {
      jobs: eligible.length,
      slots: eligible.reduce((sum, { job }) => sum + job.availableSlots, 0),
      areas: areaCounts.length,
    },
    areaCounts,
    shiftCounts,
    // `postedAt` là ISO cùng một khuôn nên so chuỗi trực tiếp là so thời gian; không cần `Date.parse`.
    newest: [...eligible]
      .sort((a, b) => {
        const left = a.job.postedAt ?? '';
        const right = b.job.postedAt ?? '';
        return left === right ? 0 : left < right ? 1 : -1;
      })
      .slice(0, overviewStripSize)
      .map(({ job }) => job),
    // Dải `"Lương cao nhất"` sắp theo TRẦN lương (`salaryMaxVnd`), tie-break bằng sàn. Việc không có
    // lương bị loại hẳn: một card `"Lương thương lượng"` đứng trong dải lương cao nhất là nói sai.
    topPaid: eligible
      .filter(({ job }) => job.salaryMinVnd !== null)
      .sort((a, b) => (b.job.salaryMaxVnd ?? 0) - (a.job.salaryMaxVnd ?? 0) || (b.job.salaryMinVnd ?? 0) - (a.job.salaryMinVnd ?? 0))
      .slice(0, overviewStripSize)
      .map(({ job }) => job),
  };

  const search = opts.q?.trim();
  const area = opts.area?.trim();
  const shift = opts.shift?.trim();

  // hrp-p1-a1 (correction batch 1/1, C-06) — lọc legacy `PRJ-xxx` ở listing:
  //   Khi `q` khớp chính xác shape mã dự án (chỉ chữ cái ASCII không dấu, chữ số, gạch dưới,
  //   gạch ngang; phải có ít nhất một gạch ngang/gạch dưới; bắt đầu bằng chữ HOA), so CHÍNH XÁC
  //   `Project.code` thay vì `keywordHaystack` để:
  //     1. KHÔNG chọn ngẫu nhiên một posting trong project — chuyển sang danh sách đã lọc.
  //     2. Project không có PUBLISHED posting nào → trả 0 dòng (KHÔNG leak DRAFT/ARCHIVED — đã
  //        filter ở tầng `where` của Prisma).
  //     3. Khớp phân biệt HOA/thường, KHÔNG fold dấu — đây là chuỗi do HR tự đặt.
  //   Yêu cầu có `-` hoặc `_` để tránh đụng với truy vấn tiếng Việt ngắn (ví dụ `Hanoi` không
  //   chứa `-` nên không bị bắt nhầm thành mã dự án).
  //   Nếu `q` không có shape mã dự án thì chuyển về `keywordHaystack` như cũ.
  const PROJECT_CODE_RE = /^[A-Z][A-Z0-9]*[-_][A-Za-z0-9_-]*$/;
  const isProjectCodeQuery = !!search && PROJECT_CODE_RE.test(search);
  const matched = eligible
    .filter(({ row, job }) => {
      if (!search) return true;
      if (isProjectCodeQuery) return row.projectCode === search;
      return keywordHaystack(row, job, now).includes(foldVietnamese(search));
    })
    .filter(({ row, job }) => !area || areaHaystack(row, job).includes(foldVietnamese(area)))
    // Khớp trên CẢ mảng `shifts`: một việc hai kíp phải tìm ra được bằng kíp thứ hai, không chỉ bằng
    // kíp đứng đầu. Đây là chính giá trị mà facet `shifts` chào ra cho UI.
    .filter(({ job }) => !shift || job.shifts.some((label) => label.includes(shift)))
    .filter(({ job }) => !opts.shiftTypes?.length || (job.shiftType !== null && opts.shiftTypes.includes(job.shiftType)))
    .filter(({ job }) => !opts.jobTypes?.length || opts.jobTypes.includes(job.jobType))
    // DEC-02: filter URGENT BEFORE pagination — total and nextOffset describe the filtered set
    .filter(({ job }) => !opts.urgency || job.urgency === 'URGENT');

  // DEC-06: `total` là số việc THẬT sau lifecycle và sau filter; `nextOffset` chỉ khác null khi còn
  // dòng phía sau. Cả trang và tổng đều tính từ cùng một mảng, nên không thể lệch nhau.
  const jobs = matched.map(({ job }) => job);
  const page = jobs.slice(offset, offset + limit);
  return { jobs: page, nextOffset: offset + limit < jobs.length ? offset + limit : null, total: jobs.length, facets, overview };
}

export async function getPublicJobProjection(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDto | null> {
  const now = new Date();
  // hrp-p1-a1: canonical slug thuộc JobPosting, đối chiếu bằng `slug` (không phải `Project.code`).
  // Chỉ các bản ghi `status='PUBLISHED'` mới lên card; DRAFT/ARCHIVED trả null (→ 404 tại route).
  const posting = await tx.jobPosting.findFirst({ where: { slug, status: 'PUBLISHED' }, select: publicSelect });
  if (!posting) return null;
  const row = projectRowFromPosting(posting);
  return row ? toDto(row, now) : null;
}

/**
 * go-live-12 / RQ-01, RQ-02: dùng ĐÚNG hằng `publicSelect` đang có và ĐÚNG điều kiện `where`
 * của `getPublicJobProjection`. Không `select` thứ hai, không thêm khóa quan hệ nào — đó là điều
 * kiện để query engine không phải materialize bảng bị RLS che (xem comment của `publicSelect`).
 *
 * hrp-p1-a1: canonical slug resolve bằng `JobPosting.slug` với `status='PUBLISHED'`; một JobPosting
 * có đúng một JobOpening và một StaffingOrder — chuỗi mapping giữ nguyên kiểu `PublicProjectRow`
 * để mapper phía dưới không phải đổi.
 */
export async function getPublicJobDetail(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDetailDto | null> {
  const now = new Date();
  const posting = await tx.jobPosting.findFirst({ where: { slug, status: 'PUBLISHED' }, select: publicSelect });
  if (!posting) return null;
  const row = projectRowFromPosting(posting);
  if (!row) return null;
  // hrp-p1-a1: truyền raw rich-text doc từ JobPosting vào DTO; Server Component
  // `app/(jobs)/viec-lam/[slug]/page.tsx` gọi `renderJobPostingRichText` ở request path.
  return toDetailDto(
    row,
    {
      descriptionJson: posting.descriptionJson,
      requirementsJson: posting.requirementsJson,
      benefitsJson: posting.benefitsJson,
      applicationInstructionsJson: posting.applicationInstructionsJson,
      contentSchemaVersion: posting.contentSchemaVersion,
      salaryDisplay: posting.salaryDisplay,
    },
    now,
  );
}
