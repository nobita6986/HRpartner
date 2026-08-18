'use server';
/**
 * BCC-1 (V4): Worker Portal Actions — đọc trực tiếp từ V4 tables
 *
 * Thay vì đọc từ bảng tạm `portal_timesheets` (cũ),
 * action này JOIN từ V4 canonical tables:
 *
 *   workers
 *     └─< project_assignments     (mã NV trong dự án + salary_per_day_vnd)
 *           └─< timesheet_lines    (canonical chấm công — regular + OT)
 *   workers
 *     └─< worker_deductions       (các khoản khấu trừ đã APPLIED)
 *
 * Lợi ích:
 * - Không cần ETL Python đẩy dữ liệu vào bảng tạm nữa
 * - V4 là single source of truth
 * - Mọi thay đổi trên timesheet_lines → BCC thấy ngay
 *
 * Tra cứu theo:
 *   - employeeCode + projectId  → resolve ra Worker (qua ProjectAssignment)
 *   - period (month/year)       → lọc TimesheetLine trong kỳ
 *   - Sau đó tính payrollData từ regular/OT + salary_per_day_vnd
 */

import { getPrisma } from '@/src/lib/db';
import type {
  PayrollItem,
  PayrollSummary,
  DailyData,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (shared giữa server & client)
// ═══════════════════════════════════════════════════════════════════════════

export interface PortalTimesheetResult {
  data?: PortalTimesheetRow[];
  error?: string;
  source?: 'V4_CANONICAL';
}

export interface PortalTimesheetRow {
  id: string;                 // id của TimesheetLine (mỗi dòng là 1 ngày công)
  employeeCode: string;       // mã NV tại dự án
  fullName: string;
  project: string;            // projectId
  periodMonth: number;
  periodYear: number;
  totalWorkDays: number;      // tổng ngày công có regular_hours > 0
  otHours: number;            // tổng OT (1.5x + 2.0x + 3.0x)
  absentDays: number;         // số ngày không có timesheet_line (nghỉ)
  dailyData: DailyData[];
  payrollData: PayrollData;
  updatedAt: string;
}

export interface PayrollData {
  salaryItems: PayrollItem[];
  allowances: PayrollItem[];
  deductions: PayrollItem[];
  summary: PayrollSummary;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const HOURS_PER_DAY = 8;

// ═══════════════════════════════════════════════════════════════════════════
// FETCH OPTIONS (lấy danh sách project + period để fill dropdown)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchOptions(): Promise<{
  projects: string[];
  periods: string[];
}> {
  try {
    const prisma = getPrisma();

    // Projects from active assignments
    const assignments = await prisma.projectAssignment.findMany({
      where: { status: 'ACTIVE' },
      select: { projectId: true },
      distinct: ['projectId'],
    });
    const projects = assignments
      .map((a: { projectId: string }) => a.projectId)
      .filter(Boolean)
      .sort();

    // Periods from distinct (month, year) của timesheet_lines
    const lines = await prisma.timesheetLine.findMany({
      select: { workDate: true },
      distinct: ['workDate'],
    });
    const periodSet = new Set<string>();
    for (const l of lines) {
      const d = new Date(l.workDate);
      periodSet.add(`${d.getMonth() + 1}/${d.getFullYear()}`);
    }
    const periods = Array.from(periodSet).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yB - yA;
      return mB - mA;
    });

    return { projects, periods };
  } catch (error) {
    console.error('[V4 fetchOptions] Lỗi:', error);
    return { projects: [], periods: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH PORTAL TIMESHEET (entry point chính)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchPortalTimesheet(
  employeeCode: string,
  project: string,
  period: string,
): Promise<PortalTimesheetResult> {
  if (!employeeCode || employeeCode.trim() === '') {
    return { error: 'Vui lòng nhập mã thẻ.' };
  }
  if (!period.includes('/')) {
    return { error: 'Kỳ lương không hợp lệ.' };
  }

  const [month, year] = period.split('/').map(Number);

  try {
    const prisma = getPrisma();

    // 1. Tìm assignment theo (employeeCode + projectId) → ra Worker
    const assignment = await prisma.projectAssignment.findFirst({
      where: {
        employeeCode: { equals: employeeCode.trim(), mode: 'insensitive' },
        projectId: project,
      },
      include: { worker: true },
    });

    if (!assignment || !assignment.worker) {
      return { error: 'Không tìm thấy nhân viên với mã thẻ + dự án này.' };
    }

    const workerId = assignment.worker.id;

    // 2. Lấy tất cả timesheet_lines trong kỳ của worker này
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // exclusive

    const lines = await prisma.timesheetLine.findMany({
      where: {
        workerId,
        workDate: { gte: startDate, lt: endDate },
      },
      orderBy: { workDate: 'asc' },
    });

    if (lines.length === 0) {
      return {
        error: `Không có dữ liệu chấm công cho nhân viên này trong tháng ${month}/${year}.`,
      };
    }

    // 3. Lấy worker_deductions (APPLIED)
    const deductions = await prisma.workerDeduction.findMany({
      where: { workerId, status: 'APPLIED' },
    });

    // 4. Tính payrollData từ V4 lines
    const salaryPerDay = Number(assignment.salaryPerDayVnd ?? 0);
    const hourlyRate = salaryPerDay / HOURS_PER_DAY;

    const totalWorkDays = lines.filter(
      (l) => Number(l.regularHours) > 0,
    ).length;

    const totalOtHours = lines.reduce(
      (s, l) =>
        s + Number(l.ot15Hours) + Number(l.ot20Hours) + Number(l.ot30Hours),
      0,
    );

    // Số ngày expected - workDays (ước tính absent = working days của kỳ - có mặt)
    // Đơn giản: absent = số ngày lines không điền trong kỳ
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const absentDays = Math.max(0, totalDaysInMonth - totalWorkDays);

    // Build dailyData
    const dailyData: DailyData[] = lines.map((l: {
      id: string; workDate: Date;
      regularHours: any; ot15Hours: any; ot20Hours: any; ot30Hours: any;
      shiftCode: string | null; source: string;
    }) => {
      const reg = Number(l.regularHours);
      const ot15 = Number(l.ot15Hours);
      const ot20 = Number(l.ot20Hours);
      const ot30 = Number(l.ot30Hours);
      const totalOt = ot15 + ot20 + ot30;

      let status: 'WORKING' | 'OVERTIME' | 'LATE' | 'ABSENT' = 'WORKING';
      if (reg <= 0) status = 'ABSENT';
      else if (totalOt > 0) status = 'OVERTIME';

      return {
        date: isoDate(l.workDate),
        status,
        ot: totalOt > 0 ? totalOt : undefined,
        shiftType: l.shiftCode ?? undefined,
        breakdown: [
          { name: 'Giờ thường', hours: reg, rate: null },
          { name: 'OT 1.5x', hours: ot15, rate: 150 },
          { name: 'OT 2.0x', hours: ot20, rate: 200 },
          { name: 'OT 3.0x', hours: ot30, rate: 300 },
        ].filter((b) => b.hours > 0),
      };
    });

    // 5. Tính PayrollData
    const payrollData = computePayroll({
      salaryPerDay,
      hourlyRate,
      lines,
      deductions,
    });

    // 6. Trả về 1 row duy nhất (mỗi assignment = 1 portal view)
    const row: PortalTimesheetRow = {
      id: assignment.id, // dùng assignment.id làm portal row id
      employeeCode: assignment.employeeCode,
      fullName: assignment.worker.fullName ?? employeeCode,
      project: assignment.projectId,
      periodMonth: month,
      periodYear: year,
      totalWorkDays,
      otHours: totalOtHours,
      absentDays,
      dailyData,
      payrollData,
      updatedAt: new Date().toISOString(),
    };

    return { data: [row], source: 'V4_CANONICAL' };
  } catch (error) {
    console.error('[V4 fetchPortalTimesheet] Lỗi:', error);
    return { error: 'Có lỗi xảy ra trên server. Vui lòng thử lại sau.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isoDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface ComputePayrollArgs {
  salaryPerDay: number;
  hourlyRate: number;
  lines: Array<{
    regularHours: any;
    ot15Hours: any;
    ot20Hours: any;
    ot30Hours: any;
    allowance: unknown;
  }>;
  deductions: Array<{ amountVnd: any; reason: string }>;
}

function computePayroll(args: ComputePayrollArgs): PayrollData {
  const { salaryPerDay, hourlyRate, lines, deductions } = args;

  const totalRegularHrs = sum(lines, 'regularHours');
  const totalOt15 = sum(lines, 'ot15Hours');
  const totalOt20 = sum(lines, 'ot20Hours');
  const totalOt30 = sum(lines, 'ot30Hours');

  // A. Các khoản tính lương
  const salaryItems: PayrollItem[] = [];
  if (totalRegularHrs > 0) {
    salaryItems.push({
      name: 'Lương giờ thường',
      qty: totalRegularHrs,
      rate: hourlyRate,
      total: totalRegularHrs * hourlyRate,
    });
  }
  if (totalOt15 > 0) {
    salaryItems.push({
      name: 'OT 1.5x',
      qty: totalOt15,
      rate: hourlyRate * 1.5,
      total: totalOt15 * hourlyRate * 1.5,
    });
  }
  if (totalOt20 > 0) {
    salaryItems.push({
      name: 'OT 2.0x',
      qty: totalOt20,
      rate: hourlyRate * 2.0,
      total: totalOt20 * hourlyRate * 2.0,
    });
  }
  if (totalOt30 > 0) {
    salaryItems.push({
      name: 'OT 3.0x',
      qty: totalOt30,
      rate: hourlyRate * 3.0,
      total: totalOt30 * hourlyRate * 3.0,
    });
  }

  const totalSalary = salaryItems.reduce((s, i) => s + i.total, 0);

  // B. Phụ cấp từ JSON `allowance` trên mỗi timesheet_line (F19 canonical)
  // Tổng hợp tất cả allowances, group theo name
  const allowanceMap = new Map<string, number>();
  for (const l of lines) {
    if (!l.allowance) continue;
    const obj =
      typeof l.allowance === 'string'
        ? safeParse(l.allowance)
        : (l.allowance as Record<string, unknown>);
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      const amt = Number(v);
      if (Number.isFinite(amt) && amt !== 0) {
        allowanceMap.set(k, (allowanceMap.get(k) ?? 0) + amt);
      }
    }
  }
  const allowances: PayrollItem[] = Array.from(allowanceMap.entries()).map(
    ([name, total]) => ({
      name,
      qty: null,
      rate: null,
      total,
    }),
  );
  const totalAllowance = allowances.reduce((s, i) => s + i.total, 0);

  // D. WorkerDeduction (APPLIED)
  const deductionItems: PayrollItem[] = deductions.map((d) => ({
    name: d.reason,
    qty: null,
    rate: null,
    total: Number(d.amountVnd),
  }));
  const totalDeduction = deductionItems.reduce((s, i) => s + i.total, 0);

  const grossIncome = totalSalary + totalAllowance;
  const netIncome = grossIncome - totalDeduction;

  const summary: PayrollSummary = {
    totalSalary,
    totalAllowance,
    grossIncome,
    totalDeduction,
    netIncome,
  };

  return {
    salaryItems,
    allowances,
    deductions: deductionItems,
    summary,
  };
}

function sum(
  rows: Array<Record<string, any>>,
  key: string,
): number {
  return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
