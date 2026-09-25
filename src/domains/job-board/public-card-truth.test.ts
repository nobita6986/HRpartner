/**
 * public-card-truth.test.ts — V5-go-live-05 / RQ-12 / STEP-07 / AC-01..AC-04, AC-06, AC-11.
 *
 * DEC-06: Tab URGENT fixture `BEST_JOBS_URGENT_PREVIEW` carries `source: 'INTEGRATION_PENDING'`
 * per DEC-06 (RQ-03/RQ-04). This test file validates the DTO contract — it does not cover the
 * fixture itself (fixture is tested via AC-01/AC-09 in the acceptance gates).
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
  id?: string;
  positionCode: string;
  positionTitle: string;
  slotsNeeded: number;
  slotsFilled: number;
  shiftStart: string | null;
  shiftEnd: string | null;
  validTo: Date | null;
  workLocation: string | null;
  // hrp-p1-a1: `publicSelect` chọn `hourlyRateVnd` (BigInt? ở DB); fixture phải mang đúng field
  // này để mapper `salaryMin/MaxVnd` nhìn thấy lương và `JSON.stringify` không phải đoán BigInt.
  hourlyRateVnd?: bigint | null;
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

type Order = { status: string; title: string; description: string | null; deadlineDate: Date | null; createdAt: Date; canonicalSlot: Slot | null; budgetVnd?: bigint | null };

function order(slot: Slot | Slot[] | null, overrides: Partial<Order> = {}): Order {
  // C-02: canonical slot per JobOpening (single). Accept một Slot, một mảng đơn (lấy phần tử
  // đầu — tương thích ngược với callsite test cũ), hoặc null (legacy chain drift ⇒ fail closed).
  const resolved: Slot | null = Array.isArray(slot)
    ? (slot[0] ?? null)
    : slot;
  // go-live-09 / RQ-01: `publicSelect` nay select cả `createdAt` của đơn, nên fixture phải mang nó
  // để còn là hình dạng dòng THẬT. Mốc cố định để kết quả không đổi theo ngày chạy.
  return { status: 'OPEN', title: 'Tuyển công nhân lắp ráp', description: null, deadlineDate: null, createdAt: new Date('2026-01-15T00:00:00.000Z'), canonicalSlot: resolved, ...overrides };
}

/**
 * hrp-p1-a1: payload phản ánh hình dạng `publicSelect` mới — JobPosting + JobOpening → StaffingOrder → Project.
 * Mapper `projectRowFromPosting` sẽ gỡ về `PublicProjectRow` để phần còn lại của mapper dùng nguyên xi.
 *
 * Tên trường public (`id`, `slug`, `title`) nằm ngoài; `staffingOrder` và `project` lồng dưới `jobOpening`
 * — đó là cấu trúc Prisma trả về khi chạy `tx.jobPosting.findMany({ select: publicSelect })`.
 */
type Row = {
  id: string;
  slug: string;
  title: string | null;
  /** hrp-p1-a1: các field cấm cho phép dirty row đặt thêm để chứng minh mapper KHÔNG lộ. */
  clientCompanyId?: string;
  internalNotes?: string;
  jobOpening: {
    staffingOrder: Order & {
      project: { code: string; siteAddress: string | null; clientCompanyName: string | null };
    };
    // hrp-p1-a1 (C-02): liên kết canonical slot — fix cứng 1-1-1 với JobOpening. Mapper sẽ lấy
    // field này để suy `staffingOrders[0].canonicalSlot`. Không lấy `staffingOrder.slots`
    // (toàn bộ sibling slots) ⇒ sibling slot không lọt vào DTO.
    staffingOrderSlot: Slot | null;
  } | null;
};

interface RowOpts {
  id?: string;
  slug?: string;
  title?: string | null;
  siteAddress?: string | null;
  clientCompanyName?: string | null;
  staffingOrders?: Order[];
}

