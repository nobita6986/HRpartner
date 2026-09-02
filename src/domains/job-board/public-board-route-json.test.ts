/**
 * public-board-route-json.test.ts — V5-go-live-09 / RQ-18, RQ-21 / STEP-09 / AC-04, AC-11, AC-12.
 *
 * Vì sao cần file này khi đã có `public-board-architecture.test.ts`: hai AC của task đòi đo trên
 * RESPONSE của `GET /api/jobs`, không phải trên giá trị trả về của service. Khoảng cách giữa hai chỗ
 * đó KHÔNG rỗng — nó chính là `NextResponse.json`, và bẫy `BigInt` của `hourlyRateVnd` sống đúng ở đó:
 * một DTO mang `bigint` vẫn qua được mọi phép so ở tầng service rồi làm route ném lúc tuần tự hoá.
 *
 * `marketplace-browse.routes.test.ts` không đo được điều này vì nó `vi.mock` cả `public.service` —
 * đúng cho mục đích của nó (đo thứ tự limiter/DB) nhưng làm mapper thật biến mất. Ở đây ngược lại:
 * service là THẬT, chỉ ranh giới DB bị thay bằng một `tx` giả trả đúng hình dạng dòng của `publicSelect`.
 *
 * PHẠM VI CÓ Ý THỨC: KHÔNG có DB nào trong file này, nên nó không nói gì về RLS. Nửa LIVE của
 * `AC-04`/`AC-11`/`AC-12` vẫn là `ENV_BLOCKED` (`DATABASE_URL_TEST` chưa có) và HANDOFF ghi rõ như vậy.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { __resetSink, __captureSink } from '@/src/shared/observability/logger';
import type { RateLimitDecision, RateLimitProvider } from '@/src/shared/security/rate-limit-port';
import { __resetRateLimitRuntime, __setRateLimitRuntime } from '@/src/shared/security/rate-limit-provider';
// Type-only ⇒ bị xoá khi biên dịch, không ảnh hưởng runtime của file.
import type { PublicJobListResult } from '@/src/domains/job-board/public.service';

const mocks = vi.hoisted(() => ({ withPublicDb: vi.fn(), findMany: vi.fn() }));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
vi.mock('@/src/shared/auth/with-public-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/auth/with-public-db')>()),
  withPublicDb: mocks.withPublicDb,
}));

// KHÔNG mock `public.service`: đó là toàn bộ lý do file này tồn tại.
import { GET as GET_LIST } from '@/app/api/jobs/route';

const SEEDED_AT = new Date('2026-01-15T00:00:00.000Z');

function slot(overrides: Record<string, unknown> = {}) {
  return {
    positionCode: 'ASSY-01',
    positionTitle: 'Công nhân lắp ráp',
    slotsNeeded: 5,
    slotsFilled: 1,
    shiftStart: '07:00',
    shiftEnd: '16:00',
    validTo: null,
    workLocation: 'KCN VSIP 1',
    hourlyRateVnd: 45_000n,
    ...overrides,
  };
}
/** Ba dòng: hai ở Bắc Ninh (một khớp qua `siteAddress`, một qua `workLocation`), một ở Hà Nội. */
function rows() {
  return [
    {
      id: 'prj-a', code: 'DA-A', name: 'Lắp ráp điện tử', siteAddress: 'Bắc Ninh',
      staffingOrders: [{
        status: 'OPEN', title: 'Tuyển công nhân', description: null, deadlineDate: null, createdAt: SEEDED_AT,
        slots: [slot({ workLocation: '   ' })],
      }],
    },
    {
      id: 'prj-b', code: 'DA-B', name: 'Đóng gói', siteAddress: 'Bắc Ninh',
      staffingOrders: [{
        status: 'OPEN', title: 'Tuyển đóng gói', description: null, deadlineDate: null, createdAt: SEEDED_AT,
        slots: [slot({ positionCode: 'PACK-01', positionTitle: 'Nhân viên đóng gói', hourlyRateVnd: 32_000n })],
      }],
    },
    {
      id: 'prj-c', code: 'DA-C', name: 'Kiểm hàng', siteAddress: 'Hà Nội',
      staffingOrders: [{
        status: 'OPEN', title: 'Tuyển QC', description: null, deadlineDate: null, createdAt: SEEDED_AT,
        slots: [slot({ positionCode: 'QC-01', positionTitle: 'Nhân viên QC', workLocation: 'KCN Thăng Long', hourlyRateVnd: 70_000n })],
      }],
    },
  ];
}

function allowProvider(): RateLimitProvider {
  return {
    kind: 'memory',
    async limit(rule): Promise<RateLimitDecision> {
      return { allowed: true, limit: rule.limit, remaining: rule.limit - 1, resetAtMs: Date.now() + 60_000, retryAfterSec: 0 };
    },
  };
}

