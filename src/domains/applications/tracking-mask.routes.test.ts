/**
 * tracking-mask.routes.test.ts — go-live-13 / RQ-09 / STEP-04 / AC-09.
 *
 * Đo ở ĐÚNG biên đã vỡ: `GET /api/public/applications/{ma}`. Route thật, service thật, mapper thật,
 * `NextResponse.json` thật; thứ duy nhất bị thay là HÀNG DỮ LIỆU trả về từ hàm definer.
 *
 * Vì sao mock hàng dữ liệu ở đây là bằng chứng THẬT (`DEC-13`): lớp lỗi của task này là projection
 * thuần JS, không phải invariant của query engine như `hotfix-01`. Mock hàng là cách duy nhất đưa
 * được chữ số TỔNG HỢP vào đường đọc mà không dùng PII thật (`RQ-12`). Không được viện `DEC-13` để
 * mock cho lỗi tầng DB ở task khác.
 *
 * Phép đo quyết định (`DEC-14`): đọc THÂN PHẢN HỒI NGUYÊN VĂN bằng `res.text()` rồi khẳng định chuỗi
 * số gốc không xuất hiện — không kiểm từng khóa. `EV-02` cho thấy route trả nguyên khối DTO, nên một
 * khóa mới thêm về sau sẽ lọt qua phép kiểm từng khóa, còn phép kiểm trên chuỗi thì đỏ ngay.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
import type { RateLimitDecision, RateLimitProvider } from '@/src/shared/security/rate-limit-port';

const mocks = vi.hoisted(() => ({ $transaction: vi.fn(), queryRawUnsafe: vi.fn() }));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ $transaction: mocks.$transaction }) }));

import { GET as TRACK } from '@/app/api/public/applications/[trackingCode]/route';

/** Giá trị TỔNG HỢP (`RQ-12`): đúng hình dạng, không thuộc về ai. */
const TRACKING_CODE = 'APP-MASK-TEST-CODE';
const RAW_PHONE = '0911222333';
const RAW_CCCD = '001122334455';
const MASKED_PHONE = '091****333';
const MASKED_CCCD = '********4455';

/** Đoạn bị che, tính từ chính hằng số trên để không lệch nếu cửa sổ đổi. */
const PHONE_HIDDEN = RAW_PHONE.slice(3, RAW_PHONE.length - 3);
const CCCD_HIDDEN = RAW_CCCD.slice(0, RAW_CCCD.length - 4);

const allowAll: RateLimitProvider = {
  kind: 'memory',
  async limit(rule): Promise<RateLimitDecision> {
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - 1,
      resetAtMs: Date.now() + 60_000,
      retryAfterSec: 0,
    };
  },
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    tracking_code: TRACKING_CODE,
    status: 'NEW',
    submitted_at: new Date('2026-08-31T10:00:00Z'),
    job_title: 'Lap rap dien tu',
    job_code: 'DA-TEST-013',
    position_title: 'Cong nhan lap rap',
    full_name: 'Nguyễn Văn Kiểm Thử',
    phone: RAW_PHONE,
    cccd_number: RAW_CCCD,
    // Khóa nội bộ KHÔNG thuộc DTO: nếu mapper passthrough thì chuỗi gốc lọt ra và test đỏ.
    normalized_phone: RAW_PHONE,
    ...overrides,
  };
}

const trackRequest = () => new NextRequest(`http://localhost/api/public/applications/${TRACKING_CODE}`);
const trackParams = { params: Promise.resolve({ trackingCode: TRACKING_CODE }) };

/** Gọi route thật, trả cả chuỗi nguyên văn trên dây và bản đã parse. */
async function callTrack(overrides: Record<string, unknown> = {}) {
  mocks.queryRawUnsafe.mockResolvedValue([row(overrides)]);
  const res = await TRACK(trackRequest(), trackParams);
  const bodyText = await res.text();
  return { res, bodyText, json: JSON.parse(bodyText) as { application: Record<string, unknown> } };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitRuntime();
  __setRateLimitRuntime({ provider: allowAll });
  mocks.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRawUnsafe: mocks.queryRawUnsafe }),
  );
});
afterEach(() => {
  __resetRateLimitRuntime();
});

describe('RQ-09/DEC-14 — thân phản hồi tra cứu KHÔNG chứa số gốc', () => {
  it('chuỗi phản hồi nguyên văn không chứa số điện thoại gốc và không chứa CCCD gốc', async () => {
    const { res, bodyText } = await callTrack();

    expect(res.status).toBe(200);
    expect(bodyText).not.toContain(RAW_PHONE);
    expect(bodyText).not.toContain(RAW_CCCD);
    // Cả đoạn bị che cũng không được xuất hiện dưới bất kỳ khóa nào.
    expect(bodyText).not.toContain(PHONE_HIDDEN);
    expect(bodyText).not.toContain(CCCD_HIDDEN);
  });

  it('khối application không còn khóa phone và khóa cccdNumber (EV-10)', async () => {
    const { json } = await callTrack();

    expect(json.application).not.toHaveProperty('phone');
    expect(json.application).not.toHaveProperty('cccdNumber');
    expect(json.application).not.toHaveProperty('normalizedPhone');
    expect(json.application).not.toHaveProperty('normalized_phone');
  });

  it('hai khóa mới mang đúng giá trị đã che, độ dài bằng độ dài gốc (DEC-06)', async () => {
    const { json } = await callTrack();

    expect(json.application.phoneMasked).toBe(MASKED_PHONE);
    expect(json.application.cccdMasked).toBe(MASKED_CCCD);
    expect(String(json.application.phoneMasked)).toHaveLength(RAW_PHONE.length);
    expect(String(json.application.cccdMasked)).toHaveLength(RAW_CCCD.length);
    // Họ tên vẫn nguyên văn theo `DEC-07` — Owner chỉ yêu cầu che hai trường số.
    expect(json.application.fullName).toBe('Nguyễn Văn Kiểm Thử');
  });

  it('CCCD trống trả null, KHÔNG trả dấu sao (nền cho nhãn Không cung cấp ở trang)', async () => {
    const { json, bodyText } = await callTrack({ cccd_number: null, normalized_phone: null });

    expect(json.application.cccdMasked).toBeNull();
    expect(json.application.phoneMasked).toBe(MASKED_PHONE);
    expect(bodyText).not.toContain(RAW_CCCD);
  });
});
