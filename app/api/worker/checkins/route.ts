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
 * Đọc Site của assignment ACTIVE (server-derived `workerId`) và đánh giá
 * cấu hình GPS (T0 directive hrp-t1a-android-gps-project-site-config §6).
 *
 * - Chỉ Site HỢP LỆ mới dùng để tính geofence: lat + lng không null VÀ
 *   `geoConfirmedAt` không null (Admin/BoD đã lưu cấu hình từ Admin panel).
 *   KHÔNG biến `null` thành toạ độ (0,0) — haversine chỉ chạy trên row valid.
 * - Trả về trạng thái discriminator cho route:
 *     'NOT_CONFIGURED'  ⇒ không có Site hợp lệ (hoặc không thuộc assignment
 *                          ACTIVE) ⇒ route phải fail-closed, KHÔNG create event.
 *     'INSIDE' | 'OUTSIDE' ⇒ config hợp lệ + GPS được cung cấp.
 *     'NO_GPS'           ⇒ config hợp lệ nhưng body không GPS (giữ behavior
 *                          hiện hành: event với geofenceResult null).
 */
interface SiteGeoRow {
  latitude: unknown;
  longitude: unknown;
  radiusMeters: number;
  geoConfirmedAt: Date | null;
}

/**
 * Config gate (T0 §6 — fail-closed): đọc Site của assignment ACTIVE
 * (server-derived `workerId`) và đánh giá cấu hình GPS.
 *
 * - Chỉ Site HỢP LỆ được dùng cho geofence: lat + lng không null VÀ
 *   `geoConfirmedAt` không null (Admin/BoD đã lưu cấu hình từ Admin panel).
 *   KHÔNG biến `null` thành toạ độ (0,0) — filter trước, haversine chỉ chạy
 *   trên row valid (see `checkGeofenceForConfirmedSites`).
 * - 'NOT_CONFIGURED' ⇒ không có Site hợp lệ (sites rỗng / toạ độ thiếu /
 *   chưa Admin xác nhận) ⇒ route fail-closed, KHÔNG tạo event. 'NONE' như
 *   một "kết quả geofence" không còn xuất hiện (trạng thái NONE không hợp lệ).
 * - 'NO_GPS' ⇒ config hợp lệ nhưng body không GPS (giữ behavior hiện hành:
 *   event với geofenceResult null).
 */
async function evaluateGeofenceConfig(
  tx: Prisma.TransactionClient,
  workerId: string,
  now: Date,
): Promise<{ status: 'NOT_CONFIGURED' | 'NO_GPS' }> {
  const sites = await tx.site.findMany({
    where: {
      project: {
        assignments: {
          some: {
            status: 'ACTIVE',
            workerId,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
          },
        },
      },
    },
    select: { latitude: true, longitude: true, radiusMeters: true, geoConfirmedAt: true },
  }) as unknown as SiteGeoRow[];

  const validSites = sites.filter((s) =>
    s.latitude != null && s.longitude != null && s.geoConfirmedAt != null,
  );
  if (validSites.length === 0) return { status: 'NOT_CONFIGURED' };
  return { status: 'NO_GPS' };
}

/**
 * Geofence TRÊN các Site ĐÃ ĐƯỢC ADMIN XÁC NHẬN (marker + toạ độ đủ) của
 * assignment ACTIVE (DEC-04 + T0 §6). `workerId` suy ra từ server. Chạy trên
 * `tx` đã set context.
 */
