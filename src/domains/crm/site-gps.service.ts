/**
 * site-gps.service.ts — hrp-t1a-android-gps-project-site-config (T0 directive B4).
 *
 * Quản lý cấu hình GPS (địa chỉ, latitude, longitude, radius) cho Site thuộc
 * Project HIỆN HỮU — phục vụ Admin/BoD trên /admin/projects/[id] và kết nối
 * backend geofence chấm công (contract web-android §4.D + §14.3/§14.5).
 *
 * RANH GIỚI:
 *  - Role write: CHỈ `PROJECT_GEO_CONFIG_ROLES = ['ADMIN','DIRECTOR']` (BoD =
 *    role DIRECTOR trong SystemRole). KHÔNG mở cho HR_MANAGER/PM như
 *    PROJECT_UPDATE_ROLES — cấu hình geofence là hành động an toàn nhạy cảm.
 *  - KHÔNG tạo Project mới; KHÔNG seed; KHÔNG tự suy toạ độ từ tên/địa chỉ
 *    (chỉ nhận toạ độ Admin submit + validate).
 *  - Confirm marker: mọi lưu thành công có toạ độ hợp lệ set
 *    `geoConfirmedAt/geoConfirmedById`; bỏ toạ độ (null cả hai) ⇒ clear
 *    markers. `radiusMeters` mặc định 200 KHÔNG tự động là confirmed.
 *  - Audit: mỗi mutation ghi AuditLog (entityType 'Site', action
 *    GPS_CREATE|GPS_UPDATE, diff trước/sau) trong CÙNG transaction qua
 *    `writeAuditLog` hiện hành.
 *  - Không nhận projectId/siteId từ body — caller truyền từ route params.
 */
import type { Prisma } from '@prisma/client';
import { writeAuditLog } from '@/src/shared/integrity/audit';
import type { AuthContext } from '@/src/shared/auth/auth-context';

export const PROJECT_GEO_CONFIG_ROLES = ['ADMIN', 'DIRECTOR'] as const;

export type SiteGpsServiceErrorCode = 'NOT_FOUND' | 'PERMISSION_DENIED' | 'VALIDATION';

export class SiteGpsServiceError extends Error {
  constructor(
    public readonly code: SiteGpsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SiteGpsServiceError';
  }
}

/** Trạng thái cấu hình GPS của một Site (cho UI + check-in gate). */
export type SiteGpsStatus = 'CONFIRMED' | 'UNCONFIRMED' | 'MISSING_GEO';

export interface SiteGpsDto {
  id: string;
  projectId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  gpsStatus: SiteGpsStatus;
  geoConfirmedAt: string | null;
  geoConfirmedById: string | null;
}

export interface SiteGpsAuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SiteGpsCreateInput {
  name: string;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface SiteGpsUpdateInput {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
}

/** Giới hạn hợp lệ (trong đó radius: nguyên dương với sanity cap theo TASK DEC-02). */
export const SITE_GPS_LIMITS = {
  nameMaxLength: 200,
  addressMaxLength: 500,
  latitudeMin: -90,
  latitudeMax: 90,
  longitudeMin: -180,
  longitudeMax: 180,
  radiusMin: 1,
  radiusMax: 2000,
  coordinatePrecision: 7,
} as const;

type NumericLike = number | string | null | undefined;

function parseCoordinate(
  value: NumericLike,
  fieldLabel: 'latitude' | 'longitude',
  min: number,
  max: number,
): { value: number | null } | { error: string } {
  if (value === undefined || value === null) return { value: null };
  let num: number;
  if (typeof value === 'number') num = value;
  else if (typeof value === 'string') {
    const trimmed = value.trim();
    // Chỉ nhận form số đơn giản; precision ≤ 7 thập phân (schema Decimal(10,7)).
    if (!/^-?\d+(\.\d{1,7})?$/.test(trimmed)) {
      return { error: `${fieldLabel} phải là số hợp lệ với tối đa ${SITE_GPS_LIMITS.coordinatePrecision} số thập phân.` };
    }
    num = Number(trimmed);
  } else {
    return { error: `${fieldLabel} phải là số.` };
  }
  if (!Number.isFinite(num)) return { error: `${fieldLabel} phải là số.` };
  if (num < min || num > max) return { error: `${fieldLabel} phải nằm trong khoảng ${min}..${max}.` };
  return { value: Math.round(num * 1e7) / 1e7 };
}

/** "Provided" = field có trong payload (null = nêu rõ bỏ toạ độ). */
function hasCoordinateProvided(v: NumericLike): boolean {
  return v !== undefined;
}

function parseRadius(
  value: NumericLike, fieldLabel: 'radiusMeters',
): { value: number | null } | { error: string } {
  if (value === undefined) return { value: null };
  if (value === null) return { error: `${fieldLabel} phải là số nguyên dương.` };
  let num: number;
  if (typeof value === 'number') num = value;
  else if (typeof value === 'string') {
    const trimmed = value.trim();
    // Chỉ nhận nguyên dương ("số nguyên dương" theo directive).
    if (!/^\d+$/.test(trimmed)) {
      return { error: `${fieldLabel} phải là số nguyên dương.` };
    }
    num = Number(trimmed);
  } else {
    return { error: `${fieldLabel} phải là số nguyên dương.` };
  }
  if (!Number.isInteger(num) || num < SITE_GPS_LIMITS.radiusMin || num > SITE_GPS_LIMITS.radiusMax) {
    return { error: `${fieldLabel} phải là số nguyên từ ${SITE_GPS_LIMITS.radiusMin} đến ${SITE_GPS_LIMITS.radiusMax}.` };
  }
  return { value: num };
}

function parseText(value: unknown, fieldLabel: 'name' | 'address', maxLength: number, required: boolean):
  { value: string | null } | { error: string } {
  if (value === undefined || value === null) {
    if (required) return { error: `${fieldLabel} là bắt buộc.` };
    return { value: null };
  }
  if (typeof value !== 'string') return { error: `${fieldLabel} phải là chuỗi.` };
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) return { error: `${fieldLabel} là bắt buộc.` };
    return { value: null };
  }
  if (trimmed.length > maxLength) return { error: `${fieldLabel} tối đa ${maxLength} ký tự.` };
  return { value: trimmed };
}