/**
 * Kiểu của `body` là DTO THẬT, không phải `Record<string, any>`: response của route là
 * `NextResponse.json(projection)` nên hình dạng sau `res.json()` đúng bằng `PublicJobListResult`.
 * Khai như vậy làm `tsc` thành một hàng rào thứ hai — bỏ khoá `overview` khỏi DTO thì file này
 * không biên dịch, chứ không im lặng đọc `undefined` lúc chạy.
 */
async function getJobs(query = ''): Promise<{ status: number; body: PublicJobListResult }> {
  const res = await GET_LIST(new NextRequest(`http://localhost/api/jobs${query}`));
  return { status: res.status, body: (await res.json()) as PublicJobListResult };
}
beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitRuntime();
  __captureSink();
  __setRateLimitRuntime({ provider: allowProvider() });
  mocks.findMany.mockResolvedValue(rows());
  mocks.withPublicDb.mockImplementation(async (_p: unknown, cb: (tx: unknown) => unknown) =>
    cb({ project: { findMany: mocks.findMany } }));
});
afterEach(() => {
  __resetRateLimitRuntime();
  __resetSink();
});

describe('go-live-09 / AC-04 — response THẬT của GET /api/jobs mang lương là number', () => {
  it('200 và salaryMinVnd trong JSON là number, không phải string, không ném BigInt', async () => {
    const { status, body } = await getJobs();

    // Route ném ở `NextResponse.json` nếu DTO còn `bigint` ⇒ 200 cộng body đọc được ĐÃ là một nửa
    // khẳng định. Nửa còn lại là kiểu: nếu ai đó "sửa" bằng `toString()` thì JSON mang string, nên
    // phải soi `typeof` chứ không chỉ soi giá trị.
    expect(status).toBe(200);
    const job = body.jobs.find((j) => j.id === 'prj-c');
    expect(job).toBeDefined();
    expect(typeof job!.salaryMinVnd).toBe('number');
    expect(job!.salaryMinVnd).toBe(70_000);
    expect(job!.salaryMaxVnd).toBe(70_000);
  });

  it('payload công khai không mang tên cột nội bộ, không mang khách hàng, không mang nhãn ngành', async () => {
    const { body } = await getJobs();
    const serialized = JSON.stringify(body);

    expect(serialized).toContain('70000');
    for (const forbidden of ['hourlyRateVnd', 'clientCompanyId', 'budgetVnd', 'internalNotes', 'rateCard', 'billing', 'margin', 'industry']) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
  });
});
describe('go-live-09 / AC-11, AC-12 — cặp response chứng minh số trên tag là số THẬT', () => {
  it('count của một mục areaCounts bằng total của lần gọi lại với đúng area đó', async () => {
    const first = await getJobs();
    const entry = first.body.overview.areaCounts.find((e) => e.value === 'Bắc Ninh');
    expect(entry).toBeDefined();
    // `prj-b` không có `Bắc Ninh` trong `locations` nhưng vị từ `area` khớp nó qua `siteAddress`.
    expect(entry!.count).toBe(2);

    const refetch = await getJobs(`?area=${encodeURIComponent(entry!.value)}`);
    expect(refetch.status).toBe(200);
    // Đây là phép đo của `AC-11`: số trên tag bằng đúng số việc mà cú bấm sẽ thấy.
    expect(refetch.body.total).toBe(entry!.count);
  });

  it('không mục areaCounts nào có count bằng 0, và overview.totals.jobs bằng total', async () => {
    const { body } = await getJobs();

    for (const entry of [...body.overview.areaCounts, ...body.overview.shiftCounts]) {
      expect(entry.count).toBeGreaterThan(0);
    }
    expect(body.overview.totals.jobs).toBe(body.total);
    expect(body.overview.totals.jobs).toBe(3);
  });

  it('ba con số toàn cục KHÔNG đổi giữa trang 1 và trang 2 — phép duy nhất phân biệt số trang', async () => {
    const page1 = await getJobs('?limit=1&offset=0');
    const page2 = await getJobs('?limit=1&offset=1');

    expect(page1.body.jobs).toHaveLength(1);
    expect(page2.body.jobs).toHaveLength(1);
    expect(page2.body.overview.totals).toEqual(page1.body.overview.totals);
    expect(page2.body.overview.areaCounts).toEqual(page1.body.overview.areaCounts);
    // Số nguyên thuần, không phải chuỗi kiểu "3+": kiểu sai làm phép cộng ở client thành nối chuỗi.
    for (const value of Object.values(page1.body.overview.totals)) {
      expect(typeof value).toBe('number');
    }
  });
});
