/**
 * statements-margin.route.test.ts — V5-M1-06c / RQ-02 / STEP-02 / AC-02 / OQ-02.
 *
 * UNIT (no DB): role matrix cho margin (`GET /api/statements/margin`).
 * Margin là aggregate tài chính toàn cục → chỉ {ADMIN, ACCOUNTANT, DIRECTOR} (§7.2).
 * DB access qua withDbContext (L2 GUC) — KHÔNG L1 (ClientStatement chưa có builder,
 * OQ-01 cấm builder mới) → cùng pattern statements/route.ts. calculateMargin được mock.
 *   - viewer + month/year → 200 (string hoá Decimal); non-viewer → 403 KHÔNG tính;
 *     thiếu month/year → 400; MarginPermissionError (defense-in-depth) → 403.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  calculateMargin: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {},
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (t: unknown) => unknown) => mocks.dbContext(cb),
}));
vi.mock('@/src/domains/reconciliation/margin.service', () => ({
  calculateMargin: mocks.calculateMargin,
  MarginPermissionError: class MarginPermissionError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { GET } from '@/app/api/statements/margin/route';
import { MarginPermissionError } from '@/src/domains/reconciliation/margin.service';

const req = (qs = '?month=6&year=2026') =>
  new NextRequest('http://localhost/api/statements/margin' + qs);

describe('statements margin — role matrix (RQ-02 / AC-02 / OQ-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateMargin.mockResolvedValue({
      month: 6,
      year: 2026,
      totalClientReceivable: 100,
      totalVendorPayable: 60,
      margin: 40,
    });
    // withDbContext gọi cb với tx đã scope (L2). tx không cần thật vì calculateMargin mock.
    mocks.dbContext.mockImplementation((cb: (t: unknown) => unknown) => cb({}));
  });

  it.each(['ADMIN', 'ACCOUNTANT', 'DIRECTOR'])('GET: %s → 200, Decimal string hoá', async (role) => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mocks.dbContext).toHaveBeenCalledTimes(1);
    expect(mocks.calculateMargin).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json.margin.totalClientReceivable).toBe('100');
    expect(json.margin.margin).toBe('40');
  });

  it.each(['HR_MANAGER', 'HR_STAFF', 'PM', 'SALE', 'MKT', 'WORKER', 'VENDOR_ADMIN'])(
    'GET: %s → 403 (không có quyền margin), KHÔNG tính',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const res = await GET(req());
      expect(res.status).toBe(403);
      expect(mocks.dbContext).not.toHaveBeenCalled();
      expect(mocks.calculateMargin).not.toHaveBeenCalled();
    },
  );

  it('GET: thiếu month/year → 400, KHÔNG tính', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ADMIN' });
    const res = await GET(req('?year=2026'));
    expect(res.status).toBe(400);
    expect(mocks.calculateMargin).not.toHaveBeenCalled();
  });

  it('GET: MarginPermissionError (defense-in-depth) → 403', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u', role: 'ACCOUNTANT' });
    mocks.calculateMargin.mockRejectedValueOnce(new MarginPermissionError('PERMISSION_DENIED', 'denied'));
    const res = await GET(req());
    expect(res.status).toBe(403);
  });
});
