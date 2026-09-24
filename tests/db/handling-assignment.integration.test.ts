import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';

import {
  managerAssign,
  releaseHandlingAssignment,
} from '@/src/domains/talent/handling-assignment.service';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');
const runId = `w5-${randomUUID().slice(0, 8)}`;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

async function withContext<T>(
  client: PrismaClient,
  userId: string,
  role: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT set_config('app.user_id', $1, true)", userId);
    await tx.$executeRawUnsafe("SELECT set_config('app.role', $1, true)", role);
    await tx.$executeRawUnsafe("SELECT set_config('app.vendor_id', '', true)");
    await tx.$executeRawUnsafe("SELECT set_config('app.worker_id', '', true)");
    return callback(tx);
  });
}

describe.skipIf(!HAS_TEST_DB)('W5 HandlingAssignment safety', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;
  const managerId = `${runId}-manager`;
  const staffId = `${runId}-staff`;
  const otherStaffId = `${runId}-other`;
  const ctvId = `${runId}-ctv`;
  const profileIds: string[] = [];
  const assignmentIds: string[] = [];

  beforeAll(async () => {
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);

    await admin.user.createMany({
      data: [
        { id: managerId, phone: `${runId}-m`, name: 'W5 Manager', role: 'HR_MANAGER' },
        { id: staffId, phone: `${runId}-s`, name: 'W5 Staff', role: 'HR_STAFF' },
        { id: otherStaffId, phone: `${runId}-o`, name: 'W5 Other', role: 'HR_STAFF' },
        { id: ctvId, phone: `${runId}-c`, name: 'W5 CTV', role: 'CTV' },
      ],
    });
  }, 30_000);

  afterAll(async () => {
    try {
      await admin?.laborProfileHandlingAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
      await admin?.laborProfile.deleteMany({ where: { id: { in: profileIds } } });
      await admin?.user.deleteMany({
        where: { id: { in: [managerId, staffId, otherStaffId, ctvId] } },
      });
    } finally {
      await writer?.$disconnect().catch(() => {});
      await admin?.$disconnect().catch(() => {});
    }
  }, 30_000);

  async function createProfile(label: string) {
    const profile = await admin.laborProfile.create({
      data: { fullName: `W5 ${label} ${runId}` },
    });
    profileIds.push(profile.id);
    return profile;
  }

  it('sweeps an elapsed ACTIVE row before manager reassignment', async () => {
    const profile = await createProfile('expired');
    const expired = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: profile.id,
        assigneeUserId: ctvId,
        source: 'AFF_INITIAL',
        startsAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    assignmentIds.push(expired.id);

    const replacement = await withContext(writer, managerId, 'HR_MANAGER', (tx) =>
      managerAssign(tx, {
        laborProfileId: profile.id,
        newAssigneeUserId: staffId,
        managerUserId: managerId,
        days: 7,
        reason: 'W5 integration reassignment',
      }),
    );
    assignmentIds.push(replacement.id);

    const rows = await admin.laborProfileHandlingAssignment.findMany({
      where: { laborProfileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === expired.id)?.status).toBe('EXPIRED');
    expect(rows.find((row) => row.id === replacement.id)?.status).toBe('ACTIVE');
    expect(replacement.previousAssignmentId).toBeNull();
  });

  it('records a manual release as REVOKED', async () => {
    const profile = await createProfile('release');
    const active = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: profile.id,
        assigneeUserId: staffId,
        assignedByUserId: managerId,
        source: 'MANAGER_ASSIGNMENT',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    assignmentIds.push(active.id);

    const released = await withContext(writer, managerId, 'HR_MANAGER', (tx) =>
      releaseHandlingAssignment(tx, {
        laborProfileId: profile.id,
        actorId: managerId,
        reason: 'W5 integration release',
      }),
    );

    expect(released?.status).toBe('REVOKED');
    expect(released?.reason).toContain('W5 integration release');
  });

  it('allows assignees to read only their own rows', async () => {
    const staffProfile = await createProfile('staff-scope');
    const ctvProfile = await createProfile('ctv-scope');
    const staffStartsAt = new Date();
    const staffAssignment = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: staffProfile.id,
        assigneeUserId: staffId,
        source: 'MANAGER_ASSIGNMENT',
        startsAt: staffStartsAt,
        expiresAt: new Date(staffStartsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    });
    const ctvAssignment = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: ctvProfile.id,
        assigneeUserId: ctvId,
        source: 'AFF_INITIAL',
        startsAt: new Date(),
        status: 'COMPLETED',
      },
    });
    assignmentIds.push(staffAssignment.id, ctvAssignment.id);
    const ids = [staffAssignment.id, ctvAssignment.id];

    const staffRows = await withContext(writer, staffId, 'HR_STAFF', (tx) =>
      tx.laborProfileHandlingAssignment.findMany({ where: { id: { in: ids } } }),
    );
    const ctvRows = await withContext(writer, ctvId, 'CTV', (tx) =>
      tx.laborProfileHandlingAssignment.findMany({ where: { id: { in: ids } } }),
    );
    const unrelatedRows = await withContext(writer, otherStaffId, 'HR_STAFF', (tx) =>
      tx.laborProfileHandlingAssignment.findMany({ where: { id: { in: ids } } }),
    );

    expect(staffRows.map((row) => row.id)).toEqual([staffAssignment.id]);
    expect(ctvRows.map((row) => row.id)).toEqual([ctvAssignment.id]);
    expect(unrelatedRows).toEqual([]);
  });

  it('denies missing-context reads and assignee writes', async () => {
    const profile = await createProfile('deny');
    const startsAt = new Date();
    const assignment = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: profile.id,
        assigneeUserId: staffId,
        source: 'MANAGER_ASSIGNMENT',
        startsAt,
        expiresAt: new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'COMPLETED',
      },
    });
    assignmentIds.push(assignment.id);

    const noContext = await writer.laborProfileHandlingAssignment.findMany({
      where: { id: assignment.id },
    });
    const updateResult = await withContext(writer, staffId, 'HR_STAFF', (tx) =>
      tx.laborProfileHandlingAssignment.updateMany({
        where: { id: assignment.id },
        data: { reason: 'unauthorized' },
      }),
    );
    let deleteError: unknown;
    try {
      await withContext(writer, managerId, 'HR_MANAGER', (tx) =>
        tx.laborProfileHandlingAssignment.deleteMany({ where: { id: assignment.id } }),
      );
    } catch (error) {
      deleteError = error;
    }
    const persisted = await admin.laborProfileHandlingAssignment.findUnique({
      where: { id: assignment.id },
    });
    const deleteErrorText = deleteError instanceof Error
      ? `${deleteError.name} ${deleteError.message} ${JSON.stringify(deleteError)}`
      : String(deleteError);

    expect(noContext).toEqual([]);
    expect(updateResult.count).toBe(0);
    expect(deleteError).toBeTruthy();
    expect(deleteErrorText).toMatch(/42501|permission denied|P2010/i);
    expect(persisted?.reason).toBeNull();
  });
});
