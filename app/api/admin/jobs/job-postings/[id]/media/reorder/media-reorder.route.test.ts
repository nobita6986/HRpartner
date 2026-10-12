/**
 * media-reorder.route.test.ts — hrp-t1c-jobposting-media-youtube (RQ-08, DEC-07).
 *
 * Route-level proof: POST /api/admin/jobs/job-postings/[id]/media/reorder
 *   - 200 happy path with Idempotency-Key
 *   - 400 missing Idempotency-Key
 *   - 400 missing/non-array orderedAssignmentIds
 *   - 400 duplicate id in array
 *   - 400 empty string in array
 *   - 403 FORBIDDEN for non-mutation role
 *   - 400 INVALID_INPUT from service (set mismatch)
 *   - 500 INTERNAL
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  reorderMediaForJobPosting: vi.fn(),
  capturedRequestBody: undefined as unknown[] | undefined,
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: () => ({ __raw: true }) }));

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
    _ctx: unknown,
    cb: (tx: unknown) => unknown,
  ) => cb({ __tx: true }),
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
    handler: () => Promise<{ body: unknown; statusCode?: number }>;
  }) => {
    mocks.capturedRequestBody = opts.requestBody;
    const out = await opts.handler();
    return { body: out.body, statusCode: out.statusCode ?? 200, replayed: false };
  },
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/src/domains/staffing/job-posting-media.service', () => ({
  listJobPostingMedia: vi.fn(),
  JobPostingMediaError: class JobPostingMediaError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly httpStatus: number = 400,
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
      this.name = 'JobPostingMediaError';
    }
  },
  assignMediaToJobPosting: vi.fn(),
  detachMediaFromJobPosting: vi.fn(),
  setCoverMediaForJobPosting: vi.fn(),
  reorderMediaForJobPosting: mocks.reorderMediaForJobPosting,
}));

vi.mock('@/src/domains/staffing/job-posting-authoring.service', async () => {
  const actual = await vi.importActual<typeof import('@/src/domains/staffing/job-posting-authoring.service')>(
    '@/src/domains/staffing/job-posting-authoring.service',
  );
  return actual;
});

async function importRoute(): Promise<(req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>> {
  const mod = await import('@/app/api/admin/jobs/job-postings/[id]/media/reorder/route');
  return (mod as { POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response> }).POST;
}

const JP_ID = 'posting-uuid-1';
const PARAMS = { params: Promise.resolve({ id: JP_ID }) };
const ADMIN_CTX = { userId: 'admin-uuid', role: 'ADMIN' };
const IDEM = 'idem-reorder-1';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://example.com/api/admin/jobs/job-postings/${JP_ID}/media/reorder`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/jobs/job-postings/[id]/media/reorder — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.withIdempotency.mockReset();
    mocks.reorderMediaForJobPosting.mockReset();
    mocks.capturedRequestBody = undefined;
  });

  it('200: ADMIN + valid array + Idempotency-Key → returns { items, replayed: false }', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.reorderMediaForJobPosting.mockResolvedValue([
      { assignmentId: 'a-2', mediaId: 'm-2', url: 'u', alt: 'A', caption: null, mimeType: 'image/jpeg', order: 0, cover: false, createdAt: '2026-10-05T00:00:00.000Z' },
      { assignmentId: 'a-1', mediaId: 'm-1', url: 'u', alt: 'A', caption: null, mimeType: 'image/jpeg', order: 1, cover: false, createdAt: '2026-10-05T00:00:00.000Z' },
    ]);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: ['a-2', 'a-1'] }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.replayed).toBe(false);
    // requestBody includes the JP_ID + the ordered ids
    expect(mocks.capturedRequestBody).toEqual([JP_ID, 'a-2', 'a-1']);
  });

  it('400 IDEMPOTENCY_REQUIRED when header is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(makeRequest({ orderedAssignmentIds: ['a-1'] }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
  });

  it('400 INVALID_INPUT when orderedAssignmentIds is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({}, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.field).toBe('orderedAssignmentIds');
  });

  it('400 INVALID_INPUT when orderedAssignmentIds is not an array', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: 'a-1' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
  });

  it('400 INVALID_INPUT on duplicate id in array', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: ['a-1', 'a-1'] }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
  });

  it('400 INVALID_INPUT on empty string in array', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: ['a-1', ''] }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
  });

  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → 403 FORBIDDEN',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const POST = await importRoute();
      const res = await POST(
        makeRequest({ orderedAssignmentIds: ['a-1'] }, { 'Idempotency-Key': IDEM }),
        PARAMS,
      );
      expect(res.status).toBe(403);
    },
  );

  it('400 INVALID_INPUT when service throws (set mismatch)', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.reorderMediaForJobPosting.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
        d?: Record<string, unknown>,
      ) => Error)('INVALID_INPUT', 'set mismatch', 400, { missingFromClientCount: 1 }),
    );
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: ['a-x'] }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
  });

  it('500 INTERNAL for unmapped error', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.reorderMediaForJobPosting.mockRejectedValue(new Error('db down'));
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ orderedAssignmentIds: ['a-1'] }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(500);
  });
});
