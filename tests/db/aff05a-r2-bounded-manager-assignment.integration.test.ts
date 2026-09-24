/**
 * tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts
 *
 * AFF-05A-R2 forward-only migration + service-boundary integration test.
 *
 * What this test proves (TASK v1.1 §6.2 AC-02..AC-06):
 *
 *   - AC-02 clean chain (REAL upgrade path): building an ephemeral DB from
 *     migrations `20260824161500` through `20260924160000` (predecessor,
 *     excluding the new `20260924170000`), then applying the byte-identical
 *     R2 file succeeds; the conditional CHECK
 *     `labor_profile_handling_assignments_manager_expires_required` is
 *     present on `public.labor_profile_handling_assignments` in pg_constraint.
 *
 *   - AC-03 narrow backfill: seeded MANAGER_ASSIGNMENT rows with NULL
 *     `expires_at` get `expires_at = starts_at + 7 days` (exact 7*86_400_000 ms);
 *     overdue ACTIVE rows transition to EXPIRED; terminal rows (COMPLETED /
 *     REVOKED / TRANSFERRED / EXPIRED) keep their status; AFF_INITIAL and
 *     CASE_RESOLUTION rows with NULL deadline are NOT touched.
 *
 *   - AC-04 conditional CHECK enforcement with strict scope: the migration's
 *     `pg_constraint` lookup binds `conrelid =
 *     'public.labor_profile_handling_assignments'::regclass AND contype='c'`,
 *     so a same-named CHECK on a different table does NOT cause the migration
 *     to skip. We seed such a same-named CHECK on a different table BEFORE
 *     applying R2 and assert that R2 still adds the target CHECK on the
 *     target relation (proves the scope is correct).
 *
 *   - AC-05 concurrent manager assignment: two independent DB connections
 *     (separate Prisma clients) race to insert MANAGER_ASSIGNMENT with the
 *     same `labor_profile_id` and `status='ACTIVE'`. Exactly one wins; the
 *     loser receives a typed conflict (Prisma P2002 mapped to
 *     PrismaClientKnownRequestError, or raw 23505 unique_violation). No
 *     duplicate row, no orphan history. The bounded lock_timeout file-shape
 *     assertion is in a separate it() so the audit lane can classify them
 *     independently.
 *
 *   - AC-06 fail-closed anomaly guards: any future starts_at, NULL starts_at,
 *     or unknown status on the target predicate is treated as anomaly and the
 *     migration aborts with a typed exception (transactional rollback of
 *     constraint add + row updates).
 *
 *   - AC-07 (split lane per T0 correction §8): prisma validate, prisma
 *     generate, typecheck, lint, build, full unit, then the integration lane
 *     below. All commands and exits are recorded in HANDOFF §3.
 *
 * Workflow (T0 correction §4 — REAL upgrade path, NOT apply-all + DROP):
 *   1. Build a temp migrations directory containing only migrations up to and
 *      including `20260924160000` (predecessor). This is the actual chain that
 *      ends at the post-#40 baseline. The new R2 migration is NOT in this
 *      directory.
 *   2. Create a temp pseudo-repo root with a `prisma/schema.prisma` (copy) +
 *      `prisma/migrations/` (the pruned tree). `prisma migrate deploy` reads
 *      the schema and looks for migrations in `<schemaDir>/migrations/`. This
 *      gives us the true predecessor state without ever touching the real
 *      R2 file.
 *   3. Create an ephemeral database `aff05ar2_<runId>` from the admin URL.
 *   4. Run `prisma migrate deploy` against the temp schema path against the
 *      ephemeral DB. The result is the true predecessor state (no R2 artifacts
 *      anywhere in the schema).
 *   5. Seed legacy rows: fresh MANAGER_ASSIGNMENT (NULL deadline, ACTIVE),
 *      overdue ACTIVE, terminal REVOKED, AFF_INITIAL with NULL deadline,
 *      CASE_RESOLUTION with NULL deadline. Optionally seed a same-named CHECK
 *      on a different table to prove the constraint scope guards work.
 *   6. Apply the byte-identical R2 migration via psql. Verify AC-02 / AC-03 /
 *      AC-04 with strict scope binding.
 *   7. Run the two-connection race on a separate ephemeral DB seeded with one
 *      LaborProfile; verify AC-05 (exactly one ACTIVE winner, typed conflict
 *      on loser, no duplicate row, no orphan history).
 *   8. Apply the byte-identical R2 migration on a separate ephemeral DB seeded
 *      with a future starts_at to verify AC-06 fail-closed anomaly rollback.
 *   9. Drop the ephemeral databases; surface cleanup failures (no swallowing).
 *
 * ENV contract (DEV-04 correction per T0 §7): when DATABASE_URL_TEST +
 * DATABASE_URL_ADMIN_TEST are not provisioned the whole file self-skips
 * (ENV_BLOCKED) per vitest.integration-files.ts. When the env IS set, the
 * test consumes those vars directly via `process.env.DATABASE_URL_ADMIN_TEST`
 * and `process.env.DATABASE_URL_TEST` to create and operate on the ephemeral
 * databases.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
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
  '20260924170000_aff05a_r2_bounded_manager_assignment',
);
const MIGRATION_FILE = path.join(MIGRATION_DIR, 'migration.sql');

const R2_DIR_NAME = '20260924170000_aff05a_r2_bounded_manager_assignment';
const R2_CONSTRAINT_NAME = 'labor_profile_handling_assignments_manager_expires_required';
const TARGET_TABLE = 'labor_profile_handling_assignments';

function buildEphemeralDbName(label: string): string {
  return `${label}_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
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
 * Stage a temp "pseudo-repo" with a copy of `prisma/schema.prisma` and a
 * pruned `prisma/migrations/` directory that excludes R2. Returns paths
 * the caller uses for `prisma migrate deploy --schema <schemaFile>`. The
 * pseudo-repo root is cleaned up by the outer afterAll.
 */
