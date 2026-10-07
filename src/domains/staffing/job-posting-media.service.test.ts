/**
 * job-posting-media.service.test.ts — hrp-t1c-jobposting-media-youtube
 *
 * Strategy: 100% unit — mock Prisma.TransactionClient + mock auth-context.
 * No DB, no HTTP, no next-auth.
 *
 * Mock pattern: `getJobPostingForAuthoring` được spy qua `vi.spyOn` trên module
 * của `job-posting-authoring.service` để có thể chọn return null / object /
 * throw AuthoringError tuỳ test.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  listJobPostingMedia,
  assignMediaToJobPosting,
  detachMediaFromJobPosting,
  setCoverMediaForJobPosting,
  reorderMediaForJobPosting,
  JobPostingMediaError,
} from './job-posting-media.service';
import { AuthoringError, getJobPostingForAuthoring } from '@/src/domains/staffing/job-posting-authoring.service';
import type { AuthContext } from '@/src/shared/auth/auth-context';

// ─── Auth contexts ────────────────────────────────────────────────────────────

const ADMIN_CTX: AuthContext = { userId: 'uid-admin', role: 'ADMIN' };
const HR_STAFF_CTX: AuthContext = { userId: 'uid-hr-staff', role: 'HR_STAFF' };

// ─── Raw DB row factories ────────────────────────────────────────────────────

function makeMedia(id: string, overrides: Partial<{ status: string; alt: string; caption: string | null }> = {}) {
  return {
    id,
    url: `https://cdn.example.com/${id}.jpg`,
    publicUrl: `https://cdn.example.com/pub/${id}.jpg`,
    alt: overrides.alt ?? 'Test alt',
    caption: overrides.caption ?? null,
    mimeType: 'image/jpeg',
    status: overrides.status ?? 'PUBLIC',
  };
}

function makeAssignment(
  id: string,
  jobPostingId: string,
  mediaId: string,
  overrides: Partial<{ order: number; cover: boolean; createdAt: Date; ownerType: 'JobPosting' | 'NewsPost' }> = {},
) {
  return {
    id,
    mediaId,
    ownerType: (overrides.ownerType ?? 'JobPosting') as 'JobPosting',
    ownerId: jobPostingId,
    order: overrides.order ?? 0,
    cover: overrides.cover ?? false,
    createdAt: overrides.createdAt ?? new Date('2026-10-05T00:00:00Z'),
  };
}

function withMedia(
  assignment: ReturnType<typeof makeAssignment>,
  media: ReturnType<typeof makeMedia>,
) {
  return { ...assignment, media };
}

// ─── tx mock factory ─────────────────────────────────────────────────────────

type TxShape = {
  media: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  mediaAssignment: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function buildTx(): TxShape {
  return {
    media: { findUnique: vi.fn() },
    mediaAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };
}

/**
 * Cast partial TxShape → full Prisma.TransactionClient. The full Prisma type
 * has ~70 delegates; we only stub the ones the service uses. Unstubbed delegates
 * will throw on access (proxy guard), which is the correct behavior — any new
 * service usage will surface a test failure instead of silently passing.
 */
function asPrismaTx(tx: TxShape): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

