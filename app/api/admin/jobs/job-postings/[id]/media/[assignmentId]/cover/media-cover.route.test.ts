/**
 * media-cover.route.test.ts — hrp-t1c-jobposting-media-youtube (RQ-09, DEC-06).
 *
 * Route-level proof: POST /api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover
 *   - 200 happy path (set cover, returns updated assignment)
 *   - 400 missing Idempotency-Key
 *   - 403 FORBIDDEN for non-mutation role
 *   - 404 ASSIGNMENT_NOT_FOUND
 *   - 500 INTERNAL
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  withIdempotency: vi.fn(),
  setCoverMediaForJobPosting: vi.fn(),
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
  setCoverMediaForJobPosting: mocks.setCoverMediaForJobPosting,
  reorderMediaForJobPosting: vi.fn(),
}));

vi.mock('@/src/domains/staffing/job-posting-authoring.service', async () => {
  const actual = await vi.importActual<typeof import('@/src/domains/staffing/job-posting-authoring.service')>(
    '@/src/domains/staffing/job-posting-authoring.service',
  );
  return actual;
});

async function importRoute(): Promise<
  (req: NextRequest, ctx: { params: Promise<{ id: string; assignmentId: string }> }) => Promise<Response>
> {
  const mod = await import('@/app/api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover/route');
  return (mod as { POST: (req: NextRequest, ctx: { params: Promise<{ id: string; assignmentId: string }> }) => Promise<Response> }).POST;
}

const JP_ID = 'posting-uuid-1';
const ASSIGNMENT_ID = 'a-uuid-1';
const PARAMS = { params: Promise.resolve({ id: JP_ID, assignmentId: ASSIGNMENT_ID }) };
const ADMIN_CTX = { userId: 'admin-uuid', role: 'ADMIN' };
const IDEM = 'idem-cover-1';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(
    `https://example.com/api/admin/jobs/job-postings/${JP_ID}/media/${ASSIGNMENT_ID}/cover`,
    {
      method: 'POST',
      headers: new Headers({ ...headers }),
    },
  );
}

describe('POST /api/admin/jobs/job-postings/[id]/media/[assignmentId]/cover — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.withIdempotency.mockReset();
    mocks.setCoverMediaForJobPosting.mockReset();
  });

  it('200: ADMIN + valid assignment + Idempotency-Key → returns { assignment, replayed: false }', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.setCoverMediaForJobPosting.mockResolvedValue({
      assignmentId: ASSIGNMENT_ID,
      mediaId: 'm-1',
      url: 'https://cdn.example.com/m-1.jpg',
      alt: 'A',
      caption: null,
      mimeType: 'image/jpeg',
      order: 0,
      cover: true,
      createdAt: '2026-10-05T00:00:00.000Z',
    });
    const POST = await importRoute();
    const res = await POST(makeRequest({ 'Idempotency-Key': IDEM }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignment.cover).toBe(true);
    expect(body.assignment.assignmentId).toBe(ASSIGNMENT_ID);
  });

  it('400 IDEMPOTENCY_REQUIRED when header is missing', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const POST = await importRoute();
    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('IDEMPOTENCY_REQUIRED');
  });

  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → 403 FORBIDDEN',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const POST = await importRoute();
      const res = await POST(makeRequest({ 'Idempotency-Key': IDEM }), PARAMS);
      expect(res.status).toBe(403);
    },
  );

  it('404 ASSIGNMENT_NOT_FOUND when service throws', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.setCoverMediaForJobPosting.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
      ) => Error)('ASSIGNMENT_NOT_FOUND', 'not found', 404),
    );
    const POST = await importRoute();
    const res = await POST(makeRequest({ 'Idempotency-Key': IDEM }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('500 INTERNAL for unmapped error', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.setCoverMediaForJobPosting.mockRejectedValue(new Error('db down'));
    const POST = await importRoute();
    const res = await POST(makeRequest({ 'Idempotency-Key': IDEM }), PARAMS);
    expect(res.status).toBe(500);
  });
});
