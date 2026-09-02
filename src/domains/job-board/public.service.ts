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
  position: string;
  shift: string | null;
  location: string | null;
  shiftType: 'ca_ngay' | 'ca_dem' | null;
  jobType: 'toan_thoi_gian' | 'ban_thoi_gian' | 'thoi_vu';
  availableSlots: number;
  deadline: string | null;
  statusLabel: string;
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

export interface PublicJobListResult {
  jobs: PublicJobDto[];
  nextOffset: number | null;
  total: number;
  facets: PublicJobFacets;
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
 */
export interface PublicJobDetailDto extends PublicJobDto {
  jobCode: string;
  siteAddress: string | null;
  totalSlotsNeeded: number;
  totalSlotsFilled: number;
  positions: PublicJobPositionDto[];
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
type PublicSlotRow = { positionCode: string; positionTitle: string; slotsNeeded: number; slotsFilled: number; shiftStart: string | null; shiftEnd: string | null; validTo: Date | null; workLocation: string | null };
type PublicOrderRow = { status: string; title: string; description: string | null; deadlineDate: Date | null; slots: PublicSlotRow[] };
type PublicProjectRow = { id: string; code: string; name: string; siteAddress: string | null; staffingOrders: PublicOrderRow[] };

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
    .flatMap((order) => order.slots.filter((slot) => isSlotLive(slot, now)));
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
    ...project.staffingOrders.flatMap((order) => [
      order.title,
      order.description ?? '',
      ...order.slots.flatMap((slot) => [slot.positionCode, slot.positionTitle]),
    ]),
  ].join(' ');
}

/** Hạn nhận hồ sơ sớm nhất trong các đơn của dự án. */
function earliestDeadline(orders: PublicOrderRow[]): Date | null {
  return orders
    .map((order) => order.deadlineDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
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

  return {
    id: project.id,
    slug: project.code,
    title: project.name,
    // DEC-03: field đơn là phần tử ĐẦU của chính mảng summary đã sort, không phải chữ của một slot
    // ngẫu nhiên. Nhánh `??` chỉ đỡ trường hợp dữ liệu rỗng — `summarize` đã bỏ chuỗi trắng.
    position: summary.positionTitles[0] ?? slots[0].positionTitle,
    shift: summary.shifts[0] ?? null,
    location: summary.locations[0] ?? null,
    shiftType: classifyShift(slots),
    jobType: classifyJobType(searchableText, slots),
    availableSlots,
    deadline: deadline?.toISOString() ?? null,
    statusLabel: 'Đang tuyển',
    positionTitles: summary.positionTitles,
    locations: summary.locations,
    shifts: summary.shifts,
  };
}

/**
 * Projection của trang chi tiết (go-live-12 / RQ-01, RQ-03, DEC-14).
 *
 * KHÔNG thừa hưởng cửa chặn `availableSlots <= 0` của `toDto`: một việc đã đủ chỉ tiêu vẫn phải mở
 * được `200` vì link đã chia sẻ ra ngoài không được biến thành 404, và nút Ứng tuyển sẽ ở trạng thái
 * vô hiệu. Chỉ khi không còn slot nào còn hiệu lực thì mới trả null để trang `404`. Cửa của `toDto`
 * đúng cho danh sách — list không nên khoe việc đã đủ — và sai cho trang chi tiết.
 */
function toDetailDto(project: PublicProjectRow, now: Date): PublicJobDetailDto | null {
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
    statusLabel: availableSlots > 0 ? 'Đang tuyển' : 'Đã đủ chỉ tiêu',
    positionTitles: summary.positionTitles,
    locations: summary.locations,
    shifts: summary.shifts,
  };
}

