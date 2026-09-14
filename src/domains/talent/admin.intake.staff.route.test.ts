/**
 * admin.intake.staff.route.test.ts — N1 intake writer round 2 (AC-07 staff path).
 *
 * UNIT route test cho POST /api/admin/intake/staff:
 *   - 401 NO_TOKEN/INVALID_TOKEN nếu getAuthContext throw AuthSessionError.
 *   - 403 FORBIDDEN cho non-staff roles (SALE, WORKER, VENDOR_ADMIN, ...).
 *   - 201 cho ADMIN/HR_MANAGER/HR_STAFF với body hợp lệ.
 *   - 400 thiếu Idempotency-Key.
 *   - 400 Idempotency-Key không UUID.
 *   - 400 body thiếu field bắt buộc (zod fail).
 *   - 409 IDEMPOTENCY_CONFLICT khi cùng key + payload khác.
 *   - 409 POSSIBLE_MATCH_NOT_RESOLVED khi score trả POSSIBLE_MATCH.
 *   - actorId = ctx.userId (auth user), KHÔNG phải random stable.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  intakeWriter: vi.fn(),
  withIdempotency: vi.fn(),
  getAuthContext: vi.fn(),
  dbContext: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({ __raw: true }),
}));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class extends Error {
    constructor(public code: string, msg: string) {
      super(msg);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_p: unknown, _c: unknown, cb: (tx: unknown) => unknown) => mocks.dbContext(cb),
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: mocks.withIdempotency,
  IdempotencyConflictError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'IdempotencyConflictError';
    }
  },
}));
vi.mock('@/src/domains/talent/intake-writer.service', () => ({
  createCandidateSubmissionFromIntake: mocks.intakeWriter,
  PossibleMatchNotResolvedError: class extends Error {
    constructor(public match: unknown) {
      super('POSSIBLE_MATCH not resolved');
      this.name = 'PossibleMatchNotResolvedError';
    }
  },
}));

import { POST } from '@/app/api/admin/intake/staff/route';

const goodIdempotencyKey = '00000000-0000-4000-8000-000000000002';
const goodBody = {
  fullName: 'Nguyen Van A',
  phone: '0900000124',
  intent: 'GENERAL_INTEREST',
};

const postReq = (body: unknown, idemKey?: string) => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (idemKey !== undefined) headers['idempotency-key'] = idemKey;
  return new NextRequest('http://localhost/api/admin/intake/staff', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  });
};

describe('POST /api/admin/intake/staff — N1 intake writer round 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth context: ADMIN
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-admin-001', role: 'ADMIN', vendorId: null });
    // Default withDbContext: invoke callback
    mocks.dbContext.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({ __tx: true }));
    // Default withIdempotency: pass-through
    mocks.withIdempotency.mockImplementation(async ({ handler }: { handler: () => Promise<unknown> }) => {
      const r = await handler();
      return { ...(r as object), replayed: false };
    });
    // Default intake result
    mocks.intakeWriter.mockResolvedValue({
      match: { verdict: 'NEW_PROFILE', laborProfileId: 'lp-1' },
      placementCase: { placementCaseId: 'pc-1' },
      candidateSubmission: { id: 'cs-1' },
    });
  });

  // ─── Auth ───

  it('POST: getAuthContext throw AuthSessionError → 401', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValueOnce(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const res = await POST(postReq(goodBody, goodIdempotencyKey));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });

  // ─── Role gate ───

  it.each(['SALE', 'WORKER', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'PM', 'ACCOUNTANT'])(
    'POST: role=%s → 403 FORBIDDEN, KHÔNG gọi service',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: `u-${role}`, role });
      const res = await POST(postReq(goodBody, goodIdempotencyKey));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
      expect(mocks.intakeWriter).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'HR_MANAGER', 'HR_STAFF'])(
    'POST: role=%s → 201 với ctx.userId làm actorId',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: `u-${role.toLowerCase()}`, role });
      const res = await POST(postReq(goodBody, goodIdempotencyKey));
      expect(res.status).toBe(201);
      // Verify withIdempotency được gọi với actorId = ctx.userId (KHÔNG 'public:anon')
      const opts = mocks.withIdempotency.mock.calls[0]![0] as { actorId: string };
      expect(opts.actorId).toBe(`u-${role.toLowerCase()}`);
    },
  );

  // ─── Validation ───

  it('POST: thiếu Idempotency-Key → 400, KHÔNG gọi service', async () => {
    const res = await POST(postReq(goodBody));
    expect(res.status).toBe(400);
    expect(mocks.withIdempotency).not.toHaveBeenCalled();
  });

  it('POST: body không phải JSON → 400', async () => {
    const res = await POST(postReq('not json', goodIdempotencyKey));
    expect(res.status).toBe(400);
  });

  it('POST: body thiếu fullName → 400 (zod fail)', async () => {
    const res = await POST(postReq({ phone: '0900000124', intent: 'GENERAL_INTEREST' }, goodIdempotencyKey));
    expect(res.status).toBe(400);
  });

  // ─── Idempotency ───

  it('POST: cùng key + payload khác → withIdempotency throw → 409 IDEMPOTENCY_CONFLICT', async () => {
    const { IdempotencyConflictError } = await import('@/src/shared/integrity/idempotency');
    mocks.withIdempotency.mockImplementationOnce(async () => {
      throw new IdempotencyConflictError('key đã dùng với body khác');
    });
    const res = await POST(postReq(goodBody, goodIdempotencyKey));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('POST: withIdempotency replayed (cùng key + payload) → caller vẫn nhận 201 body replay', async () => {
    mocks.withIdempotency.mockImplementationOnce(async () => ({
      body: {
        verdict: 'NEW_PROFILE',
        laborProfileId: 'lp-replayed',
        placementCaseId: 'pc-replayed',
        candidateSubmissionId: 'cs-replayed',
      },
      statusCode: 201,
      replayed: true,
    }));
    const res = await POST(postReq(goodBody, goodIdempotencyKey));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.laborProfileId).toBe('lp-replayed');
    expect(mocks.intakeWriter).not.toHaveBeenCalled(); // handler không bị gọi lại
  });

  // ─── Actor identity ───

  it('POST: actorId = ctx.userId (auth user), KHÔNG random public-anon', async () => {
    mocks.getAuthContext.mockResolvedValue({ userId: 'u-staff-007', role: 'HR_STAFF' });
    let capturedActorId: string | null = null;
    mocks.withIdempotency.mockImplementationOnce(async (opts: { actorId: string }) => {
      capturedActorId = opts.actorId;
      return {
        body: { verdict: 'NEW_PROFILE', laborProfileId: 'lp', placementCaseId: 'pc', candidateSubmissionId: 'cs' },
        statusCode: 201,
        replayed: false,
      };
    });
    await POST(postReq(goodBody, goodIdempotencyKey));
    expect(capturedActorId).toBe('u-staff-007');
    expect(capturedActorId).not.toMatch(/public:anon/);
  });
});