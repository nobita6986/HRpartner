/**
 * live-rls-posture.m1-07b.test.ts — V5-M1-07b / RQ-02..RQ-08 / AC-02..AC-08.
 *
 * LIVE evidence cho RLS runtime-posture closure của 29 bảng canonical NON-Ticket:
 *   - AC-02: 29 bảng ENABLE + FORCE ROW LEVEL SECURITY + có policy hiệu lực.
 *   - AC-03: app_user_writer / app_user KHÔNG BYPASSRLS.
 *   - AC-04: 4 GUC transaction-local không leak A→B; thiếu GUC → deny.
 *   - AC-05/AC-07: ma trận role×command cho 5 bảng "gap" — positive trả exact
 *     fixture IDs (>=1 row), negative trả zero rows hoặc SQLSTATE (throw).
 *   - AC-05: uniform RESTRICTIVE FOR DELETE USING(false) — DELETE fail (count 0).
 *   - AC-08: role bị từ chối + context rỗng → deny; error KHÔNG bị nuốt thành 0 rows.
 *
 * Pattern (mirror live-ticket-rls-scope.m1-07a.test.ts):
 *   - Seed/teardown qua DATABASE_URL_ADMIN (owner/superuser, bypass RLS) — rule 7.
 *   - Behavioral proof CHỈ qua DATABASE_URL (app_user_writer, RLS-enforcing) — rule 7.
 *   - GUC set bằng applyRlsContext(tx) — transaction-local (is_local=true).
 *   - Chạy khi M1_07B_LIVE_RLS_POSTURE + DATABASE_URL + DATABASE_URL_ADMIN có mặt;
 *     else self-skip (integration-preflight fail-close → ENV_BLOCKED, không mock).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { applyRlsContext, readRlsContext } from './rls-context';
import type { AuthContext } from './auth-context';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(
  process.env.M1_07B_LIVE_RLS_POSTURE && ADMIN_URL && WRITER_URL,
);

// Canonical 29 in-scope tables (NON-Ticket) — must match migration Section 1/3.
const TABLES_29 = [
  'workers', 'dependents', 'source_claims', 'worker_deductions',
  'outsourcing_projects', 'sites', 'contracts', 'client_companies', 'client_rate_cards',
  'vendors', 'candidate_submissions', 'vendor_rate_cards',
  'staffing_orders', 'staffing_order_slots', 'project_assignments',
  'attendance_import_batches', 'attendance_import_rows', 'attendance_events',
  'timesheet_periods', 'timesheet_lines', 'timesheet_adjustments',
  'vendor_statements', 'vendor_statement_lines', 'client_statements', 'client_statement_lines',
  'commission_policies', 'commission_ledger', 'commission_debts', 'ctv_withdrawal_requests',
];

describe.skipIf(!enabled)(
  'V5-M1-07b LIVE — RLS runtime-posture closure (29 tables, 5 gap tables)',
  () => {
    const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
    const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

    const RUN = `m107b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // ── Fixtures (bare-string owner ids: worker_id / ctv_id have NO FK) ─────────
    const wkrAId = `wkrA-${RUN}`;   // worker_deductions.worker_id (WORKER self A)
    const wkrBId = `wkrB-${RUN}`;   // worker_deductions.worker_id (WORKER self B)
    const ctvAId = `ctvA-${RUN}`;   // ctv_withdrawal_requests.ctv_id (CTV self A)
    const ctvBId = `ctvB-${RUN}`;   // ctv_withdrawal_requests.ctv_id (CTV self B)
    const dedAId = `ded-A-${RUN}`;
    const dedBId = `ded-B-${RUN}`;
    const cwAId = `cw-A-${RUN}`;
    const cwBId = `cw-B-${RUN}`;
    const ccId = `cc-${RUN}`;
    const ccCode = `CC-${RUN}`;
    const ccInsCode = `CCX-${RUN}`; // client_companies INSERT-positive marker
    const contractId = `ctr-${RUN}`; // FK parent for rate cards
    const crcId = `crc-${RUN}`;
    const vrcId = `vrc-${RUN}`;

    beforeAll(async () => {
      await Promise.all([admin.$connect(), writer.$connect()]);

      // Pre-cleanup (idempotent — clears leftovers from interrupted runs).
      await admin.clientRateCard.deleteMany({ where: { contractId } }).catch(() => {});
      await admin.vendorRateCard.deleteMany({ where: { contractId } }).catch(() => {});
      await admin.contract.deleteMany({ where: { id: contractId } }).catch(() => {});
      await admin.workerDeduction.deleteMany({ where: { workerId: { in: [wkrAId, wkrBId] } } }).catch(() => {});
      await admin.ctvWithdrawalRequest.deleteMany({ where: { ctvId: { in: [ctvAId, ctvBId] } } }).catch(() => {});
      await admin.clientCompany.deleteMany({ where: { code: { in: [ccCode, ccInsCode] } } }).catch(() => {});

      // Seed via admin (bypass RLS) — parent contract first (rate-card FK).
      await admin.contract.create({
        data: { id: contractId, contractNo: `CN-${RUN}`, type: 'CLIENT_SUPPLY', startDate: new Date('2026-01-01') },
      });
      await admin.clientRateCard.create({
        data: { id: crcId, contractId, rateType: 'MONTHLY', price: BigInt(10_000_000), effectiveFrom: new Date('2026-01-01') },
      });
      await admin.vendorRateCard.create({
        data: { id: vrcId, contractId, rateType: 'MONTHLY', price: BigInt(8_000_000), effectiveFrom: new Date('2026-01-01') },
      });
      await admin.clientCompany.create({ data: { id: ccId, code: ccCode, name: `Client ${RUN}` } });
      await admin.workerDeduction.createMany({
        data: [
          { id: dedAId, workerId: wkrAId, amountVnd: BigInt(500_000), reason: `ded A ${RUN}` },
          { id: dedBId, workerId: wkrBId, amountVnd: BigInt(700_000), reason: `ded B ${RUN}` },
        ],
      });
      await admin.ctvWithdrawalRequest.createMany({
        data: [
          { id: cwAId, ctvId: ctvAId, amountVnd: BigInt(1_000_000), bankAccount: '0011', bankName: 'VCB' },
          { id: cwBId, ctvId: ctvBId, amountVnd: BigInt(2_000_000), bankAccount: '0022', bankName: 'ACB' },
        ],
      });
    });

    afterAll(async () => {
      try {
        await admin.clientRateCard.deleteMany({ where: { contractId } });
        await admin.vendorRateCard.deleteMany({ where: { contractId } });
        await admin.contract.deleteMany({ where: { id: contractId } });
        await admin.workerDeduction.deleteMany({ where: { workerId: { in: [wkrAId, wkrBId] } } });
        await admin.ctvWithdrawalRequest.deleteMany({ where: { ctvId: { in: [ctvAId, ctvBId] } } });
        await admin.clientCompany.deleteMany({ where: { code: { in: [ccCode, ccInsCode] } } });
      } finally {
        await Promise.all([admin.$disconnect(), writer.$disconnect()]);
      }
    });

    // ── Helper: run cb as a role via transaction-local GUC ──────────────────────
    async function asRole<T>(ctx: AuthContext, cb: (tx: PrismaClient) => Promise<T>): Promise<T> {
      return writer.$transaction(async (tx) => {
        await applyRlsContext(tx as Parameters<typeof applyRlsContext>[0], ctx);
        return cb(tx as PrismaClient);
      });
    }

    // ══ AC-02: catalog — 29 tables ENABLE + FORCE ══════════════════════════════
    it('AC-02: all 29 in-scope tables have relrowsecurity AND relforcerowsecurity', async () => {
      const list = TABLES_29.map((t) => `'${t}'`).join(',');
      const rows = await admin.$queryRawUnsafe<
        Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>
      >(
        `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
         WHERE relname IN (${list}) AND relkind = 'r'
           AND relnamespace = 'public'::regnamespace
         ORDER BY relname`,
      );
      expect(rows.length).toBe(29);
      for (const row of rows) {
        expect(row.relrowsecurity).toBe(true);
        expect(row.relforcerowsecurity).toBe(true);
      }
    });

    // ══ AC-02: policy inventory — gap policies + uniform delete-deny ════════════
    it('AC-02: 5 gap tables carry their command-aware policies', async () => {
      const list = TABLES_29.map((t) => `'${t}'`).join(',');
      const rows = await admin.$queryRawUnsafe<Array<{ tbl: string; polname: string }>>(
        `SELECT c.relname AS tbl, p.polname
         FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname IN (${list}) AND c.relnamespace = 'public'::regnamespace`,
      );
      const names = new Set(rows.map((r) => r.polname));
      for (const n of [
        'hrp_worker_deduction_select', 'hrp_worker_deduction_insert', 'hrp_worker_deduction_update',
        'hrp_client_company_select', 'hrp_client_company_insert', 'hrp_client_company_update',
        'hrp_client_rate_card_select', 'hrp_vendor_rate_card_select',
        'hrp_ctv_withdrawal_select', 'hrp_ctv_withdrawal_insert',
      ]) {
        expect(names).toContain(n);
      }
    });

    it('AC-02/AC-05: every one of the 29 tables has a RESTRICTIVE FOR DELETE USING(false) backstop', async () => {
      const list = TABLES_29.map((t) => `'${t}'`).join(',');
      const rows = await admin.$queryRawUnsafe<
        Array<{ tbl: string; polname: string; polpermissive: boolean; polcmd: string; qual: string | null }>
      >(
        `SELECT c.relname AS tbl, p.polname, p.polpermissive, p.polcmd,
                pg_get_expr(p.polqual, p.polrelid) AS qual
         FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname IN (${list}) AND c.relnamespace = 'public'::regnamespace
           AND p.polname = 'hrp_' || c.relname || '_no_delete'`,
      );
      expect(rows.length).toBe(29);
      for (const row of rows) {
        expect(row.polpermissive).toBe(false); // RESTRICTIVE
        expect(row.polcmd).toBe('d');          // FOR DELETE
        expect(String(row.qual)).toBe('false'); // USING(false)
      }
    });

    // ══ AC-03: runtime roles are non-BYPASSRLS ═════════════════════════════════
    it('AC-03: app_user_writer + app_user are not BYPASSRLS', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ rolname: string; rolbypassrls: boolean }>>(
        `SELECT rolname, rolbypassrls FROM pg_roles
         WHERE rolname IN ('app_user_writer','app_user') ORDER BY rolname`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      for (const row of rows) expect(row.rolbypassrls).toBe(false);
    });

    // ══ PLN-02: runtime-role posture — writer identity + least-privilege ═══════
    // Catalog facts introspected via admin (rule 7); connection identity proven
    // via the writer connection itself. Any failure here is a REAL posture gap,
    // never masked to a pass.
    it('PLN-02: writer connection identity is app_user_writer (SELECT current_user via writer)', async () => {
      const rows = await writer.$queryRawUnsafe<Array<{ current_user: string }>>('SELECT current_user');
      expect(rows[0]?.current_user).toBe('app_user_writer');
    });

    it('PLN-02: app_user_writer is non-super, non-BYPASSRLS, cannot create roles/db', async () => {
      const rows = await admin.$queryRawUnsafe<
        Array<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean; rolcreatedb: boolean }>
      >(
        `SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
         FROM pg_roles WHERE rolname = 'app_user_writer'`,
      );
      expect(rows.length).toBe(1);
      expect(rows[0].rolsuper).toBe(false);
      expect(rows[0].rolbypassrls).toBe(false);
      expect(rows[0].rolcreaterole).toBe(false);
      expect(rows[0].rolcreatedb).toBe(false);
    });

    it('PLN-02: writer owns NONE of the 29 in-scope tables', async () => {
      const list = TABLES_29.map((t) => `'${t}'`).join(',');
      const rows = await admin.$queryRawUnsafe<Array<{ relname: string; owner: string }>>(
        `SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
         FROM pg_class c
         WHERE c.relname IN (${list}) AND c.relkind='r'
           AND c.relnamespace='public'::regnamespace`,
      );
      expect(rows.length).toBe(29);
      const runtimeOwned = rows.filter((r) => r.owner === 'app_user_writer' || r.owner === 'app_user');
      expect(runtimeOwned.map((r) => `${r.relname}:${r.owner}`)).toEqual([]);
    });
    it('PLN-02: writer is NOT a member of any superuser/BYPASSRLS role', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ rolname: string }>>(
        `SELECT r.rolname FROM pg_roles r
         WHERE (r.rolsuper OR r.rolbypassrls)
           AND pg_has_role('app_user_writer', r.oid, 'MEMBER')`,
      );
      expect(rows.map((r) => r.rolname)).toEqual([]);
    });

    it('PLN-02: writer is NOT in pg_read_all_data / pg_write_all_data', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ rolname: string }>>(
        `SELECT r.rolname FROM pg_roles r
         WHERE r.rolname IN ('pg_read_all_data','pg_write_all_data')
           AND pg_has_role('app_user_writer', r.oid, 'MEMBER')`,
      );
      expect(rows.map((r) => r.rolname)).toEqual([]);
    });

    it('PLN-02: writer grants on the 29 tables are least-privilege (CRUD subset, none grantable)', async () => {
      const list = TABLES_29.map((t) => `'${t}'`).join(',');
      const rows = await admin.$queryRawUnsafe<
        Array<{ table_name: string; privilege_type: string; is_grantable: string }>
      >(
        `SELECT table_name, privilege_type, is_grantable
         FROM information_schema.role_table_grants
         WHERE grantee = 'app_user_writer' AND table_schema = 'public'
           AND table_name IN (${list})
         ORDER BY table_name, privilege_type`,
      );
      const ALLOWED = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
      for (const r of rows) {
        expect(ALLOWED.has(r.privilege_type)).toBe(true); // no TRUNCATE/REFERENCES/TRIGGER
        expect(r.is_grantable).toBe('NO');                 // cannot re-grant → no escalation
      }
      // Masked grants summary for HANDOFF (privilege types + table count only; no URL/secret).
      const privileges = [...new Set(rows.map((r) => r.privilege_type))].sort();
      const tablesGranted = new Set(rows.map((r) => r.table_name)).size;
      // eslint-disable-next-line no-console
      console.info(
        `[PLN-02 grants] grantee=app_user_writer privileges=${JSON.stringify(privileges)} ` +
          `tables_with_grants=${tablesGranted}/29 is_grantable=NONE`,
      );
    });
    // ══ AC-05/AC-07: worker_deductions matrix (payroll-sensitive) ══════════════
    it('AC-07: ACCOUNTANT sees deduction rows (positive — exact IDs, >=1 row)', async () => {
      const ctx: AuthContext = { userId: `acc-${RUN}`, role: 'ACCOUNTANT' };
      const rows = await asRole(ctx, (tx) =>
        tx.workerDeduction.findMany({ where: { id: { in: [dedAId, dedBId] } }, select: { id: true } }),
      );
      const ids = rows.map((r) => r.id).sort();
      expect(ids).toEqual([dedAId, dedBId].sort());
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('AC-07: WORKER A sees ONLY own deduction (self positive, cross zero)', async () => {
      const ctx: AuthContext = { userId: `uA-${RUN}`, role: 'WORKER', workerId: wkrAId };
      const rows = await asRole(ctx, (tx) =>
        tx.workerDeduction.findMany({ where: { id: { in: [dedAId, dedBId] } }, select: { id: true } }),
      );
      expect(rows.map((r) => r.id)).toEqual([dedAId]);
    });

    it('AC-08: denied role (SALE) sees zero deductions (no exception→0 masking)', async () => {
      const ctx: AuthContext = { userId: `sale-${RUN}`, role: 'SALE' };
      const rows = await asRole(ctx, (tx) =>
        tx.workerDeduction.findMany({ where: { id: { in: [dedAId, dedBId] } } }),
      );
      expect(rows).toHaveLength(0);
    });

    it('AC-05: HR_MANAGER can INSERT a deduction (positive write)', async () => {
      const ctx: AuthContext = { userId: `hrm-${RUN}`, role: 'HR_MANAGER' };
      const created = await asRole(ctx, (tx) =>
        tx.workerDeduction.create({
          data: { workerId: wkrAId, amountVnd: BigInt(123_000), reason: `ins ${RUN}` },
          select: { id: true },
        }),
      );
      expect(created.id).toBeTruthy();
    });

    it('AC-05: WORKER cannot INSERT a deduction (deny → throw)', async () => {
      const ctx: AuthContext = { userId: `uA-${RUN}`, role: 'WORKER', workerId: wkrAId };
      await expect(
        asRole(ctx, (tx) =>
          tx.workerDeduction.create({ data: { workerId: wkrAId, amountVnd: BigInt(1), reason: 'x' } }),
        ),
      ).rejects.toThrow();
    });

    it('AC-05: ACCOUNTANT can UPDATE a deduction (positive), HR_STAFF cannot (count 0)', async () => {
      const ok = await asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
        tx.workerDeduction.updateMany({ where: { id: dedAId }, data: { status: 'APPLIED' } }),
      );
      expect(ok.count).toBe(1);
      const denied = await asRole({ userId: `hrs-${RUN}`, role: 'HR_STAFF' }, (tx) =>
        tx.workerDeduction.updateMany({ where: { id: dedBId }, data: { status: 'APPLIED' } }),
      );
      expect(denied.count).toBe(0);
    });

    // ══ AC-05/AC-07: client_companies matrix (client master data) ══════════════
    it('AC-05: HR_STAFF and PM can SELECT client company (broad-read positive)', async () => {
      for (const role of ['HR_STAFF', 'PM'] as const) {
        const rows = await asRole({ userId: `${role}-${RUN}`, role }, (tx) =>
          tx.clientCompany.findMany({ where: { id: ccId }, select: { id: true } }),
        );
        expect(rows.map((r) => r.id)).toEqual([ccId]);
      }
    });

    it('AC-08: CTV/WORKER/VENDOR_ADMIN see zero client companies (deny)', async () => {
      for (const role of ['CTV', 'WORKER', 'VENDOR_ADMIN'] as const) {
        const rows = await asRole({ userId: `${role}-${RUN}`, role }, (tx) =>
          tx.clientCompany.findMany({ where: { id: ccId } }),
        );
        expect(rows).toHaveLength(0);
      }
    });

    it('AC-05: HR_MANAGER can INSERT a client company (positive write)', async () => {
      const created = await asRole({ userId: `hrm-${RUN}`, role: 'HR_MANAGER' }, (tx) =>
        tx.clientCompany.create({ data: { code: ccInsCode, name: `Ins ${RUN}` }, select: { id: true } }),
      );
      expect(created.id).toBeTruthy();
    });

    it('AC-05: HR_STAFF can read but NOT INSERT a client company (command-aware deny → throw)', async () => {
      await expect(
        asRole({ userId: `hrs-${RUN}`, role: 'HR_STAFF' }, (tx) =>
          tx.clientCompany.create({ data: { code: `CCZ-${RUN}`, name: 'x' } }),
        ),
      ).rejects.toThrow();
    });

    it('AC-05: DIRECTOR can UPDATE, ACCOUNTANT cannot (command-aware split)', async () => {
      const ok = await asRole({ userId: `dir-${RUN}`, role: 'DIRECTOR' }, (tx) =>
        tx.clientCompany.updateMany({ where: { id: ccId }, data: { status: 'ACTIVE' } }),
      );
      expect(ok.count).toBe(1);
      const denied = await asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
        tx.clientCompany.updateMany({ where: { id: ccId }, data: { status: 'BLACKLISTED' } }),
      );
      expect(denied.count).toBe(0);
    });

    // ══ AC-07: rate cards — finance rates NOT broad-read, read-only at runtime ══
    it('AC-07: ACCOUNTANT sees client_rate_card (positive); SALE/PM see zero', async () => {
      const ok = await asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
        tx.clientRateCard.findMany({ where: { id: crcId }, select: { id: true } }),
      );
      expect(ok.map((r) => r.id)).toEqual([crcId]);
      for (const role of ['SALE', 'PM'] as const) {
        const rows = await asRole({ userId: `${role}-${RUN}`, role }, (tx) =>
          tx.clientRateCard.findMany({ where: { id: crcId } }),
        );
        expect(rows).toHaveLength(0);
      }
    });

    it('AC-07: HR_MANAGER sees vendor_rate_card (positive); SALE/PM see zero', async () => {
      const ok = await asRole({ userId: `hrm-${RUN}`, role: 'HR_MANAGER' }, (tx) =>
        tx.vendorRateCard.findMany({ where: { id: vrcId }, select: { id: true } }),
      );
      expect(ok.map((r) => r.id)).toEqual([vrcId]);
      for (const role of ['SALE', 'PM'] as const) {
        const rows = await asRole({ userId: `${role}-${RUN}`, role }, (tx) =>
          tx.vendorRateCard.findMany({ where: { id: vrcId } }),
        );
        expect(rows).toHaveLength(0);
      }
    });

    it('AC-05: rate cards are read-only at runtime — INSERT denied even for a finance reader (throw)', async () => {
      await expect(
        asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
          tx.clientRateCard.create({
            data: { contractId, rateType: 'MONTHLY', price: BigInt(1), effectiveFrom: new Date('2026-01-01') },
          }),
        ),
      ).rejects.toThrow();
      await expect(
        asRole({ userId: `hrm-${RUN}`, role: 'HR_MANAGER' }, (tx) =>
          tx.vendorRateCard.create({
            data: { contractId, rateType: 'MONTHLY', price: BigInt(1), effectiveFrom: new Date('2026-01-01') },
          }),
        ),
      ).rejects.toThrow();
    });

    // ══ AC-07: ctv_withdrawal_requests — CTV self-service ══════════════════════
    it('AC-07: ACCOUNTANT sees withdrawal rows (finance oversight positive)', async () => {
      const rows = await asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
        tx.ctvWithdrawalRequest.findMany({ where: { id: { in: [cwAId, cwBId] } }, select: { id: true } }),
      );
      expect(rows.map((r) => r.id).sort()).toEqual([cwAId, cwBId].sort());
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('AC-07: CTV A sees ONLY own withdrawal (self positive, A→B cross zero)', async () => {
      const rows = await asRole({ userId: ctvAId, role: 'CTV' }, (tx) =>
        tx.ctvWithdrawalRequest.findMany({ where: { id: { in: [cwAId, cwBId] } }, select: { id: true } }),
      );
      expect(rows.map((r) => r.id)).toEqual([cwAId]);
    });

    it('AC-05: CTV A can INSERT own withdrawal (positive); CTV A cannot INSERT for B (throw)', async () => {
      const created = await asRole({ userId: ctvAId, role: 'CTV' }, (tx) =>
        tx.ctvWithdrawalRequest.create({
          data: { ctvId: ctvAId, amountVnd: BigInt(50_000), bankAccount: '9', bankName: 'TCB' },
          select: { id: true },
        }),
      );
      expect(created.id).toBeTruthy();
      await expect(
        asRole({ userId: ctvAId, role: 'CTV' }, (tx) =>
          tx.ctvWithdrawalRequest.create({
            data: { ctvId: ctvBId, amountVnd: BigInt(1), bankAccount: '9', bankName: 'TCB' },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-08: non-CTV role cannot INSERT a withdrawal (WITH CHECK role=CTV → throw)', async () => {
      await expect(
        asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
          tx.ctvWithdrawalRequest.create({
            data: { ctvId: ctvAId, amountVnd: BigInt(1), bankAccount: '9', bankName: 'TCB' },
          }),
        ),
      ).rejects.toThrow();
    });

    it('AC-05: withdrawal has NO runtime UPDATE path — approve denied (count 0)', async () => {
      const denied = await asRole({ userId: `acc-${RUN}`, role: 'ACCOUNTANT' }, (tx) =>
        tx.ctvWithdrawalRequest.updateMany({ where: { id: cwAId }, data: { status: 'APPROVED' } }),
      );
      expect(denied.count).toBe(0);
    });

    // ══ AC-05: uniform delete-deny — even ADMIN via writer deletes 0 rows ═══════
    it('AC-05: DELETE is denied on every seeded gap table (count 0, rows survive)', async () => {
      const adminCtx: AuthContext = { userId: `root-${RUN}`, role: 'ADMIN' };

      const d1 = await asRole(adminCtx, (tx) => tx.workerDeduction.deleteMany({ where: { id: dedAId } }));
      expect(d1.count).toBe(0);
      const d2 = await asRole(adminCtx, (tx) => tx.clientCompany.deleteMany({ where: { id: ccId } }));
      expect(d2.count).toBe(0);
      const d3 = await asRole(adminCtx, (tx) => tx.clientRateCard.deleteMany({ where: { id: crcId } }));
      expect(d3.count).toBe(0);
      const d4 = await asRole(adminCtx, (tx) => tx.vendorRateCard.deleteMany({ where: { id: vrcId } }));
      expect(d4.count).toBe(0);
      const d5 = await asRole(adminCtx, (tx) => tx.ctvWithdrawalRequest.deleteMany({ where: { id: cwAId } }));
      expect(d5.count).toBe(0);

      // Rows still present when read back via admin (bypass RLS) — nothing deleted.
      expect(await admin.workerDeduction.count({ where: { id: dedAId } })).toBe(1);
      expect(await admin.clientCompany.count({ where: { id: ccId } })).toBe(1);
      expect(await admin.clientRateCard.count({ where: { id: crcId } })).toBe(1);
      expect(await admin.vendorRateCard.count({ where: { id: vrcId } })).toBe(1);
      expect(await admin.ctvWithdrawalRequest.count({ where: { id: cwAId } })).toBe(1);
    });

    // ══ AC-04: GUC posture — missing context denies, no cross-tx leak ══════════
    it('AC-04: missing GUC → empty role AND zero rows (deny-by-default, not masked)', async () => {
      const guc = await writer.$transaction((tx) =>
        readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
      );
      expect(guc.role).toBe('');
      const rows = await writer.$transaction((tx) =>
        (tx as PrismaClient).workerDeduction.findMany({ where: { id: { in: [dedAId, dedBId] } } }),
      );
      expect(rows).toHaveLength(0);
    });

    it('AC-04: 4 GUCs are transaction-local — concurrent tx do not leak A→B', async () => {
      const [a, b] = await Promise.all([
        asRole({ userId: ctvAId, role: 'CTV' }, (tx) =>
          readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
        ),
        asRole({ userId: ctvBId, role: 'CTV' }, (tx) =>
          readRlsContext(tx as Parameters<typeof readRlsContext>[0]),
        ),
      ]);
      expect(a.user_id).toBe(ctvAId);
      expect(b.user_id).toBe(ctvBId);
    });
  },
);