// Chỉ scalar của `Project` cộng nhánh `staffingOrders`. CẤM select quan hệ bắt buộc trên bảng
// mà principal công khai `MKT` không đọc được (`client_companies`): query engine của Prisma phải
// materialize dòng liên quan cho mọi dòng trả về, không thấy thì ném `Inconsistent query result`
// trước khi `toDto` chạy, và mock `findMany` không tái lập được. Hàng rào: `public-select.static.test.ts`.
const publicSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  code: true,
  name: true,
  siteAddress: true,
  staffingOrders: {
    where: { status: { in: VISIBLE_ORDER_STATUSES } },
    select: {
      status: true,
      title: true,
      description: true,
      deadlineDate: true,
      slots: {
        select: { positionCode: true, positionTitle: true, slotsNeeded: true, slotsFilled: true, shiftStart: true, shiftEnd: true, validTo: true, workLocation: true },
      },
    },
  },
});

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
  opts: { q?: string; area?: string; shift?: string; shiftTypes?: string[]; jobTypes?: string[]; offset?: number; limit?: number } = {},
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
  const where: Prisma.ProjectWhereInput = {
    status: 'ACTIVE',
    isPublic: true,
    staffingOrders: { some: { status: { in: [...VISIBLE_ORDER_STATUSES] }, slots: { some: { slotsNeeded: { gt: 0 } } } } },
  };
  const projects = await tx.project.findMany({ where, select: publicSelect, orderBy: { createdAt: 'desc' } });

  // Giữ dòng gốc bên cạnh DTO: `q`/`area` cần `siteAddress` và tiêu đề đơn, hai thứ KHÔNG có trong
  // DTO công khai và không được thêm vào (allow-list `DEC-10`).
  const eligible: Array<{ row: PublicProjectRow; job: PublicJobDto }> = [];
  for (const project of projects) {
    const job = toDto(project, now);
    if (job) eligible.push({ row: project, job });
  }

  // DEC-08 — facet tính TRƯỚC filter, trên toàn tập hợp lệ.
  const facets: PublicJobFacets = {
    areas: summarize(eligible.flatMap(({ job }) => job.locations)),
    shifts: summarize(eligible.flatMap(({ job }) => job.shifts)),
  };

  const search = opts.q?.trim();
  const area = opts.area?.trim();
  const shift = opts.shift?.trim();
  const matched = eligible
    .filter(({ row, job }) => !search || keywordHaystack(row, job, now).includes(foldVietnamese(search)))
    .filter(({ row, job }) => !area || areaHaystack(row, job).includes(foldVietnamese(area)))
    // Khớp trên CẢ mảng `shifts`: một việc hai kíp phải tìm ra được bằng kíp thứ hai, không chỉ bằng
    // kíp đứng đầu. Đây là chính giá trị mà facet `shifts` chào ra cho UI.
    .filter(({ job }) => !shift || job.shifts.some((label) => label.includes(shift)))
    .filter(({ job }) => !opts.shiftTypes?.length || (job.shiftType !== null && opts.shiftTypes.includes(job.shiftType)))
    .filter(({ job }) => !opts.jobTypes?.length || opts.jobTypes.includes(job.jobType));

  // DEC-06: `total` là số việc THẬT sau lifecycle và sau filter; `nextOffset` chỉ khác null khi còn
  // dòng phía sau. Cả trang và tổng đều tính từ cùng một mảng, nên không thể lệch nhau.
  const jobs = matched.map(({ job }) => job);
  const page = jobs.slice(offset, offset + limit);
  return { jobs: page, nextOffset: offset + limit < jobs.length ? offset + limit : null, total: jobs.length, facets };
}

export async function getPublicJobProjection(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDto | null> {
  const now = new Date();
  const project = await tx.project.findFirst({ where: { OR: [{ code: slug }, { id: slug }], status: 'ACTIVE', isPublic: true }, select: publicSelect });
  return project ? toDto(project, now) : null;
}

/**
 * go-live-12 / RQ-01, RQ-02: dùng ĐÚNG hằng `publicSelect` đang có và ĐÚNG ba điều kiện `where`
 * của `getPublicJobProjection`. Không `select` thứ hai, không thêm khóa quan hệ nào — đó là điều
 * kiện để query engine không phải materialize bảng bị RLS che (xem comment của `publicSelect`).
 */
export async function getPublicJobDetail(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDetailDto | null> {
  const now = new Date();
  const project = await tx.project.findFirst({ where: { OR: [{ code: slug }, { id: slug }], status: 'ACTIVE', isPublic: true }, select: publicSelect });
  return project ? toDetailDto(project, now) : null;
}