async function checkGeofenceForConfirmedSites(
  tx: Prisma.TransactionClient,
  workerId: string,
  lat: number,
  lng: number,
  now: Date,
): Promise<'INSIDE' | 'OUTSIDE'> {
  const sites = await tx.site.findMany({
    where: {
      project: {
        assignments: {
          some: {
            status: 'ACTIVE',
            workerId,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
          },
        },
      },
    },
    select: { latitude: true, longitude: true, radiusMeters: true, geoConfirmedAt: true },
  }) as unknown as SiteGeoRow[];

  const validSites = sites.filter((s) =>
    s.latitude != null && s.longitude != null && s.geoConfirmedAt != null,
  );
  for (const site of validSites) {
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

  if (ctx.mustChangePassword) {
    return NextResponse.json(
      {
        error: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Vui lòng đổi mật khẩu ban đầu trước khi chấm công.',
      },
      { status: 403 },
    );
  }

  if (!ctx.workerId) {
    return NextResponse.json({ error: 'NOT_A_WORKER' }, { status: 403 });
  }
  const workerId = ctx.workerId;

  const prisma = getPrisma();
  const payloadHash = buildPayloadHash(data);
  const hasGps = data.gpsLatitude != null && data.gpsLongitude != null;
  const now = new Date();

  try {
    // Geofence read (scoped) + attendance INSERT trong CÙNG transaction hệ thống.
    const result = await withSystemDb(prisma, SYSTEM_CHECKIN, async (tx) => {
      // Gate trạng thái NLĐ (RQ-09 / DEC-15): khi worker ở trạng thái TERMINATED (OFF) hoặc chưa VERIFIED -> chặn 403
      const workerDelegate = (tx as unknown as {
        worker?: {
          findUnique: (args: {
            where: { id: string };
            select: { profileStatus: true; employmentStatus: true };
          }) => Promise<{ profileStatus: string; employmentStatus: string } | null>;
        };
      }).worker;
      if (workerDelegate?.findUnique) {
        const workerState = await workerDelegate.findUnique({
          where: { id: workerId },
          select: { profileStatus: true, employmentStatus: true },
        });
        if (
          workerState &&
          (workerState.profileStatus !== 'VERIFIED' || workerState.employmentStatus !== 'ACTIVE')
        ) {
          return { configStatus: { status: 'WORKER_NOT_ACTIVE' as const } } as const;
        }
      }

      // Global sites của assignment ACTIVE + config gate (T0 §6 — fail-closed):
      // lat/lng null được lọc bỏ (KHÔNG (0,0)), site chưa Admin xác nhận bị
      // loại ⇒ NONE không bao giờ phát sinh; thiếu config ⇒ NO EVENT + 422.
      const configStatus = await evaluateGeofenceConfig(tx, workerId, now);

      if (configStatus.status === 'NOT_CONFIGURED') {
        return { configStatus } as const;
      }

      let geofence: 'INSIDE' | 'OUTSIDE' | null = null;
      if (hasGps) {
        geofence = await checkGeofenceForConfirmedSites(
          tx,
          workerId,
          data.gpsLatitude!,
          data.gpsLongitude!,
          now,
        );
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
          geofenceResult: geofence,
        },
        select: { id: true },
      });
      return {
        configStatus,
        eventId: event.id,
        geofenceResult: geofence,
        riskFlag: geofence === 'OUTSIDE',
      } as const;
    });

    // T0 §6: fail-closed — site chưa cấu hình/xác nhận hoặc worker không thuộc
    // assignment ACTIVE nào có site hợp lệ ⇒ KHÔNG ghi event.
    // HTTP 422 (không dùng 503) vì web worker page hiện coi 503 là tín hiệu
    // OFFLINE (queueOffline). Gap contract đã ghi HANDOFF cho T0 chốt.
    if (result.configStatus.status === 'WORKER_NOT_ACTIVE') {
      return NextResponse.json(
        {
          error: 'FORBIDDEN_NOT_VERIFIED',
          message:
            'Hồ sơ người lao động chưa được xác minh hoặc không còn trong đợt làm việc đang hoạt động (ON).',
        },
        { status: 403 },
      );
    }

    if (result.configStatus.status === 'NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'SITE_GEOFENCE_NOT_CONFIGURED',
          message:
            'Site nhà máy của phân công ACTIVE chưa có tọa độ GPS hợp lệ hoặc chưa được Admin/BoD xác nhận. Vui lòng liên hệ Admin cấu hình GPS trong Admin panel rồi thử lại.',
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: 'eventId' in result ? result.eventId : null,
      message: result.riskFlag ? 'Chấm công thành công (cảnh báo: ngoài khu vực)' : 'Chấm công thành công!',
      riskFlag: result.riskFlag,
      geofenceResult: result.geofenceResult,
    });
  } catch (err: unknown) {
    const errorCode = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
    if (errorCode === 'P2002') {
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
