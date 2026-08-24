/**
 * Reconciliation unit tests -- Phase 4 Slice 4C STEP-13/14/15 (AC-05, AC-06).
 *
 * Verify:
 *   - Statement generation 2 luong (Vendor + Client) from LOCKED timesheet
 *   - BigInt amount tinh dung tu rate snapshot
 *   - Margin = client - vendor (BigInt)
 *   - Vendor preview khong co margin field
 *   - CAN_VIEW_STATEMENT_MARGIN required cho margin
 *   - Dispute max 2 vong
 *   - FORCE LOCK can CAN_FORCE_LOCK_STATEMENT
 *   - SLA 3 ngay -> AUTO-CONFIRMED (fake timer)
 */

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { generateVendorStatement, generateClientStatement, StatementServiceError } from './statement.service';
import { calculateMargin, MarginPermissionError, vendorPreviewStatement } from './margin.service';
import {
  sendStatement,
  disputeStatement,
  confirmStatement,
  lockStatement,
  forceLockStatement,
  autoConfirmExpiredStatements,
  DisputeServiceError,
} from './dispute.service';
import { materializeOperationFixtures } from '@/tests/fixtures/operations';

interface MockRow { id: string; [key: string]: unknown; }

function makeStore() {
  const tables = new Map<string, Map<string, MockRow>>();
  function table(name: string) {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  }
  function insert(model: string, data: any) {
    const t = table(model);
    const id = data.id ?? `${model}-${t.size + 1}`;
    t.set(id, { id, ...data });
    return t.get(id)!;
  }
  function seedReconciliation() {
    // Timesheet period LOCKED
    insert('timesheet_periods', { id: 'period-aug', projectId: 'prj-AP', month: 8, year: 2026, status: 'LOCKED', version: 1 });
    // Timesheet lines
    insert('timesheet_lines', { id: 'tl-1', periodId: 'period-aug', workerId: 'w-1', projectId: 'prj-AP', assignmentId: 'a-1', regularHours: 160, ot15Hours: 10, ot20Hours: 0, ot30Hours: 0 });
    insert('timesheet_lines', { id: 'tl-2', periodId: 'period-aug', workerId: 'w-2', projectId: 'prj-AP', assignmentId: 'a-2', regularHours: 80, ot15Hours: 0, ot20Hours: 0, ot30Hours: 0 });
    // Project with client
    insert('projects', { id: 'prj-AP', code: 'PRJ-AP', clientCompanyId: 'client-AP', name: 'An Phat' });
    // Contracts
    insert('contracts', { id: 'contract-vendor', contractNo: 'CTR-V-001', type: 'VENDOR_FRAMEWORK', status: 'ACTIVE' });
    insert('contracts', { id: 'contract-client', contractNo: 'CTR-C-001', type: 'CLIENT_SUPPLY', status: 'ACTIVE', projectId: 'prj-AP' });
    // Vendor
    insert('vendors', { id: 'vendor-1', code: 'V-001', name: 'CTY ABC' });
    // Rate cards
    insert('vendor_rate_cards', { id: 'vrc-1', contractId: 'contract-vendor', rateType: 'HOURLY', price: 50000n, effectiveFrom: new Date('2026-01-01') });
    insert('client_rate_cards', { id: 'crc-1', contractId: 'contract-client', rateType: 'HOURLY', price: 80000n, effectiveFrom: new Date('2026-01-01') });
  }
  return { table, insert, seedReconciliation };
}

