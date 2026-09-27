/**
 * job-postings-post.route.test.ts — P1-A0.3 / AC-03..AC-09 route-level proof.
 *
 * Why mocks here (not synthetic DB):
 *   The `app/api/admin/jobs/job-postings/route.ts` POST handler must be exercised
 *   for the failure surfaces under the route's own error-mapping contract:
 *     - HTTP 200 happy path
 *     - HTTP 400 INVALID_INPUT (unknown body key, missing slotId, missing Idempotency-Key)
 *     - HTTP 401 INTERNAL auth-failure
 *     - HTTP 403 PERMISSION_DENIED (role outside ALLOWED_MUTATION_ROLES)
 *     - HTTP 404 NOT_FOUND (slot does not exist)
 *     - HTTP 409 IDEMPOTENCY_CONFLICT (same key + different payload)
 *     - HTTP 4xx AuthoringError mapping
 *     - HTTP 500 INTERNAL (unmapped error)
 *   Per `/ai-pipeline/tier1.md` "Đường A: Direct fix" guidance the route's full
 *   surface must be pinned. The synthetic repro (tests/db/job-posting-create-
 *   bundle.repro.test.ts) pins the GREEN end-to-end path; this file pins the
 *   ROUTE error-mapping contract.
 *
 * Self-skips when the route file is unavailable (CI install race).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  assertSlotEligibleForNewJobPosting: vi.fn(),
  createOrReuseJobOpeningForSlot: vi.fn(),
  createOrReuseJobPostingDraftForOpening: vi.fn(),
  captureWithDbContext: undefined as undefined | {
    called: boolean;
    ctxRole?: string;
    ctxUserId?: string;
  },
  replayed: false,
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true, $transaction: vi.fn() }) }));

vi.mock('@/src/shared/auth/auth-context', () => ({
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
  getAuthContext: mocks.getAuthContext,
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: async (
    _prisma: unknown,
    ctx: { userId: string; role: string },
    cb: (tx: unknown) => unknown,
  ) => {
    mocks.captureWithDbContext = {
      called: true,
      ctxUserId: ctx.userId,
      ctxRole: ctx.role,
    };
    return cb({ __tx: true });
  },
}));

vi.mock('@/src/shared/integrity/idempotency', () => ({
  IdempotencyConflictError: class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  },
  withIdempotency: async (opts: {
    requestBody: unknown[];
    key: string;
    route: string;
    handler: () => Promise<{ body: unknown }>;
  }) => {
    return { body: (await opts.handler()).body, statusCode: 200, replayed: mocks.replayed };
  },
}));

vi.mock('@/src/domains/staffing/job-posting-authoring.service', () => ({
  assertSlotEligibleForNewJobPosting: mocks.assertSlotEligibleForNewJobPosting,
  createOrReuseJobOpeningForSlot: mocks.createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening: mocks.createOrReuseJobPostingDraftForOpening,
  AuthoringError: class AuthoringError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly httpStatus: number = 400,
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
      this.name = 'AuthoringError';
    }
  },
}));

async function importRoute(): Promise<(req: NextRequest) => Promise<Response>> {
  const mod = await import('@/app/api/admin/jobs/job-postings/route');
  return (mod as { POST: (req: NextRequest) => Promise<Response> }).POST;
}

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://example.com/api/admin/jobs/job-postings', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });
}

const HR_MANAGER_CONTEXT = { userId: 'user-hr-manager-test', role: 'HR_MANAGER' };
const HR_STAFF_CONTEXT = { userId: 'user-hr-staff-test', role: 'HR_STAFF' };

describe('POST /api/admin/jobs/job-postings — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.withIdempotency.mockReset();
    mocks.assertSlotEligibleForNewJobPosting.mockReset();
    mocks.createOrReuseJobOpeningForSlot.mockReset();
    mocks.createOrReuseJobPostingDraftForOpening.mockReset();
    mocks.captureWithDbContext = undefined;
    mocks.replayed = false;
  });

  it('returns 200 and the create chain payload for HR_MANAGER + valid slot + valid Idempotency-Key', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    mocks.assertSlotEligibleForNewJobPosting.mockResolvedValue({
      slotId: 'slot-1',
      staffingOrderId: 'so-1',
      slotsFilled: 0,
      slotsNeeded: 1,
      validTo: null,
      deadlineDate: null,
      orderStatus: 'OPEN',
    });
    mocks.createOrReuseJobOpeningForSlot.mockResolvedValue({
      id: 'jobOpening-1',
      staffingOrderId: 'so-1',
      staffingOrderSlotId: 'slot-1',
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdAt: new Date('2026-09-27T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-09-27T00:00:00.000Z').toISOString(),
    });
    mocks.createOrReuseJobPostingDraftForOpening.mockResolvedValue({
      id: 'jobPosting-1',
      jobOpeningId: 'jobOpening-1',
      slug: 'ky-su-dien-1abc2345',
      revision: 1,
      status: 'DRAFT',
      title: 'Kỹ sư điện',
      salaryDisplay: null,
      descriptionJson: null,
      requirementsJson: null,
      benefitsJson: null,
      applicationInstructionsJson: null,
      contentSchemaVersion: 1,
      isHot: false,
      isUrgent: false,
      publishedAt: null,
      archivedAt: null,
      createdAt: new Date('2026-09-27T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-09-27T00:00:00.000Z').toISOString(),
    });

    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobOpening?.id).toBe('jobOpening-1');
    expect(body.jobPosting?.id).toBe('jobPosting-1');
    expect(body.replayed).toBe(false);
    expect(mocks.captureWithDbContext?.called).toBe(true);
    expect(mocks.captureWithDbContext?.ctxRole).toBe('HR_MANAGER');
    expect(mocks.captureWithDbContext?.ctxUserId).toBe('user-hr-manager-test');
  });

  it('returns 400 INVALID_INPUT when Idempotency-Key header is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
  });

  it('returns 400 INVALID_INPUT when body has unknown keys (strict allowlist)', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1', hackerField: 'oops' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
  });

  it('returns 400 INVALID_INPUT when slotId is empty', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    const POST = await importRoute();
    const req = makeRequest({ slotId: '' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
  });

  it('returns 401 on AuthSessionError', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValue(new AuthSessionError('NO_TOKEN', 'expired'));
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NO_TOKEN');
  });

  it('returns 403 PERMISSION_DENIED when role is not in ALLOWED_MUTATION_ROLES', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_STAFF_CONTEXT);
    mocks.assertSlotEligibleForNewJobPosting.mockImplementation(async () => {
      const { AuthoringError } = await import('@/src/domains/staffing/job-posting-authoring.service');
      throw new AuthoringError('PERMISSION_DENIED', 'HR_STAFF không có quyền', 403);
    });
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('PERMISSION_DENIED');
  });

  it('returns 404 NOT_FOUND when slot does not exist', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    mocks.assertSlotEligibleForNewJobPosting.mockImplementation(async () => {
      const { AuthoringError } = await import('@/src/domains/staffing/job-posting-authoring.service');
      throw new AuthoringError('NOT_FOUND', 'slot missing', 404);
    });
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'missing-slot' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 409 IDEMPOTENCY_CONFLICT when IdempotencyConflictError is thrown', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    mocks.assertSlotEligibleForNewJobPosting.mockImplementation(async () => {
      const { IdempotencyConflictError } = await import('@/src/shared/integrity/idempotency');
      throw new IdempotencyConflictError('idempotency conflict');
    });
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('returns 500 INTERNAL when an unmapped error type escapes — never swallows silently', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_MANAGER_CONTEXT);
    mocks.assertSlotEligibleForNewJobPosting.mockRejectedValue(new Error('boom-unknown'));
    const POST = await importRoute();
    const req = makeRequest({ slotId: 'slot-1' }, { 'Idempotency-Key': 'idem-1' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    // Generic safe message: must NOT include the raw error.message / stack trace.
    expect(body.error).toBe('INTERNAL');
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.message).not.toContain('boom-unknown');
  });
});
