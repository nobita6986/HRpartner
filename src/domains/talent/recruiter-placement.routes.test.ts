/**
 * src/domains/talent/recruiter-placement.routes.test.ts
 *
 * P1-A0.4 R3-B03 — Recruiter-scoped Placement route unit tests.
 *
 * The route delegates to `recruiterPlacementCreate` (the recruiter-scoped
 * production adapter). The adapter runs the dual-authority predicate
 * (order assignment ACTIVE + handling claim ACTIVE) before invoking the
 * canonical PlacementCase/Placement service.
 *
 * These tests mock the adapter + the Idempotency wrapper + the auth/db
 * context so we can assert role-gate, idempotency, body validation, and
 * error envelope mapping without a database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = { rows: new Map<string, { requestHash: string; response: unknown; statusCode: number; expiresAt: Date }>() };

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(() => ({ marker: 'db' })),
  withDbContext: vi.fn(),
  recruiterPlacementCreate: vi.fn(),
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', async (original) => {
  const actual = await original<typeof import('@/src/shared/auth/auth-context')>();
  return { ...actual, getAuthContext: mocks.getAuthContext };
});
vi.mock('@/src/shared/auth/with-db-context', () => ({ withDbContext: mocks.withDbContext }));
vi.mock('@/src/domains/talent/recruiter-placement.adapter', async (original) => {
  const actual = await original<typeof import('@/src/domains/talent/recruiter-placement.adapter')>();
  return { ...actual, recruiterPlacementCreate: mocks.recruiterPlacementCreate };
});

import { AuthSessionError } from '@/src/shared/auth/auth-context';
import { RecruiterAssignmentError } from '@/src/domains/talent/recruiter-assignment.service';
import { POST } from '@/app/api/admin/recruiter/placements/route';

function fakeTx() {
  return {
    idempotencyKey: {
      findUnique: vi.fn(async ({ where }: { where: { uq_idempotency_keys_scope: { actorId: string; route: string; key: string } } }) => {
        const s = where.uq_idempotency_keys_scope;
        return store.rows.get(`${s.actorId}|${s.route}|${s.key}`) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { actorId: string; route: string; key: string; requestHash: string; response: unknown; statusCode: number; expiresAt: Date } }) => {
        const id = `${data.actorId}|${data.route}|${data.key}`;
        if (store.rows.has(id)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        store.rows.set(id, { requestHash: data.requestHash, response: data.response, statusCode: data.statusCode, expiresAt: data.expiresAt });
        return data;
      }),
    },
  };
}

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111';
const IDEM_KEY = '22222222-2222-4222-8222-222222222222';
const PLACEMENT_ID = 'placement-xyz';

function postReq(body: unknown, headers: Record<string, string> = { 'idempotency-key': IDEM_KEY }) {
  return new NextRequest('http://localhost/api/admin/recruiter/placements', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  mocks.getAuthContext.mockResolvedValue({ userId: 'rec-1', role: 'HR_STAFF' });
  mocks.withDbContext.mockImplementation(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()));
  mocks.recruiterPlacementCreate.mockResolvedValue({
    placementId: PLACEMENT_ID,
    placementCaseId: 'case-1',
    staffingOrderId: 'ord-1',
    laborProfileId: 'lp-1',
    jobOpeningId: 'op-1',
    status: 'SELECTED',
    replayed: false,
  });
});

describe('POST /api/admin/recruiter/placements — recruiter-scoped adapter (B-03)', () => {
  it('returns 401 before opening a DB context', async () => {
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'Missing token'));
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(res.status).toBe(401);
    expect(mocks.withDbContext).not.toHaveBeenCalled();
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'PM', 'SALE', 'VENDOR_ADMIN', 'CTV', 'WORKER'])(
    'returns 403 ROLE_NOT_PERMITTED for %s (recruiter-scoped path is HR_STAFF only)',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u-1', role });
      const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: 'ROLE_NOT_PERMITTED' });
      expect(mocks.withDbContext).not.toHaveBeenCalled();
      expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed body with 400', async () => {
    const req = new NextRequest('http://localhost/api/admin/recruiter/placements', {
      method: 'POST',
      body: 'not-json',
      headers: { 'content-type': 'application/json', 'idempotency-key': IDEM_KEY },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it('rejects missing sourceCandidateSubmissionId with 400', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it('rejects non-UUID v4 sourceCandidateSubmissionId with 400', async () => {
    const res = await POST(postReq({ sourceCandidateSubmissionId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it('rejects missing Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }, {}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed Idempotency-Key with 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
    const res = await POST(
      postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }, { 'idempotency-key': 'not-a-uuid' }),
    );
    expect(res.status).toBe(400);
    expect(mocks.recruiterPlacementCreate).not.toHaveBeenCalled();
  });

  it('happy path: HR_STAFF reaches the adapter, adapter returns SELECTED placement', async () => {
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({
      placement: {
        placementId: PLACEMENT_ID,
        status: 'SELECTED',
        staffingOrderId: 'ord-1',
        laborProfileId: 'lp-1',
        jobOpeningId: 'op-1',
      },
      replayed: false,
    });
    expect(mocks.recruiterPlacementCreate).toHaveBeenCalledOnce();
    const adapterInput = mocks.recruiterPlacementCreate.mock.calls[0][1];
    expect(adapterInput).toMatchObject({
      sourceCandidateSubmissionId: SUBMISSION_ID,
      actorId: 'rec-1',
      actorRole: 'HR_STAFF',
    });
  });

  it('passes through recruiter authority errors with their canonical HTTP status', async () => {
    mocks.recruiterPlacementCreate.mockRejectedValue(
      new RecruiterAssignmentError('NO_ACTIVE_ORDER_ASSIGNMENT', 'Order assignment not active', 403, {
        reason: 'assignment_revoked',
      }),
    );
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: 'NO_ACTIVE_ORDER_ASSIGNMENT',
      details: { reason: 'assignment_revoked' },
    });
  });

  it('passes through missing submission as 404 NO_ACTIVE_ASSIGNMENT', async () => {
    mocks.recruiterPlacementCreate.mockRejectedValue(
      new RecruiterAssignmentError('NO_ACTIVE_ASSIGNMENT', 'Submission not found', 404, {
        reason: 'submission_not_found',
      }),
    );
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: 'NO_ACTIVE_ASSIGNMENT',
      details: { reason: 'submission_not_found' },
    });
  });

  it('replays the same Idempotency-Key without re-invoking the adapter', async () => {
    const r1 = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(r1.status).toBe(201);
    const r2 = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(r2.status).toBe(201);
    expect(await r2.json()).toMatchObject({ replayed: true });
    expect(mocks.recruiterPlacementCreate).toHaveBeenCalledOnce();
  });

  it('returns 409 IDEMPOTENCY_CONFLICT for same key with different submissionId', async () => {
    await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    const otherId = '33333333-3333-4333-8333-333333333333';
    const res = await POST(postReq({ sourceCandidateSubmissionId: otherId }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'IDEMPOTENCY_CONFLICT' });
  });

  it('does not burn the idempotency key on adapter failure', async () => {
    mocks.recruiterPlacementCreate.mockRejectedValueOnce(
      new RecruiterAssignmentError('NO_ACTIVE_ASSIGNMENT', 'Submission not found', 404),
    );
    const failed = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(failed.status).toBe(404);
    expect(store.rows.size).toBe(0);

    // Successful retry with same key
    mocks.recruiterPlacementCreate.mockResolvedValueOnce({
      placementId: PLACEMENT_ID,
      placementCaseId: 'case-1',
      staffingOrderId: 'ord-1',
      laborProfileId: 'lp-1',
      jobOpeningId: 'op-1',
      status: 'SELECTED',
      replayed: false,
    });
    const retry = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(retry.status).toBe(201);
  });

  it('maps unexpected failure to 500 INTERNAL without leaking internals', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.recruiterPlacementCreate.mockRejectedValue(new Error('connection reset'));
    const res = await POST(postReq({ sourceCandidateSubmissionId: SUBMISSION_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: 'INTERNAL', message: 'Failed to create placement' });
    spy.mockRestore();
  });
});
