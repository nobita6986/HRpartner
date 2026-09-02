/**
 * public-card-truth.integration.test.ts — V5-go-live-05 / RQ-13 / STEP-08 / AC-12.
 *
 * LIVE evidence trên DB THẬT (`hrp_mp2_test`) cho projection card việc làm. Lane unit mock
 * `findMany`, nên nó chứng minh được phép biến đổi mà KHÔNG chứng minh được gì về query engine
 * hay RLS — bài học hotfix-01: 1418 test xanh song song với 500 cứng trên production. File này
 * đóng đúng khoảng đó: cùng một `publicSelect`, cùng `withPublicDb`, trên dòng thật.
 *
 * Bốn thứ chỉ đo được ở đây:
 *   (a) `publicSelect` chạy được dưới principal công khai — không `Inconsistent query result`.
 *   (b) `hourlyRateVnd` là cột `BigInt` THẬT có giá trị THẬT trên đúng slot mà card đọc; DTO vẫn
 *       `JSON.stringify` được và không mang con số đó (`RISK-01`/`RISK-07`). Mock không tái lập nổi.
 *   (c) Lifecycle trên dữ liệu thật: slot hết hạn, slot đã đủ chỉ tiêu, đơn `CLOSED` — cả ba bị
 *       loại khỏi summary/facet của card, `availableSlots` vẫn là tổng đúng.
 *   (d) `q`/`area`/`shift` + phân trang khớp trên dòng thật, không phải trên fixture.
 *
 * ISOLATION: `hrp_mp2_test` có dòng của các lane khác, nên mọi phép đo GLOBAL (facet) chỉ khẳng
 * định `toContain`/`not.toContain` trên chuỗi CÓ MANG `RUN`, và mọi phép đo chính xác đều bị kẹp
 * bằng `q: RUN`. `RUN` chỉ gồm `gl05` + chữ số. Ràng buộc đó SINH RA vì hàm suy nhãn ngành từng đọc
 * cả `RUN`; go-live-14 đã bỏ hàm đó nên ràng buộc thành LỊCH SỬ, nhưng giữ nguyên vì nó vẫn là hình
 * dạng token an toàn nhất cho các phép đo `toContain` ở dưới.
 *
 * Seed/teardown qua `DATABASE_URL_ADMIN` (bypass RLS); mọi phép đo hành vi CHỈ qua `DATABASE_URL`
 * (app_user_writer) và CHỈ trong `withPublicDb`. Thiếu env ⇒ self-skip, preflight in `ENV_BLOCKED`
 * — đó là BLOCKED, không phải PASS (`RQ-13`). `console.log` là CÓ CHỦ ĐÍCH: `AC-12` đòi output
 * thật (slug, mảng summary, total/nextOffset, số dòng còn lại sau cleanup), không chỉ assert xanh.
 */
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readRlsContext } from '@/src/shared/auth/rls-context';
import { PUBLIC_READ_PRINCIPAL, withPublicDb } from '@/src/shared/auth/with-public-db';
import { getPublicJobDetail, listPublicJobProjection, type PublicJobDto } from './public.service';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(
  (process.env.GOLIVE05_LIVE_CARD_TRUTH || process.env.GOLIVE04_LIVE_PUBLIC_READ) && ADMIN_URL && WRITER_URL,
);

