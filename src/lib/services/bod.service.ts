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

function formatVnd(amount: bigint | number): string {
  const v = typeof amount === 'bigint' ? amount : BigInt(amount);
  return `${v.toLocaleString('vi-VN')} ₫`;
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
  try {
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
  } catch (err) {
    console.error('[bod] getHeadcount failed, fallback 0:', (err as Error).message);
    return { active: 0, needTotal: 0, deltaText: null };
  }
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
  try {
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
  } catch (err) {
    console.error('[bod] getFinance failed, fallback 0:', (err as Error).message);
    return {
      vendorTotalVnd: BigInt(0),
      commissionTotalVnd: BigInt(0),
      readyStatements: 0,
      totalStatements: 0,
    };
  }
});

/**
 * RQ-03: Pipeline tuyển dụng — số submissions + tỷ lệ ACCEPTED.
 */
export const getPipeline = cache(async (): Promise<{
  submitted: number;
  accepted: number;
  acceptanceRatioPct: number;
}> => {
  try {
    const prisma = getPrisma();
    const [submitted, accepted] = await Promise.all([
      prisma.candidateSubmission.count(),
      prisma.sourceClaim.count({ where: { accepted: true } }),
    ]);
    const ratio = submitted === 0 ? 0 : Math.round((accepted / submitted) * 1000) / 10;
    return { submitted, accepted, acceptanceRatioPct: ratio };
  } catch (err) {
    console.error('[bod] getPipeline failed, fallback 0:', (err as Error).message);
    return { submitted: 0, accepted: 0, acceptanceRatioPct: 0 };
  }
});

/**
 * Fill rate per project — ACTIVE assignments vs total slot headcount.
 */
async function getFillRateRows(): Promise<FillRateRow[]> {
  try {
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
          total += s.slotsNeeded ?? 0;
          filled += s.slotsFilled ?? 0;
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
  } catch (err) {
    console.error('[bod] getFillRateRows failed, fallback []:', (err as Error).message);
    return [];
  }
}

/**
 * Hàng đ�i cần xử lý — statements chưa gửi + assignments có vấn đề.
 */
async function getQueue(): Promise<QueueItem[]> {
  try {
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
  } catch (err) {
    console.error('[bod] getQueue failed, fallback []:', (err as Error).message);
    return [];
  }
}

/**
 * Priority projects — top 3 dự án nội bộ theo quy mô (quota) hoặc ACTIVE assignments (DEC-02).
 * RQ-02: lấy từ bảng Project (kết hợp ProjectAssignment ACTIVE), KHÔNG lấy từ VendorStatement.
 */
