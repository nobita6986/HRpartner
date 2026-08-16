/**
 * Audit writer tests (Phase 3 / AC-03).
 *
 * Cover:
 *   1. Ghi đủ 5 thành phần: actorId/actorRole/reason/ip/ua/before-after.
 *   2. Custom logger override (vd Sentry/Datadog integration).
 *   3. null reason/ip/ua khi actor không có.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeAuditLog, type AuditPrisma } from './audit';

interface MockAuditRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: string;
  action: string;
  diff: any;
  metadata: any;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function makeMockPrisma() {
  const rows: MockAuditRow[] = [];
  let nextId = 1;

  const create = vi.fn(async (args: any) => {
    const row: MockAuditRow = {
      id: String(nextId++),
      actorId: args.data.actorId ?? null,
      actorRole: args.data.actorRole ?? null,
      entityType: args.data.entityType,
      entityId: args.data.entityId,
      action: args.data.action,
      diff: args.data.diff,
      metadata: args.data.metadata,
      reason: args.data.reason ?? null,
      ipAddress: args.data.ipAddress ?? null,
      userAgent: args.data.userAgent ?? null,
      createdAt: new Date(),
    };
    rows.push(row);
    return row;
  });

  return {
    prisma: {
      auditLog: { create },
    } as unknown as AuditPrisma,
    rows,
    _mocks: { create },
  };
}

describe('writeAuditLog (Phase 3 / AC-03)', () => {
  let m: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    m = makeMockPrisma();
  });

  it('ghi đủ 5 thành phần', async () => {
    await writeAuditLog({
      prisma: m.prisma,
      actor: {
        id: 'u-1',
        role: 'ADMIN',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        name: 'Admin',
      },
      entityType: 'Ticket',
      entityId: 't-1',
      action: 'STATE_TRANSITION',
      diff: { before: { status: 'PENDING' }, after: { status: 'APPROVED' } },
      reason: 'OK duyệt',
      metadata: { fromAction: 'APPROVE_HR' },
    });

    expect(m._mocks.create).toHaveBeenCalledTimes(1);
    const call = m._mocks.create.mock.calls[0][0];
    expect(call.data).toMatchObject({
      actorId: 'u-1',
      actorRole: 'ADMIN',
      entityType: 'Ticket',
      entityId: 't-1',
      action: 'STATE_TRANSITION',
      reason: 'OK duyệt',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
    });
    expect(call.data.diff).toEqual({
      before: { status: 'PENDING' },
      after: { status: 'APPROVED' },
    });
    expect(call.data.metadata).toEqual({ fromAction: 'APPROVE_HR' });
  });

  it('custom logger override', async () => {
    const customLogger = vi.fn(async (prisma, row) => {
      // Bỏ qua DB, giả lập thêm side-effect
      return { id: 'custom', createdAt: new Date(), ...row } as any;
    });

    await writeAuditLog({
      prisma: m.prisma,
      actor: { id: 'u-1', role: 'ADMIN' },
      entityType: 'Ticket',
      entityId: 't-1',
      action: 'CREATE',
      diff: { before: null, after: { id: 't-1' } },
      customLogger,
    });

    expect(customLogger).toHaveBeenCalledTimes(1);
    expect(m._mocks.create).not.toHaveBeenCalled();
  });

  it('null reason/ip/ua khi actor không có', async () => {
    await writeAuditLog({
      prisma: m.prisma,
      actor: { id: 'u-1', role: 'SYSTEM' }, // thiếu ip/ua
      entityType: 'Ticket',
      entityId: 't-1',
      action: 'CREATE',
      diff: { before: null, after: { id: 't-1' } },
    });

    const call = m._mocks.create.mock.calls[0][0];
    expect(call.data.reason).toBeNull();
    expect(call.data.ipAddress).toBeNull();
    expect(call.data.userAgent).toBeNull();
  });
});
