/**
 * MP-3B LIVE conversion race evidence.
 *
 * Runs only in the guarded integration lane. Fixture setup, verification and
 * cleanup use DATABASE_URL_ADMIN_TEST; the two competing commands use the real
 * RLS-enforcing DATABASE_URL_TEST principal through withDbContext.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { convertApplication, ConversionError } from './conversion.service';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.MP3B_LIVE_CONVERSION_CHECK && ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('MP-3B LIVE conversion', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writerA = new PrismaClient({ datasourceUrl: WRITER_URL });
  const writerB = new PrismaClient({ datasourceUrl: WRITER_URL });

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writerA.$connect(), writerB.$connect()]);
  }, 30_000);

  afterAll(async () => {
    await Promise.all([admin.$disconnect(), writerA.$disconnect(), writerB.$disconnect()]);
  });

  it('allows one QUALIFIED -> CONVERTED winner without orphan Worker/SourceClaim rows', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const actorId = `mp3b-live-actor-${suffix}`;
    const submissionId = `mp3b-live-sub-${suffix}`;
    const phone = `08${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    const ctx = { userId: actorId, role: 'HR_MANAGER' as const };

    await admin.user.create({
      data: { id: actorId, name: 'MP3B Live HR', role: 'HR_MANAGER', isActive: true },
    });
    await admin.candidateSubmission.create({
      data: {
        id: submissionId,
        fullName: 'MP3B Live Candidate',
        phone,
        normalizedPhone: phone,
        status: 'QUALIFIED',
        version: 0,
      },
    });

    try {
      const [a, b] = await Promise.allSettled([
        withDbContext(writerA, ctx, (tx) => convertApplication(tx, ctx, submissionId, {
          reason: 'MP-3B LIVE race A', expectedVersion: 0,
        })),
        withDbContext(writerB, ctx, (tx) => convertApplication(tx, ctx, submissionId, {
          reason: 'MP-3B LIVE race B', expectedVersion: 0,
        })),
      ]);

      const fulfilled = [a, b].filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof convertApplication>>> => r.status === 'fulfilled');
      const rejected = [a, b].filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(fulfilled.some((r) => r.value.changed)).toBe(true);
      expect(fulfilled.every((r) => r.value.status === 'CONVERTED')).toBe(true);
      for (const result of rejected) {
        expect(result.reason).toBeInstanceOf(ConversionError);
        expect(result.reason).toMatchObject({ code: 'STALE_VERSION', httpStatus: 409 });
      }

      const submission = await admin.candidateSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: { status: true, version: true, workerId: true },
      });
      expect(submission).toMatchObject({ status: 'CONVERTED', version: 1 });
      expect(submission.workerId).toBeTruthy();

      const [workers, claims, history, audits] = await Promise.all([
        admin.worker.findMany({ where: { userId: `APP-${submissionId}` }, select: { id: true } }),
        admin.sourceClaim.findMany({ where: { submissionId, accepted: true }, select: { id: true, workerId: true } }),
        admin.applicationStatusHistory.findMany({ where: { submissionId, fromStatus: 'QUALIFIED', toStatus: 'CONVERTED' } }),
        admin.auditLog.findMany({ where: { entityId: submissionId, action: 'APPLICATION_CONVERT' } }),
      ]);
      expect(workers).toHaveLength(1);
      expect(claims).toEqual([expect.objectContaining({ workerId: workers[0].id })]);
      expect(history).toHaveLength(1);
      expect(audits).toHaveLength(1);
      expect(submission.workerId).toBe(workers[0].id);
    } finally {
      await admin.auditLog.deleteMany({ where: { entityId: submissionId } });
      await admin.applicationStatusHistory.deleteMany({ where: { submissionId } });
      await admin.sourceClaim.deleteMany({ where: { submissionId } });
      await admin.candidateSubmission.deleteMany({ where: { id: submissionId } });
      await admin.worker.deleteMany({ where: { userId: `APP-${submissionId}` } });
      await admin.user.deleteMany({ where: { id: actorId } });
    }
  }, 30_000);
});