describe.skipIf(!enabled)('V5-go-live-05 LIVE — card việc làm trên dữ liệu thật', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  /** Chỉ `gl05` + chữ số: không ký tự ngẫu nhiên nào chạm được từ khóa của phép đo nào ở dưới. */
  const RUN = `gl05-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
  const ccId = `cc-${RUN}`;
  const ELEC = { id: `prj-elec-${RUN}`, code: `GL05-ELEC-${RUN}`, orderId: `so-elec-${RUN}`, closedOrderId: `so-closed-${RUN}` };
  const WARE = { id: `prj-ware-${RUN}`, code: `GL05-WARE-${RUN}`, orderId: `so-ware-${RUN}` };
  const PRIV = { id: `prj-priv-${RUN}`, code: `GL05-PRIV-${RUN}`, orderId: `so-priv-${RUN}` };
  const ALL_PROJECTS = [ELEC.id, WARE.id, PRIV.id];
  const ALL_ORDERS = [ELEC.orderId, ELEC.closedOrderId, WARE.orderId, PRIV.orderId];

  // Địa điểm mang `RUN` để phép đo facet (mảng TOÀN CỤC) không bị dòng của lane khác làm nhiễu.
  const AT_VSIP = `KCN VSIP 1 ${RUN}`;
  const AT_YEN_PHONG = `KCN Yên Phong ${RUN}`;
  const AT_QUANG_CHAU = `KCN Quang Châu ${RUN}`; // slot HẾT HẠN  → không được xuất hiện ở đâu
  const AT_DINH_TRAM = `KCN Đình Trám ${RUN}`; // slot ĐỦ CHỈ TIÊU → không được lên card
  const AT_DON_DONG = `KCN Đơn Đã Đóng ${RUN}`; // đơn CLOSED     → không được lọt qua publicSelect
  const AT_DINH_VU = `KCN Đình Vũ ${RUN}`;

  const PAST = new Date('2020-01-01'); // `validTo` quá khứ ⇒ hết hạn ở mọi lần chạy
  const FUTURE = new Date('2027-12-31');

  type SlotSeed = {
    positionCode: string;
    positionTitle: string;
    slotsNeeded: number;
    slotsFilled: number;
    shiftStart: string;
    shiftEnd: string;
    workLocation: string;
    validTo?: Date;
    hourlyRateVnd?: bigint;
  };

  async function seedProject(
    p: { id: string; code: string; orderId: string },
    opts: {
      name: string; siteAddress: string; isPublic: boolean; orderTitle: string;
      orderDescription?: string; slots: SlotSeed[];
    },
  ): Promise<void> {
    await admin.project.create({
      data: {
        id: p.id, code: p.code, name: opts.name, clientCompanyId: ccId, status: 'ACTIVE',
        isPublic: opts.isPublic, siteAddress: opts.siteAddress, startDate: new Date('2026-01-01'),
      },
    });
    await admin.staffingOrder.create({
      data: {
        id: p.orderId, projectId: p.id, code: `SO-${p.code}`, title: opts.orderTitle,
        description: opts.orderDescription ?? null, status: 'OPEN', deadlineDate: FUTURE,
      },
    });
    for (const slot of opts.slots) {
      await admin.staffingOrderSlot.create({
        data: { staffingOrderId: p.orderId, validFrom: new Date('2026-01-01'), ...slot },
      });
    }
  }

  /** Dọn theo thứ tự FK: slot → order → project → client company. Idempotent. */
  async function cleanup(): Promise<void> {
    await admin.staffingOrderSlot.deleteMany({ where: { staffingOrderId: { in: ALL_ORDERS } } }).catch(() => {});
    await admin.staffingOrder.deleteMany({ where: { id: { in: ALL_ORDERS } } }).catch(() => {});
    await admin.project.deleteMany({ where: { id: { in: ALL_PROJECTS } } }).catch(() => {});
    await admin.clientCompany.deleteMany({ where: { id: ccId } }).catch(() => {});
  }
  /**
   * Fixture: 2 dự án public + 1 dự án nội bộ (chứng cứ âm). ELEC mang đủ ba ca lifecycle trong
   * MỘT dự án — slot còn tuyển, slot HẾT HẠN, slot ĐỦ CHỈ TIÊU — cộng một đơn `CLOSED` để chứng
   * minh cửa chặn status nằm trong chính `publicSelect` (SQL), không phải trong mapper.
   */
  beforeAll(async () => {
    await cleanup();
    await admin.clientCompany.create({ data: { id: ccId, code: `CC-${RUN}`, name: `Client ${RUN}` } });
    await seedProject(ELEC, {
      name: `Nhà máy điện tử ${RUN}`,
      siteAddress: `Bắc Ninh ${RUN}`,
      isPublic: true,
      orderTitle: `Tuyển công nhân điện tử ${RUN}`,
      // `q` KHÔNG được khớp vào đây (`keywordHaystack` cố ý không gộp `description`). Token này chỉ
      // tồn tại trong description ⇒ tìm nó mà ra dòng nào là bằng chứng ngược.
      //
      // go-live-14 — LÝ DO LỊCH SỬ của câu mô tả không dấu này, giữ lại vì nó chính là bằng chứng
      // `EV-04`: `searchableTextOf` GỘP `order.description` (văn HR nội bộ) vào văn bản mà hàm suy
      // nhãn ngành đọc, và nhánh ĐẦU TIÊN của hàm đó khớp `kho`. Một câu tiếng Việt tự nhiên như
      // "không in trên card" gập thành "khong" ⊃ "kho", nên một việc điện tử bị dán nhãn 'Kho vận'
      // — tức một lượt sửa mô tả nội bộ đổi lặng lẽ nhãn đang in cho khách ẩn danh. Hàm đó đã bị bỏ;
      // ràng buộc "tránh mọi chuỗi kho/van tai/may mac/thuc pham" nay không còn bắt buộc.
      orderDescription: `mota${RUN} chi tiet noi bo cho HR`,
      slots: [
        // BigInt THẬT trên đúng slot mà card đọc — đòn đo duy nhất cho RISK-01/RISK-07.
        { positionCode: 'GL05-ASSY', positionTitle: 'Công nhân lắp ráp', slotsNeeded: 5, slotsFilled: 1, shiftStart: '07:00', shiftEnd: '16:00', workLocation: AT_VSIP, hourlyRateVnd: 45_000n },
        { positionCode: 'GL05-QC', positionTitle: 'Kiểm tra chất lượng', slotsNeeded: 3, slotsFilled: 1, shiftStart: '14:00', shiftEnd: '22:00', workLocation: AT_YEN_PHONG },
        { positionCode: 'GL05-WELD', positionTitle: 'Thợ hàn', slotsNeeded: 4, slotsFilled: 0, shiftStart: '07:00', shiftEnd: '16:00', workLocation: AT_QUANG_CHAU, validTo: PAST },
        { positionCode: 'GL05-FORK', positionTitle: 'Lái xe nâng', slotsNeeded: 2, slotsFilled: 2, shiftStart: '18:00', shiftEnd: '02:00', workLocation: AT_DINH_TRAM },
      ],
    });
    await admin.staffingOrder.create({
      data: { id: ELEC.closedOrderId, projectId: ELEC.id, code: `SO-CLOSED-${RUN}`, title: `Đơn đã đóng ${RUN}`, status: 'CLOSED', deadlineDate: FUTURE },
    });
    await admin.staffingOrderSlot.create({
      data: { staffingOrderId: ELEC.closedOrderId, positionCode: 'GL05-MAINT', positionTitle: 'Bảo trì thiết bị', slotsNeeded: 9, slotsFilled: 0, shiftStart: '07:00', shiftEnd: '16:00', validFrom: new Date('2026-01-01'), workLocation: AT_DON_DONG },
    });
    await seedProject(WARE, {
      name: `Trung tâm kho vận ${RUN}`, siteAddress: `Hải Phòng ${RUN}`, isPublic: true,
      orderTitle: `Tuyển nhân viên kho ${RUN}`,
      slots: [{ positionCode: 'GL05-WH', positionTitle: 'Nhân viên kho', slotsNeeded: 4, slotsFilled: 0, shiftStart: '06:00', shiftEnd: '14:00', workLocation: AT_DINH_VU }],
    });
    await seedProject(PRIV, {
      name: `Dự án nội bộ ${RUN}`, siteAddress: `Hà Nội ${RUN}`, isPublic: false,
      orderTitle: `Tuyển bảo vệ nội bộ ${RUN}`,
      slots: [{ positionCode: 'GL05-SEC', positionTitle: 'Bảo vệ nội bộ', slotsNeeded: 7, slotsFilled: 0, shiftStart: '08:00', shiftEnd: '17:00', workLocation: `KCN Nội Bộ ${RUN}` }],
    });
  }, 60_000);

  afterAll(async () => {
    try {
      await cleanup();
      const left = await admin.project.count({ where: { id: { in: ALL_PROJECTS } } });
      const leftSlots = await admin.staffingOrderSlot.count({ where: { staffingOrderId: { in: ALL_ORDERS } } });
      console.log(`[gl05 cleanup] projects còn lại=${left} slots còn lại=${leftSlots} (RUN=${RUN})`);
      expect(left + leftSlots).toBe(0);
    } finally {
      await admin.$disconnect();
      await writer.$disconnect();
    }
  }, 60_000);
  type ListOpts = NonNullable<Parameters<typeof listPublicJobProjection>[1]>;

  /** Mọi phép đo hành vi qua ĐÚNG cửa công khai: `app_user_writer` + `withPublicDb`, kẹp bằng `RUN`. */
  async function listRun(extra: ListOpts = {}) {
    return withPublicDb(writer, (tx) => listPublicJobProjection(tx, { q: RUN, limit: 50, ...extra }));
  }

  async function cardOf(slug: string): Promise<PublicJobDto> {
    const { jobs } = await listRun();
    const job = jobs.find((candidate) => candidate.slug === slug);
    expect(job, `card của ${slug} phải có trong projection`).toBeDefined();
    return job as PublicJobDto;
  }

  it('AC-12 — publicSelect chạy dưới principal MKT, đúng hai dự án public lọt qua', async () => {
    const { guc, result } = await withPublicDb(writer, async (tx) => ({
      guc: await readRlsContext(tx),
      result: await listPublicJobProjection(tx, { q: RUN, limit: 50 }),
    }));
    // Không `Inconsistent query result`: nếu `publicSelect` chạm bảng bị RLS che thì lệnh trên đã
    // ném TRƯỚC mọi assert dưới đây — đó là lớp mà mock `findMany` của lane unit không đo được.
    expect(guc.role).toBe(PUBLIC_READ_PRINCIPAL.role);
    expect(guc.user_id).toBe(PUBLIC_READ_PRINCIPAL.userId);
    const slugs = result.jobs.map((job) => job.slug).sort();
    console.log(`[gl05 list] total=${result.total} nextOffset=${result.nextOffset} slugs=${JSON.stringify(slugs)}`);
    expect(slugs).toEqual([ELEC.code, WARE.code].sort());
    expect(slugs).not.toContain(PRIV.code);
    expect(result.total).toBe(2);
    expect(result.nextOffset).toBeNull();
  }, 30_000);

  it('AC-02/RQ-04 — ba mảng summary và availableSlots đúng trên dòng thật', async () => {
    const job = await cardOf(ELEC.code);
    console.log(
      `[gl05 card ${job.slug}] positionTitles=${JSON.stringify(job.positionTitles)} locations=${JSON.stringify(job.locations)}` +
        ` shifts=${JSON.stringify(job.shifts)} availableSlots=${job.availableSlots} shiftType=${job.shiftType}`,
    );
    expect(job.positionTitles).toEqual(['Công nhân lắp ráp', 'Kiểm tra chất lượng']);
    expect(job.locations).toEqual([AT_VSIP, AT_YEN_PHONG]);
    expect(job.shifts).toEqual(['07:00-16:00', '14:00-22:00']);
    // 4 (ASSY) + 2 (QC) + 0 (FORK đã đủ) ; WELD hết hạn không tính.
    expect(job.availableSlots).toBe(6);
    // DEC-03: field đơn là PHẦN TỬ ĐẦU của chính mảng đã sort, không phải chữ của slot đầu theo DB.
    expect(job.position).toBe(job.positionTitles[0]);
    expect(job.shift).toBe(job.shifts[0]);
    expect(job.location).toBe(job.locations[0]);
    // go-live-14 / RQ-02, DEC-05 — khẳng định cũ (nhãn 'Dien tu' trên dòng thật) đã ĐỔI DẤU thành
    // phủ định dưới đây, và đoạn nội suy nhãn đó trong `console.log` phía trên cũng đã bỏ. GIỚI HẠN
    // PHÉP ĐO: file này nằm trong `INTEGRATION_TEST_FILES` nên KHÔNG chạy ở lane `npm run test:unit`
    // — nó không xuất hiện trong con số ĐỎ/XANH nào của lane đó, chỉ được typecheck. Ghi rõ trong
    // HANDOFF để Tier 3 không đọc con số của lane unit như thể đã bao phủ file này.
    expect(job).not.toHaveProperty('industry');
    expect(job.shiftType).toBe('ca_ngay');
    expect(job.jobType).toBe('toan_thoi_gian');
    expect(job.statusLabel).toBe('Đang tuyển');
    expect(job.deadline?.startsWith('2027-12-31')).toBe(true);
  }, 30_000);
  it('DEC-05 — slot hết hạn, slot đủ chỉ tiêu và đơn CLOSED đều không lên card', async () => {
    const job = await cardOf(ELEC.code);
    const serialized = JSON.stringify(job);
    // 'Thợ hàn' = slot `validTo` quá khứ; 'Lái xe nâng' = slot đã đủ chỉ tiêu (kíp ĐÊM — để nó lại
    // thì `classifyShift` trả null và cả việc rơi khỏi bộ lọc "ca ngày"); 'Bảo trì thiết bị' thuộc
    // đơn `CLOSED`, bị chặn ngay trong `publicSelect` nên không tới mapper.
    for (const ghost of ['Thợ hàn', 'Lái xe nâng', 'Bảo trì thiết bị']) {
      expect(serialized, ghost).not.toContain(ghost);
    }
    for (const ghost of [AT_QUANG_CHAU, AT_DINH_TRAM, AT_DON_DONG]) {
      expect(job.locations, ghost).not.toContain(ghost);
    }
    expect(job.shifts).not.toContain('18:00-02:00');
  }, 30_000);

  it('AC-01/RISK-01/RISK-07 — hourlyRateVnd là BigInt THẬT nhưng DTO chỉ có 18 khóa allow-list', async () => {
    // Bằng chứng cột thật: đọc bằng admin để chắc con số nằm trên ĐÚNG slot mà card đọc.
    const raw = await admin.staffingOrderSlot.findFirst({
      where: { staffingOrderId: ELEC.orderId, positionTitle: 'Công nhân lắp ráp' },
      select: { hourlyRateVnd: true },
    });
    console.log(`[gl05 bigint] hourlyRateVnd=${raw?.hourlyRateVnd} typeof=${typeof raw?.hourlyRateVnd}`);
    expect(typeof raw?.hourlyRateVnd).toBe('bigint');
    expect(raw?.hourlyRateVnd).toBe(45_000n);

    const job = await cardOf(ELEC.code);
    // RISK-07: một khóa BigInt lọt vào DTO làm `JSON.stringify` NÉM ⇒ chết cả route, không chỉ rò rỉ.
    const serialized = JSON.stringify(job);
    // go-live-14 / RQ-02, RQ-05: 15 khóa xuống 14. Đây là allow-list khóa DTO thứ NHẤT trong hai bản;
    // bản thứ hai ở `public-card-truth.test.ts`. Sót một bản là hàng rào hở.
    // go-live-09 / RQ-02, RQ-22: 14 lên 18 — thêm ĐÚNG bốn tên của `RQ-02`, `toEqual` giữ nguyên nên
    // phép so vẫn là so tập khóa CHÍNH XÁC trên DB THẬT.
    expect(Object.keys(job).sort()).toEqual(
      ['availableSlots', 'deadline', 'id', 'jobType', 'location', 'locations', 'position',
        'positionTitles', 'postedAt', 'salaryMaxVnd', 'salaryMinVnd', 'shift', 'shiftType',
        'shifts', 'slug', 'statusLabel', 'title', 'urgency'].sort(),
    );
    expect(job).not.toHaveProperty('industry');
    /**
     * go-live-09 / DEC-19 — hai chuỗi `'45000'` và `'salary'` RA KHỎI vòng cấm, và ĐÚNG LƯỢT NÀY hai
     * khẳng định mạnh hơn vào thay. Lý do bỏ hẹp và có căn cứ: chúng cấm chính con số nay đã được công
     * bố có cơ sở (`EV-03`/`EV-04`: `hourlyRateVnd` là lương giờ của NGƯỜI LAO ĐỘNG, còn giá bán cho
     * khách nằm ở `client_rate_cards`), và `'salary'` là tiền tố của chính tên khoá công khai mới.
     *
     * Siết thứ nhất: con số công bố bằng ĐÚNG giá trị cột vừa đọc bằng admin ở trên. Vòng cấm cũ chỉ
     * nói "không có 45000 ở đâu cả" — một bản cài đặt trả `null` cho mọi mức lương cũng thoả nó. Hai
     * dòng dưới thì không thể thoả bằng dữ liệu vắng.
     */
    expect(job.salaryMinVnd).toBe(Number(raw?.hourlyRateVnd));
    expect(job.salaryMaxVnd).toBe(Number(raw?.hourlyRateVnd));
    expect(serialized).toContain('45000');
    /**
     * Siết thứ hai: vòng cấm giữ nguyên bốn tên nội bộ cũ và THÊM bốn tên của bề mặt thương mại, tức
     * mọi cái tên mà một giá `client_rate_cards` có thể mượn để đi ra ngoài. Cùng với `toEqual` 18 khoá
     * ở trên, một con số giá bán không còn chỗ nào để nằm: hoặc nó mang một trong các tên này (bị vòng
     * dưới bắt), hoặc nó là khoá thứ 19 (bị `toEqual` bắt).
     * GIỚI HẠN PHÉP ĐO, ghi trong HANDOFF: seed của file này không tạo dòng `client_rate_cards` nào,
     * nên lằn ranh "không giá bán nào lọt ra" được canh bằng TÊN cộng tập khoá chính xác, chứ không
     * bằng một giá trị đã seed.
     */
    for (const forbidden of ['hourlyRateVnd', 'clientCompanyId', ccId, 'budgetVnd', 'internalNotes', 'rateCard', 'price', 'billing', 'margin']) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
  }, 30_000);

  it('AC-07/DEC-08 — facet dựng từ toàn tập public hợp lệ và KHÔNG co lại theo filter', async () => {
    const before = await listRun();
    const after = await listRun({ area: AT_DINH_VU });
    console.log(
      `[gl05 facets] keys=${JSON.stringify(Object.keys(before.facets).sort())}` +
        ` areas(RUN)=${JSON.stringify(before.facets.areas.filter((a) => a.includes(RUN)))} total(before)=${before.total} total(area=dinhVu)=${after.total}`,
    );
    // go-live-05 v1.2 / DEC-13, RQ-18: payload facets mang ĐÚNG hai khóa — không facet ngành nghề. Đo
    // trên DB THẬT: nếu service nối lại một khóa suy diễn thì nó hiện ra ở đây chứ không chỉ ở fixture.
    expect(Object.keys(before.facets).sort()).toEqual(['areas', 'shifts']);
    for (const area of [AT_VSIP, AT_YEN_PHONG, AT_DINH_VU]) expect(before.facets.areas, area).toContain(area);
    for (const ghost of [AT_QUANG_CHAU, AT_DINH_TRAM, AT_DON_DONG, `KCN Nội Bộ ${RUN}`]) {
      expect(before.facets.areas, ghost).not.toContain(ghost);
    }
    expect(before.facets.shifts).toContain('07:00-16:00');
    // Cùng một `q`, chỉ thêm `area`: tập kết quả co lại, facet thì KHÔNG.
    expect(after.total).toBe(1);
    expect(after.jobs.map((job) => job.slug)).toEqual([WARE.code]);
    expect(after.facets).toEqual(before.facets);
  }, 30_000);
  it('AC-12/go-live-12 DEC-14 — trang chi tiết kể MỌI vị trí còn hiệu lực, card chỉ kể vị trí còn tuyển', async () => {
    const detail = await withPublicDb(writer, (tx) => getPublicJobDetail(tx, ELEC.code));
    const card = await cardOf(ELEC.code);
    expect(detail).not.toBeNull();
    console.log(
      `[gl05 detail ${detail?.slug}] positions=${JSON.stringify(detail?.positions.map((p) => [p.positionCode, p.available]))}` +
        ` availableSlots=${detail?.availableSlots} needed=${detail?.totalSlotsNeeded} filled=${detail?.totalSlotsFilled} shiftType=${detail?.shiftType}`,
    );
    // Slot ĐỦ CHỈ TIÊU vẫn có mặt (available 0); slot HẾT HẠN thì không — hai vị từ khác nhau.
    expect(detail?.positions.map((position) => position.positionCode)).toEqual(['GL05-ASSY', 'GL05-QC', 'GL05-FORK']);
    expect(detail?.positions.map((position) => position.available)).toEqual([4, 2, 0]);
    expect(detail?.totalSlotsNeeded).toBe(10);
    expect(detail?.totalSlotsFilled).toBe(4);
    // Cùng một công thức chỗ trống ở hai bề mặt ⇒ số trên card và số trên trang chi tiết bằng nhau.
    expect(detail?.availableSlots).toBe(card.availableSlots);
    // ĐỘ LỆCH CÓ Ý THỨC, đo được: tập slot của detail rộng hơn nên kíp đêm đã đủ người kéo
    // `shiftType` về null, còn card vẫn `ca_ngay`. Ghi trong HANDOFF.
    expect(detail?.positionTitles).toEqual(['Công nhân lắp ráp', 'Kiểm tra chất lượng', 'Lái xe nâng']);
    expect(detail?.shiftType).toBeNull();
    expect(card.shiftType).toBe('ca_ngay');
    expect(detail?.statusLabel).toBe('Đang tuyển');
    /**
     * go-live-09 / RQ-24, DEC-19 — lần xuất hiện THỨ BA của `'45000'`, đúng chỗ `EV-21` đã dự liệu.
     * `RQ-24` buộc `toDetailDto` sinh đủ bốn field của `RQ-02`, nên con số này nay CÓ MẶT trong payload
     * chi tiết một cách có căn cứ và khẳng định phủ định cũ trở thành bất khả thoả. Đổi lại là phép đo
     * MẠNH HƠN: đo trên DB THẬT rằng hai mapper nói CÙNG một sự thật — thứ mà lane unit chỉ đo được
     * trên mock — cộng vòng cấm tên nội bộ và danh tính Client vẫn còn nguyên trên payload chi tiết.
     */
    const detailJson = JSON.stringify(detail);
    expect(detail?.salaryMinVnd).toBe(card.salaryMinVnd);
    expect(detail?.salaryMaxVnd).toBe(card.salaryMaxVnd);
    expect(detail?.urgency).toBe(card.urgency);
    expect(detail?.postedAt).toBe(card.postedAt);
    expect(detailJson).toContain('45000');
    for (const forbidden of ['hourlyRateVnd', 'clientCompanyId', ccId, 'budgetVnd', 'internalNotes', 'rateCard', 'price', 'billing', 'margin']) {
      expect(detailJson, forbidden).not.toContain(forbidden);
    }
  }, 30_000);

  it('AC-12 — dự án nội bộ không có card, không facet, và trang chi tiết trả null', async () => {
    const detail = await withPublicDb(writer, (tx) => getPublicJobDetail(tx, PRIV.code));
    console.log(`[gl05 non-public] getPublicJobDetail(${PRIV.code}) => ${detail === null ? 'null' : 'CÓ DỮ LIỆU'}`);
    expect(detail).toBeNull();
  }, 30_000);

  it('AC-05 — q fold dấu, không khớp description; area đọc tập slot SAU lifecycle', async () => {
    const folded = await listRun({ q: `nha may dien tu ${RUN}` });
    const byDescription = await listRun({ q: `mota${RUN}` });
    const byFullSlot = await listRun({ q: `Lái xe nâng ${RUN}` });
    console.log(
      `[gl05 q] fold=${JSON.stringify(folded.jobs.map((j) => j.slug))} description=${byDescription.total} slotDaDu=${byFullSlot.total}`,
    );
    // Query không dấu tìm ra dữ liệu CÓ dấu — khác biệt duy nhất so với `contains mode:insensitive`.
    expect(folded.jobs.map((job) => job.slug)).toEqual([ELEC.code]);
    // `description` cố ý không nằm trong haystack: khớp vào đoạn văn không in trên card thì ứng viên
    // không giải thích được vì sao kết quả đó xuất hiện.
    expect(byDescription.total).toBe(0);
    // Vị trí của slot ĐÃ ĐỦ CHỈ TIÊU không tìm được, vì haystack đọc `job.positionTitles` của card.
    expect(byFullSlot.total).toBe(0);

    const byArea = await listRun({ area: AT_YEN_PHONG });
    const byExpiredArea = await listRun({ area: AT_QUANG_CHAU });
    const byWareArea = await listRun({ area: AT_DINH_VU });
    console.log(`[gl05 area] yenPhong=${JSON.stringify(byArea.jobs.map((j) => j.slug))} quangChau=${byExpiredArea.total} dinhVu=${JSON.stringify(byWareArea.jobs.map((j) => j.slug))}`);
    expect(byArea.jobs.map((job) => job.slug)).toEqual([ELEC.code]);
    expect(byExpiredArea.total).toBe(0);
    expect(byWareArea.jobs.map((job) => job.slug)).toEqual([WARE.code]);
  }, 30_000);
  it('AC-06 — shift khớp cả nhãn KHÔNG đứng đầu, nhãn của slot đã đủ chỉ tiêu thì không', async () => {
    // '14:00-22:00' là phần tử THỨ HAI của `shifts`: đây đúng là giá trị mà facet chào ra cho UI.
    const bySecondShift = await listRun({ shift: '14:00-22:00' });
    const byNightShift = await listRun({ shift: '18:00-02:00' });
    console.log(
      `[gl05 filter] shift(14:00-22:00)=${JSON.stringify(bySecondShift.jobs.map((j) => j.slug))} shift(18:00-02:00)=${byNightShift.total}`,
    );
    expect(bySecondShift.jobs.map((job) => job.slug)).toEqual([ELEC.code]);
    // Kíp của slot đã đủ chỉ tiêu không còn là nhãn nào của card ⇒ lọc theo nó ra rỗng.
    expect(byNightShift.total).toBe(0);
  }, 30_000);

  it('AC-04 — total/nextOffset và hai trang thật khớp nhau, limit bị kẹp [1,50]', async () => {
    const first = await listRun({ limit: 1, offset: 0 });
    const second = await listRun({ limit: 1, offset: 1 });
    const past = await listRun({ limit: 1, offset: 2 });
    const clamped = await listRun({ limit: 0 });
    const wide = await listRun({ limit: 999, offset: -5 });
    console.log(
      `[gl05 page] p1=${JSON.stringify(first.jobs.map((j) => j.slug))} next=${first.nextOffset}` +
        ` p2=${JSON.stringify(second.jobs.map((j) => j.slug))} next=${second.nextOffset}` +
        ` past(offset=2)=${past.jobs.length} total=${past.total}`,
    );
    expect(first.total).toBe(2);
    expect(first.jobs).toHaveLength(1);
    expect(first.nextOffset).toBe(1);
    expect(second.jobs).toHaveLength(1);
    expect(second.nextOffset).toBeNull();
    // Hai trang RỜI NHAU và hợp lại đúng bằng toàn tập — không dòng nào lặp, không dòng nào rơi.
    const paged = [...first.jobs, ...second.jobs].map((job) => job.slug).sort();
    expect(paged).toEqual([ELEC.code, WARE.code].sort());
    // Vượt cuối danh sách: trang rỗng nhưng `total` vẫn là tổng thật, `nextOffset` null.
    expect(past.jobs).toEqual([]);
    expect(past.total).toBe(2);
    expect(past.nextOffset).toBeNull();
    expect(clamped.jobs).toHaveLength(1); // limit 0 → 1
    expect(wide.jobs).toHaveLength(2); // limit 999 → 50, offset -5 → 0
    expect(wide.nextOffset).toBeNull();
  }, 30_000);
});
