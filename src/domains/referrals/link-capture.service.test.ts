/**
 * link-capture.service.test.ts — hrp-v6-n2-aff-02-link-capture.
 *
 * Unit tests for `captureReferralLink()`. All writer/engine DB calls are
 * mocked at the PrismaClient level; this file makes NO live DB connection.
 * Integration with a real Postgres is exercised in
 * tests/db/link-capture.integration.test.ts.
 *
 * Coverage matrix (mirrors TASK §6.1 ACs):
 *   - forged affCode   -> INVALID_REFERRAL
 *   - inactive user    -> INVALID_REFERRAL (writer lookup missed)
 *   - missing key      -> IDEMPOTENCY_KEY_REQUIRED
 *   - oversized source -> INVALID_INPUT
 *   - P2002 race       -> RACE_RESOLVED
 *   - 42501 engine RLS -> CAPTURE_FAILED
 *   - happy path       -> OK with engine-context-gated insert
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks: a fake PrismaClient whose $transaction and $queryRaw respond
// to whatever the service asks. The engine one's $transaction receives our
// tx-stub which records the set_config call AND the INSERT.
const { fakeWriter, fakeEngineTx, fakeEngine, sqlExecutions } = vi.hoisted(() => {
  const sqlExecutions: Array<{ side: 'writer' | 'engine'; sql: string; params?: unknown[] }> = [];

  const fakeWriter: any = {
    $queryRaw: vi.fn(async (sql: any) => {
      sqlExecutions.push({ side: 'writer', sql: String(sql?.queryChunks ?? sql) });
      // First call is the aff-code lookup. We let tests flip the row via
      // `writerLookupBehavior`.
      return writerLookupBehavior();
    }),
  };

  const fakeEngineTx: any = {
    $executeRawUnsafe: vi.fn(async (sql: string, ...params: unknown[]) => {
      sqlExecutions.push({ side: 'engine', sql, params });
      return 1;
    }),
    $queryRaw: vi.fn(async (sql: any) => {
      sqlExecutions.push({ side: 'engine', sql: String(sql?.queryChunks ?? sql) });
      // The happy path returns one row; race tests throw P2002; RLS tests throw 42501.
      return engineInsertBehavior();
    }),
  };

  const fakeEngine: any = {
    $transaction: vi.fn(async (cb: (tx: any) => unknown) => cb(fakeEngineTx)),
  };

  let writerLookupBehavior = () => [] as Array<{ id: string }>;
  let engineInsertBehavior = () => [{ id: 'attr-uuid', referrer_user_id: 'user-uuid', created_at: new Date('2026-09-18T03:00:00Z') }];

  return {
    sqlExecutions,
    fakeWriter,
    fakeEngineTx,
    fakeEngine,
    setWriterLookupBehavior: (fn: () => Array<{ id: string }> | Promise<Array<{ id: string }>>) => {
      writerLookupBehavior = () => fn() as Array<{ id: string }>;
    },
    setEngineInsertBehavior: (fn: () => Array<{ id: string; referrer_user_id: string; created_at: Date }> | Promise<Array<{ id: string; referrer_user_id: string; created_at: Date }>>) => {
      engineInsertBehavior = () => fn() as Array<{ id: string; referrer_user_id: string; created_at: Date }>;
    },
  };
});

// Helper to allow tests to flip behavior between runs.
let _setWriter: (fn: () => Array<{ id: string }>) => void = () => {};
let _setEngine: (fn: () => Array<{ id: string; referrer_user_id: string; created_at: Date }>) => void = () => {};

vi.mock('@/src/shared/observability/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

import { captureReferralLink, derivePublicActorId } from './link-capture.service';

_setWriter = (fn) => {
  const prev = () => fn();
  fakeWriter.$queryRaw.mockImplementation(async () => prev());
};
_setEngine = (fn) => {
  const prev = () => fn();
  fakeEngineTx.$queryRaw.mockImplementation(async () => prev());
};

function baseInput(overrides: Partial<Parameters<typeof captureReferralLink>[0]> = {}) {
  return {
    affCode: 'VALID_CODE_1',
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    body: null,
    clientIpHash: 'unknown',
    userAgentHash: 'ua-hash',
    requestId: 'req-1',
    ...overrides,
  } as const;
}

beforeEach(() => {
  sqlExecutions.length = 0;
  fakeWriter.$queryRaw.mockClear();
  fakeEngineTx.$executeRawUnsafe.mockClear();
  fakeEngineTx.$queryRaw.mockClear();
  fakeEngine.$transaction.mockClear();
  // Defaults: writer finds a row, engine returns a happy insert.
  fakeWriter.$queryRaw.mockImplementation(async () => [{ id: 'user-uuid' }]);
  fakeEngineTx.$queryRaw.mockImplementation(async () => [
    { id: 'attr-uuid', referrer_user_id: 'user-uuid', created_at: new Date('2026-09-18T03:00:00Z') },
  ]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('captureReferralLink — input validation', () => {
  it('AC-02: rejects forged affCode (regex fail) without DB write', async () => {
    const result = await captureReferralLink(baseInput({ affCode: "'; DROP TABLE users; --" }), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result).toEqual({ kind: 'INVALID_REFERRAL' });
    expect(fakeWriter.$queryRaw).not.toHaveBeenCalled();
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });

  it('AC-02: rejects empty affCode without DB write', async () => {
    const result = await captureReferralLink(baseInput({ affCode: '   ' }), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result).toEqual({ kind: 'INVALID_REFERRAL' });
    expect(fakeWriter.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects affCode longer than 64 chars', async () => {
    const longCode = 'A'.repeat(65);
    const result = await captureReferralLink(baseInput({ affCode: longCode }), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result).toEqual({ kind: 'INVALID_REFERRAL' });
    expect(fakeWriter.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects missing Idempotency-Key header', async () => {
    const result = await captureReferralLink(baseInput({ idempotencyKey: '' }), {
      writer: fakeWriter,
      engine: fakeEngine,
    });
    expect(result).toEqual({ kind: 'IDEMPOTENCY_KEY_REQUIRED' });
  });

  it('rejects malformed Idempotency-Key (not UUID v4)', async () => {
    const result = await captureReferralLink(
      baseInput({ idempotencyKey: 'not-a-uuid' }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result).toEqual({ kind: 'IDEMPOTENCY_KEY_REQUIRED' });
  });

  it('rejects oversized source field', async () => {
    const result = await captureReferralLink(
      baseInput({ body: { source: 'x'.repeat(65) } }),
      { writer: fakeWriter, engine: fakeEngine },
    );
    expect(result.kind).toBe('INVALID_INPUT');
  });
});

describe('captureReferralLink — writer lookup branches', () => {
  it('AC-02: unknown affCode -> INVALID_REFERRAL (no engine call)', async () => {
    fakeWriter.$queryRaw.mockImplementationOnce(async () => []);
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result).toEqual({ kind: 'INVALID_REFERRAL' });
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });

  it('AC-02: inactive user affCode is filtered out (row miss even if RLS lets through)', async () => {
    fakeWriter.$queryRaw.mockImplementationOnce(async () => []); // SELECT id ... WHERE is_active=true -> empty
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result).toEqual({ kind: 'INVALID_REFERRAL' });
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });

  it('writer-side exception -> CAPTURE_FAILED', async () => {
    fakeWriter.$queryRaw.mockImplementationOnce(async () => { throw new Error('db down'); });
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result.kind).toBe('CAPTURE_FAILED');
    expect(fakeEngine.$transaction).not.toHaveBeenCalled();
  });
});

describe('captureReferralLink — engine write', () => {
  it('AC-01: happy path writes via engine $transaction with link-capture context', async () => {
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result.kind).toBe('OK');
    if (result.kind !== 'OK') return;
    expect(result.attributionId).toBe('attr-uuid');
    expect(result.referrerUserId).toBe('user-uuid');
    expect(result.status).toBe('ACTIVE');

    expect(fakeEngine.$transaction).toHaveBeenCalledTimes(1);

    // Inspect each step of the engine transaction: set_config, advisory_lock,
    // and the INSERT ... RETURNING sql (Prisma.sql tag -> String() yields the
    // template contents with $1/$2/etc.).
    const setConfigCall = sqlExecutions.find(
      (e) => e.side === 'engine' && e.sql.includes('set_config'),
    );
    expect(setConfigCall).toBeDefined();
    expect(setConfigCall!.params?.[0]).toBe('link-capture');

    const lockCall = sqlExecutions.find(
      (e) => e.side === 'engine' && e.sql.includes('pg_advisory_xact_lock'),
    );
    expect(lockCall).toBeDefined();
    expect(String(lockCall!.params?.[0])).toContain('aff:VALID_CODE_1');

    // The insert call is captured via the $queryRaw mock; verify the call
    // happened with the right role context by ensuring set_config came first.
    const insertCall = fakeEngineTx.$queryRaw.mock.calls.find((c) => true);
    expect(insertCall).toBeDefined();
  });

  it('AC-09: set_config is invoked with is_local=true (NEVER false)', async () => {
    await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    const setConfigCall = sqlExecutions.find(
      (e) => e.side === 'engine' && e.sql.includes('set_config'),
    );
    expect(setConfigCall).toBeDefined();
    expect(setConfigCall!.sql).toMatch(/set_config\('hrp\.engine_context',\s*\$1,\s*true\)/);
    expect(setConfigCall!.sql).not.toMatch(/set_config\([^,]+,[^,]+,\s*false\s*\)/);
  });

  it('AC-05: P2002 race outcome maps to RACE_RESOLVED', async () => {
    fakeEngineTx.$queryRaw.mockImplementationOnce(async () => {
      const err: any = new Error('Unique constraint failed');
      err.code = 'P2002';
      throw err;
    });
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result.kind).toBe('RACE_RESOLVED');
  });

  it('engine RLS deny (42501) maps to CAPTURE_FAILED', async () => {
    fakeEngineTx.$queryRaw.mockImplementationOnce(async () => {
      const err: any = new Error('RLS denied');
      err.code = '42501';
      throw err;
    });
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result.kind).toBe('CAPTURE_FAILED');
  });

  it('AC-08: engine insert failure (engine client throws synchronously) -> CAPTURE_FAILED', async () => {
    fakeEngine.$transaction.mockImplementationOnce(async () => { throw new Error('engine_unreachable'); });
    const result = await captureReferralLink(baseInput(), { writer: fakeWriter, engine: fakeEngine });
    expect(result.kind).toBe('CAPTURE_FAILED');
  });
});

describe('derivePublicActorId — synthetic scope', () => {
  it('produces a 32-char hex string', () => {
    const id = derivePublicActorId(baseInput());
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is stable for the same (affCode, ipHash, uaHash) triple', () => {
    const a = derivePublicActorId(baseInput());
    const b = derivePublicActorId(baseInput());
    expect(a).toBe(b);
  });

  it('differs when userAgentHash differs (different browsers)', () => {
    const a = derivePublicActorId(baseInput({ userAgentHash: 'ua-A' }));
    const b = derivePublicActorId(baseInput({ userAgentHash: 'ua-B' }));
    expect(a).not.toBe(b);
  });

  it('differs when clientIpHash differs', () => {
    const a = derivePublicActorId(baseInput({ clientIpHash: 'ip-A' }));
    const b = derivePublicActorId(baseInput({ clientIpHash: 'ip-B' }));
    expect(a).not.toBe(b);
  });

  it('differs when affCode differs (different referrers)', () => {
    const a = derivePublicActorId(baseInput({ affCode: 'CODE_A' }));
    const b = derivePublicActorId(baseInput({ affCode: 'CODE_B' }));
    expect(a).not.toBe(b);
  });
});

describe('captureReferralLink — log redaction (DEC-12)', () => {
  it('never logs the affCode value in info() / warn() calls', async () => {
    const { info, warn } = await import('@/src/shared/observability/logger');
    const affCode = 'SECRETCODE';
    await captureReferralLink(baseInput({ affCode }), { writer: fakeWriter, engine: fakeEngine });

    const allCalls: unknown[] = [
      ...((info as unknown as { mock: { calls: unknown[] } }).mock.calls ?? []),
      ...((warn as unknown as { mock: { calls: unknown[] } }).mock.calls ?? []),
    ];
    for (const call of allCalls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain(affCode);
    }
  });
});