function makeMockTx(store: ReturnType<typeof makeStore>): any {
  return {
    timesheetPeriod: {
      findUnique: ({ where }: any) => store.table('timesheet_periods').get(where.id) ?? Promise.resolve(null),
    },
    timesheetLine: {
      findMany: ({ where }: any) => {
        const rows: MockRow[] = [];
        for (const r of store.table('timesheet_lines').values()) {
          if (where?.periodId && r.periodId !== where.periodId) continue;
          rows.push(r);
        }
        return Promise.resolve(rows);
      },
    },
    project: {
      findUnique: ({ where }: any) => Promise.resolve(store.table('projects').get(where.id)) as any,
    },
    contract: {
      findFirst: ({ where }: any) => {
        for (const c of store.table('contracts').values()) {
          if (where.type && c.type !== where.type) continue;
          if (where.status && c.status !== where.status) continue;
          if (where.projectId && c.projectId !== where.projectId) continue;
          return Promise.resolve(c);
        }
        return Promise.resolve(null);
      },
    },
    vendor: {
      findFirst: () => Promise.resolve(store.table('vendors').get('vendor-1')) as any,
    },
    vendorRateCard: {
      findMany: () => Promise.resolve([]),
    },
    vendor_rate_cards: undefined, // raw SQL target
    client_rate_cards: undefined,
    $queryRawUnsafe: (_sql: string, contractId: string, _workDate: Date) => {
      // Return rate based on contractId
      for (const r of store.table('vendor_rate_cards').values()) {
        if (r.contractId === contractId) return Promise.resolve([{ price: r.price }]);
      }
      for (const r of store.table('client_rate_cards').values()) {
        if (r.contractId === contractId) return Promise.resolve([{ price: r.price }]);
      }
      return Promise.resolve([]);
    },
    vendorStatement: {
      aggregate: ({ where }: any) => {
        let sum = 0n;
        for (const s of store.table('vendor_statements').values()) {
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          sum += BigInt((s.totalAmount ?? 0) as number);
        }
        return Promise.resolve({ _sum: { totalAmount: sum } });
      },
      count: ({ where }: any) => {
        let c = 0;
        for (const s of store.table('vendor_statements').values()) {
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          c++;
        }
        return Promise.resolve(c);
      },
      findUnique: ({ where, include }: any) => {
        const s = store.table('vendor_statements').get(where.id);
        if (!s) return Promise.resolve(null);
        if (include?.lines) {
          const lines: MockRow[] = [];
          for (const ln of store.table('vendor_statement_lines').values()) {
            if (ln.statementId === where.id) lines.push(ln);
          }
          return Promise.resolve({ ...s, lines });
        }
        return Promise.resolve(s);
      },
      findMany: ({ where }: any) => {
        const rows: MockRow[] = [];
        for (const s of store.table('vendor_statements').values()) {
          if (where?.status && s.status !== where.status) continue;
          if (where?.confirmDeadlineAt?.lt) {
            const deadline = s.confirmDeadlineAt as Date;
            if (deadline && deadline >= where.confirmDeadlineAt.lt) continue;
          }
          rows.push(s);
        }
        return Promise.resolve(rows);
      },
      findFirst: ({ where }: any) => {
        for (const s of store.table('vendor_statements').values()) {
          if (where.vendorId && s.vendorId !== where.vendorId) continue;
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          if (where.version && s.version !== where.version) continue;
          return Promise.resolve(s);
        }
        return Promise.resolve(null);
      },
      create: ({ data }: any) => {
        const stmt = store.insert('vendor_statements', { ...data, totalAmount: data.totalAmount });
        for (const ln of data.lines?.create ?? []) {
          store.insert('vendor_statement_lines', { ...ln, statementId: stmt.id });
        }
        return Promise.resolve({ ...stmt, lines: store.table('vendor_statement_lines').get(stmt.id) ? [] : [] });
      },
      update: ({ where, data }: any) => {
        const s = store.table('vendor_statements').get(where.id);
        if (!s) return Promise.reject(new Error('not found'));
        if (typeof data.disputeCount === 'object' && data.disputeCount?.increment !== undefined) {
          s.disputeCount = (s.disputeCount ?? 0) + data.disputeCount.increment;
          delete data.disputeCount;
        }
        Object.assign(s, data);
        return Promise.resolve(s);
      },
    },
    clientStatement: {
      aggregate: ({ where }: any) => {
        let sum = 0n;
        for (const s of store.table('client_statements').values()) {
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          sum += BigInt((s.totalAmount ?? 0) as number);
        }
        return Promise.resolve({ _sum: { totalAmount: sum } });
      },
      count: ({ where }: any) => {
        let c = 0;
        for (const s of store.table('client_statements').values()) {
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          c++;
        }
        return Promise.resolve(c);
      },
      findMany: ({ where }: any) => {
        const rows: MockRow[] = [];
        for (const s of store.table('client_statements').values()) {
          if (where?.status && s.status !== where.status) continue;
          if (where?.confirmDeadlineAt?.lt) {
            const deadline = s.confirmDeadlineAt as Date;
            if (deadline && deadline >= where.confirmDeadlineAt.lt) continue;
          }
          rows.push(s);
        }
        return Promise.resolve(rows);
      },
      findFirst: ({ where }: any) => {
        for (const s of store.table('client_statements').values()) {
          if (where.clientId && s.clientId !== where.clientId) continue;
          if (where.periodMonth && s.periodMonth !== where.periodMonth) continue;
          if (where.periodYear && s.periodYear !== where.periodYear) continue;
          if (where.version && s.version !== where.version) continue;
          return Promise.resolve(s);
        }
        return Promise.resolve(null);
      },
      create: ({ data }: any) => {
        const stmt = store.insert('client_statements', { ...data, totalAmount: data.totalAmount });
        for (const ln of data.lines?.create ?? []) {
          store.insert('client_statement_lines', { ...ln, statementId: stmt.id });
        }
        return Promise.resolve(stmt);
      },
      update: ({ where, data }: any) => {
        const s = store.table('client_statements').get(where.id);
        if (!s) return Promise.reject(new Error('not found'));
        Object.assign(s, data);
        return Promise.resolve(s);
      },
    },
    projectAssignment: {
      findMany: ({ where }: any) => {
        const rows: MockRow[] = [];
        for (const a of store.table('project_assignments').values()) {
          if (where?.id?.in && !where.id.in.includes(a.id)) continue;
          rows.push(a);
        }
        return Promise.resolve(rows);
      },
      include: undefined as any,
    },
    auditLog: {
      create: () => Promise.resolve({ id: 'audit-1' }),
    },
    outboxEvent: { create: () => Promise.resolve({ id: 'ev-1' }) },
    $transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(makeMockTx(store)),
  };
}

