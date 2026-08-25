/**
 * MP-3C LIVE assignment-placement evidence (STEP-08 / RQ-10 / AC-04, AC-05, AC-06, AC-07, AC-10).
 *
 * Runs only in the guarded integration lane. Fixture setup, verification and
 * cleanup use DATABASE_URL_ADMIN (admin role — bypasses RLS but NOT unique
 * indexes); the competing commands run through the real RLS-enforcing
 * DATABASE_URL principal via withDbContext, exactly like the MP-3B harness.
 *
 * These prove the invariants an app-only check cannot: two independent clients
 * racing for the last slot, the same submission raced, idempotent replay, the
 * DB unique backstops, role/IDOR denial, a Referral-Guard override that audits
 * once, and denormalized counters that always equal the live ACTIVE count.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { withIdempotency, IdempotencyConflictError } from '@/src/shared/integrity/idempotency';
import {
  activatePlacement,
  previewPlacement,
  PlacementError,
  type ActivatePlacementInput,
} from '@/src/domains/staffing/assignment-placement.service';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.MP3C_LIVE_PLACEMENT_CHECK && ADMIN_URL && WRITER_URL);

const ROUTE = 'POST:/api/admin/assignments';
const PAST_ISO = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // active now (validFrom <= now)

// ─── Fixture bookkeeping — everything created is tracked and torn down in FK order ──

interface Tracker {
  actorIds: string[];
  submissionIds: string[];
  slotIds: string[];
  orderIds: string[];
  projectIds: string[];
  clientCompanyIds: string[];
  workerIds: string[];
}

const newTracker = (): Tracker => ({
  actorIds: [], submissionIds: [], slotIds: [], orderIds: [], projectIds: [], clientCompanyIds: [], workerIds: [],
});

describe.skipIf(!enabled)('MP-3C LIVE assignment placement', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writerA = new PrismaClient({ datasourceUrl: WRITER_URL });
  const writerB = new PrismaClient({ datasourceUrl: WRITER_URL });

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writerA.$connect(), writerB.$connect()]);
  }, 30_000);
  afterAll(async () => {
    await Promise.all([admin.$disconnect(), writerA.$disconnect(), writerB.$disconnect()]);
  });

  const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Seed the acting user (placement actor) at the given role.
  async function seedActor(role: 'ADMIN' | 'HR_MANAGER' | 'DIRECTOR' | 'SALE', t: Tracker): Promise<string> {
    const id = `mp3c-actor-${role}-${uniq()}`;
    await admin.user.create({ data: { id, name: `MP3C ${role}`, role, isActive: true } });
    t.actorIds.push(id);
    return id;
  }

  // Seed a placeable project graph: ClientCompany → Project(ACTIVE) → StaffingOrder(OPEN) → Slot(active now).
  async function seedGraph(opts: { slotsNeeded: number; quota: number }, t: Tracker) {
    const s = uniq();
    const company = await admin.clientCompany.create({ data: { code: `CC-${s}`, name: `Client ${s}`, status: 'ACTIVE' } });
    t.clientCompanyIds.push(company.id);
    const project = await admin.project.create({
      data: { code: `PRJ-${s}`, name: `Project ${s}`, clientCompanyId: company.id, startDate: new Date(PAST_ISO), status: 'ACTIVE', quota: opts.quota, filled: 0 },
    });
    t.projectIds.push(project.id);
    const order = await admin.staffingOrder.create({ data: { code: `SO-${s}`, title: `Order ${s}`, projectId: project.id, status: 'OPEN' } });
    t.orderIds.push(order.id);
    const slot = await admin.staffingOrderSlot.create({
      data: { staffingOrderId: order.id, positionCode: 'ELECTRICIAN', positionTitle: 'Thợ điện', slotsNeeded: opts.slotsNeeded, slotsFilled: 0, validFrom: new Date(PAST_ISO) },
    });
    t.slotIds.push(slot.id);
    return { projectId: project.id, orderId: order.id, slotId: slot.id };
  }

  // Seed a CONVERTED submission with its worker + exactly one accepted source claim linked to that submission.
  async function seedConverted(slotId: string, t: Tracker): Promise<{ workerId: string; submissionId: string }> {
    const s = uniq();
    const wu = `mp3c-wu-${s}`;
    await admin.user.create({ data: { id: wu, name: `MP3C Worker ${s}`, role: 'WORKER', isActive: true } });
    const worker = await admin.worker.create({ data: { userId: wu } });
    t.workerIds.push(worker.id);
    const submission = await admin.candidateSubmission.create({
      data: { fullName: `Ứng viên ${s}`, phone: `090${Math.floor(1000000 + Math.random() * 8999999)}`, status: 'CONVERTED', workerId: worker.id, slotId },
    });
    t.submissionIds.push(submission.id);
    await admin.sourceClaim.create({ data: { workerId: worker.id, claimType: 'HRP_DIRECT', accepted: true, submissionId: submission.id } });
    return { workerId: worker.id, submissionId: submission.id };
  }

  const activeForSlot = (slotId: string) =>
    admin.projectAssignment.count({ where: { staffingOrderSlotId: slotId, status: 'ACTIVE' } });

  const baseInput = (submissionId: string, employeeCode: string, over?: Partial<ActivatePlacementInput>): ActivatePlacementInput => ({
    submissionId, employeeCode, employmentType: 'OUTSOURCED', validFrom: PAST_ISO, reason: 'Duyệt xếp việc', ...over,
  });

  // Tear everything down in FK order. Idempotent — safe to call in finally even after a partial seed.
  async function cleanup(t: Tracker): Promise<void> {
    const assigns = await admin.projectAssignment.findMany({ where: { submissionId: { in: t.submissionIds } }, select: { id: true } });
    const assignIds = assigns.map((a) => a.id);
    await admin.outboxEvent.deleteMany({ where: { aggregateId: { in: assignIds } } });
    await admin.auditLog.deleteMany({ where: { entityId: { in: [...t.submissionIds, ...assignIds] } } });
    await admin.idempotencyKey.deleteMany({ where: { actorId: { in: t.actorIds } } });
    await admin.projectAssignment.deleteMany({ where: { submissionId: { in: t.submissionIds } } });
    await admin.projectAssignment.deleteMany({ where: { workerId: { in: t.workerIds } } });
    await admin.sourceClaim.deleteMany({ where: { workerId: { in: t.workerIds } } });
    await admin.candidateSubmission.deleteMany({ where: { id: { in: t.submissionIds } } });
    await admin.staffingOrderSlot.deleteMany({ where: { id: { in: t.slotIds } } });
    await admin.staffingOrder.deleteMany({ where: { id: { in: t.orderIds } } });
    await admin.project.deleteMany({ where: { id: { in: t.projectIds } } });
    await admin.clientCompany.deleteMany({ where: { id: { in: t.clientCompanyIds } } });
    const workerUsers = await admin.worker.findMany({ where: { id: { in: t.workerIds } }, select: { userId: true } });
    await admin.worker.deleteMany({ where: { id: { in: t.workerIds } } });
    await admin.user.deleteMany({ where: { id: { in: [...t.actorIds, ...workerUsers.map((w) => w.userId)] } } });
  }

  // ── AC-03 / AC-10: a single activation moves every counter exactly once ──────
  it('activates one submission: ACTIVE assignment, +1 counters, one audit, one outbox, counter == live ACTIVE', async () => {
    const t = newTracker();
    const actorId = await seedActor('HR_MANAGER', t);
    const ctx = { userId: actorId, role: 'HR_MANAGER' as const };
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 3, quota: 10 }, t);
    const { workerId, submissionId } = await seedConverted(slotId, t);
    try {
      const res = await withDbContext(writerA, ctx, (tx) =>
        activatePlacement(tx, ctx, baseInput(submissionId, `EMP-${uniq()}`)),
      );
      expect(res.status).toBe('ACTIVE');
      expect(res.workerId).toBe(workerId);
      expect(res.submissionId).toBe(submissionId);
      expect(res.counters).toMatchObject({ slotsFilled: 1, slotsNeeded: 3, projectFilled: 1, projectQuota: 10 });

      const assignment = await admin.projectAssignment.findUnique({
        where: { submissionId }, select: { id: true, status: true, staffingOrderSlotId: true, isPrimary: true },
      });
      expect(assignment?.status).toBe('ACTIVE');
      expect(assignment?.staffingOrderSlotId).toBe(slotId);
      expect(assignment?.isPrimary).toBe(true);

      const slot = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { slotsFilled: true } });
      const project = await admin.project.findUnique({ where: { id: projectId }, select: { filled: true } });
      expect(slot?.slotsFilled).toBe(1);
      expect(project?.filled).toBe(1);
      expect(slot?.slotsFilled).toBe(await activeForSlot(slotId)); // AC-10: denorm == live ACTIVE

      const audits = await admin.auditLog.count({ where: { entityId: assignment!.id, action: 'ASSIGNMENT_ACTIVATE' } });
      const outbox = await admin.outboxEvent.count({ where: { aggregateId: assignment!.id, eventType: 'AssignmentActivated' } });
      expect(audits).toBe(1);
      expect(outbox).toBe(1);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-04 / AC-10: two workers race the LAST slot — one wins, loser leaves no residue ──
  it('last-slot race (two workers, slotsNeeded=1): exactly one ACTIVE, loser SLOT_UNAVAILABLE, counter == 1', async () => {
    const t = newTracker();
    const actorId = await seedActor('ADMIN', t);
    const ctx = { userId: actorId, role: 'ADMIN' as const };
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 1, quota: 10 }, t);
    const w1 = await seedConverted(slotId, t);
    const w2 = await seedConverted(slotId, t);
    try {
      const [a, b] = await Promise.allSettled([
        withDbContext(writerA, ctx, (tx) => activatePlacement(tx, ctx, baseInput(w1.submissionId, `EMP-A-${uniq()}`))),
        withDbContext(writerB, ctx, (tx) => activatePlacement(tx, ctx, baseInput(w2.submissionId, `EMP-B-${uniq()}`))),
      ]);
      const fulfilled = [a, b].filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof activatePlacement>>> => r.status === 'fulfilled',
      );
      const rejected = [a, b].filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(PlacementError);
      expect(rejected[0].reason).toMatchObject({ code: 'SLOT_UNAVAILABLE', httpStatus: 409 });

      const activeCount = await admin.projectAssignment.count({ where: { staffingOrderSlotId: slotId, status: 'ACTIVE' } });
      expect(activeCount).toBe(1);
      const slot = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { slotsFilled: true } });
      const project = await admin.project.findUnique({ where: { id: projectId }, select: { filled: true } });
      expect(slot?.slotsFilled).toBe(1);
      expect(project?.filled).toBe(1);
      expect(slot?.slotsFilled).toBe(await activeForSlot(slotId)); // AC-10 holds after a race
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-04: the SAME submission raced twice (no idempotency key) — worker lock serializes ──
  it('same submission raced twice: one ACTIVE, loser ASSIGNMENT_EXISTS, counters move once', async () => {
    const t = newTracker();
    const actorId = await seedActor('ADMIN', t);
    const ctx = { userId: actorId, role: 'ADMIN' as const };
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 5, quota: 10 }, t);
    const { submissionId } = await seedConverted(slotId, t);
    const emp = `EMP-${uniq()}`;
    try {
      const [a, b] = await Promise.allSettled([
        withDbContext(writerA, ctx, (tx) => activatePlacement(tx, ctx, baseInput(submissionId, emp))),
        withDbContext(writerB, ctx, (tx) => activatePlacement(tx, ctx, baseInput(submissionId, emp))),
      ]);
      const fulfilled = [a, b].filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof activatePlacement>>> => r.status === 'fulfilled',
      );
      const rejected = [a, b].filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(PlacementError);
      // First blocking conflict (CONFLICT_ORDER) is ASSIGNMENT_EXISTS once the winner committed.
      expect(rejected[0].reason).toMatchObject({ code: 'ASSIGNMENT_EXISTS', httpStatus: 409 });

      const assignments = await admin.projectAssignment.findMany({ where: { submissionId }, select: { id: true } });
      expect(assignments).toHaveLength(1);
      const slot = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { slotsFilled: true } });
      const project = await admin.project.findUnique({ where: { id: projectId }, select: { filled: true } });
      expect(slot?.slotsFilled).toBe(1); // exactly once — the loser never incremented
      expect(project?.filled).toBe(1);
      const audits = await admin.auditLog.count({ where: { entityId: assignments[0].id, action: 'ASSIGNMENT_ACTIVATE' } });
      const outbox = await admin.outboxEvent.count({ where: { aggregateId: assignments[0].id, eventType: 'AssignmentActivated' } });
      expect(audits).toBe(1);
      expect(outbox).toBe(1);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-06: idempotent replay — same key+payload never doubles the effect ────
  it('idempotent replay: same key+payload replays (no double counter/audit/outbox); different payload conflicts', async () => {
    const t = newTracker();
    const actorId = await seedActor('HR_MANAGER', t);
    const ctx = { userId: actorId, role: 'HR_MANAGER' as const };
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 5, quota: 10 }, t);
    const { submissionId } = await seedConverted(slotId, t);
    const key = `idem-${uniq()}`;
    const input = baseInput(submissionId, `EMP-${uniq()}`);
    const call = (client: PrismaClient, body: ActivatePlacementInput) =>
      withDbContext(client, ctx, (tx) =>
        withIdempotency({
          prisma: tx, route: ROUTE, actorId: ctx.userId, key, requestBody: body,
          handler: async () => ({ body: await activatePlacement(tx, ctx, body), statusCode: 200 }),
        }),
      );
    try {
      const first = await call(writerA, input);
      const firstBody = first.body as Awaited<ReturnType<typeof activatePlacement>>;
      expect(first.replayed).toBe(false);
      expect(firstBody.status).toBe('ACTIVE');

      const second = await call(writerB, input);
      expect(second.replayed).toBe(true);
      expect((second.body as Awaited<ReturnType<typeof activatePlacement>>).assignmentId).toBe(firstBody.assignmentId);

      const slot = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { slotsFilled: true } });
      const project = await admin.project.findUnique({ where: { id: projectId }, select: { filled: true } });
      expect(slot?.slotsFilled).toBe(1); // replay did not increment again
      expect(project?.filled).toBe(1);
      expect(await admin.auditLog.count({ where: { entityId: firstBody.assignmentId, action: 'ASSIGNMENT_ACTIVATE' } })).toBe(1);
      expect(await admin.outboxEvent.count({ where: { aggregateId: firstBody.assignmentId } })).toBe(1);

      await expect(call(writerA, baseInput(submissionId, `EMP-OTHER-${uniq()}`)))
        .rejects.toBeInstanceOf(IdempotencyConflictError);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-04 backstop: the DB unique indexes reject duplicates even under the admin role ──
  it('DB indexes backstop the app: duplicate ACTIVE-worker, submission, and project+employeeCode all reject (P2002)', async () => {
    const t = newTracker();
    const actorId = await seedActor('ADMIN', t);
    const ctx = { userId: actorId, role: 'ADMIN' as const };
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 5, quota: 10 }, t);
    const { workerId: w1, submissionId: s1 } = await seedConverted(slotId, t);
    const emp1 = `EMP-1-${uniq()}`;
    const mkWorker = async (): Promise<string> => {
      const s = uniq();
      const u = `mp3c-bw-${s}`;
      await admin.user.create({ data: { id: u, name: `BW ${s}`, role: 'WORKER', isActive: true } });
      const w = await admin.worker.create({ data: { userId: u } });
      t.workerIds.push(w.id);
      return w.id;
    };
    const w2 = await mkWorker();
    const w3 = await mkWorker();
    try {
      await withDbContext(writerA, ctx, (tx) => activatePlacement(tx, ctx, baseInput(s1, emp1)));
      const P2002 = { code: 'P2002' };

      // (a) one_active_assignment(worker_id) WHERE status='ACTIVE' — W1 is already ACTIVE.
      await expect(admin.projectAssignment.create({ data: {
        workerId: w1, projectId, employeeCode: `EMP-DUP-A-${uniq()}`, employmentType: 'OUTSOURCED',
        validFrom: new Date(PAST_ISO), status: 'ACTIVE',
      } })).rejects.toMatchObject(P2002);

      // (b) project_assignments_submission_id_key — S1 already owns an assignment.
      await expect(admin.projectAssignment.create({ data: {
        workerId: w2, projectId, employeeCode: `EMP-DUP-B-${uniq()}`, employmentType: 'OUTSOURCED',
        validFrom: new Date(PAST_ISO), status: 'PLANNED', submissionId: s1,
      } })).rejects.toMatchObject(P2002);

      // (c) @@unique([projectId, employeeCode]) — emp1 already taken in this project.
      await expect(admin.projectAssignment.create({ data: {
        workerId: w3, projectId, employeeCode: emp1, employmentType: 'OUTSOURCED',
        validFrom: new Date(PAST_ISO), status: 'PLANNED',
      } })).rejects.toMatchObject(P2002);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-07: role/IDOR denial — a non-placement role cannot preview or activate ──
  it('role deny (IDOR): DIRECTOR and SALE are FORBIDDEN (403) on preview and activate, and write nothing', async () => {
    const t = newTracker();
    const actorId = await seedActor('ADMIN', t); // the ctx.role passed below is what actually gates
    const { slotId, projectId } = await seedGraph({ slotsNeeded: 3, quota: 10 }, t);
    const { submissionId } = await seedConverted(slotId, t);
    const input = baseInput(submissionId, `EMP-${uniq()}`);
    try {
      for (const role of ['DIRECTOR', 'SALE'] as const) {
        const ctx = { userId: actorId, role };
        await expect(withDbContext(writerA, ctx, (tx) => activatePlacement(tx, ctx, input)))
          .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
        await expect(withDbContext(writerA, ctx, (tx) => previewPlacement(tx, ctx, input)))
          .rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
      }
      expect(await admin.projectAssignment.count({ where: { submissionId } })).toBe(0);
      const slot = await admin.staffingOrderSlot.findUnique({ where: { id: slotId }, select: { slotsFilled: true } });
      const project = await admin.project.findUnique({ where: { id: projectId }, select: { filled: true } });
      expect(slot?.slotsFilled).toBe(0);
      expect(project?.filled).toBe(0);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

  // ── AC-05: Referral-Guard R1 blocks, a permitted override clears it and audits exactly once ──
  it('referral guard R1 blocks placement; a valid override activates and writes exactly one OVERRIDE_S2 audit', async () => {
    const t = newTracker();
    const actorId = await seedActor('ADMIN', t);
    const ctx = { userId: actorId, role: 'ADMIN' as const };
    const { slotId } = await seedGraph({ slotsNeeded: 5, quota: 10 }, t);
    const { workerId, submissionId } = await seedConverted(slotId, t);
    // A second recent submission for the SAME worker trips R1 (PUBLIC → 7-day window).
    const sibling = await admin.candidateSubmission.create({
      data: { fullName: `Sibling ${uniq()}`, phone: `091${Math.floor(1000000 + Math.random() * 8999999)}`, status: 'NEW', workerId },
    });
    t.submissionIds.push(sibling.id);
    try {
      // Without an override the guard blocks.
      await expect(withDbContext(writerA, ctx, (tx) => activatePlacement(tx, ctx, baseInput(submissionId, `EMP-NG-${uniq()}`))))
        .rejects.toMatchObject({ code: 'REFERRAL_GUARD_BLOCKED', httpStatus: 409 });
      expect(await admin.projectAssignment.count({ where: { submissionId } })).toBe(0);

      // A permitted override clears it.
      const res = await withDbContext(writerA, ctx, (tx) =>
        activatePlacement(tx, ctx, baseInput(submissionId, `EMP-OK-${uniq()}`, {
          override: { overrideCase: 'S2', reason: 'Client xác nhận ưu tiên tái bố trí' },
          hasOverridePermission: true,
        })),
      );
      expect(res.status).toBe('ACTIVE');
      expect(res.overrideApplied).toBe(true);

      // Exactly one override audit on the submission, and it is OVERRIDE_S2.
      const onSubmission = await admin.auditLog.findMany({ where: { entityId: submissionId }, select: { action: true } });
      const overrideRows = onSubmission.filter((a) => a.action.startsWith('OVERRIDE'));
      expect(overrideRows).toHaveLength(1);
      expect(overrideRows[0].action).toBe('OVERRIDE_S2');
      // And exactly one activation audit on the assignment.
      expect(await admin.auditLog.count({ where: { entityId: res.assignmentId, action: 'ASSIGNMENT_ACTIVATE' } })).toBe(1);
    } finally {
      await cleanup(t);
    }
  }, 30_000);

});
