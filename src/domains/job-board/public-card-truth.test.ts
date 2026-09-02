/**
 * public-card-truth.test.ts — V5-go-live-05 / RQ-12 / STEP-07 / AC-01..AC-04, AC-06, AC-11.
 *
 * Test HÀNH VI (không grep) cho projection công khai của card việc làm. Mỗi khối dưới đây đo đúng
 * một khẳng định mà contract gọi là FAIL nếu vỡ:
 *   - `AC-02`/`RQ-04`: nhiều slot ⇒ `positionTitles`/`locations`/`shifts` unique + sort ổn định;
 *     slot hết hạn và slot đã đủ chỉ tiêu KHÔNG lọt vào summary; `availableSlots` là tổng thật.
 *   - `AC-04`/`RQ-05`: `total`, page slice và `nextOffset` cùng đọc một mảng sau lifecycle + filter.
 *   - `AC-06`/`RQ-07`, `DEC-07`: `shiftType` không bao giờ là `'xoay_ca'`; hai kíp khác hạng ⇒ `null`.
 *   - `DEC-08`: facet derive từ TOÀN TẬP hợp lệ, TRƯỚC filter ⇒ dropdown không co theo lựa chọn.
 *   - `AC-01`/`AC-03`, `DEC-10`/`RISK-01`/`RISK-07`: DTO đúng allow-list, không rate/client field,
 *     `JSON.stringify` không ném (không BigInt nào lọt vào).
 *
 * PHẠM VI CÓ Ý THỨC: `findMany` bị mock, nên file này KHÔNG khẳng định gì về RLS hay query engine
 * (bài học hotfix-01: 1418 test xanh song song với 500 cứng trên production). Lớp đó do
 * `public-select.static.test.ts` canh tĩnh và `public-card-truth.integration.test.ts` canh trên DB
 * thật. Ở đây thứ được đo là phép biến đổi thuần trên đúng hình dạng dòng mà `publicSelect` trả về.
 */
import { describe, expect, it, vi } from 'vitest';

import { listPublicJobProjection, type PublicJobDto } from './public.service';

/** Mốc quá khứ cố định: `validTo`/`deadlineDate` dùng nó thì hết hạn ở mọi lần chạy, mọi máy. */
const EXPIRED_AT = new Date('2020-01-01T00:00:00.000Z');
/** Mốc tương lai xa, để một `deadlineDate` không-null vẫn luôn còn hiệu lực. */
const FUTURE_AT = new Date('2099-12-31T00:00:00.000Z');

type Slot = {
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  shiftStart: string | null;
  shiftEnd: string | null;
  validTo: Date | null;
  workLocation: string | null;
};

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    positionCode: 'ASSY-01',
    positionTitle: 'Công nhân lắp ráp',
    slotsNeeded: 5,
    slotsFilled: 1,
    shiftStart: '07:00',
    shiftEnd: '16:00',
    validTo: null,
    workLocation: 'KCN VSIP 1',
    ...overrides,
  };
}

type Order = { status: string; title: string; description: string | null; deadlineDate: Date | null; createdAt: Date; slots: Slot[] };

function order(slots: Slot[], overrides: Partial<Order> = {}): Order {
  // go-live-09 / RQ-01: `publicSelect` nay select cả `createdAt` của đơn, nên fixture phải mang nó
  // để còn là hình dạng dòng THẬT. Mốc cố định để kết quả không đổi theo ngày chạy.
  return { status: 'OPEN', title: 'Tuyển công nhân lắp ráp', description: null, deadlineDate: null, createdAt: new Date('2026-01-15T00:00:00.000Z'), slots, ...overrides };
}

type Row = { id: string; code: string; name: string; siteAddress: string | null; staffingOrders: Order[] };

/** Đúng payload của `publicSelect`: scalar của `Project` cộng nhánh `staffingOrders`, không quan hệ. */
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'prj-1',
    code: 'DA-2026-001',
    name: 'Lắp ráp điện tử Bắc Ninh',
    siteAddress: 'Bắc Ninh',
    staffingOrders: [order([slot()])],
    ...overrides,
  };
}

type PublicTx = Parameters<typeof listPublicJobProjection>[0];

