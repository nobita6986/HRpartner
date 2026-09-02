/**
 * public-board-architecture.test.ts — V5-go-live-09 / RQ-18, RQ-21, RQ-24 / STEP-03 /
 * AC-04, AC-05, AC-14, AC-21, AC-24.
 *
 * Các bất biến MỚI của task này, đo ở tầng service bằng hành vi (không grep). Tất cả phải FAIL trên
 * mã baseline `8ca2ee1` trước khi `public.service.ts` được sửa — đó là điều kiện của `RQ-18` và là
 * bằng chứng RED của `AC-14`.
 *
 * Ba nhóm:
 *   - `RQ-18`: lương giờ ra JSON đúng kiểu `number` (hoặc `null`), `urgency` chạy bằng TRẠNG THÁI
 *     THẬT của đơn chứ không bằng ngưỡng số chỗ trống, và `JSON.stringify` không ném — bẫy `BigInt`
 *     của `hourlyRateVnd` là bẫy duy nhất ở đây làm sập `NextResponse.json` lúc chạy thật trong khi
 *     mọi gate tĩnh vẫn xanh.
 *   - `RQ-21`/`DEC-18`: `overview` là con số TOÀN CỤC. Phép đo quyết định là bất biến `areaCounts`:
 *     số của một mục phải bằng `total` của lần gọi lại CÙNG service với đúng `area` đó. Một bản cài
 *     đặt đếm giá trị khác nhau của `job.locations` sẽ trượt đúng bất biến này, vì vị từ lọc `area`
 *     so trên `areaHaystack` — chuỗi có cả `siteAddress`, thứ KHÔNG có trong DTO (`DEC-10`).
 *   - `RQ-24`/`DEC-21`: hai mapper nói cùng một sự thật; `toDetailDto` không được là bản sao lệch.
 *
 * PHẠM VI CÓ Ý THỨC: `findMany`/`findFirst` bị mock, nên file này KHÔNG khẳng định gì về RLS hay
 * query engine (bài học hotfix-01: 1418 test xanh song song với 500 cứng trên production). Thứ được
 * đo là phép biến đổi thuần trên đúng hình dạng dòng mà `publicSelect` trả về SAU `RQ-01`, tức có
 * `hourlyRateVnd` ở slot và `createdAt` ở đơn.
 */
import { describe, expect, it, vi } from 'vitest';

import { getPublicJobDetail, listPublicJobProjection, type PublicJobDto } from './public.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mốc tương đối để ngưỡng "dưới 7 ngày" của `RQ-03` đúng ở mọi lần chạy, mọi máy, mọi múi giờ. */
function inDays(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

type Slot = {
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  shiftStart: string | null;
  shiftEnd: string | null;
  validTo: Date | null;
  workLocation: string | null;
  /** `RQ-01`: field mới trong `slots.select`. `BigInt` trong Prisma ⇒ bẫy tuần tự hoá JSON. */
  hourlyRateVnd: bigint | null;
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
    hourlyRateVnd: null,
    ...overrides,
  };
}

type Order = {
  status: string;
  title: string;
  description: string | null;
  deadlineDate: Date | null;
  /** `RQ-01`: field mới trong `staffingOrders.select`, nguồn duy nhất của `postedAt`. */
  createdAt: Date;
  slots: Slot[];
};

function order(slots: Slot[], overrides: Partial<Order> = {}): Order {
  return {
    status: 'OPEN',
    title: 'Tuyển công nhân lắp ráp',
    description: null,
    deadlineDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    slots,
    ...overrides,
  };
}

type Row = { id: string; code: string; name: string; siteAddress: string | null; staffingOrders: Order[] };

/** Đúng payload của `publicSelect` sau `RQ-01`: scalar của `Project` cộng nhánh `staffingOrders`. */
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

function detailTx(single: Row) {
  const findFirst = vi.fn().mockResolvedValue(single);
  return { tx: { project: { findFirst } } as unknown as PublicTx, findFirst };
}

/** Gọi list và đòi đúng một job — dùng cho các case chỉ quan tâm hình dạng DTO. */
async function onlyJob(rows: Row[]): Promise<PublicJobDto> {
  const { tx } = listTx(rows);
  const result = await listPublicJobProjection(tx, {});
  expect(result.jobs).toHaveLength(1);
  return result.jobs[0];
}

