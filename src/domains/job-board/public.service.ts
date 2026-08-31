import { Prisma } from '@prisma/client';

export interface PublicJobDto {
  id: string;
  slug: string;
  title: string;
  position: string;
  shift: string | null;
  location: string | null;
  industry: string;
  shiftType: 'ca_ngay' | 'ca_dem' | 'xoay_ca' | null;
  jobType: 'toan_thoi_gian' | 'ban_thoi_gian' | 'thoi_vu';
  availableSlots: number;
  deadline: string | null;
  statusLabel: string;
}

export interface PublicJobListResult {
  jobs: PublicJobDto[];
  nextOffset: number | null;
  total: number;
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

function classifyShift(slots: Array<{ shiftStart: string | null; shiftEnd: string | null }>): ShiftType | null {
  const ranges = slots
    .filter((slot) => slot.shiftStart || slot.shiftEnd)
    .map((slot) => `${slot.shiftStart ?? ''}-${slot.shiftEnd ?? ''}`);
  if (new Set(ranges).size > 1) return 'xoay_ca';

  const start = minutesOfDay(slots[0]?.shiftStart ?? null);
  const end = minutesOfDay(slots[0]?.shiftEnd ?? null);
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

function inferIndustry(text: string, fallback: string | null): string {
  const folded = foldVietnamese(`${text} ${fallback ?? ''}`);
  if (/kho|van tai|logistic|warehouse/.test(folded)) return 'Kho vận';
  if (/may mac|may cong nghiep|garment|sewing/.test(folded)) return 'May mặc';
  if (/thuc pham|food/.test(folded)) return 'Thực phẩm';
  if (/dien|dien tu|electronic|electric/.test(folded)) return 'Điện tử';
  return fallback?.trim() || 'Công nghiệp chế tạo';
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

/** Text để suy `industry` và `jobType`. Gộp mọi trường text đã select; KHÔNG in ra bề mặt nào. */
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
  const slots = visibleSlots(project.staffingOrders, now);
  const availableSlots = slots.reduce((sum, slot) => sum + slotAvailable(slot), 0);
  if (availableSlots <= 0 || slots.length === 0) return null;

  const first = slots[0];
  const shift = slotShiftLabel(first);
  const searchableText = searchableTextOf(project);
  const deadline = earliestDeadline(project.staffingOrders);

  return {
    id: project.id,
    slug: project.code,
    title: project.name,
    position: first.positionTitle,
    shift,
    location: first.workLocation ?? project.siteAddress,
    industry: inferIndustry(searchableText, null),
    shiftType: classifyShift(slots),
    jobType: classifyJobType(searchableText, slots),
    availableSlots,
    deadline: deadline?.toISOString() ?? null,
    statusLabel: 'Đang tuyển',
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
  const slots = visibleSlots(project.staffingOrders, now);
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

  const first = slots[0];
  const searchableText = searchableTextOf(project);
  const deadline = earliestDeadline(project.staffingOrders);

  return {
    id: project.id,
    slug: project.code,
    jobCode: project.code,
    title: project.name,
    position: first.positionTitle,
    shift: slotShiftLabel(first),
    location: first.workLocation ?? project.siteAddress,
    siteAddress: project.siteAddress,
    industry: inferIndustry(searchableText, null),
    shiftType: classifyShift(slots),
    jobType: classifyJobType(searchableText, slots),
    availableSlots,
    totalSlotsNeeded: positions.reduce((sum, position) => sum + position.slotsNeeded, 0),
    totalSlotsFilled: positions.reduce((sum, position) => sum + position.slotsFilled, 0),
    positions,
    deadline: deadline?.toISOString() ?? null,
    statusLabel: availableSlots > 0 ? 'Đang tuyển' : 'Đã đủ chỉ tiêu',
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

export async function listPublicJobProjection(
  tx: Prisma.TransactionClient,
  opts: { q?: string; area?: string; industry?: string; shift?: string; shiftTypes?: string[]; jobTypes?: string[]; offset?: number; limit?: number } = {},
): Promise<PublicJobListResult> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const search = opts.q?.trim();
  const filters: Prisma.ProjectWhereInput[] = [];
  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { siteAddress: { contains: search, mode: 'insensitive' } },
        { staffingOrders: { some: { OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slots: { some: { OR: [
            { positionTitle: { contains: search, mode: 'insensitive' } },
            { workLocation: { contains: search, mode: 'insensitive' } },
          ] } } },
        ] } } },
      ],
    });
  }
  if (opts.area) {
    filters.push({
      OR: [
        { siteAddress: { contains: opts.area, mode: 'insensitive' } },
        { staffingOrders: { some: { slots: { some: { workLocation: { contains: opts.area, mode: 'insensitive' } } } } } },
      ],
    });
  }
  const where: Prisma.ProjectWhereInput = {
    status: 'ACTIVE',
    isPublic: true,
    staffingOrders: { some: { status: { in: [...VISIBLE_ORDER_STATUSES] }, slots: { some: { slotsNeeded: { gt: 0 } } } } },
    ...(filters.length ? { AND: filters } : {}),
  };
  const projects = await tx.project.findMany({ where, select: publicSelect, orderBy: { createdAt: 'desc' } });
  const jobs = projects
    .map((project) => toDto(project, new Date()))
    .filter((job): job is PublicJobDto => Boolean(job))
    .filter((job) => !opts.shift || job.shift?.includes(opts.shift))
    .filter((job) => !opts.industry || foldVietnamese(job.industry) === foldVietnamese(opts.industry))
    .filter((job) => !opts.shiftTypes?.length || (job.shiftType !== null && opts.shiftTypes.includes(job.shiftType)))
    .filter((job) => !opts.jobTypes?.length || opts.jobTypes.includes(job.jobType));
  const page = jobs.slice(offset, offset + limit);
  return { jobs: page, nextOffset: offset + limit < jobs.length ? offset + limit : null, total: jobs.length };
}

export async function getPublicJobProjection(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDto | null> {
  const project = await tx.project.findFirst({ where: { OR: [{ code: slug }, { id: slug }], status: 'ACTIVE', isPublic: true }, select: publicSelect });
  return project ? toDto(project, new Date()) : null;
}

/**
 * go-live-12 / RQ-01, RQ-02: dùng ĐÚNG hằng `publicSelect` đang có và ĐÚNG ba điều kiện `where`
 * của `getPublicJobProjection`. Không `select` thứ hai, không thêm khóa quan hệ nào — đó là điều
 * kiện để query engine không phải materialize bảng bị RLS che (xem comment của `publicSelect`).
 */
export async function getPublicJobDetail(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDetailDto | null> {
  const project = await tx.project.findFirst({ where: { OR: [{ code: slug }, { id: slug }], status: 'ACTIVE', isPublic: true }, select: publicSelect });
  return project ? toDetailDto(project, new Date()) : null;
}
