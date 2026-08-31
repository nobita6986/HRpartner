/**
 * marketplace-apply.routes.test.ts — V5-OPS-06A / RQ-04/05/06 / STEP-02/03 / AC-04/05/06.
 *
 * Route thật + service THẬT (chỉ `getPrisma` bị mock) nên bằng chứng zero-DB là
 * "hàm definer chưa từng được gọi", không phải suy luận:
 *   - apply: APPLY_IP chặn TRƯỚC khi parse body (`req.bodyUsed === false`),
 *     APPLY_PHONE chặn TRƯỚC transaction ⇒ không có history/idempotency row;
 *   - trần 16 KiB (413), media-type gate (415), shape chặt (400), `cv` non-null (422);
 *   - tracking: dual bucket IP + tracking-code, 404 generic không tiết lộ tồn tại;
 *   - projection trả đúng ba identity field Owner duyệt; canary internal field không lọt ra ngoài.
 */
import { inspect } from 'node:util';

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { __captureSink, __resetSink, type LogEntry } from '@/src/shared/observability/logger';
import {
  RateLimitUnavailableError,
  type RateLimitDecision,
  type RateLimitProvider,
  type RateLimitRule,
  type RateLimitSurface,
} from '@/src/shared/security/rate-limit-port';
import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import { APPLY_MAX_BODY_BYTES } from '@/src/shared/security/request-body';

const mocks = vi.hoisted(() => ({ $transaction: vi.fn(), queryRawUnsafe: vi.fn() }));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ $transaction: mocks.$transaction }) }));

import { POST as APPLY } from '@/app/api/public/jobs/[slug]/applications/route';
import { GET as TRACK } from '@/app/api/public/applications/[trackingCode]/route';
import {
  getPublicTracking,
  submitPublicApplication,
  type DbClient,
} from '@/src/domains/applications/application.service';

// Fixture synthetic — KHÔNG PII thật.
const SLUG = 'PRJ-CANARY-001';
const PHONE = '0909123456';
const TRACKING_CODE = 'APP-CANARY-CODE';
const PII_CANARY = 'RAW-PII-CANARY';

interface Recorded {
  rule: RateLimitRule;
  identifier: string;
}

/** Provider fake: quyết định theo surface, mặc định allow. */
function providerFor(
  outcome: Partial<Record<RateLimitSurface, 'allow' | 'deny' | 'throw'>> = {},
): { provider: RateLimitProvider; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const provider: RateLimitProvider = {
    kind: 'memory',
    async limit(rule, identifier): Promise<RateLimitDecision> {
      calls.push({ rule, identifier });
      const mode = outcome[rule.surface] ?? 'allow';
      if (mode === 'throw') throw new RateLimitUnavailableError('PROVIDER_ERROR');
      return {
        allowed: mode === 'allow',
        limit: rule.limit,
        remaining: mode === 'allow' ? rule.limit - 1 : 0,
        resetAtMs: Date.now() + 60_000,
        retryAfterSec: 17,
      };
    },
  };
  return { provider, calls };
}
const applyParams = { params: Promise.resolve({ slug: SLUG }) };
const trackParams = (code = TRACKING_CODE) => ({ params: Promise.resolve({ trackingCode: code }) });