function adminCtx(): AuthContext {
  return { userId: 'USR-ADMIN', role: 'ADMIN' };
}

function accountantCtx(): AuthContext {
  return { userId: 'USR-AC', role: 'ACCOUNTANT' };
}

describe('G0-05 deterministic operation fixtures - reconciliation consumers', () => {
  it('preserves correction delta and dispute amounts without environment state', () => {
    const fixtures = materializeOperationFixtures();
    const correction = fixtures.correction.correction!;
    const dispute = fixtures.dispute.dispute!;

    expect(correction.correctedRegularHours - correction.originalRegularHours).toBe(0.5);
    expect(correction.reasonCode).toBe('MISSING_PUNCH');
    expect(dispute.statementAmountVnd).toBe('12000000');
    expect(dispute.disputedAmountVnd).toBe('800000');
    expect(dispute.round).toBe(1);
  });
});

function vendorCtx(): AuthContext {
  return { userId: 'USR-VENDOR', role: 'VENDOR_ADMIN', vendorId: 'vendor-1' };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Statement generation (STEP-13, AC-05)', () => {
  it('Generate vendor statement thanh cong tu LOCKED timesheet', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    expect(stmt).toBeDefined();
    expect(stmt.status).toBe('DRAFT');
    expect(stmt.totalAmount).toBeGreaterThan(0n);
  });

  it('Generate client statement thanh cong', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateClientStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    expect(stmt).toBeDefined();
    expect(stmt.status).toBe('DRAFT');
  });

  it('Chan generate khi timesheet chua LOCKED -> INVALID_STATE 409', async () => {
    const store = makeStore();
    store.seedReconciliation();
    store.table('timesheet_periods').get('period-aug')!.status = 'APPROVED';
    const tx = makeMockTx(store);

    await expect(
      generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' }),
    ).rejects.toThrow(StatementServiceError);
  });

  it('BigInt amount tinh dung tu rate snapshot (vendor 50k VND/h)', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    // worker 1: 160 + 10 = 170 hours * 50k = 8,500,000
    // worker 2: 80 hours * 50k = 4,000,000
    // total = 12,500,000
    expect(stmt.totalAmount).toBe(12500000n);
  });

  it('keeps 7.5h decimal until after vendor and client rate multiplication', async () => {
    const store = makeStore();
    store.seedReconciliation();
    store.table('timesheet_lines').clear();
    store.insert('timesheet_lines', {
      id: 'tl-fractional',
      periodId: 'period-aug',
      workerId: 'w-fractional',
      projectId: 'prj-AP',
      assignmentId: null,
      regularHours: 7.5,
      ot15Hours: 0,
      ot20Hours: 0,
      ot30Hours: 0,
    });
    const tx = makeMockTx(store);

    const vendor = await generateVendorStatement(tx, adminCtx(), {
      timesheetPeriodId: 'period-aug',
    });
    const client = await generateClientStatement(tx, adminCtx(), {
      timesheetPeriodId: 'period-aug',
    });

    expect(vendor.totalAmount).toBe(375_000n);
    expect(client.totalAmount).toBe(600_000n);
  });
});

