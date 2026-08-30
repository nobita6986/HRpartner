/**
 * marketplace-browse.routes.test.ts — V5-OPS-06A / RQ-03/08 / STEP-02/04 / AC-03/07,
 * mở rộng ở V5-go-live-04 / RQ-07 / STEP-08 / AC-11.
 *
 * Chứng minh trên route thật (import handler, không mô phỏng):
 *   - `GET /api/jobs` và `GET /api/jobs/[slug]` chạy limiter TRƯỚC truy vấn:
 *     429/503 ⇒ đường đọc DB KHÔNG được mở (zero DB call).
 *   - list + detail dùng CHUNG một bucket JOB_BROWSE (DEC-04) — cùng surface, cùng digest.
 *   - `POST /api/jobs` và `POST /api/jobs/apply` đã RETIRE: 410 deterministic,
 *     zero DB, không gọi cả limiter (DEC-10/RQ-08).
 *
 * go-live-04 / AC-11 — hai thay đổi có chủ đích, vì bản cũ hợp thức hoá chính defect P0:
 *   1. Fixture happy path là MỘT job thật, không còn `{ jobs: [], total: 0 }`. Trước đây
 *      danh sách rỗng vừa là "thành công" của test vừa là triệu chứng của bug ⇒ test xanh
 *      trong khi bề mặt việc làm chết.
 *   2. Mốc "zero DB call" đổi từ `$transaction` trần sang helper `withPublicDb`. Route nay
 *      phải đi qua helper; `$transaction` trần bị assert là KHÔNG BAO GIỜ được gọi, nên nếu
 *      ai bỏ helper để quay về đường không GUC thì test này ĐỎ chứ không im lặng trả 0 dòng.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CANONICAL_APPLY_PATH_TEMPLATE } from '@/src/shared/security/retired-endpoint';
import {
  RATE_LIMIT_RULES,
  RateLimitUnavailableError,
  type RateLimitDecision,
  type RateLimitProvider,
  type RateLimitRule,
} from '@/src/shared/security/rate-limit-port';
import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import { __resetSink, __captureSink } from '@/src/shared/observability/logger';
// Type-only ⇒ bị xoá khi biên dịch, không phá `vi.mock` của service. Ràng fixture vào DTO
// THẬT: thêm/đổi field trong projection công khai mà quên fixture thì tsc đỏ.
import type { PublicJobDto, PublicJobListResult } from '@/src/domains/job-board/public.service';

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  withPublicDb: vi.fn(),
  listPublicJobProjection: vi.fn(),
  getPublicJobProjection: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ $transaction: mocks.$transaction }) }));
// go-live-04 / STEP-08: chỉ thay `withPublicDb` bằng spy, giữ nguyên hằng principal thật
// (`PUBLIC_READ_PRINCIPAL`, `PUBLIC_READ_ONLY_GUC`) — hành vi GUC/read-only của helper đã có
// test đơn vị riêng ở `src/shared/auth/with-public-db.test.ts`, đây chỉ đo đường đi của route.
vi.mock('@/src/shared/auth/with-public-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/auth/with-public-db')>()),
  withPublicDb: mocks.withPublicDb,
}));
vi.mock('@/src/domains/job-board/public.service', () => ({
  listPublicJobProjection: mocks.listPublicJobProjection,
  getPublicJobProjection: mocks.getPublicJobProjection,
}));

import { GET as GET_LIST, POST as POST_LEGACY_JOBS } from '@/app/api/jobs/route';
import { GET as GET_DETAIL } from '@/app/api/jobs/[slug]/route';
import { POST as POST_LEGACY_APPLY } from '@/app/api/jobs/apply/route';

interface Recorded {
  rule: RateLimitRule;
  identifier: string;
}

function providerThat(mode: 'allow' | 'deny' | 'throw'): { provider: RateLimitProvider; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const provider: RateLimitProvider = {
    kind: 'memory',
    async limit(rule, identifier): Promise<RateLimitDecision> {
      calls.push({ rule, identifier });
      if (mode === 'throw') throw new RateLimitUnavailableError('PROVIDER_TIMEOUT');
      return {
        allowed: mode === 'allow',
        limit: rule.limit,
        remaining: mode === 'allow' ? rule.limit - 1 : 0,
        resetAtMs: Date.now() + 60_000,
        retryAfterSec: 42,
      };
    },
  };
  return { provider, calls };
}

const listReq = () => new NextRequest('http://localhost/api/jobs?limit=20');
const detailReq = () => new NextRequest('http://localhost/api/jobs/PRJ-001');
const detailParams = { params: Promise.resolve({ slug: 'PRJ-001' }) };

/** AC-11: job THẬT (đủ field DTO công khai) — fixture không còn là danh sách rỗng. */
const PUBLISHED_JOB: PublicJobDto = {
  id: 'prj-1',
  slug: 'PRJ-001',
  title: 'Dự án lắp ráp điện tử',
  position: 'Công nhân sản xuất',
  shift: '06:00-14:00',
  location: 'KCN VSIP 1',
  availableSlots: 12,
  deadline: '2026-09-30',
  statusLabel: 'Đang tuyển',
};
const LIST_RESULT: PublicJobListResult = { jobs: [PUBLISHED_JOB], nextOffset: null, total: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitRuntime();
  __captureSink();
  mocks.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}));
  // Helper thật mở transaction + set GUC; ở lane unit ta chỉ cần nó chuyển tiếp callback.
  mocks.withPublicDb.mockImplementation(async (_prisma: unknown, cb: (tx: unknown) => unknown) => cb({}));
  mocks.listPublicJobProjection.mockResolvedValue(LIST_RESULT);
  mocks.getPublicJobProjection.mockResolvedValue(PUBLISHED_JOB);
});
afterEach(() => {
  __resetRateLimitRuntime();
  __resetSink();
  vi.unstubAllEnvs();
});

