/**
 * audit-logs.read-service.test.ts — T1B-OPS audit viewer service tests.
 *
 * Cover:
 *   - PII redact (`redactAuditDiff`) — deep walk, case-insensitive, array/object.
 *   - `assertAdminRole` rejects non-ADMIN.
 *   - `listAuditLogs` builds correct where filter (entityType / entityId /
 *     action / actorId / date range / skip / take).
 *   - `listAuditLogs` returns `diffSafe` (redacted) and ISO `createdAt`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({}) }));
import {
  AUDIT_DIFF_PII_KEYS,
  assertAdminRole,
  listAuditLogs,
  redactAuditDiff,
} from './audit-logs.read-service';

const fakeTx = () => ({
  auditLog: {
    count: mocks.count,
    findMany: mocks.findMany,
  },
});

const ctx = { userId: 'u1', role: 'ADMIN' } as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(0);
  mocks.findMany.mockResolvedValue([]);
});

describe('redactAuditDiff', () => {
  it('replaces top-level PII keys with ***', () => {
    const input = { cccdNumber: '012345678901', phone: '0987654321', action: 'X' };
    const out = redactAuditDiff(input) as Record<string, unknown>;
    expect(out.cccdNumber).toBe('***');
    expect(out.phone).toBe('***');
    expect(out.action).toBe('X');
  });

  it('case-insensitive match', () => {
    const input = { CCCDNumber: '0123', PHONE: '0123', BankAccount: '0123' };
    const out = redactAuditDiff(input) as Record<string, unknown>;
    expect(out.CCCDNumber).toBe('***');
    expect(out.PHONE).toBe('***');
    expect(out.BankAccount).toBe('***');
  });

  it('walks nested objects', () => {
    const input = {
      before: {
        fullName: 'Nguyen Van A',
        cccdNumber: '0123',
        meta: { phone: '999' },
      },
    };
    const out = redactAuditDiff(input) as { before: { fullName: string; cccdNumber: string; meta: { phone: string } } };
    expect(out.before.fullName).toBe('Nguyen Van A');
    expect(out.before.cccdNumber).toBe('***');
    expect(out.before.meta.phone).toBe('***');
  });

  it('walks arrays', () => {
    const input = [{ cccdNumber: '0123' }, { phone: '999' }];
    const out = redactAuditDiff(input) as Array<Record<string, unknown>>;
    expect(out[0].cccdNumber).toBe('***');
    expect(out[1].phone).toBe('***');
  });

  it('passes through primitives unchanged', () => {
    expect(redactAuditDiff(42)).toBe(42);
    expect(redactAuditDiff('safe')).toBe('safe');
    expect(redactAuditDiff(null)).toBe(null);
    expect(redactAuditDiff(undefined)).toBe(undefined);
    expect(redactAuditDiff(true)).toBe(true);
  });

  it('does not mutate original', () => {
    const input = { cccdNumber: '0123' };
    const before = JSON.stringify(input);
    redactAuditDiff(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('assertAdminRole', () => {
  it('accepts ADMIN', () => {
    expect(() => assertAdminRole('ADMIN')).not.toThrow();
  });

  it('throws on HR_MANAGER', () => {
    expect(() => assertAdminRole('HR_MANAGER')).toThrow(/nhật ký kiểm toán/);
  });

  it('throws on HR_STAFF', () => {
    expect(() => assertAdminRole('HR_STAFF')).toThrow(/nhật ký kiểm toán/);
  });

  it('throws on PM', () => {
    expect(() => assertAdminRole('PM')).toThrow();
  });
});

describe('listAuditLogs', () => {
  it('rejects non-ADMIN with AuthError', async () => {
    await expect(
      listAuditLogs(fakeTx() as never, { userId: 'u1', role: 'HR_MANAGER' } as never, {}),
    ).rejects.toThrow(/nhật ký kiểm toán/);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('builds where filter from input', async () => {
    await listAuditLogs(fakeTx() as never, ctx, {
      entityType: 'Worker',
      entityId: 'w1',
      action: 'WORKER_PERMANENT_DELETE',
      actorId: 'u2',
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      skip: 10,
      take: 25,
    });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.where.entityType).toBe('Worker');
    expect(args.where.entityId).toBe('w1');
    expect(args.where.action).toBe('WORKER_PERMANENT_DELETE');
    expect(args.where.actorId).toBe('u2');
    expect(args.where.createdAt).toBeDefined();
    expect(args.where.createdAt.gte).toBeInstanceOf(Date);
    expect(args.where.createdAt.lte).toBeInstanceOf(Date);
    expect(args.skip).toBe(10);
    expect(args.take).toBe(25);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('clamps take to MAX 200', async () => {
    await listAuditLogs(fakeTx() as never, ctx, { take: 10000 });
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.take).toBeLessThanOrEqual(200);
  });

  it('returns redacted diff + ISO createdAt', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'a1',
        actorId: 'u2',
        actorRole: 'ADMIN',
        action: 'WORKER_PERMANENT_DELETE',
        entityType: 'Worker',
        entityId: 'w1',
        reason: 'Test',
        diff: { before: { cccdNumber: '0123', fullName: 'A' } },
        createdAt: new Date('2026-01-15T10:00:00Z'),
      },
    ]);
    mocks.count.mockResolvedValue(1);

    const out = await listAuditLogs(fakeTx() as never, ctx, {});
    expect(out.items).toHaveLength(1);
    expect(out.items[0].createdAt).toBe('2026-01-15T10:00:00.000Z');
    const diff = out.items[0].diffSafe as { before: { cccdNumber: string; fullName: string } };
    expect(diff.before.cccdNumber).toBe('***');
    expect(diff.before.fullName).toBe('A');
  });

  it('returns total + skip + take in response', async () => {
    mocks.count.mockResolvedValue(42);
    const out = await listAuditLogs(fakeTx() as never, ctx, { skip: 5, take: 10 });
    expect(out.total).toBe(42);
    expect(out.skip).toBe(5);
    expect(out.take).toBe(10);
  });

  it('handles empty result', async () => {
    const out = await listAuditLogs(fakeTx() as never, ctx, {});
    expect(out.items).toEqual([]);
    expect(out.total).toBe(0);
  });
});

describe('AUDIT_DIFF_PII_KEYS', () => {
  it('contains canonical PII keys', () => {
    for (const k of ['cccdnumber', 'phone', 'bankaccount', 'bankname', 'bankbranch', 'taxcode', 'insurancecode']) {
      expect(AUDIT_DIFF_PII_KEYS.has(k)).toBe(true);
    }
  });
});