function listTx(rows: Row[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  return { tx: { project: { findMany } } as unknown as PublicTx, findMany };
}

/** Gọi list và đòi đúng một job — dùng cho các case chỉ quan tâm hình dạng DTO. */
async function onlyJob(rows: Row[]): Promise<PublicJobDto> {
  const { tx } = listTx(rows);
  const result = await listPublicJobProjection(tx, {});
  expect(result.jobs).toHaveLength(1);
  return result.jobs[0];
}

const QC_SLOT: Partial<Slot> = {
  positionCode: 'QC-01',
  positionTitle: 'Nhân viên QC',
  slotsNeeded: 2,
  slotsFilled: 0,
  workLocation: 'KCN Yên Phong',
};

describe('AC-02/RQ-04 — summary của card tính trên ĐÚNG tập slot còn nhận người', () => {
  it('nhiều slot ⇒ ba mảng unique + sort ổn định, field đơn là phần tử đầu, tổng chỗ trống thật', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot(),
            slot(QC_SLOT),
            // Trùng hoàn toàn nhãn của slot đầu ⇒ chứng minh `unique`, không phải chỉ "có sort".
            slot({ positionCode: 'ASSY-02', slotsNeeded: 3, slotsFilled: 0 }),
            // Địa điểm rỗng ⇒ fallback `project.siteAddress`, và chuỗi trắng bị `summarize` loại.
            slot({ positionCode: 'PACK-01', positionTitle: 'Nhân viên đóng gói', workLocation: '   ', slotsNeeded: 1, slotsFilled: 0 }),
          ]),
        ],
      }),
    ]);

    expect(job.positionTitles).toEqual(['Công nhân lắp ráp', 'Nhân viên đóng gói', 'Nhân viên QC']);
    expect(job.locations).toEqual(['Bắc Ninh', 'KCN VSIP 1', 'KCN Yên Phong']);
    expect(job.shifts).toEqual(['07:00-16:00']);
    // DEC-03: field đơn KHÔNG phải chữ của một slot ngẫu nhiên, mà là phần tử đầu của mảng đã sort.
    expect(job.position).toBe(job.positionTitles[0]);
    expect(job.location).toBe(job.locations[0]);
    expect(job.shift).toBe(job.shifts[0]);
    // (5-1) + (2-0) + (3-0) + (1-0) = 10
    expect(job.availableSlots).toBe(10);
  });

  it('slot hết hạn không lọt vào summary và không cộng vào chỗ trống', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot(),
            slot({ positionCode: 'WELD-01', positionTitle: 'Thợ hàn', workLocation: 'KCN Quang Châu', shiftStart: '22:00', shiftEnd: '06:00', slotsNeeded: 9, slotsFilled: 0, validTo: EXPIRED_AT }),
          ]),
        ],
      }),
    ]);

    expect(job.positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(job.locations).toEqual(['KCN VSIP 1']);
    expect(job.shifts).toEqual(['07:00-16:00']);
    expect(job.availableSlots).toBe(4);
    // Kíp đêm đã hết hạn không được kéo `shiftType` về `null`.
    expect(job.shiftType).toBe('ca_ngay');
  });

  it('slot đã đủ chỉ tiêu không lọt vào summary, dù nó vẫn còn hiệu lực', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot(),
            // Còn hiệu lực (`validTo: null`) nhưng needed === filled ⇒ không có gì để ứng tuyển.
            slot({ positionCode: 'FORK-01', positionTitle: 'Lái xe nâng', workLocation: 'KCN Đình Trám', shiftStart: '18:00', shiftEnd: '02:00', slotsNeeded: 2, slotsFilled: 2 }),
          ]),
        ],
      }),
    ]);

    expect(job.positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(job.locations).toEqual(['KCN VSIP 1']);
    expect(job.availableSlots).toBe(4);
    // Đây là nửa thứ hai của chính defect: một kíp đêm ĐÃ ĐỦ NGƯỜI không được làm việc này rơi
    // khỏi bộ lọc "ca ngày", vì kíp ngày của nó vẫn đang tuyển.
    expect(job.shiftType).toBe('ca_ngay');
  });

  it('đơn không còn hiển thị (status hoặc deadline) bị loại khỏi mọi phép tính của card', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([slot()], { deadlineDate: FUTURE_AT }),
          order([slot({ positionCode: 'DRAFT-01', positionTitle: 'Vị trí đơn đã đóng', slotsNeeded: 7, slotsFilled: 0 })], { status: 'CLOSED', title: 'Đơn đã đóng' }),
          order([slot({ positionCode: 'LATE-01', positionTitle: 'Vị trí đơn quá hạn', slotsNeeded: 8, slotsFilled: 0 })], { deadlineDate: EXPIRED_AT, title: 'Đơn quá hạn' }),
        ],
      }),
    ]);

    expect(job.positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(job.availableSlots).toBe(4);
    // `earliestDeadline` đọc mọi đơn của dự án, kể cả đơn đã quá hạn — pin lại hành vi ĐANG có để
    // một lượt sửa sau không đổi nó trong im lặng.
    expect(job.deadline).toBe(EXPIRED_AT.toISOString());
  });

  it('mọi slot hết hạn hoặc đã đủ chỉ tiêu ⇒ việc bị loại hẳn khỏi danh sách', async () => {
    const { tx } = listTx([
      row({ id: 'prj-expired', code: 'DA-EXP', staffingOrders: [order([slot({ validTo: EXPIRED_AT })])] }),
      row({ id: 'prj-full', code: 'DA-FULL', staffingOrders: [order([slot({ slotsNeeded: 3, slotsFilled: 3 })])] }),
    ]);

    const result = await listPublicJobProjection(tx, {});

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.nextOffset).toBeNull();
    // DEC-08: facet cũng phải rỗng — nó derive từ tập ĐÃ qua lifecycle, không từ dòng thô.
    expect(result.facets).toEqual({ areas: [], shifts: [] });
  });
});

