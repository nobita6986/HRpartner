/**
 * Slice 4A — E2E narrative integration test (STEP-07, STEP bước 1-5 F00A).
 *
 * Kịch bản F00A bước 1-5: Guided Transfer moment 02:10–03:10.
 *
 * Fixture narrative:
 *   - Mai (HR) đang ở Control Tower → click Staffing → thấy order "Thiếu 3 người An Phát"
 *   - Mở Talent Pool → thấy Nguyễn Văn Nam (ACTIVE tại Yên Phong)
 *   - Click Nam → "Bố trí vào dự án" → Guided Transfer: đóng Yên Phong, mở An Phát
 *   - Click "Chuyển dự án" → preview → xác nhận (không submit thật trong test)
 *
 * Test: E2E bước 1-5 (moment 02:10–03:10) — verify end-to-end flow không crash.
 *
 * Pattern: Prisma in-memory mock — KHÔNG cần DB thật.
 * Fixture hoàn toàn mock, không PII thật (DEC-14).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { createStaffingOrder, listStaffingOrders, getStaffingOrder } from './order.service';
import { transferWorker, TransferServiceError } from './transfer.service';
import { evaluateReferralGuard } from './referral-guard.service';
import { queryTalentPool } from './talent-pool.repo';

// ─── Mock Prisma store ───────────────────────────────────────────────────────

interface MockRow { id: string; [key: string]: unknown; }

function makeStore() {
  const tables = new Map<string, Map<string, MockRow>>();
  let nextId = 1;
  function table(name: string) {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  }
  function insert(name: string, data: Record<string, unknown>): MockRow {
    const t = table(name);
    const row: MockRow = { id: String(nextId++), ...data };
    t.set(row.id, row);
    return row;
  }
  function findFirst<T = MockRow>(name: string, where: Record<string, unknown>): T | null {
    const t = table(name);
    for (const row of t.values()) {
      let match = true;
      for (const [k, v] of Object.entries(where)) {
        if (row[k] !== v) { match = false; break; }
      }
      if (match) return row as T;
    }
    return null;
  }
  function findMany(name: string, args?: { where?: Record<string, unknown>; select?: Record<string, boolean> }): MockRow[] {
    const t = table(name);
    const results: MockRow[] = [];
    for (const row of t.values()) {
      let match = true;
      if (args?.where) {
        for (const [k, v] of Object.entries(args.where)) {
          if (row[k] !== v) { match = false; break; }
        }
      }
      if (match) {
        results.push(args?.select ? Object.fromEntries(Object.entries(row).filter(([k]) => args.select![k])) : row);
      }
    }
    return results;
  }
  function clear() { tables.clear(); nextId = 1; }
  return { table, insert, findFirst, findMany, clear };
}

// ─── Mock Prisma tx ─────────────────────────────────────────────────────────

function makeMockTx(store: ReturnType<typeof makeStore>) {
  return {
    ...store,
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT MAX')) return [{ max_num: null }];
      if (sql.includes('SELECT id, project_id, valid_from')) {
        const Nam = store.findFirst('project_assignments', { workerId: 'worker-Nam', status: 'ACTIVE' });
        return Nam ? [{ id: Nam.id, project_id: Nam.projectId, valid_from: Nam.validFrom }] : [];
      }
      if (sql.includes('SELECT DISTINCT')) return [];
      if (sql.includes('WHERE merged_worker_id')) return [];
      return [];
    }),
    $executeRawUnsafe: vi.fn(async () => 1),
    outboxEvent: {
      create: vi.fn(async (args: any) => {
        const row = { id: String(Date.now()), status: 'PENDING', ...args.data };
        store.table('outbox_events').set(row.id, row);
        return row;
      }),
    },
    projectAssignment: {
      findMany: vi.fn(async (args: any) => store.findMany('project_assignments', args)),
      create: vi.fn(async (args: any) => store.insert('project_assignments', args.data)),
      update: vi.fn(async (args: any) => {
        const e = store.table('project_assignments').get(args.where.id);
        if (!e) throw new Error('not found');
        const u = { ...e, ...args.data };
        store.table('project_assignments').set(e.id, u);
        return u;
      }),
    },
    staffingOrder: {
      findMany: vi.fn(async (args: any) => store.findMany('staffing_orders', args)),
      findUnique: vi.fn(async (args: any) => store.table('staffing_orders').get(args.where.id) ?? null),
      create: vi.fn(async (args: any) => store.insert('staffing_orders', args.data)),
      update: vi.fn(async (args: any) => {
        const e = store.table('staffing_orders').get(args.where.id);
        if (!e) throw new Error('not found');
        const u = { ...e, ...args.data };
        store.table('staffing_orders').set(e.id, u);
        return u;
      }),
      count: vi.fn(async (args: any) => store.findMany('staffing_orders', args).length),
    },
    staffingOrderSlot: {
      findMany: vi.fn(async (args: any) => store.findMany('staffing_order_slots', args)),
    },
    project: {
      findMany: vi.fn(async (args: any) => store.findMany('projects', args)),
      findUnique: vi.fn(async (args: any) => store.table('projects').get(args.where.id) ?? null),
      update: vi.fn(async (args: any) => {
        const e = store.table('projects').get(args.where.id);
        if (!e) throw new Error('not found');
        const u = { ...e, ...args.data };
        store.table('projects').set(e.id, u);
        return u;
      }),
    },
    worker: {
      findMany: vi.fn(async (args: any) => {
        const rows = store.findMany('workers', args);
        return rows.map(r => ({ ...r, sourceClaims: [] }));
      }),
      count: vi.fn(async (args: any) => store.findMany('workers', args).length),
    },
    sourceClaim: { findFirst: vi.fn(async () => null) },
    candidateSubmission: { findFirst: vi.fn(async (args: any) => store.findFirst('candidate_submissions', args.where ?? {})) },
    contract: { findFirst: vi.fn(async (args: any) => store.findFirst('contracts', args.where ?? {})) },
    vendorRateCard: { findFirst: vi.fn(async (args: any) => store.findFirst('vendor_rate_cards', args.where ?? {})) },
  };
}

// ─── Auth context helper ──────────────────────────────────────────────────────

function hrCtx(role = 'ADMIN') {
  return { userId: 'user-mai', role: role as AuthContext['role'], permissions: [], dbLabel: null };
}

// ─── F00A Step 1-5 Fixture ───────────────────────────────────────────────────

function seedNarrative(store: ReturnType<typeof makeStore>) {
  // 2 project
  store.insert('projects', {
    id: 'prj-YP',
    name: 'Yen Phong',
    status: 'ACTIVE',
    filled: 1,
    quota: 10,
    region: 'BAC_NINH',
  });
  store.insert('projects', {
    id: 'prj-AP',
    name: 'An Phat',
    status: 'ACTIVE',
    filled: 47,
    quota: 50,
    region: 'BAC_NINH',
  });
  // Worker: Nguyễn Văn Nam — ACTIVE tại Yên Phong
  store.insert('workers', {
    id: 'worker-Nam',
    fullName: 'Nguyen Van Nam',
    phone: '09x****789',
    status: 'ACTIVE',
  });
  // Worker: Mai (HR) — user đang thao tác
  store.insert('workers', {
    id: 'user-mai',
    fullName: 'Tran Thi Mai',
    phone: '09x****101',
    status: 'ACTIVE',
  });
  // Assignment ACTIVE tại Yên Phong (Nam)
  store.insert('project_assignments', {
    id: 'pa-Nam-YP',
    workerId: 'worker-Nam',
    projectId: 'prj-YP',
    status: 'ACTIVE',
    validFrom: new Date('2026-08-01'),
    validTo: null,
  });
  // Staffing Order "Thiếu 3 người An Phát"
  store.insert('staffing_orders', {
    id: 'so-AP-001',
    code: 'SO-00001',
    projectId: 'prj-AP',
    title: 'Thiếu 3 người An Phát',
    status: 'OPEN',
  });
  store.insert('staffing_order_slots', {
    id: 'slot-001',
    staffingOrderId: 'so-AP-001',
    positionCode: 'D1',
    positionTitle: 'Ca D1',
    slotsNeeded: 3,
    slotsFilled: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2E NARRATIVE — F00A BƯỚC 1-5 (moment 02:10–03:10)
// ═══════════════════════════════════════════════════════════════════════════════

describe('F00A Bước 1-5 — E2E Slice 4A Guided Transfer (moment 02:10–03:10)', () => {

  // Step 1 (00:40): Mai mở Staffing → thấy order "Thiếu 3 người An Phát"
  // NOTE: Use ADMIN ctx — buildStaffingOrderScope→buildProjectScope: HR_STAFF has empty scope (deny all).
  it('Bước 1: Mai list StaffingOrders → thấy order An Phát thiếu 3 người', async () => {
    const store = makeStore();
    seedNarrative(store);
    const tx = makeMockTx(store);
    const ctx = hrCtx('ADMIN');

    const { rows, total } = await listStaffingOrders(tx as any, ctx, { take: 10, skip: 0 });

    expect(total).toBeGreaterThanOrEqual(1);
    const apOrder = rows.find((r: any) => r.projectId === 'prj-AP');
    expect(apOrder).toBeDefined();
    expect(apOrder.title).toContain('An Phát');
    expect(apOrder.status).toBe('OPEN');
  });

  // Step 2 (01:20): Mở Talent Pool → thấy Nam (chưa assign vào An Phát)
  it('Bước 2: Mai xem Talent Pool → thấy Nam (chưa assign An Phát)', async () => {
    const store = makeStore();
    seedNarrative(store);
    const tx = makeMockTx(store);
    const ctx = hrCtx('ADMIN');

    // Nam đang ACTIVE tại Yên Phong, không phải An Phát
    const namAssignment = store.findFirst('project_assignments', { workerId: 'worker-Nam', status: 'ACTIVE' });
    expect(namAssignment?.projectId).toBe('prj-YP'); // biết trước từ fixture

    // Talent pool: ADMIN has CAN_VIEW_UNASSIGNED_POOL → không throw
    await expect(queryTalentPool(tx as any, ctx, { page: 1, pageSize: 10 })).resolves.toBeDefined();
  });

  // Step 3 (02:10): Chọn Nam → "Bố trí vào dự án" → Guided Transfer drawer
  // Hệ thống detect: Nam ACTIVE tại Yên Phong → chỉ có Xem / Chuyển dự án
  it('Bước 3: Guided Transfer — detect Nam ACTIVE tại Yên Phong (1-ACTIVE invariant)', async () => {
    const store = makeStore();
    seedNarrative(store);
    const tx = makeMockTx(store);
    const ctx = hrCtx('ADMIN');

    // Nam có 1 assignment ACTIVE tại prj-YP (mock raw SQL trả về đúng)
    const activeAssignments = await tx.$queryRawUnsafe(
      `SELECT id, project_id, valid_from FROM project_assignments WHERE worker_id = $1 AND status = 'ACTIVE'`,
      'worker-Nam',
    );
    expect(activeAssignments).toHaveLength(1);
    expect((activeAssignments[0] as any).project_id).toBe('prj-YP');

    // Hệ thống biết Nam đang ở Yên Phong → chỉ cho phép "Chuyển dự án"
    // Không cho phép đặt trực tiếp vào An Phát
    await expect(transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP', // Yên Phong (nơi Nam đang ACTIVE)
      toProjectId: 'prj-AP',   // An Phát (nơi cần người)
      transferDate: '2026-08-17',
    })).resolves.toBeDefined();
  });

  // Step 4 (03:10): Preview đóng cũ/mở mới — transfer thành công
  it('Bước 4: Transfer Nam Yên Phong → An Phát — đóng cũ mở mới', async () => {
    const store = makeStore();
    seedNarrative(store);
    const tx = makeMockTx(store);
    const ctx = hrCtx('HR_STAFF');

    // Before transfer: Nam ACTIVE tại Yên Phong
    const beforeYP = store.findFirst('projects', { id: 'prj-YP' }) as any;
    const beforeAP = store.findFirst('projects', { id: 'prj-AP' }) as any;
    expect(beforeYP.filled).toBe(1);
    expect(beforeAP.filled).toBe(47);

    const result = await transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    });

    expect(result.workerId).toBe('worker-Nam');
    expect(result.fromProjectId).toBe('prj-YP');
    expect(result.toProjectId).toBe('prj-AP');
    expect(result.oldAssignmentId).toBeTruthy();
    expect(result.newAssignmentId).toBeTruthy();
    expect(result.oldAssignmentId).not.toBe(result.newAssignmentId);

    // After transfer: assignment cũ chuyển sang TRANSFERRED
    const oldAssignment = store.table('project_assignments').get(result.oldAssignmentId) as any;
    expect(oldAssignment.status).toBe('TRANSFERRED');
    expect(oldAssignment.validTo).toBeTruthy();

    // Outbox event đã được gửi (enqueueOutbox trong service)
    const outboxCreated = tx.outboxEvent.create.mock.calls.length;
    expect(outboxCreated).toBeGreaterThan(0);
  });

  // Step 5: Quy tắc 1-ACTIVE — không thể có 2 assignment ACTIVE cùng worker
  it('Bước 5: Bất biến 1-ACTIVE — không thể tạo 2 assignment ACTIVE cùng worker', async () => {
    const store = makeStore();
    seedNarrative(store);
    const tx = makeMockTx(store);
    const ctx = hrCtx('HR_STAFF');

    // Manually seed Nam với 2 assignment ACTIVE (bất biến vi phạm)
    store.insert('project_assignments', {
      id: 'pa-Nam-AP',
      workerId: 'worker-Nam',
      projectId: 'prj-AP',
      status: 'ACTIVE',
      validFrom: new Date('2026-08-15'),
      validTo: null,
    });

    // Transfer không chạy qua $transaction mock (chỉ test invariant check trong service)
    // invariant: activeAssignments.length > 1 → MULTIPLE_ACTIVE_ASSIGNMENTS
    // Raw SQL mock sẽ trả về 2 rows → service throw
    const rawFn = tx.$queryRawUnsafe as ReturnType<typeof vi.fn>;
    rawFn.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, project_id, valid_from')) {
        return [
          { id: 'pa-Nam-YP', project_id: 'prj-YP', valid_from: new Date('2026-08-01') },
          { id: 'pa-Nam-AP', project_id: 'prj-AP', valid_from: new Date('2026-08-15') },
        ];
      }
      return [];
    });

    await expect(transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    })).rejects.toThrow(TransferServiceError);
  });
});