/**
 * hrp-p1-a1: Mặc định một JobPosting PHẢI có JobOpening → StaffingOrder (chuỗi canonical 1-1-1).
 * Trước đây buildRow có nhánh `jobOpening: null` dành cho hàng Project không mở đơn nào — cấu trúc
 * cũ cho phép `project` tồn tại độc lập với `staffingOrder`. Canonical không có khái niệm ấy: một
 * JobPosting không có JobOpening thì không hiển thị được, không cần tạo payload. Tests gọi
 * `row()` không truyền `staffingOrders` vẫn phải ra một hàng HỢP LỆ theo `publicSelect`, tức là
 * `jobOpening.staffingOrder` phải tồn tại và có ít nhất một slot để `toDto` không trả null.
 */
function buildRow(opts: RowOpts): Row {
  const first: Order = opts.staffingOrders?.[0] ?? order([slot()]);
  // C-02 (correction batch 1/1): mapper đọc canonical slot từ `jobOpening.staffingOrderSlot`, không
  // phải `staffingOrder.slots`. Fixtures cũ đặt slot ở `staffingOrder.canonicalSlot` (chỉ mang tính
  // tương thích ngược với callsite test), `buildRow` gương nó sang `staffingOrderSlot` để mapper
  // thấy. Project cần `code` (mapping cho C-06 legacy `PRJ-xxx` filter).
  const canonicalSlot: Slot | null = first.canonicalSlot
    ? { ...first.canonicalSlot, id: first.canonicalSlot.id ?? `slot-${first.canonicalSlot.positionCode}` }
    : null;
  return {
    id: opts.id ?? 'prj-1',
    slug: opts.slug ?? 'cong-nhan-lap-rap-bac-ninh-2026',
    title: opts.title ?? 'Lắp ráp điện tử Bắc Ninh',
    jobOpening: {
      staffingOrder: {
        ...first,
        canonicalSlot: first.canonicalSlot,
        project: {
          code: 'PRJ-KB-2026',
          siteAddress: opts.siteAddress ?? 'Bắc Ninh',
          clientCompanyName: opts.clientCompanyName ?? 'Công ty TNHH Điện tử Kinh Bắc',
        },
      },
      staffingOrderSlot: canonicalSlot,
    },
  };
}

/**
 * Backwards-compatible adapter: chấp nhận cả dạng cũ `row({ id, code, name, siteAddress,
 * staffingOrders })` lẫn dạng đã chuyển `row([order([...])])`. Mọi callsite cũ vẫn hoạt động
 * sau khi đổi tên `code`→`slug` và `name`→`title`. Đây là tấm bản lề thời gian — sẽ bị bỏ khi
 * các file test khác đã chuyển sang dạng mới.
 */
// `RowOpts` cố ý để mở: alias kiểu cũ (có `code`/`name`) lẫn mới (có `slug`/`title`). Dùng
// `Record<string, unknown>` để TS không reject key lạ — đây là điểm nối tạm trong quá trình
// refactor, không phải API sản phẩm.
function row(input: Record<string, unknown> | Order[] = {}): Row {
  if (Array.isArray(input)) return buildRow({ staffingOrders: input });
  // Map cũ → mới: `code` (project.code, trở thành canonical slug) và `name` (project.name, trở thành
  // JobPosting.title). `id`/`siteAddress`/`clientCompanyName`/`staffingOrders` giữ nguyên tên.
  return buildRow({
    id: input.id as string | undefined,
    slug: (input.slug as string | undefined) ?? (input.code as string | undefined),
    title: (input.title as string | null | undefined) ?? (input.name as string | null | undefined) ?? null,
    siteAddress: input.siteAddress as string | null | undefined,
    clientCompanyName: input.clientCompanyName as string | null | undefined,
    staffingOrders: input.staffingOrders as Order[] | undefined,
  });
}

type PublicTx = Parameters<typeof listPublicJobProjection>[0];