describe('go-live-09 / RQ-18 — lương giờ ra JSON đúng kiểu, không còn BigInt', () => {
  it('mọi slot không có lương ⇒ salaryMinVnd và salaryMaxVnd đều null, không phải 0', async () => {
    const job = await onlyJob([row()]);

    // DEC-03: nhánh `null` là nhánh PHỔ BIẾN ở dev nên nó là thiết kế bậc một. `0` ở đây sẽ in ra
    // "0 đ/giờ" trên card — một khẳng định SAI về tiền, và không test nào khác canh chuyện đó.
    expect(job.salaryMinVnd).toBeNull();
    expect(job.salaryMaxVnd).toBeNull();
  });

  it('nhiều slot có lương ⇒ min/max là number thật, slot không lương không kéo min về 0', async () => {
    const job = await onlyJob([
      row({
        staffingOrders: [
          order([
            slot({ hourlyRateVnd: 45_000n }),
            slot({ positionCode: 'QC-01', positionTitle: 'Nhân viên QC', slotsNeeded: 2, slotsFilled: 0, hourlyRateVnd: 30_000n }),
            slot({ positionCode: 'PACK-01', positionTitle: 'Nhân viên đóng gói', slotsNeeded: 1, slotsFilled: 0, hourlyRateVnd: null }),
          ]),
        ],
      }),
    ]);

    expect(job.salaryMinVnd).toBe(30_000);
    expect(job.salaryMaxVnd).toBe(45_000);
    expect(typeof job.salaryMinVnd).toBe('number');
    expect(typeof job.salaryMaxVnd).toBe('number');
  });

  it('JSON.stringify trên DTO có lương không ném — đúng bẫy BigInt của NextResponse.json', async () => {
    const job = await onlyJob([row({ staffingOrders: [order([slot({ hourlyRateVnd: 45_000n })])] })]);

    expect(() => JSON.stringify(job)).not.toThrow();
    // Hai nửa của cùng một khẳng định, và nửa dưới là nửa RED: con số ĐÃ ra tới JSON. Nếu chỉ giữ
    // `not.toThrow()` thì test này xanh cả trên baseline (baseline không có `BigInt` nào trong DTO),
    // tức nó không khoá gì — đúng loại AC "đúng mặt chữ mà vô giá trị".
    expect(JSON.stringify(job)).toContain('45000');
    // `DEC-19`: tên cột nội bộ vẫn bị cấm trong payload; khoá công khai là `salaryMinVnd`.
    expect(JSON.stringify(job)).not.toContain('hourlyRateVnd');
  });
});

describe('go-live-09 / RQ-03, RQ-04, RQ-18 — urgency chạy bằng trạng thái thật', () => {
  it('đơn OPEN chỉ còn 1 chỗ ⇒ NONE, statusLabel vẫn là Đang tuyển', async () => {
    const job = await onlyJob([row({ staffingOrders: [order([slot({ slotsNeeded: 1, slotsFilled: 0 })])] })]);

    // DEC-04: một đơn 1 chỗ mở từ tháng trước KHÔNG phải "gấp". Ngưỡng cũ (`<= 5`) là suy diễn từ
    // số chỗ trống, và nó nói sai về cả hai đầu: đơn 200 chỗ vừa mở cũng không phải "gấp".
    expect(job.availableSlots).toBe(1);
    expect(job.urgency).toBe('NONE');
    expect(job.statusLabel).toBe('Đang tuyển');
  });

  it('CLOSING_SOON cộng hạn còn 3 ngày ⇒ URGENT và statusLabel đổi theo', async () => {
    const job = await onlyJob([
      row({ staffingOrders: [order([slot()], { status: 'CLOSING_SOON', deadlineDate: inDays(3) })] }),
    ]);

    expect(job.urgency).toBe('URGENT');
    expect(job.statusLabel).toBe('Sắp hết hạn');
  });

  it('CLOSING_SOON mà deadline null ⇒ CLOSING, không phải NONE và không phải URGENT', async () => {
    const job = await onlyJob([
      row({ staffingOrders: [order([slot()], { status: 'CLOSING_SOON', deadlineDate: null })] }),
    ]);

    expect(job.deadline).toBeNull();
    expect(job.urgency).toBe('CLOSING');
  });

  it('CLOSING_SOON mà hạn còn 30 ngày ⇒ CLOSING — ngưỡng 7 ngày có ý nghĩa thật', async () => {
    const job = await onlyJob([
      row({ staffingOrders: [order([slot()], { status: 'CLOSING_SOON', deadlineDate: inDays(30) })] }),
    ]);

    expect(job.urgency).toBe('CLOSING');
  });

  it('postedAt là ISO của createdAt ĐƠN, không phải của project', async () => {
    const job = await onlyJob([
      row({ staffingOrders: [order([slot()], { createdAt: new Date('2026-02-03T04:05:06.000Z') })] }),
    ]);

    expect(job.postedAt).toBe('2026-02-03T04:05:06.000Z');
  });
});

