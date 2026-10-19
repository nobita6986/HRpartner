/**
 * site-gps.service.test.ts — hrp-t1a-android-gps-project-site-config.
 *
 * UNIT (no DB, tx là mock object):
 *   - Role gate: ADMIN/DIRECTOR pass; HR_MANAGER/PM/HR_STAFF/SALE/WORKER → typed
 *     PERMISSION_DENIED (AC-02).
 *   - Validation (AC-03): lat/lng both-or-neither; miền giá trị; precision;
 *     radius integer 1..2000; create cần name 1..200; unknown field bị bỏ qua.
 *   - updateSiteGps (AC-04): coords hợp lệ ⇒ update + set confirm markers + audit
 *     GPS_UPDATE diff before/after cùng tx; clear coords ⇒ lat/lng + markers null;
 *     site không thuộc project ⇒ NOT_FOUND.
 *   - createSiteForProject (AC-05): project phải tồn tại (404); site create +
 *     audit GPS_CREATE; create không coords ⇒ MISSING_GEO không markers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auditLogCreate: vi.fn(),
}));

import {
  PROJECT_GEO_CONFIG_ROLES,
  createSiteForProject,
  listProjectSites,
  updateSiteGps,
  validateSiteGpsCreatePayload,
  validateSiteGpsUpdatePayload,
} from '@/src/domains/crm/site-gps.service';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import type { Prisma } from '@prisma/client';

type Ctx = AuthContext;

const actor = (role: string): Ctx => ({ userId: 'admin-1', role: role as Ctx['role'] });

const EXISTING_SITE = {
  id: 'site-1',
  projectId: 'p1',
  name: 'Samsung SEVT Cổng B',
  address: 'Thái Nguyên',
  latitude: '21.4925' as unknown as Prisma.Decimal,
  longitude: '105.8239' as unknown as Prisma.Decimal,
  radiusMeters: 800,
  geoConfirmedAt: null as Date | null,
  geoConfirmedById: null as string | null,
};

function makeTx(overrides: {
  siteFindFirst?: unknown;
  siteUpdate?: unknown;
  siteCreate?: unknown;
  projectFindUnique?: unknown;
  siteFindMany?: unknown;
}) {
  return {
    site: {
      findFirst: overrides.siteFindFirst ?? vi.fn().mockResolvedValue(EXISTING_SITE),
      update: overrides.siteUpdate ?? vi.fn().mockResolvedValue(EXISTING_SITE),
      create: overrides.siteCreate ?? vi.fn().mockResolvedValue({ ...EXISTING_SITE, id: 'site-new' }),
      findMany: overrides.siteFindMany ?? vi.fn().mockResolvedValue([EXISTING_SITE]),
    },
    project: {
      findUnique: overrides.projectFindUnique ?? vi.fn().mockResolvedValue({ id: 'p1', code: 'PRJ-2025-001' }),
    },
    auditLog: { create: mocks.auditLogCreate },
  } as unknown as Prisma.TransactionClient;
}

describe('PROJECT_GEO_CONFIG_ROLES mapping (AC-02)', () => {
  it('CHỈ ADMIN + DIRECTOR trong allowlist', () => {
    expect(PROJECT_GEO_CONFIG_ROLES).toEqual(['ADMIN', 'DIRECTOR']);
    expect(PROJECT_GEO_CONFIG_ROLES).not.toContain('HR_MANAGER');
    expect(PROJECT_GEO_CONFIG_ROLES).not.toContain('PM');
    expect(PROJECT_GEO_CONFIG_ROLES).not.toContain('HR_STAFF');
  });
});

describe('validateSiteGpsCreatePayload (AC-03)', () => {
  const base = { name: 'Cổng B', latitude: 21.4925, longitude: 105.8239, radiusMeters: 800 };

  it('hợp lệ → giá trị chuẩn (round to 7 decimals)', () => {
    const r = validateSiteGpsCreatePayload({ ...base, address: '  Phổ Yên  ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ name: 'Cổng B', address: 'Phổ Yên', latitude: 21.4925, longitude: 105.8239, radiusMeters: 800 });
    }
  });

  it('lat có nhưng lng thiếu → lỗi both-or-neither', () => {
    const r = validateSiteGpsCreatePayload({ ...base, longitude: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('cùng nhau hoặc cùng bỏ trống');
  });

  it('latitude ngoài miền → lỗi', () => {
    const r = validateSiteGpsCreatePayload({ ...base, latitude: 95 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('-90..90');
  });

  it('longitude ngoài miền → lỗi', () => {
    const r = validateSiteGpsCreatePayload({ ...base, longitude: 200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('-180..180');
  });

  it('precision > 7 thập phân → lỗi', () => {
    const r = validateSiteGpsCreatePayload({ ...base, latitude: '21.12345678' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('7');
  });

  it('radius không nguyên dương → lỗi', () => {
    expect(validateSiteGpsCreatePayload({ ...base, radiusMeters: 0 }).ok).toBe(false);
    expect(validateSiteGpsCreatePayload({ ...base, radiusMeters: -50 }).ok).toBe(false);
    expect(validateSiteGpsCreatePayload({ ...base, radiusMeters: 800.5 }).ok).toBe(false);
    expect(validateSiteGpsCreatePayload({ ...base, radiusMeters: 2001 }).ok).toBe(false);
    expect(validateSiteGpsCreatePayload({ ...base, radiusMeters: 2000 }).ok).toBe(true);
  });

  it('REGRESSION (T0 correction): create thiếu radiusMeters → VALIDATION, KHÔNG default 200', () => {
    const r = validateSiteGpsCreatePayload({ name: 'X', latitude: 21.5, longitude: 105.8 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('radiusMeters là bắt buộc');
      expect(r.error).not.toContain('200');
    }
    // Không toạ độ cũng phải nhập radius tường minh (Admin chủ động chọn).
    const r2 = validateSiteGpsCreatePayload({ name: 'X' });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain('radiusMeters là bắt buộc');
  });

  it('thiếu name / name quá dài → lỗi', () => {
    expect(validateSiteGpsCreatePayload({ latitude: 0, longitude: 0, radiusMeters: 200 }).ok).toBe(false);
    expect(validateSiteGpsCreatePayload({ name: 'a'.repeat(201), latitude: 0, longitude: 0, radiusMeters: 200 }).ok).toBe(false);
  });

  it('unknown field bị strip (không throw)', () => {
    const r = validateSiteGpsCreatePayload({ ...base, projectId: 'evil-project', siteId: 'other' });
    expect(r.ok).toBe(true);
  });

  it('body không phải object → lỗi', () => {
    expect(validateSiteGpsCreatePayload(null).ok).toBe(false);
    expect(validateSiteGpsCreatePayload([1, 2]).ok).toBe(false);
    expect(validateSiteGpsCreatePayload('x').ok).toBe(false);
  });
});

describe('validateSiteGpsUpdatePayload (AC-03)', () => {
  it('update chỉ address được chấp nhận', () => {
    const r = validateSiteGpsUpdatePayload({ address: 'Địa chỉ mới' });
    expect(r.ok).toBe(true);
  });

  it('empty payload → lỗi (cần ít nhất một field)', () => {
    const r = validateSiteGpsUpdatePayload({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('ít nhất');
  });

  it('clear coords: latitude null + longitude null cùng nhau ⇒ valid', () => {
    const r = validateSiteGpsUpdatePayload({ latitude: null, longitude: null });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.latitude).toBeNull();
      expect(r.value.longitude).toBeNull();
    }
  });

  it('chỉ một bên null → lỗi both-or-neither', () => {
    const r = validateSiteGpsUpdatePayload({ latitude: null });
    expect(r.ok).toBe(false);
  });

  it('projectId/siteId không nằm trong allowlist (bị bỏ qua)', () => {
    const r = validateSiteGpsUpdatePayload({ projectId: 'evil', radiusMeters: 500 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect('projectId' in r.value).toBe(false);
      expect(r.value.radiusMeters).toBe(500);
    }
  });

  it('tọa độ mới bắt buộc có radiusMeters tường minh; radius null bị từ chối', () => {
    const missingRadius = validateSiteGpsUpdatePayload({ latitude: 21.49, longitude: 105.83 });
    expect(missingRadius.ok).toBe(false);
    if (!missingRadius.ok) expect(missingRadius.error).toContain('radiusMeters là bắt buộc');

    expect(validateSiteGpsUpdatePayload({ latitude: 21.49, longitude: 105.83, radiusMeters: 800 }).ok).toBe(true);
    expect(validateSiteGpsUpdatePayload({ radiusMeters: null }).ok).toBe(false);
  });
});

function expectAuditRoleError(fn: () => Promise<unknown>): Promise<void> {
  return expect(fn()).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
}

describe('updateSiteGps (AC-02 + AC-04)', () => {
  beforeEach(() => {
    mocks.auditLogCreate.mockReset();
    mocks.auditLogCreate.mockImplementation((row: unknown) => Promise.resolve(row));
  });

  it('SITE_GEOFENCE: role ngoài ADMIN/DIRECTOR → PERMISSION_DENIED, không query', async () => {
    for (const role of ['HR_MANAGER', 'PM', 'HR_STAFF', 'SALE', 'WORKER']) {
      const tx = makeTx({});
      await expectAuditRoleError(() => updateSiteGps(tx, actor(role), 'p1', 'site-1', { radiusMeters: 500 }));
    }
  });

  it('site thuộc project khác (findFirst null) → NOT_FOUND', async () => {
    const tx = makeTx({ siteFindFirst: vi.fn().mockResolvedValue(null) });
    await expect(updateSiteGps(tx, actor('ADMIN'), 'p1', 'site-other', { radiusMeters: 500 })).rejects
      .toMatchObject({ code: 'NOT_FOUND' });
  });

  it('VALIDATION error khi payload rỗng', async () => {
    const tx = makeTx({});
    await expect(updateSiteGps(tx, actor('ADMIN'), 'p1', 'site-1', {})).rejects
      .toMatchObject({ code: 'VALIDATION' });
  });

  it('REGRESSION (T0 correction): partial update CHỈ radius trên site legacy UNCONFIRMED → markers GIỮ NGUYÊN (null), không confirm', async () => {
    // EXISTING_SITE: coords có (21.4925/105.8239) nhưng geoConfirmedAt = null (legacy).
    const siteUpdate = vi.fn().mockResolvedValue({
      ...EXISTING_SITE,
      radiusMeters: 900,
      // marker vẫn null — service KHÔNG set trong partial update.
      geoConfirmedAt: null,
      geoConfirmedById: null,
    });
    const tx = makeTx({ siteUpdate });
    const out = await updateSiteGps(tx, actor('DIRECTOR'), 'p1', 'site-1', { radiusMeters: 900 });

    const data = (siteUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    // markers KHÔNG bị set (giữ nguyên null của legacy).
    expect(data.geoConfirmedAt).toBeNull();
    expect(data.geoConfirmedById).toBeNull();
    expect(data.radiusMeters).toBe(900);
    expect(data.latitude).toBeUndefined(); // partial: không đụng coords
    expect(out.gpsStatus).toBe('UNCONFIRMED');
  });

  it('REGRESSION (T0 follow-up): cập nhật tọa độ thiếu radius → VALIDATION trước khi query/update/audit', async () => {
    const siteFindFirst = vi.fn();
    const siteUpdate = vi.fn();
    const tx = makeTx({ siteFindFirst, siteUpdate });

    await expect(updateSiteGps(tx, actor('ADMIN'), 'p1', 'site-1', { latitude: 21.49, longitude: 105.83 }))
      .rejects.toMatchObject({ code: 'VALIDATION' });
    expect(siteFindFirst).not.toHaveBeenCalled();
    expect(siteUpdate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it('REGRESSION (T0 correction): partial update CHỈ address trên site CONFIRMED → markers giữ nguyên', async () => {
    const confirmedAt = new Date('2026-10-19T00:00:00.000Z');
    const siteUpdate = vi.fn().mockResolvedValue({
      ...EXISTING_SITE,
      address: 'Địa chỉ mới',
      geoConfirmedAt: confirmedAt,
      geoConfirmedById: 'admin-1',
    });
    const tx = makeTx({
      siteFindFirst: vi.fn().mockResolvedValue({
        ...EXISTING_SITE,
        geoConfirmedAt: confirmedAt,
        geoConfirmedById: 'admin-1',
      }),
      siteUpdate,
    });
    await updateSiteGps(tx, actor('ADMIN'), 'p1', 'site-1', { address: 'Địa chỉ mới' });

    const data = (siteUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    // markers giữ nguyên giá trị hiện có (không clear, không re-stamp).
    expect(data.geoConfirmedAt).toBe(confirmedAt);
    expect(data.geoConfirmedById).toBe('admin-1');
    expect(data.address).toBe('Địa chỉ mới');
  });

  it('update tường minh đủ lat+lng+radius (Admin re-configure geofence) → markers set + audit GPS_UPDATE', async () => {
    // T0 correction: chỉ payload CÓ cả tọa độ và radius hợp lệ mới confirm.
    const siteUpdate = vi.fn().mockResolvedValue({
      ...EXISTING_SITE,
      latitude: '21.4900' as unknown as Prisma.Decimal,
      longitude: '105.8300' as unknown as Prisma.Decimal,
      radiusMeters: 900,
      geoConfirmedAt: new Date('2026-10-19T00:00:00.000Z'),
      geoConfirmedById: 'admin-1',
    });
    const tx = makeTx({ siteUpdate });
    const out = await updateSiteGps(
      tx,
      actor('DIRECTOR'),
      'p1',
      'site-1',
      { latitude: '21.49', longitude: '105.83', radiusMeters: 900 },
    );

    expect(siteUpdate).toHaveBeenCalledTimes(1);
    const data = (siteUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.geoConfirmedAt).toBeInstanceOf(Date);
    expect(data.geoConfirmedById).toBe('admin-1');
    expect(data.radiusMeters).toBe(900);
    expect(out.gpsStatus).toBe('CONFIRMED');

    // audit cùng tx: GPS_UPDATE diff before/after (create arg = { data: row })
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(1);
    const auditArg = mocks.auditLogCreate.mock.calls[0][0] as {
      data: { action: string; entityType: string; entityId: string };
    };
    expect(auditArg.data.action).toBe('GPS_UPDATE');
    expect(auditArg.data.entityType).toBe('Site');
    expect(auditArg.data.entityId).toBe('site-1');
  });

  it('clear coords (lat + lng null) → columns + markers null (audit diff ghi rõ)', async () => {
    const siteUpdate = vi.fn().mockResolvedValue({
      ...EXISTING_SITE,
      latitude: null as unknown as Prisma.Decimal,
      longitude: null as unknown as Prisma.Decimal,
      geoConfirmedAt: null,
      geoConfirmedById: null,
    });
    const tx = makeTx({ siteUpdate });
    const out = await updateSiteGps(tx, actor('ADMIN'), 'p1', 'site-1', { latitude: null, longitude: null });

    const data = (siteUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.geoConfirmedAt).toBeNull();
    expect(data.geoConfirmedById).toBeNull();
    expect(out.gpsStatus).toBe('MISSING_GEO');
    expect(out.latitude).toBeNull();
  });
});

describe('createSiteForProject (AC-05)', () => {
  beforeEach(() => {
    mocks.auditLogCreate.mockReset();
    mocks.auditLogCreate.mockImplementation((row: unknown) => Promise.resolve(row));
  });

  it('project không tồn tại → NOT_FOUND, không create', async () => {
    const tx = makeTx({ projectFindUnique: vi.fn().mockResolvedValue(null) });
    await expect(
      createSiteForProject(tx, actor('ADMIN'), 'px', { name: 'S', latitude: 1, longitude: 1, radiusMeters: 500 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('VALIDATION khi name thiếu', async () => {
    const tx = makeTx({});
    await expect(createSiteForProject(tx, actor('ADMIN'), 'p1', { latitude: 1, longitude: 1 })).rejects
      .toMatchObject({ code: 'VALIDATION' });
  });

  it('create hợp lệ có coords → markers set + audit GPS_CREATE; GPS status CONFIRMED', async () => {
    const siteCreate = vi.fn().mockResolvedValue({
      id: 'site-new',
      projectId: 'p1',
      name: 'Cổng B',
      address: null,
      latitude: '21.4925' as unknown as Prisma.Decimal,
      longitude: '105.8239' as unknown as Prisma.Decimal,
      radiusMeters: 800,
      geoConfirmedAt: new Date('2026-10-19T00:00:00.000Z'),
      geoConfirmedById: 'admin-1',
    });
    const tx = makeTx({ siteCreate });
    const out = await createSiteForProject(
      tx,
      actor('ADMIN'),
      'p1',
      { name: 'Cổng B', latitude: '21.4925', longitude: '105.8239', radiusMeters: 800 },
    );

    const data = (siteCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.projectId).toBe('p1');
    expect(data.name).toBe('Cổng B');
    expect(data.geoConfirmedAt).toBeInstanceOf(Date);
    expect(data.geoConfirmedById).toBe('admin-1');

    expect(out.gpsStatus).toBe('CONFIRMED');
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(1);
    const auditArg = mocks.auditLogCreate.mock.calls[0][0] as { data: { action: string; diff: { before: unknown } } };
    expect(auditArg.data.action).toBe('GPS_CREATE');
    expect(auditArg.data.diff.before).toBeNull();
  });

  it('create không coords → MISSING_GEO, không markers (radius vẫn bắt buộc tường minh)', async () => {
    const siteCreate = vi.fn().mockResolvedValue({
      id: 'site-new',
      projectId: 'p1',
      name: 'Site chưa GPS',
      address: null,
      latitude: null as unknown as Prisma.Decimal,
      longitude: null as unknown as Prisma.Decimal,
      radiusMeters: 200,
      geoConfirmedAt: null,
      geoConfirmedById: null,
    });
    const tx = makeTx({ siteCreate });
    // Radius phải có trong payload (Admin chủ động chọn) — T0 correction.
    const out = await createSiteForProject(tx, actor('DIRECTOR'), 'p1', { name: 'Site chưa GPS', radiusMeters: 200 });
    const data = (siteCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.geoConfirmedAt).toBeUndefined();
    expect(data.geoConfirmedById).toBeUndefined();
    expect(data.radiusMeters).toBe(200);
    expect(out.gpsStatus).toBe('MISSING_GEO');
  });
});

describe('listProjectSites (AC-08 basis)', () => {
  it('dự án có nhiều site → DTO đúng status', async () => {
    const tx = makeTx({
      siteFindMany: vi.fn().mockResolvedValue([
        { ...EXISTING_SITE, geoConfirmedAt: new Date('2026-10-19T00:00:00.000Z'), geoConfirmedById: 'admin-1' },
        { ...EXISTING_SITE, id: 's2', latitude: '0' as unknown as Prisma.Decimal, longitude: '0' as unknown as Prisma.Decimal, geoConfirmedAt: null },
        { ...EXISTING_SITE, id: 's3', latitude: null as unknown as Prisma.Decimal },
      ]),
    });
    const out = await listProjectSites(tx, 'p1');
    expect(out).toHaveLength(3);
    expect(out[0].gpsStatus).toBe('CONFIRMED');
    expect(out[1].gpsStatus).toBe('UNCONFIRMED');
    expect(out[2].gpsStatus).toBe('MISSING_GEO');
    expect((out[0] as unknown as { radiusMeters: number }).radiusMeters).toBe(800);
  });
});