function listTx(rows: Row[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  // hrp-p1-a1: source chuyển từ `tx.project` sang `tx.jobPosting`.
  return { tx: { jobPosting: { findMany } } as unknown as PublicTx, findMany };
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
  it('một canonical slot ⇒ mảng positionTitles/locations/shifts chỉ chứa giá trị của slot đó', async () => {
    // hrp-p1-a1 (C-02): canonical slot per JobPosting — một JobOpening ↔ một StaffingOrderSlot.
    // Trước đây JobPosting được hợp nhất từ nhiều slot, việc tổng hợp nhiều nhãn trên một card là
    // nguồn sai lệch (sibling slot lẫn vào nhau). Ở P1-A1, tổng hợp multi-slot chỉ xảy ra ở đường
    // Project-level public UI (mỗi posting mang đúng một slot của nó).
    const job = await onlyJob([
      row({
        staffingOrders: [
          order(slot({ positionCode: 'ASSY-01', positionTitle: 'Công nhân lắp ráp', slotsNeeded: 5, slotsFilled: 1, workLocation: 'KCN VSIP 1', shiftStart: '07:00', shiftEnd: '16:00' })),
        ],
      }),
    ]);

    expect(job.positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(job.locations).toEqual(['KCN VSIP 1']);
    expect(job.shifts).toEqual(['07:00-16:00']);
    // DEC-03: field đơn là giá trị duy nhất của canonical slot.
    expect(job.position).toBe(job.positionTitles[0]);
    expect(job.location).toBe(job.locations[0]);
    expect(job.shift).toBe(job.shifts[0]);
    // (5-1) = 4
    expect(job.availableSlots).toBe(4);
  });

  it('slot hết hạn (canonical) khiến cả JobPosting bị loại', async () => {
    // hrp-p1-a1 (C-02): chỉ một canonical slot per JobPosting. Nếu slot đó hết hạn thì `visibleSlots`
    // trả [] và `toDto` trả null ⇒ JobPosting không xuất hiện trong danh sách. Tách làm hai case riêng
    // để khẳng định tách biệt giữa "còn chỗ trống" và "không hiện":
    const liveJob = await onlyJob([
      row({
        slug: 'DA-LIVE',
        staffingOrders: [order(slot())],
      }),
    ]);
    expect(liveJob.positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(liveJob.availableSlots).toBe(4);

    const { tx } = listTx([
      row({ slug: 'DA-EXPIRED', staffingOrders: [order(slot({ validTo: EXPIRED_AT }))] }),
    ]);
    const result = await listPublicJobProjection(tx, {});
    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('canonical slot đã đủ chỉ tiêu ⇒ JobPosting bị loại khỏi danh sách (toDto fail-closed)', async () => {
    // hrp-p1-a1 (C-02): canonical slot với slotsNeeded === slotsFilled ⇒ `toDto` thấy
    // `availableSlots <= 0` và trả null. Card list công khai không bao giờ khoe việc "Đã đủ chỉ
    // tiêu" ở đây; nhãn đó là của trang chi tiết (`toDetailDto`). Test khẳng định danh sách trống.
    const { tx } = listTx([row({ staffingOrders: [order(slot({ slotsNeeded: 2, slotsFilled: 2 }))] })]);

    const result = await listPublicJobProjection(tx, {});
    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('đơn không còn hiển thị (status hoặc deadline) bị loại khỏi mọi phép tính của card', async () => {
    // hrp-p1-a1: mỗi JobPosting có đúng một JobOpening → một StaffingOrder. Nếu đơn ấy không còn
    // hiển thị (CLOSED hoặc deadline quá khứ) thì JobPosting đó KHÔNG xuất hiện trong danh sách —
    // `eligible.push({row, job})` không được gọi vì `toDto` trả null. Đây chính là bài học của
    // go-live-09: một JobPosting có một sự thật duy nhất, không "hợp nhất" nhiều đơn.
    const { tx } = listTx([
      // Việc hợp lệ: order OPEN, deadline tương lai, một slot còn chỗ.
      row({
        id: 'posting-visible',
        slug: 'DA-VISIBLE',
        title: 'Lap rap OPEN',
        staffingOrders: [order(slot(), { deadlineDate: FUTURE_AT, title: 'Đơn OPEN' })],
      }),
      // Việc không hiển thị: order CLOSED, slot vẫn còn nhưng `toDto` sẽ loại.
      row({
        id: 'posting-closed',
        slug: 'DA-CLOSED',
        title: 'Việc đã đóng',
        staffingOrders: [order(slot({ positionCode: 'CLOSED-01', positionTitle: 'Vị trí đã đóng', slotsNeeded: 7, slotsFilled: 0 }), { status: 'CLOSED', title: 'Đơn đã đóng' })],
      }),
      // Việc không hiển thị: order OPEN nhưng deadline đã qua, slot vẫn còn nhưng `isExpired` loại.
      row({
        id: 'posting-expired',
        slug: 'DA-EXPIRED',
        title: 'Việc quá hạn',
        staffingOrders: [order(slot({ positionCode: 'EXPIRED-01', positionTitle: 'Vị trí quá hạn', slotsNeeded: 8, slotsFilled: 0 }), { deadlineDate: EXPIRED_AT, title: 'Đơn quá hạn' })],
      }),
    ]);

    const result = await listPublicJobProjection(tx, {});

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].slug).toBe('DA-VISIBLE');
    expect(result.jobs[0].positionTitles).toEqual(['Công nhân lắp ráp']);
    expect(result.jobs[0].availableSlots).toBe(4);
    // `earliestDeadline` đọc deadline của order DUY NHẤT dưới JobPosting: FUTURE_AT, không phải
    // EXPIRED_AT (đơn quá hạn thuộc về JobPosting khác, không bị trộn vào JobPosting này).
    expect(result.jobs[0].deadline).toBe(FUTURE_AT.toISOString());
    expect(result.total).toBe(1);
  });

  it('canonical slot hết hạn hoặc đã đủ chỉ tiêu ⇒ cả hai JobPosting bị loại khỏi danh sách', async () => {
    // hrp-p1-a1 (C-02): canonical slot per JobPosting. (a) hết hạn ⇒ `visibleSlots` trả [] ⇒
    // `toDto` trả null; (b) đầy người ⇒ `availableSlots <= 0` ⇒ `toDto` trả null. Cả hai đều fail-closed.
    const { tx } = listTx([
      row({ slug: 'DA-EXP', staffingOrders: [order(slot({ validTo: EXPIRED_AT }))] }),
      row({ slug: 'DA-FULL', staffingOrders: [order(slot({ slotsNeeded: 3, slotsFilled: 3 }))] }),
    ]);

    const result = await listPublicJobProjection(tx, {});

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.nextOffset).toBeNull();
    // DEC-08: facet cũng rỗng — không có slot nào qua cửa `visibleSlots`.
    expect(result.facets).toEqual({ areas: [], shifts: [] });
  });
});

describe('AC-06/RQ-07, DEC-07 — shiftType đo được hoặc null, không bao giờ suy ra "xoay ca"', () => {
  it('canonical slot ca_ngay ⇒ shiftType ca_ngay', async () => {
    // hrp-p1-a1 (C-02): hai kíp khác hạng giờ thuộc HAI JobPosting khác nhau (cùng Project nhưng hai
    // JobOpening → hai canonical slot). Tách thành hai row.
    const dayJob = await onlyJob([
      row({ staffingOrders: [order(slot({ shiftStart: '07:00', shiftEnd: '16:00' }))] }),
    ]);
    expect(dayJob.shiftType).toBe('ca_ngay');
    expect(dayJob.shifts).toEqual(['07:00-16:00']);
    // Chốt cả từ vựng: `'xoay_ca'` không còn là giá trị mà DTO công khai có thể sinh ra.
    expect(JSON.stringify(dayJob)).not.toContain('xoay_ca');
  });

  it('canonical slot ca_dem ⇒ shiftType ca_dem; không có giờ ⇒ null', async () => {
    const night = await onlyJob([
      row({
        slug: 'DA-NIGHT',
        staffingOrders: [order(slot({ shiftStart: '20:00', shiftEnd: '04:00' }))],
      }),
    ]);
    expect(night.shiftType).toBe('ca_dem');

    const unknown = await onlyJob([row({ staffingOrders: [order(slot({ shiftStart: null, shiftEnd: null }))] })]);
    expect(unknown.shiftType).toBeNull();
    expect(unknown.shift).toBeNull();
    expect(unknown.shifts).toEqual([]);
  });

  it('shiftTypes lọc bỏ việc có shiftType null thay vì cho nó khớp mọi giá trị', async () => {
    // C-02: một JobPosting giờ chỉ project MỘT canonical slot; để kiểm tra shiftTypes chỉ khớp
    // job có canonical slot ca_ngay, ta dùng HAI row: một ca_ngay (đi qua) và một ca_dem (bị loại).
    const dayShift = row({
      id: 'prj-day',
      slug: 'DA-DAY',
      staffingOrders: [order(slot({ shiftStart: '07:00', shiftEnd: '16:00' }))],
    });
    const nightShift = row({
      id: 'prj-night',
      slug: 'DA-NIGHT',
      staffingOrders: [order(slot({ positionCode: 'N-01', shiftStart: '22:00', shiftEnd: '06:00' }))],
    });
    const { tx } = listTx([dayShift, nightShift]);

    const result = await listPublicJobProjection(tx, { shiftTypes: ['ca_ngay'] });

    expect(result.jobs.map((job) => job.slug)).toEqual(['DA-DAY']);
    expect(result.total).toBe(1);
  });
});

describe('DEC-08 — facet derive từ toàn tập hợp lệ, TRƯỚC filter của người dùng', () => {
  const KHO = row({
    id: 'prj-kho',
    slug: 'DA-KHO',
    title: 'Bốc xếp kho hàng Hải Phòng',
    siteAddress: 'Hải Phòng',
    staffingOrders: [order(slot({ positionCode: 'WH-01', positionTitle: 'Nhân viên kho', workLocation: 'KCN Đình Vũ', shiftStart: '14:00', shiftEnd: '22:00' }), { title: 'Tuyển nhân viên kho' })],
  });

  it('facet giữ nguyên khi áp area ⇒ dropdown không co lại theo chính lựa chọn vừa rồi', async () => {
    const rows = [row(), KHO];
    const unfiltered = await listPublicJobProjection(listTx(rows).tx, {});
    const filtered = await listPublicJobProjection(listTx(rows).tx, { area: 'KCN Đình Vũ' });

    expect(unfiltered.facets.areas).toEqual(['KCN Đình Vũ', 'KCN VSIP 1']);
    expect(unfiltered.facets.shifts).toEqual(['07:00-16:00', '14:00-22:00']);
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
    // hrp-p1-a1: nguồn chuyển từ `Project` sang `JobPosting`, where CHỈ còn `status: 'PUBLISHED'`.
    expect(Object.keys(args.where).sort()).toEqual(['status']);
    // Nếu ai đó đẩy `q`/`area` trở lại SQL thì facet lập tức chỉ còn là facet của tập đã lọc.
    expect(JSON.stringify(args.where)).not.toContain('contains');
    expect(args.orderBy).toEqual({ publishedAt: 'desc' });
  });
});

describe('AC-04/RQ-05 — total, page slice và nextOffset đọc cùng một mảng sau filter', () => {
  /** Sáu việc hợp lệ, mã tăng dần; `findMany` giữ nguyên thứ tự nên page slice là xác định. */
  const SIX = Array.from({ length: 6 }, (_, index) =>
    row({ id: `prj-${index}`, slug: `DA-${index}`, title: `Lắp ráp điện tử số ${index}` }),
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
      row({ slug: 'DA-EXPIRED', staffingOrders: [order(slot({ validTo: EXPIRED_AT }))] }),
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
  // hrp-p1-a1: slug là canonical, derive từ JobPosting (slug lấy theo DEC-05: <normalized-title>-
  // <stable-short-suffix>), không còn là `Project.code` (`DA-2026-NNN`). Hằng slug cố định dưới đây
  // là slug thật của JobPosting tương ứng với từng fixture.
  const SLUG_DIEN_TU = 'lap-rap-dien-tu-bac-ninh-2026';
  const SLUG_MAY = 'may-cong-nghiep-hung-yen-2026';
  const SLUG_DIEN_TU_HY = 'lap-rap-dien-tu-hung-yen-2026';

  it('q bỏ dấu khớp tên dự án, và khớp cả tên vị trí của canonical slot', async () => {
    // hrp-p1-a1 (C-02): canonical slot là slot duy nhất của JobPosting. Mỗi row có một canonical slot.
    const rows = [
      row({ slug: SLUG_DIEN_TU }),
      row({ slug: SLUG_MAY, title: 'May công nghiệp Hưng Yên', siteAddress: 'Hưng Yên', staffingOrders: [order(slot({ positionCode: 'SEW-01', positionTitle: 'Thợ may', workLocation: 'KCN Phố Nối' }), { title: 'Tuyển thợ may' })] }),
    ];

    const byProjectName = await listPublicJobProjection(listTx(rows).tx, { q: 'dien tu' });
    expect(byProjectName.jobs.map((job) => job.slug)).toEqual([SLUG_DIEN_TU]);

    const byPosition = await listPublicJobProjection(listTx(rows).tx, { q: 'THO MAY' });
    expect(byPosition.jobs.map((job) => job.slug)).toEqual([SLUG_MAY]);

    const bySlug = await listPublicJobProjection(listTx(rows).tx, { q: SLUG_MAY });
    expect(bySlug.jobs.map((job) => job.slug)).toEqual([SLUG_MAY]);
  });

  it('q KHÔNG khớp mô tả đơn — đoạn văn không in trên card thì không được sinh ra kết quả', async () => {
    const rows = [row({ staffingOrders: [order(slot(), { description: 'Ưu tiên ứng viên có kinh nghiệm vận hành máy CNC' })] })];

    const result = await listPublicJobProjection(listTx(rows).tx, { q: 'CNC' });

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('area khớp siteAddress hoặc workLocation, bỏ dấu; slot hết hạn không mở đường khớp', async () => {
    // C-02: canonical slot là slot DUY NHẤT của JobPosting, nên "slot hết hạn" không còn là
    // sibling trong một order — nó là canonical. Một JobPosting có canonical slot hết hạn thì
    // cả JobPosting bị loại bởi `isSlotLive` ngay tại `visibleSlots`. Tách thành hai row:
    //   • một có canonical slot hết hạn (toàn bộ row KHÔNG match `area`)
    //   • một có canonical slot hợp lệ với `workLocation` khớp `area`
    const expiredSlotRow = row({
      slug: 'expired-slot',
      title: 'Việc có slot hết hạn',
      siteAddress: 'Bắc Ninh',
      staffingOrders: [order(slot({ positionCode: 'OLD-01', workLocation: 'KCN Thăng Long', slotsFilled: 0, validTo: EXPIRED_AT }))],
    });
    const rows = [
      row({ slug: SLUG_DIEN_TU }),
      row({ slug: SLUG_DIEN_TU_HY, title: 'Lắp ráp điện tử Hưng Yên', siteAddress: 'Hưng Yên', staffingOrders: [order(slot({ workLocation: 'KCN Phố Nối', validTo: null }))] }),
      expiredSlotRow,
    ];

    const bySite = await listPublicJobProjection(listTx(rows).tx, { area: 'hung yen' });
    expect(bySite.jobs.map((job) => job.slug)).toEqual([SLUG_DIEN_TU_HY]);

    const byWorkLocation = await listPublicJobProjection(listTx(rows).tx, { area: 'vsip' });
    expect(byWorkLocation.jobs.map((job) => job.slug)).toEqual([SLUG_DIEN_TU]);

    const byExpiredSlot = await listPublicJobProjection(listTx(rows).tx, { area: 'Thăng Long' });
    expect(byExpiredSlot.jobs).toEqual([]);
  });

  it('shift khớp trên CẢ mảng shifts, không chỉ kíp đứng đầu', async () => {
    // C-02: canonical slot per JobPosting. Hai kíp giờ thuộc HAI JobPosting khác nhau (cùng
    // Project nhưng hai JobOpening → hai canonical slot). Test chuyển sang hai row độc lập để
    // khẳng định filter `shift` khớp ĐÚNG mảng `shifts` (mỗi row có một kíp), không chỉ
    // kíp xuất hiện đầu tiên trong mảng sort.
    const morningRow = row({ slug: 'morning-shift', staffingOrders: [order(slot({ shiftStart: '07:00', shiftEnd: '16:00' }))] });
    const eveningRow = row({ slug: 'evening-shift', staffingOrders: [order(slot({ shiftStart: '14:00', shiftEnd: '22:00' }))] });
    const rows = [morningRow, eveningRow];

    const first = await listPublicJobProjection(listTx(rows).tx, { shift: '07:00' });
    expect(first.total).toBe(1);
    expect(first.jobs[0].slug).toBe('morning-shift');

    const second = await listPublicJobProjection(listTx(rows).tx, { shift: '14:00-22:00' });
    expect(second.total).toBe(1);
    expect(second.jobs[0].slug).toBe('evening-shift');
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
    'availableSlots', 'companyName', 'deadline', 'id', 'jobType', 'location', 'locations',
    'position', 'positionTitles', 'postedAt', 'salaryMaxVnd', 'salaryMinVnd',
    'shift', 'shiftType', 'shifts', 'slug', 'statusLabel', 'title', 'urgency',
  ];

  it('card DTO có ĐÚNG tập khóa công khai, không thừa một khóa nào', async () => {
    // C-02: canonical slot per JobPosting — chỉ một slot, QC_SLOT là canonical.
    const job = await onlyJob([row({ staffingOrders: [order(slot(QC_SLOT))] })]);

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
    //
    // hrp-p1-a1: dirty row phải đặt field cấm dưới đúng cấu trúc JobPosting → JobOpening →
    // StaffingOrder → slots mà `publicSelect` thực sự select. Không đặt dưới đây thì
    // `projectRowFromPosting` trả null và `onlyJob` nổ trước khi kiểm tra allow-list.
    const base = row({ staffingOrders: [order(slot())] });
    const dirty: Row = {
      ...base,
      clientCompanyId: 'client-9',
      internalNotes: 'margin 18%',
      jobOpening: {
        ...(base.jobOpening as {
          staffingOrder: NonNullable<typeof base.jobOpening>['staffingOrder'];
        }),
        // hrp-p1-a1 (C-02): `hourlyRateVnd` giờ được select qua `jobOpening.staffingOrderSlot`
        // chứ không phải `staffingOrder.canonicalSlot`. Đặt field cấm tại đây cho đúng vị trí
        // mà mapper đọc.
        staffingOrderSlot: {
          ...(base.jobOpening as NonNullable<typeof base.jobOpening>)['staffingOrderSlot']!,
          hourlyRateVnd: 45_000n,
        },
        staffingOrder: {
          ...(base.jobOpening as { staffingOrder: NonNullable<typeof base.jobOpening>['staffingOrder'] })['staffingOrder'],
          budgetVnd: 900_000_000n,
          canonicalSlot: { ...slot(), hourlyRateVnd: 45_000n },
        },
      },
    };

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
