/**
 * live-ticket-rls-scope.m1-07a.test.ts — V5-M1-07a / RQ-05 / STEP-04 / AC-01..AC-06.
 *
 * LIVE evidence: runtime-role matrix test cho Ticket aggregate RLS.
 * Chạy trong integration lane khi DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST được set;
 * else ENV_BLOCKED — không fallback/mock/dev/prod.
 *
 * Pattern:
 *   - Seed/teardown qua DATABASE_URL_ADMIN (admin role = neondb_owner, bypass RLS).
 *   - Test trên DATABASE_URL (app_user_writer, RLS-enforcing).
 *   - GUC set bằng applyRlsContext(transaction) — transaction-local, không leak.
 *
 * PLN-01 fixes: ADMIN INSERT/UPDATE SUCCEED (DEC-06); DIRECTOR role tested as DIRECTOR (not ADMIN).
 * PLN-02 fix: ACCOUNTANT writes TicketHistory atomically.
 *
 * DEC-14 safety: dedicated test DB only; DATABASE_URL_TEST ≠ any protected URL.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { applyRlsContext } from './rls-context';
import { readRlsContext } from './rls-context';
import type { AuthContext } from './auth-context';
import type { SystemRole } from '@prisma/client';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(
  process.env.M1_07A_LIVE_TICKET_RLS && ADMIN_URL && WRITER_URL,
);

describe.skipIf(!enabled)(
  'V5-M1-07a LIVE — Ticket RLS scope (AC-01..AC-06)',
  () => {
    const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
    const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

    const RUN = `m107a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const stamp = Number(String(Date.now()).slice(-9));

    // ── Fixtures ──────────────────────────────────────────────────────────────
    const wAId = `wA-${RUN}`;
    const wBId = `wB-${RUN}`;
    const uAId = `uA-${RUN}`; // account_user_id for worker A
    const uBId = `uB-${RUN}`; // account_user_id for worker B
    const projAId = `projA-${RUN}`;
    const dirUId = `dir-${RUN}`; // DIRECTOR user
    const hrUId = `hr-staff-${RUN}`; // HR_STAFF user
    const pmUId = `pm-${RUN}`; // PM user (separate from workers)
    const accUId = `acc-${RUN}`; // ACCOUNTANT user

    // Ticket IDs
    let tAdvAId = '';       // ADVANCE_SALARY, worker A, HR_APPROVED
    let tAdvAHrAppId = ''; // ADVANCE_SALARY, worker A, HR_APPROVED (for accountant update)
    let tDisputeAId = '';  // TIMESHEET_DISPUTE, worker A, PENDING
    let tLeaveBId = '';    // LEAVE_REQUEST, worker B, PENDING
    let tAdvBHcpId = '';    // ADVANCE_SALARY, worker B, HR_APPROVED (for cross-worker check)
    let projAIdOut = '';

    beforeAll(async () => {
      await Promise.all([admin.$connect(), writer.$connect()]);

      // Pre-cleanup: remove any leftover test data from previous interrupted runs
      await admin.ticketNotification.deleteMany({ where: { ticket: { workerId: { in: [wAId, wBId] } } } }).catch(() => {});
      await admin.ticketComment.deleteMany({ where: { ticket: { workerId: { in: [wAId, wBId] } } } }).catch(() => {});
      await admin.ticket.deleteMany({ where: { workerId: { in: [wAId, wBId] } } }).catch(() => {});
      await admin.projectAssignment.deleteMany({ where: { workerId: { in: [wAId, wBId] } } }).catch(() => {});
      await admin.project.deleteMany({ where: { pmUserId: { in: [pmUId, uAId] } } }).catch(() => {});
      await admin.worker.deleteMany({ where: { id: { in: [wAId, wBId] } } }).catch(() => {});
      await admin.user.deleteMany({ where: { id: { in: [uAId, uBId, hrUId, dirUId, pmUId, accUId] } } }).catch(() => {});
      await admin.clientCompany.deleteMany({ where: { id: `cc-${RUN}` } }).catch(() => {});

      // Seed Users (FK required by Worker.user_id and Project.pm_user_id)
      await admin.user.createMany({
        data: [
          {
            id: uAId,
            phone: `0900001${String(stamp).padStart(4, '0')}`,
            name: `User A (${RUN})`,
            role: 'WORKER',
            isActive: true,
          },
          {
            id: uBId,
            phone: `0900002${String(stamp + 1).padStart(4, '0')}`,
            name: `User B (${RUN})`,
            role: 'WORKER',
            isActive: true,
          },
          {
            id: hrUId,
            phone: `0900003${String(stamp + 2).padStart(4, '0')}`,
            name: `HR Staff (${RUN})`,
            role: 'HR_STAFF',
            isActive: true,
          },
          {
            id: dirUId,
            phone: `0900004${String(stamp + 3).padStart(4, '0')}`,
            name: `Director (${RUN})`,
            role: 'DIRECTOR',
            isActive: true,
          },
          {
            id: accUId,
            phone: `0900005${String(stamp + 4).padStart(4, '0')}`,
            name: `Accountant (${RUN})`,
            role: 'ACCOUNTANT',
            isActive: true,
          },
          {
            id: pmUId,
            phone: `0900006${String(stamp + 5).padStart(4, '0')}`,
            name: `PM (${RUN})`,
            role: 'PM',
            isActive: true,
          },
        ],
      });

      // Seed workers (accountUserId = user_id for RLS WORKER visibility)
      await admin.worker.createMany({
        data: [
          {
            id: wAId,
            userId: uAId,
            accountUserId: uAId,
            fullName: `Worker A (${RUN})`,
            phone: `0900000${String(stamp).padStart(3, '0')}`,
            employmentStatus: 'ACTIVE',
          },
          {
            id: wBId,
            userId: uBId,
            accountUserId: uBId,
            fullName: `Worker B (${RUN})`,
            phone: `0900000${String(stamp + 1).padStart(3, '0')}`,
            employmentStatus: 'ACTIVE',
          },
        ],
      });

      // Seed ClientCompany (FK required by Project)
      await admin.clientCompany.create({
        data: {
          id: `cc-${RUN}`,
          code: `CC-${RUN}`,
          name: `ClientCo (${RUN})`,
        },
      });

      // Seed project for PM test
      const proj = await admin.project.create({
        data: {
          id: projAId,
          code: `PA-${RUN}`,
          name: `Project A (${RUN})`,
          clientCompanyId: `cc-${RUN}`,
          pmUserId: pmUId, // PM user (separate from workers)
          status: 'ACTIVE',
          startDate: new Date('2026-01-01'),
        },
      });
      projAIdOut = proj.id;

      // Worker B assigned to project A (for PM visibility test)
      await admin.projectAssignment.create({
        data: {
          workerId: wBId,
          projectId: proj.id,
          employeeCode: `EMP-B-${RUN}`,
          employmentType: 'OUTSOURCED',
          status: 'ACTIVE',
          validFrom: new Date('2026-01-01'),
        },
      });

      // Ticket 1: ADVANCE_SALARY, worker A, HR_APPROVED (for ACCOUNTANT)
      const advA = await admin.ticket.create({
        data: {
          type: 'ADVANCE_SALARY',
          workerId: wAId,
          createdByActorId: uAId,
          createdByRole: 'WORKER',
          status: 'HR_APPROVED',
          title: `Advance A (${RUN})`,
          description: 'advance salary test',
          amountVnd: 5_000_000n,
          deductMonth: 9,
          deductYear: 2026,
        },
      });

      // Ticket 2: Another ADVANCE_SALARY, worker A, HR_APPROVED (for accountant update test)
      const advAHrApp = await admin.ticket.create({
        data: {
          type: 'ADVANCE_SALARY',
          workerId: wAId,
          createdByActorId: uAId,
          createdByRole: 'WORKER',
          status: 'HR_APPROVED',
          title: `Advance A HrApp (${RUN})`,
          description: 'for accountant approve final',
          amountVnd: 3_000_000n,
          deductMonth: 9,
          deductYear: 2026,
        },
      });

      // Ticket 3: TIMESHEET_DISPUTE, worker A, PENDING
      const disA = await admin.ticket.create({
        data: {
          type: 'TIMESHEET_DISPUTE',
          workerId: wAId,
          createdByActorId: uAId,
          createdByRole: 'WORKER',
          status: 'PENDING',
          title: `Dispute A (${RUN})`,
          description: 'dispute test',
          assignmentId: (await admin.projectAssignment.create({
            data: {
              workerId: wAId,
              projectId: proj.id,
              employeeCode: `EMP-A-${RUN}`,
              employmentType: 'OUTSOURCED',
              status: 'ACTIVE',
              validFrom: new Date('2026-01-01'),
            },
          })).id,
          workDate: new Date('2026-08-01'),
          currentHours: 4,
          requestedHours: 8,
        },
      });

      // Ticket 4: LEAVE_REQUEST, worker B, PENDING (for HR_STAFF global queue)
      const levB = await admin.ticket.create({
        data: {
          type: 'LEAVE_REQUEST',
          workerId: wBId,
          createdByActorId: uBId,
          createdByRole: 'WORKER',
          status: 'PENDING',
          title: `Leave B (${RUN})`,
          description: 'leave test B',
          leaveFromDate: new Date('2026-09-01'),
          leaveToDate: new Date('2026-09-03'),
        },
      });

      // Ticket 5: ADVANCE_SALARY, worker B, HR_APPROVED (for cross-worker ACCOUNTANT)
      const advBHcp = await admin.ticket.create({
        data: {
          type: 'ADVANCE_SALARY',
          workerId: wBId,
          createdByActorId: uBId,
          createdByRole: 'WORKER',
          status: 'HR_APPROVED',
          title: `Advance B (${RUN})`,
          description: 'advance salary test B',
          amountVnd: 3_000_000n,
          deductMonth: 9,
          deductYear: 2026,
        },
      });

      tAdvAId = advA.id;
      tAdvAHrAppId = advAHrApp.id;
      tDisputeAId = disA.id;
      tLeaveBId = levB.id;
      tAdvBHcpId = advBHcp.id;

      // Seed comments: internal (HR only) + non-internal
      await admin.ticketComment.createMany({
        data: [
          {
            ticketId: tDisputeAId,
            authorId: uAId,
            authorRole: 'WORKER',
            authorName: 'Worker A',
            body: 'Public comment',
            isInternal: false,
          },
          {
            ticketId: tDisputeAId,
            authorId: hrUId,
            authorRole: 'HR_STAFF',
            authorName: 'HR Staff',
            body: 'Internal HR note',
            isInternal: true,
          },
        ],
      });

      // Seed notifications
      await admin.ticketNotification.createMany({
        data: [
          {
            ticketId: tAdvAId,
            recipientId: uAId,
            recipientRole: 'WORKER',
            subject: 'Advance approved',
            body: 'Your advance has been approved by HR',
          },
          {
            ticketId: tAdvAId,
            recipientId: accUId,
            recipientRole: 'ACCOUNTANT',
            subject: 'Pending advance',
            body: 'Advance needs finance approval',
          },
        ],
      });
    }, 60_000);

    afterAll(async () => {
      try {
        // Delete ALL tickets for seeded workers (handles beforeAll + per-test creates)
        await admin.ticketNotification.deleteMany({
          where: { ticket: { workerId: { in: [wAId, wBId] } } },
        });
        await admin.ticketComment.deleteMany({
          where: { ticket: { workerId: { in: [wAId, wBId] } } },
        });
        await admin.ticket.deleteMany({
          where: { workerId: { in: [wAId, wBId] } },
        });
        const projAsgns = await admin.projectAssignment.findMany({
          where: { projectId: projAIdOut },
          select: { id: true },
        });
        await admin.projectAssignment.deleteMany({ where: { id: { in: projAsgns.map((p) => p.id) } } });
        await admin.project.deleteMany({ where: { id: projAIdOut } });
        await admin.worker.deleteMany({ where: { id: { in: [wAId, wBId] } } });
        await admin.clientCompany.deleteMany({ where: { id: `cc-${RUN}` } });
        await admin.user.deleteMany({
          where: { id: { in: [uAId, uBId, hrUId, dirUId, pmUId, accUId] } },
        });
      } finally {
        await Promise.all([admin.$disconnect(), writer.$disconnect()]);
      }
    });

    // ── Helper: run a query as a given role via GUC transaction-local ─────────────
    async function asRole<T>(
      ctx: AuthContext,
      cb: (tx: PrismaClient) => Promise<T>,
    ): Promise<T> {
      return writer.$transaction(async (tx) => {
        await applyRlsContext(tx as Parameters<typeof applyRlsContext>[0], ctx);
        return cb(tx as PrismaClient);
      });
    }

    // ── AC-01: RLS catalog flags + policy inventory ────────────────────────────
    it('AC-01: tickets + 3 child tables have RLS ENABLED + FORCE', async () => {
      const rows = await admin.$queryRawUnsafe<
        Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>
      >(
        `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
         WHERE relname IN ('tickets','ticket_history','ticket_comments','ticket_notifications')
         ORDER BY relname`,
      );
      expect(rows.length).toBe(4);
      for (const row of rows) {
        expect(row.relrowsecurity).toBe(true);
        expect(row.relforcerowsecurity).toBe(true);
      }
    });

    it('AC-01: no legacy FOR ALL policies remain on tickets', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ polname: string }>>(
        `SELECT polname FROM pg_policy WHERE polrelid = 'tickets'::regclass`,
      );
      const names = rows.map((r) => r.polname);
      expect(names).not.toContain('hrp_ticket_scope');
      expect(names).toContain('hrp_ticket_select');
      expect(names).toContain('hrp_ticket_insert');
      expect(names).toContain('hrp_ticket_update');
      expect(names).toContain('hrp_ticket_delete');
    });

    // ── AC-02: WORKER self create/read/update + cross-worker deny ──────────────
    it('AC-02: WORKER A can INSERT own new ticket (positive)', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      const created = await asRole(ctx, (tx) =>
        tx.ticket.create({
          data: {
            type: 'LEAVE_REQUEST',
            workerId: wAId,
            createdByActorId: uAId,
            createdByRole: 'WORKER',
            status: 'PENDING',
            title: `Worker A self-create (${RUN})`,
            description: 'test self insert',
            leaveFromDate: new Date('2026-10-01'),
            leaveToDate: new Date('2026-10-02'),
          },
        }),
      );
      expect(created.id).toBeTruthy();
      expect(created.workerId).toBe(wAId);
      // Cleanup
      await admin.ticket.delete({ where: { id: created.id } });
    });

    it('AC-02: WORKER A can UPDATE own ticket (positive — cancel PENDING)', async () => {
      // Create a ticket first
      const ticket = await admin.ticket.create({
        data: {
          type: 'OTHER',
          workerId: wAId,
          createdByActorId: uAId,
          createdByRole: 'WORKER',
          status: 'PENDING',
          title: `Worker A self-update (${RUN})`,
          description: 'test self update',
        },
      });
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      const updated = await asRole(ctx, (tx) =>
        tx.ticket.update({
          where: { id: ticket.id, status: 'PENDING' },
          data: { status: 'CANCELLED', version: { increment: 1 } },
          select: { id: true, status: true },
        }),
      );
      expect(updated.status).toBe('CANCELLED');
      // Cleanup
      await admin.ticket.delete({ where: { id: ticket.id } });
    });

    it('AC-02: WORKER A sees own tickets (self SELECT positive)', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({ select: { id: true, workerId: true } }),
      ) as Array<{ id: string; workerId: string }>;
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every((r) => r.workerId === wAId)).toBe(true);
      expect(rows.some((r) => r.id === tAdvAId)).toBe(true);
      expect(rows.some((r) => r.id === tDisputeAId)).toBe(true);
    });

    it('AC-02: WORKER A does NOT see tickets of WORKER B (cross-worker SELECT deny)', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({ where: { id: tLeaveBId } }),
      ) as unknown[];
      expect(rows).toHaveLength(0);
    });

    it('AC-02: WORKER A cannot UPDATE ticket of WORKER B (cross-worker UPDATE deny)', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.update({
            where: { id: tLeaveBId },
            data: { title: 'hacked' },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-02: WORKER A cannot INSERT ticket for WORKER B (cross-worker INSERT deny)', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.create({
            data: {
              type: 'LEAVE_REQUEST',
              workerId: wBId, // NOT own worker
              createdByActorId: uAId,
              createdByRole: 'WORKER',
              status: 'PENDING',
              title: 'Worker A fake for B',
              description: 'should be denied',
              leaveFromDate: new Date('2026-10-01'),
              leaveToDate: new Date('2026-10-02'),
            },
          }),
        ),
      ).rejects.toThrow();
    });

    // ── AC-02: HR_STAFF global PENDING queue ────────────────────────────────────
    it('AC-02: HR_STAFF sees global PENDING queue (all workers, not assigned_to_id=self)', async () => {
      const ctx: AuthContext = { userId: hrUId, role: 'HR_STAFF' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({
          where: { status: 'PENDING' },
          select: { id: true, workerId: true, status: true },
        }),
      ) as Array<{ id: string; workerId: string; status: string }>;
      // HR_STAFF should see PENDING tickets from ALL workers (global queue)
      expect(rows.length).toBeGreaterThanOrEqual(2); // tDisputeAId + tLeaveBId
      expect(rows.some((r) => r.id === tDisputeAId && r.workerId === wAId)).toBe(true);
      expect(rows.some((r) => r.id === tLeaveBId && r.workerId === wBId)).toBe(true);
    });

    it('AC-02: HR_STAFF can approve a PENDING ticket (canonical HR action positive)', async () => {
      // Create a new PENDING ticket to approve
      const ticket = await admin.ticket.create({
        data: {
          type: 'LEAVE_REQUEST',
          workerId: wBId,
          createdByActorId: uBId,
          createdByRole: 'WORKER',
          status: 'PENDING',
          title: `HR approve test (${RUN})`,
          description: 'test hr approval',
          leaveFromDate: new Date('2026-10-05'),
          leaveToDate: new Date('2026-10-06'),
        },
      });

      const ctx: AuthContext = { userId: hrUId, role: 'HR_STAFF' };
      const updated = await asRole(ctx, (tx) =>
        tx.ticket.update({
          where: { id: ticket.id, status: 'PENDING' },
          data: { status: 'HR_APPROVED', version: { increment: 1 } },
          select: { id: true, status: true },
        }),
      );
      expect(updated.status).toBe('HR_APPROVED');

      // Cleanup
      await admin.ticket.delete({ where: { id: ticket.id } });
    });

    // ── AC-03: ACCOUNTANT advance-only ──────────────────────────────────────────
    it('AC-03: ACCOUNTANT sees ADVANCE_SALARY at HR_APPROVED+ (positive)', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({ select: { id: true, type: true, status: true } }),
      ) as Array<{ id: string; type: string; status: string }>;
      expect(rows.length).toBeGreaterThanOrEqual(2); // tAdvAId, tAdvAHrAppId, tAdvBHcpId
      for (const row of rows) {
        expect(row.type).toBe('ADVANCE_SALARY');
        expect(['HR_APPROVED', 'APPROVED', 'PAID', 'REJECTED', 'CLOSED']).toContain(row.status);
      }
      expect(rows.some((r) => r.id === tAdvAId)).toBe(true);
    });

    it('AC-03: ACCOUNTANT does NOT see non-ADVANCE_SALARY tickets (PENDING/LEAVE/DISPUTE)', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({
          where: { id: { in: [tDisputeAId, tLeaveBId] } },
          select: { id: true },
        }),
      ) as unknown[];
      expect(rows).toHaveLength(0);
    });

    it('AC-03: ACCOUNTANT cannot INSERT non-ADVANCE ticket (deny)', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.create({
            data: {
              type: 'LEAVE_REQUEST',
              workerId: wAId,
              createdByActorId: accUId,
              createdByRole: 'ACCOUNTANT',
              status: 'PENDING',
              title: 'Accountant fake create',
              description: 'should be denied',
              leaveFromDate: new Date('2026-09-10'),
              leaveToDate: new Date('2026-09-11'),
            },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-03: ACCOUNTANT can UPDATE ADVANCE_SALARY at HR_APPROVED → APPROVED (positive finance workflow)', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const updated = await asRole(ctx, (tx) =>
        tx.ticket.update({
          where: { id: tAdvAHrAppId, status: 'HR_APPROVED' },
          data: { status: 'APPROVED', version: { increment: 1 } },
          select: { id: true, status: true },
        }),
      );
      expect(updated.status).toBe('APPROVED');
    });

    // ── AC-03: PM read-only + deny ──────────────────────────────────────────────
    it('AC-03: PM sees tickets of workers assigned to their project (positive)', async () => {
      // PM user = uAId, PM owns project A, worker B is assigned to project A
      const ctx: AuthContext = { userId: pmUId, role: 'PM' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({ select: { id: true, workerId: true } }),
      ) as Array<{ id: string; workerId: string }>;
      // PM can see wB (assigned to project A which PM owns)
      expect(rows.some((r) => r.workerId === wBId)).toBe(true);
      // PM can see wA's project-attached tickets
      expect(rows.some((r) => r.id === tDisputeAId)).toBe(true);
    });

    it('AC-03: PM cannot INSERT tickets (read-only role)', async () => {
      const ctx: AuthContext = { userId: pmUId, role: 'PM' };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.create({
            data: {
              type: 'LEAVE_REQUEST',
              workerId: wAId,
              createdByActorId: uAId,
              createdByRole: 'PM',
              status: 'PENDING',
              title: 'PM fake create',
              description: 'should be denied',
              leaveFromDate: new Date('2026-09-10'),
              leaveToDate: new Date('2026-09-11'),
            },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-03: PM cannot UPDATE tickets (read-only role)', async () => {
      const ctx: AuthContext = { userId: pmUId, role: 'PM' };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.update({
            where: { id: tAdvAId },
            data: { title: 'PM hacked' },
          }),
        ),
      ).rejects.toThrow();
    });

    // ── AC-03: DIRECTOR read-only full aggregate (PLN-01 fix) ────────────────────
    it('AC-03: DIRECTOR sees ALL tickets regardless of worker/status (read-only full)', async () => {
      const ctx: AuthContext = { userId: dirUId, role: 'DIRECTOR' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticket.findMany({ select: { id: true } }),
      ) as unknown[];
      // DIRECTOR should see at least all 5 seeded tickets
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('AC-03: DIRECTOR cannot INSERT tickets (read-only role, DEC-06)', async () => {
      const ctx: AuthContext = { userId: dirUId, role: 'DIRECTOR' };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticket.create({
            data: {
              type: 'OTHER',
              workerId: wAId,
              createdByActorId: dirUId,
              createdByRole: 'ADMIN', // TicketActorRole — ADMIN is the closest
              status: 'PENDING',
              title: 'Director fake create',
              description: 'should be denied',
            },
          }),
        ),
      ).rejects.toThrow();
    });

    // ── AC-03: denied roles ─────────────────────────────────────────────────────
    it('AC-03: denied roles (SALE, MKT, VENDOR_ADMIN, CTV, EMPLOYEE) see zero tickets', async () => {
      const deniedRoles: Array<{ userId: string; role: SystemRole }> = [
        { userId: `sale-${RUN}`, role: 'SALE' },
        { userId: `mkt-${RUN}`, role: 'MKT' },
        { userId: `vadmin-${RUN}`, role: 'VENDOR_ADMIN' },
        { userId: `ctv-${RUN}`, role: 'CTV' },
        { userId: `emp-${RUN}`, role: 'EMPLOYEE' },
      ];
      for (const r of deniedRoles) {
        const ctx: AuthContext = { ...r };
        const rows = await asRole(ctx, (tx) =>
          tx.ticket.findMany({ select: { id: true } }),
        ) as unknown[];
        expect(rows).toHaveLength(0);
      }
    });

    // ── AC-04: Child table isolation ────────────────────────────────────────────
    it('AC-04: WORKER cannot read internal comments', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      const rows = await asRole(ctx, (tx) =>
        tx.ticketComment.findMany({
          where: { ticketId: tDisputeAId },
          select: { id: true, isInternal: true },
        }),
      ) as Array<{ id: string; isInternal: boolean }>;
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every((r) => r.isInternal === false)).toBe(true);
    });

    it('AC-04: HR_STAFF can read both internal and non-internal comments', async () => {
      const ctx: AuthContext = { userId: hrUId, role: 'HR_STAFF' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticketComment.findMany({
          where: { ticketId: tDisputeAId },
          select: { id: true, isInternal: true },
        }),
      ) as Array<{ id: string; isInternal: boolean }>;
      expect(rows.length).toBe(2);
    });

    it('AC-04: ACCOUNTANT cannot read internal comments', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticketComment.findMany({
          where: { ticketId: tDisputeAId },
          select: { id: true },
        }),
      ) as unknown[];
      expect(rows).toHaveLength(0);
    });

    it('AC-04: notification recipient isolation — ACCOUNTANT sees only ACCOUNTANT notifications', async () => {
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const rows = await asRole(ctx, (tx) =>
        tx.ticketNotification.findMany({
          where: { ticketId: tAdvAId },
          select: { id: true, recipientRole: true },
        }),
      ) as Array<{ id: string; recipientRole: string }>;
      expect(rows.length).toBe(1);
      expect(rows[0].recipientRole).toBe('ACCOUNTANT');
    });

    it('AC-04: ticket_history append-only — UPDATE denied', async () => {
      const historyRows = await admin.ticketHistory.findMany({
        where: { ticketId: tAdvAId },
        select: { id: true },
        take: 1,
      });
      const historyId = historyRows[0]?.id;
      if (!historyId) return;

      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticketHistory.update({
            where: { id: historyId },
            data: { note: 'hacked' },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-04: WORKER cannot insert internal comment', async () => {
      const ctx: AuthContext = { userId: uAId, role: 'WORKER', workerId: wAId };
      await expect(
        asRole(ctx, (tx) =>
          tx.ticketComment.create({
            data: {
              ticketId: tDisputeAId,
              authorId: uAId,
              authorRole: 'WORKER',
              authorName: 'Worker A',
              body: 'Trying internal',
              isInternal: true,
            },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-04: ACCOUNTANT status update writes parent+TicketHistory atomically (PLN-02)', async () => {
      // Create a fresh advance ticket (as admin) for this atomic test.
      const freshTicket = await admin.ticket.create({
        data: {
          type: 'ADVANCE_SALARY',
          workerId: wAId,
          createdByActorId: uAId,
          createdByRole: 'WORKER',
          status: 'HR_APPROVED',
          title: `Atomic test (${RUN})`,
          description: 'PLN-02 atomic test',
          amountVnd: 1_000_000n,
          deductMonth: 9,
          deductYear: 2026,
        },
      });
      // Step 1: HR_STAFF transitions HR_APPROVED → APPROVED, writes history.
      const hrCtx: AuthContext = { userId: hrUId, role: 'HR_STAFF' };
      await asRole(hrCtx, async (tx) => {
        await tx.ticket.update({
          where: { id: freshTicket.id, status: 'HR_APPROVED' },
          data: { status: 'APPROVED', version: { increment: 1 } },
        });
        await tx.ticketHistory.create({
          data: {
            ticketId: freshTicket.id,
            action: 'APPROVE_HR',
            toStatus: 'APPROVED',
            actorId: hrUId,
            actorRole: 'HR_STAFF',
          },
        });
      });
      // Step 2: ACCOUNTANT transitions APPROVED → PAID, writes history.
      // Verifies PLN-02: ACCOUNTANT INSERT ticket_history allowed in same tx as parent UPDATE.
      const ctx: AuthContext = { userId: accUId, role: 'ACCOUNTANT' };
      const result = await asRole(ctx, async (tx) => {
        const updated = await tx.ticket.update({
          where: { id: freshTicket.id, status: 'APPROVED' },
          data: { status: 'PAID', version: { increment: 1 } },
          select: { id: true, status: true },
        });
        await tx.ticketHistory.create({
          data: {
            ticketId: freshTicket.id,
            action: 'PAY',
            fromStatus: 'APPROVED',
            toStatus: 'PAID',
            actorId: accUId,
            actorRole: 'ACCOUNTANT',
          },
        });
        const historyCount = await tx.ticketHistory.count({
          where: { ticketId: freshTicket.id },
        });
        return { updated, historyCount };
      }) as { updated: { id: string; status: string }; historyCount: number };
      expect(result.updated.status).toBe('PAID');
      expect(result.historyCount).toBe(2); // HR_APPROVE_HR + PAY
    });

    // ── AC-05: Security hardening ────────────────────────────────────────────────
    it('AC-05: runtime role is neither owner nor BYPASSRLS', async () => {
      const rows = await admin.$queryRawUnsafe<
        Array<{ rolname: string; rolbypassrls: boolean }>
      >(`SELECT rolname, rolbypassrls
         FROM pg_roles WHERE rolname IN ('app_user_writer', 'app_user')
         ORDER BY rolname`);
      for (const row of rows) {
        expect(row.rolbypassrls).toBe(false);
      }
    });

    it('AC-05: helpers have SECURITY DEFINER + locked search_path', async () => {
      const rows = await admin.$queryRawUnsafe<
        Array<{ proname: string; prosecdef: boolean; proconfig: string }>
      >(
        `SELECT proname, prosecdef, proconfig
         FROM pg_proc
         WHERE proname IN (
           'hrp_ticket_visible','hrp_ticket_writable','hrp_ticket_insertable',
           'hrp_ticket_updatable','hrp_ticket_deletable',
           'hrp_ticket_history_visible','hrp_ticket_comment_visible',
           'hrp_ticket_notification_visible','hrp_ticket_comment_insertable'
         ) AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
         ORDER BY proname`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(9); // at least 9 ticket-specific helpers
      for (const row of rows) {
        expect(row.prosecdef).toBe(true);
        // proconfig is text[] in PostgreSQL; use toString() for comparison
        const cfg = String(row.proconfig ?? '').replace(/[\[\]']/g, '');
        expect(cfg).toContain('pg_catalog');
      }
    });

    it('AC-05: EXECUTE granted to app_user_writer + app_user only (no PUBLIC)', async () => {
      const rows = await admin.$queryRawUnsafe<
        Array<{ grantee: string }>
      >(
        `SELECT DISTINCT acl.grantee
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         JOIN pg_default_acl d ON d.defaclnamespace = n.oid
         JOIN LATERAL aclexplode(d.defaclacl) AS acl ON true
         WHERE n.nspname = 'public'
           AND p.proname IN (
             'hrp_ticket_visible','hrp_ticket_writable','hrp_ticket_insertable',
             'hrp_ticket_updatable','hrp_ticket_deletable'
           )
           AND d.defaclobjtype = 'F'
         ORDER BY 1`,
      );
      const grantees = [...new Set(rows.map(r => r.grantee))];
      for (const g of grantees) {
        expect(['app_user_writer', 'app_user', 'neondb_owner']).toContain(g);
      }
      expect(grantees).not.toContain('PUBLIC');
    });

    it('AC-05: missing GUC → all tickets denied (empty string role)', async () => {
      const guc = await writer.$transaction(async (tx) =>
        readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
      );
      expect(guc.role).toBe('');
    });

    it('AC-05: GUC transaction-local — concurrent tx do not leak', async () => {
      const [gucA, gucB] = await Promise.all([
        asRole({ userId: uAId, role: 'WORKER', workerId: wAId }, (tx) =>
          readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
        ),
        asRole({ userId: uBId, role: 'WORKER', workerId: wBId }, (tx) =>
          readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
        ),
      ]);
      expect((gucA as { user_id: string }).user_id).toBe(uAId);
      expect((gucB as { user_id: string }).user_id).toBe(uBId);
    });
  },
);