describe('AC-06/RQ-07, DEC-07 — shiftType đo được hoặc null, không bao giờ suy ra "xoay ca"', () => {
  it('hai kíp khác hạng cùng còn tuyển ⇒ null, và không có giá trị nào là "xoay_ca"', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot(),
            slot({ positionCode: 'NIGHT-01', positionTitle: 'Công nhân ca đêm', shiftStart: '22:00', shiftEnd: '06:00', slotsNeeded: 4, slotsFilled: 0 }),
          ]),
        ],
      }),
    ]);

    expect(job.shiftType).toBeNull();
    expect(job.shifts).toEqual(['07:00-16:00', '22:00-06:00']);
    // Chốt cả từ vựng: `'xoay_ca'` không còn là giá trị mà DTO công khai có thể sinh ra.
    expect(JSON.stringify(job)).not.toContain('xoay_ca');
  });

  it('mọi kíp cùng hạng đêm ⇒ ca_dem; không có giờ ⇒ null chứ không gắn nhãn bịa', async () => {
    const night = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot({ shiftStart: '20:00', shiftEnd: '04:00' }),
            slot({ positionCode: 'QC-02', positionTitle: 'Nhân viên QC', shiftStart: '22:00', shiftEnd: '06:00', slotsFilled: 0 }),
          ]),
        ],
      }),
    ]);
    expect(night.shiftType).toBe('ca_dem');

    const unknown = await onlyJob([row({ staffingOrders: [order([slot({ shiftStart: null, shiftEnd: null })])] })]);
    expect(unknown.shiftType).toBeNull();
    expect(unknown.shift).toBeNull();
    expect(unknown.shifts).toEqual([]);
  });

  it('shiftTypes lọc bỏ việc có shiftType null thay vì cho nó khớp mọi giá trị', async () => {
    const mixed = row({
      id: 'prj-mixed',
      code: 'DA-MIXED',
      staffingOrders: [order([slot(), slot({ positionCode: 'N-01', shiftStart: '22:00', shiftEnd: '06:00', slotsFilled: 0 })])],
    });
    const dayOnly = row({ id: 'prj-day', code: 'DA-DAY' });
    const { tx } = listTx([mixed, dayOnly]);

    const result = await listPublicJobProjection(tx, { shiftTypes: ['ca_ngay'] });

    expect(result.jobs.map((job) => job.slug)).toEqual(['DA-DAY']);
    expect(result.total).toBe(1);
  });
});