// Spy on `getJobPostingForAuthoring` và trả về object {id} cho ADMIN (pass).
// Mặc định: pass. Mỗi test override qua `vi.spyOn(...).mockResolvedValueOnce(...)`
// hoặc `.mockRejectedValueOnce(...)`.
function stubPostingPass(jpId: string) {
  vi.spyOn(
    // dynamic import to ensure module loaded
    { getJobPostingForAuthoring } as { getJobPostingForAuthoring: typeof getJobPostingForAuthoring },
    'getJobPostingForAuthoring',
  );
  // Spy on the actual module export
  const mod = require('@/src/domains/staffing/job-posting-authoring.service');
  vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: jpId } as unknown as Awaited<ReturnType<typeof getJobPostingForAuthoring>>);
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('listJobPostingMedia', () => {
  it('list___admin___returns sorted DTOs with cover first', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    const m1 = makeMedia('m-1');
    const m2 = makeMedia('m-2');
    const m3 = makeMedia('m-3');
    const a1 = makeAssignment('a-1', JP_ID, 'm-1', { order: 1, cover: false });
    const a2 = makeAssignment('a-2', JP_ID, 'm-2', { order: 0, cover: true });
    const a3 = makeAssignment('a-3', JP_ID, 'm-3', { order: 2, cover: false });

    tx.mediaAssignment.findMany.mockResolvedValue([
      withMedia(a2, m2),
      withMedia(a1, m1),
      withMedia(a3, m3),
    ]);

    const result = await listJobPostingMedia(asPrismaTx(tx), ADMIN_CTX, JP_ID);

    expect(result).toHaveLength(3);
    expect(result[0].cover).toBe(true);
    expect(result[0].mediaId).toBe('m-2');
    expect(result[1].order).toBe(1);
    expect(result[2].order).toBe(2);
    expect(result[0].url).toBe('https://cdn.example.com/pub/m-2.jpg'); // publicUrl preferred
  });

  it('list___hrStaff with recruiter scope___returns DTOs (empty list)', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValue([]);

    const result = await listJobPostingMedia(asPrismaTx(tx), HR_STAFF_CTX, JP_ID);

    expect(result).toHaveLength(0);
  });

  it('list___hrStaff recruiter scope fail___404 NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockRejectedValue(
      new AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 'No active order assignment'),
    );

    await expect(listJobPostingMedia(asPrismaTx(tx), HR_STAFF_CTX, JP_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('list___invalid jobPostingId___400 INVALID_INPUT', async () => {
    const tx = buildTx();
    await expect(listJobPostingMedia(asPrismaTx(tx), ADMIN_CTX, '')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
    await expect(listJobPostingMedia(asPrismaTx(tx), ADMIN_CTX, undefined as unknown as string)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('list___uses status PUBLIC filter', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);
    tx.mediaAssignment.findMany.mockResolvedValue([]);

    await listJobPostingMedia(asPrismaTx(tx), ADMIN_CTX, JP_ID);

    expect(tx.mediaAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          media: { status: 'PUBLIC' },
        }),
      }),
    );
  });
});

describe('assignMediaToJobPosting', () => {
  it('assign___cover=true___clears existing covers then creates', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(makeMedia('m-1'));
    tx.mediaAssignment.findUnique.mockResolvedValue(null); // no dup
    tx.mediaAssignment.updateMany.mockResolvedValue({ count: 1 }); // 1 assignment had cover=true
    const created = { ...makeAssignment('a-new', JP_ID, 'm-1', { cover: true }), media: makeMedia('m-1') };
    tx.mediaAssignment.create.mockResolvedValue(created);

    const result = await assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, {
      mediaId: 'm-1',
      cover: true,
    });

    expect(result.cover).toBe(true);
    expect(result.mediaId).toBe('m-1');
    expect(tx.mediaAssignment.updateMany).toHaveBeenCalledWith({
      where: { ownerType: 'JobPosting', ownerId: JP_ID, cover: true },
      data: { cover: false },
    });
  });

  it('assign___cover undefined___creates assignment cover false without clear', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(makeMedia('m-1'));
    tx.mediaAssignment.findUnique.mockResolvedValue(null);
    const created = { ...makeAssignment('a-new', JP_ID, 'm-1', { cover: false }), media: makeMedia('m-1') };
    tx.mediaAssignment.create.mockResolvedValue(created);

    const result = await assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'm-1' });

    expect(result.cover).toBe(false);
    expect(tx.mediaAssignment.updateMany).not.toHaveBeenCalled(); // cover=false: skip clear
  });

  it('assign___duplicate media___409 MEDIA_ASSIGNMENT_CONFLICT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(makeMedia('m-1'));
    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'existing-a',
      mediaId: 'm-1',
      ownerType: 'JobPosting',
      ownerId: JP_ID,
      order: 0,
      cover: false,
      createdAt: new Date(),
    });

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'm-1' })).rejects.toMatchObject({
      code: 'MEDIA_ASSIGNMENT_CONFLICT',
      httpStatus: 409,
    });
  });

  it('assign___P2002 unique constraint___409 MEDIA_ASSIGNMENT_CONFLICT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(makeMedia('m-1'));
    tx.mediaAssignment.findUnique.mockResolvedValue(null);
    tx.mediaAssignment.updateMany.mockResolvedValue({ count: 0 });
    tx.mediaAssignment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'm-1' })).rejects.toMatchObject({
      code: 'MEDIA_ASSIGNMENT_CONFLICT',
      httpStatus: 409,
    });
  });

  it('assign___media not found___404 MEDIA_NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(null);

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'unknown' })).rejects.toMatchObject({
      code: 'MEDIA_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('assign___media INTERNAL___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue({ ...makeMedia('m-1'), status: 'INTERNAL' });

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'm-1' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
      details: expect.objectContaining({ status: 'INTERNAL' }),
    });
  });

  it('assign___missing mediaId___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: '' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: undefined as unknown as string })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('assign___negative order___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.media.findUnique.mockResolvedValue(makeMedia('m-1'));
    tx.mediaAssignment.findUnique.mockResolvedValue(null);
    tx.mediaAssignment.updateMany.mockResolvedValue({ count: 0 });
    tx.mediaAssignment.create.mockResolvedValue({ ...makeAssignment('a-new', JP_ID, 'm-1'), media: makeMedia('m-1') });

    await expect(assignMediaToJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, { mediaId: 'm-1', order: -1 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('assign___hrStaff recruiter scope fail___404 NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockRejectedValue(
      new AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 'No active order assignment'),
    );

    await expect(assignMediaToJobPosting(asPrismaTx(tx), HR_STAFF_CTX, JP_ID, { mediaId: 'm-1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });
});

describe('detachMediaFromJobPosting', () => {
  it('detach___valid assignment___deletes and returns id', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'a-1',
      mediaId: 'm-1',
      ownerType: 'JobPosting',
      ownerId: JP_ID,
      order: 0,
      cover: false,
      createdAt: new Date(),
    });
    tx.mediaAssignment.delete.mockResolvedValue({ id: 'a-1', mediaId: 'm-1', ownerType: 'JobPosting', ownerId: JP_ID, order: 0, cover: false, createdAt: new Date() });

    const result = await detachMediaFromJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'a-1');

    expect(result).toEqual({ id: 'a-1' });
    expect(tx.mediaAssignment.delete).toHaveBeenCalledWith({ where: { id: 'a-1' } });
  });

  it('detach___assignment not found___404 ASSIGNMENT_NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue(null);

    await expect(detachMediaFromJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'unknown')).rejects.toMatchObject({
      code: 'ASSIGNMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('detach___assignment belongs to different JobPosting___404 ASSIGNMENT_NOT_FOUND (no oracle leak)', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'a-other',
      mediaId: 'm-1',
      ownerType: 'JobPosting',
      ownerId: 'jp-other',
      order: 0,
      cover: false,
      createdAt: new Date(),
    });

    await expect(detachMediaFromJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'a-other')).rejects.toMatchObject({
      code: 'ASSIGNMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('detach___assignment has different ownerType___404 ASSIGNMENT_NOT_FOUND (no oracle leak)', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'a-news',
      mediaId: 'm-1',
      ownerType: 'NewsPost',
      ownerId: 'np-1',
      order: 0,
      cover: false,
      createdAt: new Date(),
    });

    await expect(detachMediaFromJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'a-news')).rejects.toMatchObject({
      code: 'ASSIGNMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('detach___missing assignmentId___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    await expect(detachMediaFromJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, '')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });
});