export type SiteGpsValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Create Site: cần name; lat/lng both-or-neither; radius BẮT BUỘC Admin nhập
 * tường minh (T0 correction: KHÔNG tự dùng default 200 làm bằng chứng xác nhận
 * GPS — markers chỉ đặt khi payload create có đủ tọa độ + radius hợp lệ).
 */
export function validateSiteGpsCreatePayload(raw: unknown): SiteGpsValidationResult<SiteGpsCreateInput> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Body phải là object JSON.' };
  }
  const body = raw as Record<string, unknown>;

  const nameRes = parseText(body.name, 'name', SITE_GPS_LIMITS.nameMaxLength, true);
  if ('error' in nameRes) return { ok: false, error: nameRes.error };

  const addressRes = parseText(body.address, 'address', SITE_GPS_LIMITS.addressMaxLength, false);
  if ('error' in addressRes) return { ok: false, error: addressRes.error };

  // lat + lng both-or-neither (directive 4).
  if ((hasCoordinateProvided(body.latitude as number) ? 1 : 0)
    !== (hasCoordinateProvided(body.longitude as number) ? 1 : 0)) {
    return { ok: false, error: 'latitude và longitude phải được cung cấp cùng nhau hoặc cùng bỏ trống.' };
  }

  const latRes = parseCoordinate(body.latitude as NumericLike, 'latitude', SITE_GPS_LIMITS.latitudeMin, SITE_GPS_LIMITS.latitudeMax);
  if ('error' in latRes) return { ok: false, error: latRes.error };
  const lngRes = parseCoordinate(body.longitude as NumericLike, 'longitude', SITE_GPS_LIMITS.longitudeMin, SITE_GPS_LIMITS.longitudeMax);
  if ('error' in lngRes) return { ok: false, error: lngRes.error };

  // T0 correction: radius BẮT BUỘC tường minh khi tạo Site (không default 200).
  if (body.radiusMeters === undefined) {
    return { ok: false, error: 'radiusMeters là bắt buộc khi tạo Site — Admin phải chủ động chọn bán kính geofence (không dùng giá trị mặc định).' };
  }
  const radiusRes = parseRadius(body.radiusMeters as NumericLike, 'radiusMeters');
  if ('error' in radiusRes) return { ok: false, error: radiusRes.error };

  return {
    ok: true,
    value: {
      name: nameRes.value!,
      address: addressRes.value,
      latitude: latRes.value,
      longitude: lngRes.value,
      radiusMeters: radiusRes.value!,
    },
  };
}