describe('DEC-08 — facet derive từ toàn tập hợp lệ, TRƯỚC filter của người dùng', () => {
  const KHO = row({
    id: 'prj-kho',
    code: 'DA-KHO',
    name: 'Bốc xếp kho hàng Hải Phòng',
    siteAddress: 'Hải Phòng',
    staffingOrders: [order([slot({ positionCode: 'WH-01', positionTitle: 'Nhân viên kho', workLocation: 'KCN Đình Vũ', shiftStart: '14:00', shiftEnd: '22:00' })], { title: 'Tuyển nhân viên kho' })],
  });

  it('facet giữ nguyên khi áp area ⇒ dropdown không co lại theo chính lựa chọn vừa rồi', async () => {
    const rows = [row(), KHO];
    const unfiltered = await listPublicJobProjection(listTx(rows).tx, {});
    const filtered = await listPublicJobProjection(listTx(rows).tx, { area: 'KCN Đình Vũ' });

    expect(unfiltered.facets).toEqual({
      // Cả hai slot đều KHAI workLocation, nên `siteAddress` ('Bắc Ninh'/'Hải Phòng') không lọt vào
      // facet — nó là fallback, không phải một giá trị cộng thêm. Facet `areas` chào ra đúng những
      // nơi người ta thật sự đến làm, nếu không chọn 'Hải Phòng' sẽ trả 0 dòng.
      areas: ['KCN Đình Vũ', 'KCN VSIP 1'],
      shifts: ['07:00-16:00', '14:00-22:00'],
    });
    // go-live-05 v1.2 / DEC-13, RQ-18: payload facets mang ĐÚNG hai khóa. `toEqual` ở trên đã bắt một
    // khóa thứ ba, dòng này nói ra điều đó thành lời để người đọc sau không nối lại facet suy diễn.
    expect(Object.keys(unfiltered.facets).sort()).toEqual(['areas', 'shifts']);
    // Kết quả co lại...
    expect(filtered.jobs.map((job) => job.slug)).toEqual(['DA-KHO']);
    expect(filtered.total).toBe(1);
    // ...nhưng facet thì không, nếu không người dùng không còn đường quay lại.
    expect(filtered.facets).toEqual(unfiltered.facets);
  });

  it('`where` gửi xuống Prisma chỉ mang cửa public + lifecycle, không mang q/area', async () => {
    const { tx, findMany } = listTx([row()]);

    await listPublicJobProjection(tx, { q: 'bac ninh', area: 'Bắc Ninh' });

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0] as { where: Record<string, unknown>; orderBy: unknown };
    expect(Object.keys(args.where).sort()).toEqual(['isPublic', 'staffingOrders', 'status']);
    // Nếu ai đó đẩy `q`/`area` trở lại SQL thì facet lập tức chỉ còn là facet của tập đã lọc.
    expect(JSON.stringify(args.where)).not.toContain('contains');
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('AC-04/RQ-05 — total, page slice và nextOffset đọc cùng một mảng sau filter', () => {
  /** Sáu việc hợp lệ, mã tăng dần; `findMany` giữ nguyên thứ tự nên page slice là xác định. */
  const SIX = Array.from({ length: 6 }, (_, index) =>
    row({ id: `prj-${index}`, code: `DA-${index}`, name: `Lắp ráp điện tử số ${index}` }),
  );

  it('trang đầu: nextOffset trỏ tới dòng kế tiếp, total là số việc thật', async () => {
    const result = await listPublicJobProjection(listTx(SIX).tx, { limit: 2, offset: 0 });

    expect(result.jobs.map((job) => job.slug)).toEqual(['DA-0', 'DA-1']);
    expect(result.total).toBe(6);
    expect(result.nextOffset).toBe(2);
  });

  it('trang cuối vừa khít: nextOffset là null, không mời tải thêm một trang rỗng', async () => {
    const result = await listPublicJobProjection(listTx(SIX).tx, { limit: 2, offset: 4 });

    expect(result.jobs.map((job) => job.slug)).toEqual(['DA-4', 'DA-5']);
    expect(result.total).toBe(6);
    expect(result.nextOffset).toBeNull();
  });

  it('offset vượt tập: trang rỗng nhưng total vẫn là số thật và nextOffset null', async () => {
    const result = await listPublicJobProjection(listTx(SIX).tx, { limit: 2, offset: 10 });

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(6);
    expect(result.nextOffset).toBeNull();
  });

  it('total đếm SAU filter, không phải số dòng candidate', async () => {
    const rows = [
      ...SIX,
      row({ id: 'prj-expired', code: 'DA-EXPIRED', staffingOrders: [order([slot({ validTo: EXPIRED_AT })])] }),
    ];

    const result = await listPublicJobProjection(listTx(rows).tx, { q: 'số 3', limit: 20 });

    expect(result.jobs.map((job) => job.slug)).toEqual(['DA-3']);
    expect(result.total).toBe(1);
    expect(result.nextOffset).toBeNull();
  });

  it('limit bị kẹp trong [1,50] và offset âm bị đưa về 0', async () => {
    const tooBig = await listPublicJobProjection(listTx(SIX).tx, { limit: 999, offset: -5 });
    expect(tooBig.jobs).toHaveLength(6);
    expect(tooBig.nextOffset).toBeNull();

    const tooSmall = await listPublicJobProjection(listTx(SIX).tx, { limit: 0 });
    expect(tooSmall.jobs.map((job) => job.slug)).toEqual(['DA-0']);
    expect(tooSmall.nextOffset).toBe(1);
    expect(tooSmall.total).toBe(6);
  });
});

describe('AC-05/RQ-06 — q/area/shift khớp trên dữ liệu thật, bỏ dấu, không quét text không in ra', () => {
  it('q bỏ dấu khớp tên dự án, và khớp cả tên vị trí của slot còn hiệu lực', async () => {
    const rows = [row(), row({ id: 'prj-2', code: 'DA-2026-002', name: 'May công nghiệp Hưng Yên', siteAddress: 'Hưng Yên', staffingOrders: [order([slot({ positionCode: 'SEW-01', positionTitle: 'Thợ may', workLocation: 'KCN Phố Nối' })], { title: 'Tuyển thợ may' })] })];

    const byProjectName = await listPublicJobProjection(listTx(rows).tx, { q: 'dien tu' });
    expect(byProjectName.jobs.map((job) => job.slug)).toEqual(['DA-2026-001']);

    const byPosition = await listPublicJobProjection(listTx(rows).tx, { q: 'THO MAY' });
    expect(byPosition.jobs.map((job) => job.slug)).toEqual(['DA-2026-002']);

    const bySlug = await listPublicJobProjection(listTx(rows).tx, { q: 'da-2026-002' });
    expect(bySlug.jobs.map((job) => job.slug)).toEqual(['DA-2026-002']);
  });

  it('q KHÔNG khớp mô tả đơn — đoạn văn không in trên card thì không được sinh ra kết quả', async () => {
    const rows = [row({ staffingOrders: [order([slot()], { description: 'Ưu tiên ứng viên có kinh nghiệm vận hành máy CNC' })] })];

    const result = await listPublicJobProjection(listTx(rows).tx, { q: 'CNC' });

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('area khớp siteAddress hoặc workLocation, bỏ dấu; slot hết hạn không mở đường khớp', async () => {
    const rows = [
      row(),
      row({ id: 'prj-hy', code: 'DA-HY', name: 'Lắp ráp điện tử Hưng Yên', siteAddress: 'Hưng Yên', staffingOrders: [order([slot({ workLocation: 'KCN Phố Nối', validTo: null }), slot({ positionCode: 'OLD-01', workLocation: 'KCN Thăng Long', slotsFilled: 0, validTo: EXPIRED_AT })])] }),
    ];

    const bySite = await listPublicJobProjection(listTx(rows).tx, { area: 'hung yen' });
    expect(bySite.jobs.map((job) => job.slug)).toEqual(['DA-HY']);

    const byWorkLocation = await listPublicJobProjection(listTx(rows).tx, { area: 'vsip' });
    expect(byWorkLocation.jobs.map((job) => job.slug)).toEqual(['DA-2026-001']);

    const byExpiredSlot = await listPublicJobProjection(listTx(rows).tx, { area: 'Thăng Long' });
    expect(byExpiredSlot.jobs).toEqual([]);
  });

  it('shift khớp trên CẢ mảng shifts, không chỉ kíp đứng đầu', async () => {
    const rows = [row({ staffingOrders: [order([slot(), slot({ positionCode: 'PM-01', positionTitle: 'Công nhân kíp chiều', shiftStart: '14:00', shiftEnd: '22:00', slotsFilled: 0 })])] })];

    const first = await listPublicJobProjection(listTx(rows).tx, { shift: '07:00' });
    expect(first.total).toBe(1);

    // Chính giá trị mà facet `shifts` chào ra cho UI: chọn nó phải trả về việc, không phải 0 dòng.
    const second = await listPublicJobProjection(listTx(rows).tx, { shift: '14:00-22:00' });
    expect(second.total).toBe(1);
    expect(second.jobs[0].shifts).toEqual(['07:00-16:00', '14:00-22:00']);
  });
});

describe('AC-01/AC-03, DEC-10/RISK-01/RISK-07 — DTO đúng allow-list, JSON an toàn', () => {
  // go-live-14 / RQ-02, RQ-05 — 15 khóa xuống 14: `industry` đã bị bỏ khỏi allow-list công khai vì
  // nó là khóa duy nhất không truy nguyên được về một cột canonical nào.
  // go-live-09 / RQ-02, RQ-22 — 14 khóa lên 18: thêm ĐÚNG bốn tên của `RQ-02`. `toEqual` giữ nguyên,
  // nên đây vẫn là phép so tập khóa CHÍNH XÁC: một khóa thứ 19 lọt vào mapper là FAIL, và bốn tên này
  // là bốn tên duy nhất được thêm. Tên cột nội bộ `hourlyRateVnd` KHÔNG có mặt và vẫn bị cấm ở vòng
  // dưới — thứ được công bố là con số, không phải cột.
  const PUBLIC_KEYS = [
    'availableSlots', 'deadline', 'id', 'jobType', 'location', 'locations',
    'position', 'positionTitles', 'postedAt', 'salaryMaxVnd', 'salaryMinVnd',
    'shift', 'shiftType', 'shifts', 'slug', 'statusLabel', 'title', 'urgency',
  ];

  it('card DTO có ĐÚNG tập khóa công khai, không thừa một khóa nào', async () => {
    const job = await onlyJob([row({ staffingOrders: [order([slot(), slot(QC_SLOT)])] })]);

    expect(Object.keys(job).sort()).toEqual(PUBLIC_KEYS);
    // go-live-14 / RQ-05, DEC-05 — đây là allow-list khóa DTO thứ HAI trong hai bản; bản thứ nhất ở
    // `public-card-truth.integration.test.ts`. Sót một bản là hàng rào hở, nên hai dòng dưới canh cả
    // hằng số lẫn object thật: sửa lại `PUBLIC_KEYS` mà quên mapper (hoặc ngược lại) đều FAIL.
    expect(PUBLIC_KEYS).not.toContain('industry');
    expect(job).not.toHaveProperty('industry');
  });

  it('không có field thương mại/nội bộ nào, kể cả khi dòng thô mang chúng', async () => {
    // Dòng thô cố tình mang ba field mà `publicSelect` KHÔNG select. Nếu một lượt sửa nào thay
    // projection bằng spread object thì case này đỏ ngay thay vì rò rỉ im lặng lên production.
    const dirty = {
      ...row({ staffingOrders: [order([slot()])] }),
      clientCompanyId: 'client-9',
      internalNotes: 'margin 18%',
      staffingOrders: [
        { ...order([{ ...slot(), hourlyRateVnd: 45_000n } as unknown as Slot]), budgetVnd: 900_000_000n },
      ],
    } as unknown as Row;

    const job = await onlyJob([dirty]);
    const serialized = JSON.stringify(job);

    for (const forbidden of ['clientCompanyId', 'hourlyRateVnd', 'internalNotes', 'budgetVnd', 'margin']) {
      expect(job, forbidden).not.toHaveProperty(forbidden);
      expect(serialized, forbidden).not.toContain(forbidden);
    }
    // RISK-07: `JSON.stringify` NÉM trên BigInt, nên một khóa như vậy làm chết cả route chứ không
    // chỉ rò rỉ. Serialize được nghĩa là không BigInt nào đi vào DTO.
    expect(() => JSON.stringify(job)).not.toThrow();
    // go-live-09 / DEC-19, RQ-22 — SIẾT: dòng thô trên mang `hourlyRateVnd: 45_000n`, nên từ nay
    // không đủ nếu DTO chỉ "không có tên cột". Con số CÔNG BỐ phải bằng đúng giá trị cột, đúng kiểu
    // `number`, và đi tới được JSON. Không có hai dòng này thì một bản cài đặt trả `null` cho mọi
    // mức lương vẫn xanh cả vòng cấm ở trên — đúng loại AC đúng mặt chữ mà vô giá trị.
    expect(job.salaryMinVnd).toBe(45_000);
    expect(serialized).toContain('45000');
  });

  it('không có con số lương nào được suy ra từ số chỗ trống', async () => {
    const job = await onlyJob([row()]);

    expect(job).not.toHaveProperty('salary');
    expect(Object.keys(job)).not.toContain('salaryRange');
    // `availableSlots * 1.5` của bản cũ cho 6 khi có 4 chỗ trống; không giá trị nào trong DTO là nó.
    expect(job.availableSlots).toBe(4);
    expect(JSON.stringify(job)).not.toMatch(/Tri[eệ]u/i);
  });

  it('statusLabel của card luôn là "Đang tuyển" — list không khoe việc đã đủ chỉ tiêu', async () => {
    const job = await onlyJob([row()]);

    expect(job.statusLabel).toBe('Đang tuyển');
  });
});
