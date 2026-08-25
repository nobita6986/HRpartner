/**
 * POST /api/worker/checkins — P1 Portals STEP-04 / V5-M1-06b (RQ-03, RQ-04).
 *
 * DEC-03: GPS evidence + geofence check against Site.radiusMeters.
 * DEC-04: geofence CHỈ tính Site thuộc assignment ACTIVE của chính worker
 *   (server-derived `ctx.workerId` — KHÔNG quét toàn bộ Site, KHÔNG nhận từ client);
 *   read + write nằm trong CÙNG transaction.
 *
 * Vì sao attendance INSERT chạy qua `withSystemDb` (elevated, hẹp) thay vì context
 * WORKER: RLS `attendance_events` (M13 `20260821103500`) WITH CHECK chỉ cho phép
 * {ADMIN,HR_MANAGER,HR_STAFF} — WORKER KHÔNG thể INSERT self check-in dưới GUC role
 * WORKER. Ownership vẫn khoá server-side bằng `workerId: ctx.workerId`; geofence read
 * khoá bằng `where` assignment ACTIVE của chính worker. Xem `with-system-db.ts`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { SYSTEM_CHECKIN, withSystemDb } from '@/src/shared/auth/with-system-db';

const checkinSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  gpsAccuracyMeters: z.number().optional(),
  capturedAt: z.string().datetime().optional(),
});

function buildPayloadHash(data: z.infer<typeof checkinSchema>): string {
  const s = JSON.stringify({ ...data, workerId: undefined, projectId: undefined });
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return `gps_${Math.abs(h).toString(16)}`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Geofence CHỈ trên Site thuộc project có assignment ACTIVE của chính worker
 * (DEC-04). `workerId` suy ra từ server. Chạy trên `tx` đã set context.
 */
async function checkGeofence(
  tx: Prisma.TransactionClient,
  workerId: string,
  lat: number,
  lng: number,
): Promise<'INSIDE' | 'OUTSIDE' | 'NONE'> {
  const sites = await tx.site.findMany({
    where: {
      project: { assignments: { some: { status: 'ACTIVE', workerId } } },
    },
    select: { latitude: true, longitude: true, radiusMeters: true },
  });
  if (sites.length === 0) return 'NONE';
  for (const site of sites) {
    const distance = haversine(lat, lng, Number(site.latitude), Number(site.longitude));
    if (distance <= (site.radiusMeters ?? 200)) return 'INSIDE';
  }
  return 'OUTSIDE';
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!ctx.workerId) {
    return NextResponse.json({ error: 'NOT_A_WORKER' }, { status: 403 });
  }
  const workerId = ctx.workerId;

  const prisma = getPrisma();
  const payloadHash = buildPayloadHash(data);
  const hasGps = data.gpsLatitude != null && data.gpsLongitude != null;

  try {
    // Geofence read (scoped) + attendance INSERT trong CÙNG transaction hệ thống.
    const { eventId, geofenceResult, riskFlag } = await withSystemDb(prisma, SYSTEM_CHECKIN, async (tx) => {
      let geofence: 'INSIDE' | 'OUTSIDE' | 'NONE' | undefined;
      if (hasGps) {
        geofence = await checkGeofence(tx, workerId, data.gpsLatitude!, data.gpsLongitude!);
      }
      const event = await tx.attendanceEvent.create({
        data: {
          externalEventId: payloadHash,
          source: 'GPS',
          status: 'APPENDED',
          workerId,
          workDate: new Date(data.workDate + 'T00:00:00.000Z'),
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          payloadHash,
          capturedAt: data.capturedAt ? new Date(data.capturedAt) : null,
          gpsLatitude: data.gpsLatitude != null ? data.gpsLatitude.toString() : null,
          gpsLongitude: data.gpsLongitude != null ? data.gpsLongitude.toString() : null,
          gpsAccuracyMeters: data.gpsAccuracyMeters ?? null,
          geofenceResult: geofence ?? null,
        },
        select: { id: true },
      });
      return { eventId: event.id, geofenceResult: geofence, riskFlag: geofence === 'OUTSIDE' };
    });

    return NextResponse.json({
      ok: true,
      id: eventId,
      message: riskFlag ? 'Chấm công thành công (cảnh báo: ngoài khu vực)' : 'Chấm công thành công!',
      riskFlag,
      geofenceResult,
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Idempotent — đã ghi nhận (payloadHash trùng).
      return NextResponse.json({
        ok: true,
        id: null,
        message: 'Đã chấm công rồi (idempotent)',
        riskFlag: false,
      });
    }
    console.error('[worker/checkins]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