describe('Margin (STEP-14, AC-05)', () => {
  it('PM an margin (DEC-06 canViewMargin)', async () => {
    const { canViewMargin } = await import('./margin.service');
    expect(canViewMargin('PM')).toBe(false);
    expect(canViewMargin('ADMIN')).toBe(true);
    expect(canViewMargin('ACCOUNTANT')).toBe(true);
    expect(canViewMargin('HR_MANAGER')).toBe(false);
  });

  it('ADMIN xem margin thanh cong', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    await generateClientStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });

    const m = await calculateMargin(tx, adminCtx(), 8, 2026);
    expect(m.margin).toBeDefined();
    expect(m.totalClientReceivable).toBeGreaterThan(m.totalVendorPayable);
  });

  it('ACCOUNTANT xem margin thanh cong (DEC-06)', async () => {
    const { canViewMargin } = await import('./margin.service');
    expect(canViewMargin('ACCOUNTANT')).toBe(true);
  });
});

describe('Vendor preview (RQ-14, D08)', () => {
  it('Vendor preview khong tra margin field', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    const preview = await vendorPreviewStatement(tx, vendorCtx(), stmt.id);
    expect(preview).toBeDefined();
    expect((preview as any).margin).toBeUndefined();
    expect(preview.lines.length).toBeGreaterThan(0);
  });

  it('Vendor scope check: vendor khac khong xem duoc', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });

    const otherVendor: AuthContext = { userId: 'USR-V2', role: 'VENDOR_ADMIN', vendorId: 'vendor-other' };
    await expect(vendorPreviewStatement(tx, otherVendor, stmt.id)).rejects.toThrow(/Vendor chi xem statement cua minh/);
  });
});

describe('Dispute + SLA + FORCE LOCK (STEP-15, AC-06)', () => {
  it('Dispute vong 1 thanh cong tu SENT', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    await sendStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR' });

    const after = await disputeStatement(tx, adminCtx(), {
      statementId: stmt.id,
      statementKind: 'VENDOR',
      reason: 'So gio sai',
    });
    expect(after.status).toBe('DISPUTED');
    expect(after.disputeCount).toBe(1);
  });

  it('Dispute vong 3 -> MAX_DISPUTES 409', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    await sendStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR' });

    await disputeStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR', reason: 'V1' });
    // Reset to SENT for second dispute (real flow: vendor/client redo)
    store.table('vendor_statements').get(stmt.id)!.status = 'SENT';
    await disputeStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR', reason: 'V2' });
    // Reset to SENT for third dispute
    store.table('vendor_statements').get(stmt.id)!.status = 'SENT';
    store.table('vendor_statements').get(stmt.id)!.disputeCount = 2;
    await expect(
      disputeStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR', reason: 'V3' }),
    ).rejects.toThrow(DisputeServiceError);
  });

  it('FORCE LOCK can CAN_FORCE_LOCK_STATEMENT', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    await sendStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR' });

    const locked = await forceLockStatement(tx, adminCtx(), stmt.id, 'VENDOR');
    expect(locked.status).toBe('LOCKED');
  });

  it('SLA 3 ngay qua deadline -> AUTO-CONFIRMED', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    await sendStatement(tx, adminCtx(), { statementId: stmt.id, statementKind: 'VENDOR', deadlineDays: 3 });

    // Fake timer: 4 ngay sau
    const future = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const result = await autoConfirmExpiredStatements(tx, future);
    expect(result.vendorConfirmed).toBe(1);
  });

  it('LOCK chi khi CONFIRMED', async () => {
    const store = makeStore();
    store.seedReconciliation();
    const tx = makeMockTx(store);

    const stmt = await generateVendorStatement(tx, adminCtx(), { timesheetPeriodId: 'period-aug' });
    // Van DRAFT
    await expect(lockStatement(tx, adminCtx(), stmt.id, 'VENDOR')).rejects.toThrow(/khong the LOCK/);
  });
});
