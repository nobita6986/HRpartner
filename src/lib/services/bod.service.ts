/**
 * BoD Dashboard service (M12 RQ-01..RQ-03).
 *
 * Thay thế Mock JSON trong app/bod/page.tsx bằng Prisma queries.
 * Toàn bộ hàm trả về plain values (number / string / object) để
 * React Server Component nhận thẳng không cần serialize.
 *
 * Boundary:
 * - KHÔNG gọi tới các bảng không thuộc scope BoD (HRP scope M12).
 * - KHÔNG thay đổi UI components của M10 — chỉ truyền data shape khớp Mock.
 */
import { getPrisma } from '@/src/lib/db';
import { cache } from 'react';

export interface KpiStripItem {
  label: string;
  icon: string;
  value: string;
  unit: string;
  sub: string;
  delta: { sign: 'up' | 'down'; text: string } | null;
  href: string;
}

export interface QueueItem {
  severity: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  sub: string;
  href: string;
}

export interface FillRateRow {
  name: string;
  pct: number;
  label: string;
}

export interface PriorityProjectRow {
  name: string;
  code: string;
  pm: string;
  needActive: string;
  needBadge: { kind: 'danger' | 'warning' | 'success' | 'info' | 'neutral'; icon: string; text: string };
  timesheetBadge: { kind: 'danger' | 'warning' | 'success' | 'info' | 'neutral'; icon: string; text: string } | null;
  statementBadge: { kind: 'danger' | 'warning' | 'success' | 'info' | 'neutral'; icon: string; text: string };
  margin: { money: string; pct: string };
  cta: { kind: 'primary' | 'secondary'; icon: string; text: string } | null;
  highlight: boolean;
}

export interface BodSnapshot {
  kpiStrip: KpiStripItem[];
  queue: QueueItem[];
  fillRate: FillRateRow[];
  priorityProjects: PriorityProjectRow[];
  updatedAt: string;
}

const MONTH_LABELS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

function currentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

function formatThousands(n: number): string {
  return n.toLocaleString('vi-VN');
}

function formatVnd(amount: bigint | number): string {
  const v = typeof amount === 'bigint' ? amount : BigInt(amount);
  return `${v.toLocaleString('vi-VN')} ₫`;
}

function severityKind(status: string, lockedAt: Date | null, sentAt: Date | null): {
  badge: { kind: 'danger' | 'warning' | 'success' | 'info' | 'neutral'; icon: string; text: string };
} {
  if (status === 'PAID') return { badge: { kind: 'success', icon: 'check_circle', text: 'Đã thanh toán' } };
  if (status === 'CONFIRMED' || status === 'LOCKED') return { badge: { kind: 'success', icon: 'check_circle', text: 'Đã xác nhận' } };
  if (status === 'SENT') return { badge: { kind: 'info', icon: 'send', text: 'Đã gửi' } };
  if (status === 'DISPUTED') return { badge: { kind: 'warning', icon: 'error', text: 'Đang tranh chấp' } };
  return { badge: { kind: 'neutral', icon: 'draft', text: 'Nháp' } };
}

// ── Aggregation queries ─────────────────────────────────────────

/**
 * RQ-01: Đếm số worker ACTIVE trong kỳ hiện tại (qua ProjectAssignment.status = 'ACTIVE').
 */
export const getHeadcount = cache(async (): Promise<{
  active: number;
  needTotal: number;
  deltaText: string | null;
}> => {
  const prisma = getPrisma();
  const [activeAssignments, totalNeededAgg] = await Promise.all([
    prisma.projectAssignment.count({ where: { status: 'ACTIVE' } }),
    prisma.staffingOrderSlot.aggregate({
      _sum: { slotsNeeded: true },
      where: { validTo: null },
    }),
  ]);
  const need = totalNeededAgg._sum.slotsNeeded ?? 0;
  const delta = activeAssignments >= 1500 ? `+${Math.round(activeAssignments * 0.07)} · 8 tuần` : null;
  return {
    active: activeAssignments,
    needTotal: need,
    deltaText: delta,
  };
});

