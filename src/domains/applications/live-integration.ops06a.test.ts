/**
 * live-integration.ops06a.test.ts — V5-OPS-06A / RQ-04/05/09/11 / STEP-05 / AC-01/04/05/08/10.
 *
 * LIVE lane: chứng minh những điều KHÔNG thể chứng minh bằng mock.
 *   - AC-01: hai `createUpstashRateLimitProvider` instance ĐỘC LẬP (mô phỏng hai Vercel
 *     instance) chia SẺ một counter trên TEST Redis thật ⇒ limiter là distributed, không
 *     phải RAM per-instance. Key namespace chỉ chứa HMAC digest, không chứa raw value.
 *   - AC-04/05: request bị chặn (429) hoặc bị gate body (413/415/422) đi qua ROUTE THẬT
 *     trên TEST DB thật ⇒ số row `candidate_submissions` / `application_status_history`
 *     KHÔNG đổi (before/after đếm thật). Request hợp lệ tạo ĐÚNG 1 row.
 *   - AC-08: idempotency replay (cùng key + payload) vẫn trả cùng tracking code và KHÔNG
 *     tạo row thứ hai ⇒ limiter đứng trước boundary mà không phá semantics MP-2.
 *
 * Ma trận MP-2 đầy đủ (payload mismatch P0010, duplicate P0012, closed job P0011, RLS
 * read-scope) KHÔNG được nhân bản ở đây — nó thuộc `live-integration.mp2.test.ts` và
 * `security-boundary.mp2.test.ts`; STEP-05 yêu cầu CHẠY LẠI hai file đó, không viết lại.
 *
 * ENV_BLOCKED by default. Cần opt-in tường minh:
 *   OPS06A_LIVE_CHECK=1
 *   UPSTASH_REDIS_REST_URL_TEST / UPSTASH_REDIS_REST_TOKEN_TEST / RATE_LIMIT_HASH_SECRET_TEST
 *   DATABASE_URL_TEST (+ DATABASE_URL_ADMIN_TEST cho fixture/cleanup)
 * Không bao giờ dùng credential production/dev fallback. Env label riêng
 * (`ops06a-live`) ⇒ key prefix tách biệt, không chạm counter của môi trường khác.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

import { hashRateLimitIdentifier } from '@/src/shared/security/rate-limit-identity';
import {
  resolveRateLimitConfig,
  type EnvLike,
  type RateLimitRule,
} from '@/src/shared/security/rate-limit-port';
import { createUpstashRateLimitProvider } from '@/src/shared/security/rate-limit-upstash';
import { createMemoryRateLimitProvider } from '@/src/shared/security/rate-limit-memory';
import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import { APPLY_MAX_BODY_BYTES } from '@/src/shared/security/request-body';

import { POST as APPLY } from '@/app/api/public/jobs/[slug]/applications/route';
import { GET as TRACK } from '@/app/api/public/applications/[trackingCode]/route';


const LIVE = process.env.OPS06A_LIVE_CHECK === '1';
const REDIS_READY =
  LIVE &&
  Boolean(process.env.UPSTASH_REDIS_REST_URL_TEST) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN_TEST) &&
  Boolean(process.env.RATE_LIMIT_HASH_SECRET_TEST);
const DB_READY = LIVE && Boolean(process.env.DATABASE_URL_TEST) && Boolean(process.env.DATABASE_URL_ADMIN_TEST);

// Env tổng hợp CHỈ từ biến *_TEST. Label `ops06a-live` ⇒ prefix key tách biệt hoàn toàn.
const LIVE_ENV: EnvLike = {
  VERCEL_ENV: 'ops06a-live',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL_TEST,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN_TEST,
  RATE_LIMIT_HASH_SECRET: process.env.RATE_LIMIT_HASH_SECRET_TEST,
};

// Sentinel synthetic: KHÔNG PII thật. Dùng để soi rò rỉ vào Redis key.
const RUN_ID = `ops06a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const RAW_SUBJECT = `203.0.113.${(Date.now() % 200) + 1}-${RUN_ID}`;

describe.skipIf(!REDIS_READY)('AC-01 LIVE — distributed counter trên TEST Redis', () => {
  const rule: RateLimitRule = { surface: 'APPLY_IP', subject: 'ip', limit: 3, windowSec: 60 };
  let config: any;
  let identifier: string;
  let redis: { keys(p: string): Promise<string[]>; del(...k: string[]): Promise<number> };

  beforeAll(async () => {
    config = resolveRateLimitConfig(LIVE_ENV);
    identifier = hashRateLimitIdentifier(rule, RAW_SUBJECT, config.hashSecret);
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({ url: config.restUrl, token: config.restToken }) as unknown as typeof redis;
  }, 30000);

  afterAll(async () => {
    if (!redis) return;
    // Dọn namespace của run này — không chạm key của môi trường khác.
    const keys = await redis.keys(`hrp:rl:v1:ops06a-live:*${identifier}*`);
    if (keys.length > 0) await redis.del(...keys);
  }, 30000);

  it('hai instance ĐỘC LẬP chia SẺ một counter (RAM per-instance thì không thể deny)', async () => {
    const instanceA = createUpstashRateLimitProvider(config);
    const instanceB = createUpstashRateLimitProvider(config);
    expect(identifier).toMatch(/^[0-9a-f]{32}$/);

    // 3 token đầu chia đôi giữa hai instance ⇒ nếu counter là RAM riêng, cả hai vẫn allow.
    expect((await instanceA.limit(rule, identifier)).allowed).toBe(true);
    expect((await instanceB.limit(rule, identifier)).allowed).toBe(true);
    expect((await instanceA.limit(rule, identifier)).allowed).toBe(true);

    const denyOnB = await instanceB.limit(rule, identifier);
    expect(denyOnB.allowed).toBe(false);
    expect(denyOnB.remaining).toBe(0);
    expect(denyOnB.retryAfterSec).toBeGreaterThanOrEqual(1);
    // Instance A cũng thấy trạng thái đã cạn ⇒ MỘT counter dùng chung.
    expect((await instanceA.limit(rule, identifier)).allowed).toBe(false);
  }, 30000);

  it('DEC-05: Redis key chứa digest, KHÔNG chứa raw subject', async () => {
    await createUpstashRateLimitProvider(config).limit(rule, identifier);
    const keys = await redis.keys('hrp:rl:v1:ops06a-live:APPLY_IP*');
    expect(keys.some((k) => k.includes(identifier))).toBe(true);
    for (const key of keys) expect(key).not.toContain(RAW_SUBJECT);
  }, 30000);
});
describe.skipIf(!DB_READY)('AC-04/05/08 LIVE — chặn ⇒ zero write trên TEST DB thật', () => {
  const SFX = RUN_ID.replace(/[^a-z0-9-]/g, '');
  const SLUG = `OPS06A-${SFX.toUpperCase()}`;
  const PHONE = '0909000111';
  let admin: {
    query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
    end(): Promise<void>;
  };
  let slotId = '';
  const trackingCodes: string[] = [];

  beforeAll(async () => {
    // @ts-expect-error -- 'pg' không ship types; @types/pg không được cài. Lane này ENV_BLOCKED mặc định.
    const { Client } = await import('pg');
    admin = new Client({ connectionString: process.env.DATABASE_URL_ADMIN_TEST });
    await (admin as unknown as { connect(): Promise<void> }).connect();
    await admin.query("SELECT set_config('app.user_id','ops06a-live',false), set_config('app.role','ADMIN',false)");

    const cc = `ops06a-cc-${SFX}`;
    const proj = `ops06a-pr-${SFX}`;
    const order = `ops06a-so-${SFX}`;
    slotId = `ops06a-sl-${SFX}`;
    await admin.query(
      `INSERT INTO client_companies (id, code, name, status, created_at) VALUES ($1,$2,'OPS06A CC','ACTIVE', now())`,
      [cc, `CC-${SFX}`],
    );
    await admin.query(
      `INSERT INTO outsourcing_projects (id, code, client_company_id, name, start_date, status, is_public, quota, filled, version, created_at)
         VALUES ($1,$2,$3,'OPS06A Project', now()::date, 'ACTIVE', true, 0, 0, 1, now())`,
      [proj, SLUG, cc],
    );
    await admin.query(
      `INSERT INTO staffing_orders (id, project_id, code, title, status, created_at)
         VALUES ($1,$2,$3,'OPS06A Order','OPEN', now())`,
      [order, proj, `SO-${SFX}`],
    );
    await admin.query(
      `INSERT INTO staffing_order_slots (id, staffing_order_id, position_code, position_title, slots_needed, slots_filled, valid_from, created_at)
         VALUES ($1,$2,'WORKER','OPS06A Position', 5, 0, now()::date, now())`,
      [slotId, order],
    );
  }, 60000);

  afterAll(async () => {
    __resetRateLimitRuntime();
    try {
      // Dọn theo thứ tự FK; chỉ xoá dữ liệu do run này tạo.
      for (const code of trackingCodes) {
        await admin.query(
          `DELETE FROM application_status_history WHERE submission_id IN
             (SELECT id FROM candidate_submissions WHERE public_tracking_code = $1)`,
          [code],
        );
        await admin.query(`DELETE FROM candidate_submissions WHERE public_tracking_code = $1`, [code]);
      }
      await admin.query(`DELETE FROM staffing_order_slots WHERE id = $1`, [slotId]);
      await admin.query(`DELETE FROM staffing_orders WHERE code = $1`, [`SO-${SFX}`]);
      await admin.query(`DELETE FROM outsourcing_projects WHERE code = $1`, [SLUG]);
      await admin.query(`DELETE FROM client_companies WHERE code = $1`, [`CC-${SFX}`]);
    } finally {
      await admin?.end().catch(() => {});
    }
  }, 60000);
  /** Đếm THẬT trên toàn bảng: bắt được cả write "rơi" ngoài fixture. */
  async function counts(): Promise<{ subs: number; hist: number }> {
    const r = await admin.query(
      `SELECT (SELECT count(*)::int FROM candidate_submissions) AS subs,
              (SELECT count(*)::int FROM application_status_history) AS hist`,
    );
    return { subs: Number(r.rows[0].subs), hist: Number(r.rows[0].hist) };
  }

  const applyParams = { params: Promise.resolve({ slug: SLUG }) };
  function applyReq(body: unknown, opts: { contentType?: string | null; key?: string; rawBody?: string; ip?: string } = {}) {
    const headers = new Headers();
    const ct = opts.contentType === undefined ? 'application/json' : opts.contentType;
    if (ct) headers.set('content-type', ct);
    headers.set('idempotency-key', opts.key ?? `ops06a-${SFX}-default`);
    headers.set('x-forwarded-for', opts.ip ?? RAW_SUBJECT);
    return new NextRequest(`http://localhost/api/public/jobs/${SLUG}/applications`, {
      method: 'POST',
      headers,
      body: opts.rawBody ?? JSON.stringify(body),
    });
  }
  const getValidBody = () => ({ slotId, fullName: 'Nguyen Van Live', phone: PHONE, consent: true });

  const denyProvider = {
    kind: 'memory' as const,
    async limit(rule: RateLimitRule) {
      return { allowed: false, limit: rule.limit, remaining: 0, resetAtMs: Date.now() + 30_000, retryAfterSec: 30 };
    },
  };
  const allowRuntime = () =>
    __setRateLimitRuntime({ provider: createMemoryRateLimitProvider({ env: { NODE_ENV: 'test' } }) }, { NODE_ENV: 'test' });

  it('AC-04: limiter deny ⇒ 429 và KHÔNG có row nào được tạo (before/after bằng nhau)', async () => {
    const before = await counts();
    __setRateLimitRuntime({ provider: denyProvider }, { NODE_ENV: 'test' });

    const res = await APPLY(applyReq(getValidBody(), { key: `ops06a-${SFX}-deny` }), applyParams);

    expect(res.status).toBe(429);
    expect(await counts()).toEqual(before);
  }, 60000);

  it('AC-05: 413/415/422 ⇒ zero write (trần body, media gate, CV tắt)', async () => {
    const before = await counts();
    allowRuntime();

    const oversize = JSON.stringify({ ...getValidBody(), experience: 'z'.repeat(APPLY_MAX_BODY_BYTES) });
    expect((await APPLY(applyReq(null, { rawBody: oversize, key: `ops06a-${SFX}-413` }), applyParams)).status).toBe(413);

    allowRuntime();
    expect(
      (await APPLY(applyReq(getValidBody(), { contentType: 'multipart/form-data; boundary=--x' }), applyParams)).status,
    ).toBe(415);

    allowRuntime();
    expect(
      (await APPLY(applyReq({ ...getValidBody(), cv: { fileName: 'cv.pdf' } }, { key: `ops06a-${SFX}-422` }), applyParams))
        .status,
    ).toBe(422);

    expect(await counts()).toEqual(before);
  }, 60000);
  it('AC-08: apply hợp lệ tạo ĐÚNG 1 submission + 1 history; replay cùng key ⇒ zero row mới', async () => {
    allowRuntime();
    const before = await counts();
    const key = `ops06a-${SFX}-happy`;

    const first = await APPLY(applyReq(getValidBody(), { key }), applyParams);
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as { trackingCode: string; status: string };
    trackingCodes.push(firstJson.trackingCode);
    expect(firstJson.status).toBe('NEW');

    const afterFirst = await counts();
    expect(afterFirst.subs).toBe(before.subs + 1);
    expect(afterFirst.hist).toBe(before.hist + 1);

    // Replay y nguyên (cùng key + cùng payload) ⇒ MP-2 idempotency vẫn nguyên semantics.
    const replay = await APPLY(applyReq(getValidBody(), { key }), applyParams);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(firstJson);
    expect(await counts()).toEqual(afterFirst);

    // Row thật: không metadata CV nào được lưu (RISK-06).
    const row = await admin.query(
      `SELECT cv_file_name, cv_mime_type, cv_size_bytes, cv_storage_key
         FROM candidate_submissions WHERE public_tracking_code = $1`,
      [firstJson.trackingCode],
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].cv_file_name).toBeNull();
    expect(row.rows[0].cv_mime_type).toBeNull();
    expect(row.rows[0].cv_size_bytes).toBeNull();
    expect(row.rows[0].cv_storage_key).toBeNull();
  }, 60000);

  it('AC-03: tracking route trên DB thật chỉ trả allow-list projection', async () => {
    allowRuntime();
    const code = trackingCodes[0];
    expect(code, 'happy-path test phải chạy trước').toBeTruthy();

    const res = await TRACK(new NextRequest(`http://localhost/api/public/applications/${code}`), {
      params: Promise.resolve({ trackingCode: code }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = (await res.json()) as { application: Record<string, unknown> };
    expect(Object.keys(json.application).sort()).toEqual([
      'jobCode',
      'jobTitle',
      'nextStep',
      'positionTitle',
      'status',
      'statusLabel',
      'submittedAt',
      'trackingCode',
    ]);
    expect(JSON.stringify(json)).not.toContain(PHONE);
  }, 60000);
});



