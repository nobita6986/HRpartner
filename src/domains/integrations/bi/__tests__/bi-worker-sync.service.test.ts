import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  decryptBiSyncSecret,
  decryptWorkerInitialPassword,
  encryptBiSyncSecret,
} from '../bi-credential-vault';
import { normalizeBiEpisodeItem } from '../bi-sync-client';
import {
  applyBiWorkerEpisodeInTx,
  runBiWorkerSync,
  syncBiCatalogProjectInTx,
} from '../bi-worker-sync.service';
import { listWorkerInitialCredentials } from '../bi-initial-credentials.service';
import {
  clearLoginFailures,
  isLoginRateLimited,
  recordLoginFailure,
  resetLoginRateLimiterForTests,
} from '@/src/shared/auth/login-rate-limiter';

function createInMemoryBiDb() {
  const state = {
    users: new Map<string, Record<string, any>>(),
    workers: new Map<string, Record<string, any>>(),
    projects: new Map<string, Record<string, any>>(),
    sites: new Map<string, Record<string, any>>(),
    assignments: new Map<string, Record<string, any>>(),
    links: new Map<string, Record<string, any>>(),
    exceptions: new Map<string, Record<string, any>>(),
    runs: new Map<string, Record<string, any>>(),
    initialCreds: new Map<string, Record<string, any>>(),
    biCred: null as Record<string, any> | null,
    auditLogs: [] as Record<string, any>[],
    attendanceCountByAssignment: new Map<string, number>(),
  };

  let seq = 1;
  const nextId = (prefix: string) => `${prefix}-${seq++}`;

  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    clientCompany: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cli-bi' }),
      create: vi.fn().mockResolvedValue({ id: 'cli-bi' }),
    },
    biSyncCredential: {
      findUnique: vi.fn(async () => state.biCred),
      create: vi.fn(async ({ data }: any) => {
        state.biCred = { ...data, updatedAt: new Date() };
        return state.biCred;
      }),
      update: vi.fn(async ({ data }: any) => {
        state.biCred = { ...(state.biCred ?? {}), ...data, updatedAt: new Date() };
        return state.biCred;
      }),
      upsert: vi.fn(async ({ create, update }: any) => {
        state.biCred = state.biCred
          ? { ...state.biCred, ...update, updatedAt: new Date() }
          : { ...create, updatedAt: new Date() };
        return state.biCred;
      }),
    },
    biSyncRun: {
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('run');
        const row = { id, ...data };
        state.runs.set(id, row);
        return { id };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.runs.get(where.id) ?? {};
        const next = { ...cur, ...data };
        state.runs.set(where.id, next);
        return next;
      }),
    },
    externalEntityLink: {
      findUnique: vi.fn(async ({ where }: any) => {
        const k = where.sourceSystem_entityType_externalId;
        return state.links.get(`${k.sourceSystem}:${k.entityType}:${k.externalId}`) ?? null;
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const k = where.sourceSystem_entityType_externalId;
        const mapKey = `${k.sourceSystem}:${k.entityType}:${k.externalId}`;
        const existing = state.links.get(mapKey);
        const next = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: nextId('link'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.links.set(mapKey, next);
        return next;
      }),
    },
    biSyncException: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const k = where.exceptionType_externalId;
        const mapKey = `${k.exceptionType}:${k.externalId}`;
        const existing = state.exceptions.get(mapKey);
        const next = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: nextId('ex'), ...create, createdAt: new Date(), updatedAt: new Date() };
        state.exceptions.set(mapKey, next);
        return next;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [key, val] of state.exceptions.entries()) {
          const matchType = !where.exceptionType || val.exceptionType === where.exceptionType;
          const matchExt = !where.externalId || val.externalId === where.externalId;
          const matchStatus = !where.status || val.status === where.status;
          if (matchType && matchExt && matchStatus) {
            state.exceptions.set(key, { ...val, ...data });
            count++;
          }
        }
        return { count };
      }),
    },
    project: {
      findUnique: vi.fn(async ({ where }: any) => state.projects.get(where.id) ?? null),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const p of state.projects.values()) {
          if (where?.OR) {
            for (const cond of where.OR) {
              if (cond.code && p.code === cond.code) return p;
              if (
                cond.name?.equals &&
                p.name.toLowerCase() === String(cond.name.equals).toLowerCase()
              ) {
                return p;
              }
            }
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const all = Array.from(state.projects.values());
        if (!where?.OR) return all;
        return all.filter((p) =>
          where.OR.some(
            (c: any) =>
              (c.pmUserId && p.pmUserId === c.pmUserId) ||
              (c.subPmUserId1 && p.subPmUserId1 === c.subPmUserId1) ||
              (c.subPmUserId2 && p.subPmUserId2 === c.subPmUserId2),
          ),
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('prj');
        const row = { id, ...data };
        state.projects.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.projects.get(where.id)!;
        const next = { ...cur, ...data };
        state.projects.set(where.id, next);
        return next;
      }),
    },
    site: {
      findUnique: vi.fn(async ({ where }: any) => {
        const k = where.sourceSystem_externalRef;
        for (const s of state.sites.values()) {
          if (s.sourceSystem === k.sourceSystem && s.externalRef === k.externalRef) return s;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('site');
        const row = { id, ...data };
        state.sites.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.sites.get(where.id)!;
        const next = { ...cur, ...data };
        state.sites.set(where.id, next);
        return next;
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return state.users.get(where.id) ?? null;
        if (where.phone) {
          for (const u of state.users.values()) {
            if (u.phone === where.phone) return u;
          }
        }
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        if (where?.phone) {
          for (const u of state.users.values()) {
            if (u.phone === where.phone) return u;
          }
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('usr');
        const row = { id, ...data };
        state.users.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.users.get(where.id)!;
        const next = { ...cur, ...data };
        state.users.set(where.id, next);
        return next;
      }),
    },
    worker: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return state.workers.get(where.id) ?? null;
        if (where.cccdNumber) {
          for (const w of state.workers.values()) {
            if (w.cccdNumber === where.cccdNumber) return w;
          }
        }
        if (where.phone) {
          for (const w of state.workers.values()) {
            if (w.phone === where.phone) return w;
          }
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('wrk');
        const row = { id, ...data };
        state.workers.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.workers.get(where.id)!;
        const next = { ...cur, ...data };
        if (data.account?.connect?.id) {
          next.accountUserId = data.account.connect.id;
        }
        state.workers.set(where.id, next);
        return next;
      }),
    },
    workerInitialCredential: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = state.initialCreds.get(where.userId);
        const next = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { ...create, createdAt: new Date(), updatedAt: new Date() };
        state.initialCreds.set(where.userId, next);
        return next;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const rows = Array.from(state.initialCreds.values()).filter((r) => {
          if (typeof where?.projectId === 'string' && r.projectId !== where.projectId) {
            return false;
          }
          if (where?.projectId?.in && !where.projectId.in.includes(r.projectId)) {
            return false;
          }
          const u = state.users.get(r.userId);
          if (where?.user?.mustChangePassword === true && !u?.mustChangePassword) {
            return false;
          }
          return true;
        });

        return rows.map((r) => {
          const u = state.users.get(r.userId)!;
          const w = state.workers.get(r.workerId)!;
          const proj = r.projectId ? state.projects.get(r.projectId) ?? null : null;
          const workerAssignments = Array.from(state.assignments.values())
            .filter((a) => a.workerId === w.id)
            .map((a) => ({
              ...a,
              project: state.projects.get(a.projectId) ?? null,
            }));
          return {
            ...r,
            user: u,
            worker: { ...w, assignments: workerAssignments },
            project: proj,
          };
        });
      }),
    },
    projectAssignment: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return state.assignments.get(where.id) ?? null;
        if (where.sourceSystem_externalRef) {
          const k = where.sourceSystem_externalRef;
          for (const a of state.assignments.values()) {
            if (a.sourceSystem === k.sourceSystem && a.externalRef === k.externalRef) return a;
          }
        }
        if (where.projectId_employeeCode) {
          const k = where.projectId_employeeCode;
          for (const a of state.assignments.values()) {
            if (a.projectId === k.projectId && a.employeeCode === k.employeeCode) return a;
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(state.assignments.values())
          .filter((a) => !where?.workerId || a.workerId === where.workerId)
          .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
      }),
      count: vi.fn(async ({ where }: any) => {
        return Array.from(state.assignments.values()).filter(
          (a) =>
            (!where?.workerId || a.workerId === where.workerId) &&
            (!where?.status || a.status === where.status),
        ).length;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = nextId('asg');
        const row = { id, createdAt: new Date(), ...data };
        state.assignments.set(id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = state.assignments.get(where.id)!;
        const next = { ...cur, ...data };
        state.assignments.set(where.id, next);
        return next;
      }),
    },
    attendanceEvent: {
      count: vi.fn(async ({ where }: any) => {
        const assignmentId = where?.OR?.[0]?.assignmentId;
        return (assignmentId && state.attendanceCountByAssignment.get(assignmentId)) || 0;
      }),
    },
    timesheetLine: {
      count: vi.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        state.auditLogs.push(data);
        return data;
      }),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (cb: (t: any) => Promise<any>) => cb(tx)),
  } as unknown as PrismaClient;

  return { state, tx: tx as unknown as Prisma.TransactionClient, prisma };
}

