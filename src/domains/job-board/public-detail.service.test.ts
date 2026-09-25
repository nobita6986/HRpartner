/**
 * public-detail.service.test.ts — go-live-12 / RQ-12 / STEP-01 / AC-12.
 *
 * Bốn case của `RQ-12` cộng một khẳng định chéo cho `RQ-04`.
 *
 * C-02 (correction batch 1/1): canonical slot per JobPosting. Một JobPosting ↔ một JobOpening
 * ↔ một StaffingOrderSlot, nên `detailRow` nay mang đúng MỘT canonical slot (`canonicalSlot`)
 * thay vì mảng `slots`. Sibling slot không xuất hiện trong DTO chi tiết.
 *
 * PHẠM VI CÓ Ý THỨC: đây là test PROJECTION. Thứ được đo là phép biến đổi thuần trong JS — lọc
 * slot theo hai vị từ dùng chung, gộp `positions`, cộng tổng — trên đúng hình dạng dòng mà
 * `publicSelect` trả về. Nó KHÔNG và không thể khẳng định gì về tầng query engine hay RLS: mock
 * `findFirst` không tái lập được `Inconsistent query result` (bài học hotfix-01 — 1418 test xanh
 * song song với 500 cứng trên production). Lớp đó do hai test tĩnh đọc cây nguồn canh:
 * `public-select.static.test.ts` cho service và `public-detail.static.test.ts` cho trang.
 */
import { describe, expect, it, vi } from 'vitest';
import { getPublicJobDetail, getPublicJobProjection } from './public.service';

/** Mốc quá khứ cố định để `validTo` chắc chắn hết hạn ở mọi lần chạy. */
const EXPIRED_AT = new Date('2020-01-01T00:00:00.000Z');

function slot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    positionCode: 'ASSY-01',
    positionTitle: 'Cong nhan lap rap',
    slotsNeeded: 4,
    slotsFilled: 1,
    shiftStart: '07:00',
    shiftEnd: '16:00',
    validTo: null,
    workLocation: 'Site A',
    ...overrides,
  };
}

/**
 * Đúng payload của `publicSelect` SAU hrp-p1-a1: JobPosting scalars + quan hệ jobOpening → StaffingOrder → Project.
 *
 * Canonical slug thuộc JobPosting; theo DEC-05 trong TASK hrp-p1-a1 nó là `<normalized-title>-<stable-short-suffix>`,
 * không còn là `Project.code`. Trong test, slug chuẩn được viết là `lap-rap-dien-tu-bac-ninh-2026` (slug hoá của
 * `Lap rap dien tu Bac Ninh`) — đây là CÙNG thực thể nghiệp vụ mà trước đây được gọi bằng `Project.code = DA-2026-012`.
 *
 * C-02: `canonicalSlot` là slot duy nhất (linked qua `jobOpening.staffingOrderSlot`). Sibling slot không có
 * đường vào DTO. Khi `null`, mapper trả về DTO có `positions: []` (chain drift ⇒ fail closed).
 */
function detailRow(canonical: ReturnType<typeof slot> | null) {
  return {
    id: 'posting-12',
    slug: 'lap-rap-dien-tu-bac-ninh-2026',
    title: 'Lap rap dien tu Bac Ninh',
    jobOpening: {
      staffingOrder: {
        // go-live-09 / RQ-01: `createdAt` của đơn nay nằm trong `publicSelect`, nên payload thật có nó.
        status: 'OPEN',
        title: 'Tuyen cong nhan lap rap',
        description: null,
        deadlineDate: null,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        project: {
          siteAddress: 'Bac Ninh',
          // Y10.4/UI04g: denormalized company name (MKT role không đọc được client_companies do RLS)
          clientCompanyName: 'Cong ty TNHH Dien tu Kinh Bac',
        },
      },
      staffingOrderSlot: canonical,
    },
  };
}

/** Chỉ cần `jobPosting.findFirst`; cast qua đúng kiểu tham số thật, không dùng `any`. */
type PublicTx = Parameters<typeof getPublicJobDetail>[0];

function detailTx(row: unknown) {
  return { jobPosting: { findFirst: vi.fn().mockResolvedValue(row) } } as unknown as PublicTx;
}

const QC_SLOT = {
  id: 'slot-qc',
  positionCode: 'QC-01',
  positionTitle: 'Nhan vien QC',
  slotsNeeded: 2,
  slotsFilled: 0,
  shiftStart: '20:00',
  shiftEnd: '05:00',
  workLocation: 'Site B',
  validTo: null,
};

