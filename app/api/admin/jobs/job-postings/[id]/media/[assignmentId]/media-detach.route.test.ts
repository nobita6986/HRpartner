/**
 * media-detach.route.test.ts — hrp-t1c-jobposting-media-youtube (RQ-07).
 *
 * Route-level proof: DELETE /api/admin/jobs/job-postings/[id]/media/[assignmentId]
 *   - 200 happy path (ADMIN)
 *   - 403 FORBIDDEN for non-mutation role
 *   - 404 ASSIGNMENT_NOT_FOUND
 *   - 500 INTERNAL
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  detachMediaFromJobPosting: vi.fn(),
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
  detachMediaFromJobPosting: mocks.detachMediaFromJobPosting,
  setCoverMediaForJobPosting: vi.fn(),
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
  const mod = await import('@/app/api/admin/jobs/job-postings/[id]/media/[assignmentId]/route');
  return (mod as { DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string; assignmentId: string }> }) => Promise<Response> }).DELETE;
}

const JP_ID = 'posting-uuid-1';
const ASSIGNMENT_ID = 'a-uuid-1';
const PARAMS = { params: Promise.resolve({ id: JP_ID, assignmentId: ASSIGNMENT_ID }) };
const ADMIN_CTX = { userId: 'admin-uuid', role: 'ADMIN' };

function makeRequest(): NextRequest {
  return new NextRequest(
    `https://example.com/api/admin/jobs/job-postings/${JP_ID}/media/${ASSIGNMENT_ID}`,
    { method: 'DELETE' },
  );
}

describe('DELETE /api/admin/jobs/job-postings/[id]/media/[assignmentId] — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.detachMediaFromJobPosting.mockReset();
  });

  it('200: ADMIN + valid assignment → returns { id: ... }', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.detachMediaFromJobPosting.mockResolvedValue({ id: ASSIGNMENT_ID });
    const DELETE = await importRoute();
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(ASSIGNMENT_ID);
  });

  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → 403 FORBIDDEN',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const DELETE = await importRoute();
      const res = await DELETE(makeRequest(), PARAMS);
      expect(res.status).toBe(403);
    },
  );

  it('404 ASSIGNMENT_NOT_FOUND when service throws', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.detachMediaFromJobPosting.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
      ) => Error)('ASSIGNMENT_NOT_FOUND', 'not found', 404),
    );
    const DELETE = await importRoute();
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('ASSIGNMENT_NOT_FOUND');
  });

  it('500 INTERNAL for unmapped error', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.detachMediaFromJobPosting.mockRejectedValue(new Error('db down'));
    const DELETE = await importRoute();
    const res = await DELETE(makeRequest(), PARAMS);
    expect(res.status).toBe(500);
  });
});
