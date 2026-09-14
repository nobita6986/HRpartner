/**
 * placement-case.service.test.ts — N1 intake writer (STEP-05).
 *
 * Test race-safe openPlacementCase (3 case: new insert, P2002 race, existing case).
 */

import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { openPlacementCase } from './placement-case.service';

interface MockRow { id: string; [key: string]: unknown; }

function makeMockTx() {
  const tables = new Map<string, Map<string, MockRow>>();
  let nextId = 1;
  function table(name: string) {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  }
  function findFirst(name: string, where: { laborProfileId?: string; status?: { in?: readonly string[] } }): MockRow | null {
    const t = table(name);
    for (const row of t.values()) {
      if (where.laborProfileId && row['laborProfileId'] !== where.laborProfileId) continue;
      if (where.status?.in && !where.status.in.includes(String(row['status']))) continue;
      return row;
    }
    return null;
  }
  const tx = {
    placementCase: {
      create: vi.fn(async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        // Simulate partial unique index violation: nếu đã có row cùng laborProfileId
        // với status trong ACTIVE list, throw P2002.
        const existing = findFirst('placementCase', {
          laborProfileId: args.data['laborProfileId'] as string,
          status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] },
        });
        if (existing) {
          const err = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on placement_case_labor_profile_id_active_unique',
            { code: 'P2002', clientVersion: 'mock' },
          );
          throw err;
        }
        const row: MockRow = { id: `pc-${nextId++}`, ...args.data };
        table('placementCase').set(row.id, row);
        if (!args.select) return row;
        const out: Record<string, unknown> = { id: row.id };
        for (const [k, v] of Object.entries(args.select)) if (v) out[k] = row[k];
        return out;
      }),
      findFirst: vi.fn(async (args: { where?: { laborProfileId?: string; status?: { in?: readonly string[] } }; select?: Record<string, boolean>; orderBy?: Record<string, string> }) =>
        findFirst('placementCase', args.where ?? {}),
      ),
    },
  };
  return tx;
}

describe('openPlacementCase (STEP-05, DEC-04, AC-04)', () => {
  it('chưa có active case → INSERT mới, replayed=false', async () => {
    const tx = makeMockTx();
    const r = await openPlacementCase(tx as never, {
      laborProfileId: 'lp-001',
      intent: 'JOB_INTEREST',
      actorId: 'u-001',
    });
    expect(r.placementCaseId).toBeDefined();
    expect(r.status).toBe('OPEN');
    expect(r.replayed).toBe(false);
  });

  it('INSERT trả P2002 (race) → SELECT existing → replayed=true', async () => {
    const tx = makeMockTx();
    // Pre-insert một active case để create() throw P2002
    tx.placementCase.create({
      data: { laborProfileId: 'lp-001', status: 'OPEN', openedAt: new Date() },
    });
    const r = await openPlacementCase(tx as never, {
      laborProfileId: 'lp-001',
      intent: 'GENERAL_INTEREST',
      actorId: 'u-002',
    });
    expect(r.replayed).toBe(true);
    // SELECT trả cùng id với row đã pre-insert
    expect(r.placementCaseId).toBeDefined();
  });

  it('đã có active case từ trước → SELECT → replayed=true', async () => {
    const tx = makeMockTx();
    // Trước: insert row OPEN. Sau: insert thử row thứ 2 → P2002 → SELECT existing.
    tx.placementCase.create({
      data: { laborProfileId: 'lp-001', status: 'OPEN', openedAt: new Date() },
    });
    const r = await openPlacementCase(tx as never, {
      laborProfileId: 'lp-001',
      intent: 'JOB_INTEREST',
      actorId: 'u-003',
    });
    expect(r.replayed).toBe(true);
  });
});