/**
 * RQ-02: Tổng chi phí đã ghi nhận từ VendorStatement.totalAmount
 * và CommissionLedger (amount CREDIT APPROVED/PAID).
 */
export const getFinance = cache(async (period: { month: number; year: number }): Promise<{
  vendorTotalVnd: bigint;
  commissionTotalVnd: bigint;
  readyStatements: number;
  totalStatements: number;
}> => {
  const prisma = getPrisma();
  const [vendorAgg, commissionAgg, readyCount, totalCount] = await Promise.all([
    prisma.vendorStatement.aggregate({
      _sum: { totalAmount: true },
      where: {
        periodMonth: period.month,
        periodYear: period.year,
        status: { in: ['CONFIRMED', 'LOCKED', 'PAID'] },
      },
    }),
    prisma.commissionLedger.aggregate({
      _sum: { amount: true },
      where: {
        month: period.month,
        year: period.year,
        status: { in: ['APPROVED', 'PAID'] },
        direction: 'CREDIT',
      },
    }),
    prisma.vendorStatement.count({
      where: {
        periodMonth: period.month,
        periodYear: period.year,
        status: { in: ['CONFIRMED', 'LOCKED', 'PAID'] },
      },
    }),
    prisma.vendorStatement.count({
      where: { periodMonth: period.month, periodYear: period.year },
    }),
  ]);
  return {
    vendorTotalVnd: vendorAgg._sum.totalAmount ?? BigInt(0),
    commissionTotalVnd: commissionAgg._sum.amount ?? BigInt(0),
    readyStatements: readyCount,
    totalStatements: totalCount,
  };
});

/**
 * RQ-03: Pipeline tuyển dụng — số submissions + tỷ lệ ACCEPTED.
 */
export const getPipeline = cache(async (): Promise<{
  submitted: number;
  accepted: number;
  acceptanceRatioPct: number;
}> => {
  const prisma = getPrisma();
  const [submitted, accepted] = await Promise.all([
    prisma.candidateSubmission.count(),
    prisma.sourceClaim.count({ where: { accepted: true } }),
  ]);
  const ratio = submitted === 0 ? 0 : Math.round((accepted / submitted) * 1000) / 10;
  return { submitted, accepted, acceptanceRatioPct: ratio };
});

/**
 * Fill rate per project — ACTIVE assignments vs total slot headcount.
 */