describe('RQ-03 — GET /api/jobs (list)', () => {
  it('limiter cho qua ⇒ 200, trả đúng job đang tuyển và đi qua helper công khai', async () => {
    const { provider, calls } = providerThat('allow');
    __setRateLimitRuntime({ provider });

    const res = await GET_LIST(listReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(LIST_RESULT);
    // Đúng MỘT lượt đọc, và đọc qua principal công khai chứ không phải transaction trần.
    expect(mocks.withPublicDb).toHaveBeenCalledTimes(1);
    expect(mocks.withPublicDb.mock.calls[0][1]).toBeTypeOf('function');
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.listPublicJobProjection).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.rule.surface)).toEqual(['JOB_BROWSE']);
  });

  it('429 ⇒ zero DB call', async () => {
    const { provider } = providerThat('deny');
    __setRateLimitRuntime({ provider });

    const res = await GET_LIST(listReq());
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'RATE_LIMITED' });
    expect(res.headers.get('retry-after')).toBe('42');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
    expect(mocks.listPublicJobProjection).not.toHaveBeenCalled();
  });

  it('503 khi limiter hỏng ⇒ zero DB call, Retry-After 5', async () => {
    const { provider } = providerThat('throw');
    __setRateLimitRuntime({ provider });

    const res = await GET_LIST(listReq());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'RATE_LIMIT_UNAVAILABLE' });
    expect(res.headers.get('retry-after')).toBe('5');
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
  });

  it('DEC-02 tại route: production + THIẾU env Upstash ⇒ 503 zero DB, KHÔNG RAM fallback', async () => {
    // KHÔNG inject runtime ⇒ route tự resolve từ process.env (unit lane không có
    // UPSTASH_*), và VERCEL_ENV=production khoá đường rơi về memory fake.
    vi.stubEnv('VERCEL_ENV', 'production');

    const res = await GET_LIST(
      new NextRequest('http://localhost/api/jobs', { headers: { 'x-forwarded-for': '203.0.113.9' } }),
    );

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'RATE_LIMIT_UNAVAILABLE' });
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
    expect(mocks.listPublicJobProjection).not.toHaveBeenCalled();
  });
});

