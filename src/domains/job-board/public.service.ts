import { Prisma } from '@prisma/client';

export interface PublicJobDto {
  id: string;
  slug: string;
  title: string;
  position: string;
  shift: string | null;
  location: string | null;
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
    deadlineDate: Date | null;
    slots: Array<{ positionTitle: string; slotsNeeded: number; slotsFilled: number; shiftStart: string | null; shiftEnd: string | null; validTo: Date | null; workLocation: string | null }>;
  }>;
}, now: Date): PublicJobDto | null {
  const slots = project.staffingOrders
    .filter((order) => VISIBLE_ORDER_STATUSES.includes(order.status) && !isExpired(order.deadlineDate, now))
    .flatMap((order) => order.slots.filter((slot) => !isExpired(slot.validTo, now)));
  const availableSlots = slots.reduce((sum, slot) => sum + Math.max(0, slot.slotsNeeded - slot.slotsFilled), 0);
  if (availableSlots <= 0 || slots.length === 0) return null;

  const first = slots[0];
  const shift = first.shiftStart && first.shiftEnd ? `${first.shiftStart}-${first.shiftEnd}` : first.shiftStart;
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
    availableSlots,
    deadline: deadline?.toISOString() ?? null,
    statusLabel: 'Đang tuyển',
  };
}

const publicSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  code: true,
  name: true,
  siteAddress: true,
  staffingOrders: {
    where: { status: { in: VISIBLE_ORDER_STATUSES } },
    select: {
      status: true,
      deadlineDate: true,
      slots: {
        select: { positionTitle: true, slotsNeeded: true, slotsFilled: true, shiftStart: true, shiftEnd: true, validTo: true, workLocation: true },
      },
    },
  },
});

type PublicProject = Prisma.ProjectGetPayload<{ select: typeof publicSelect }>;

export async function listPublicJobProjection(
  tx: Prisma.TransactionClient,
  opts: { q?: string; area?: string; shift?: string; offset?: number; limit?: number } = {},
): Promise<PublicJobListResult> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const search = opts.q?.trim();
  const where: Prisma.ProjectWhereInput = {
    status: 'ACTIVE',
    isPublic: true,
    staffingOrders: { some: { status: { in: [...VISIBLE_ORDER_STATUSES] }, slots: { some: { slotsNeeded: { gt: 0 } } } } },
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
    ...(opts.area ? { siteAddress: { contains: opts.area, mode: 'insensitive' } } : {}),
  };
  const [projects, total] = await Promise.all([
    tx.project.findMany({ where, select: publicSelect, orderBy: { createdAt: 'desc' }, skip: offset, take: limit + 1 }),
    tx.project.count({ where }),
  ]);
  const jobs = projects.map((project) => toDto(project, new Date())).filter((job): job is PublicJobDto => Boolean(job)).filter((job) => !opts.shift || job.shift?.includes(opts.shift));
  return { jobs: jobs.slice(0, limit), nextOffset: projects.length > limit ? offset + limit : null, total };
}

export async function getPublicJobProjection(tx: Prisma.TransactionClient, slug: string): Promise<PublicJobDto | null> {
  const project = await tx.project.findFirst({ where: { OR: [{ code: slug }, { id: slug }], status: 'ACTIVE', isPublic: true }, select: publicSelect });
  return project ? toDto(project, new Date()) : null;
}