/** Update Site: ít nhất một field; lat/lng both-or-neither; tọa độ mới cần radius tường minh. */
export function validateSiteGpsUpdatePayload(raw: unknown): SiteGpsValidationResult<SiteGpsUpdateInput> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Body phải là object JSON.' };
  }
  const body = raw as Record<string, unknown>;
  const out: SiteGpsUpdateInput = {};
  let anyKnown = false;

  const addressRes = parseText(body.address, 'address', SITE_GPS_LIMITS.addressMaxLength, false);
  if ('error' in addressRes) return { ok: false, error: addressRes.error };
  if (body.address !== undefined) { out.address = addressRes.value; anyKnown = true; }

  if ((hasCoordinateProvided(body.latitude as number) ? 1 : 0)
    !== (hasCoordinateProvided(body.longitude as number) ? 1 : 0)) {
    return { ok: false, error: 'latitude và longitude phải được cung cấp cùng nhau hoặc cùng bỏ trống.' };
  }

  const latRes = parseCoordinate(body.latitude as NumericLike, 'latitude', SITE_GPS_LIMITS.latitudeMin, SITE_GPS_LIMITS.latitudeMax);
  if ('error' in latRes) return { ok: false, error: latRes.error };
  const lngRes = parseCoordinate(body.longitude as NumericLike, 'longitude', SITE_GPS_LIMITS.longitudeMin, SITE_GPS_LIMITS.longitudeMax);
  if ('error' in lngRes) return { ok: false, error: lngRes.error };

  if (body.latitude !== undefined) { out.latitude = latRes.value; anyKnown = true; }
  if (body.longitude !== undefined) { out.longitude = lngRes.value; anyKnown = true; }

  if (out.latitude != null && body.radiusMeters === undefined) {
    return { ok: false, error: 'radiusMeters là bắt buộc khi cập nhật tọa độ để xác nhận đầy đủ cấu hình GPS.' };
  }

  const radiusRes = parseRadius(body.radiusMeters as NumericLike, 'radiusMeters');
  if ('error' in radiusRes) return { ok: false, error: radiusRes.error };
  if (body.radiusMeters !== undefined) { out.radiusMeters = radiusRes.value!; anyKnown = true; }

  if (!anyKnown) return { ok: false, error: 'Cần ít nhất một trong: address, latitude+longitude, radiusMeters.' };
  return { ok: true, value: out };
}

type SiteRowLike = {
  id: string;
  name: string;
  address: string | null;
  latitude: unknown;
  longitude: unknown;
  radiusMeters: number;
  geoConfirmedAt: Date | null;
  geoConfirmedById: string | null;
};

function toSiteGpsDto(row: SiteRowLike): SiteGpsDto {
  const lat = row.latitude == null ? null : Number(row.latitude);
  const lng = row.longitude == null ? null : Number(row.longitude);
  const gpsStatus: SiteGpsStatus =
    lat == null || lng == null
      ? 'MISSING_GEO'
      : row.geoConfirmedAt == null
        ? 'UNCONFIRMED'
        : 'CONFIRMED';
  return {
    id: row.id,
    projectId: (row as unknown as { projectId: string }).projectId,
    name: row.name,
    address: row.address,
    latitude: lat,
    longitude: lng,
    radiusMeters: row.radiusMeters,
    gpsStatus,
    geoConfirmedAt: row.geoConfirmedAt ? row.geoConfirmedAt.toISOString() : null,
    geoConfirmedById: row.geoConfirmedById,
  };
}

function assertGeoRole(ctx: AuthContext): void {
  if (!(PROJECT_GEO_CONFIG_ROLES as ReadonlyArray<string>).includes(ctx.role)) {
    throw new SiteGpsServiceError(
      'PERMISSION_DENIED',
      `Chỉ Admin/BoD (ADMIN/DIRECTOR) mới được cấu hình GPS của Site. Vai trò hiện tại: ${ctx.role}.`,
    );
  }
}

function auditActor(ctx: AuthContext, meta?: SiteGpsAuditMeta) {
  return {
    id: ctx.userId,
    role: ctx.role,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  };
}

const SITE_GPS_SELECT = {
  id: true,
  projectId: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  radiusMeters: true,
  geoConfirmedAt: true,
  geoConfirmedById: true,
} as const;

/**
 * Danh sách Site của Project (kèm trạng thái GPS xác nhận) — read-only,
 * dành cho Admin UI. Không mutation.
 */
export async function listProjectSites(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<SiteGpsDto[]> {
  const rows = await tx.site.findMany({
    where: { projectId },
    select: SITE_GPS_SELECT,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return rows.map(toSiteGpsDto);
}

/**
 * Tạo Site gắn vào Project HIỆN HỮU (T0: cho phép khi Project chưa có Site;
 * không tạo Project mới, không seed, không tự suy toạ độ).
 * Caller PHẢI mở transaction qua `withDbContext` (L2 GUC) — audit cùng tx.
 */
export async function createSiteForProject(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  raw: unknown,
  auditMeta?: SiteGpsAuditMeta,
): Promise<SiteGpsDto> {
  assertGeoRole(ctx);

  const parsed = validateSiteGpsCreatePayload(raw);
  if (!parsed.ok) throw new SiteGpsServiceError('VALIDATION', parsed.error);

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true },
  });
  if (!project) {
    throw new SiteGpsServiceError('NOT_FOUND', `Không tìm thấy dự án ${projectId} hoặc nằm ngoài phạm vi truy cập.`);
  }

  const hasCoords = parsed.value.latitude != null && parsed.value.longitude != null;
  const created = await tx.site.create({
    data: {
      projectId,
      name: parsed.value.name,
      ...(parsed.value.address !== undefined ? { address: parsed.value.address } : {}),
      ...(parsed.value.latitude != null ? { latitude: parsed.value.latitude } : {}),
      ...(parsed.value.longitude != null ? { longitude: parsed.value.longitude } : {}),
      radiusMeters: parsed.value.radiusMeters,
      // Confirm markers chỉ khi có toạ độ hợp lệ (DEC-03).
      ...(hasCoords ? { geoConfirmedAt: new Date(), geoConfirmedById: ctx.userId } : {}),
    },
    select: SITE_GPS_SELECT,
  });

  await writeAuditLog({
    prisma: (tx as unknown as Parameters<typeof writeAuditLog>[0]['prisma']),
    actor: auditActor(ctx, auditMeta),
    entityType: 'Site',
    entityId: created.id,
    action: 'GPS_CREATE',
    diff: { before: null, after: toSiteGpsDto(created) },
    reason: `Tạo Site cho dự án ${project.code ?? projectId}`,
  });

  return toSiteGpsDto(created);
}