describe('RQ-03 — GET /api/jobs/[slug] (detail)', () => {
  it('limiter cho qua ⇒ 200 job projection', async () => {
    const { provider, calls } = providerThat('allow');
    __setRateLimitRuntime({ provider });

    const res = await GET_DETAIL(detailReq(), detailParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ job: PUBLISHED_JOB });
    expect(mocks.withPublicDb).toHaveBeenCalledTimes(1);
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(calls[0].rule.surface).toBe('JOB_BROWSE');
  });

  it('429 ⇒ zero DB call (deny xảy ra trước cả khi đọc params)', async () => {
    const { provider } = providerThat('deny');
    __setRateLimitRuntime({ provider });

    const res = await GET_DETAIL(detailReq(), detailParams);
    expect(res.status).toBe(429);
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
    expect(mocks.getPublicJobProjection).not.toHaveBeenCalled();
  });

  it('503 ⇒ zero DB call', async () => {
    const { provider } = providerThat('throw');
    __setRateLimitRuntime({ provider });

    const res = await GET_DETAIL(detailReq(), detailParams);
    expect(res.status).toBe(503);
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
  });

  it('job không tồn tại ⇒ 404 generic (limiter đã cho qua)', async () => {
    const { provider } = providerThat('allow');
    __setRateLimitRuntime({ provider });
    mocks.getPublicJobProjection.mockResolvedValue(null);

    const res = await GET_DETAIL(detailReq(), detailParams);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'NOT_FOUND', message: 'Job not found' });
  });

  it('DEC-04: list + detail dùng CHUNG bucket (cùng surface, cùng digest cho cùng IP)', async () => {
    const { provider, calls } = providerThat('allow');
    __setRateLimitRuntime({ provider });

    await GET_LIST(listReq());
    await GET_DETAIL(detailReq(), detailParams);

    expect(calls).toHaveLength(2);
    expect(calls[0].rule.surface).toBe(RATE_LIMIT_RULES.JOB_BROWSE.surface);
    expect(calls[1].rule.surface).toBe(RATE_LIMIT_RULES.JOB_BROWSE.surface);
    // cùng client ⇒ cùng identifier ⇒ MỘT counter chung cho list và detail.
    expect(calls[0].identifier).toBe(calls[1].identifier);
    // slug KHÔNG được lẫn vào identifier của bucket IP.
    expect(calls[1].identifier).not.toContain('PRJ-001');
  });
});

describe('RQ-08/DEC-10 — legacy anonymous writes đã retire', () => {
  it('POST /api/jobs ⇒ 410 APPLY_ENDPOINT_RETIRED, nêu canonical path, zero DB', async () => {
    const { provider, calls } = providerThat('allow');
    __setRateLimitRuntime({ provider });

    const res = await POST_LEGACY_JOBS();
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({
      error: 'APPLY_ENDPOINT_RETIRED',
      message: expect.stringContaining(CANONICAL_APPLY_PATH_TEMPLATE),
      canonicalPath: CANONICAL_APPLY_PATH_TEMPLATE,
    });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
    // không parse body, không cả gọi limiter ⇒ deterministic 410.
    expect(calls).toHaveLength(0);
  });

  it('POST /api/jobs/apply ⇒ 410 APPLY_ENDPOINT_RETIRED, zero DB', async () => {
    const { provider, calls } = providerThat('allow');
    __setRateLimitRuntime({ provider });

    const res = await POST_LEGACY_APPLY();
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ error: 'APPLY_ENDPOINT_RETIRED', canonicalPath: CANONICAL_APPLY_PATH_TEMPLATE });
    expect(mocks.withPublicDb).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('410 KHÔNG redirect (không Location) — client cũ phải sửa endpoint', async () => {
    const res = await POST_LEGACY_APPLY();
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(308);
  });
});
