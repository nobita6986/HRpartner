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
  let originalActiveAdminIds: string[] = [];

  beforeAll(async () => {
    writer = new PrismaClient({ datasources: { db: { url: writerUrl } } });
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });

    // The disposable CI DB may contain a seeded active ADMIN. Snapshot and
    // temporarily deactivate those rows so only the two test admins participate
    // in the invariant; afterAll restores the original state even on assertion
    // failure. Never point these URLs at a non-test database.
    const originalAdmins = await admin.user.findMany({
      where: { role: SystemRole.ADMIN, isActive: true },
      select: { id: true },
    });
    originalActiveAdminIds = originalAdmins.map(({ id }) => id);
    if (originalActiveAdminIds.length > 0) {
      await admin.user.updateMany({
        where: { id: { in: originalActiveAdminIds } },
        data: { isActive: false },
      });
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
      try {
        await admin.auditLog.deleteMany({ where: { entityType: 'User', entityId: { in: adminIds } } });
        await admin.user.deleteMany({ where: { id: { in: adminIds } } });
      } finally {
        try {
          if (originalActiveAdminIds.length > 0) {
            await admin.user.updateMany({
              where: { id: { in: originalActiveAdminIds } },
              data: { isActive: true },
            });
          }
        } finally {
          await admin.$disconnect();
        }
      }
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
      const error = rejected.reason as { code?: string; message?: string; meta?: unknown };
      const diagnostic = JSON.stringify({ code: error.code, message: error.message, meta: error.meta });
      if (error.code === 'P2010') {
        expect((error.meta as { code?: string } | undefined)?.code, diagnostic).toBe('40001');
      } else {
        expect(['P2034', 'LAST_ADMIN_PROTECTED'], `Unexpected mutation rejection: ${diagnostic}`).toContain(
          error.code,
        );
      }
    }

    const activeAdmins = await admin.user.count({ where: { role: SystemRole.ADMIN, isActive: true } });
    expect(activeAdmins).toBe(1);
  }, 30_000);
});