/**
 * Cập nhật địa chỉ/tọa độ/bán kính của Site thuộc Project (T0 B4).
 * - Site phải thuộc Project từ route param — không tin site ID client gửi chéo.
 * - T0 CORRECTION (confirm markers): markers CHỈ được set khi payload CÓ
 *   tường minh latitude + longitude + radiusMeters hợp lệ — tức Admin chủ động
 *   (re-)configure đầy đủ cấu hình geofence trong lần save này. Cập nhật TỪNG PHẦN
 *   (chỉ radius / chỉ address) GIỮ NGUYÊN marker hiện tại ⇒ Site legacy
 *   chưa xác nhận giữ trạng thái chưa xác nhận; site đã xác nhận giữ marker.
 * - Bỏ toạ độ (lat + lng null) ⇒ clear markers.
 * Caller PHẢI mở transaction qua `withDbContext`.
 */
export async function updateSiteGps(
  tx: Prisma.TransactionClient,
  ctx: AuthContext,
  projectId: string,
  siteId: string,
  raw: unknown,
  auditMeta?: SiteGpsAuditMeta,
): Promise<SiteGpsDto> {
  assertGeoRole(ctx);

  const parsed = validateSiteGpsUpdatePayload(raw);
  if (!parsed.ok) throw new SiteGpsServiceError('VALIDATION', parsed.error);
  const input = parsed.value;

  const existing = await tx.site.findFirst({
    where: { id: siteId, projectId },
    select: SITE_GPS_SELECT,
  });
  if (!existing) {
    throw new SiteGpsServiceError('NOT_FOUND', `Không tìm thấy site ${siteId} thuộc dự án ${projectId}.`);
  }

  const before = toSiteGpsDto(existing);

  // T0 CORRECTION — explicit-confirm rule:
  //   - hasValidCoords = payload lần này CÓ tường minh latitude + longitude
  //     hợp lệ và radiusMeters ⇒ markers set;
  //   - coordsCleared (cả hai null) ⇒ markers clear;
  //   - cập nhật từng phần (chỉ radius / chỉ address) ⇒ markers GIỮ NGUYÊN
  //     (legacy UNCONFIRMED giữ UNCONFIRMED; CONFIRMED vẫn CONFIRMED).
  const coordsProvidedExplicitly = input.latitude !== undefined && input.longitude !== undefined;
  const hasValidCoords = coordsProvidedExplicitly
    && input.latitude != null
    && input.longitude != null
    && input.radiusMeters !== undefined;
  const coordsCleared = coordsProvidedExplicitly && input.latitude == null && input.longitude == null;

  const updated = await tx.site.update({
    where: { id: siteId },
    data: {
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.radiusMeters !== undefined ? { radiusMeters: input.radiusMeters } : {}),
      // Confirm markers (T0 correction): CHỈ set khi Admin gửi đủ tọa độ + bán kính;
      // partial update giữ nguyên marker.
      geoConfirmedAt: hasValidCoords ? new Date() : coordsCleared ? null : existing.geoConfirmedAt,
      geoConfirmedById: hasValidCoords ? ctx.userId : coordsCleared ? null : existing.geoConfirmedById,
    },
    select: SITE_GPS_SELECT,
  });

  const after = toSiteGpsDto(updated);

  await writeAuditLog({
    prisma: (tx as unknown as Parameters<typeof writeAuditLog>[0]['prisma']),
    actor: auditActor(ctx, auditMeta),
    entityType: 'Site',
    entityId: siteId,
    action: 'GPS_UPDATE',
    diff: { before, after },
    reason: 'Cấu hình GPS Site (địa chỉ/tọa độ/bán kính) từ Admin panel',
  });

  return after;
}
