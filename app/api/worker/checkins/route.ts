/**
 * POST /api/worker/checkins — P1 Portals STEP-04 (RQ-03, RQ-04).
 *
 * DEC-03: GPS evidence + geofence check against Site.radiusMeters.
 * DEC-04: batch idempotent (payloadHash), offline-first.
 * DEC-05: source = GPS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';

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

async function checkGeofence(
  lat: number,
  lng: number,
  workerId: string,
  prisma: ReturnType<typeof getPrisma>,
): Promise<'INSIDE' | 'OUTSIDE' | 'NONE'> {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { id: true },
      // In real impl: get worker's project assignment to find Site
      // For MVP: check if any active Site exists within radius
    });

    // MVP: check nearest Site with radius (no isActive on Site model)
    const sites = await prisma.site.findMany({
      select: { id: true, latitude: true, longitude: true, radiusMeters: true },
    });

    if (sites.length === 0) return 'NONE';

    // Haversine distance (using plain numbers from Decimal)
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

    for (const site of sites) {
      const distance = haversine(
        lat, lng,
        Number(site.latitude),
        Number(site.longitude),
      );
      if (distance <= (site.radiusMeters ?? 200)) {
        return 'INSIDE';
      }
    }
    return 'OUTSIDE';
  } catch {
    return 'NONE';
  }
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

  const prisma = getPrisma();

  const payloadHash = buildPayloadHash(data);

  // Check geofence if GPS coordinates provided
  let geofenceResult: string | undefined;
  let riskFlag = false;
  if (data.gpsLatitude != null && data.gpsLongitude != null) {
    const result = await checkGeofence(data.gpsLatitude, data.gpsLongitude, ctx.workerId, prisma);
    geofenceResult = result;
    riskFlag = result === 'OUTSIDE';
  }

  try {
    const event = await prisma.attendanceEvent.create({
      data: {
        externalEventId: payloadHash,
        source: 'GPS',
        status: 'APPENDED',
        workerId: ctx.workerId,
        workDate: new Date(data.workDate + 'T00:00:00.000Z'),
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        payloadHash,
        capturedAt: data.capturedAt ? new Date(data.capturedAt) : null,
        gpsLatitude: data.gpsLatitude ? data.gpsLatitude.toString() : null,
        gpsLongitude: data.gpsLongitude ? data.gpsLongitude.toString() : null,
        gpsAccuracyMeters: data.gpsAccuracyMeters ?? null,
        geofenceResult: geofenceResult ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      id: event.id,
      message: riskFlag ? 'Chấm công thành công (cảnh báo: ngoài khu vực)' : 'Chấm công thành công!',
      riskFlag,
      geofenceResult,
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Idempotent — already recorded
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
