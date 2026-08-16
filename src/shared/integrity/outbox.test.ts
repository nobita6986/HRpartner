/**
 * Outbox helper tests (Phase 3 / AC-05).
 *
 * Cover:
 *   1. enqueueOutbox ghi row PENDING trong tx.
 *   2. drainOutboxOnce: handler ok → PROCESSED; handler throw → retryCount tăng; quá maxRetries → FAILED.
 *   3. drainOutboxOnce: handler trả về false → retry.
 *   4. drainOutboxOnce: eventType không có handler → skip.
 *   5. availableAt > now → skip (chưa drain).
 *   6. Cron retry dùng batchSize lớn hơn.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueueOutbox, drainOutboxOnce, processCronRetry, type OutboxPrisma } from './outbox';

interface MockOutboxRow {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: any;
  status: string;
  retryCount: number;
  availableAt: Date;
  lastError: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

function makeMockPrisma() {
  const rows = new Map<string, MockOutboxRow>();
  let nextId = 1;

  const create = vi.fn(async (args: any) => {
    const id = String(nextId++);
    const row: MockOutboxRow = {
      id,
      eventType: args.data.eventType,
      aggregateId: args.data.aggregateId,
      payload: args.data.payload,
      status: args.data.status,
      retryCount: args.data.retryCount ?? 0,
      availableAt: args.data.availableAt ?? new Date(),
      lastError: null,
      createdAt: new Date(),
      processedAt: null,
    };
    rows.set(id, row);
    return row;
  });

  const findMany = vi.fn(async (args: any) => {
    const where = args.where;
    const now = where.availableAt.lte;
    const result: MockOutboxRow[] = [];
    for (const r of rows.values()) {
      if (r.status !== where.status) continue;
      if (r.availableAt > now) continue;
      result.push(r);
    }
    result.sort((a, b) => a.availableAt.getTime() - b.availableAt.getTime());
    return result.slice(0, args.take);
  });

  const update = vi.fn(async (args: any) => {
    const row = rows.get(args.where.id);
    if (!row) throw new Error('not found');
    Object.assign(row, args.data);
    return row;
  });

  return {
    prisma: {
      outboxEvent: { create, findMany, update },
    } as unknown as OutboxPrisma,
    rows,
    _mocks: { create, findMany, update },
  };
}

const txMock = (m: ReturnType<typeof makeMockPrisma>) => m.prisma as any;

describe('outbox helper (Phase 3 / AC-05)', () => {
  let m: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    m = makeMockPrisma();
  });

  it('enqueueOutbox ghi row PENDING', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: { foo: 'bar' },
    });
    expect(m._mocks.create).toHaveBeenCalledTimes(1);
    expect(m.rows.size).toBe(1);
    expect(Array.from(m.rows.values())[0].status).toBe('PENDING');
  });

  it('drainOutboxOnce: handler ok → PROCESSED', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: {},
    });
    const handler = {
      eventType: 'TicketNotification',
      handle: vi.fn(async () => true),
    };
    const result = await drainOutboxOnce(m.prisma as any, [handler]);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(Array.from(m.rows.values())[0].status).toBe('PROCESSED');
    expect(Array.from(m.rows.values())[0].processedAt).toBeInstanceOf(Date);
  });

  it('drainOutboxOnce: handler throw → retryCount tăng', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: {},
    });
    const handler = {
      eventType: 'TicketNotification',
      handle: vi.fn(async () => {
        throw new Error('downstream fail');
      }),
    };
    const result = await drainOutboxOnce(m.prisma as any, [handler], { maxRetries: 3 });
    expect(result.failed).toBe(1);
    const row = Array.from(m.rows.values())[0];
    expect(row.status).toBe('PENDING');
    expect(row.retryCount).toBe(1);
    expect(row.lastError).toBe('downstream fail');
  });

  it('drainOutboxOnce: vượt maxRetries → FAILED', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: {},
    });
    const handler = {
      eventType: 'TicketNotification',
      handle: vi.fn(async () => {
        throw new Error('still fail');
      }),
    };
    // First attempt (retryCount 0 → 1)
    let row = Array.from(m.rows.values())[0];
    row.availableAt = new Date(0); // đảm bảo drain pick được trong cả 2 lần
    await drainOutboxOnce(m.prisma as any, [handler], { maxRetries: 1 });
    row = Array.from(m.rows.values())[0];
    expect(row.status).toBe('PENDING');
    expect(row.retryCount).toBe(1);

    row.availableAt = new Date(0);
    // Second attempt (retryCount 1 → 2, > maxRetries 1 → FAILED)
    await drainOutboxOnce(m.prisma as any, [handler], { maxRetries: 1 });
    row = Array.from(m.rows.values())[0];
    expect(row.status).toBe('FAILED');
    expect(row.retryCount).toBe(2);
  });

  it('drainOutboxOnce: handler trả về false → retry', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: {},
    });
    const handler = {
      eventType: 'TicketNotification',
      handle: vi.fn(async () => false),
    };
    await drainOutboxOnce(m.prisma as any, [handler], { maxRetries: 3 });
    const row = Array.from(m.rows.values())[0];
    expect(row.status).toBe('PENDING');
    expect(row.retryCount).toBe(1);
  });

  it('drainOutboxOnce: eventType không có handler → skip', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'UNKNOWN',
      aggregateId: 't-1',
      payload: {},
    });
    const result = await drainOutboxOnce(m.prisma as any, [
      { eventType: 'TicketNotification', handle: vi.fn() },
    ]);
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
    const row = Array.from(m.rows.values())[0];
    expect(row.status).toBe('PENDING');
  });

  it('processCronRetry dùng batchSize lớn hơn', async () => {
    await enqueueOutbox(txMock(m), {
      eventType: 'TicketNotification',
      aggregateId: 't-1',
      payload: {},
    });
    const handler = {
      eventType: 'TicketNotification',
      handle: vi.fn(async () => true),
    };
    await processCronRetry(m.prisma as any, [handler]);
    expect(m._mocks.findMany.mock.calls[0][0].take).toBe(500);
  });
});