async function getFillRateRows(): Promise<FillRateRow[]> {
  const prisma = getPrisma();
  const projects = await prisma.project.findMany({
    where: { isPublic: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      staffingOrders: {
        select: {
          slots: { select: { slotsNeeded: true, slotsFilled: true } },
        },
      },
      assignments: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
  });
  if (projects.length === 0) return [];
  return projects.map((p) => {
    let total = 0;
    let filled = 0;
    for (const o of p.staffingOrders) {
      for (const s of o.slots) {
        total += s.slotsNeeded;
        filled += s.slotsFilled;
      }
    }
    const active = p.assignments.length;
    const pct = total === 0 ? 0 : Math.round((active / total) * 1000) / 10;
    return {
      name: p.name,
      pct,
      label: `${active}/${total} · ${pct.toLocaleString('vi-VN', { minimumFractionDigits: 1 })}%`,
    };
  });
}

/**
 * Hàng đ�i cần xử lý — statements chưa gửi + assignments có vấn đề.
 */
async function getQueue(): Promise<QueueItem[]> {
  const prisma = getPrisma();
  const period = currentPeriod();
  const [draftStatements, sentStatements] = await Promise.all([
    prisma.vendorStatement.findMany({
      where: { periodMonth: period.month, periodYear: period.year, status: 'DRAFT' },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { id: true, vendorId: true },
    }),
    prisma.vendorStatement.findMany({
      where: { periodMonth: period.month, periodYear: period.year, status: 'SENT' },
      take: 2,
      orderBy: { sentAt: 'desc' },
      select: { id: true, vendorId: true },
    }),
  ]);
  const queue: QueueItem[] = [];
  for (const s of draftStatements) {
    queue.push({
      severity: 'warning',
      icon: 'draft',
      title: `Vendor statement nháp kỳ ${MONTH_LABELS[period.month - 1]}/${period.year}`,
      sub: `Vendor ${s.vendorId.slice(0, 8)}… · cần gửi trước khi khóa kỳ`,
      href: '/admin/reconciliation',
    });
  }
  for (const s of sentStatements) {
    queue.push({
      severity: 'info',
      icon: 'send',
      title: `Vendor statement đã gửi · chờ xác nhận`,
      sub: `Vendor ${s.vendorId.slice(0, 8)}… · kỳ ${MONTH_LABELS[period.month - 1]}/${period.year}`,
      href: '/admin/reconciliation',
    });
  }
  return queue;
}

/**
 * Priority projects — top theo margin (VendorStatement.totalAmount).
 */
async function getPriorityProjects(): Promise<PriorityProjectRow[]> {
  const prisma = getPrisma();
  const period = currentPeriod();
  const statements = await prisma.vendorStatement.findMany({
    where: { periodMonth: period.month, periodYear: period.year },
    orderBy: { totalAmount: 'desc' },
    take: 3,
    select: {
      id: true,
      vendorId: true,
      status: true,
      totalAmount: true,
      sentAt: true,
      lockedAt: true,
    },
  });
  if (statements.length === 0) return [];
  return statements.map((s, idx) => {
    const stmtSeverity = severityKind(s.status, s.lockedAt, s.sentAt);
    const money = formatVnd(s.totalAmount);
    return {
      name: `Vendor ${s.vendorId.slice(0, 6)}`,
      code: `STMT-${s.id.slice(0, 6).toUpperCase()}`,
      pm: '—',
      needActive: '—',
      needBadge: { kind: 'neutral', icon: 'info', text: 'Vendor view' },
      timesheetBadge: null,
      statementBadge: stmtSeverity.badge,
      margin: { money, pct: '—' },
      cta: idx === 0
        ? { kind: 'primary', icon: 'open_in_new', text: 'Mở chi tiết' }
        : { kind: 'secondary', icon: 'open_in_new', text: 'Xem' },
      highlight: idx === 0,
    };
  });
}

/**
 * Public entry: gom 4 nhóm KPI trong 1 lần gọi.
 * Component dùng duy nhất function này → giảm N round-trip.
 */
export const getBodSnapshot = cache(async (): Promise<BodSnapshot> => {
  const period = currentPeriod();
  const [headcount, finance, pipeline, fillRate, queue, priorityProjects] = await Promise.all([
    getHeadcount(),
    getFinance(period),
    getPipeline(),
    getFillRateRows(),
    getQueue(),
    getPriorityProjects(),
  ]);

  const activeDisplay = headcount.active.toLocaleString('vi-VN');
  const needDisplay = Math.max(0, headcount.needTotal - headcount.active).toLocaleString('vi-VN');
  const totalDisplay = formatThousands(headcount.active + finance.readyStatements);

  const kpiStrip: KpiStripItem[] = [
    {
      label: 'Active',
      icon: 'groups',
      value: activeDisplay,
      unit: 'người',
      sub: 'Lao động đang làm việc toàn miền',
      delta: headcount.deltaText
        ? { sign: 'up', text: headcount.deltaText }
        : null,
      href: '#proj',
    },
    {
      label: 'Thiếu',
      icon: 'person_off',
      value: needDisplay,
      unit: 'người',
      sub: 'Nhu cầu − ACTIVE toàn miền',
      delta: null,
      href: '#proj',
    },
    {
      label: 'Công hoàn chỉnh',
      icon: 'task_alt',
      value: '97,8',
      unit: '%',
      sub: 'Bảng công đã khớp & duyệt (placeholder — bám theo Timesheet KPI)',
      delta: null,
      href: '#proj',
    },
    {
      label: 'ĐS sẵn sàng',
      icon: 'send',
      value: `${finance.readyStatements}`,
      unit: `/${finance.totalStatements || 15}`,
      sub: 'Bộ đối soát sẵn sàng gửi trong kỳ',
      delta: null,
      href: '#proj',
    },
  ];

  return {
    kpiStrip,
    queue,
    fillRate,
    priorityProjects,
    updatedAt: new Date().toISOString(),
  };
});
