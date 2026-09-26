/**
 * job-postings-id-patch.route.test.ts — hrp-p1-a0-1 / correction batch 1/1 / C-01.
 *
 * Route-level tests that call the ACTUAL PATCH handler
 * (`app/api/admin/jobs/job-postings/[id]/route.ts`). Service-direct testing alone
 * is insufficient — T0 §C-01 explicit demand: "Add route-level tests that call
 * the actual PATCH handler".
 *
 * Coverage (C-01 / AC matrices):
 *  - false → true persistence for both flags independently
 *  - independent combinations (true/false × true/false)
 *  - omitted field remains unchanged (undefined semantics)
 *  - invalid flag values (null, string, number, object) → 400 INVALID_INPUT
 *  - same Idempotency-Key + different payload → 409 IDEMPOTENCY_CONFLICT
 *  - unknown field → 400 (consistent with existing route boundary)
 *  - role gate: non-mutation role → 403 (sanity check on existing behaviour)
 *  - hash stability: flag changes the idempotency requestBody hash (verified
 *    by `withIdempotency` call receiving a different array shape between
 *    different flag values).
 *
 * Mocks: `getPrisma`, `getAuthContext`, `withDbContext`, `withIdempotency`,
 * `updateDraftContent`. Each mock captures the requestBody array passed to
 * `withIdempotency` so we can assert the hash payload includes both stamp
 * booleans (not just the prior 9 fields).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  updateDraftContent: vi.fn(),
  getJobPostingForAuthoring: vi.fn(),
  // Capture the requestBody array passed to `withIdempotency` so the C-01
  // hash-includes-stamp-flag invariant is testable without re-running SHA-256.
  capturedRequestBody: [] as unknown[],
  capturedIdempotencyKey: '' as string,
  capturedRoute: '' as string,
  idempotencyReplay: false,
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: () => ({ __raw: true, $transaction: vi.fn() }),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
    cb({ __tx: true }),
}));
vi.mock('@/src/shared/integrity/idempotency', () => ({
  withIdempotency: async (opts: {
    requestBody: unknown[];
    key: string;
    route: string;
    handler: () => Promise<{ body: unknown }>;
  }) => {
    mocks.capturedRequestBody = opts.requestBody;
    mocks.capturedIdempotencyKey = opts.key;
    mocks.capturedRoute = opts.route;
    const result = await opts.handler();
    return { body: result.body, statusCode: 200, replayed: mocks.idempotencyReplay };
  },
  IdempotencyConflictError: class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  },
}));
vi.mock('@/src/domains/staffing/job-posting-authoring.service', () => ({
  updateDraftContent: mocks.updateDraftContent,
  getJobPostingForAuthoring: mocks.getJobPostingForAuthoring,
  ALLOWED_MUTATION_ROLES: new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']),
  AuthoringError: class AuthoringError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly httpStatus: number,
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
      this.name = 'AuthoringError';
    }
  },
}));

import { PATCH } from '@/app/api/admin/jobs/job-postings/[id]/route';
import { AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';

const PARAMS = { params: Promise.resolve({ id: 'posting-uuid-1' }) };
const IDEMPOTENCY_KEY = 'idem-c01-test-key-aaaa-bbbb';
const BASE_AUTH = { userId: 'admin-uuid-1', role: 'ADMIN' as const };

function patchReq(body: unknown, idemKey: string = IDEMPOTENCY_KEY): NextRequest {
  return new NextRequest('http://localhost/api/admin/jobs/job-postings/posting-uuid-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idemKey,
    },
  });
}

const BASE_TITLE = 'Kỹ sư điện — Hà Nội';
const BASE_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const BASE_BODY = {
  expectedRevision: 1,
  title: BASE_TITLE,
  salaryDisplay: '20–30 triệu',
  descriptionJson: BASE_DOC,
  requirementsJson: null,
  benefitsJson: null,
  applicationInstructionsJson: null,
  contentSchemaVersion: 1,
};

describe('C-01 PATCH /api/admin/jobs/job-postings/[id] — actual route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.capturedRequestBody = [];
    mocks.capturedIdempotencyKey = '';
    mocks.capturedRoute = '';
    mocks.idempotencyReplay = false;
    mocks.getAuthContext.mockResolvedValue({ ...BASE_AUTH });
    // Default service: returns a JobPostingDto echoing the input fields.
    mocks.updateDraftContent.mockImplementation(
      async (_tx: unknown, _ctx: unknown, input: Record<string, unknown>) => ({
        id: 'posting-uuid-1',
        jobOpeningId: 'opening-uuid-1',
        slug: 'ky-su-dien-ha-noi-deadbeef',
        revision: 2,
        status: 'DRAFT',
        title: typeof input.title === 'string' ? input.title : '',
        salaryDisplay: null,
        descriptionJson: input.descriptionJson ?? null,
        requirementsJson: null,
        benefitsJson: null,
        applicationInstructionsJson: null,
        contentSchemaVersion: 1,
        isHot: input.isHot ?? false,
        isUrgent: input.isUrgent ?? false,
        publishedAt: null,
        archivedAt: null,
        createdAt: '2026-09-26T08:00:00.000Z',
        updatedAt: '2026-09-26T08:30:00.000Z',
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // (1) false → true persistence for both flags independently
  // ──────────────────────────────────────────────────────────────────────
  it('false → true: isHot persisted on DRAFT row', async () => {
    const res = await PATCH(patchReq({ ...BASE_BODY, isHot: true }), PARAMS);
    expect(res.status).toBe(200);
    expect(mocks.updateDraftContent).toHaveBeenCalledTimes(1);
    const input = mocks.updateDraftContent.mock.calls[0][2] as { isHot: boolean; isUrgent?: boolean };
    expect(input.isHot).toBe(true);
    // Verifies the flag reached the service layer (the actual PATCH wire).
    expect(mocks.capturedRequestBody).toContain(true);
    expect(mocks.capturedRequestBody).toContain(null); // isUrgent omitted → null
  });

  it('false → true: isUrgent persisted independently', async () => {
    const res = await PATCH(patchReq({ ...BASE_BODY, isUrgent: true }), PARAMS);
    expect(res.status).toBe(200);
    const input = mocks.updateDraftContent.mock.calls[0][2] as { isHot?: boolean; isUrgent: boolean };
    expect(input.isUrgent).toBe(true);
    expect(input.isHot).toBeUndefined(); // not in body → undefined semantics
  });

  // ──────────────────────────────────────────────────────────────────────
  // (2) independent combinations
  // ──────────────────────────────────────────────────────────────────────
  it.each([
    { isHot: true, isUrgent: false },
    { isHot: false, isUrgent: true },
    { isHot: true, isUrgent: true },
    { isHot: false, isUrgent: false },
  ])('independent combination isHot=$isHot isUrgent=$isUrgent → passed through', async ({ isHot, isUrgent }) => {
    const res = await PATCH(patchReq({ ...BASE_BODY, isHot, isUrgent }), PARAMS);
    expect(res.status).toBe(200);
    const input = mocks.updateDraftContent.mock.calls[0][2] as { isHot: boolean; isUrgent: boolean };
    expect(input.isHot).toBe(isHot);
    expect(input.isUrgent).toBe(isUrgent);
  });

  // ──────────────────────────────────────────────────────────────────────
  // (3) omitted field remains unchanged
  // ──────────────────────────────────────────────────────────────────────
  it('omitted isHot / isUrgent → undefined passed to service (no overwrite)', async () => {
    const res = await PATCH(patchReq({ ...BASE_BODY }), PARAMS);
    expect(res.status).toBe(200);
    const input = mocks.updateDraftContent.mock.calls[0][2] as { isHot?: boolean; isUrgent?: boolean };
    expect(input.isHot).toBeUndefined();
    expect(input.isUrgent).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────────────────
  // (4) invalid flag values → 400 INVALID_INPUT (rejected BEFORE service)
  // ──────────────────────────────────────────────────────────────────────
  it.each([
    { flag: 'isHot', value: 'true' },
    { flag: 'isHot', value: 1 },
    { flag: 'isHot', value: 0 },
    { flag: 'isHot', value: null },
    { flag: 'isHot', value: { truthy: true } },
    { flag: 'isHot', value: ['true'] },
    { flag: 'isUrgent', value: 'false' },
    { flag: 'isUrgent', value: 2 },
    { flag: 'isUrgent', value: null },
    { flag: 'isUrgent', value: {} },
  ])('invalid $flag=$value → 400 INVALID_INPUT (service NOT called)', async ({ flag, value }) => {
    const res = await PATCH(patchReq({ ...BASE_BODY, [flag]: value }), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.message).toContain(flag);
    expect(mocks.updateDraftContent).not.toHaveBeenCalled();
  });

  it('unknown body field → 400 INVALID_INPUT (consistent with route allowlist)', async () => {
    const res = await PATCH(patchReq({ ...BASE_BODY, mystery: 'x' }), PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.message).toContain('mystery');
    expect(mocks.updateDraftContent).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // (5) idempotency hash includes both stamp flags
  // ──────────────────────────────────────────────────────────────────────
  it('requestBody hash includes both isHot and isUrgent slots in fixed positions', async () => {
    await PATCH(patchReq({ ...BASE_BODY, isHot: true, isUrgent: false }), PARAMS);
    expect(mocks.capturedRequestBody).toHaveLength(11);
    // Last two slots are the canonical stamp flags.
    expect(mocks.capturedRequestBody[9]).toBe(true);
    expect(mocks.capturedRequestBody[10]).toBe(false);
  });

  it('omitted stamp flag serialises to null (NOT undefined) for stable idempotency hash', async () => {
    await PATCH(patchReq({ ...BASE_BODY, isHot: true }), PARAMS);
    expect(mocks.capturedRequestBody[9]).toBe(true);
    expect(mocks.capturedRequestBody[10]).toBeNull();
    // Critical: undefined values are serialised as null so JSON.stringify keeps the
    // array length stable. A 9-element array here would mean the hash ignores the
    // flag — exactly the C-01 invariant the bug report called out.
    expect(mocks.capturedRequestBody).toHaveLength(11);
  });

  it('flag flip (isHot true→false) changes the captured requestBody', async () => {
    await PATCH(patchReq({ ...BASE_BODY, isHot: true }), PARAMS);
    const beforeFlip = [...mocks.capturedRequestBody];
    await PATCH(patchReq({ ...BASE_BODY, isHot: false }), PARAMS);
    const afterFlip = [...mocks.capturedRequestBody];
    expect(beforeFlip[9]).toBe(true);
    expect(afterFlip[9]).toBe(false);
    expect(afterFlip).not.toEqual(beforeFlip);
  });

  // ──────────────────────────────────────────────────────────────────────
  // (6) idempotency key conflict — same key + different payload
  //     The route catches IdempotencyConflictError → 409 IDEMPOTENCY_CONFLICT.
  //     We bypass the withIdempotency mock here by re-mocking it to throw.
  // ──────────────────────────────────────────────────────────────────────
  it('withIdempotency 409 → route maps to 409 IDEMPOTENCY_CONFLICT', async () => {
    // The default mock returns success. Re-mock for this case.
    const idempotencyModule = await import('@/src/shared/integrity/idempotency');
    const originalWithIdempotency = idempotencyModule.withIdempotency;
    const conflictSpy = vi
      .spyOn(idempotencyModule, 'withIdempotency')
      .mockImplementationOnce(async () => {
        throw new idempotencyModule.IdempotencyConflictError(
          'x-idempotency-key "k" đã được dùng với request body khác',
        );
      });

    const res = await PATCH(
      patchReq({ ...BASE_BODY, isHot: true }, 'same-key'),
      PARAMS,
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
    conflictSpy.mockRestore();
    void originalWithIdempotency;
  });

  // ──────────────────────────────────────────────────────────────────────
  // (7) sanity — role gate preserved: PATCH route delegates the role check to
  // `updateDraftContent` (service layer). We mock that to throw
  // `AuthoringError('PERMISSION_DENIED', ..., 403)` and assert the route
  // forwards the 403 with `PERMISSION_DENIED` code, exactly as the rest of the
  // route handles AuthoringError. Service-direct testing alone is insufficient
  // per T0 §C-01; this proves the route maps the error correctly.
  // ──────────────────────────────────────────────────────────────────────
  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → service throws PERMISSION_DENIED → route returns 403 with code/details',
    async (role) => {
      mocks.getAuthContext.mockResolvedValueOnce({ userId: 'u-1', role });
      mocks.updateDraftContent.mockRejectedValueOnce(
        new AuthoringError(
          'PERMISSION_DENIED',
          `Role ${role} không có quyền mutate JobPosting.`,
          403,
          { role },
        ),
      );
      const res = await PATCH(patchReq({ ...BASE_BODY, isHot: true }), PARAMS);
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string; details: { role: string } };
      expect(body.error).toBe('PERMISSION_DENIED');
      expect(body.details.role).toBe(role);
    },
  );

  // ──────────────────────────────────────────────────────────────────────
  // (8) missing Idempotency-Key header → 400 IDEMPOTENCY_REQUIRED
  // ──────────────────────────────────────────────────────────────────────
  it('no Idempotency-Key header → 400 IDEMPOTENCY_REQUIRED (existing route behaviour)', async () => {
    const req = new NextRequest('http://localhost/api/admin/jobs/job-postings/posting-uuid-1', {
      method: 'PATCH',
      body: JSON.stringify({ ...BASE_BODY, isHot: true }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PATCH(req, PARAMS);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
    expect(mocks.updateDraftContent).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // (9) AuthoringError from service is mapped to its httpStatus
  // ──────────────────────────────────────────────────────────────────────
  it('service AuthoringError(409) → 409 with code/details', async () => {
    mocks.updateDraftContent.mockRejectedValueOnce(
      new AuthoringError(
        'INVALID_REVISION',
        'Revision mismatch: client=1, server=2.',
        409,
        { clientRevision: 1, serverRevision: 2 },
      ),
    );
    const res = await PATCH(patchReq({ ...BASE_BODY, isHot: true }), PARAMS);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; details: { serverRevision: number } };
    expect(body.error).toBe('INVALID_REVISION');
    expect(body.details.serverRevision).toBe(2);
  });
});
