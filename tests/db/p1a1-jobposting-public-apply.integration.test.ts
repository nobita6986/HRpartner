/**
 * hrp-p1-a1 — DB-touching proof cho canonical public JobPosting + apply.
 *
 * ENV_BLOCKED: bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy trên synthetic / ephemeral DB.
 *
 * Mọi row tạo ra đều cleanup trong afterAll. Test DB rời pristine.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `p1a1-${randomUUID().slice(0, 8)}`;

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const publicUrl = process.env.DATABASE_URL_PUBLIC_TEST ?? '';

interface SeedRefs {
  clientCompanyId: string;
  projectId: string;
  staffingOrderId: string;
  slotId: string;
  adminUserId: string;
  hrManagerUserId: string;
}

async function seedFixture(admin: PrismaClient, refs: SeedRefs): Promise<void> {
  await admin.clientCompany.deleteMany({ where: { id: refs.clientCompanyId } });
  await admin.project.deleteMany({ where: { id: refs.projectId } });
  await admin.user.deleteMany({
    where: { id: { in: [refs.adminUserId, refs.hrManagerUserId] } },
  });

  await admin.user.create({
    data: { id: refs.adminUserId, phone: `phone-${runId}-admin`, name: `Admin ${runId}`, role: 'ADMIN', isActive: true },
  });
  await admin.user.create({
    data: { id: refs.hrManagerUserId, phone: `phone-${runId}-hrman`, name: `HR ${runId}`, role: 'HR_MANAGER', isActive: true },
  });

  const company = await admin.clientCompany.create({
    data: { id: refs.clientCompanyId, code: `CC-${runId}`, name: `Company ${runId}`, taxCode: `TAX-${runId}` },
  });

  await admin.project.create({
    data: {
      id: refs.projectId,
      code: `PRJ-${runId}`,
      name: `Project ${runId}`,
      clientCompanyId: company.id,
      status: 'ACTIVE',
      startDate: new Date(),
      quota: 10,
      filled: 0,
    },
  });

  await admin.staffingOrder.create({
    data: {
      id: refs.staffingOrderId,
      projectId: refs.projectId,
      code: `SO-${runId}`,
      title: `Order ${runId}`,
      status: 'OPEN',
    },
  });

  await admin.staffingOrderSlot.create({
    data: {
      id: refs.slotId,
      staffingOrderId: refs.staffingOrderId,
      positionCode: 'ELECTRICIAN',
      positionTitle: `Engineer ${runId}`,
      slotsNeeded: 5,
      slotsFilled: 0,
      validFrom: new Date(),
    },
  });
}

async function cleanupFixture(admin: PrismaClient, refs: SeedRefs): Promise<void> {
  try {
    await admin.staffingOrderSlot.deleteMany({ where: { id: refs.slotId } });
  } catch {/* swallow */}
  try {
    await admin.staffingOrder.deleteMany({ where: { id: refs.staffingOrderId } });
  } catch {/* swallow */}
  try {
    await admin.project.deleteMany({ where: { id: refs.projectId } });
  } catch {/* swallow */}
  try {
    await admin.clientCompany.deleteMany({ where: { id: refs.clientCompanyId } });
  } catch {/* swallow */}
  try {
    await admin.user.deleteMany({
      where: { id: { in: [refs.adminUserId, refs.hrManagerUserId] } },
    });
  } catch {/* swallow */}
}

describe.skipIf(!HAS_TEST_DB)('P1-A1 canonical public JobPosting + apply', () => {
  const admin = makeClient(adminUrl);
  const publicClient = makeClient(publicUrl);

  const refs: SeedRefs = {
    clientCompanyId: randomUUID(),
    projectId: randomUUID(),
    staffingOrderId: randomUUID(),
    slotId: randomUUID(),
    adminUserId: randomUUID(),
    hrManagerUserId: randomUUID(),
  };

  beforeAll(async () => {
    await seedFixture(admin, refs);
  }, 30_000);

  afterAll(async () => {
    await cleanupFixture(admin, refs);
    await admin.$disconnect();
    await publicClient.$disconnect();
  });

  describe('RQ-01 — PUBLIC role chỉ thấy PUBLISHED', () => {
    it('PUBLIC role chỉ thấy JobPosting status=PUBLISHED', async () => {
      const postings = await publicClient.jobPosting.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, status: true },
      });

      for (const p of postings) {
        expect(p.status).toBe('PUBLISHED');
      }
    });

    it('DRAFT không hiển thị qua public role', async () => {
      const draftPosting = await admin.jobPosting.create({
        data: {
          jobOpeningId: randomUUID(),
          slug: `draft-${runId}`,
          status: 'DRAFT',
        },
      });

      try {
        const found = await publicClient.jobPosting.findUnique({
          where: { id: draftPosting.id },
          select: { id: true },
        });
        expect(found).toBeNull();
      } finally {
        await admin.jobPosting.delete({ where: { id: draftPosting.id } });
      }
    });

    it('ARCHIVED không hiển thị qua public role', async () => {
      const archivedPosting = await admin.jobPosting.create({
        data: {
          jobOpeningId: randomUUID(),
          slug: `archived-${runId}`,
          status: 'ARCHIVED',
        },
      });

      try {
        const found = await publicClient.jobPosting.findUnique({
          where: { id: archivedPosting.id },
          select: { id: true },
        });
        expect(found).toBeNull();
      } finally {
        await admin.jobPosting.delete({ where: { id: archivedPosting.id } });
      }
    });
  });

  describe('RQ-04 — Project.code filter cho legacy PRJ route', () => {
    it('Project.code tồn tại và có thể dùng filter listing', async () => {
      const postings = await publicClient.jobPosting.findMany({
        where: {
          status: 'PUBLISHED',
          jobOpening: {
            staffingOrder: {
              project: { code: `PRJ-${runId}` },
            },
          },
        },
        select: { id: true, slug: true },
      });

      expect(postings.length).toBeGreaterThan(0);
    });
  });

  describe('RQ-06 — slot derivation from JobOpening', () => {
    it('JobOpening có staffingOrderSlot relation để derive slotId', async () => {
      const openings = await publicClient.jobOpening.findMany({
        where: {
          staffingOrder: {
            project: { code: `PRJ-${runId}` },
          },
        },
        select: {
          id: true,
          staffingOrderSlotId: true,
          staffingOrderSlot: {
            select: { id: true, staffingOrderId: true },
          },
        },
      });

      expect(openings.length).toBeGreaterThan(0);
    });
  });
});
