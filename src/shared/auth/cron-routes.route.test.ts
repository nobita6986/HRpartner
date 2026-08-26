/**
 * cron-routes.route.test.ts — V5-M1-06b / RQ-11 / STEP-07 / DEC-09 / DEC-10.
 *
 * UNIT (no DB): chứng minh "ZERO DB call khi deny" cho cả hai cron route. Khi
 * `verifyCronSecret` từ chối (503/401), route PHẢI trả đúng mã và KHÔNG chạm DB
 * (không `getPrisma`, không `withSystemDb`, không `drainOutboxOnce`). Khi cho phép,
 * mới gọi boundary hệ thống đúng một lần.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifyCronSecret: vi.fn(),
  getPrisma: vi.fn(() => ({ __raw: true })),
  withSystemDb: vi.fn(),
  drainOutboxOnce: vi.fn(),
  autoConfirmExpiredStatements: vi.fn(),
}));

vi.mock('@/src/shared/auth/cron-auth', () => ({ verifyCronSecret: mocks.verifyCronSecret }));
vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/with-system-db', () => ({
  withSystemDb: mocks.withSystemDb,
  SYSTEM_CRON: { userId: 'system:cron', role: 'ADMIN', purpose: 'CRON' },
}));
vi.mock('@/src/shared/integrity/outbox', () => ({ drainOutboxOnce: mocks.drainOutboxOnce }));
vi.mock('@/src/domains/reconciliation/dispute.service', () => ({
  autoConfirmExpiredStatements: mocks.autoConfirmExpiredStatements,
}));

import { GET as disputesGET } from '@/app/api/cron/disputes/route';
import { GET as outboxGET } from '@/app/api/cron/outbox/route';

const req = (path: string) => new NextRequest('http://localhost' + path);

describe('cron routes — fail-closed + zero-DB-on-deny (DEC-09/DEC-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrisma.mockReturnValue({ __raw: true });
    mocks.withSystemDb.mockResolvedValue({ vendorConfirmed: 0, clientConfirmed: 0 });
    mocks.drainOutboxOnce.mockResolvedValue({ processed: 0, failed: 0, skipped: 0 });
  });

  it('disputes: secret chưa cấu hình → 503, KHÔNG chạm DB', async () => {
    mocks.verifyCronSecret.mockReturnValue({ ok: false, status: 503, code: 'CRON_NOT_CONFIGURED' });
    const res = await disputesGET(req('/api/cron/disputes'));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'CRON_NOT_CONFIGURED' });
    expect(mocks.getPrisma).not.toHaveBeenCalled();
    expect(mocks.withSystemDb).not.toHaveBeenCalled();
    expect(mocks.autoConfirmExpiredStatements).not.toHaveBeenCalled();
  });

  it('disputes: header sai → 401, KHÔNG chạm DB', async () => {
    mocks.verifyCronSecret.mockReturnValue({ ok: false, status: 401, code: 'UNAUTHORIZED' });
    const res = await disputesGET(req('/api/cron/disputes'));
    expect(res.status).toBe(401);
    expect(mocks.getPrisma).not.toHaveBeenCalled();
    expect(mocks.withSystemDb).not.toHaveBeenCalled();
  });

  it('disputes: cho phép → chạy qua withSystemDb (SYSTEM_CRON) đúng 1 lần', async () => {
    mocks.verifyCronSecret.mockReturnValue({ ok: true });
    const res = await disputesGET(req('/api/cron/disputes'));
    expect(res.status).toBe(200);
    expect(mocks.getPrisma).toHaveBeenCalledTimes(1);
    expect(mocks.withSystemDb).toHaveBeenCalledTimes(1);
    // Boundary hệ thống nhận đúng principal SYSTEM_CRON.
    expect(mocks.withSystemDb.mock.calls[0][1]).toMatchObject({ purpose: 'CRON', role: 'ADMIN' });
  });

  it('outbox: secret chưa cấu hình → 503, KHÔNG drain', async () => {
    mocks.verifyCronSecret.mockReturnValue({ ok: false, status: 503, code: 'CRON_NOT_CONFIGURED' });
    const res = await outboxGET(req('/api/cron/outbox'));
    expect(res.status).toBe(503);
    expect(mocks.getPrisma).not.toHaveBeenCalled();
    expect(mocks.drainOutboxOnce).not.toHaveBeenCalled();
  });

  it('outbox: cho phép → drainOutboxOnce đúng 1 lần', async () => {
    mocks.verifyCronSecret.mockReturnValue({ ok: true });
    const res = await outboxGET(req('/api/cron/outbox'));
    expect(res.status).toBe(200);
    expect(mocks.drainOutboxOnce).toHaveBeenCalledTimes(1);
  });
});
