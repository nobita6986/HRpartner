/**
 * jobs-alias.route.test.ts — T1A Android backend mobile contract.
 *
 * UNIT: GET /api/jobs alias `search`→`q`, `zone`→`area` (TASK DEC-08 / AC-09):
 *   - search + zone map đúng sang listPublicJobProjection;
 *   - param gốc (q/area) ưu tiên khi cả hai truyền;
 *   - không alias → hành vi byte-compat hiện hành (q/area undefined);
 *   - urgency sai → 400 (giữ nguyên); POST vẫn 410 retired (DEC-10).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  listPublicJobProjection: vi.fn(),
  enforceRateLimits: vi.fn(),
  retiredApplyEndpointResponse: vi.fn(),
}));

vi.mock('@/src/domains/job-board/public.service', () => ({
  listPublicJobProjection: mocks.listPublicJobProjection,
}));
vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));
vi.mock('@/src/shared/auth/with-public-db', () => ({
  withPublicDb: (_p: unknown, cb: (t: unknown) => unknown) => cb({ __tx: true }),
}));
vi.mock('@/src/shared/security/rate-limit-guard', () => ({
  enforceRateLimits: mocks.enforceRateLimits,
}));
vi.mock('@/src/shared/observability/correlation-id', () => ({
  getCorrelationId: () => 'req-1',
}));
vi.mock('@/src/shared/security/retired-endpoint', () => ({
  retiredApplyEndpointResponse: () => mocks.retiredApplyEndpointResponse(),
}));

import { GET, POST } from '@/app/api/jobs/route';

const getReq = (query = '') => new NextRequest(`http://localhost/api/jobs${query}`);

describe('GET /api/jobs alias (AC-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimits.mockResolvedValue(null);
    mocks.listPublicJobProjection.mockResolvedValue({ ok: true });
  });

  it('alias search/zone map sang q/area', async () => {
    const res = await GET(getReq('?search=samsung&zone=thai-nguyen'));
    expect(res.status).toBe(200);
    const arg = mocks.listPublicJobProjection.mock.calls[0][1];
    expect(arg.q).toBe('samsung');
    expect(arg.area).toBe('thai-nguyen');
  });

  it('param gốc ưu tiên khi cả hai cùng truyền', async () => {
    await GET(getReq('?q=native-q&search=alias-search&area=native-a&zone=alias-zone'));
    const arg = mocks.listPublicJobProjection.mock.calls[0][1];
    expect(arg.q).toBe('native-q');
    expect(arg.area).toBe('native-a');
  });

  it('không param → q/area undefined (byte-compat)', async () => {
    await GET(getReq('?limit=5'));
    const arg = mocks.listPublicJobProjection.mock.calls[0][1];
    expect(arg.q).toBeUndefined();
    expect(arg.area).toBeUndefined();
  });

  it('urgency sai → 400, không chạm projection', async () => {
    const res = await GET(getReq('?urgency=WRONG'));
    expect(res.status).toBe(400);
    expect(mocks.listPublicJobProjection).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs (DEC-10 boundary)', () => {
  it('vẫn 410 retired — KHÔNG bị task này cấu', async () => {
    mocks.retiredApplyEndpointResponse.mockReturnValue(
      new Response(null, { status: 410 }),
    );
    const res = await POST();
    expect(res.status).toBe(410);
  });
});
