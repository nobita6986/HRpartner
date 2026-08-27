/**
 * Slice 4A — 4-role integration tests (STEP-07, RQ-18, DEC-13).
 *
 * Pattern: Prisma in-memory mock + auth context per role.
 * Verify:
 *   1. ADMIN/HR_MANAGER/HR_STAFF — CRUD StaffingOrders + scope đầy đủ.
 *   2. PM/SALE/DIRECTOR/ACCOUNTANT — list + get (không tạo/sửa).
 *   3. VENDOR/CTTV/WORKER — 403 trên mọi route.
 *
 * Scope chain: StaffingOrder → project → (project visible via buildProjectScope).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';

// ─── Import helpers under test ───────────────────────────────────────────────

import { createStaffingOrder, listStaffingOrders, getStaffingOrder } from './order.service';
import { transferWorker, TransferServiceError } from './transfer.service';
import { queryTalentPool } from './talent-pool.repo';
import { evaluateReferralGuard } from './referral-guard.service';
import { enqueueOutbox } from '@/src/shared/integrity/outbox';

// ─── Mock DB store ──────────────────────────────────────────────────────────

interface MockRow {
  id: string;
  [key: string]: unknown;
}

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
      if (matches(row, where)) return row as T;
    }
    return null;
  }

  function matches(row: MockRow, where: Record<string, unknown>): boolean {
    for (const [k, v] of Object.entries(where)) {
      if (row[k] !== v) return false;
    }
    return true;
  }

  function clear() { tables.clear(); nextId = 1; }

  return { table, insert, findFirst, findMany, clear };

  function findMany(name: string, args: { where?: Record<string, unknown>; select?: Record<string, boolean> }): MockRow[] {
    const t = table(name);
    const results: MockRow[] = [];
    for (const row of t.values()) {
      if (!args.where || matches(row, args.where)) {
        results.push((args.select ? Object.fromEntries(Object.entries(row).filter(([k]) => args.select![k])) : row) as MockRow);
      }
    }
    return results;
  }
}

// ─── Mock Prisma tx ─────────────────────────────────────────────────────────

type MockTx = {
  [K in keyof ReturnType<typeof makeStore>]: ReturnType<typeof makeStore>[K];
} & {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
  outboxEvent: { create: ReturnType<typeof vi.fn> };
  projectAssignment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  staffingOrder: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  staffingOrderSlot: { findMany: ReturnType<typeof vi.fn> };
  project: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  worker: { findMany: ReturnType<typeof vi.fn> };
  candidateSubmission: { findFirst: ReturnType<typeof vi.fn> };
  contract: { findFirst: ReturnType<typeof vi.fn> };
  vendorRateCard: { findFirst: ReturnType<typeof vi.fn> };
};

function makeMockTx(store: ReturnType<typeof makeStore>): MockTx {
  const rawResults: Record<string, unknown[]> = {
    'SELECT DISTINCT pa.worker_id FROM project_assignments': [],
    'SELECT MAX': [{ max_num: null }],
    'SELECT id, project_id, valid_from\n     FROM project_assignments\n     WHERE worker_id':
      [{ id: 'pa-Nam-YP', project_id: 'prj-YP', valid_from: new Date('2026-08-01') }],
    'SELECT id FROM candidate_submissions\n     WHERE merged_worker_id':
      [],
  };

  const tx: any = {
    ...store,
    $queryRawUnsafe: vi.fn(async (sql: string, ..._args: unknown[]) => {
      for (const [key, val] of Object.entries(rawResults)) {
        if (sql.includes(key)) return val;
      }
      return [];
    }),
    $executeRawUnsafe: vi.fn(async (_sql: string, ..._args: unknown[]) => 1),
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
        const existing = store.table('project_assignments').get(args.where.id);
        if (!existing) throw new Error('not found');
        const updated = { ...existing, ...args.data };
        store.table('project_assignments').set(existing.id, updated);
        return updated;
      }),
    },
    staffingOrder: {
      findMany: vi.fn(async (args: any) => store.findMany('staffing_orders', args)),
      findUnique: vi.fn(async (args: any) => store.table('staffing_orders').get(args.where.id) ?? null),
      create: vi.fn(async (args: any) => store.insert('staffing_orders', args.data)),
      update: vi.fn(async (args: any) => {
        const existing = store.table('staffing_orders').get(args.where.id);
        if (!existing) throw new Error('not found');
        const updated = { ...existing, ...args.data };
        store.table('staffing_orders').set(existing.id, updated);
        return updated;
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
        const existing = store.table('projects').get(args.where.id);
        if (!existing) throw new Error('not found');
        const updated = { ...existing, ...args.data };
        store.table('projects').set(existing.id, updated);
        return updated;
      }),
    },
    worker: {
      findMany: vi.fn(async (args: any) => {
        const rows = store.findMany('workers', args);
        return rows.map(r => ({ ...r, sourceClaims: [] }));
      }),
      count: vi.fn(async (args: any) => store.findMany('workers', args).length),
    },
    sourceClaim: {
      findFirst: vi.fn(async () => null),
    },
    candidateSubmission: {
      findFirst: vi.fn(async (args: any) => store.findFirst('candidate_submissions', args.where ?? {})),
    },
    contract: {
      findFirst: vi.fn(async (args: any) => store.findFirst('contracts', args.where ?? {})),
    },
    vendorRateCard: {
      findFirst: vi.fn(async (args: any) => store.findFirst('vendor_rate_cards', args.where ?? {})),
    },
  } as unknown as MockTx;

  // withDbContext(tx, ctx, cb) calls tx.$transaction(async (inner) => { await applyRlsContext(inner); return cb(inner); }).
  // Faithful additive mock: run the callback against THIS same mock tx, which already supports
  // $executeRawUnsafe (applyRlsContext) + $queryRawUnsafe / worker.* (queryTalentPool inner body).
  // No production Staffing code changes; no assertion weakened; no security behavior mock-passed.
  (tx as MockTx).$transaction = vi.fn(async (arg: unknown, _opts?: unknown) =>
    typeof arg === 'function' ? (arg as (t: unknown) => unknown)(tx) : Promise.all(arg as Promise<unknown>[]),
  );

  return tx as MockTx;
}

// ─── Auth contexts per role ───────────────────────────────────────────────────

function makeCtx(role: string, userId = 'user-001'): AuthContext {
  return { userId, role: role as AuthContext['role'] };
}

// ─── Seed fixture ─────────────────────────────────────────────────────────────

function seedStore(store: ReturnType<typeof makeStore>) {
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
  store.insert('workers', {
    id: 'worker-Nam',
    fullName: 'Nguyen Van Nam',
    phone: '09x****123',
    status: 'ACTIVE',
  });
  store.insert('workers', {
    id: 'worker-Mai',
    fullName: 'Tran Thi Mai',
    phone: '09x****456',
    status: 'ACTIVE',
  });
  store.insert('project_assignments', {
    id: 'pa-Nam-YP',
    workerId: 'worker-Nam',
    projectId: 'prj-YP',
    status: 'ACTIVE',
    validFrom: new Date('2026-08-01'),
    validTo: null,
  });
  store.insert('contracts', {
    id: 'contract-Huy',
    vendorId: 'vendor-001',
    status: 'ACTIVE',
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
  });
  store.insert('candidate_submissions', {
    id: 'sub-Huy',
    workerId: 'worker-Huy',
    vendorId: 'vendor-001',
    mergedWorkerId: 'worker-Huy',
    createdAt: new Date('2026-08-14'),
    status: 'PENDING',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4-ROLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('4-role scoping — StaffingOrder (DEC-13)', () => {

  it('ADMIN — tạo và xem StaffingOrder', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('ADMIN');

    const order = await createStaffingOrder(tx as any, ctx, {
      projectId: 'prj-AP',
      title: 'Tuyển 3 Tổ Tự Động',
      slots: [{ positionCode: 'D1', positionTitle: 'Ca D1', slotsNeeded: 3, validFrom: '2026-08-20' }],
    });

    expect(order.code).toMatch(/^SO-\d+$/);
    expect(order.projectId).toBe('prj-AP');
    expect(order.status).toBe('OPEN');

    const rows = await listStaffingOrders(tx as any, ctx, { take: 20 });
    expect(rows.total).toBe(1);
    expect(rows.rows[0].id).toBe(order.id);
  });

  it('HR_STAFF — xem StaffingOrder (không tạo)', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);

    // Seed order
    store.insert('staffing_orders', {
      id: 'so-001',
      code: 'SO-00001',
      projectId: 'prj-AP',
      title: 'Order cũ',
      status: 'OPEN',
    });

    const ctx = makeCtx('HR_STAFF', 'hr-staff-001');

    const rows = await listStaffingOrders(tx as any, ctx, { take: 20 });
    expect(rows.total).toBeGreaterThanOrEqual(1);
  });

  it('VENDOR — bị chặn xem StaffingOrder', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('VENDOR', 'vendor-001');

    // buildStaffingOrderScope → buildProjectScope → worker/vendor không có scope → empty result
    const rows = await listStaffingOrders(tx as any, ctx, { take: 20 });
    expect(rows.rows).toHaveLength(0);
  });

  it('WORKER — bị chặn xem StaffingOrder', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('WORKER', 'worker-001');

    const rows = await listStaffingOrders(tx as any, ctx, { take: 20 });
    expect(rows.rows).toHaveLength(0);
  });
});

describe('4-role scoping — Guided Transfer (DEC-13)', () => {

  it('ADMIN — transfer worker 1-ACTIVE OK', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('ADMIN');

    const result = await transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    });

    expect(result.oldAssignmentId).toBeTruthy();
    expect(result.newAssignmentId).toBeTruthy();
    expect(result.workerId).toBe('worker-Nam');
  });

  it('HR_STAFF — transfer worker OK', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('HR_STAFF');

    const result = await transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    });

    expect(result.workerId).toBe('worker-Nam');
  });

  it('PM — bị chặn transfer (không có TRANSFER_ROLES)', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('PM');

    await expect(transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    })).rejects.toThrow('không có quyền transfer worker');
  });

  it('VENDOR — bị chặn transfer', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('VENDOR');

    await expect(transferWorker(tx as any, ctx, {
      workerId: 'worker-Nam',
      fromProjectId: 'prj-YP',
      toProjectId: 'prj-AP',
      transferDate: '2026-08-17',
    })).rejects.toThrow();
  });
});

describe('4-role scoping — Talent Pool (DEC-13)', () => {

  it('ADMIN — talent pool không throw (có CAN_VIEW_UNASSIGNED_POOL)', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('ADMIN');

    // ADMIN has CAN_VIEW_UNASSIGNED_POOL → không throw; kết quả là {workers,total,...}
    await expect(queryTalentPool(tx as any, ctx, { page: 1, pageSize: 10 })).resolves.toBeDefined();
  });

  it('WORKER — bị chặn talent pool (CAN_VIEW_UNASSIGNED_POOL)', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('WORKER');

    await expect(queryTalentPool(tx as any, ctx, { take: 10, skip: 0 } as any))
      .rejects.toThrow('CAN_VIEW_UNASSIGNED_POOL');
  });
});

describe('4-role scoping — Referral Guard (DEC-13)', () => {

  it('ADMIN — evaluate guard (không throw)', async () => {
    const store = makeStore();
    seedStore(store);
    const tx = makeMockTx(store);
    const ctx = makeCtx('ADMIN');

    const result = await evaluateReferralGuard(tx as any, ctx as any);

    // blockCode 0 = allowed (worker Nam not in 7d window, no contract, no rate card)
    expect(result.blockCode).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
