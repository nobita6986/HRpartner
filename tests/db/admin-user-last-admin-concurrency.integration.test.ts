/** Real PostgreSQL proof for the admin last-admin race guard (PR #119 audit correction). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, SystemRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { updateUser, withSerializableUserManagementDb } from '@/src/domains/admin/user-management.service';

const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const hasTestDb = Boolean(writerUrl && adminUrl && !writerUrl.includes('placeholder') && !adminUrl.includes('placeholder'));
const runId = randomUUID();
const adminIds = [`${runId}-admin-a`, `${runId}-admin-b`];

const describeWithDb = hasTestDb ? describe : describe.skip;

describeWithDb('user management last-admin concurrency (PostgreSQL)', () => {
  let writer: PrismaClient;
  let admin: PrismaClient;

  beforeAll(async () => {
    writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });

    // The integration DB is a fresh migrated container; keep this proof isolated
    // so the two fixture admins are the complete active-admin set.
    const existingAdmins = await admin.user.count({ where: { role: SystemRole.ADMIN, isActive: true } });
    if (existingAdmins !== 0) {
      throw new Error(`LAST_ADMIN_TEST_REQUIRES_EMPTY_ADMIN_SET: found ${existingAdmins} active ADMIN rows`);
    }

    await admin.user.createMany({
      data: adminIds.map((id, index) => ({
        id,
        name: `last-admin-race-${index}`,
        role: SystemRole.ADMIN,
        isActive: true,
      })),
    });
  });

  afterAll(async () => {
    if (admin) {
      await admin.auditLog.deleteMany({ where: { entityType: 'User', entityId: { in: adminIds } } });
      await admin.user.deleteMany({ where: { id: { in: adminIds } } });
      await admin.$disconnect();
    }
    if (writer) await writer.$disconnect();
  });

  it('serializes concurrent demotions and never leaves zero active admins', async () => {
    const attempts = adminIds.map((actorId, index) => {
      const targetId = adminIds[1 - index];
      const ctx = { userId: actorId, role: SystemRole.ADMIN };
      return withSerializableUserManagementDb(writer, ctx, (tx) =>
        updateUser(tx, ctx, targetId, {
          role: SystemRole.HR_MANAGER,
          reason: 'Integration test: concurrent admin demotion',
        }),
      );
    });

    const outcomes = await Promise.allSettled(attempts);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);

    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      const error = rejected.reason as { code?: string };
      expect(['P2034', 'LAST_ADMIN_PROTECTED']).toContain(error.code);
    }

    const activeAdmins = await admin.user.count({ where: { role: SystemRole.ADMIN, isActive: true } });
    expect(activeAdmins).toBe(1);
  }, 30_000);
});