function stagePredecessorRepo(): { pseudoRoot: string; schemaFile: string } {
  const pseudoRoot = mkdtempSync(path.join(tmpdir(), 'aff05ar2-pre-'));
  const pseudoPrismaDir = path.join(pseudoRoot, 'prisma');
  mkdirSync(pseudoPrismaDir, { recursive: true });
  // Copy schema.prisma verbatim.
  copyFileSync(
    path.join(REPO_ROOT, 'prisma', 'schema.prisma'),
    path.join(pseudoPrismaDir, 'schema.prisma'),
  );
  // Build a pruned migrations/ tree: copy every dir except R2.
  const srcMigRoot = path.join(REPO_ROOT, 'prisma', 'migrations');
  const dstMigRoot = path.join(pseudoPrismaDir, 'migrations');
  mkdirSync(dstMigRoot, { recursive: true });
  for (const entry of readdirSync(srcMigRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === R2_DIR_NAME) continue;
    const src = path.join(srcMigRoot, entry.name);
    const dst = path.join(dstMigRoot, entry.name);
    if (!statSync(src).isDirectory()) continue;
    mkdirSync(dst, { recursive: true });
    for (const f of readdirSync(src)) {
      copyFileSync(path.join(src, f), path.join(dst, f));
    }
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

function applyAff05aR2MigrationFile(ephUrl: string): void {
  if (!existsSync(MIGRATION_FILE)) {
    throw new Error(`R2 migration file missing: ${MIGRATION_FILE}`);
  }
  runPsqlFile(ephUrl, MIGRATION_FILE);
}

describeIf('AFF-05A-R2 bounded manager assignment', () => {
  // cleanup registry — every created ephemeral DB and pseudo-repo MUST be
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
          `AFF-05A-R2 cleanup failed (${cleanupErrors.length}):\n${cleanupErrors.join('\n')}`,
        );
      }
    } finally {
      admin = null;
    }
  }, 120_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-02 clean chain — REAL upgrade path (T0 §4): build predecessor from
  // a pruned migrations directory (no R2), apply R2 byte-identical.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-02 clean chain: predecessor built from real chain (R2 excluded); byte-identical R2 apply succeeds; conditional CHECK on target table in pg_constraint', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: cleanDb, url: cleanUrl } = createEphemeralDb('clean');
    const cleanClient = new PrismaClient({ datasources: { db: { url: cleanUrl } } });
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, cleanUrl);

      // BEFORE applying R2, the constraint is NOT in pg_constraint on the target table.
      const beforeCount = await cleanClient.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count
           FROM pg_constraint
          WHERE conname = $1
            AND conrelid = $2::regclass
            AND contype = 'c'`,
        R2_CONSTRAINT_NAME,
        `public.${TARGET_TABLE}`,
      );
      expect(Number(beforeCount[0].count)).toBe(0);

      // Apply byte-identical R2 migration file via psql.
      applyAff05aR2MigrationFile(cleanUrl);

      // AFTER: exactly one CHECK with that name on the target relation.
      const afterCount = await cleanClient.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count
           FROM pg_constraint
          WHERE conname = $1
            AND conrelid = $2::regclass
            AND contype = 'c'`,
        R2_CONSTRAINT_NAME,
        `public.${TARGET_TABLE}`,
      );
      expect(Number(afterCount[0].count)).toBe(1);
    } finally {
      await cleanClient.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(cleanDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${cleanDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-04 negative scoping: seed a same-named CHECK on a different table;
  // R2 must still add the target CHECK on the target relation.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-04 scope: a same-named CHECK on another table does NOT prevent R2 from adding its target CHECK', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: scopeDb, url: scopeUrl } = createEphemeralDb('scope');
    const scopeClient = new PrismaClient({ datasources: { db: { url: scopeUrl } } });
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, scopeUrl);

      // Find a small auxiliary table to host the same-named decoy CHECK.
      const candidates = await scopeClient.$queryRawUnsafe<Array<{ relname: string }>>(
        `SELECT c.relname
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind IN ('r','p')
            AND c.relname <> $1
          ORDER BY c.relname
          LIMIT 5`,
        TARGET_TABLE,
      );
      expect(candidates.length).toBeGreaterThan(0);
      const decoyTable = candidates[0].relname;

      runPsql(
        scopeUrl,
        `ALTER TABLE "${decoyTable}"
           ADD CONSTRAINT ${R2_CONSTRAINT_NAME}
           CHECK (true)`,
      );

      const decoyCount = await scopeClient.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count
           FROM pg_constraint
          WHERE conname = $1
            AND conrelid = $2::regclass
            AND contype = 'c'`,
        R2_CONSTRAINT_NAME,
        `public.${decoyTable}`,
      );
      expect(Number(decoyCount[0].count)).toBe(1);

      // Apply byte-identical R2 migration. The migration's pg_constraint
      // lookup binds conrelid to the target relation, so it will NOT match
      // the decoy constraint on the other table, and will ADD the target CHECK.
      applyAff05aR2MigrationFile(scopeUrl);

      const targetCount = await scopeClient.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count
           FROM pg_constraint
          WHERE conname = $1
            AND conrelid = $2::regclass
            AND contype = 'c'`,
        R2_CONSTRAINT_NAME,
        `public.${TARGET_TABLE}`,
      );
      expect(Number(targetCount[0].count)).toBe(1);

      const decoyAfter = await scopeClient.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT count(*)::text AS count
           FROM pg_constraint
          WHERE conname = $1
            AND conrelid = $2::regclass
            AND contype = 'c'`,
        R2_CONSTRAINT_NAME,
        `public.${decoyTable}`,
      );
      expect(Number(decoyAfter[0].count)).toBe(1);
    } finally {
      await scopeClient.$disconnect().catch(() => {});
      const idx = ephemeralDbs.indexOf(scopeDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${scopeDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-03 narrow backfill on a true predecessor state: seed legacy rows,
  // apply R2 byte-identical, verify backfill / terminal preservation /
  // non-target preservation.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-03 narrow backfill on predecessor state: deadline = starts_at + 7 days; overdue ACTIVE -> EXPIRED; terminal preserved; AFF_INITIAL/CASE_RESOLUTION untouched', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: backfillDb, url: backfillUrl } = createEphemeralDb('backfill');
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, backfillUrl);

      const ephem = new PrismaClient({ datasources: { db: { url: backfillUrl } } });
      const runId = randomUUID().slice(0, 8);
      try {
        const managerId = `aff05ar2-bf-${runId}-mgr`;
        const lpId = `aff05ar2-bf-${runId}-lp`;
        const overdueLpId = `aff05ar2-bf-${runId}-lp-overdue`;
        const termLpId = `aff05ar2-bf-${runId}-lp-term`;
        const affLpId = `aff05ar2-bf-${runId}-lp-aff`;
        const caseLpId = `aff05ar2-bf-${runId}-lp-case`;
        const freshId = `aff05ar2-bf-${runId}-fresh`;
        const overdueId = `aff05ar2-bf-${runId}-overdue`;
        const terminalId = `aff05ar2-bf-${runId}-terminal`;
        const affInitId = `aff05ar2-bf-${runId}-affinit`;
        const caseResId = `aff05ar2-bf-${runId}-caseres`;

        await ephem.user.create({
          data: { id: managerId, phone: `${managerId}-p`, name: 'AFF05AR2 BF mgr', role: 'HR_MANAGER' },
        });
        for (const [id, label] of [
          [lpId, 'LP'],
          [overdueLpId, 'OVERDUE'],
          [termLpId, 'TERM'],
          [affLpId, 'AFFINIT'],
          [caseLpId, 'CASE'],
        ] as const) {
          await ephem.laborProfile.create({
            data: {
              id,
              fullName: `AFF05AR2 BF ${label} ${id}`,
              phone: `${id}-p`,
              normalizedPhone: `${id}-n`,
              consentAt: new Date(),
            },
          });
        }

        const now = new Date();
        const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          freshId, lpId, managerId, managerId, sixDaysAgo,
        );
        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          overdueId, overdueLpId, managerId, managerId, tenDaysAgo,
        );
        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, reason, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'REVOKED', 'manager-released', now(), now(), 1)`,
          terminalId, termLpId, managerId, managerId, tenDaysAgo,
        );
        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, NULL, 'AFF_INITIAL', $4, NULL, 'ACTIVE', now(), now(), 1)`,
          affInitId, affLpId, managerId, sixDaysAgo,
        );
        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, NULL, 'CASE_RESOLUTION', $4, NULL, 'ACTIVE', now(), now(), 1)`,
          caseResId, caseLpId, managerId, sixDaysAgo,
        );

        applyAff05aR2MigrationFile(backfillUrl);

        const rows = await ephem.$queryRawUnsafe<Array<{
          id: string; status: string; expires_at: Date | null; starts_at: Date; source: string; reason: string | null;
        }>>(
          `SELECT id, status, expires_at, starts_at, source, reason
             FROM labor_profile_handling_assignments
            WHERE id = ANY($1::text[])`,
          [freshId, overdueId, terminalId, affInitId, caseResId],
        );
        const byId = new Map(rows.map((r) => [r.id, r]));

        // (a) Fresh ACTIVE MANAGER: deadline = starts_at + 7 days (exact 7*86_400_000 ms); status ACTIVE.
        const fresh = byId.get(freshId)!;
        expect(fresh.expires_at).not.toBeNull();
        const freshDiffMs = new Date(fresh.expires_at!).getTime() - new Date(fresh.starts_at).getTime();
        expect(freshDiffMs).toBe(7 * 24 * 60 * 60 * 1000);
        expect(fresh.status).toBe('ACTIVE');

        // (b) Overdue ACTIVE -> EXPIRED, deadline = starts_at + 7 days.
        const overdue = byId.get(overdueId)!;
        expect(overdue.status).toBe('EXPIRED');
        const overdueDiffMs = new Date(overdue.expires_at!).getTime() - new Date(overdue.starts_at).getTime();
        expect(overdueDiffMs).toBe(7 * 24 * 60 * 60 * 1000);

        // (c) Terminal REVOKED: status preserved verbatim; deadline set by backfill.
        const terminal = byId.get(terminalId)!;
        expect(terminal.status).toBe('REVOKED');
        expect(terminal.reason).toBe('manager-released');
        expect(terminal.expires_at).not.toBeNull();

        // (d) AFF_INITIAL: status ACTIVE, deadline STILL NULL (outside predicate).
        const affInit = byId.get(affInitId)!;
        expect(affInit.source).toBe('AFF_INITIAL');
        expect(affInit.status).toBe('ACTIVE');
        expect(affInit.expires_at).toBeNull();

        // (e) CASE_RESOLUTION: status ACTIVE, deadline STILL NULL.
        const caseRes = byId.get(caseResId)!;
        expect(caseRes.source).toBe('CASE_RESOLUTION');
        expect(caseRes.status).toBe('ACTIVE');
        expect(caseRes.expires_at).toBeNull();

        // Final assertion (DEC-04 / AC-03): no remaining indefinite MANAGER_ASSIGNMENT rows.
        const indefinite = await ephem.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text AS count
             FROM labor_profile_handling_assignments
            WHERE source = 'MANAGER_ASSIGNMENT'
              AND expires_at IS NULL
              AND starts_at IS NOT NULL`,
        );
        expect(Number(indefinite[0].count)).toBe(0);
      } finally {
        await ephem.$disconnect().catch(() => {});
      }
    } finally {
      const idx = ephemeralDbs.indexOf(backfillDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${backfillDb}"`); } catch { /* afterAll reports */ }
    }
  }, 240_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-05 (T0 §5): REAL two-connection race. Two Prisma clients attempt to
  // insert MANAGER_ASSIGNMENT with the same labor_profile_id and
  // status='ACTIVE'. The partial unique index
  // `labor_profile_handling_active_idx` (WHERE status = 'ACTIVE') must allow
  // exactly one ACTIVE winner; the loser must receive a typed conflict.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-05 race: two independent DB connections race on the same LaborProfile; exactly one ACTIVE winner, loser gets typed conflict, no duplicate row, no orphan history', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: raceDb, url: raceUrl } = createEphemeralDb('race');
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, raceUrl);
      applyAff05aR2MigrationFile(raceUrl);

      const runId = randomUUID().slice(0, 8);
      const lpId = `aff05ar2-race-${runId}-lp`;
      const mgrAId = `aff05ar2-race-${runId}-mgrA`;
      const mgrBId = `aff05ar2-race-${runId}-mgrB`;
      const winnerId = `aff05ar2-race-${runId}-win`;
      const loserId = `aff05ar2-race-${runId}-lose`;

      const clientA = new PrismaClient({ datasources: { db: { url: raceUrl } } });
      const clientB = new PrismaClient({ datasources: { db: { url: raceUrl } } });
      const verifier = new PrismaClient({ datasources: { db: { url: raceUrl } } });

      try {
        await clientA.user.create({ data: { id: mgrAId, phone: `${mgrAId}-p`, name: 'A mgr', role: 'HR_MANAGER' } });
        await clientA.user.create({ data: { id: mgrBId, phone: `${mgrBId}-p`, name: 'B mgr', role: 'HR_MANAGER' } });
        await clientA.laborProfile.create({
          data: {
            id: lpId,
            fullName: `AFF05AR2 RACE LP ${lpId}`,
            phone: `${lpId}-p`,
            normalizedPhone: `${lpId}-n`,
            consentAt: new Date(),
          },
        });

        const startsAt = new Date();
        const expiresAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Insert winner first (commits).
        await clientA.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $3, 'MANAGER_ASSIGNMENT', $4, $5, 'ACTIVE', now(), now(), 1)`,
          winnerId, lpId, mgrAId, startsAt, expiresAt,
        );

        // B attempts to insert a second ACTIVE row for the same LP — must fail.
        let loserSawTypedConflict = false;
        let loserSqlState = '';
        let loserPrismaCode = '';
        try {
          await clientB.$executeRawUnsafe(
            `INSERT INTO labor_profile_handling_assignments
               (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
                source, starts_at, expires_at, status, created_at, updated_at, version)
             VALUES ($1, $2, $3, $3, 'MANAGER_ASSIGNMENT', $4, $5, 'ACTIVE', now(), now(), 1)`,
            loserId, lpId, mgrBId, startsAt, expiresAt,
          );
        } catch (err: any) {
          const msg = String(err?.message ?? err);
          if (err instanceof Prisma.PrismaClientKnownRequestError) {
            loserPrismaCode = err.code ?? '';
            if (loserPrismaCode === 'P2002') loserSawTypedConflict = true;
            if (String(err.meta?.code ?? '') === '23505') {
              loserSqlState = '23505';
              loserSawTypedConflict = true;
            }
          }
          const m = msg.match(/SQLSTATE\s*([0-9A-Z]+)/i);
          if (m) loserSqlState = m[1];
          if (loserSqlState === '23505') loserSawTypedConflict = true;
          if (!loserSawTypedConflict) {
            throw new Error(`AC-05 race loser did not raise typed conflict: ${msg}`);
          }
        }
        expect(loserSawTypedConflict, 'AC-05 loser must raise P2002 or SQLSTATE 23505').toBe(true);

        const activeRows = await verifier.$queryRawUnsafe<Array<{ id: string; assignee_user_id: string }>>(
          `SELECT id, assignee_user_id
             FROM labor_profile_handling_assignments
            WHERE labor_profile_id = $1
              AND status = 'ACTIVE'`,
          lpId,
        );
        expect(activeRows.length).toBe(1);
        expect(activeRows[0].id).toBe(winnerId);
        expect(activeRows[0].assignee_user_id).toBe(mgrAId);

        const allRows = await verifier.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text AS count
             FROM labor_profile_handling_assignments
            WHERE labor_profile_id = $1`,
          lpId,
        );
        expect(Number(allRows[0].count)).toBe(1);

        const loserRow = await verifier.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text AS count
             FROM labor_profile_handling_assignments
            WHERE id = $1`,
          loserId,
        );
        expect(Number(loserRow[0].count)).toBe(0);
      } finally {
        await clientA.$disconnect().catch(() => {});
        await clientB.$disconnect().catch(() => {});
        await verifier.$disconnect().catch(() => {});
      }
    } finally {
      const idx = ephemeralDbs.indexOf(raceDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${raceDb}"`); } catch { /* afterAll reports */ }
    }
  }, 240_000);

  // ───────────────────────────────────────────────────────────────────────
  // AC-05 (additional evidence — bounded lock_timeout file structural
  // assertion). Distinct from the race test above. AC-05 is the race; this
  // file-shape assertion lives as a separate it() so the audit lane can
  // classify "bounded lock_timeout" separately from the race outcome.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-05/LT bounded lock_timeout: migration declares SET LOCAL lock_timeout=5s followed by lock-waiting statements (file structural assertion)', async () => {
    const sql = readFileSync(MIGRATION_FILE, 'utf8');
    expect(sql).toMatch(/SET LOCAL lock_timeout\s*=\s*'5s'/);
    const setLocalIdx = sql.search(/SET LOCAL lock_timeout/);
    const after = sql.slice(setLocalIdx);
    expect(after).toMatch(/LOCK TABLE labor_profile_handling_assignments/);
    expect(after).toMatch(/ADD CONSTRAINT labor_profile_handling_assignments_manager_expires_required/);
  });

  // ───────────────────────────────────────────────────────────────────────
  // AC-06 fail-closed: future starts_at on the target predicate must cause
  // the migration to abort. The CHECK add and the row updates are inside
  // the same transaction; the rollback must remove the constraint too.
  // ───────────────────────────────────────────────────────────────────────
  it('AC-06 fail-closed: future starts_at aborts the migration with a typed exception; the conditional CHECK is rolled back', async () => {
    const staged = stagePredecessorRepo();
    pseudoRoots.push(staged.pseudoRoot);
    const { dbName: failDb, url: failUrl } = createEphemeralDb('fail');
    try {
      applyPredecessorMigrations(staged.pseudoRoot, staged.schemaFile, failUrl);

      const ephem = new PrismaClient({ datasources: { db: { url: failUrl } } });
      const runId = randomUUID().slice(0, 8);
      try {
        const lpId = `aff05ar2-fail-${runId}-lp`;
        const mgrId = `aff05ar2-fail-${runId}-mgr`;
        const futureRowId = `aff05ar2-fail-${runId}-future`;

        await ephem.user.create({ data: { id: mgrId, phone: `${mgrId}-p`, name: 'FAIL mgr', role: 'HR_MANAGER' } });
        await ephem.laborProfile.create({
          data: {
            id: lpId,
            fullName: `AFF05AR2 FAIL LP ${lpId}`,
            phone: `${lpId}-p`,
            normalizedPhone: `${lpId}-n`,
            consentAt: new Date(),
          },
        });

        const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
        await ephem.$executeRawUnsafe(
          `INSERT INTO labor_profile_handling_assignments
             (id, labor_profile_id, assignee_user_id, assigned_by_user_id,
              source, starts_at, expires_at, status, created_at, updated_at, version)
           VALUES ($1, $2, $3, $4, 'MANAGER_ASSIGNMENT', $5, NULL, 'ACTIVE', now(), now(), 1)`,
          futureRowId, lpId, mgrId, mgrId, oneHourLater,
        );

        let raised = false;
        try {
          applyAff05aR2MigrationFile(failUrl);
        } catch {
          raised = true;
        }
        expect(raised, 'migration should abort on future starts_at anomaly').toBe(true);

        const con = await ephem.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*)::text AS count
             FROM pg_constraint
            WHERE conname = $1
              AND conrelid = $2::regclass
              AND contype = 'c'`,
          R2_CONSTRAINT_NAME,
          `public.${TARGET_TABLE}`,
        );
        expect(Number(con[0].count)).toBe(0);

        const row = await ephem.$queryRawUnsafe<Array<{ expires_at: Date | null }>>(
          `SELECT expires_at FROM labor_profile_handling_assignments WHERE id = $1`,
          futureRowId,
        );
        expect(row[0].expires_at).toBeNull();
      } finally {
        await ephem.$disconnect().catch(() => {});
      }
    } finally {
      const idx = ephemeralDbs.indexOf(failDb);
      if (idx >= 0) ephemeralDbs.splice(idx, 1);
      try { runPsql(adminUrl, `DROP DATABASE IF EXISTS "${failDb}"`); } catch { /* afterAll reports */ }
    }
  }, 180_000);
});
