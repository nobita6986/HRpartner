import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { SYSTEM_CHECKIN, withSystemDb } from '@/src/shared/auth/with-system-db';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';

const eventSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(['CHECK_IN', 'CHECK_OUT']),
  gpsLatitude: z.number().min(-90).max(90),
  gpsLongitude: z.number().min(-180).max(180),
  // shortcut: record positive device accuracy until Owner sets the max threshold; then fail closed above that value.
  gpsAccuracyMeters: z.number().positive().finite(),
  capturedAt: z.string().datetime({ offset: true }),
}).strict();

function responseError(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message, details: {} } }, { status });
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function workDateIsReal(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatRecordedAt(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return responseError('UNAUTHORIZED', 'Vui lòng đăng nhập lại.', 401);
  }
  if (ctx.role !== 'WORKER' || !ctx.workerId) {
    return responseError('FORBIDDEN_NOT_VERIFIED', 'Tài khoản chưa được Admin liên kết với hồ sơ người lao động.', 403);
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return responseError('IDEMPOTENCY_REQUIRED', 'Thiếu Idempotency-Key UUID v4.', 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return responseError('INVALID_BODY', 'Body phải là JSON hợp lệ.', 400);
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success || !workDateIsReal(parsed.data?.workDate ?? '')) {
    return responseError('VALIDATION_ERROR', 'Dữ liệu chấm công không hợp lệ.', 400);
  }
  const event = parsed.data;
  const workerId = ctx.workerId;
  const externalEventId = `mobile:${workerId}:${event.workDate}:${event.action}`;
  const payloadHash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  const now = new Date();
  const prisma = getPrisma();

  try {
    const saved = await withSystemDb(prisma, SYSTEM_CHECKIN, async (tx) => {
      const result = await withIdempotency({
        prisma: tx,
        route: 'POST:/api/worker/checkins/events',
        actorId: ctx.userId,
        key: idempotencyKey,
        requestBody: event,
        handler: async () => {
          const lockKey = `${workerId}:${event.workDate}`;
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

          const worker = await tx.worker.findUnique({
            where: { id: workerId },
            select: { profileStatus: true, employmentStatus: true },
          });
          if (worker?.profileStatus !== 'VERIFIED' || worker.employmentStatus !== 'ACTIVE') {
            return { body: { kind: 'WORKER_NOT_READY' as const }, statusCode: 200 };
          }

          const existing = await tx.attendanceEvent.findFirst({
            where: { source: 'GPS', externalEventId },
            select: { id: true, payloadHash: true, receivedAt: true },
          });
          if (existing) {
            const saved = existing.payloadHash === payloadHash
              ? { kind: 'REPLAY' as const, id: existing.id, receivedAt: existing.receivedAt.toISOString() }
              : { kind: 'DUPLICATE' as const };
            return { body: saved, statusCode: 200 };
          }

          const assignment = await tx.projectAssignment.findFirst({
            where: {
              workerId,
              status: 'ACTIVE',
              validFrom: { lte: now },
              OR: [{ validTo: null }, { validTo: { gt: now } }],
            },
            orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
            select: { id: true, projectId: true },
          });
          if (!assignment) return { body: { kind: 'NO_ASSIGNMENT' as const }, statusCode: 200 };

          const sites = await tx.site.findMany({
            where: { projectId: assignment.projectId },
            select: { id: true, latitude: true, longitude: true, radiusMeters: true, geoConfirmedAt: true },
          });
          const configured = sites.filter((site) => site.latitude != null && site.longitude != null && site.geoConfirmedAt != null);
          if (configured.length === 0) return { body: { kind: 'SITE_NOT_CONFIGURED' as const }, statusCode: 200 };

          const matchingSite = configured.find((site) => distanceMeters(
            event.gpsLatitude,
            event.gpsLongitude,
            Number(site.latitude),
            Number(site.longitude),
          ) <= site.radiusMeters);
          if (!matchingSite) return { body: { kind: 'OUT_OF_RANGE' as const }, statusCode: 200 };

          if (event.action === 'CHECK_OUT') {
            const checkInId = `mobile:${workerId}:${event.workDate}:CHECK_IN`;
            const checkIn = await tx.attendanceEvent.findFirst({
              where: { source: 'GPS', externalEventId: checkInId },
              select: { id: true },
            });
            if (!checkIn) return { body: { kind: 'CHECK_IN_REQUIRED' as const }, statusCode: 200 };
          }

          const capturedAt = new Date(event.capturedAt);
          const row = await tx.attendanceEvent.create({
            data: {
              externalEventId,
              source: 'GPS',
              status: 'APPENDED',
              workerId,
              projectId: assignment.projectId,
              assignmentId: assignment.id,
              siteId: matchingSite.id,
              mobileAction: event.action,
              workDate: new Date(`${event.workDate}T00:00:00.000Z`),
              checkInTime: event.action === 'CHECK_IN' ? formatRecordedAt(now) : null,
              checkOutTime: event.action === 'CHECK_OUT' ? formatRecordedAt(now) : null,
              payloadHash,
              capturedAt,
              gpsLatitude: String(event.gpsLatitude),
              gpsLongitude: String(event.gpsLongitude),
              gpsAccuracyMeters: Math.ceil(event.gpsAccuracyMeters),
              geofenceResult: 'INSIDE',
            },
            select: { id: true, receivedAt: true },
          });
          return { body: { kind: 'CREATED' as const, id: row.id, receivedAt: row.receivedAt.toISOString() }, statusCode: 201 };
        },
      });
      return result.body as {
        kind: 'WORKER_NOT_READY' | 'NO_ASSIGNMENT' | 'SITE_NOT_CONFIGURED' | 'OUT_OF_RANGE' | 'CHECK_IN_REQUIRED' | 'DUPLICATE' | 'REPLAY' | 'CREATED';
        id?: string;
        receivedAt?: string;
      };
    });

    if (saved.kind === 'WORKER_NOT_READY') return responseError('FORBIDDEN_NOT_VERIFIED', 'Hồ sơ người lao động chưa được Admin xác minh hoặc không còn đang làm việc.', 403);
    if (saved.kind === 'NO_ASSIGNMENT') return responseError('FORBIDDEN_NOT_VERIFIED', 'Chưa có phân công đang hoạt động.', 403);
    if (saved.kind === 'SITE_NOT_CONFIGURED') return responseError('SITE_GEOFENCE_NOT_CONFIGURED', 'Nhà máy chưa được Admin xác nhận cấu hình GPS.', 503);
    if (saved.kind === 'OUT_OF_RANGE') return responseError('GEOFENCE_OUT_OF_RANGE', 'Bạn đang ở ngoài vùng chấm công của nhà máy.', 422);
    if (saved.kind === 'CHECK_IN_REQUIRED') return responseError('CHECK_IN_REQUIRED', 'Cần ghi nhận Vào ca trước khi Tan ca.', 409);
    if (saved.kind === 'DUPLICATE') return responseError('ATTENDANCE_ACTION_ALREADY_RECORDED', 'Thao tác này đã được ghi nhận trong ngày.', 409);

    return NextResponse.json({
      ok: true,
      data: {
        attendanceId: saved.id,
        action: event.action,
        recordedAt: formatRecordedAt(new Date(saved.receivedAt!)),
        geofenceResult: 'INSIDE',
      },
    }, { status: saved.kind === 'CREATED' ? 201 : 200 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && String((error as { code: unknown }).code) === 'P2002') {
      return responseError('ATTENDANCE_ACTION_ALREADY_RECORDED', 'Thao tác này đã được ghi nhận trong ngày.', 409);
    }
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'UNCLASSIFIED';
    console.error('[worker/checkins/events] request failed:', { errorCode });
    if (error instanceof IdempotencyConflictError) {
      return responseError('IDEMPOTENCY_CONFLICT', 'Idempotency-Key đã được dùng cho dữ liệu khác.', 409);
    }
    return responseError('INTERNAL_ERROR', 'Không thể ghi nhận chấm công lúc này.', 500);
  }
}
