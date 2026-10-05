/**
 * media-assign.route.test.ts — hrp-t1c-jobposting-media-youtube (RQ-06, DEC-05, DEC-06).
 *
 * Route-level proof: POST /api/admin/jobs/job-postings/[id]/media/assign
 *   - 201 happy path with Idempotency-Key
 *   - 400 missing Idempotency-Key
 *   - 400 missing/invalid mediaId
 *   - 400 invalid order
 *   - 400 invalid cover
 *   - 403 FORBIDDEN for non-mutation role
 *   - 409 IDEMPOTENCY_CONFLICT (key reuse with different payload)
 *   - 409 MEDIA_ASSIGNMENT_CONFLICT (duplicate media)
 *   - 404 MEDIA_NOT_FOUND
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  withIdempotencyOverride: undefined as
    | undefined
    | ((opts: { requestBody: unknown[]; handler: () => Promise<{ body: unknown; statusCode?: number }> }) => Promise<{ body: unknown; statusCode: number; replayed: boolean }>),
  assignMediaToJobPosting: vi.fn(),
  capturedRequestBody: undefined as unknown[] | undefined,
  replayed: false,
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

vi.mock('@/src/shared/integrity/idempotency', () => {
  const IdempotencyConflictError = class IdempotencyConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IdempotencyConflictError';
    }
  };
  return {
    IdempotencyConflictError,
    withIdempotency: async (opts: {
      requestBody: unknown[];
      handler: () => Promise<{ body: unknown; statusCode?: number }>;
    }) => {
      // Per-test override: tests can replace this mock with vi.mocked(...).mockImplementationOnce.
      if (mocks.withIdempotencyOverride) {
        return mocks.withIdempotencyOverride(opts);
      }
      mocks.capturedRequestBody = opts.requestBody;
      const out = await opts.handler();
      return { body: out.body, statusCode: out.statusCode ?? 200, replayed: mocks.replayed };
    },
  };
});

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
  assignMediaToJobPosting: mocks.assignMediaToJobPosting,
  detachMediaFromJobPosting: vi.fn(),
  setCoverMediaForJobPosting: vi.fn(),
  reorderMediaForJobPosting: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

async function importRoute(): Promise<(req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>> {
  const mod = await import('@/app/api/admin/jobs/job-postings/[id]/media/assign/route');
  return (mod as { POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response> }).POST;
}

const JP_ID = 'posting-uuid-1';
const PARAMS = { params: Promise.resolve({ id: JP_ID }) };
const ADMIN_CTX = { userId: 'admin-uuid', role: 'ADMIN' };
const IDEM = 'idem-media-assign-1';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://example.com/api/admin/jobs/job-postings/${JP_ID}/media/assign`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/jobs/job-postings/[id]/media/assign — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.withIdempotency.mockReset();
    mocks.withIdempotencyOverride = undefined;
    mocks.assignMediaToJobPosting.mockReset();
    mocks.capturedRequestBody = undefined;
    mocks.replayed = false;
  });

  it('201: ADMIN + valid body + Idempotency-Key → returns { assignment, replayed: false }', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.assignMediaToJobPosting.mockResolvedValue({
      assignmentId: 'a-1',
      mediaId: 'm-1',
      url: 'https://cdn.example.com/m-1.jpg',
      alt: 'A',
      caption: null,
      mimeType: 'image/jpeg',
      order: 0,
      cover: false,
      createdAt: '2026-10-05T00:00:00.000Z',
    });
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.assignment.assignmentId).toBe('a-1');
    expect(body.replayed).toBe(false);
    expect(mocks.capturedRequestBody).toEqual([JP_ID, 'm-1', null, null]);
  });

  it('400 IDEMPOTENCY_REQUIRED when header is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(makeRequest({ mediaId: 'm-1' }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
  });

  it('400 INVALID_INPUT when mediaId is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({}, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.field).toBe('mediaId');
  });

  it('400 INVALID_INPUT when order is negative', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1', order: -1 }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.field).toBe('order');
  });

  it('400 INVALID_INPUT when cover is non-boolean', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1', cover: 'yes' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.field).toBe('cover');
  });

  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → 403 FORBIDDEN',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const POST = await importRoute();
      const res = await POST(
        makeRequest({ mediaId: 'm-1' }, { 'Idempotency-Key': IDEM }),
        PARAMS,
      );
      expect(res.status).toBe(403);
    },
  );

  it('409 IDEMPOTENCY_CONFLICT when same key replays with different payload', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { IdempotencyConflictError } = await import('@/src/shared/integrity/idempotency');
    mocks.withIdempotencyOverride = async () => {
      throw new (IdempotencyConflictError as unknown as new (m: string) => Error)(
        'x-idempotency-key đã được dùng với request body khác',
      );
    };
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('409 MEDIA_ASSIGNMENT_CONFLICT on duplicate', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.assignMediaToJobPosting.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
      ) => Error)('MEDIA_ASSIGNMENT_CONFLICT', 'duplicate', 409),
    );
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('MEDIA_ASSIGNMENT_CONFLICT');
  });

  it('404 MEDIA_NOT_FOUND when media is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.assignMediaToJobPosting.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
      ) => Error)('MEDIA_NOT_FOUND', 'not found', 404),
    );
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-x' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(404);
  });

  it('500 INTERNAL for unmapped error', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.assignMediaToJobPosting.mockRejectedValue(new Error('db down'));
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ mediaId: 'm-1' }, { 'Idempotency-Key': IDEM }),
      PARAMS,
    );
    expect(res.status).toBe(500);
  });
});
