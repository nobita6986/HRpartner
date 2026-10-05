/**
 * order.service unit tests — Phase 4 slice 4A STEP-02 (RQ-01).
 *
 * DEC-16: unit test dùng Prisma mock in-memory (không cần DB thật).
 * Pattern theo ticket.service.test.ts Phase 3.
 *
 * Test cases:
 * 1. createStaffingOrder — tạo order + slots, slotsFilled = 0
 * 2. listStaffingOrders — ADMIN thấy all, PM chỉ project của mình
 * 3. updateStatus — valid/invalid transitions
 * 4. slot counter — slotsFilled denormalized đúng O9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

type MockFn = ReturnType<typeof vi.fn>;
type MockTx = {
  staffingOrder: {
    create: MockFn;
    findMany: MockFn;
    findUnique: MockFn;
    findFirst: MockFn;
    update: MockFn;
    delete: MockFn;
    count: MockFn;
  };
  staffingOrderSlot: {
    create: MockFn;
    update: MockFn;
    delete: MockFn;
    deleteMany: MockFn;
  };
  outboxEvent: { create: MockFn };
  $queryRawUnsafe: MockFn;
  $executeRawUnsafe: MockFn;  // STEP-03: advisory lock
};

function makeMockTx(overrides?: Partial<MockTx>): MockTx {
  return {
    staffingOrder: {
      create: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    staffingOrderSlot: {
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({ id: 'ev-001', status: 'PENDING' }),
    },
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ max_num: null }]),
    $executeRawUnsafe: vi.fn().mockResolvedValue([]),  // STEP-03: advisory lock
    ...overrides,
  };
}

const ADMIN_CTX = { userId: 'admin-001', role: 'ADMIN' as const };
const PM_CTX = { userId: 'pm-001', role: 'PM' as const };
const SALE_CTX = { userId: 'sale-001', role: 'SALE' as const };
const WORKER_CTX = { userId: 'wk-001', role: 'WORKER' as const };
const HR_STAFF_CTX = { userId: 'hrstaff-001', role: 'HR_STAFF' as const };

// ─── Import after mock setup ─────────────────────────────────────────────────
// Dynamic import để tránh module-level evaluation trước mock.
import {
  createStaffingOrder,
  listStaffingOrders,
  getStaffingOrder,
  updateStaffingOrderStatus,
  updateStaffingOrder,
  deleteStaffingOrder,
  StaffingOrderServiceError,
} from './order.service';
import { buildStaffingOrderScope } from '@/src/shared/auth/scopes/staffing.scope';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('order.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('buildStaffingOrderScope', () => {
    it('ADMIN → empty where (all orders)', () => {
      const where = buildStaffingOrderScope(ADMIN_CTX);
      expect(where).toEqual({});
    });

    it('WORKER → deny-by-default', () => {
      const where = buildStaffingOrderScope(WORKER_CTX);
      expect(where).toEqual({ id: '__IMPOSSIBLE__' });
    });
  });

  describe('createStaffingOrder', () => {
    it('tạo order với 2 slots, slotsFilled = 0', async () => {
      const mockOrder = {
        id: 'order-001',
        code: 'SO-00001',
        projectId: 'prj-001',
        title: 'Tuyển 5 thợ điện',
        status: 'OPEN',
        slots: [
          { id: 'slot-001', slotsNeeded: 3, slotsFilled: 0 },
          { id: 'slot-002', slotsNeeded: 2, slotsFilled: 0 },
        ],
      };
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ max_num: null }]),
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          create: vi.fn().mockResolvedValue(mockOrder),
        },
        $executeRawUnsafe: vi.fn().mockResolvedValue([]),  // STEP-03 advisory lock
      });

      const result = await createStaffingOrder(tx as any, ADMIN_CTX, {
        projectId: 'prj-001',
        title: 'Tuyển 5 thợ điện',
        slots: [
          { positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 3, validFrom: '2026-09-01' },
          { positionCode: 'WELD', positionTitle: 'Thợ hàn', slotsNeeded: 2, validFrom: '2026-09-01' },
        ],
      });

      expect(tx.staffingOrder.create).toHaveBeenCalledOnce();
      expect(result.slots).toHaveLength(2);
      expect(result.slots.every(s => s.slotsFilled === 0)).toBe(true);
      expect(result.status).toBe('OPEN');
    });

    it('gọi 2 lần → 2 mã khác nhau', async () => {
      let counter = 0;
      const tx = makeMockTx({
        $queryRawUnsafe: vi.fn().mockImplementation(() =>
          Promise.resolve([{ max_num: BigInt(counter++) }])
        ),
        $executeRawUnsafe: vi.fn().mockResolvedValue([]),  // STEP-03 advisory lock
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          create: vi.fn().mockImplementation(() =>
            Promise.resolve({
              id: `o-${counter}`,
              code: `SO-${String(counter).padStart(5, '0')}`,
              status: 'OPEN',
              slots: [],
            })
          ),
        },
      });

      await createStaffingOrder(tx as any, ADMIN_CTX, {
        projectId: 'p', title: 't', slots: [{ positionCode: 'A', positionTitle: 'A', slotsNeeded: 1, validFrom: '2026-09-01' }],
      });
      await createStaffingOrder(tx as any, ADMIN_CTX, {
        projectId: 'p', title: 't', slots: [{ positionCode: 'A', positionTitle: 'A', slotsNeeded: 1, validFrom: '2026-09-01' }],
      });

      const calls = tx.staffingOrder.create.mock.calls;
      expect(calls[0][0]?.data?.code).toBe('SO-00001');
      expect(calls[1][0]?.data?.code).toBe('SO-00002');
    });
  });

  describe('updateStaffingOrderStatus', () => {
    it('OPEN → CLOSING_SOON thành công', async () => {
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findUnique: vi.fn().mockResolvedValue({ id: 'o1', status: 'OPEN' }),
          update: vi.fn().mockResolvedValue({ id: 'o1', status: 'CLOSING_SOON' }),
        },
        outboxEvent: {
          create: vi.fn().mockResolvedValue({ id: 'ev-001', status: 'PENDING' }),
        },
      });

      const result = await updateStaffingOrderStatus(tx as any, ADMIN_CTX, 'o1', 'CLOSING_SOON');
      expect(tx.staffingOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CLOSING_SOON' }) })
      );
    });

    it('CLOSED → OPEN thất bại (terminal)', async () => {
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findUnique: vi.fn().mockResolvedValue({ id: 'o1', status: 'CLOSED' }),
        },
      });

      await expect(
        updateStaffingOrderStatus(tx as any, ADMIN_CTX, 'o1', 'OPEN'),
      ).rejects.toThrow(StaffingOrderServiceError);
    });

    it('WORKER gọi → PERMISSION_DENIED', async () => {
      const tx = makeMockTx();
      await expect(
        updateStaffingOrderStatus(tx as any, WORKER_CTX, 'o1', 'CLOSED'),
      ).rejects.toThrow(StaffingOrderServiceError);
    });
  });

  describe('listStaffingOrders', () => {
    it('ADMIN thấy tất cả orders', async () => {
      const orders = [
        { id: 'o1', title: 'Order 1', status: 'OPEN' },
        { id: 'o2', title: 'Order 2', status: 'OPEN' },
      ];
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findMany: vi.fn().mockResolvedValue(orders),
          count: vi.fn().mockResolvedValue(2),
        },
      });

      const { rows, total } = await listStaffingOrders(tx as any, ADMIN_CTX);
      expect(rows).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('tìm theo status', async () => {
      const tx = makeMockTx();
      await listStaffingOrders(tx as any, ADMIN_CTX, { status: 'CLOSED' });
      expect(tx.staffingOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'CLOSED' }) })
      );
    });
  });

  describe('getStaffingOrder', () => {
    it('order không tồn tại → NOT_FOUND', async () => {
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });

      await expect(getStaffingOrder(tx as any, ADMIN_CTX, 'fake-id')).rejects.toThrow(
        StaffingOrderServiceError,
      );
    });

    it('order tồn tại → trả về kèm slots', async () => {
      const order = {
        id: 'o1', title: 'Test', status: 'OPEN',
        project: { id: 'p1', name: 'Project A', code: 'PRJ-A' },
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 0 },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(order),
        },
      });

      const result = await getStaffingOrder(tx as any, ADMIN_CTX, 'o1');
      expect(result.id).toBe('o1');
      expect(result.slots).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // t1a-staffing-order-management — updateStaffingOrder / deleteStaffingOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateStaffingOrder', () => {
    it('sửa title + description + deadline thành công (ADMIN)', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 0,
            _count: { submissions: 0, assignments: 0 },
            jobOpening: null, neoJobOpenings: [] },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
          update: vi.fn().mockResolvedValue({ id: 'o1' }),
        },
      });
      const result = await updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
        title: 'New title',
        description: 'New desc',
        deadlineDate: '2026-12-31',
      });
      expect(result.updated).toBe(true);
      expect(tx.staffingOrder.update).toHaveBeenCalledOnce();
    });

    it('SALE cũng có quyền sửa (cùng tập với create/status)', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await updateStaffingOrder(tx as any, SALE_CTX, 'o1', { title: 'x' });
      expect(tx.staffingOrder.update).toHaveBeenCalledOnce();
    });

    it('HR_STAFF bị từ chối (PERMISSION_DENIED)', async () => {
      const tx = makeMockTx();
      await expect(
        updateStaffingOrder(tx as any, HR_STAFF_CTX, 'o1', { title: 'x' }),
      ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    });

    it('PM bị từ chối (PERMISSION_DENIED)', async () => {
      const tx = makeMockTx();
      await expect(
        updateStaffingOrder(tx as any, PM_CTX, 'o1', { title: 'x' }),
      ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    });

    it('slotsNeeded < slotsFilled → ORDER_NOT_EDITABLE', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 2,
            _count: { submissions: 0, assignments: 0 },
            jobOpening: null, neoJobOpenings: [] },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
          slots: [{ id: 's1', positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 1, validFrom: '2026-10-01' }],
        }),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_EDITABLE' });
    });

    it('slot có JobOpening → _delete=true bị SLOT_HAS_DEPENDENCIES', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 0,
            _count: { submissions: 0, assignments: 0 },
            jobOpening: { id: 'jo-1' }, neoJobOpenings: [] },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
          slots: [{ id: 's1', positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 3, validFrom: '2026-10-01', _delete: true }],
        }),
      ).rejects.toMatchObject({ code: 'SLOT_HAS_DEPENDENCIES' });
    });

    it('slot có submissions → _delete=true bị SLOT_HAS_DEPENDENCIES', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 1,
            _count: { submissions: 1, assignments: 0 },
            jobOpening: null, neoJobOpenings: [] },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
          slots: [{ id: 's1', positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 3, validFrom: '2026-10-01', _delete: true }],
        }),
      ).rejects.toMatchObject({ code: 'SLOT_HAS_DEPENDENCIES' });
    });

    it('slot không phụ thuộc có thể xoá', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN',
        slots: [
          { id: 's1', positionTitle: 'Thợ điện', slotsNeeded: 3, slotsFilled: 0,
            _count: { submissions: 0, assignments: 0 },
            jobOpening: null, neoJobOpenings: [] },
        ],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
        slots: [{ id: 's1', positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 3, validFrom: '2026-10-01', _delete: true }],
      });
      expect(tx.staffingOrderSlot.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('append slot mới (không id) thành công', async () => {
      const existing = {
        id: 'o1', projectId: 'p1', title: 'Old', status: 'OPEN', slots: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await updateStaffingOrder(tx as any, ADMIN_CTX, 'o1', {
        slots: [{ positionCode: 'ELEC', positionTitle: 'Thợ điện', slotsNeeded: 5, validFrom: '2026-10-01' }],
      });
      expect(tx.staffingOrderSlot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            staffingOrderId: 'o1', slotsFilled: 0, slotsNeeded: 5,
          }),
        }),
      );
    });

    it('order không tồn tại → NOT_FOUND', async () => {
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
      await expect(
        updateStaffingOrder(tx as any, ADMIN_CTX, 'fake', { title: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('deleteStaffingOrder', () => {
    it('order sạch + ADMIN → xoá thành công', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 0, recruiterAssignments: 0, assignments: 0 },
        slots: [],
        jobOpenings: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
          delete: vi.fn().mockResolvedValue({ id: 'o1' }),
        },
      });
      const result = await deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1');
      expect(result.deleted).toBe(true);
      expect(tx.staffingOrderSlot.deleteMany).toHaveBeenCalledWith({ where: { staffingOrderId: 'o1' } });
      expect(tx.staffingOrder.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
    });

    it('HR_MANAGER không có quyền xoá (PERMISSION_DENIED)', async () => {
      const tx = makeMockTx();
      await expect(
        deleteStaffingOrder(tx as any, { userId: 'h1', role: 'HR_MANAGER' as any }, 'o1'),
      ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    });

    it('SALE không có quyền xoá (PERMISSION_DENIED)', async () => {
      const tx = makeMockTx();
      await expect(
        deleteStaffingOrder(tx as any, SALE_CTX, 'o1'),
      ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    });

    it('order có JobOpening → ORDER_NOT_DELETABLE + guidance', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 1, recruiterAssignments: 0, assignments: 0 },
        slots: [],
        jobOpenings: [{ id: 'jo-1', posting: null }],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1'),
      ).rejects.toMatchObject({
        code: 'ORDER_NOT_DELETABLE',
        message: expect.stringMatching(/Hủy nhu cầu/),
      });
      expect(tx.staffingOrder.delete).not.toHaveBeenCalled();
    });

    it('order có JobPosting (qua opening.posting) → ORDER_NOT_DELETABLE', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 1, recruiterAssignments: 0, assignments: 0 },
        slots: [],
        jobOpenings: [{ id: 'jo-1', posting: { id: 'jp-1' } }],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_DELETABLE' });
    });

    it('order có RecruiterAssignment → ORDER_NOT_DELETABLE', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 0, recruiterAssignments: 1, assignments: 0 },
        slots: [],
        jobOpenings: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_DELETABLE' });
    });

    it('order có ProjectAssignment (placement) → ORDER_NOT_DELETABLE', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 0, recruiterAssignments: 0, assignments: 1 },
        slots: [],
        jobOpenings: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_DELETABLE' });
    });

    it('slot có CandidateSubmission → ORDER_NOT_DELETABLE', async () => {
      const existing = {
        id: 'o1', code: 'SO-00001', projectId: 'p1', title: 'Old', status: 'OPEN',
        _count: { jobOpenings: 0, recruiterAssignments: 0, assignments: 0 },
        slots: [
          { id: 's1', _count: { submissions: 1, assignments: 0 } },
        ],
        jobOpenings: [],
      };
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(existing),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'o1'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_DELETABLE' });
    });

    it('order không tồn tại → NOT_FOUND', async () => {
      const tx = makeMockTx({
        staffingOrder: {
          ...makeMockTx().staffingOrder,
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
      await expect(
        deleteStaffingOrder(tx as any, ADMIN_CTX, 'fake'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
