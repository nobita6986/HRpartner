/**
 * admin-demand-tree.integration.test.ts — W3 LIVE Integration Test.
 *
 * Requirements (from TASK.md):
 * 1. ADMIN → thấy mọi fixture.
 * 2. DIRECTOR → thấy mọi fixture.
 * 3. assigned PM → thấy project/client/opening liên quan trực tiếp đến mình.
 * 4. sub-PM 1 và sub-PM 2 → thấy project liên quan.
 * 5. unrelated PM → nhận null.
 * 6. PM nhập Client ID nhưng client đó không có project nào visible với PM → nhận null (xác minh Client Guard).
 * 7. missing ID → nhận null.
 * 8. missing GUC/context (lỗi runtime) → fail closed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { getProjectDetail } from './crm/project-read.service';
import { getClientDetail } from './crm/client-read.service';
import { getJobOpeningDetail } from './staffing/job-opening-read.service';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST;
const WRITER_URL = process.env.DATABASE_URL_TEST;

if (WRITER_URL && !ADMIN_URL) {
  throw new Error('DATABASE_URL_TEST is set but DATABASE_URL_ADMIN_TEST is missing. Cannot run LIVE RLS test reliably.');
}

const enabled = Boolean(ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('W3 Admin Demand Tree — LIVE RLS Integration Test', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `w3-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Users
  const uAdmin = `uadm-${RUN}`;
  const uDirector = `udir-${RUN}`;
  const uPrimaryPm = `upm-${RUN}`;
  const uSubPm1 = `usp1-${RUN}`;
  const uSubPm2 = `usp2-${RUN}`;
  const uUnrelatedPm = `upmx-${RUN}`;
  const FK_USER_IDS = [uAdmin, uDirector, uPrimaryPm, uSubPm1, uSubPm2, uUnrelatedPm];

  // Fixtures
  const C1_VISIBLE = `c1-${RUN}`;
  const C2_HIDDEN = `c2-${RUN}`; // Client with no visible project for PMs
  
  const P1_VISIBLE = `p1-${RUN}`;
  const SO1 = `so1-${RUN}`;
  const JO1 = `jo1-${RUN}`;
  
  const P2_HIDDEN = `p2-${RUN}`; // Project PM is not assigned to

  async function cleanup() {
    await admin.staffingOrderSlot.deleteMany({ where: { id: JO1 } }).catch(() => {});
    await admin.jobOpening.deleteMany({ where: { id: JO1 } }).catch(() => {});
    await admin.staffingOrder.deleteMany({ where: { id: SO1 } }).catch(() => {});
    await admin.project.deleteMany({ where: { id: { in: [P1_VISIBLE, P2_HIDDEN] } } }).catch(() => {});
    await admin.clientCompany.deleteMany({ where: { id: { in: [C1_VISIBLE, C2_HIDDEN] } } }).catch(() => {});
    await admin.user.deleteMany({ where: { id: { in: FK_USER_IDS } } }).catch(() => {});
  }

  beforeAll(async () => {
    await cleanup();

    // Create Users
    await admin.user.createMany({
      data: [
        { id: uAdmin, role: 'ADMIN', name: 'Admin W3' },
        { id: uDirector, role: 'DIRECTOR', name: 'Director W3' },
        { id: uPrimaryPm, role: 'PM', name: 'PM 1' },
        { id: uSubPm1, role: 'PM', name: 'Sub PM 1' },
        { id: uSubPm2, role: 'PM', name: 'Sub PM 2' },
        { id: uUnrelatedPm, role: 'PM', name: 'Unrelated PM' },
      ],
    });

    // Create Clients
    await admin.clientCompany.createMany({
      data: [
        { id: C1_VISIBLE, code: `CC1-${RUN}`, name: 'Client Visible' },
        { id: C2_HIDDEN, code: `CC2-${RUN}`, name: 'Client Hidden' },
      ],
    });

    // Create Projects
    await admin.project.createMany({
      data: [
        {
          id: P1_VISIBLE, code: `P1-${RUN}`, clientCompanyId: C1_VISIBLE, name: 'Project Visible',
          startDate: new Date(), isPublic: true, status: 'ACTIVE',
          pmUserId: uPrimaryPm, subPmUserId1: uSubPm1, subPmUserId2: uSubPm2,
        },
        {
          id: P2_HIDDEN, code: `P2-${RUN}`, clientCompanyId: C2_HIDDEN, name: 'Project Hidden',
          startDate: new Date(), isPublic: true, status: 'ACTIVE',
          pmUserId: uAdmin, // Unrelated PM doesn't own this either
        }
      ],
    });

    // Create Staffing Order
    await admin.staffingOrder.create({ data: { id: SO1, projectId: P1_VISIBLE, code: `SO1-${RUN}`, title: 'Order 1' } });

    // Create Job Opening and Slot for traversal
    await admin.jobOpening.create({ data: { id: JO1, staffingOrderId: SO1, status: 'OPEN' } });
    await admin.staffingOrderSlot.create({ data: { id: JO1, staffingOrderId: SO1, jobOpeningId: JO1, positionTitle: 'Test Slot', positionCode: `S-${RUN}`, slotsNeeded: 1, validFrom: new Date() } });
  });

  afterAll(async () => {
    await cleanup();
    await admin.$disconnect();
    await writer.$disconnect();
  });

  async function asRole<T>(ctx: AuthContext, cb: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withDbContext(writer, ctx, async (tx) => cb(tx));
  }

  describe('1. ADMIN → thấy mọi fixture', () => {
    const ctx: AuthContext = { userId: uAdmin, role: 'ADMIN' };
    it('sees client', async () => expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).not.toBeNull());
    it('sees project with slots', async () => {
      const p = await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE));
      expect(p).not.toBeNull();
      expect(p?.staffingOrders[0].slots[0].jobOpeningId).toBe(JO1);
    });
    it('sees job opening', async () => expect(await asRole(ctx, tx => getJobOpeningDetail(tx, JO1))).not.toBeNull());
  });

  describe('2. DIRECTOR → thấy mọi fixture', () => {
    const ctx: AuthContext = { userId: uDirector, role: 'DIRECTOR' };
    it('sees client', async () => expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).not.toBeNull());
    it('sees project with slots', async () => {
      const p = await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE));
      expect(p).not.toBeNull();
      expect(p?.staffingOrders[0].slots[0].jobOpeningId).toBe(JO1);
    });
    it('sees job opening', async () => expect(await asRole(ctx, tx => getJobOpeningDetail(tx, JO1))).not.toBeNull());
  });

  describe('3. assigned PM → thấy project/client/opening liên quan', () => {
    const ctx: AuthContext = { userId: uPrimaryPm, role: 'PM' };
    it('sees client', async () => expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).not.toBeNull());
    it('sees project with slots', async () => {
      const p = await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE));
      expect(p).not.toBeNull();
      expect(p?.staffingOrders[0].slots[0].jobOpeningId).toBe(JO1);
    });
    it('sees job opening', async () => expect(await asRole(ctx, tx => getJobOpeningDetail(tx, JO1))).not.toBeNull());
  });

  describe('4. sub-PM 1 và sub-PM 2 → thấy project liên quan', () => {
    it('sub-PM 1 sees project', async () => {
      const ctx: AuthContext = { userId: uSubPm1, role: 'PM' };
      const p = await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE));
      expect(p).not.toBeNull();
      expect(p?.staffingOrders[0].slots[0].jobOpeningId).toBe(JO1);
      expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).not.toBeNull();
    });
    it('sub-PM 2 sees project', async () => {
      const ctx: AuthContext = { userId: uSubPm2, role: 'PM' };
      const p = await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE));
      expect(p).not.toBeNull();
      expect(p?.staffingOrders[0].slots[0].jobOpeningId).toBe(JO1);
      expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).not.toBeNull();
    });
  });

  describe('5. unrelated PM → nhận null', () => {
    const ctx: AuthContext = { userId: uUnrelatedPm, role: 'PM' };
    it('cannot see project', async () => expect(await asRole(ctx, tx => getProjectDetail(tx, P1_VISIBLE))).toBeNull());
    it('cannot see job opening', async () => expect(await asRole(ctx, tx => getJobOpeningDetail(tx, JO1))).toBeNull());
  });

  describe('6. Client Guard verification', () => {
    it('unrelated PM cannot see C1 (has visible projects for others, none for him)', async () => {
      const ctx: AuthContext = { userId: uUnrelatedPm, role: 'PM' };
      expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C1_VISIBLE))).toBeNull();
    });

    it('Primary PM cannot see C2 (has no visible projects for him)', async () => {
      const ctx: AuthContext = { userId: uPrimaryPm, role: 'PM' };
      expect(await asRole(ctx, tx => getClientDetail(tx, ctx, C2_HIDDEN))).toBeNull();
    });
  });

  describe('7. missing ID → nhận null', () => {
    const ctx: AuthContext = { userId: uAdmin, role: 'ADMIN' };
    it('missing project returns null', async () => expect(await asRole(ctx, tx => getProjectDetail(tx, 'missing-id'))).toBeNull());
  });

  describe('8. missing GUC/context → fail closed', () => {
    it('fails when trying to read without RLS context applied', async () => {
      // Using writer directly without withDbContext
      await expect(getProjectDetail(writer, P1_VISIBLE)).rejects.toThrow();
    });
  });
});
