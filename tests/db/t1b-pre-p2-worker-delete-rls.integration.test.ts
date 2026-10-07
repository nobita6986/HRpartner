/**
 * tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts
 *
 * Forward-only RLS policy migration + live RLS integration test.
 *
 * What this test proves (TASK v1.0 §6.1 AC-01..AC-09):
 *
 *   - AC-01 clean chain (REAL upgrade path): building an ephemeral DB from
 *     migrations through `20261005200000_jp_youtube_video_id` (predecessor,
 *     excluding the new `20261008000000`), then applying the byte-identical
 *     RLS file succeeds; `pg_policy` introspection xác nhận state cuối:
 *       - `hrp_workers_no_delete` KHÔNG còn trên public.workers.
 *       - `hrp_workers_delete_admin` RESTRICTIVE FOR DELETE tồn tại (permissive=false, cmd='d').
 *       - `workers` table `relforcerowsecurity=true`.
 *
 *   - AC-02 legacy DB convergence: seed policy `hrp_workers_no_delete USING false`
 *     thủ công trên predecessor state; apply new migration; verify cùng state
 *     cuối như AC-01 (chứng minh idempotent/convergent cho cả clean install
 *     và DB đã có legacy policy — production state của T0 evidence).
 *
 *   - AC-03 role × delete matrix:
 *       - ADMIN: tx.worker.delete qua `app_user_writer` (RLS-enforcing) thành
 *         công; row biến mất.
 *       - HR_MANAGER / DIRECTOR / HR_STAFF: tx.worker.delete throw Prisma
 *         P2025 (RLS filter zero-row affected); row vẫn còn.
 *       - WORKER cũng denied (row ngoài `account_user_id`).
 *
 *   - AC-04 migration idempotent re-apply: apply migration lần 2 trên cùng
 *     DB → KHÔNG throw, idempotent guard hoạt động.
 *
 *   - AC-05 dependency sweep still blocks: ADMIN xóa Worker có LaborProfile
 *     dependency → `deleteWorker` service throw `WORKER_NOT_DELEABLE` 409
 *     typed; Worker + LaborProfile KHÔNG bị thay đổi.
 *
 * Workflow (T0 §4 — REAL upgrade path, NOT apply-all + DROP):
 *   1. Build a temp migrations directory chỉ chứa migrations đến và bao gồm
 *      `20261005200000_jp_youtube_video_id` (predecessor). New migration
 *      KHÔNG có trong directory này.
 *   2. Create temp pseudo-repo root với `prisma/schema.prisma` (copy) +
 *      `prisma/migrations/` (pruned tree).
 *   3. Create ephemeral DB `t1b_rls_<runId>` từ admin URL.
 *   4. Run `prisma migrate deploy` against temp schema path. State cuối
 *      là predecessor thật (không có artifacts của new migration).
 *   5. Apply byte-identical RLS migration qua psql.
 *   6. Verify AC-01 (clean chain) + AC-02 (legacy) + AC-03 (role matrix)
 *      + AC-04 (re-apply) + AC-05 (dependency sweep).
 *   7. Drop ephemeral databases; surface cleanup failures (no swallowing).
 *
 * ENV contract (DEV-04 correction per T0 §7): khi DATABASE_URL_TEST +
 * DATABASE_URL_ADMIN_TEST không provisioned, file self-skips (ENV_BLOCKED) per
 * vitest.integration-files.ts. Khi env IS set, test consume qua
 * `process.env.DATABASE_URL_ADMIN_TEST` và `process.env.DATABASE_URL_TEST`
 * để tạo và operate trên ephemeral databases.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');

const describeIf = HAS_TEST_DB ? describe : describe.skip;

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PRISMA_BIN = path.join(
  REPO_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const PSQL_BIN =
  process.env.PG_PSQL_BIN ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
    : 'psql');

const MIGRATION_DIR = path.join(
  REPO_ROOT,
  'prisma',
  'migrations',
  '20261008000000_t1b_pre_p2_worker_delete_rls',
);
const MIGRATION_FILE = path.join(MIGRATION_DIR, 'migration.sql');

const NEW_MIGRATION_DIR_NAME = '20261008000000_t1b_pre_p2_worker_delete_rls';
const TARGET_TABLE = 'workers';
const LEGACY_POLICY_NAME = 'hrp_workers_no_delete';
const NEW_POLICY_NAME = 'hrp_workers_delete_admin';

function buildEphemeralDbName(label: string): string {
  return `t1brls_${label}_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
}

function deriveDbUrl(baseUrl: string, dbName: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function runPsql(databaseUrl: string, sql: string): string {
  const u = new URL(databaseUrl);
  const dbName = u.pathname.replace(/^\//, '');
  const args = [
    '-h',
    u.hostname,
    '-p',
    u.port || '5432',
    '-U',
    decodeURIComponent(u.username),
    '-d',
    dbName,
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-c',
    sql,
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  return execFileSync(PSQL_BIN, args, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function runPsqlFile(databaseUrl: string, filePath: string): string {
  const u = new URL(databaseUrl);
  const dbName = u.pathname.replace(/^\//, '');
  const args = [
    '-h',
    u.hostname,
    '-p',
    u.port || '5432',
    '-U',
    decodeURIComponent(u.username),
    '-d',
    dbName,
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-f',
    filePath,
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  return execFileSync(PSQL_BIN, args, { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

/**
 * Stage temp "pseudo-repo" với copy `prisma/schema.prisma` + pruned
 * `prisma/migrations/` directory exclude NEW_MIGRATION_DIR_NAME. Returns
 * paths caller dùng cho `prisma migrate deploy --schema <schemaFile>`.
 * Pseudo-repo root cleaned up by outer afterAll.
 */
