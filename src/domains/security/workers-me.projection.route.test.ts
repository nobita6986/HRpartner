/**
 * workers-me.projection.route.test.ts — V5-M1-09A / RQ-06 / STEP-04 / AC-03 (DEC-05).
 *
 * GET /api/workers/me: WORKER self-profile qua allowlist DTO (projectWorker THẬT).
 *   - SELF_PROFILE: WORKER thấy CCCD/bank của CHÍNH MÌNH kể cả KHÔNG có
 *     CAN_VIEW_WORKER_SENSITIVE (canSeeSensitive=true theo action).
 *   - cccdChipData LUÔN bị omit khỏi HTTP kể cả self, kể cả khi có permission (DEC-05).
 *   - Worker identity = ctx.workerId (server); query `workerId` KHÔNG override được.
 *   - Chỉ WORKER; 12 role còn lại → 403. Thiếu workerId → 404.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SYSTEM_ROLES } from '@/src/shared/projection/manifest';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  resolvePerms: vi.fn(),
  withDbContext: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error { code = 'UNAUTHENTICATED'; },
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({ resolveEffectivePermissions: mocks.resolvePerms }));
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
// worker-projection + manifest: KHÔNG mock — kiểm chứng hành vi projection THẬT.

import { GET } from '@/app/api/workers/me/route';

const NON_WORKER = SYSTEM_ROLES.filter((r) => r !== 'WORKER'); // 12 role

// Raw worker THÙ ĐỊCH: chip data raw + CCCD/bank thật + Date.
const HOSTILE_WORKER = {
  id: 'worker-self-1',
  fullName: 'Synthetic Self Worker',
  cccdNumber: '012345678901',
  bankAccount: '1234567890',
  bankName: 'Synthetic Bank',
  cccdChipData: 'RAW-CHIP-CANARY',
  createdAt: new Date('2026-08-28T00:00:00.000Z'),
};

const fakeTx = () => ({ worker: { findUnique: mocks.findUnique } });
// query workerId khác self để chứng minh nó bị BỎ QUA (identity = ctx.workerId).
const req = () => new NextRequest('http://localhost/api/workers/me?workerId=OTHER-999');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withDbContext.mockImplementation((_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => cb(fakeTx()));
  mocks.findUnique.mockResolvedValue(HOSTILE_WORKER);
  mocks.resolvePerms.mockResolvedValue(new Set<string>()); // KHÔNG có CAN_VIEW_WORKER_SENSITIVE
});

describe('GET /api/workers/me — self projection (AC-03 / DEC-05)', () => {
  it('WORKER (no permission) → 200, self thấy CCCD/bank thật, chip bị omit', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'usr-self', role: 'WORKER', workerId: 'worker-self-1' });
    const res = await GET(req());
    expect(res.status).toBe(200);

    const json = await res.json();
    // SELF_PROFILE: thấy dữ liệu của chính mình dù resolvePerms rỗng.
    expect(json.worker.cccdNumber).toBe('012345678901');
    expect(json.worker.bankAccount).toBe('1234567890');
    // DEC-05: cccdChipData KHÔNG bao giờ là key; raw chip không rò rỉ.
    expect(json.worker).not.toHaveProperty('cccdChipData');
    expect(JSON.stringify(json)).not.toContain('RAW-CHIP-CANARY');

    // identity = ctx.workerId; query `workerId=OTHER-999` bị bỏ qua.
    expect(mocks.findUnique.mock.calls[0][0].where.id).toBe('worker-self-1');
    expect(mocks.resolvePerms.mock.calls[0][0]).toEqual({ userId: 'usr-self', role: 'WORKER' });
  });

  it('WORKER CÓ CAN_VIEW_WORKER_SENSITIVE → cccdChipData VẪN bị omit (always-omit)', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'usr-self', role: 'WORKER', workerId: 'worker-self-1' });
    mocks.resolvePerms.mockResolvedValue(new Set<string>(['CAN_VIEW_WORKER_SENSITIVE']));
    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.worker).not.toHaveProperty('cccdChipData');
    expect(json.worker.cccdNumber).toBe('012345678901');
  });

  it('WORKER thiếu workerId → 404, KHÔNG chạm DB', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'usr-self', role: 'WORKER', workerId: undefined });
    const res = await GET(req());
    expect(res.status).toBe(404);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('WORKER có workerId nhưng row null → 404', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'usr-self', role: 'WORKER', workerId: 'worker-self-1' });
    mocks.findUnique.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it.each(NON_WORKER)('%s → 403 TRƯỚC khi chạm DB', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u1', role, workerId: 'w1' });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.resolvePerms).not.toHaveBeenCalled();
  });

  it('enumerate đúng 13 role (1 WORKER + 12 non-WORKER) — enum drift → fail', () => {
    expect(1 + NON_WORKER.length).toBe(13);
  });
});
