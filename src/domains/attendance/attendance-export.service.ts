/**
 * attendance-export.service.ts
 *
 * Truy vấn và tổng hợp dữ liệu chấm công của toàn bộ Người lao động (NLĐ) có phát sinh chấm công
 * (từ cả `TimesheetLine` lẫn `AttendanceEvent` GPS/Máy chấm công), đối chiếu với Dự án,
 * Phân công (`ProjectAssignment`), Ca làm việc (`ProjectShift`), Địa điểm (`Site`)
 * và xuất ra định dạng Excel (.xlsx) chuẩn gồm 2 sheet:
 *   1. "Tổng hợp công NLĐ" (gom theo NLĐ + Dự án + Ca làm việc)
 *   2. "Chi tiết chấm công" (chi tiết từng ngày làm việc của NLĐ)
 */

import type { Prisma } from '@prisma/client';
import { buildXlsxBuffer } from '@/src/shared/utils/xlsx';
import {
  calculateShiftAttendanceHours,
  matchProjectShift,
  type ShiftDefinitionLike,
} from './shift-calculator';

export interface AttendanceExportFilter {
  periodId?: string;
  projectId?: string;
  month?: number;
  year?: number;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

export interface AttendanceExportDetailRow {
  stt: number;
  workDate: string;
  workerId: string;
  workerUserId: string;
  employeeCode: string;
  workerName: string;
  workerPhone: string;
  workerCccd: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  siteName: string;
  shiftCode: string;
  shiftName: string;
  standardHours: number;
  checkInTime: string;
  checkOutTime: string;
  regularHours: number;
  ot15Hours: number;
  ot20Hours: number;
  ot30Hours: number;
  otHours: number;
  totalHours: number;
  workdays: number;
  source: string;
  statusNote: string;
}

export interface AttendanceExportSummaryRow {
  stt: number;
  workerId: string;
  workerUserId: string;
  employeeCode: string;
  workerName: string;
  workerPhone: string;
  workerCccd: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  shiftCode: string;
  shiftName: string;
  standardHours: number;
  totalDays: number;
  completedDays: number;
  totalWorkdays: number;
  totalRegularHours: number;
  totalOt15Hours: number;
  totalOt20Hours: number;
  totalOt30Hours: number;
  totalOtHours: number;
  totalHours: number;
}

export interface AttendanceExportResult {
  summaryRows: AttendanceExportSummaryRow[];
  detailRows: AttendanceExportDetailRow[];
}

function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sourceLabelVi(source: string): string {
  switch (source) {
    case 'GPS':
    case 'GPS_SELFIE':
      return 'Chấm công GPS (App)';
    case 'DEVICE':
    case 'MACHINE':
    case 'IMPORTED':
      return 'Máy chấm công / Import';
    case 'MANUAL':
      return 'Nhập thủ công';
    case 'ADJUSTMENT':
      return 'Điều chỉnh công';
    default:
      return source || 'Khác';
  }
}

export async function collectAttendanceExportData(
  tx: Prisma.TransactionClient,
  filter: AttendanceExportFilter = {},
): Promise<AttendanceExportResult> {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let effectiveProjectId = filter.projectId?.trim() || undefined;

  if (filter.periodId) {
    const period = await tx.timesheetPeriod.findUnique({
      where: { id: filter.periodId },
      select: { month: true, year: true, projectId: true },
    });
    if (period) {
      startDate = new Date(Date.UTC(period.year, period.month - 1, 1));
      endDate = new Date(Date.UTC(period.year, period.month, 0));
      if (!effectiveProjectId && period.projectId) {
        effectiveProjectId = period.projectId;
      }
    }
  } else if (filter.month && filter.year) {
    startDate = new Date(Date.UTC(filter.year, filter.month - 1, 1));
    endDate = new Date(Date.UTC(filter.year, filter.month, 0));
  } else {
    if (filter.fromDate && /^\d{4}-\d{2}-\d{2}$/.test(filter.fromDate)) {
      startDate = new Date(`${filter.fromDate}T00:00:00.000Z`);
    }
    if (filter.toDate && /^\d{4}-\d{2}-\d{2}$/.test(filter.toDate)) {
      endDate = new Date(`${filter.toDate}T00:00:00.000Z`);
    }
  }

  const dateWhere: Prisma.DateTimeFilter | undefined =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : undefined;

  const [timesheetLines, attendanceEvents] = await Promise.all([
    tx.timesheetLine.findMany({
      where: {
        ...(filter.periodId ? { periodId: filter.periodId } : {}),
        ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
        ...(dateWhere ? { workDate: dateWhere } : {}),
      },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'asc' }],
    }),
    tx.attendanceEvent.findMany({
      where: {
        workerId: { not: null },
        ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
        ...(dateWhere ? { workDate: dateWhere } : {}),
      },
      include: {
        site: { select: { id: true, name: true } },
      },
      orderBy: [{ workDate: 'desc' }, { receivedAt: 'asc' }],
    }),
  ]);

  const workerIdSet = new Set<string>();
  const projectIdSet = new Set<string>();

  for (const line of timesheetLines) {
    workerIdSet.add(line.workerId);
    if (line.projectId) projectIdSet.add(line.projectId);
  }
  for (const ev of attendanceEvents) {
    if (ev.workerId) workerIdSet.add(ev.workerId);
    if (ev.projectId) projectIdSet.add(ev.projectId);
  }

  if (workerIdSet.size === 0) {
    return { summaryRows: [], detailRows: [] };
  }

  const workerIds = Array.from(workerIdSet);

  const [workers, assignments] = await Promise.all([
    tx.worker.findMany({
      where: { id: { in: workerIds } },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
        cccdNumber: true,
        account: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    }),
    tx.projectAssignment.findMany({
      where: {
        workerId: { in: workerIds },
        ...(effectiveProjectId ? { projectId: effectiveProjectId } : {}),
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
      select: {
        id: true,
        workerId: true,
        projectId: true,
        employeeCode: true,
        shiftCode: true,
        status: true,
      },
    }),
  ]);

  for (const asg of assignments) {
    projectIdSet.add(asg.projectId);
  }

  const projectIds = Array.from(projectIdSet);
  const shiftDelegate = (tx as unknown as { projectShift?: Prisma.ProjectShiftDelegate }).projectShift;

  const [projects, shifts] = await Promise.all([
    projectIds.length > 0
      ? tx.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
    projectIds.length > 0 && shiftDelegate?.findMany
      ? shiftDelegate.findMany({
          where: { projectId: { in: projectIds } },
          orderBy: [{ isActive: 'desc' }, { startTime: 'asc' }],
        })
      : Promise.resolve([]),
  ]);

  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const shiftsByProject = new Map<string, ShiftDefinitionLike[]>();
  for (const s of shifts) {
    const list = shiftsByProject.get(s.projectId) ?? [];
    list.push(s);
    shiftsByProject.set(s.projectId, list);
  }

  // Map assignments by `${workerId}:${projectId}` and fallback by `workerId`
  const assignmentByWorkerProject = new Map<string, (typeof assignments)[number]>();
  const primaryAssignmentByWorker = new Map<string, (typeof assignments)[number]>();
  for (const asg of assignments) {
    const wpKey = `${asg.workerId}:${asg.projectId}`;
    if (!assignmentByWorkerProject.has(wpKey)) {
      assignmentByWorkerProject.set(wpKey, asg);
    }
    if (!primaryAssignmentByWorker.has(asg.workerId) || asg.status === 'ACTIVE') {
      primaryAssignmentByWorker.set(asg.workerId, asg);
    }
  }

  // Group events and lines by `${workerId}:${workDateYmd}`
  interface DayBucket {
    workerId: string;
    workDate: Date;
    workDateStr: string;
    line?: (typeof timesheetLines)[number];
    events: (typeof attendanceEvents)[number][];
  }

  const dayBuckets = new Map<string, DayBucket>();

  for (const line of timesheetLines) {
    const workDateStr = formatDateYmd(line.workDate);
    const key = `${line.workerId}:${workDateStr}`;
    const existing = dayBuckets.get(key);
    if (existing) {
      existing.line = line;
    } else {
      dayBuckets.set(key, {
        workerId: line.workerId,
        workDate: line.workDate,
        workDateStr,
        line,
        events: [],
      });
    }
  }

  for (const ev of attendanceEvents) {
    if (!ev.workerId) continue;
    const workDateStr = formatDateYmd(ev.workDate);
    const key = `${ev.workerId}:${workDateStr}`;
    const existing = dayBuckets.get(key);
    if (existing) {
      existing.events.push(ev);
    } else {
      dayBuckets.set(key, {
        workerId: ev.workerId,
        workDate: ev.workDate,
        workDateStr,
        events: [ev],
      });
    }
  }

  const rawDetailRows: Omit<AttendanceExportDetailRow, 'stt'>[] = [];

  for (const bucket of dayBuckets.values()) {
    const worker = workerMap.get(bucket.workerId);
    const primaryAsg = primaryAssignmentByWorker.get(bucket.workerId);

    const projectId =
      bucket.line?.projectId ??
      bucket.events.find((e) => e.projectId)?.projectId ??
      primaryAsg?.projectId ??
      '';

    if (effectiveProjectId && projectId !== effectiveProjectId) {
      continue;
    }

    const asg =
      assignmentByWorkerProject.get(`${bucket.workerId}:${projectId}`) ?? primaryAsg;
    const project = projectMap.get(projectId);
    const projectShifts = shiftsByProject.get(projectId) ?? [];

    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    let checkInAt: Date | null = null;
    let checkOutAt: Date | null = null;
    let siteName = '';
    let eventShiftCode: string | null = null;
    let eventSource = bucket.line?.source ?? '';

    for (const ev of bucket.events) {
      if (ev.site?.name && !siteName) siteName = ev.site.name;
      if (ev.shiftCode && ev.shiftCode !== 'DEFAULT') eventShiftCode = ev.shiftCode;
      if (!eventSource && ev.source) eventSource = ev.source;

      if (ev.mobileAction === 'CHECK_IN') {
        checkInTime = ev.checkInTime ?? checkInTime;
        checkInAt = ev.receivedAt ?? checkInAt;
      } else if (ev.mobileAction === 'CHECK_OUT') {
        checkOutTime = ev.checkOutTime ?? checkOutTime;
        checkOutAt = ev.receivedAt ?? checkOutAt;
      } else {
        if (ev.checkInTime && !checkInTime) checkInTime = ev.checkInTime;
        if (ev.checkOutTime) checkOutTime = ev.checkOutTime;
      }
    }

    const explicitShiftCode =
      (bucket.line?.shiftCode && bucket.line.shiftCode !== 'DEFAULT'
        ? bucket.line.shiftCode
        : null) ?? eventShiftCode;

    const matchedShift = matchProjectShift(
      projectShifts,
      checkInTime,
      explicitShiftCode,
      asg?.shiftCode ?? null,
    );

    const standardHours = matchedShift ? Number(matchedShift.standardHours) || 8 : 8;
    const resolvedShiftCode =
      matchedShift?.code ?? explicitShiftCode ?? asg?.shiftCode ?? 'HC';
    const resolvedShiftName = matchedShift
      ? `${matchedShift.name ?? matchedShift.code} (${matchedShift.startTime} - ${matchedShift.endTime})`
      : resolvedShiftCode === 'HC'
        ? 'Ca Hành chính (Mặc định 8h)'
        : resolvedShiftCode;

    let regularHours = 0;
    let ot15Hours = 0;
    let ot20Hours = 0;
    let ot30Hours = 0;
    let otHours = 0;
    let workdays = 0;
    let isComplete = false;

    const lineRegular = bucket.line ? Number(bucket.line.regularHours) : 0;
    const lineOt15 = bucket.line ? Number(bucket.line.ot15Hours) : 0;
    const lineOt20 = bucket.line ? Number(bucket.line.ot20Hours) : 0;
    const lineOt30 = bucket.line ? Number(bucket.line.ot30Hours) : 0;

    if (bucket.line && (lineRegular > 0 || lineOt15 > 0 || lineOt20 > 0 || lineOt30 > 0)) {
      regularHours = Math.round(lineRegular * 100) / 100;
      ot15Hours = Math.round(lineOt15 * 100) / 100;
      ot20Hours = Math.round(lineOt20 * 100) / 100;
      ot30Hours = Math.round(lineOt30 * 100) / 100;
      otHours = Math.round((ot15Hours + ot20Hours + ot30Hours) * 100) / 100;
      workdays =
        standardHours > 0 ? Math.round((regularHours / standardHours) * 100) / 100 : 0;
      isComplete = true;
    } else {
      const calc = calculateShiftAttendanceHours({
        checkInTime,
        checkOutTime,
        checkInAt,
        checkOutAt,
        shift: matchedShift,
        fallbackShiftCode: resolvedShiftCode,
        workDate: bucket.workDate,
      });
      regularHours = calc.regularHours;
      ot15Hours = calc.ot15Hours;
      ot20Hours = calc.ot20Hours;
      ot30Hours = calc.ot30Hours;
      otHours = calc.otHours;
      workdays = calc.workdays;
      isComplete = calc.isComplete;
    }

    const totalHours = Math.round((regularHours + otHours) * 100) / 100;

    let statusNote = 'Đủ công';
    if (bucket.line?.anomalyType) {
      statusNote = `Ngoại lệ: ${bucket.line.anomalyType}`;
    } else if (!isComplete && checkInTime && !checkOutTime) {
      statusNote = 'Đang trong ca / Chưa chấm ra';
    } else if (!isComplete) {
      statusNote = 'Chưa đủ dữ liệu giờ ra';
    }

    const workerName =
      worker?.fullName?.trim() ||
      worker?.account?.name?.trim() ||
      worker?.userId ||
      bucket.workerId;
    const workerPhone =
      worker?.phone?.trim() || worker?.account?.phone?.trim() || '';

    rawDetailRows.push({
      workDate: bucket.workDateStr,
      workerId: bucket.workerId,
      workerUserId: worker?.userId ?? '',
      employeeCode: asg?.employeeCode ?? '',
      workerName,
      workerPhone,
      workerCccd: worker?.cccdNumber ?? '',
      projectId,
      projectCode: project?.code ?? '',
      projectName: project?.name ?? 'Chưa gắn dự án',
      siteName,
      shiftCode: resolvedShiftCode,
      shiftName: resolvedShiftName,
      standardHours,
      checkInTime: checkInTime ?? '',
      checkOutTime: checkOutTime ?? '',
      regularHours,
      ot15Hours,
      ot20Hours,
      ot30Hours,
      otHours,
      totalHours,
      workdays,
      source: sourceLabelVi(eventSource),
      statusNote,
    });
  }

  // Sort detail rows: workDate desc, projectCode asc, workerName asc
  rawDetailRows.sort((a, b) => {
    if (a.workDate !== b.workDate) return b.workDate.localeCompare(a.workDate);
    if (a.projectCode !== b.projectCode) return a.projectCode.localeCompare(b.projectCode);
    return a.workerName.localeCompare(b.workerName, 'vi');
  });

  const detailRows: AttendanceExportDetailRow[] = rawDetailRows.map((row, idx) => ({
    stt: idx + 1,
    ...row,
  }));

  // Aggregate summary rows by (workerId + projectId + shiftCode)
  const summaryMap = new Map<string, Omit<AttendanceExportSummaryRow, 'stt'>>();

  for (const d of detailRows) {
    const key = `${d.workerId}:${d.projectId}:${d.shiftCode}`;
    const existing = summaryMap.get(key);
    const isCompletedDay = d.regularHours > 0 || d.totalHours > 0 || Boolean(d.checkInTime && d.checkOutTime);

    if (existing) {
      existing.totalDays += 1;
      if (isCompletedDay) existing.completedDays += 1;
      existing.totalWorkdays = Math.round((existing.totalWorkdays + d.workdays) * 100) / 100;
      existing.totalRegularHours = Math.round((existing.totalRegularHours + d.regularHours) * 100) / 100;
      existing.totalOt15Hours = Math.round((existing.totalOt15Hours + d.ot15Hours) * 100) / 100;
      existing.totalOt20Hours = Math.round((existing.totalOt20Hours + d.ot20Hours) * 100) / 100;
      existing.totalOt30Hours = Math.round((existing.totalOt30Hours + d.ot30Hours) * 100) / 100;
      existing.totalOtHours = Math.round((existing.totalOtHours + d.otHours) * 100) / 100;
      existing.totalHours = Math.round((existing.totalHours + d.totalHours) * 100) / 100;
    } else {
      summaryMap.set(key, {
        workerId: d.workerId,
        workerUserId: d.workerUserId,
        employeeCode: d.employeeCode,
        workerName: d.workerName,
        workerPhone: d.workerPhone,
        workerCccd: d.workerCccd,
        projectId: d.projectId,
        projectCode: d.projectCode,
        projectName: d.projectName,
        shiftCode: d.shiftCode,
        shiftName: d.shiftName,
        standardHours: d.standardHours,
        totalDays: 1,
        completedDays: isCompletedDay ? 1 : 0,
        totalWorkdays: d.workdays,
        totalRegularHours: d.regularHours,
        totalOt15Hours: d.ot15Hours,
        totalOt20Hours: d.ot20Hours,
        totalOt30Hours: d.ot30Hours,
        totalOtHours: d.otHours,
        totalHours: d.totalHours,
      });
    }
  }

  const sortedSummary = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.projectCode !== b.projectCode) return a.projectCode.localeCompare(b.projectCode);
    if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName, 'vi');
    return a.shiftCode.localeCompare(b.shiftCode);
  });

  const summaryRows: AttendanceExportSummaryRow[] = sortedSummary.map((row, idx) => ({
    stt: idx + 1,
    ...row,
  }));

  return { summaryRows, detailRows };
}

