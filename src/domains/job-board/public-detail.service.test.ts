/**
 * public-detail.service.test.ts — go-live-12 / RQ-12 / STEP-01 / AC-12.
 *
 * Bốn case của `RQ-12` cộng một khẳng định chéo cho `RQ-04`.
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

/** Đúng payload của `publicSelect`: scalar của `Project` cộng nhánh `staffingOrders`, không quan hệ. */
function detailRow(slots: Array<ReturnType<typeof slot>>) {
  return {
    id: 'project-12',
    code: 'DA-2026-012',
    name: 'Lap rap dien tu Bac Ninh',
    siteAddress: 'Bac Ninh',
    staffingOrders: [
      { status: 'OPEN', title: 'Tuyen cong nhan lap rap', description: null, deadlineDate: null, slots },
    ],
  };
}

/** Chỉ cần `project.findFirst`; cast qua đúng kiểu tham số thật, không dùng `any`. */
type PublicTx = Parameters<typeof getPublicJobDetail>[0];

function detailTx(row: unknown) {
  return { project: { findFirst: vi.fn().mockResolvedValue(row) } } as unknown as PublicTx;
}

const QC_SLOT = {
  positionCode: 'QC-01',
  positionTitle: 'Nhan vien QC',
  slotsNeeded: 2,
  slotsFilled: 0,
  shiftStart: '20:00',
  shiftEnd: '05:00',
  workLocation: 'Site B',
};

describe('getPublicJobDetail — projection của trang chi tiết công khai (RQ-12)', () => {
  it('dự án nhiều slot trả positions dài hơn 1, tổng khớp từng vị trí', async () => {
    const detail = await getPublicJobDetail(detailTx(detailRow([slot(), slot(QC_SLOT)])), 'DA-2026-012');

    if (!detail) throw new Error('mong đợi DTO chi tiết khác null');
    expect(detail.positions.length).toBeGreaterThan(1);
    expect(detail.positions.map((position) => position.positionTitle)).toEqual(['Cong nhan lap rap', 'Nhan vien QC']);
    expect(detail.positions.map((position) => position.available)).toEqual([3, 2]);
    expect(detail.availableSlots).toBe(5);
    expect(detail.totalSlotsNeeded).toBe(6);
    expect(detail.totalSlotsFilled).toBe(1);
    expect(detail.jobCode).toBe('DA-2026-012');
    expect(detail.siteAddress).toBe('Bac Ninh');
    expect(detail.positions[1]).toEqual({
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

    await expect(getPublicJobDetail(tx, 'DA-KHONG-TON-TAI-999')).resolves.toBeNull();
    expect(tx.project.findFirst).toHaveBeenCalledOnce();
  });

  // Test KHÓA `DEC-14`: link đã chia sẻ ra ngoài không được biến thành 404 chỉ vì đủ chỉ tiêu.
  // Cùng một dòng dữ liệu, đường danh sách vẫn phải ẩn việc đó — đó là bằng chứng `RQ-04` còn nguyên.
  it('mọi slot đã đủ chỉ tiêu vẫn trả DTO với availableSlots bằng 0, trong khi list vẫn trả null', async () => {
    const full = () => detailRow([
      slot({ slotsNeeded: 3, slotsFilled: 3 }),
      slot({ ...QC_SLOT, slotsFilled: 2 }),
    ]);

    const detail = await getPublicJobDetail(detailTx(full()), 'DA-2026-012');

    if (!detail) throw new Error('mong đợi DTO chi tiết khác null khi vẫn còn slot hợp lệ');
    expect(detail.availableSlots).toBe(0);
    expect(detail.positions).toHaveLength(2);
    expect(detail.positions.every((position) => position.available === 0)).toBe(true);
    expect(detail.totalSlotsNeeded).toBe(5);
    expect(detail.totalSlotsFilled).toBe(5);

    await expect(getPublicJobProjection(detailTx(full()), 'DA-2026-012')).resolves.toBeNull();
  });

  it('mọi slot đã hết hạn trả null', async () => {
    const tx = detailTx(detailRow([
      slot({ validTo: EXPIRED_AT }),
      slot({ ...QC_SLOT, validTo: EXPIRED_AT }),
    ]));

    await expect(getPublicJobDetail(tx, 'DA-2026-012')).resolves.toBeNull();
  });
});