function applyRequest(
  body: unknown,
  opts: { contentType?: string | null; idempotencyKey?: string | null; rawBody?: string } = {},
): NextRequest {
  const headers = new Headers();
  const contentType = opts.contentType === undefined ? 'application/json' : opts.contentType;
  if (contentType) headers.set('content-type', contentType);
  if (opts.idempotencyKey !== null) headers.set('idempotency-key', opts.idempotencyKey ?? 'idem-key-001');
  return new NextRequest(`http://localhost/api/public/jobs/${SLUG}/applications`, {
    method: 'POST',
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

const validPayload = { fullName: 'Nguyễn Văn A', phone: PHONE, cccdNumber: null, consent: true };

const trackRequest = () => new NextRequest(`http://localhost/api/public/applications/${TRACKING_CODE}`);

/** Args của lời gọi definer đầu tiên (không tính SQL text). */
function definerArgs(): unknown[] {
  return mocks.queryRawUnsafe.mock.calls[0].slice(1);
}

let logs: LogEntry[];

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitRuntime();
  logs = __captureSink().entries;
  mocks.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRawUnsafe: mocks.queryRawUnsafe }),
  );
  mocks.queryRawUnsafe.mockResolvedValue([{ tracking_code: TRACKING_CODE, status: 'NEW' }]);
});
afterEach(() => {
  __resetRateLimitRuntime();
  __resetSink();
  vi.unstubAllEnvs();
});
describe('RQ-05 — thứ tự phòng thủ của canonical apply', () => {
  it('APPLY_IP deny ⇒ 429 và body CHƯA từng được đọc (flood không tốn parse)', async () => {
    const { provider, calls } = providerFor({ APPLY_IP: 'deny' });
    __setRateLimitRuntime({ provider });

    const req = applyRequest(validPayload);
    const res = await APPLY(req, applyParams);

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'RATE_LIMITED' });
    expect(req.bodyUsed).toBe(false);
    expect(calls.map((c) => c.rule.surface)).toEqual(['APPLY_IP']);
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('APPLY_PHONE deny ⇒ 429 TRƯỚC transaction: không history/idempotency row nào được tạo', async () => {
    const { provider, calls } = providerFor({ APPLY_PHONE: 'deny' });
    __setRateLimitRuntime({ provider });

    const res = await APPLY(applyRequest(validPayload), applyParams);

    expect(res.status).toBe(429);
    expect(calls.map((c) => c.rule.surface)).toEqual(['APPLY_IP', 'APPLY_PHONE']);
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('limiter hỏng ⇒ 503 zero DB (fail-closed, không cho ghi)', async () => {
    const { provider } = providerFor({ APPLY_IP: 'throw' });
    __setRateLimitRuntime({ provider });

    const res = await APPLY(applyRequest(validPayload), applyParams);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('5');
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('phone rỗng/không hợp lệ ⇒ KHÔNG tạo bucket phone rác, vẫn 400 VALIDATION', async () => {
    const { provider, calls } = providerFor();
    __setRateLimitRuntime({ provider });

    const res = await APPLY(applyRequest({ ...validPayload, phone: '   ' }), applyParams);

    expect(calls.map((c) => c.rule.surface)).toEqual(['APPLY_IP']);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'VALIDATION' });
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('identifier phone là HMAC, KHÔNG phải số điện thoại thô (DEC-05)', async () => {
    const { provider, calls } = providerFor();
    __setRateLimitRuntime({ provider });

    await APPLY(applyRequest(validPayload), applyParams);

    const phoneBucket = calls.find((c) => c.rule.surface === 'APPLY_PHONE');
    expect(phoneBucket).toBeDefined();
    expect(phoneBucket!.identifier).toMatch(/^[0-9a-f]{32}$/);
    expect(phoneBucket!.identifier).not.toContain(PHONE);
    expect(JSON.stringify(logs)).not.toContain(PHONE);
  });
});
describe('RQ-06/DEC-09 — trần payload, media-type, shape và CV đã tắt', () => {
  beforeEach(() => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
  });

  it('multipart/form-data ⇒ 415, zero DB (không còn đường upload file)', async () => {
    const res = await APPLY(applyRequest(validPayload, { contentType: 'multipart/form-data; boundary=--x' }), applyParams);
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ error: 'UNSUPPORTED_MEDIA_TYPE' });
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('thiếu Content-Type ⇒ 415', async () => {
    const res = await APPLY(applyRequest(validPayload, { contentType: null }), applyParams);
    expect(res.status).toBe(415);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('body > 16 KiB ⇒ 413, zero DB', async () => {
    const oversize = JSON.stringify({ ...validPayload, experience: 'z'.repeat(APPLY_MAX_BODY_BYTES) });
    const res = await APPLY(applyRequest(null, { rawBody: oversize }), applyParams);
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: 'PAYLOAD_TOO_LARGE' });
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('JSON sai cú pháp ⇒ 400 INVALID_JSON, message không echo body', async () => {
    const res = await APPLY(applyRequest(null, { rawBody: `{"fullName": ${PII_CANARY}` }), applyParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ error: 'INVALID_JSON' });
    expect(JSON.stringify(json)).not.toContain(PII_CANARY);
  });

  it('field lạ ⇒ 400 INVALID_INPUT và KHÔNG echo giá trị (DEC-12)', async () => {
    const res = await APPLY(applyRequest({ ...validPayload, adminOverride: PII_CANARY }), applyParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ error: 'INVALID_INPUT' });
    expect(JSON.stringify(json)).not.toContain(PII_CANARY);
    expect(JSON.stringify(json)).not.toContain('adminOverride');
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('kiểu sai (fullName object, consent chuỗi) ⇒ 400 zero DB', async () => {
    const wrongType = await APPLY(applyRequest({ ...validPayload, fullName: { evil: PII_CANARY } }), applyParams);
    expect(wrongType.status).toBe(400);
    const wrongConsent = await APPLY(applyRequest({ ...validPayload, consent: 'yes' }), applyParams);
    expect(wrongConsent.status).toBe(400);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('cv non-null (object hoặc string) ⇒ 422 CV_UPLOAD_DISABLED, zero DB', async () => {
    const withObject = await APPLY(
      applyRequest({ ...validPayload, cv: { fileName: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: 1024 } }),
      applyParams,
    );
    expect(withObject.status).toBe(422);
    expect(await withObject.json()).toMatchObject({ error: 'CV_UPLOAD_DISABLED' });

    const withString = await APPLY(applyRequest({ ...validPayload, cv: 'cv.pdf' }), applyParams);
    expect(withString.status).toBe(422);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('cv: null vẫn được nhận (client cũ) và KHÔNG lưu metadata CV nào', async () => {
    const res = await APPLY(applyRequest({ ...validPayload, cv: null }), applyParams);
    expect(res.status).toBe(201);
    // Thứ tự tham số definer (0-based, sau SQL text): [9]=consentAt,
    // [10..12]=cvFileName/cvMimeType/cvSizeBytes, [13]=cvStorageKey, [14]=idempotencyKeyHash.
    const args = definerArgs();
    expect(args[10]).toBeNull();
    expect(args[11]).toBeNull();
    expect(args[12]).toBeNull();
    expect(args[13]).toBeNull();
    // Idempotency key xuống DB dưới dạng sha256, không phải key thô của client.
    expect(String(args[14])).toMatch(/^[0-9a-f]{64}$/);
    expect(String(args[14])).not.toContain('idem-key-001');
  });
});
describe('RQ-05/RQ-09 — happy path giữ nguyên hợp đồng MP-2', () => {
  beforeEach(() => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
  });

  it('201 chỉ trả trackingCode + status (không submissionId/PII)', async () => {
    const res = await APPLY(applyRequest(validPayload), applyParams);
    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(json).sort()).toEqual(['status', 'trackingCode']);
    expect(json).toEqual({ trackingCode: TRACKING_CODE, status: 'NEW' });
  });

  it('đi qua đúng SECURITY DEFINER function, một transaction duy nhất', async () => {
    await APPLY(applyRequest(validPayload), applyParams);
    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.queryRawUnsafe).toHaveBeenCalledTimes(1);
    const sql = String(mocks.queryRawUnsafe.mock.calls[0][0]);
    expect(sql).toContain('hrp_public_apply_submission');
    expect(sql).not.toContain('set_config');
    expect(sql).not.toContain('app.role');
  });

  it('consent: true ⇒ consentAt được suy ra dạng ISO; slug đi từ path param', async () => {
    await APPLY(applyRequest(validPayload), applyParams);
    const args = definerArgs();
    expect(args[0]).toBe(SLUG);
    expect(typeof args[9]).toBe('string');
    expect(String(args[9])).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('thiếu consent ⇒ 422 CONSENT_REQUIRED (RQ-07 giữ yêu cầu đồng ý)', async () => {
    const res = await APPLY(applyRequest({ fullName: 'Nguyễn Văn A', phone: PHONE }), applyParams);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'CONSENT_REQUIRED' });
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('thiếu idempotency key ⇒ 400 IDEMPOTENCY_KEY_REQUIRED, không ghi gì', async () => {
    const res = await APPLY(applyRequest(validPayload, { idempotencyKey: null }), applyParams);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('SQLSTATE của definer vẫn map đúng mã lỗi MP-2 (duplicate ⇒ 409)', async () => {
    mocks.queryRawUnsafe.mockRejectedValue(Object.assign(new Error('pg'), { meta: { code: 'P0012' } }));
    const res = await APPLY(applyRequest(validPayload), applyParams);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'DUPLICATE_APPLICATION' });
  });
});
describe('RQ-04 — tracking dual bucket + 404 generic', () => {
  const trackingRow = {
    tracking_code: TRACKING_CODE,
    status: 'NEW',
    submitted_at: new Date('2026-08-01T00:00:00.000Z'),
    job_title: 'Công nhân sản xuất',
    job_code: 'PRJ-CANARY-001',
    position_title: 'CN',
    full_name: 'Nguyễn Văn Kiểm Thử',
    phone: '0909123456',
    cccd_number: '012345678901',
    // Hostile internal fields must still be dropped by the DTO allow-list.
    normalized_phone: PII_CANARY,
    review_note: PII_CANARY,
  };

  it('gọi ĐÚNG hai bucket theo thứ tự IP → tracking-code, digest không chứa raw code', async () => {
    const { provider, calls } = providerFor();
    __setRateLimitRuntime({ provider });
    mocks.queryRawUnsafe.mockResolvedValue([trackingRow]);

    const res = await TRACK(trackRequest(), trackParams());

    expect(res.status).toBe(200);
    expect(calls.map((c) => c.rule.surface)).toEqual(['TRACKING_IP', 'TRACKING_CODE']);
    expect(calls[1].identifier).toMatch(/^[0-9a-f]{32}$/);
    expect(calls[1].identifier).not.toContain(TRACKING_CODE);
    expect(calls[0].identifier).not.toBe(calls[1].identifier);
  });

  it('bucket IP deny ⇒ 429 zero DB và bucket tracking-code KHÔNG bị đếm', async () => {
    const { provider, calls } = providerFor({ TRACKING_IP: 'deny' });
    __setRateLimitRuntime({ provider });

    const res = await TRACK(trackRequest(), trackParams());

    expect(res.status).toBe(429);
    expect(calls.map((c) => c.rule.surface)).toEqual(['TRACKING_IP']);
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('bucket tracking-code deny ⇒ 429 zero DB (chống enumeration bằng nhiều IP)', async () => {
    const { provider, calls } = providerFor({ TRACKING_CODE: 'deny' });
    __setRateLimitRuntime({ provider });

    const res = await TRACK(trackRequest(), trackParams());

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('17');
    expect(calls.map((c) => c.rule.surface)).toEqual(['TRACKING_IP', 'TRACKING_CODE']);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('limiter hỏng ⇒ 503 zero DB', async () => {
    const { provider } = providerFor({ TRACKING_IP: 'throw' });
    __setRateLimitRuntime({ provider });

    const res = await TRACK(trackRequest(), trackParams());
    expect(res.status).toBe(503);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('mã không tồn tại ⇒ 404 generic, không tín hiệu tồn tại/đã tắt', async () => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
    mocks.queryRawUnsafe.mockResolvedValue([]);

    const res = await TRACK(trackRequest(), trackParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'NOT_FOUND', message: 'Application not found' });
  });

  it('mã hợp lệ ⇒ trả identity đã nộp, no-store, internal canary KHÔNG lọt ra', async () => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
    mocks.queryRawUnsafe.mockResolvedValue([trackingRow]);

    const res = await TRACK(trackRequest(), trackParams());
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = (await res.json()) as { application: Record<string, unknown> };
    expect(Object.keys(json.application).sort()).toEqual([
      'cccdMasked',
      'fullName',
      'jobCode',
      'jobTitle',
      'nextStep',
      'phoneMasked',
      'positionTitle',
      'status',
      'statusLabel',
      'submittedAt',
      'trackingCode',
    ]);
    expect(json.application).toMatchObject({
      fullName: 'Nguyễn Văn Kiểm Thử',
      phoneMasked: '090****456',
      cccdMasked: '********8901',
    });
    expect(JSON.stringify(json)).not.toContain(PII_CANARY);
  });

  it('mã rỗng ⇒ 404 mà KHÔNG chạm definer (guard vẫn đếm bucket)', async () => {
    const { provider, calls } = providerFor();
    __setRateLimitRuntime({ provider });

    const res = await TRACK(
      new NextRequest('http://localhost/api/public/applications/%20'),
      trackParams('   '),
    );
    expect(res.status).toBe(404);
    expect(calls.map((c) => c.rule.surface)).toEqual(['TRACKING_IP', 'TRACKING_CODE']);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
  });
});

/**
 * PLN-04 (finding của audit round 3) — kênh `console` thô của đường apply công khai.
 *
 * Round 4 xoá một dòng `console.log` in họ tên + số điện thoại + tracking code trong
 * `application.service.ts`. 26 test phía trên KHÔNG thể bắt được nó: chúng soi response JSON,
 * log CÓ CẤU TRÚC (`__captureSink`) và tham số definer — không có gì chặn `console` thô. Khối
 * này bịt đúng khoảng trống đó: spy CẢ 5 method console và đọc mọi argument (kể cả object lồng
 * nhau) trên cả hai đường — service gọi trực tiếp, và route thật + service thật.
 */
describe('PLN-04/DEC-12 — apply/tracking service IM LẶNG trên console', () => {
  const NAME_CANARY = 'PLN04-NAME-CANARY';
  const PHONE_CANARY = '0912000777';
  const CODE_CANARY = 'PLN04-CODE-CANARY';
  const CCCD_CANARY = 'PLN04-CCCD-CANARY';
  const CANARIES = [NAME_CANARY, PHONE_CANARY, CODE_CANARY, CCCD_CANARY];
  const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

  /** Spy 5 method console; `written()` gom TOÀN BỘ argument đã ghi thành chuỗi. */
  function spyConsole() {
    const spies = CONSOLE_METHODS.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    return {
      written: () =>
        spies
          .flatMap((spy) => spy.mock.calls)
          .map((args) => args.map((a) => (typeof a === 'string' ? a : inspect(a, { depth: 6 }))).join(' '))
          .join('\n'),
      restore: () => {
        for (const spy of spies) spy.mockRestore();
      },
    };
  }

  const applyInput = {
    slug: SLUG,
    slotId: 'slot-pln04',
    fullName: NAME_CANARY,
    phone: PHONE_CANARY,
    cccdNumber: CCCD_CANARY,
    consentAt: '2026-08-28T00:00:00.000Z',
    idempotencyKey: 'idem-pln04',
  };
  const fakeDb = (queryRawUnsafe: ReturnType<typeof vi.fn>) =>
    ({ $queryRawUnsafe: queryRawUnsafe }) as unknown as DbClient;

  it('apply thành công: KHÔNG method console nào được gọi, dù dữ liệu VẪN xuống definer', async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue([{ tracking_code: CODE_CANARY, status: 'NEW' }]);
    const spy = spyConsole();
    try {
      const out = await submitPublicApplication(fakeDb(queryRawUnsafe), applyInput);
      expect(out).toEqual({ trackingCode: CODE_CANARY, status: 'NEW' });
      expect(spy.written()).toBe('');
    } finally {
      spy.restore();
    }
    // Chống test "xanh giả" do đường ghi bị vô hiệu: canary VẪN phải đi xuống definer.
    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    const args = queryRawUnsafe.mock.calls[0].slice(1);
    expect(args[2]).toBe(NAME_CANARY);
    expect(args[3]).toBe(PHONE_CANARY);
    expect(String(args[16])).toMatch(/^APP-[0-9A-Z-]+$/);
  });

  it('definer lỗi (SQLSTATE map được VÀ lỗi lạ rethrow thô) vẫn KHÔNG ghi gì ra console', async () => {
    const failures = [
      Object.assign(new Error(`pg duplicate ${NAME_CANARY}`), { meta: { code: 'P0012' } }),
      new Error(`raw driver failure ${PHONE_CANARY} ${CODE_CANARY}`),
    ];
    for (const failure of failures) {
      const spy = spyConsole();
      try {
        await expect(submitPublicApplication(fakeDb(vi.fn().mockRejectedValue(failure)), applyInput)).rejects.toThrow();
        expect(spy.written()).toBe('');
      } finally {
        spy.restore();
      }
    }
  });

  it('tracking projection: mã tra cứu KHÔNG bị in ra console (mã có row và mã không tồn tại)', async () => {
    const row = {
      tracking_code: CODE_CANARY,
      status: 'NEW',
      submitted_at: new Date('2026-08-01T00:00:00.000Z'),
      job_title: 'Công nhân sản xuất',
      job_code: SLUG,
      position_title: 'CN',
    };
    const spy = spyConsole();
    try {
      expect((await getPublicTracking(fakeDb(vi.fn().mockResolvedValue([row])), CODE_CANARY))?.trackingCode).toBe(
        CODE_CANARY,
      );
      expect(await getPublicTracking(fakeDb(vi.fn().mockResolvedValue([])), CODE_CANARY)).toBeNull();
      expect(spy.written()).toBe('');
    } finally {
      spy.restore();
    }
  });

  it('route + service THẬT: 201 mà console trắng, và log có cấu trúc cũng không mang canary', async () => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
    mocks.queryRawUnsafe.mockResolvedValue([{ tracking_code: CODE_CANARY, status: 'NEW' }]);

    const spy = spyConsole();
    let written = '';
    let status = 0;
    try {
      const res = await APPLY(
        applyRequest({ fullName: NAME_CANARY, phone: PHONE_CANARY, cccdNumber: CCCD_CANARY, consent: true }),
        applyParams,
      );
      status = res.status;
      written = spy.written();
    } finally {
      spy.restore();
    }

    expect(status).toBe(201);
    expect(written).toBe('');
    // Kênh thứ hai (OPS-04a): log có cấu trúc cũng không được mang canary nào.
    for (const canary of CANARIES) expect(JSON.stringify(logs)).not.toContain(canary);
  });

  it('nhánh lỗi lạ của route: chỉ marker cố định ra console, KHÔNG kèm field request nào', async () => {
    const { provider } = providerFor();
    __setRateLimitRuntime({ provider });
    // Lỗi tự nó KHÔNG mang canary ⇒ canary nào xuất hiện trong output đều do route/service thêm.
    mocks.queryRawUnsafe.mockRejectedValue(new Error('SYNTHETIC-DRIVER-FAILURE'));

    const spy = spyConsole();
    let written = '';
    let status = 0;
    try {
      const res = await APPLY(
        applyRequest({ fullName: NAME_CANARY, phone: PHONE_CANARY, cccdNumber: CCCD_CANARY, consent: true }),
        applyParams,
      );
      status = res.status;
      written = spy.written();
    } finally {
      spy.restore();
    }

    expect(status).toBe(500);
    // `console.error('[public apply] unexpected error', e)` có ở baseline d9a1067 VÀ ở HEAD —
    // KHÔNG phải dòng của round 4. Test chỉ pin lại: marker cố định, không nội suy PII request.
    expect(written).toContain('[public apply] unexpected error');
    for (const canary of CANARIES) expect(written).not.toContain(canary);
  });
});
