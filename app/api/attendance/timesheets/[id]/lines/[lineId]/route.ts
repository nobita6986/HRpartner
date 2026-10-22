import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { AuthScopeError } from '@/src/shared/auth/with-auth-scope';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import {
  calculateShiftAttendanceHours,
  matchProjectShift,
  type ShiftDefinitionLike,
} from '@/src/domains/attendance/shift-calculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MUTATE_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'DIRECTOR'] as const);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!(MUTATE_ROLES as ReadonlySet<string>).has(ctx.role)) {
    return NextResponse.json(
      { error: 'PERMISSION_DENIED', message: `Vai trò ${ctx.role} không có quyền cập nhật ca bảng công.` },
      { status: 403 },
    );
  }

  const { id: periodId, lineId } = await params;
  let body: {
    shiftCode?: string;
    checkInTime?: string;
    checkOutTime?: string;
    regularHours?: number;
    ot15Hours?: number;
    ot20Hours?: number;
    ot30Hours?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON.' }, { status: 400 });
  }

  const rawShiftCode = typeof body.shiftCode === 'string' ? body.shiftCode.trim().toUpperCase() : '';
  if (!rawShiftCode) {
    return NextResponse.json({ error: 'VALIDATION', message: 'shiftCode là bắt buộc.' }, { status: 400 });
  }

  const prisma = getPrisma();

  try {
    const updated = await withDbContext(prisma, ctx, async (tx) => {
      const period = await tx.timesheetPeriod.findUnique({
        where: { id: periodId },
        select: { id: true, status: true, projectId: true },
      });
      if (!period) {
        return { kind: 'NOT_FOUND' as const, message: 'Không tìm thấy kỳ công.' };
      }
      if (period.status === 'LOCKED') {
        return { kind: 'LOCKED' as const, message: 'Kỳ công đã khoá (LOCKED) — không thể đổi ca trực tiếp.' };
      }

      const line = await tx.timesheetLine.findFirst({
        where: { id: lineId, periodId },
      });
      if (!line) {
        return { kind: 'NOT_FOUND' as const, message: 'Không tìm thấy dòng công.' };
      }

      const targetProjectId = line.projectId ?? period.projectId;
      let matchedShift: ShiftDefinitionLike | null = null;
      if (targetProjectId) {
        const shifts = await tx.projectShift.findMany({
          where: { projectId: targetProjectId },
        });
        matchedShift = matchProjectShift(shifts, null, rawShiftCode, null);
        if (!matchedShift) {
          return {
            kind: 'SHIFT_NOT_FOUND' as const,
            message: `Mã ca "${rawShiftCode}" không tồn tại trong cấu hình ca của dự án.`,
          };
        }
      }

      const events = await tx.attendanceEvent.findMany({
        where: { workerId: line.workerId, workDate: line.workDate },
        orderBy: { receivedAt: 'asc' },
      });

      const inTime =
        body.checkInTime ??
        events.find((e) => e.checkInTime)?.checkInTime ??
        null;
      const outTime =
        body.checkOutTime ??
        [...events].reverse().find((e) => e.checkOutTime)?.checkOutTime ??
        null;

      let regularHours = Number(line.regularHours);
      let ot15Hours = Number(line.ot15Hours);
      let ot20Hours = Number(line.ot20Hours);
      let ot30Hours = Number(line.ot30Hours);

      if (typeof body.regularHours === 'number' && Number.isFinite(body.regularHours)) {
        regularHours = body.regularHours;
        if (typeof body.ot15Hours === 'number') ot15Hours = body.ot15Hours;
        if (typeof body.ot20Hours === 'number') ot20Hours = body.ot20Hours;
        if (typeof body.ot30Hours === 'number') ot30Hours = body.ot30Hours;
      } else if (inTime && outTime) {
        const holiday = await tx.holiday.findUnique({ where: { date: line.workDate } });
        const calc = calculateShiftAttendanceHours({
          checkInTime: inTime,
          checkOutTime: outTime,
          shift: matchedShift,
          fallbackShiftCode: rawShiftCode,
          workDate: line.workDate,
          isHoliday: Boolean(holiday),
        });
        if (calc.isComplete) {
          regularHours = calc.regularHours;
          ot15Hours = calc.ot15Hours;
          ot20Hours = calc.ot20Hours;
          ot30Hours = calc.ot30Hours;
        }
      } else if (matchedShift) {
        regularHours = Number(matchedShift.standardHours);
      }

      const updatedLine = await tx.timesheetLine.update({
        where: { id: line.id },
        data: {
          shiftCode: matchedShift?.code ?? rawShiftCode,
          regularHours,
          ot15Hours,
          ot20Hours,
          ot30Hours,
        },
      });

      if (events.length > 0) {
        await tx.attendanceEvent.updateMany({
          where: { workerId: line.workerId, workDate: line.workDate },
          data: { shiftCode: matchedShift?.code ?? rawShiftCode },
        });
      }

      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role },
        entityType: 'TimesheetLine',
        entityId: line.id,
        action: 'MAP_SHIFT',
        diff: {
          before: {
            shiftCode: line.shiftCode,
            regularHours: Number(line.regularHours),
          },
          after: {
            shiftCode: updatedLine.shiftCode,
            regularHours: Number(updatedLine.regularHours),
          },
        },
      });

      return { kind: 'OK' as const, line: updatedLine };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND', message: updated.message }, { status: 404 });
    }
    if (updated.kind === 'LOCKED') {
      return NextResponse.json({ error: 'ALREADY_LOCKED', message: updated.message }, { status: 409 });
    }
    if (updated.kind === 'SHIFT_NOT_FOUND') {
      return NextResponse.json({ error: 'VALIDATION', message: updated.message }, { status: 400 });
    }

    return NextResponse.json({ line: updated.line });
  } catch (e) {
    if (e instanceof AuthScopeError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    }
    console.error('[api/attendance/timesheets/[id]/lines/[lineId] PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Không thể cập nhật ca cho dòng công.' }, { status: 500 });
  }
}