describe('getPublicJobDetail — projection của trang chi tiết công khai (RQ-12)', () => {
  it('canonical slot duy nhất: positions có đúng 1 entry, tổng khớp vị trí đó', async () => {
    // C-02: một JobPosting ↔ một canonical slot. Trang chi tiết project ĐÚNG MỘT position
    // (canonical), không phải nhiều. Sibling slot thuộc StaffingOrder nhưng JobOpening khác
    // KHÔNG xuất hiện trong DTO chi tiết này.
    const detail = await getPublicJobDetail(detailTx(detailRow(slot(QC_SLOT))), 'lap-rap-dien-tu-bac-ninh-2026');

    if (!detail) throw new Error('mong đợi DTO chi tiết khác null');
    expect(detail.positions).toHaveLength(1);
    expect(detail.positions[0].positionTitle).toBe('Nhan vien QC');
    expect(detail.positions[0].available).toBe(2);
    expect(detail.availableSlots).toBe(2);
    expect(detail.totalSlotsNeeded).toBe(2);
    expect(detail.totalSlotsFilled).toBe(0);
    // hrp-p1-a1: `jobCode` xuất phát từ `JobPosting.slug` (canonical slug), không còn từ `Project.code`.
    expect(detail.jobCode).toBe('lap-rap-dien-tu-bac-ninh-2026');
    expect(detail.siteAddress).toBe('Bac Ninh');
    expect(detail.positions[0]).toEqual({
      positionCode: 'QC-01',
      positionTitle: 'Nhan vien QC',
      shift: '20:00-05:00',
      workLocation: 'Site B',
      slotsNeeded: 2,
      slotsFilled: 0,
      available: 2,
    });
  });

  it('slug không tồn tại trả null', async () => {
    const tx = detailTx(null);

    await expect(getPublicJobDetail(tx, 'lap-rap-khong-ton-tai-2026')).resolves.toBeNull();
    expect(tx.jobPosting.findFirst).toHaveBeenCalledOnce();
  });

  // Test KHÓA `DEC-14`: link đã chia sẻ ra ngoài không được biến thành 404 chỉ vì đủ chỉ tiêu.
  // Cùng một dòng dữ liệu, đường danh sách vẫn phải ẩn việc đó — đó là bằng chứng `RQ-04` còn nguyên.
  it('canonical slot đã đủ chỉ tiêu vẫn trả DTO với availableSlots = 0, trong khi list trả null', async () => {
    // C-02: một canonical slot, một position. Khi slot đã đủ chỉ tiêu (slotsFilled === slotsNeeded),
    // detail page vẫn mở 200 OK (DEC-14) với availableSlots = 0; list page filter việc này.
    const full = () => detailRow(slot({ slotsNeeded: 3, slotsFilled: 3 }));

    const detail = await getPublicJobDetail(detailTx(full()), 'lap-rap-dien-tu-bac-ninh-2026');

    if (!detail) throw new Error('mong đợi DTO chi tiết khác null khi vẫn còn slot hợp lệ');
    expect(detail.availableSlots).toBe(0);
    expect(detail.positions).toHaveLength(1);
    expect(detail.positions.every((position) => position.available === 0)).toBe(true);
    expect(detail.totalSlotsNeeded).toBe(3);
    expect(detail.totalSlotsFilled).toBe(3);

    await expect(getPublicJobProjection(detailTx(full()), 'lap-rap-dien-tu-bac-ninh-2026')).resolves.toBeNull();
  });

  it('canonical slot đã hết hạn trả null', async () => {
    const tx = detailTx(detailRow(slot({ validTo: EXPIRED_AT })));

    await expect(getPublicJobDetail(tx, 'lap-rap-dien-tu-bac-ninh-2026')).resolves.toBeNull();
  });

  it('canonical slot null (chain drift) trả null ở cả detail và list — fail closed', async () => {
    // C-02: khi chain bị drift (`jobOpening.staffingOrderSlot` là NULL), mapper fail closed
    // và trả null cho cả detail page lẫn projection. Không bao giờ lộ DTO rỗng hay partial.
    const tx = detailTx(detailRow(null));
    await expect(getPublicJobDetail(tx, 'lap-rap-dien-tu-bac-ninh-2026')).resolves.toBeNull();
    await expect(getPublicJobProjection(tx, 'lap-rap-dien-tu-bac-ninh-2026')).resolves.toBeNull();
  });
});
