/**
 * GET /api/worker/attendance — P1 Portals STEP-04 (RQ-03).
 *
 * Returns attendance history for the authenticated WORKER.
 *
 * Đồng bộ với hệ thống Ca làm việc của Dự án (`ProjectShift`) + `TimesheetLine`:
 *  - query `month` (1-12) + `year` (>= 2000): lọc `workDate` trong
 *    [firstDayUtc, nextMonthFirstDayUtc) UTC. Chỉ truyền 1 trong 2 → 400.
 *  - Giờ công chuẩn (`regularHours`), tăng ca (`otHours`) và mã ca (`shift`)
 *    ưu tiên lấy từ `TimesheetLine` (đã đồng bộ với dự án), hoặc tính theo
 *    thời gian thực tế đối chiếu `ProjectShift` của dự án đối với ca GPS.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import {
  calculateShiftAttendanceHours,
  matchProjectShift,
  type ShiftDefinitionLike,
} from '@/src/domains/attendance/shift-calculator';

/** Parse + validate optional period: {month, year} hoặc null (không query nào). */
function parsePeriod(searchParams: URLSearchParams): { month: number; year: number } | null | 'INVALID' {
  const monthRaw = searchParams.get('month');
  const yearRaw = searchParams.get('year');
  if (monthRaw === null && yearRaw === null) return null;
  if (monthRaw === null || yearRaw === null) return 'INVALID';

  const month = Number.parseInt(monthRaw, 10);
  const year = Number.parseInt(yearRaw, 10);
  if (!Number.isInteger(month) || !Number.isInteger(year)) return 'INVALID';
  if (month < 1 || month > 12) return 'INVALID';
  if (year < 2000 || yearRaw !== String(year)) return 'INVALID';
  return { month, year };
}

/** Range UTC [firstDay, nextMonthFirstDay) cho (month, year). */
function periodUtcRange(month: number, year: number): { gte: Date; lt: Date } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
  const first = new Date(`${day(year, month, 1)}T00:00:00.000Z`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = new Date(`${day(nextYear, nextMonth, 1)}T00:00:00.000Z`);
  return { gte: first, lt: next };
}

function decimalToNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!ctx.workerId) {
    return NextResponse.json({ error: 'NOT_A_WORKER' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);
  const period = parsePeriod(searchParams);
  if (period === 'INVALID') {
    return NextResponse.json(
      { error: 'VALIDATION', message: 'month phải là 1-12 và year >= 2000 (cả hai hoặc không có)' },
      { status: 400 },
    );
  }

  const workDateRange = period
    ? { gte: periodUtcRange(period.month, period.year).gte, lt: periodUtcRange(period.month, period.year).lt }
    : undefined;

  const prisma = getPrisma();
  let events;
  let hoursByDate;
  try {
    ({ events, hoursByDate } = await withAuthorizedDbReadOnly(prisma, ctx, async (tx) => {
      const eventRowsRaw = await tx.attendanceEvent.findMany({
        where: { workerId: ctx.workerId, ...(workDateRange ? { workDate: workDateRange } : {}) },
        orderBy: { workDate: 'desc' },
        take: limit * 2,
        select: {
          id: true,
          workDate: true,
          checkInTime: true,
          checkOutTime: true,
          source: true,
          geofenceResult: true,
          status: true,
          shiftCode: true,
          projectId: true,
          mobileAction: true,
          receivedAt: true,
        },
      });

      const distinctProjectIds = Array.from(
        new Set(
          eventRowsRaw
            .map((e) => (e as { projectId?: string | null }).projectId)
            .filter((pid): pid is string => typeof pid === 'string' && pid.length > 0),
        ),
      );

      const shiftDelegate = (tx as unknown as {
        projectShift?: {
          findMany: (args: unknown) => Promise<Array<ShiftDefinitionLike & { projectId: string }>>;
        };
      }).projectShift;

      const shiftsByProject = new Map<string, ShiftDefinitionLike[]>();
      if (shiftDelegate?.findMany && distinctProjectIds.length > 0) {
        const allShifts = await shiftDelegate.findMany({
          where: { projectId: { in: distinctProjectIds } },
          orderBy: [{ startTime: 'asc' }, { code: 'asc' }],
        });
        for (const s of allShifts) {
          const list = shiftsByProject.get(s.projectId) ?? [];
          list.push(s);
          shiftsByProject.set(s.projectId, list);
        }
      }

      type RawEventRow = (typeof eventRowsRaw)[number];
      type MergedEventRow = RawEventRow & {
        computedRegularHours?: number | null;
        computedOtHours?: number | null;
      };

      const mobileGroups = new Map<string, { checkIn?: RawEventRow; checkOut?: RawEventRow }>();
      const eventRows: MergedEventRow[] = eventRowsRaw.filter((event) => {
        if (event.mobileAction !== 'CHECK_IN' && event.mobileAction !== 'CHECK_OUT') return true;
        const key = event.workDate.toISOString().slice(0, 10);
        const group = mobileGroups.get(key) ?? {};
        if (event.mobileAction === 'CHECK_IN') {
          if (!group.checkIn || (event.receivedAt && group.checkIn.receivedAt && event.receivedAt > group.checkIn.receivedAt)) {
            group.checkIn = event;
          }
        } else if (event.mobileAction === 'CHECK_OUT') {
          if (!group.checkOut || (event.receivedAt && group.checkOut.receivedAt && event.receivedAt > group.checkOut.receivedAt)) {
            group.checkOut = event;
          }
        }
        mobileGroups.set(key, group);
        return false;
      });

      for (const group of mobileGroups.values()) {
        const inEvt = group.checkIn;
        const rawOutEvt = group.checkOut;
        const outEvt =
          inEvt?.receivedAt && rawOutEvt?.receivedAt && rawOutEvt.receivedAt.getTime() < inEvt.receivedAt.getTime()
            ? undefined
            : rawOutEvt;
        const base = (inEvt ?? outEvt)!;
        const projectId = (inEvt as { projectId?: string | null } | undefined)?.projectId ??
          (outEvt as { projectId?: string | null } | undefined)?.projectId ??
          null;
        const projectShifts = projectId ? (shiftsByProject.get(projectId) ?? []) : [];

        const rawShiftCode = inEvt?.shiftCode ?? outEvt?.shiftCode ?? null;
        const matchedShift = matchProjectShift(
          projectShifts,
          inEvt?.checkInTime ?? null,
          rawShiftCode,
          null,
        );

        let mergedStatus = 'PENDING';
        let computedRegularHours = 0;
        let computedOtHours = 0;
        const resolvedShiftCode = matchedShift?.code ?? rawShiftCode;

        if (inEvt && outEvt) {
          const calc = calculateShiftAttendanceHours({
            checkInTime: inEvt.checkInTime ?? null,
            checkOutTime: outEvt.checkOutTime ?? null,
            checkInAt: inEvt.receivedAt ?? null,
            checkOutAt: outEvt.receivedAt ?? null,
            shift: matchedShift,
            fallbackShiftCode: resolvedShiftCode,
            workDate: base.workDate,
          });
          computedRegularHours = calc.regularHours;
          computedOtHours = calc.otHours;
          mergedStatus = calc.regularHours > 0 ? 'APPROVED' : 'APPENDED';
        } else if (inEvt && !outEvt) {
          mergedStatus = 'PENDING';
          computedRegularHours = 0;
          computedOtHours = 0;
        } else {
          mergedStatus = 'APPENDED';
          computedRegularHours = 0;
          computedOtHours = 0;
        }

        eventRows.push({
          ...base,
          id: inEvt ? inEvt.id : outEvt!.id,
          checkInTime: inEvt?.checkInTime ?? null,
          checkOutTime: outEvt?.checkOutTime ?? null,
          shiftCode: resolvedShiftCode,
          geofenceResult:
            inEvt?.geofenceResult === 'OUTSIDE' || outEvt?.geofenceResult === 'OUTSIDE'
              ? 'OUTSIDE'
              : inEvt?.geofenceResult ?? outEvt?.geofenceResult ?? null,
          status: mergedStatus,
          computedRegularHours,
          computedOtHours,
        });
      }
      eventRows.sort((a, b) => b.workDate.getTime() - a.workDate.getTime());
      eventRows.splice(limit);

      const eventDateKeys = Array.from(
        new Set(eventRows.map((e) => e.workDate.toISOString().split('T')[0])),
      );
      const lineWorkDate: Prisma.TimesheetLineWhereInput['workDate'] | undefined =
        workDateRange ??
        (eventDateKeys.length > 0
          ? { in: eventDateKeys.map((k) => new Date(`${k}T00:00:00.000Z`)) }
          : undefined);
      const hoursAgg =
        lineWorkDate === undefined
          ? []
          : await tx.timesheetLine.groupBy({
              by: ['workDate'],
              where: {
                workerId: ctx.workerId,
                workDate: lineWorkDate,
              },
              _sum: {
                regularHours: true,
                ot15Hours: true,
                ot20Hours: true,
                ot30Hours: true,
              },
            });

      return { events: eventRows, hoursByDate: hoursAgg };
    }));
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('[api/worker/attendance] query error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }

  const hoursMap = new Map<string, { regularHours: number; otHours: number }>();
  let totalRegular = 0;
  let totalOt = 0;
  for (const agg of hoursByDate) {
    const regular = decimalToNumber(agg._sum.regularHours);
    const ot = decimalToNumber(agg._sum.ot15Hours) + decimalToNumber(agg._sum.ot20Hours) + decimalToNumber(agg._sum.ot30Hours);
    const dateKey = agg.workDate.toISOString().split('T')[0];
    hoursMap.set(dateKey, { regularHours: regular, otHours: ot });
    totalRegular += regular;
    totalOt += ot;
  }

  const items = events.map((r) => {
    const dateKey = r.workDate.toISOString().split('T')[0];
    const hours = hoursMap.get(dateKey) ?? null;
    const isMobileShift = r.mobileAction === 'CHECK_IN' || r.mobileAction === 'CHECK_OUT';
    let itemRegularHours: number | null;
    let itemOtHours: number | null;
    if (isMobileShift) {
      itemRegularHours = hours ? hours.regularHours : (r.computedRegularHours ?? 0);
      itemOtHours = hours ? hours.otHours : (r.computedOtHours ?? 0);
      if (!hours) {
        totalRegular += itemRegularHours;
        totalOt += itemOtHours;
      }
    } else {
      itemRegularHours = hours?.regularHours ?? null;
      itemOtHours = hours?.otHours ?? null;
    }
    return {
      id: r.id,
      workDate: dateKey,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      source: r.source,
      geofenceResult: r.geofenceResult,
      riskFlag: r.geofenceResult === 'OUTSIDE',
      shift: r.shiftCode,
      status: r.status,
      regularHours: itemRegularHours,
      otHours: itemOtHours,
    };
  });

  return NextResponse.json({
    items,
    total: items.length,
    totals: {
      regularHours: Math.round(totalRegular * 100) / 100,
      otHours: Math.round(totalOt * 100) / 100,
    },
  });
}