describe('setCoverMediaForJobPosting', () => {
  it('setCover___valid assignment___clears others and sets cover', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'a-1',
      mediaId: 'm-1',
      ownerType: 'JobPosting',
      ownerId: JP_ID,
      order: 0,
      cover: false,
      createdAt: new Date(),
    });
    tx.mediaAssignment.updateMany.mockResolvedValue({ count: 2 });
    tx.mediaAssignment.update.mockResolvedValue({
      ...makeAssignment('a-1', JP_ID, 'm-1', { cover: true }),
      media: makeMedia('m-1'),
    });

    const result = await setCoverMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'a-1');

    expect(result.cover).toBe(true);
    expect(tx.mediaAssignment.updateMany).toHaveBeenCalledWith({
      where: { ownerType: 'JobPosting', ownerId: JP_ID, cover: true },
      data: { cover: false },
    });
    expect(tx.mediaAssignment.update).toHaveBeenCalledWith({
      where: { id: 'a-1' },
      data: { cover: true },
      include: expect.any(Object),
    });
  });

  it('setCover___assignment not found___404 ASSIGNMENT_NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue(null);

    await expect(setCoverMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'unknown')).rejects.toMatchObject({
      code: 'ASSIGNMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('setCover___assignment belongs to other JobPosting___404 ASSIGNMENT_NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findUnique.mockResolvedValue({
      id: 'a-other',
      mediaId: 'm-1',
      ownerType: 'JobPosting',
      ownerId: 'jp-other',
      order: 0,
      cover: false,
      createdAt: new Date(),
    });

    await expect(setCoverMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'a-other')).rejects.toMatchObject({
      code: 'ASSIGNMENT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('setCover___hrStaff recruiter scope fail___404 NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockRejectedValue(
      new AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 'No active order assignment'),
    );

    await expect(setCoverMediaForJobPosting(asPrismaTx(tx), HR_STAFF_CTX, JP_ID, 'a-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });
});

describe('reorderMediaForJobPosting', () => {
  it('reorder___valid ordered ids___sets order by index', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    // 1st findMany: current set
    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-1', JP_ID, 'm-1'), makeMedia('m-1')),
      withMedia(makeAssignment('a-2', JP_ID, 'm-2'), makeMedia('m-2')),
      withMedia(makeAssignment('a-3', JP_ID, 'm-3'), makeMedia('m-3')),
    ]);
    tx.mediaAssignment.update.mockResolvedValue({ id: 'a-x', mediaId: 'm-x', ownerType: 'JobPosting', ownerId: JP_ID, order: 0, cover: false, createdAt: new Date() });
    // 2nd findMany: re-read after reorder
    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-3', JP_ID, 'm-3', { order: 0 }), makeMedia('m-3')),
      withMedia(makeAssignment('a-1', JP_ID, 'm-1', { order: 1 }), makeMedia('m-1')),
      withMedia(makeAssignment('a-2', JP_ID, 'm-2', { order: 2 }), makeMedia('m-2')),
    ]);

    const result = await reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, ['a-3', 'a-1', 'a-2']);

    expect(tx.mediaAssignment.update).toHaveBeenCalledTimes(3);
    expect(tx.mediaAssignment.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'a-3' },
      data: { order: 0 },
    });
    expect(tx.mediaAssignment.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'a-1' },
      data: { order: 1 },
    });
    expect(result[0].assignmentId).toBe('a-3');
    expect(result[0].order).toBe(0);
  });

  it('reorder___missing id from current set___400 INVALID_INPUT with diff counts', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-1', JP_ID, 'm-1'), makeMedia('m-1')),
      withMedia(makeAssignment('a-2', JP_ID, 'm-2'), makeMedia('m-2')),
    ]);

    await expect(reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, ['a-1', 'a-3'])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
      details: expect.objectContaining({ missingFromClientCount: 1, extraFromClientCount: 1 }),
    });
  });

  it('reorder___extra id not in current set___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-1', JP_ID, 'm-1'), makeMedia('m-1')),
    ]);

    await expect(reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, ['a-1', 'a-fake'])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('reorder___duplicate id in array___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-1', JP_ID, 'm-1'), makeMedia('m-1')),
      withMedia(makeAssignment('a-2', JP_ID, 'm-2'), makeMedia('m-2')),
    ]);

    await expect(reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, ['a-1', 'a-1', 'a-2'])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('reorder___non-array input___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    await expect(
      reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, null as unknown as string[]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', httpStatus: 400 });
    await expect(
      reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, 'not-an-array' as unknown as string[]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', httpStatus: 400 });
  });

  it('reorder___empty string in array___400 INVALID_INPUT', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValueOnce([
      withMedia(makeAssignment('a-1', JP_ID, 'm-1'), makeMedia('m-1')),
    ]);

    await expect(reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, ['a-1', ''])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      httpStatus: 400,
    });
  });

  it('reorder___empty array (no assignments)___succeeds with empty result', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockResolvedValue({ id: JP_ID } as unknown as Awaited<ReturnType<typeof mod.getJobPostingForAuthoring>>);

    tx.mediaAssignment.findMany.mockResolvedValueOnce([]); // current empty
    tx.mediaAssignment.findMany.mockResolvedValueOnce([]); // re-read

    const result = await reorderMediaForJobPosting(asPrismaTx(tx), ADMIN_CTX, JP_ID, []);

    expect(result).toEqual([]);
    expect(tx.mediaAssignment.update).not.toHaveBeenCalled();
  });

  it('reorder___hrStaff recruiter scope fail___404 NOT_FOUND', async () => {
    const JP_ID = 'jp-1';
    const tx = buildTx();
    const mod = await import('@/src/domains/staffing/job-posting-authoring.service');
    vi.spyOn(mod, 'getJobPostingForAuthoring').mockRejectedValue(
      new AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 'No active order assignment'),
    );

    await expect(reorderMediaForJobPosting(asPrismaTx(tx), HR_STAFF_CTX, JP_ID, ['a-1'])).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });
});

// ─── Error class ──────────────────────────────────────────────────────────────

describe('JobPostingMediaError', () => {
  it('has correct name and properties', () => {
    const err = new JobPostingMediaError('MEDIA_NOT_FOUND', 'Media not found', 404, { id: 'm-1' });
    expect(err.name).toBe('JobPostingMediaError');
    expect(err.code).toBe('MEDIA_NOT_FOUND');
    expect(err.message).toBe('Media not found');
    expect(err.httpStatus).toBe(404);
    expect(err.details).toEqual({ id: 'm-1' });
  });

  it('defaults httpStatus to 400', () => {
    const err = new JobPostingMediaError('INVALID_INPUT', 'Bad input');
    expect(err.httpStatus).toBe(400);
  });
});