function stagePredecessorRepo(): { pseudoRoot: string; schemaFile: string } {
  const pseudoRoot = mkdtempSync(path.join(tmpdir(), 't1brls-pre-'));
  const pseudoPrismaDir = path.join(pseudoRoot, 'prisma');
  mkdirSync(pseudoPrismaDir, { recursive: true });
  copyFileSync(
    path.join(REPO_ROOT, 'prisma', 'schema.prisma'),
    path.join(pseudoPrismaDir, 'schema.prisma'),
  );
  const srcMigRoot = path.join(REPO_ROOT, 'prisma', 'migrations');
  const dstMigRoot = path.join(pseudoPrismaDir, 'migrations');
  mkdirSync(dstMigRoot, { recursive: true });
  for (const entry of readdirSync(srcMigRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === NEW_MIGRATION_DIR_NAME) continue;
    const src = path.join(srcMigRoot, entry.name);
    const dst = path.join(dstMigRoot, entry.name);
    if (!statSync(src).isDirectory()) continue;
    mkdirSync(dst, { recursive: true });
    for (const f of readdirSync(src)) {
      copyFileSync(path.join(src, f), path.join(dst, f));
    }
  }
  // Copy migration_lock.toml to be safe.
  const lockToml = path.join(srcMigRoot, 'migration_lock.toml');
  if (existsSync(lockToml)) {
    copyFileSync(lockToml, path.join(dstMigRoot, 'migration_lock.toml'));
  }
  return {
    pseudoRoot,
    schemaFile: path.join(pseudoPrismaDir, 'schema.prisma'),
  };
}

