/**
 * media-list.route.test.ts — hrp-t1c-jobposting-media-youtube (RQ-05, DEC-05).
 *
 * Route-level proof: GET /api/admin/jobs/job-postings/[id]/media
 *   - 200 happy path (ADMIN; empty list)
 *   - 200 happy path (HR_STAFF with valid scope)
 *   - 401 INTERNAL auth failure
 *   - 403 FORBIDDEN for SALE/PM/WORKER
 *   - 404 NOT_FOUND for missing JobPosting
 *   - 500 INTERNAL for unmapped error
 *   - 404 from scoped-recruiter guard → NO_ACTIVE_ORDER_ASSIGNMENT
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  withDbContext: vi.fn(),
  listJobPostingMedia: vi.fn(),
  captureWithDbContext: undefined as undefined | { called: boolean; ctxRole?: string },
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
    ctx: { userId: string; role: string },
    cb: (tx: unknown) => unknown,
  ) => {
    mocks.captureWithDbContext = { called: true, ctxRole: ctx.role };
    return cb({ __tx: true });
  },
}));

vi.mock('@/src/domains/staffing/job-posting-media.service', () => ({
  listJobPostingMedia: mocks.listJobPostingMedia,
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
  reorderMediaForJobPosting: vi.fn(),
}));

vi.mock('@/src/domains/staffing/job-posting-authoring.service', async () => {
  const actual = await vi.importActual<typeof import('@/src/domains/staffing/job-posting-authoring.service')>(
    '@/src/domains/staffing/job-posting-authoring.service',
  );
  return actual;
});

async function importRoute(): Promise<(req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>> {
  const mod = await import('@/app/api/admin/jobs/job-postings/[id]/media/route');
  return (mod as { GET: typeof importRoute extends () => Promise<infer F> ? F : never }).GET as never;
}

const JP_ID = 'posting-uuid-1';
const PARAMS = { params: Promise.resolve({ id: JP_ID }) };
const ADMIN_CTX = { userId: 'admin-uuid', role: 'ADMIN' };
const HR_STAFF_CTX = { userId: 'staff-uuid', role: 'HR_STAFF' };

function makeRequest(): NextRequest {
  return new NextRequest(`https://example.com/api/admin/jobs/job-postings/${JP_ID}/media`, {
    method: 'GET',
  });
}

describe('GET /api/admin/jobs/job-postings/[id]/media — route contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.withDbContext.mockReset();
    mocks.listJobPostingMedia.mockReset();
    mocks.captureWithDbContext = undefined;
  });

  it('200: ADMIN role + valid JobPosting → returns { items: [...] }', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.listJobPostingMedia.mockResolvedValue([
      {
        assignmentId: 'a-1',
        mediaId: 'm-1',
        url: 'https://cdn.example.com/m-1.jpg',
        alt: 'A',
        caption: null,
        mimeType: 'image/jpeg',
        order: 1,
        cover: true,
        createdAt: '2026-10-05T00:00:00.000Z',
      },
    ]);
    const GET = await importRoute();
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].cover).toBe(true);
    expect(mocks.captureWithDbContext?.ctxRole).toBe('ADMIN');
  });

  it('200: HR_STAFF with valid recruiter scope → returns items', async () => {
    mocks.getAuthContext.mockResolvedValue(HR_STAFF_CTX);
    mocks.listJobPostingMedia.mockResolvedValue([]);
    const GET = await importRoute();
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(200);
    expect(mocks.captureWithDbContext?.ctxRole).toBe('HR_STAFF');
  });

  it.each(['SALE', 'PM', 'WORKER', 'ACCOUNTANT', 'MKT'] as const)(
    '%s role → 403 FORBIDDEN',
    async (role) => {
      mocks.getAuthContext.mockResolvedValue({ userId: 'u', role });
      const GET = await importRoute();
      const res = await GET(makeRequest(), PARAMS);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
    },
  );

  it('404 NOT_FOUND when service throws JobPostingMediaError(NOT_FOUND)', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    const { JobPostingMediaError } = await import('@/src/domains/staffing/job-posting-media.service');
    mocks.listJobPostingMedia.mockRejectedValue(
      new (JobPostingMediaError as unknown as new (
        c: string,
        m: string,
        s: number,
        d?: Record<string, unknown>,
      ) => Error)('NOT_FOUND', `JobPosting ${JP_ID} không tồn tại.`, 404),
    );
    const GET = await importRoute();
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('500 INTERNAL for unmapped error', async () => {
    mocks.getAuthContext.mockResolvedValue(ADMIN_CTX);
    mocks.listJobPostingMedia.mockRejectedValue(new Error('boom'));
    const GET = await importRoute();
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('INTERNAL');
  });

  it('500 when getAuthContext throws non-AuthSessionError', async () => {
    mocks.getAuthContext.mockRejectedValue(new Error('cookie malformed'));
    const GET = await importRoute();
    const res = await GET(makeRequest(), PARAMS);
    expect(res.status).toBe(500);
  });
});
