/**
 * security-matrix.integration.test.ts — V5-M1-07b PLN-01 (truthful matrix).
 *
 * REWRITE (round 2): the prior version was false-green —
 *   - queryCount() caught every SQL/connectivity error and returned 0;
 *   - the positive assertion was `count <= adminBaseline` (0 rows still "passes");
 *   - ROLE_EXPECT_SCOPE was a hand-guessed scope, several entries wrong vs the
 *     actual m13 RLS policy; only app.user_id/role/vendor_id were set (no worker_id);
 *   - a single shared connection; no fixtures; no empty/unknown role; no coverage guard.
 *
 * This version is deterministic and fail-closed:
 *   - Dual connections (rule 7): admin (owner/superuser) seeds + tears down + introspects;
 *     ALL behavioural proof runs through the writer (app_user_writer, RLS-enforcing).
 *   - A concrete fixture graph is seeded via admin; every probe is scoped to the exact
 *     fixture id(s), so ambient rows cannot mask a leak or a gap.
 *   - Authorized role → sees the EXACT fixture id (array === [fixtureId], length >= 1).
 *   - Denied role      → EXACT zero rows (RLS filters rows; SELECT does not throw).
 *   - NO try/catch anywhere on the proof path: a SQL/connectivity error propagates and
 *     FAILS the test (never silently becomes 0).
 *   - 13 SystemRole + empty role + unknown role  ×  8 tables = 120 cases, plus a
 *     coverage assertion that every enumerated case actually executed.
 *
 * Visibility truth-source: prisma/migrations/20260821103500_m13_restore_rls_matrix
 * (PERMISSIVE FOR ALL policies; SELECT visibility == the USING clause). M1-07b adds
 * FORCE + RESTRICTIVE-FOR-DELETE only, which do not change SELECT visibility.
 *
 * Gate: runs only when M1_07B_LIVE_RLS_POSTURE + DATABASE_URL + DATABASE_URL_ADMIN are
 * present (integration lane). Otherwise self-skips; integration-preflight fail-closes
 * to ENV_BLOCKED so this can never be mock-passed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { applyRlsContext } from '@/src/shared/auth/rls-context';
import type { AuthContext } from '@/src/shared/auth/auth-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.M1_07B_LIVE_RLS_POSTURE && ADMIN_URL && WRITER_URL);

const ALL_SYSTEM_ROLES = [
  'ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'ACCOUNTANT',
  'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER', 'EMPLOYEE',
] as const;

describe.skipIf(!enabled)('V5-M1-07b PLN-01 — truthful security matrix (13+2 roles × 8 tables)', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `secmx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // ── User ids referenced by FK scope columns (must exist as users rows) ──────
  const uPm = `pm-${RUN}`;         // outsourcing_projects.pm_user_id
  const uWorker = `wrk-${RUN}`;    // workers.account_user_id
  const uHrStaff = `hrs-${RUN}`;   // workers.assigned_to_id
  const uSale = `sal-${RUN}`;      // workers.owner_id
  const uCtv = `ctv-${RUN}`;       // source_claims.ctv_id
  const FK_USER_IDS = [uPm, uWorker, uHrStaff, uSale, uCtv];

  // ── Fixture row ids (one per matrix table) ──────────────────────────────────
  const C1 = `cc-${RUN}`;          // client_companies (parent of project + client_statements.client_id)
  const V1 = `vd-${RUN}`;          // vendors  (+ vendor scope for VENDOR_* contexts)
  const P1 = `prj-${RUN}`;         // outsourcing_projects  (is_public, pm_user_id = uPm)
  const W1 = `wk-${RUN}`;          // workers  (owner=uSale, assignee=uHrStaff, account=uWorker)
  const SO1 = `so-${RUN}`;         // staffing_orders  (project_id = P1)
  const AE1 = `ae-${RUN}`;         // attendance_events  (worker_id = W1, project_id = P1)
  const TP1 = `tp-${RUN}`;         // timesheet_periods  (project_id = P1)
  const VS1 = `vs-${RUN}`;         // vendor_statements  (vendor_id = V1)
  const CST1 = `cs-${RUN}`;        // client_statements  (client_id = C1)

  async function cleanup() {
    await admin.projectAssignment.deleteMany({ where: { workerId: W1 } }).catch(() => {});
    await admin.sourceClaim.deleteMany({ where: { workerId: W1 } }).catch(() => {});
    await admin.staffingOrder.deleteMany({ where: { id: SO1 } }).catch(() => {});
    await admin.attendanceEvent.deleteMany({ where: { id: AE1 } }).catch(() => {});
    await admin.timesheetPeriod.deleteMany({ where: { id: TP1 } }).catch(() => {});
    await admin.vendorStatement.deleteMany({ where: { id: VS1 } }).catch(() => {});
    await admin.clientStatement.deleteMany({ where: { id: CST1 } }).catch(() => {});
    await admin.worker.deleteMany({ where: { id: W1 } }).catch(() => {});
    await admin.project.deleteMany({ where: { id: P1 } }).catch(() => {});
    await admin.vendor.deleteMany({ where: { id: V1 } }).catch(() => {});
    await admin.clientCompany.deleteMany({ where: { id: C1 } }).catch(() => {});
    await admin.user.deleteMany({ where: { id: { in: FK_USER_IDS } } }).catch(() => {});
  }

  beforeAll(async () => {
    await cleanup();

    // FK-scope users (role on the row is irrelevant to RLS; RLS reads the GUC).
    await admin.user.createMany({
      data: [
        { id: uPm, role: 'PM', name: `pm-${RUN}` },
        { id: uWorker, role: 'WORKER', name: `worker-${RUN}` },
        { id: uHrStaff, role: 'HR_STAFF', name: `hrstaff-${RUN}` },
        { id: uSale, role: 'SALE', name: `sale-${RUN}` },
        { id: uCtv, role: 'CTV', name: `ctv-${RUN}` },
      ],
    });

    await admin.clientCompany.create({ data: { id: C1, code: `CCM-${RUN}`, name: `Client ${RUN}` } });
    await admin.vendor.create({ data: { id: V1, code: `VDM-${RUN}`, name: `Vendor ${RUN}` } });

    await admin.project.create({
      data: {
        id: P1, code: `PRJM-${RUN}`, clientCompanyId: C1, name: `Project ${RUN}`,
        startDate: new Date('2026-01-01'), isPublic: true, status: 'ACTIVE', pmUserId: uPm,
      },
    });

    await admin.worker.create({
      data: {
        id: W1, userId: `WUSRM-${RUN}`, fullName: `Worker ${RUN}`,
        ownerId: uSale, assignedToId: uHrStaff, accountUserId: uWorker,
      },
    });

    await admin.staffingOrder.create({ data: { id: SO1, projectId: P1, code: `SOM-${RUN}`, title: `Order ${RUN}` } });

    await admin.sourceClaim.create({
      data: { id: `sc-${RUN}`, workerId: W1, claimType: 'VENDOR_SUPPLIED', vendorId: V1, ctvId: uCtv, accepted: true },
    });

    await admin.projectAssignment.create({
      data: {
        id: `pa-${RUN}`, workerId: W1, projectId: P1, employeeCode: `EMPM-${RUN}`,
        employmentType: 'OUTSOURCED', validFrom: new Date('2026-01-01'), status: 'ACTIVE',
      },
    });

    await admin.attendanceEvent.create({
      data: {
        id: AE1, externalEventId: `EXTM-${RUN}`, source: 'MANUAL', workDate: new Date('2026-01-05'),
        payloadHash: `hash-${RUN}`, workerId: W1, projectId: P1,
      },
    });

    await admin.timesheetPeriod.create({ data: { id: TP1, projectId: P1, month: 1, year: 2026 } });
    await admin.vendorStatement.create({ data: { id: VS1, vendorId: V1, periodMonth: 1, periodYear: 2026 } });
    await admin.clientStatement.create({ data: { id: CST1, clientId: C1, periodMonth: 1, periodYear: 2026 } });
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await admin.$disconnect();
    await writer.$disconnect();
  });

  // ── Context runners (NO try/catch — a SQL/connectivity error must FAIL) ──────
  // Real path: production applyRlsContext sets the 4 GUCs inside a writer tx.
  async function asRole<T>(ctx: AuthContext, cb: (tx: PrismaTx) => Promise<T>): Promise<T> {
    return writer.$transaction(async (tx) => {
      await applyRlsContext(tx as Parameters<typeof applyRlsContext>[0], ctx);
      return cb(tx as PrismaTx);
    });
  }

  // Empty-role probe: applyRlsContext THROWS on role==='' (production guard), so the
  // empty-role DB posture is probed by setting the SAME 4 GUCs applyRlsContext sets,
  // with app.role=''. This is not a weakening — it is the honest way to prove that an
  // empty role sees zero rows at the database, a state production input-validation
  // makes unreachable (asserted separately below).
  async function asEmptyRole<T>(userId: string, cb: (tx: PrismaTx) => Promise<T>): Promise<T> {
    return writer.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId);
      await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, '');
      await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', $1, true)`, '');
      await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', $1, true)`, '');
      return cb(tx as PrismaTx);
    });
  }

  type PrismaTx = Prisma.TransactionClient;

  // ── 8 matrix tables: each has exactly ONE seeded fixture; probe is id-scoped ──
  const TABLES: Array<{ key: string; fixtureId: string; query: (tx: PrismaTx, id: string) => Promise<Array<{ id: string }>> }> = [
    { key: 'workers', fixtureId: W1, query: (tx, id) => tx.worker.findMany({ where: { id }, select: { id: true } }) },
    { key: 'outsourcing_projects', fixtureId: P1, query: (tx, id) => tx.project.findMany({ where: { id }, select: { id: true } }) },
    { key: 'staffing_orders', fixtureId: SO1, query: (tx, id) => tx.staffingOrder.findMany({ where: { id }, select: { id: true } }) },
    { key: 'vendors', fixtureId: V1, query: (tx, id) => tx.vendor.findMany({ where: { id }, select: { id: true } }) },
    { key: 'attendance_events', fixtureId: AE1, query: (tx, id) => tx.attendanceEvent.findMany({ where: { id }, select: { id: true } }) },
    { key: 'timesheet_periods', fixtureId: TP1, query: (tx, id) => tx.timesheetPeriod.findMany({ where: { id }, select: { id: true } }) },
    { key: 'vendor_statements', fixtureId: VS1, query: (tx, id) => tx.vendorStatement.findMany({ where: { id }, select: { id: true } }) },
    { key: 'client_statements', fixtureId: CST1, query: (tx, id) => tx.clientStatement.findMany({ where: { id }, select: { id: true } }) },
  ];

  // ── Truthful VISIBLE sets — derived verbatim from m13 USING clauses + fixtures ─
  const VISIBLE: Record<string, Set<string>> = {
    workers: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'HR_STAFF', 'SALE', 'PM', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'WORKER']),
    outsourcing_projects: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'PM', 'WORKER', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV']),
    staffing_orders: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'PM', 'WORKER', 'MKT', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV']),
    vendors: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE', 'VENDOR_ADMIN', 'VENDOR_STAFF']),
    attendance_events: new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PM', 'WORKER']),
    timesheet_periods: new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTANT', 'DIRECTOR', 'PM']),
    vendor_statements: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'VENDOR_ADMIN', 'VENDOR_STAFF']),
    client_statements: new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE']),
  };

  // ── 13 SystemRole contexts + empty + unknown = 15 contexts ──────────────────
  // `role` is the app.role GUC value; userId matches the fixture scope column where
  // the policy requires a per-user match. vendorId/workerId set only where scoped.
  type MatrixContext = { label: string; role: string; userId: string; vendorId?: string; workerId?: string; kind: 'real' | 'unknown' | 'empty' };

  const CONTEXTS_ALL: MatrixContext[] = [
    { label: 'ADMIN', role: 'ADMIN', userId: `adm-${RUN}`, kind: 'real' },
    { label: 'HR_MANAGER', role: 'HR_MANAGER', userId: `hrm-${RUN}`, kind: 'real' },
    { label: 'DIRECTOR', role: 'DIRECTOR', userId: `dir-${RUN}`, kind: 'real' },
    { label: 'HR_STAFF', role: 'HR_STAFF', userId: uHrStaff, kind: 'real' },
    { label: 'SALE', role: 'SALE', userId: uSale, kind: 'real' },
    { label: 'PM', role: 'PM', userId: uPm, kind: 'real' },
    { label: 'ACCOUNTANT', role: 'ACCOUNTANT', userId: `acc-${RUN}`, kind: 'real' },
    { label: 'MKT', role: 'MKT', userId: `mkt-${RUN}`, kind: 'real' },
    { label: 'VENDOR_ADMIN', role: 'VENDOR_ADMIN', userId: `va-${RUN}`, vendorId: V1, kind: 'real' },
    { label: 'VENDOR_STAFF', role: 'VENDOR_STAFF', userId: `vs-${RUN}`, vendorId: V1, kind: 'real' },
    { label: 'CTV', role: 'CTV', userId: uCtv, kind: 'real' },
    { label: 'WORKER', role: 'WORKER', userId: uWorker, workerId: W1, kind: 'real' },
    { label: 'EMPLOYEE', role: 'EMPLOYEE', userId: `emp-${RUN}`, kind: 'real' },
    { label: 'UNKNOWN_ROLE', role: 'NOT_A_ROLE', userId: `unk-${RUN}`, kind: 'unknown' },
    { label: 'EMPTY_ROLE', role: '', userId: `mt-${RUN}`, kind: 'empty' },
  ];

  // Runtime coverage tally — proves every enumerated case actually executed (no silent skip).
  const executed = new Set<string>();

  async function probe(c: MatrixContext, t: { fixtureId: string; query: (tx: PrismaTx, id: string) => Promise<Array<{ id: string }>> }): Promise<string[]> {
    const run = (tx: PrismaTx) => t.query(tx, t.fixtureId);
    const rows =
      c.kind === 'empty'
        ? await asEmptyRole(c.userId, run)
        // 'real' + 'unknown' both go through the production applyRlsContext path
        // (unknown role is a truthy string → no throw → sets GUC → matches no policy).
        : await asRole({ userId: c.userId, role: c.role as AuthContext['role'], vendorId: c.vendorId, workerId: c.workerId }, run);
    return rows.map((r) => r.id);
  }

  for (const c of CONTEXTS_ALL) {
    describe(`context: ${c.label}`, () => {
      for (const t of TABLES) {
        const shouldSee = (VISIBLE[t.key] ?? new Set<string>()).has(c.role);
        it(`${c.label} × ${t.key} → ${shouldSee ? 'sees exact fixture' : 'exact zero rows'}`, async () => {
          const ids = await probe(c, t);
          executed.add(`${c.label}::${t.key}`);
          if (shouldSee) {
            // Authorized: EXACT fixture id AND at least one row (length 1).
            expect(ids).toEqual([t.fixtureId]);
          } else {
            // Denied: RLS filters the row out — SELECT returns exactly zero (no throw).
            expect(ids).toEqual([]);
          }
        });
      }
    });
  }

  // ── PLN-01 coverage guards — enumeration + runtime (no silent skip) ──────────
  it('coverage: matrix enumerates 13 SystemRole + empty + unknown (15 contexts)', () => {
    const labels = new Set(CONTEXTS_ALL.map((c) => c.label));
    for (const r of ALL_SYSTEM_ROLES) expect(labels.has(r)).toBe(true);
    expect(labels.has('EMPTY_ROLE')).toBe(true);
    expect(labels.has('UNKNOWN_ROLE')).toBe(true);
    expect(CONTEXTS_ALL.length).toBe(15);
    expect(TABLES.length).toBe(8);
  });

  it('coverage: all 15 contexts × 8 tables = 120 cases actually executed', () => {
    const expectedPairs = CONTEXTS_ALL.flatMap((c) => TABLES.map((t) => `${c.label}::${t.key}`));
    expect(expectedPairs.length).toBe(120);
    expect([...executed].sort()).toEqual([...new Set(expectedPairs)].sort());
  });

  // ── Structural regression guard — 8 tables ENABLE + FORCE RLS + ≥1 policy ────
  it('structural: all 8 matrix tables have ENABLE + FORCE row-level security and ≥1 policy', async () => {
    const list = TABLES.map((t) => `'${t.key}'`).join(',');
    const rows = await admin.$queryRawUnsafe<Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; policy_count: number | bigint }>>(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
              (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
       FROM pg_class c
       WHERE c.relname IN (${list}) AND c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace`,
    );
    expect(rows.length).toBe(8);
    for (const r of rows) {
      expect(r.relrowsecurity).toBe(true);
      expect(r.relforcerowsecurity).toBe(true);
      expect(Number(r.policy_count)).toBeGreaterThan(0);
    }
  });

  // ── Empty-role production guard — applyRlsContext refuses role='' ────────────
  // (Proves the empty-role DB state probed above is unreachable through production code.)
  it('boundary: applyRlsContext rejects an empty role (production input validation)', async () => {
    await expect(
      writer.$transaction(async (tx) => applyRlsContext(tx as Parameters<typeof applyRlsContext>[0], { userId: `mt-${RUN}`, role: '' as AuthContext['role'] })),
    ).rejects.toThrow();
  });
});
