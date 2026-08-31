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

function toDto(project: {
  id: string;
  code: string;
  name: string;
  siteAddress: string | null;
  staffingOrders: Array<{
    status: string;
    title: string;
    description: string | null;
    deadlineDate: Date | null;
    slots: Array<{ positionCode: string; positionTitle: string; slotsNeeded: number; slotsFilled: number; shiftStart: string | null; shiftEnd: string | null; validTo: Date | null; workLocation: string | null }>;
  }>;
}, now: Date): PublicJobDto | null {
  const slots = project.staffingOrders
    .filter((order) => VISIBLE_ORDER_STATUSES.includes(order.status) && !isExpired(order.deadlineDate, now))
    .flatMap((order) => order.slots.filter((slot) => !isExpired(slot.validTo, now)));
  const availableSlots = slots.reduce((sum, slot) => sum + Math.max(0, slot.slotsNeeded - slot.slotsFilled), 0);
  if (availableSlots <= 0 || slots.length === 0) return null;

  const first = slots[0];
  const shift = first.shiftStart && first.shiftEnd ? `${first.shiftStart}-${first.shiftEnd}` : first.shiftStart;
  const searchableText = [
    project.name,
    ...project.staffingOrders.flatMap((order) => [
      order.title,
      order.description ?? '',
      ...order.slots.flatMap((slot) => [slot.positionCode, slot.positionTitle]),
    ]),
  ].join(' ');
  const deadline = project.staffingOrders
    .map((order) => order.deadlineDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

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