export function buildAttendanceExportWorkbook(data: AttendanceExportResult): Buffer {
  return buildXlsxBuffer([
    {
      name: 'Tổng hợp công NLĐ',
      columns: [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã NLĐ', key: 'workerUserId', width: 14 },
        { header: 'Mã NV Dự án', key: 'employeeCode', width: 15 },
        { header: 'Họ và tên NLĐ', key: 'workerName', width: 24 },
        { header: 'Số điện thoại', key: 'workerPhone', width: 15 },
        { header: 'Số CCCD', key: 'workerCccd', width: 16 },
        { header: 'Mã dự án', key: 'projectCode', width: 14 },
        { header: 'Tên dự án', key: 'projectName', width: 26 },
        { header: 'Mã ca', key: 'shiftCode', width: 12 },
        { header: 'Ca làm việc', key: 'shiftName', width: 26 },
        { header: 'Giờ chuẩn/ca', key: 'standardHours', width: 14 },
        { header: 'Số ngày chấm công', key: 'totalDays', width: 18 },
        { header: 'Số ngày đủ vào/ra', key: 'completedDays', width: 18 },
        { header: 'Tổng số công chấm', key: 'totalWorkdays', width: 18 },
        { header: 'Tổng giờ công chuẩn', key: 'totalRegularHours', width: 20 },
        { header: 'Giờ tăng ca OT 1.5x', key: 'totalOt15Hours', width: 18 },
        { header: 'Giờ tăng ca OT 2.0x', key: 'totalOt20Hours', width: 18 },
        { header: 'Giờ tăng ca OT 3.0x', key: 'totalOt30Hours', width: 18 },
        { header: 'Tổng giờ tăng ca', key: 'totalOtHours', width: 18 },
        { header: 'Tổng giờ làm thực tế', key: 'totalHours', width: 20 },
      ],
      rows: data.summaryRows as unknown as Record<string, string | number>[],
    },
    {
      name: 'Chi tiết chấm công',
      columns: [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Ngày làm việc', key: 'workDate', width: 14 },
        { header: 'Mã NLĐ', key: 'workerUserId', width: 14 },
        { header: 'Mã NV Dự án', key: 'employeeCode', width: 15 },
        { header: 'Họ và tên NLĐ', key: 'workerName', width: 24 },
        { header: 'Số điện thoại', key: 'workerPhone', width: 15 },
        { header: 'Số CCCD', key: 'workerCccd', width: 16 },
        { header: 'Mã dự án', key: 'projectCode', width: 14 },
        { header: 'Tên dự án', key: 'projectName', width: 26 },
        { header: 'Địa điểm (Site)', key: 'siteName', width: 22 },
        { header: 'Mã ca', key: 'shiftCode', width: 12 },
        { header: 'Ca làm việc', key: 'shiftName', width: 26 },
        { header: 'Giờ vào', key: 'checkInTime', width: 10 },
        { header: 'Giờ ra', key: 'checkOutTime', width: 10 },
        { header: 'Số công chấm', key: 'workdays', width: 14 },
        { header: 'Giờ công chuẩn', key: 'regularHours', width: 15 },
        { header: 'Giờ OT 1.5x', key: 'ot15Hours', width: 13 },
        { header: 'Giờ OT 2.0x', key: 'ot20Hours', width: 13 },
        { header: 'Giờ OT 3.0x', key: 'ot30Hours', width: 13 },
        { header: 'Tổng giờ thực tế', key: 'totalHours', width: 16 },
        { header: 'Nguồn chấm công', key: 'source', width: 20 },
        { header: 'Trạng thái / Ghi chú', key: 'statusNote', width: 24 },
      ],
      rows: data.detailRows as unknown as Record<string, string | number>[],
    },
  ]);
}