describe('hrp-bi-worker-sync-v1 — Service, Rules #1-#4, Vault & Scoped Credentials', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret-for-bi-vault-derivation-123456';
    resetLoginRateLimiterForTests();
  });

  it('AC-11 (Rule #4): Catalog location = null hoặc confirmedAt = null tuyệt đối không suy đoán tọa độ, giữ geoConfirmedAt = null và mở PROJECT_LOCATION_MISSING; tự đóng khi có tọa độ xác nhận', async () => {
    const { state, tx } = createInMemoryBiDb();

    // Lần 1: Dự án chưa có tọa độ (location = null)
    const first = await syncBiCatalogProjectInTx(tx, {
      projectId: 'canon-que-vo',
      displayName: 'Canon Quế Võ',
      active: true,
      version: 1,
      updatedAt: '2026-11-03T06:00:00.000Z',
      location: null,
    });
    expect(first.locationExceptionOpened).toBe(true);

    const siteAfterFirst = Array.from(state.sites.values())[0];
    expect(siteAfterFirst.latitude).toBeNull();
    expect(siteAfterFirst.longitude).toBeNull();
    expect(siteAfterFirst.geoConfirmedAt).toBeNull();
    expect(state.exceptions.get('PROJECT_LOCATION_MISSING:canon-que-vo')?.status).toBe('OPEN');

    // Lần 2: Catalog cập nhật tọa độ đã xác nhận
    const second = await syncBiCatalogProjectInTx(tx, {
      projectId: 'canon-que-vo',
      displayName: 'Canon Quế Võ',
      active: true,
      version: 2,
      updatedAt: '2026-11-03T10:00:00.000Z',
      location: {
        address: 'KCN Quế Võ, Bắc Ninh',
        latitude: 21.158765,
        longitude: 106.123456,
        radiusMeters: 250,
        confirmedAt: '2026-11-03T09:55:00.000Z',
      },
    });
    expect(second.locationExceptionOpened).toBe(false);

    const siteAfterSecond = Array.from(state.sites.values())[0];
    expect(siteAfterSecond.latitude).toBe(21.158765);
    expect(siteAfterSecond.longitude).toBe(106.123456);
    expect(siteAfterSecond.radiusMeters).toBe(250);
    expect(siteAfterSecond.geoConfirmedAt).toBeInstanceOf(Date);
    expect(state.exceptions.get('PROJECT_LOCATION_MISSING:canon-que-vo')?.status).toBe('RESOLVED');
  });

  it('AC-01, AC-02, AC-04: Đợt ON tạo User (mustChangePassword=true), Worker (ACTIVE), Assignment (ACTIVE) + mật khẩu mã hóa; bảo toàn selfEditedFields; chuyển OFF đặt TERMINATED nhưng giữ User.isActive=true', async () => {
    const { state, tx } = createInMemoryBiDb();

    const onEpisode = normalizeBiEpisodeItem({
      episodeId: 'ep-001',
      sync_version: 10,
      isTombstone: false,
      employeeCode: 'hrp-2026-000101',
      nationalId: '001099001122',
      nationalIdState: 'VALID',
      person: {
        fullName: 'Trần Văn Nam',
        dateOfBirth: '1999-07-10',
        gender: 'MALE',
        phone: '0912 345 678',
        address: 'Bình Tuyền, Phú Thọ',
      },
      projectId: 'samsung-yen-phong',
      firstWorkDate: '2026-10-20',
      laborType: 'TEMPORARY',
      providerType: 'hrp',
      recruiter: {
        recruiterId: 'rec-1',
        personnelCode: 'NV-0123',
        displayName: 'Nguyễn Thị Hoa',
      },
      status: {
        value: 'ON',
        effectiveDate: '2026-10-20',
        leaveDate: null,
      },
    });

    const applied = await applyBiWorkerEpisodeInTx(tx, onEpisode);
    expect(applied.outcome).toBe('APPLIED');

    const user = Array.from(state.users.values())[0];
    const worker = Array.from(state.workers.values())[0];
    const assignment = Array.from(state.assignments.values())[0];
    const initialCred = state.initialCreds.get(user.id);

    expect(user.mustChangePassword).toBe(true);
    expect(user.isActive).toBe(true);
    expect(worker.cccdNumber).toBe('001099001122');
    expect(worker.employmentStatus).toBe('ACTIVE');
    expect(assignment.status).toBe('ACTIVE');
    expect(assignment.recruiterName).toBe('Nguyễn Thị Hoa');
    expect(assignment.recruiterCode).toBe('NV-0123');
    expect(initialCred).toBeDefined();

    const plainInitialPw = decryptWorkerInitialPassword(initialCred!.ciphertext);
    expect(plainInitialPw).toHaveLength(10);

    // Giả lập NLĐ tự sửa fullName trên HRP (selfEditedFields = ['fullName'])
    worker.fullName = 'Trần Văn Nam (Đã Tự Sửa)';
    worker.selfEditedFields = ['fullName'];

    // BI gửi lại cùng sync_version = 10 -> Quy tắc #1: phải skip
    const skippedSameVersion = await applyBiWorkerEpisodeInTx(tx, onEpisode);
    expect(skippedSameVersion.outcome).toBe('SKIPPED_BY_VERSION');

    // BI gửi sync_version = 11 chuyển sang OFF và đổi tên bên BI -> phải giữ nguyên fullName đã tự sửa, chuyển assignment sang ENDED và Worker sang TERMINATED
    const offEpisode = normalizeBiEpisodeItem({
      ...onEpisode,
      sync_version: 11,
      person: {
        ...onEpisode.person,
        fullName: 'Tên Mới Bên BI Không Được Ghi Đè',
        address: 'Địa chỉ mới từ BI',
      },
      status: {
        value: 'OFF',
        effectiveDate: '2026-11-01',
        leaveDate: '2026-11-01',
      },
    });

    const appliedOff = await applyBiWorkerEpisodeInTx(tx, offEpisode);
    expect(appliedOff.outcome).toBe('APPLIED');

    const updatedWorker = state.workers.get(worker.id)!;
    const updatedAssignment = state.assignments.get(assignment.id)!;
    const updatedUser = state.users.get(user.id)!;

    expect(updatedWorker.fullName).toBe('Trần Văn Nam (Đã Tự Sửa)');
    expect(updatedWorker.currentAddress).toBe('Địa chỉ mới từ BI');
    expect(updatedWorker.employmentStatus).toBe('TERMINATED');
    expect(updatedAssignment.status).toBe('ENDED');
    expect(updatedAssignment.validTo?.toISOString().slice(0, 10)).toBe('2026-11-01');
    expect(updatedUser.isActive).toBe(true);
  });

  it('AC-03: Đợt thiếu CCCD không tạo User, ghi MISSING_OR_INVALID_CCCD; khi BI bổ sung CCCD hợp lệ với sync_version mới hơn thì tạo tài khoản và RESOLVED ngoại lệ', async () => {
    const { state, tx } = createInMemoryBiDb();

    const missingCccdEpisode = normalizeBiEpisodeItem({
      episodeId: 'ep-missing-cccd',
      sync_version: 1,
      isTombstone: false,
      employeeCode: 'hrp-2026-000999',
      nationalId: null,
      nationalIdState: 'MISSING',
      person: { fullName: 'Lê Thị B' },
      projectId: 'canon-que-vo',
      firstWorkDate: '2026-10-25',
      status: { value: 'ON' },
    });

    const first = await applyBiWorkerEpisodeInTx(tx, missingCccdEpisode);
    expect(first.outcome).toBe('EXCEPTION_OPENED');
    expect(state.users.size).toBe(0);
    expect(state.exceptions.get('MISSING_OR_INVALID_CCCD:ep-missing-cccd')?.status).toBe('OPEN');

    // BI cập nhật CCCD hợp lệ ở sync_version = 2
    const fixedEpisode = normalizeBiEpisodeItem({
      ...missingCccdEpisode,
      sync_version: 2,
      nationalId: '001198005566',
      nationalIdState: 'VALID',
      status: { value: 'ON' },
    });

    const second = await applyBiWorkerEpisodeInTx(tx, fixedEpisode);
    expect(second.outcome).toBe('APPLIED');
    expect(state.users.size).toBe(1);
    expect(state.exceptions.get('MISSING_OR_INVALID_CCCD:ep-missing-cccd')?.status).toBe(
      'RESOLVED',
    );
  });

  it('AC-10 (Rule #3): Tombstone xử lý idempotent theo sync_version, giữ nguyên lịch sử công (ENDED khi có công, CANCELLED khi chưa có công) kể cả đợt chưa từng đồng bộ trước đó', async () => {
    const { state, tx } = createInMemoryBiDb();

    // 1. Tombstone cho đợt chưa từng xuất hiện trên HRP
    const unseenTombstone = normalizeBiEpisodeItem({
      episodeId: 'ep-never-seen',
      sync_version: 5,
      isTombstone: true,
      tombstoneReason: 'HARD_DELETED',
      deletedAt: '2026-11-03T02:00:00.000Z',
    });
    const resUnseen = await applyBiWorkerEpisodeInTx(tx, unseenTombstone);
    expect(resUnseen.outcome).toBe('TOMBSTONE_APPLIED');

    // Phát lại cùng sync_version = 5 -> phải skip idempotent
    const replayUnseen = await applyBiWorkerEpisodeInTx(tx, unseenTombstone);
    expect(replayUnseen.outcome).toBe('SKIPPED_BY_VERSION');

    // 2. Tombstone cho đợt đang ON đã có lịch sử chấm công -> chuyển sang ENDED (không xóa cứng)
    const liveEpisode = normalizeBiEpisodeItem({
      episodeId: 'ep-with-attendance',
      sync_version: 1,
      isTombstone: false,
      employeeCode: 'hrp-2026-000222',
      nationalId: '001095007788',
      nationalIdState: 'VALID',
      person: { fullName: 'Phạm Văn C' },
      projectId: 'samsung-yen-phong',
      firstWorkDate: '2026-10-10',
      status: { value: 'ON' },
    });
    await applyBiWorkerEpisodeInTx(tx, liveEpisode);

    const createdAssignment = Array.from(state.assignments.values())[0];
    state.attendanceCountByAssignment.set(createdAssignment.id, 3);

    const tombstoneWithHistory = normalizeBiEpisodeItem({
      episodeId: 'ep-with-attendance',
      sync_version: 2,
      isTombstone: true,
      tombstoneReason: 'DELETED',
      deletedAt: '2026-11-03T04:00:00.000Z',
    });
    const resTombstone = await applyBiWorkerEpisodeInTx(tx, tombstoneWithHistory);
    expect(resTombstone.outcome).toBe('TOMBSTONE_APPLIED');

    const afterTombstone = state.assignments.get(createdAssignment.id)!;
    const workerAfter = state.workers.get(createdAssignment.workerId)!;
    expect(afterTombstone.status).toBe('ENDED');
    expect(workerAfter.employmentStatus).toBe('TERMINATED');
    expect(state.workers.size).toBe(1);
  });

  it('AC-07 (Rule #2): Phân trang opaque pageCursor & chỉ lưu checkpoint sau khi hết mọi trang (hasMore=false); lỗi trang 2 giữ nguyên checkpoint cũ và chạy lại không nhân bản trang 1', async () => {
    const { state, prisma } = createInMemoryBiDb();
    state.biCred = {
      id: 'primary',
      baseUrl: 'https://bi.hrpartner.vn/api/integrations/hrp/v1',
      apiKeyCiphertext: encryptBiSyncSecret('bi-secret-api-key-32-characters-minimum'),
      workerSyncCheckpoint: 'ckpt-initial-000',
      updatedAt: new Date(),
    };

    const requestedUrls: string[] = [];

    // Kịch bản 1: Trang 1 thành công (hasMore=true, nextPageCursor='opaque-cursor-p2'), Trang 2 lỗi HTTP 503
    const failingFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.endsWith('/catalog')) {
        return new Response(
          JSON.stringify({
            ok: true,
            serverTime: '2026-11-03T06:00:00.000Z',
            projects: [],
            recruiters: [],
            laborTypes: [],
          }),
          { status: 200 },
        );
      }
      if (url.includes('checkpoint=ckpt-initial-000')) {
        return new Response(
          JSON.stringify({
            ok: true,
            items: [
              {
                episodeId: 'ep-page-1',
                sync_version: 10,
                isTombstone: false,
                employeeCode: 'hrp-2026-000501',
                nationalId: '001091001111',
                nationalIdState: 'VALID',
                person: { fullName: 'NLĐ Trang 1' },
                projectId: 'samsung-yen-phong',
                firstWorkDate: '2026-10-20',
                status: { value: 'ON' },
              },
            ],
            hasMore: true,
            nextPageCursor: 'opaque-cursor-p2',
            checkpoint: null,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'HRP_SYNC_EPISODES_UNAVAILABLE', message: 'Temporary error on page 2' },
        }),
        { status: 503 },
      );
    }) as unknown as typeof fetch;

    const failedSummary = await runBiWorkerSync({
      prisma,
      triggerSource: 'CRON',
      mode: 'INCREMENTAL',
      fetchImpl: failingFetch,
      connectionOverride: {
        baseUrl: 'https://bi.hrpartner.vn/api/integrations/hrp/v1',
        apiKey: 'bi-secret-api-key-32-characters-minimum',
        maxRetries: 0,
      },
    });

    expect(failedSummary.status).toBe('FAILED');
    // Checkpoint trong DB bắt buộc giữ nguyên ckpt-initial-000!
    expect(state.biCred.workerSyncCheckpoint).toBe('ckpt-initial-000');
    expect(state.workers.size).toBe(1);

    // Kịch bản 2: Chạy lại từ checkpoint cũ 'ckpt-initial-000' -> Trang 1 được skip nhờ sync_version=10, Trang 2 được áp dụng và lưu checkpoint mới 'ckpt-final-002'
    const succeedingFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/catalog')) {
        return new Response(
          JSON.stringify({
            ok: true,
            serverTime: '2026-11-03T06:05:00.000Z',
            projects: [],
            recruiters: [],
            laborTypes: [],
          }),
          { status: 200 },
        );
      }
      if (url.includes('checkpoint=ckpt-initial-000')) {
        return new Response(
          JSON.stringify({
            ok: true,
            items: [
              {
                episodeId: 'ep-page-1',
                sync_version: 10,
                isTombstone: false,
                employeeCode: 'hrp-2026-000501',
                nationalId: '001091001111',
                nationalIdState: 'VALID',
                person: { fullName: 'NLĐ Trang 1' },
                projectId: 'samsung-yen-phong',
                firstWorkDate: '2026-10-20',
                status: { value: 'ON' },
              },
            ],
            hasMore: true,
            nextPageCursor: 'opaque-cursor-p2',
            checkpoint: null,
          }),
          { status: 200 },
        );
      }
      if (url.includes('pageCursor=opaque-cursor-p2')) {
        return new Response(
          JSON.stringify({
            ok: true,
            items: [
              {
                episodeId: 'ep-page-2',
                sync_version: 15,
                isTombstone: false,
                employeeCode: 'hrp-2026-000502',
                nationalId: '001092002222',
                nationalIdState: 'VALID',
                person: { fullName: 'NLĐ Trang 2' },
                projectId: 'samsung-yen-phong',
                firstWorkDate: '2026-10-21',
                status: { value: 'ON' },
              },
            ],
            hasMore: false,
            nextPageCursor: null,
            checkpoint: 'ckpt-final-002',
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof fetch;

    const okSummary = await runBiWorkerSync({
      prisma,
      triggerSource: 'CRON',
      mode: 'INCREMENTAL',
      fetchImpl: succeedingFetch,
    });

    expect(okSummary.status).toBe('SUCCEEDED');
    expect(okSummary.episodesSkipped).toBe(1);
    expect(okSummary.episodesApplied).toBe(1);
    expect(okSummary.checkpointBefore).toBe('ckpt-initial-000');
    expect(okSummary.checkpointAfter).toBe('ckpt-final-002');
    expect(state.biCred.workerSyncCheckpoint).toBe('ckpt-final-002');
    expect(state.workers.size).toBe(2);
  });

  it('AC-06: PM chỉ xem/xuất được mật khẩu ban đầu của dự án mình phụ trách và mọi lượt xem đều ghi AuditLog không lộ mật khẩu', async () => {
    const { state, tx, prisma } = createInMemoryBiDb();

    state.projects.set('prj-pm1', {
      id: 'prj-pm1',
      code: 'BIPRJ-PM1',
      name: 'Dự án của PM 1',
      pmUserId: 'pm-user-1',
    });
    state.projects.set('prj-pm2', {
      id: 'prj-pm2',
      code: 'BIPRJ-PM2',
      name: 'Dự án của PM 2',
      pmUserId: 'pm-user-2',
    });
    state.links.set('MINI_BI:PROJECT:p1', {
      id: 'l1',
      sourceSystem: 'MINI_BI',
      entityType: 'PROJECT',
      externalId: 'p1',
      hrpId: 'prj-pm1',
      lastSyncVersion: 1n,
    });
    state.links.set('MINI_BI:PROJECT:p2', {
      id: 'l2',
      sourceSystem: 'MINI_BI',
      entityType: 'PROJECT',
      externalId: 'p2',
      hrpId: 'prj-pm2',
      lastSyncVersion: 1n,
    });

    await applyBiWorkerEpisodeInTx(
      tx,
      normalizeBiEpisodeItem({
        episodeId: 'ep-p1',
        sync_version: 1,
        isTombstone: false,
        employeeCode: 'hrp-2026-000701',
        nationalId: '001090000001',
        nationalIdState: 'VALID',
        person: { fullName: 'NLĐ Dự án 1' },
        projectId: 'p1',
        firstWorkDate: '2026-10-20',
        status: { value: 'ON' },
      }),
    );

    await applyBiWorkerEpisodeInTx(
      tx,
      normalizeBiEpisodeItem({
        episodeId: 'ep-p2',
        sync_version: 1,
        isTombstone: false,
        employeeCode: 'hrp-2026-000702',
        nationalId: '001090000002',
        nationalIdState: 'VALID',
        person: { fullName: 'NLĐ Dự án 2' },
        projectId: 'p2',
        firstWorkDate: '2026-10-20',
        status: { value: 'ON' },
      }),
    );

    const pm1Items = await listWorkerInitialCredentials(prisma, {
      userId: 'pm-user-1',
      role: 'PM',
    });
    expect(pm1Items).toHaveLength(1);
    expect(pm1Items[0].cccdNumber).toBe('001090000001');
    expect(pm1Items[0].initialPassword).toHaveLength(10);

    // PM 1 cố tình truyền projectId của PM 2 -> bị chặn 403
    await expect(
      listWorkerInitialCredentials(
        prisma,
        { userId: 'pm-user-1', role: 'PM' },
        { projectId: 'prj-pm2' },
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'PROJECT_OUT_OF_SCOPE' });

    // AuditLog được ghi và tuyệt đối không chứa plaintext password
    expect(state.auditLogs).toHaveLength(1);
    expect(JSON.stringify(state.auditLogs[0])).not.toContain(pm1Items[0].initialPassword);
  });

  it('AC-05 & AC-08: Rate-limiter chặn sau 8 lần sai liên tiếp và domain separation giữa BI Sync Secret và Initial Password', () => {
    const syncCipher = encryptBiSyncSecret('super-secret-bi-key');
    expect(decryptBiSyncSecret(syncCipher)).toBe('super-secret-bi-key');
    // Không thể giải mã chéo bằng domain key của Initial Password
    expect(() => decryptWorkerInitialPassword(syncCipher)).toThrow();

    const ip = '203.0.113.10';
    const cccd = '001099012345';
    for (let i = 0; i < 7; i++) {
      recordLoginFailure(ip, cccd);
      expect(isLoginRateLimited(ip, cccd)).toBe(false);
    }
    recordLoginFailure(ip, cccd);
    expect(isLoginRateLimited(ip, cccd)).toBe(true);

    clearLoginFailures(ip, cccd);
    expect(isLoginRateLimited(ip, cccd)).toBe(false);
  });
});
