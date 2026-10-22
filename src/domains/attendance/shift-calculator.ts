/**
 * shift-calculator.ts
 *
 * Engine đối chiếu Ca làm việc của Dự án (`ProjectShift`) và tính toán
 * giờ công chuẩn (`regularHours`), tăng ca (`ot15Hours`, `ot20Hours`, `ot30Hours`),
 * số công (`workdays`) từ sự kiện chấm công thực tế (Mobile GPS / Máy chấm công CSV / Web).
 */
import type { Prisma } from '@prisma/client';

export interface ShiftDefinitionLike {
  id?: string;
  code: string;
  name?: string;
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  isOvernight?: boolean;
  breakMinutes: number;
  standardHours: number | Prisma.Decimal;
  graceLateMinutes?: number;
  graceEarlyMinutes?: number;
  isActive?: boolean;
}

export interface CalculatedAttendanceResult {
  shiftCode: string | null;
  regularHours: number;
  ot15Hours: number;
  ot20Hours: number;
  ot30Hours: number;
  otHours: number;
  workdays: number;
  isComplete: boolean;
  isOutsideShift: boolean;
}

const HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTimeMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const trimmed = hhmm.trim();
  const match = HH_MM_RE.exec(trimmed);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Khoảng cách ngắn nhất giữa 2 thời điểm (phút) trên vòng tròn 24 giờ (0..720).
 */
export function circularMinutesDistance(minA: number, minB: number): number {
  const diff = Math.abs(minA - minB) % 1440;
  return diff > 720 ? 1440 - diff : diff;
}

/**
 * Tự động map bản ghi chấm công vào 1 Ca làm việc cụ thể của Dự án:
 * 1. Nếu có `explicitShiftCode` (khác 'DEFAULT') khớp với ca trong dự án -> chọn ca đó.
 * 2. Nếu có `checkInTime` ('HH:mm') và dự án có danh sách ca đang hoạt động:
 *    - Nếu `assignmentShiftCode` khớp 1 ca và giờ vào lệch không quá 180 phút -> ưu tiên ca mặc định của NLĐ.
 *    - Ngược lại chọn ca có `startTime` gần `checkInTime` nhất.
 * 3. Nếu có `assignmentShiftCode` khớp với ca trong dự án -> chọn ca đó.
 * 4. Nếu dự án chỉ có 1 ca active duy nhất -> chọn ca đó.
 */
export function matchProjectShift<T extends ShiftDefinitionLike>(
  shifts: readonly T[],
  checkInTime?: string | null,
  explicitShiftCode?: string | null,
  assignmentShiftCode?: string | null,
): T | null {
  if (!shifts || shifts.length === 0) return null;

  const normExplicit =
    explicitShiftCode && explicitShiftCode.trim().toUpperCase() !== 'DEFAULT'
      ? explicitShiftCode.trim().toUpperCase()
      : null;

  if (normExplicit) {
    const exact = shifts.find((s) => s.code.trim().toUpperCase() === normExplicit);
    if (exact) return exact;
  }

  const activeShifts = shifts.filter((s) => s.isActive !== false);
  const pool = activeShifts.length > 0 ? activeShifts : shifts;

  const normAssignment =
    assignmentShiftCode && assignmentShiftCode.trim().toUpperCase() !== 'DEFAULT'
      ? assignmentShiftCode.trim().toUpperCase()
      : null;
  const assignedShift = normAssignment
    ? pool.find((s) => s.code.trim().toUpperCase() === normAssignment) ?? null
    : null;

  const inMinutes = parseTimeMinutes(checkInTime);
  if (inMinutes !== null) {
    if (assignedShift) {
      const assignedStart = parseTimeMinutes(assignedShift.startTime);
      if (assignedStart !== null && circularMinutesDistance(inMinutes, assignedStart) <= 180) {
        return assignedShift;
      }
    }

    let bestShift: T | null = null;
    let bestDist = Infinity;
    for (const shift of pool) {
      const startMin = parseTimeMinutes(shift.startTime);
      if (startMin === null) continue;
      const dist = circularMinutesDistance(inMinutes, startMin);
      if (dist < bestDist) {
        bestDist = dist;
        bestShift = shift;
      }
    }
    if (bestShift) return bestShift;
  }

  if (assignedShift) return assignedShift;
  if (pool.length === 1) return pool[0]!;
  return pool[0] ?? null;
}

/**
 * Tính toán giờ công chuẩn (`regularHours`), tăng ca (`ot15/20/30`), và số công (`workdays`)
 * từ thời gian chấm công thực tế và cấu hình Ca làm việc (`ProjectShift`).
 */