/**
 * Ba dòng cố tình dựng để phân biệt hai phép đếm KHÁC NHAU trên cùng dữ liệu (`DEC-10`/`DEC-18`):
 *
 *   - `prj-a` có `siteAddress` là `Bắc Ninh` và `workLocation` trắng ⇒ `locations` fallback về
 *     `['Bắc Ninh']`.
 *   - `prj-b` cũng ở `Bắc Ninh` nhưng `workLocation` là `KCN VSIP 1` ⇒ `locations` KHÔNG chứa
 *     `Bắc Ninh`, dù bộ lọc `area=Bắc Ninh` vẫn khớp nó qua `siteAddress` trong `areaHaystack`.
 *
 * Vì vậy `areaCounts['Bắc Ninh']` phải là `2`. Một bản cài đặt đếm giá trị khác nhau của
 * `job.locations` — thứ duy nhất client thấy được — sẽ ra `1` và trượt đúng bất biến này.
 */
function boardRows(): Row[] {
  return [
    row({
      id: 'prj-a',
      code: 'DA-A',
      siteAddress: 'Bắc Ninh',
      staffingOrders: [
        order([slot({ workLocation: '   ', slotsNeeded: 5, slotsFilled: 1 })], { createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      ],
    }),
    row({
      id: 'prj-b',
      code: 'DA-B',
      siteAddress: 'Bắc Ninh',
      staffingOrders: [
        order([slot({ workLocation: 'KCN VSIP 1', slotsNeeded: 3, slotsFilled: 0, hourlyRateVnd: 40_000n })], { createdAt: new Date('2026-03-01T00:00:00.000Z') }),
      ],
    }),
    row({
      id: 'prj-c',
      code: 'DA-C',
      siteAddress: 'Hà Nội',
      staffingOrders: [
        order([slot({ workLocation: 'KCN Thăng Long', slotsNeeded: 2, slotsFilled: 0, hourlyRateVnd: 70_000n })], { createdAt: new Date('2026-02-01T00:00:00.000Z') }),
      ],
    }),
  ];
}

describe('go-live-09 / RQ-21, DEC-18 — overview là con số TOÀN CỤC, tính trước lọc và trước phân trang', () => {
  it('overview.totals.jobs bằng total khi gọi không bộ lọc, và ba số đúng phép tính ở service', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(3);
    expect(result.overview.totals.jobs).toBe(result.total);
    // 4 + 3 + 2 — tổng chỗ còn tuyển của TOÀN tập hợp lệ, không phải của trang đang trả.
    expect(result.overview.totals.slots).toBe(9);
    expect(result.overview.totals.areas).toBe(result.overview.areaCounts.length);
  });

  it('areaCounts đếm bằng ĐÚNG vị từ của bộ lọc area, không bằng job.locations', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    const bacNinh = result.overview.areaCounts.find((entry) => entry.value === 'Bắc Ninh');
    expect(bacNinh).toBeDefined();
    // `prj-b` không có `Bắc Ninh` trong `locations` nhưng bộ lọc vẫn khớp nó ⇒ số phải là 2.
    expect(bacNinh?.count).toBe(2);
  });

  it('số của một mục areaCounts bằng total của lần gọi lại cùng service với đúng area đó', async () => {
    const rows = boardRows();
    const first = await listPublicJobProjection(listTx(rows).tx, {});
    const entry = first.overview.areaCounts.find((item) => item.value === 'Bắc Ninh');
    expect(entry).toBeDefined();

    const refetch = await listPublicJobProjection(listTx(rows).tx, { area: entry!.value });

    // Đây là bất biến quyết định của `DEC-18`: số trên tag bằng đúng số việc mà cú bấm sẽ thấy.
    expect(refetch.total).toBe(entry!.count);
  });

  it('areaCounts và shiftCounts không chứa mục count bằng 0 và đã sắp giảm dần', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    for (const entry of [...result.overview.areaCounts, ...result.overview.shiftCounts]) {
      // Tag "Bắc Giang (0)" là mời người dùng bấm vào một trang trống (`DEC-10`).
      expect(entry.count).toBeGreaterThan(0);
    }
    const areaNumbers = result.overview.areaCounts.map((entry) => entry.count);
    expect(areaNumbers).toEqual([...areaNumbers].sort((a, b) => b - a));
    const shiftNumbers = result.overview.shiftCounts.map((entry) => entry.count);
    expect(shiftNumbers).toEqual([...shiftNumbers].sort((a, b) => b - a));
  });

  it('topPaid không chứa việc không có lương, sắp giảm dần, tối đa 6 phần tử', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    expect(result.overview.topPaid.length).toBeLessThanOrEqual(6);
    // `prj-a` hợp lệ và có mặt trong `jobs`, nhưng KHÔNG được có mặt ở dải "Lương cao nhất".
    expect(result.overview.topPaid.map((job) => job.id)).toEqual(['prj-c', 'prj-b']);
    for (const job of result.overview.topPaid) {
      expect(job.salaryMinVnd).not.toBeNull();
    }
  });

  it('newest sắp theo postedAt giảm dần và mang DTO đầy đủ, không chỉ slug', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    expect(result.overview.newest.map((job) => job.id)).toEqual(['prj-b', 'prj-c', 'prj-a']);
    expect(result.overview.newest.length).toBeLessThanOrEqual(6);
    // `DEC-18`: dải phải render được kể cả khi phần tử KHÔNG nằm trong trang 12 dòng đang tải.
    expect(result.overview.newest[0].title).toBe('Lắp ráp điện tử Bắc Ninh');
  });

  it('overview không đổi khi phân trang: trang 2 vẫn thấy đúng ba con số toàn cục', async () => {
    const rows = boardRows();
    const page1 = await listPublicJobProjection(listTx(rows).tx, { limit: 1, offset: 0 });
    const page2 = await listPublicJobProjection(listTx(rows).tx, { limit: 1, offset: 1 });

    // Đây là phép duy nhất phân biệt số toàn cục với số của một trang (`AC-12`).
    expect(page1.jobs).toHaveLength(1);
    expect(page2.jobs).toHaveLength(1);
    expect(page2.overview.totals).toEqual(page1.overview.totals);
    expect(page2.overview.areaCounts).toEqual(page1.overview.areaCounts);
    expect(page1.overview.totals.jobs).toBe(3);
  });

  it('bốn khoá cũ của PublicJobListResult không đổi, overview là khoá thứ năm THUẦN CỘNG', async () => {
    const { tx } = listTx(boardRows());
    const result = await listPublicJobProjection(tx, {});

    expect(Object.keys(result).sort()).toEqual(['facets', 'jobs', 'nextOffset', 'overview', 'total']);
    expect(Object.keys(result.overview).sort()).toEqual(['areaCounts', 'newest', 'shiftCounts', 'topPaid', 'totals']);
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

describe('go-live-09 / RQ-24, DEC-21 — hai mapper nói cùng một sự thật', () => {
  it('bốn field mới của toDetailDto bằng đúng bốn field của toDto trên cùng một hàng', async () => {
    const single = row({
      staffingOrders: [
        order([slot({ hourlyRateVnd: 45_000n }), slot({ positionCode: 'QC-01', slotsNeeded: 2, slotsFilled: 0, hourlyRateVnd: 30_000n })], {
          status: 'CLOSING_SOON',
          deadlineDate: inDays(3),
          createdAt: new Date('2026-02-03T04:05:06.000Z'),
        }),
      ],
    });

    const listed = await onlyJob([single]);
    const detail = await getPublicJobDetail(detailTx(single).tx, single.code);

    expect(detail).not.toBeNull();
    // Bốn giá trị được ghim CỤ THỂ trước khi so hai mapper. Nếu chỉ so `detail` với `listed` thì
    // `undefined === undefined` làm test xanh trên baseline, tức bất biến `RQ-24` không khoá gì.
    expect(listed.salaryMinVnd).toBe(30_000);
    expect(listed.salaryMaxVnd).toBe(45_000);
    expect(listed.urgency).toBe('URGENT');
    expect(listed.postedAt).toBe('2026-02-03T04:05:06.000Z');
    // Để `toDetailDto` thiếu field là làm hai mapper nói hai sự thật khác nhau về CÙNG việc làm.
    expect(detail?.salaryMinVnd).toBe(listed.salaryMinVnd);
    expect(detail?.salaryMaxVnd).toBe(listed.salaryMaxVnd);
    expect(detail?.urgency).toBe(listed.urgency);
    expect(detail?.postedAt).toBe(listed.postedAt);
    expect(() => JSON.stringify(detail)).not.toThrow();
  });
});

