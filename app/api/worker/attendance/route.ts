/**
 * GET /api/worker/attendance — P1 Portals STEP-04 (RQ-03).
 *
 * Returns attendance history for the authenticated WORKER.
 *
 * T1A Android backend mobile contract (TASK DEC-06 / RQ-06):
 *  - query `month` (1-12) + `year` (>= 2000): lọc `workDate` trong
 *    [firstDayUtc, nextMonthFirstDayUtc) UTC. Chỉ truyền 1 trong 2 → 400.
 *  - SHIFT/STATUS lấy từ AttendanceEvent (shiftCode + status hiện hành).
 *    GIỜ CHUẨN (regularHours) + OT (ot15+ot20+ot30) lấy từ TimesheetLine —
 *    KHÔNG suy diễn từ giờ vào/ra.
 *  - L1 scope: AttendanceEvent self (hiện hành) + TimesheetLine self builder
 *    `buildTimesheetLineScope` (read-only — mirror RLS migration
 *    20261018120000...). Ownership từ ctx.workerId (server) — DEC-03.
 *  - Response: items (giữ field back-compat + shift/status/regularHours/
 *    otHours) + totals {regularHours, otHours} (aggregate theo tập dates đã
 *    trả, hoặc cả range khi truyền month+year).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withAuthorizedDbReadOnly } from '@/src/shared/auth/with-authorized-db';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';

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

  // Range chỉ áp khi truyền đủ month+year — không period → hành vi hiện hành.
  const workDateRange = period
    ? { gte: periodUtcRange(period.month, period.year).gte, lt: periodUtcRange(period.month, period.year).lt }
    : undefined;

  const prisma = getPrisma();
  let events;
  let hoursByDate;
  try {
    // Boundary canonical (L1 AttendanceEvent self-scope + L2 RLS GUC). `workerId`
    // suy ra từ server (ctx.workerId) — không nhận từ client (DEC-03).
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
          mobileAction: true,
          receivedAt: true,
        },
      });

      type RawEventRow = (typeof eventRowsRaw)[number];
      type MergedEventRow = RawEventRow & { computedRegularHours?: number | null };

      // Mobile writes one immutable event per tap; preserve the existing one-row-per-day DTO
      // and evaluate the 6h-12h reward attendance shift rules from receivedAt timestamps.
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

      const nowMs = Date.now();
      const HOUR_MS = 3_600_000;
      for (const group of mobileGroups.values()) {
        const inEvt = group.checkIn;
        const rawOutEvt = group.checkOut;
        const outEvt =
          inEvt?.receivedAt && rawOutEvt?.receivedAt && rawOutEvt.receivedAt.getTime() < inEvt.receivedAt.getTime()
            ? undefined
            : rawOutEvt;
        const base = (inEvt ?? outEvt)!;

        let mergedStatus = 'PENDING';
        let computedRegularHours = 0;

        if (inEvt?.receivedAt && outEvt?.receivedAt) {
          const durationHours = (outEvt.receivedAt.getTime() - inEvt.receivedAt.getTime()) / HOUR_MS;
          if (durationHours >= 6 && durationHours <= 12) {
            mergedStatus = 'APPROVED';
            computedRegularHours = Math.round(durationHours * 10) / 10;
          } else {
            mergedStatus = 'ABSENT';
            computedRegularHours = 0;
          }
        } else if (inEvt?.receivedAt && !outEvt) {
          const elapsedHours = (nowMs - inEvt.receivedAt.getTime()) / HOUR_MS;
          if (elapsedHours > 12) {
            mergedStatus = 'ABSENT';
            computedRegularHours = 0;
          } else {
            mergedStatus = 'PENDING';
            computedRegularHours = 0;
          }
        } else {
          mergedStatus = 'ABSENT';
          computedRegularHours = 0;
        }

        eventRows.push({
          ...base,
          id: inEvt ? inEvt.id : outEvt!.id,
          checkInTime: inEvt?.checkInTime ?? null,
          checkOutTime: outEvt?.checkOutTime ?? null,
          geofenceResult:
            inEvt?.geofenceResult === 'OUTSIDE' || outEvt?.geofenceResult === 'OUTSIDE'
              ? 'OUTSIDE'
              : inEvt?.geofenceResult ?? outEvt?.geofenceResult ?? null,
          status: mergedStatus,
          computedRegularHours,
        });
      }
      eventRows.sort((a, b) => b.workDate.getTime() - a.workDate.getTime());
      eventRows.splice(limit);

      // T1A DEC-06: giờ chuẩn/OT theo TimesheetLine (RQ-06). Self-scope qua L1
      // builder (TimesheetLine) + RLS (migration 20261018120000...). Aggregate
      // theo workDate — KHÔNG suy diễn từ check-in/out timestamps.
      //
      // T0 CORRECTION (audit round 2 — TASK v1.4): khi KHÔNG có month/year,
      // chỉ aggregate các ngày CÓ TRONG eventRows đang trả về (≤ limit ngày
      // distinct) — không quét toàn bộ lịch sử chỉ để tính totals; eventRows
      // rỗng ⇒ aggregate + totals = 0 (skip query). Có month/year ⇒ giữ
      // aggregate TRÊN TOÀN RANGE như hiện hành (totals tháng nguyên vẹn).
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

  // Map hours theo date ISO-YYYY-MM-DD.
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
      if (r.status === 'APPROVED') {
        itemRegularHours = hours ? hours.regularHours : (r.computedRegularHours ?? 0);
        itemOtHours = hours ? hours.otHours : 0;
        if (!hours && itemRegularHours > 0) {
          totalRegular += itemRegularHours;
        }
      } else {
        itemRegularHours = 0;
        itemOtHours = 0;
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
      // T1A DEC-06: shift/status + giờ chuẩn/OT từ TimesheetLine (hoặc ca GPS 6h-12h hợp lệ).
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