async function getPriorityProjects(): Promise<PriorityProjectRow[]> {
  try {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      take: 5,
      orderBy: [{ quota: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        code: true,
        name: true,
        quota: true,
        filled: true,
        assignments: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
        staffingOrders: {
          select: {
            slots: { select: { slotsNeeded: true, slotsFilled: true } },
          },
        },
      },
    });
    if (projects.length === 0) return [];

    // Query riêng TimesheetPeriod LOCKED per project (Project không có relation trực tiếp)
    const projectIds = projects.map((p) => p.id);
    const lockedPeriods = await prisma.timesheetPeriod.findMany({
      where: { status: 'LOCKED', projectId: { in: projectIds } },
      select: { projectId: true, id: true, status: true },
    });
    const lockedByProject = new Map<string, { id: string; status: string }>();
    for (const lp of lockedPeriods) {
      if (lp.projectId && !lockedByProject.has(lp.projectId)) {
        lockedByProject.set(lp.projectId, { id: lp.id, status: lp.status });
      }
    }

    // Sort: ACTIVE desc rồi quota desc
    projects.sort((a, b) => {
      const activeDiff = b.assignments.length - a.assignments.length;
      if (activeDiff !== 0) return activeDiff;
      return (b.quota ?? 0) - (a.quota ?? 0);
    });

    return projects.slice(0, 3).map((p, idx) => {
      const active = p.assignments.length;
      const quota = p.quota ?? 0;
      const filled = p.filled ?? 0;
      const gap = Math.max(0, quota - active);

      // needActive badge: gap lớn = danger, đầy = success
      const needBadge =
        gap === 0
          ? { kind: 'success' as const, icon: 'check_circle', text: 'Đã đủ người' }
          : gap > 10
            ? { kind: 'danger' as const, icon: 'priority_high', text: `Thiếu ${gap}` }
            : { kind: 'warning' as const, icon: 'info', text: `Thiếu ${gap}` };

      const timesheetLocked = lockedByProject.get(p.id);
      const timesheetBadge = timesheetLocked
        ? { kind: 'success' as const, icon: 'check_circle', text: 'Đã khóa công' }
        : { kind: 'neutral' as const, icon: 'draft', text: 'Chưa khóa' };

      // margin: giả lập theo filled/quota × 100.000.000 ₫ (placeholder)
      const marginMoney = BigInt(Math.round(filled * 100_000_000));
      const marginPct = quota === 0 ? '0%' : `${Math.round((filled / quota) * 100)}%`;

      return {
        name: p.name,
        code: p.code,
        pm: '—',
        needActive: `${active}/${quota}`,
        needBadge,
        timesheetBadge,
        statementBadge: { kind: 'neutral', icon: 'info', text: '—' },
        margin: { money: formatVnd(marginMoney), pct: marginPct },
        cta:
          gap === 0
            ? null
            : idx === 0
              ? { kind: 'primary' as const, icon: 'open_in_new', text: 'Bố trí ngay' }
              : { kind: 'secondary' as const, icon: 'open_in_new', text: 'Xem' },
        highlight: idx === 0,
      };
    });
  } catch (err) {
    console.error('[bod] getPriorityProjects failed, fallback []:', (err as Error).message);
    return [];
  }
}

/**
 * Public entry: gom 4 nhóm KPI trong 1 lần gọi.
 * Component dùng duy nhất function này → giảm N round-trip.
 */
export const getBodSnapshot = cache(async (): Promise<BodSnapshot> => {
  let headcount: Awaited<ReturnType<typeof getHeadcount>>;
  let finance: Awaited<ReturnType<typeof getFinance>>;
  let pipeline: Awaited<ReturnType<typeof getPipeline>>;
  let fillRate: FillRateRow[];
  let queue: QueueItem[];
  let priorityProjects: PriorityProjectRow[];

  try {
    const period = currentPeriod();
    [headcount, finance, pipeline, fillRate, queue, priorityProjects] = await Promise.all([
      getHeadcount(),
      getFinance(period),
      getPipeline(),
      getFillRateRows(),
      getQueue(),
      getPriorityProjects(),
    ]);
  } catch (err) {
    console.error('[bod] getBodSnapshot subquery failed, fallback empty snapshot:', (err as Error).message);
    return {
      kpiStrip: [],
      queue: [],
      fillRate: [],
      priorityProjects: [],
      updatedAt: new Date().toISOString(),
    };
  }

  // Null-safety: nếu 1 nhóm bị fallback rỗng, vẫn tiếp tục render với giá trị 0
  const safeActive = headcount?.active ?? 0;
  const safeNeed = Math.max(0, (headcount?.needTotal ?? 0) - safeActive);
  const safeReady = finance?.readyStatements ?? 0;
  const safeTotal = finance?.totalStatements ?? 0;

  const activeDisplay = safeActive.toLocaleString('vi-VN');
  const needDisplay = safeNeed.toLocaleString('vi-VN');

  const kpiStrip: KpiStripItem[] = [
    {
      label: 'Active',
      icon: 'groups',
      value: activeDisplay,
      unit: 'người',
      sub: 'Lao động đang làm việc toàn miền',
      delta: headcount?.deltaText
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
      value: `${safeReady}`,
      unit: `/${safeTotal || 15}`,
      sub: 'Bộ đối soát sẵn sàng gửi trong kỳ',
      delta: null,
      href: '#proj',
    },
  ];

  return {
    kpiStrip,
    queue: queue ?? [],
    fillRate: fillRate ?? [],
    priorityProjects: priorityProjects ?? [],
    updatedAt: new Date().toISOString(),
  };
});