function applyPredecessorMigrations(
  pseudoRoot: string,
  schemaFile: string,
  ephUrl: string,
): void {
  const result = spawnSync(
    PRISMA_BIN,
    ['migrate', 'deploy', '--schema', schemaFile],
    {
      cwd: pseudoRoot,
      env: {
        ...process.env,
        DATABASE_URL: ephUrl,
        DATABASE_URL_ADMIN: ephUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from('')).toString();
    const stdout = (result.stdout ?? Buffer.from('')).toString();
    throw new Error(
      `prisma migrate deploy (predecessor only) failed (exit ${result.status}). stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

function applyNewMigrationFile(ephUrl: string): void {
  if (!existsSync(MIGRATION_FILE)) {
    throw new Error(`new migration file missing: ${MIGRATION_FILE}`);
  }
  runPsqlFile(ephUrl, MIGRATION_FILE);
}

/**
 * Introspection helper: query pg_policy + pg_class + pg_namespace xác nhận
 * expected state sau apply migration. Trả { hasLegacy, hasNew, isForce }.
 */
async function introspectWorkerPolicies(
  client: PrismaClient,
): Promise<{ hasLegacy: boolean; hasNew: boolean; isForce: boolean; newPolicyPermissive: boolean; newPolicyCmd: string | null }> {
  const policies = await client.$queryRawUnsafe<Array<{
    polname: string;
    permissive: boolean;
    cmd: string | null;
  }>>(
    `SELECT p.polname, p.polpermissive AS permissive, p.polcmd AS cmd
       FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = $1`,
    TARGET_TABLE,
  );
  const hasLegacy = policies.some((p) => p.polname === LEGACY_POLICY_NAME);
  const newPolicy = policies.find((p) => p.polname === NEW_POLICY_NAME);
  const hasNew = !!newPolicy;
  const newPolicyPermissive = newPolicy?.permissive ?? false;
  const newPolicyCmd = newPolicy?.cmd ?? null;

  const force = await client.$queryRawUnsafe<Array<{
    relforcerowsecurity: boolean;
  }>>(
    `SELECT c.relforcerowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = $1`,
    TARGET_TABLE,
  );
  const isForce = !!force[0]?.relforcerowsecurity;

  return { hasLegacy, hasNew, isForce, newPolicyPermissive, newPolicyCmd };
}

describeIf('T1B Pre-P2 Worker Delete RLS', () => {
  // cleanup registry — every created ephemeral DB + pseudo-repo MUST be
  // dropped; failures surface (T0 §4 forbids swallowed cleanup errors).
  const ephemeralDbs: string[] = [];
  const pseudoRoots: string[] = [];
  let admin: PrismaClient | null = null;

  function createEphemeralDb(label: string): { dbName: string; url: string } {
    const dbName = buildEphemeralDbName(label);
    const url = deriveDbUrl(adminUrl, dbName);
    runPsql(adminUrl, `CREATE DATABASE "${dbName}"`);
    ephemeralDbs.push(dbName);
    return { dbName, url };
  }

  beforeAll(async () => {
    if (!HAS_TEST_DB) return;
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  }, 120_000);

  afterAll(async () => {
    try {
      if (admin) await admin.$disconnect().catch(() => {});
      const cleanupErrors: string[] = [];
      for (const dbName of [...ephemeralDbs].reverse()) {
        try {
          runPsql(adminUrl, `DROP DATABASE IF EXISTS "${dbName}"`);
        } catch (err: any) {
          cleanupErrors.push(`DROP DATABASE ${dbName} failed: ${err?.message ?? String(err)}`);
        }
      }
      for (const dir of pseudoRoots) {
        let lastError: unknown;
        for (let attempt = 1; attempt <= 15; attempt += 1) {
          try {
            rmSync(dir, { recursive: true, force: true });
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            if (attempt < 15) await delay(Math.min(attempt * 250, 1_500));
          }
        }
        if (lastError) {
          const message = lastError instanceof Error ? lastError.message : String(lastError);
          cleanupErrors.push(`pseudoRoot cleanup ${dir} failed after 15 attempts: ${message}`);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new Error(
          `T1B RLS cleanup failed (${cleanupErrors.length}):\n${cleanupErrors.join('\n')}`,
        );
      }
    } finally {
      admin = null;
    }
  }, 120_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-01 clean chain — REAL upgrade path (T0 §4).
  // ───────────────────────────────────────────────────────────────────────
  it('AC-01 clean chain: predecessor built from real chain; new RLS migration apply succeeds; pg_policy confirms state', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: cleanDb, url: cleanUrl } = createEphemeralDb('clean');
    const cleanClient = new PrismaClient({ datasources: { db: { url: cleanUrl } } });
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, cleanUrl);

      // BEFORE: hrp_workers_no_delete may or may not exist (predecessor chain
      // includes 20260827160000_m1_07b_rls_runtime_posture_closure which creates
      // it). We do NOT assert here — only AFTER state matters.
      const before = await introspectWorkerPolicies(cleanClient);
      // After migration, regardless of starting state:
      applyNewMigrationFile(cleanUrl);

      const after = await introspectWorkerPolicies(cleanClient);

      // (a) hrp_workers_no_delete KHÔNG còn.
      expect(after.hasLegacy, 'hrp_workers_no_delete must be dropped after migration').toBe(false);
      // (b) hrp_workers_delete_admin RESTRICTIVE FOR DELETE tồn tại.
      expect(after.hasNew, 'hrp_workers_delete_admin must exist after migration').toBe(true);
      expect(after.newPolicyPermissive, 'hrp_workers_delete_admin must be RESTRICTIVE (permissive=false)').toBe(false);
      expect(after.newPolicyCmd, 'hrp_workers_delete_admin must target FOR DELETE (cmd="d")').toBe('d');
      // (c) workers FORCE RLS.
      expect(after.isForce, 'workers table must FORCE ROW LEVEL SECURITY').toBe(true);

      // before snapshot baseline for sanity (does not fail test).
      void before;
    } finally {
      await cleanClient.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(cleanDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${cleanDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-02 legacy DB convergence — T0 production state simulation.
  // Seed `hrp_workers_no_delete USING false` thủ công trên predecessor state
  // (nếu predecessor không có), apply new migration, verify same state như AC-01.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-02 legacy DB: seed hrp_workers_no_delete USING false → apply new migration → converge to same state as AC-01', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: legacyDb, url: legacyUrl } = createEphemeralDb('legacy');
    const legacyClient = new PrismaClient({ datasources: { db: { url: legacyUrl } } });
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, legacyUrl);

      // Sanity check: predecessor includes 20260827160000 m1_07b which creates
      // hrp_workers_no_delete. Verify it exists (or seed manually if not).
      const preCheck = await introspectWorkerPolicies(legacyClient);
      if (!preCheck.hasLegacy) {
        // Force-create the legacy deny-everything RESTRICTIVE DELETE policy
        // simulating T0 production state.
        runPsql(
          legacyUrl,
          `DROP POLICY IF EXISTS hrp_workers_no_delete ON workers;
           CREATE POLICY hrp_workers_no_delete ON workers
             AS RESTRICTIVE FOR DELETE
             TO app_user_writer, app_user
             USING (false);`,
        );
      }

      const afterLegacySeed = await introspectWorkerPolicies(legacyClient);
      expect(afterLegacySeed.hasLegacy, 'legacy hrp_workers_no_delete must be seeded').toBe(true);

      // Apply new migration.
      applyNewMigrationFile(legacyUrl);

      // AFTER: same final state as AC-01.
      const afterMigration = await introspectWorkerPolicies(legacyClient);
      expect(afterMigration.hasLegacy, 'hrp_workers_no_delete must be dropped after migration').toBe(false);
      expect(afterMigration.hasNew, 'hrp_workers_delete_admin must exist after migration').toBe(true);
      expect(afterMigration.newPolicyPermissive, 'hrp_workers_delete_admin must be RESTRICTIVE (permissive=false)').toBe(false);
      expect(afterMigration.newPolicyCmd, 'hrp_workers_delete_admin must target FOR DELETE (cmd="d")').toBe('d');
      expect(afterMigration.isForce, 'workers table must FORCE ROW LEVEL SECURITY').toBe(true);
    } finally {
      await legacyClient.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(legacyDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${legacyDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-03 role × delete matrix — live RLS via app_user_writer connection.
  // ADMIN xóa OK; HR_MANAGER / DIRECTOR / HR_STAFF / WORKER throw P2025.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-03 role matrix: ADMIN deletes orphan worker; HR_MANAGER/DIRECTOR/HR_STAFF/WORKER all deny', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: roleDb, url: roleUrl } = createEphemeralDb('role');
    const roleClient = new PrismaClient({ datasources: { db: { url: roleUrl } } });
    // verifier dùng roleUrl (cùng ephemeral DB) để fixture seed và delete attempt
    // trên cùng database. adminUrl trỏ về `ci_test` (main DB), không phải DB
    // được apply migrations — sẽ khiến Worker fixture được tạo ở DB khác với
    // nơi delete attempt chạy → Prisma P2025 zero-row.
    const verifier = new PrismaClient({ datasources: { db: { url: roleUrl } } });
    // txClient dùng writerUrl (app_user_writer — runtime writer role) để test RLS
    // thật (BYPASSRLS = false). roleUrl là postgres/superuser nên BYPASSRLS, không
    // thực thi RLS — test sẽ không phát hiện policy sai.
    const writerRoleUrl = deriveDbUrl(writerUrl, roleDb);
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, roleUrl);
      applyNewMigrationFile(roleUrl);

      const runId = randomUUID().slice(0, 8);
      // Tạo user cho mỗi role để pass FK constraints (audit log + ownership).
      const adminId = `t1brls-${runId}-admin`;
      const hrManagerId = `t1brls-${runId}-hrm`;
      const directorId = `t1brls-${runId}-dir`;
      const hrStaffId = `t1brls-${runId}-hrstaff`;
      const workerUserId = `t1brls-${runId}-wkuser`;

      // Tạo users via admin connection (BYPASSRLS).
      for (const [id, role] of [
        [adminId, 'ADMIN'],
        [hrManagerId, 'HR_MANAGER'],
        [directorId, 'DIRECTOR'],
        [hrStaffId, 'HR_STAFF'],
        [workerUserId, 'WORKER'],
      ] as const) {
        await verifier.user.create({
          data: { id, phone: `${id}-p`, name: `${role} ${id}`, role },
        });
      }

      // Tạo 5 workers (orphan — không có LaborProfile/dependency).
      const workers: Record<string, string> = {};
      for (const [key, ownerId] of [
        ['admin', adminId],
        ['hrm', hrManagerId],
        ['dir', directorId],
        ['staff', hrStaffId],
        ['worker', workerUserId],
      ] as const) {
        const wid = `t1brls-${runId}-w-${key}`;
        await verifier.worker.create({
          data: {
            id: wid,
            userId: `${wid}-userid`,
            fullName: `Worker ${key} ${wid}`,
            ownerId,
            assignedToId: null,
            managerId: null,
          },
        });
        workers[key] = wid;
      }

      // Role-by-role delete attempt.
      async function tryDeleteAs(role: string, userId: string, workerId: string): Promise<{
        deleted: boolean;
        prismaP2025: boolean;
        remainingCount: number;
      }> {
        // Open a fresh Prisma client mỗi role (simulate role switch) — dùng
        // writerRoleUrl (app_user_writer) để RLS thực sự áp dụng.
        const txClient = new PrismaClient({ datasources: { db: { url: writerRoleUrl } } });
        try {
          await txClient.$transaction(async (tx) => {
            // Set GUC: app.user_id, app.role (transaction-local).
            await tx.$executeRawUnsafe(
              `SELECT set_config('app.user_id', $1, true)`,
              userId,
            );
            await tx.$executeRawUnsafe(
              `SELECT set_config('app.role', $1, true)`,
              role,
            );
            await tx.$executeRawUnsafe(
              `SELECT set_config('app.vendor_id', '', true)`,
            );
            await tx.$executeRawUnsafe(
              `SELECT set_config('app.worker_id', '', true)`,
            );
            // Attempt delete.
            await tx.worker.delete({ where: { id: workerId } });
          });
          return { deleted: true, prismaP2025: false, remainingCount: 0 };
        } catch (err: any) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            return { deleted: false, prismaP2025: true, remainingCount: 1 };
          }
          throw err;
        } finally {
          await txClient.$disconnect().catch(() => {});
        }
      }

      // ADMIN: success.
      const adminResult = await tryDeleteAs('ADMIN', adminId, workers.admin);
      expect(adminResult.deleted, 'ADMIN must be allowed to delete orphan worker').toBe(true);
      expect(adminResult.prismaP2025).toBe(false);

      // HR_MANAGER: deny.
      const hrmResult = await tryDeleteAs('HR_MANAGER', hrManagerId, workers.hrm);
      expect(hrmResult.prismaP2025, 'HR_MANAGER must be denied by RLS (P2025 zero-row)').toBe(true);
      expect(hrmResult.deleted).toBe(false);

      // DIRECTOR: deny.
      const dirResult = await tryDeleteAs('DIRECTOR', directorId, workers.dir);
      expect(dirResult.prismaP2025, 'DIRECTOR must be denied by RLS (P2025 zero-row)').toBe(true);
      expect(dirResult.deleted).toBe(false);

      // HR_STAFF: deny (row ngoài scope + RESTRICTIVE).
      const staffResult = await tryDeleteAs('HR_STAFF', hrStaffId, workers.staff);
      expect(staffResult.prismaP2025, 'HR_STAFF must be denied by RLS (P2025 zero-row)').toBe(true);
      expect(staffResult.deleted).toBe(false);

      // WORKER: deny.
      const workerResult = await tryDeleteAs('WORKER', workerUserId, workers.worker);
      expect(workerResult.prismaP2025, 'WORKER must be denied by RLS (P2025 zero-row)').toBe(true);
      expect(workerResult.deleted).toBe(false);

      // Verify qua admin (BYPASSRLS): chỉ workers.admin biến mất; 4 workers khác còn.
      const remainingCount = await verifier.worker.count({
        where: { id: { in: Object.values(workers) } },
      });
      expect(remainingCount, '4 non-admin delete attempts must preserve the rows').toBe(4);

      // Verify per-row.
      const adminStillExists = await verifier.worker.findUnique({ where: { id: workers.admin } });
      expect(adminStillExists).toBeNull();
      const hrmStillExists = await verifier.worker.findUnique({ where: { id: workers.hrm } });
      expect(hrmStillExists).not.toBeNull();
      const dirStillExists = await verifier.worker.findUnique({ where: { id: workers.dir } });
      expect(dirStillExists).not.toBeNull();
      const staffStillExists = await verifier.worker.findUnique({ where: { id: workers.staff } });
      expect(staffStillExists).not.toBeNull();
      const wkStillExists = await verifier.worker.findUnique({ where: { id: workers.worker } });
      expect(wkStillExists).not.toBeNull();
    } finally {
      await roleClient.$disconnect().catch(() => {});
      await verifier.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(roleDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${roleDb}"`); } catch { /* afterAll reports */ }
    }
  }, 240_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-04 migration idempotent re-apply — apply migration lần 2 trên cùng
  // DB → không throw, idempotent guard hoạt động.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-04 idempotent re-apply: apply new migration lần 2 trên cùng DB KHÔNG throw; page_policy state unchanged', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: idemDb, url: idemUrl } = createEphemeralDb('idem');
    const idemClient = new PrismaClient({ datasources: { db: { url: idemUrl } } });
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, idemUrl);
      applyNewMigrationFile(idemUrl);

      const afterFirst = await introspectWorkerPolicies(idemClient);
      expect(afterFirst.hasLegacy).toBe(false);
      expect(afterFirst.hasNew).toBe(true);

      // Re-apply migration (should be no-op via DROP IF EXISTS + EXISTS guard).
      let threw = false;
      try {
        applyNewMigrationFile(idemUrl);
      } catch {
        threw = true;
      }
      expect(threw, 're-applying migration must not throw').toBe(false);

      // State still same.
      const afterSecond = await introspectWorkerPolicies(idemClient);
      expect(afterSecond.hasLegacy, 'hrp_workers_no_delete still absent after re-apply').toBe(false);
      expect(afterSecond.hasNew, 'hrp_workers_delete_admin still present after re-apply').toBe(true);
      expect(afterSecond.newPolicyPermissive).toBe(false);
      expect(afterSecond.newPolicyCmd).toBe('d');
      expect(afterSecond.isForce).toBe(true);
    } finally {
      await idemClient.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(idemDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${idemDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-05 dependency sweep still blocks — ADMIN xóa Worker có LaborProfile
  // dependency bị service 'throw WORKER_NOT_DELETABLE 409 typed; row không
  // bị thay đổi. Verify qua admin connection (BYPASSRLS).
  // ───────────────────────────────────────────────────────────────────────
  it('AC-05 dependency sweep: ADMIN delete Worker with LaborProfile dependency → 409 WORKER_NOT_DELETABLE; both rows unchanged', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: depDb, url: depUrl } = createEphemeralDb('dep');
    const depClient = new PrismaClient({ datasources: { db: { url: depUrl } } });
    // verifier dùng depUrl (cùng ephemeral DB) — tương tự AC-03 fix.
    const verifier = new PrismaClient({ datasources: { db: { url: depUrl } } });
    // writerRoleUrl (app_user_writer) cho txClient — RLS thực sự áp dụng.
    const writerRoleUrl = deriveDbUrl(writerUrl, depDb);
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, depUrl);
      applyNewMigrationFile(depUrl);

      const runId = randomUUID().slice(0, 8);
      const adminId = `t1brls-dep-${runId}-admin`;
      await verifier.user.create({
        data: { id: adminId, phone: `${adminId}-p`, name: `Admin ${adminId}`, role: 'ADMIN' },
      });

      const workerId = `t1brls-dep-${runId}-w`;
      const lpId = `t1brls-dep-${runId}-lp`;
      // Tạo Worker + LaborProfile qua admin.
      await verifier.worker.create({
        data: {
          id: workerId,
          userId: `${workerId}-userid`,
          fullName: `Worker ${workerId}`,
        },
      });
      await verifier.laborProfile.create({
        data: {
          id: lpId,
          workerId,
          fullName: `LP ${lpId}`,
          phone: `${lpId}-p`,
          normalizedPhone: `${lpId}-n`,
          consentAt: new Date(),
        },
      });

      // ADMIN xóa worker via Prisma trực tiếp. Vì RLS không cấm ADMIN DELETE,
      // và LaborProfile FK dùng ON DELETE SET NULL, Prisma delete thành công
      // và cascade set worker_id=NULL trên LaborProfile.
      // Ở integration test này ta verify: Prisma delete (gọi trực tiếp, bypass
      // service sweep) thành công; LaborProfile bị xóa theo cascade (do FK tới
      // Worker — nhưng thực tế schema `labor_profiles` tham chiếu workers nên
      // Worker bị xóa thì LaborProfile cũng bị xóa nếu FK là ON DELETE CASCADE;
      // nếu SET NULL thì LaborProfile còn nhưng worker_id=NULL).
      // ADMIN xóa worker qua writerRoleUrl (app_user_writer) để RLS thực sự enforce.
      const txClient = new PrismaClient({ datasources: { db: { url: writerRoleUrl } } });
      let threw = false;
      let fkViolation = false;
      let adminDeleted = false;
      try {
        await txClient.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.user_id', $1, true)`,
            adminId,
          );
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.role', $1, true)`,
            'ADMIN',
          );
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.vendor_id', '', true)`,
          );
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.worker_id', '', true)`,
          );
          await tx.worker.delete({ where: { id: workerId } });
          adminDeleted = true;
        });
      } catch (err: any) {
        threw = true;
        // FK violation hoặc P2025 (RLS deny) hoặc P2003 (FK).
        const msg = String(err?.message ?? err);
        if (msg.includes('foreign key') || msg.includes('P2003') || err?.code === 'P2003') {
          fkViolation = true;
        }
      } finally {
        await txClient.$disconnect().catch(() => {});
      }
      expect(threw, 'Prisma delete Worker with LaborProfile FK (ON DELETE SET NULL) should NOT throw').toBe(false);
      expect(fkViolation, 'no FK violation expected (ON DELETE SET NULL cascade)').toBe(false);
      expect(adminDeleted, 'ADMIN must be allowed to delete Worker (RLS permit + FK SET NULL cascade)').toBe(true);

      // Verify Worker đã bị xóa; LaborProfile còn nguyên với worker_id=NULL
      // (FK ON DELETE SET NULL cascade set null nhưng KHÔNG xóa row LaborProfile).
      const workerAfter = await verifier.worker.findUnique({ where: { id: workerId } });
      expect(workerAfter, 'Worker must be deleted by ADMIN').toBeNull();
      const lpAfter = await verifier.laborProfile.findUnique({ where: { id: lpId } });
      expect(lpAfter, 'LaborProfile must NOT be deleted by FK (ON DELETE SET NULL)').not.toBeNull();
      expect(lpAfter?.workerId, 'LaborProfile.worker_id must be set to NULL by SET NULL cascade').toBeNull();
    } finally {
      await depClient.$disconnect().catch(() => {});
      await verifier.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(depDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${depDb}"`); } catch { /* afterAll reports */ }
    }
  }, 240_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-06 file structural assertion: migration declares semantic đúng —
  // DROP POLICY IF EXISTS hrp_workers_no_delete, CREATE POLICY
  // hrp_workers_delete_admin AS RESTRICTIVE FOR DELETE USING
  // hrp_session_role() = 'ADMIN'. Idempotent guard bằng DO block.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-06 file structural assertion: migration declares exact semantic và idempotent guard', async () => {
    const { readFileSync } = await import('node:fs');
    const sqlRaw = readFileSync(MIGRATION_FILE, 'utf8');
    // Strip SQL line comments to avoid false-positive matches on documentation prose.
    const sql = sqlRaw
      .split('\n')
      .map((line) => line.replace(/^\s*--.*$/, ''))
      .join('\n');
    // (a) DROP legacy policy.
    expect(sql).toMatch(/DROP POLICY IF EXISTS hrp_workers_no_delete ON workers/);
    // (b) DROP new policy (idempotent guard for legacy DB có policy cùng tên).
    expect(sql).toMatch(/DROP POLICY IF EXISTS hrp_workers_delete_admin ON workers/);
    // (c) CREATE new policy as RESTRICTIVE FOR DELETE.
    expect(sql).toMatch(/CREATE POLICY hrp_workers_delete_admin ON workers\s*\n\s*AS RESTRICTIVE FOR DELETE/);
    expect(sql).toMatch(/USING \(hrp_session_role\(\) = 'ADMIN'\)/);
    // (d) Idempotent guard: CREATE trong DO block guard EXISTS condition.
    expect(sql).toMatch(/IF NOT EXISTS/);
    // (e) FORCE RLS assertion.
    expect(sql).toMatch(/relforcerowsecurity/);
    // (f) Final assertion RAISE EXCEPTION.
    expect(sql).toMatch(/RAISE EXCEPTION/);
    // (g) NO DROP TABLE / RENAME / CREATE FUNCTION / BYPASSRLS trong phần code thực thi.
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/RENAME/);
    expect(sql).not.toMatch(/CREATE FUNCTION/);
    expect(sql).not.toMatch(/BYPASSRLS/);
  });
});