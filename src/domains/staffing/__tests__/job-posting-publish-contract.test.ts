/**
 * src/domains/staffing/__tests__/job-posting-publish-contract.test.ts
 *
 * hrp-t1a-postdeploy-runtime-correction-2 (round 2):
 *   Test #3 — server publish precondition gate.
 *
 *   Trực tiếp gọi `publishJobPosting` với JobOpening ở DRAFT / FILLED /
 *   CANCELLED → phải throw `AuthoringError('JOB_OPENING_NOT_OPEN', 409)`
 *   với message canonical:
 *
 *     `Linked JobOpening <id> phải ở trạng thái OPEN (hiện tại: <status>).`
 *
 *   Đây là contract fail-closed đã có ở baseline `14712f15`. Test này
 *   chỉ verify nó còn nguyên sau khi đã thêm client-side gating (Phase B)
 *   — server contract là source of truth, không được nới.
 *
 *   Strategy:
 *     - Stub `@prisma/client` `Prisma` namespace (chỉ dùng `Prisma.sql`
 *       cho truy vấn raw).
 *     - Mock `Prisma.TransactionClient` với một `findUnique` giả lập
 *       trả về JobPosting + jobOpening ở status bất kỳ.
 *     - Verify AuthoringError + httpStatus 409.
 *
 *   Out of scope:
 *     - DB-touching integration test đã có ở
 *       `tests/db/job-posting-authoring.integration.test.ts` (env-blocked).
 *     - Khi `current.jobOpening === null` → throw `NOT_FOUND` 500.
 */

import { describe, it, expect, vi } from 'vitest';
import { publishJobPosting, AuthoringError } from '@/src/domains/staffing/job-posting-authoring.service';
import type { AuthContext } from '@/src/shared/auth/auth-context';

const AUTH: AuthContext = { userId: 'admin-1', role: 'ADMIN' };

interface MakePostingArgs {
  jpStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  jpRevision: number;
  jobOpening: { id: string; status: 'DRAFT' | 'OPEN' | 'FILLED' | 'CANCELLED' } | null;
}

function makeTxMock(args: MakePostingArgs) {
  return {
    jobPosting: {
      findUnique: vi.fn(async () => {
        if (args.jobOpening === null) {
          return {
            id: 'jp-1',
            status: args.jpStatus,
            revision: args.jpRevision,
            slug: 'test-slug',
            title: 'Test title',
            descriptionJson: { type: 'doc', content: [{ type: 'paragraph' }] },
            jobOpening: null,
          };
        }
        return {
          id: 'jp-1',
          status: args.jpStatus,
          revision: args.jpRevision,
          slug: 'test-slug',
          title: 'Test title',
          descriptionJson: { type: 'doc', content: [{ type: 'paragraph' }] },
          jobOpening: args.jobOpening,
        };
      }),
      update: vi.fn(async () => ({
        id: 'jp-1',
        jobOpeningId: 'jo-1',
        slug: 'test-slug',
        revision: args.jpRevision + 1,
        status: 'PUBLISHED' as const,
        title: 'Test title',
        salaryDisplay: null,
        descriptionJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        requirementsJson: null,
        benefitsJson: null,
        applicationInstructionsJson: null,
        contentSchemaVersion: 1,
        isHot: false,
        isUrgent: false,
        publishedAt: new Date(),
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUniqueBySlug: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  } as unknown as Parameters<typeof publishJobPosting>[0];
}

describe('publishJobPosting — server contract JOB_OPENING_NOT_OPEN (Test #3)', () => {
  it('DRAFT JobOpening → throws AuthoringError 409 JOB_OPENING_NOT_OPEN', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 1,
      jobOpening: { id: '655909be-65ea-4a6d-bef4-7a63297e2bc6', status: 'DRAFT' },
    });
    let caught: unknown = null;
    try {
      await publishJobPosting(tx, AUTH, { jobPostingId: 'jp-1', expectedRevision: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AuthoringError);
    expect((caught as AuthoringError).code).toBe('JOB_OPENING_NOT_OPEN');
    expect((caught as AuthoringError).httpStatus).toBe(409);
    // Canonical message — matches the error string Owner captured on prod.
    expect((caught as AuthoringError).message).toBe(
      'Linked JobOpening 655909be-65ea-4a6d-bef4-7a63297e2bc6 phải ở trạng thái OPEN (hiện tại: DRAFT).',
    );
    // Verify server did NOT call update (transaction aborted before write).
    expect((tx as unknown as { jobPosting: { update: ReturnType<typeof vi.fn> } }).jobPosting.update).not.toHaveBeenCalled();
  });

  it('FILLED JobOpening → throws JOB_OPENING_NOT_OPEN (terminal)', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 2,
      jobOpening: { id: 'jo-filled', status: 'FILLED' },
    });
    await expect(
      publishJobPosting(tx, AUTH, { jobPostingId: 'jp-1', expectedRevision: 2 }),
    ).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'JOB_OPENING_NOT_OPEN',
      httpStatus: 409,
    });
  });

  it('CANCELLED JobOpening → throws JOB_OPENING_NOT_OPEN (terminal)', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 3,
      jobOpening: { id: 'jo-cancelled', status: 'CANCELLED' },
    });
    await expect(
      publishJobPosting(tx, AUTH, { jobPostingId: 'jp-1', expectedRevision: 3 }),
    ).rejects.toMatchObject({
      code: 'JOB_OPENING_NOT_OPEN',
      httpStatus: 409,
    });
  });

  it('JobPosting has no linked JobOpening → throws NOT_FOUND 500 (orphan guard)', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 4,
      jobOpening: null,
    });
    await expect(
      publishJobPosting(tx, AUTH, { jobPostingId: 'jp-1', expectedRevision: 4 }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 500,
    });
  });

  it('OPEN JobOpening → contract not triggered; update path reached', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 5,
      jobOpening: { id: 'jo-open', status: 'OPEN' },
    });
    const result = await publishJobPosting(tx, AUTH, {
      jobPostingId: 'jp-1',
      expectedRevision: 5,
    });
    expect(result.status).toBe('PUBLISHED');
    expect(
      (tx as unknown as { jobPosting: { update: ReturnType<typeof vi.fn> } }).jobPosting.update,
    ).toHaveBeenCalled();
  });

  it('rejects non-mutation role with PERMISSION_DENIED 403 (auth still enforced)', async () => {
    const tx = makeTxMock({
      jpStatus: 'DRAFT',
      jpRevision: 6,
      jobOpening: { id: 'jo-x', status: 'OPEN' },
    });
    await expect(
      publishJobPosting(tx, { userId: 'pm-1', role: 'PM' }, {
        jobPostingId: 'jp-1',
        expectedRevision: 6,
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });
});