export function calculateShiftAttendanceHours(params: {
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  shift?: ShiftDefinitionLike | null;
  fallbackShiftCode?: string | null;
  workDate?: Date;
  isHoliday?: boolean;
}): CalculatedAttendanceResult {
  const {
    checkInTime,
    checkOutTime,
    checkInAt,
    checkOutAt,
    shift,
    fallbackShiftCode,
    workDate,
    isHoliday = false,
  } = params;

  const resolvedShiftCode =
    shift?.code ??
    (fallbackShiftCode && fallbackShiftCode !== 'DEFAULT' ? fallbackShiftCode : null);

  let rawMinutes: number | null = null;

  if (
    checkInAt instanceof Date &&
    checkOutAt instanceof Date &&
    Number.isFinite(checkInAt.getTime()) &&
    Number.isFinite(checkOutAt.getTime()) &&
    checkOutAt.getTime() >= checkInAt.getTime()
  ) {
    rawMinutes = (checkOutAt.getTime() - checkInAt.getTime()) / 60_000;
  } else {
    const inMin = parseTimeMinutes(checkInTime);
    const outMinRaw = parseTimeMinutes(checkOutTime);
    if (inMin !== null && outMinRaw !== null) {
      const outMin = outMinRaw < inMin ? outMinRaw + 1440 : outMinRaw;
      rawMinutes = outMin - inMin;
    }
  }

  if (rawMinutes === null || rawMinutes <= 0) {
    return {
      shiftCode: resolvedShiftCode,
      regularHours: 0,
      ot15Hours: 0,
      ot20Hours: 0,
      ot30Hours: 0,
      otHours: 0,
      workdays: 0,
      isComplete: false,
      isOutsideShift: false,
    };
  }

  const standardHoursNum = shift ? Number(shift.standardHours) : 8;
  const standardHours =
    Number.isFinite(standardHoursNum) && standardHoursNum > 0 ? standardHoursNum : 8;
  const breakMinutes = shift ? Math.max(0, Number(shift.breakMinutes) || 0) : 0;

  // Trừ giờ nghỉ giữa ca khi tổng thời gian làm việc kéo dài qua nửa ca (>= 5 giờ)
  const netMinutes =
    breakMinutes > 0 && rawMinutes >= Math.max(300, breakMinutes * 2)
      ? Math.max(0, rawMinutes - breakMinutes)
      : rawMinutes;

  const totalHours = Math.round((netMinutes / 60) * 10) / 10;
  const regularHours = Math.min(totalHours, standardHours);
  const otHours = Math.max(0, Math.round((totalHours - standardHours) * 10) / 10);

  let ot15Hours = 0;
  let ot20Hours = 0;
  let ot30Hours = 0;

  if (otHours > 0) {
    if (isHoliday) {
      ot30Hours = otHours;
    } else if (workDate instanceof Date && workDate.getUTCDay() === 0) {
      ot20Hours = otHours;
    } else {
      ot15Hours = otHours;
    }
  }

  const workdays =
    standardHours > 0 ? Math.round((regularHours / standardHours) * 100) / 100 : 0;

  let isOutsideShift = false;
  if (shift) {
    const inMin = parseTimeMinutes(checkInTime);
    const startMin = parseTimeMinutes(shift.startTime);
    if (inMin !== null && startMin !== null) {
      const grace = Math.max(120, (shift.graceLateMinutes ?? 15) * 4);
      if (circularMinutesDistance(inMin, startMin) > grace) {
        isOutsideShift = true;
      }
    }
  }

  return {
    shiftCode: resolvedShiftCode,
    regularHours,
    ot15Hours,
    ot20Hours,
    ot30Hours,
    otHours,
    workdays,
    isComplete: true,
    isOutsideShift,
  };
}

/**
 * Đồng bộ kết quả chấm công đã tính theo ca của dự án vào `TimesheetPeriod` + `TimesheetLine`.
 * Nếu kỳ công tháng đó của dự án chưa tồn tại, tự động khởi tạo ở trạng thái `PENDING`.
 * Nếu kỳ công đã `LOCKED` hoặc `APPROVED`, giữ nguyên tính bất biến (ADR-013).
 */
export async function syncWorkerDayTimesheetLine(
  tx: Prisma.TransactionClient,
  params: {
    projectId: string;
    workerId: string;
    assignmentId?: string | null;
    workDate: Date;
    shiftCode: string | null;
    regularHours: number;
    ot15Hours: number;
    ot20Hours: number;
    ot30Hours: number;
    source: string;
    anomalyType?: string | null;
  },
): Promise<void> {
  const periodDelegate = (tx as unknown as { timesheetPeriod?: Prisma.TimesheetPeriodDelegate })
    .timesheetPeriod;
  const lineDelegate = (tx as unknown as { timesheetLine?: Prisma.TimesheetLineDelegate })
    .timesheetLine;

  if (!periodDelegate?.findFirst || !lineDelegate?.findFirst) {
    return;
  }

  const month = params.workDate.getUTCMonth() + 1;
  const year = params.workDate.getUTCFullYear();

  let period = await periodDelegate.findFirst({
    where: {
      projectId: params.projectId,
      month,
      year,
    },
    orderBy: { version: 'desc' },
    select: { id: true, status: true },
  });

  if (!period) {
    period = await periodDelegate.create({
      data: {
        projectId: params.projectId,
        month,
        year,
        status: 'PENDING',
        version: 1,
      },
      select: { id: true, status: true },
    });
  }

  if (period.status === 'LOCKED' || period.status === 'APPROVED') {
    return;
  }

  const existingLine = await lineDelegate.findFirst({
    where: {
      periodId: period.id,
      workerId: params.workerId,
      workDate: params.workDate,
    },
    select: { id: true },
  });

  const lineData = {
    projectId: params.projectId,
    assignmentId: params.assignmentId ?? null,
    shiftCode: params.shiftCode,
    regularHours: params.regularHours,
    ot15Hours: params.ot15Hours,
    ot20Hours: params.ot20Hours,
    ot30Hours: params.ot30Hours,
    source: params.source,
    anomalyType: params.anomalyType ?? null,
  };

  if (existingLine) {
    await lineDelegate.update({
      where: { id: existingLine.id },
      data: lineData,
    });
  } else {
    await lineDelegate.create({
      data: {
        periodId: period.id,
        workerId: params.workerId,
        workDate: params.workDate,
        ...lineData,
      },
    });
  }
}
