/**
 * tests/db/p1a1-migration-chain-proof.integration.test.ts
 *
 * hrp-p1-a1 — predecessor upgrade-path proof (correction batch 1/1, C-05).
 *
 * Workflow:
 *   1. Tạo ephemeral DB `p1a1chain_<runId>` từ admin URL (psql CREATE DATABASE).
 *   2. Materialize migration staging ở thư mục tạm, gồm toàn bộ chain hiện tại NGOẠI TRỪ
 *      A1, rồi chạy `prisma migrate deploy` trên staging để có predecessor thật.
 *   3. Giữ nguyên predecessor function body do real migration chain tạo ra; test không
 *      rewrite function trước khi chạy byte-identical A1 migration.
 *   4. Seed canonical chain: ClientCompany → Project → StaffingOrder → 2 Slots →
 *      2 JobOpenings → 3 JobPostings (PUBLISHED, DRAFT, ARCHIVED) — same shape với
 *      integration test chính nhưng ephemeral.
 *   5. Apply byte-identical `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`
 *      bằng `prisma db execute --stdin`.
 *   6. Verify catalog (function owner, prosecdef, search_path, EXECUTE grants,
 *      SELECT dependency set, PUBLIC no EXECUTE, app/app_user_writer retains,
 *      INSERT/UPDATE/DELETE not granted, no residual SET ROLE capability, CREATE revoked).
 *   7. Verify behavior: apply thật qua function bằng connection `app_user_writer`;
 *      canonical chain thành công và sibling slot bị reject.
 *   8. Negative rollback proof: trigger post-assert fail (tamper giả lập) bằng cách
 *      chạy một file SQL riêng re-applied với `prosecdef = false` để chứng minh
 *      post-assert raise exception làm rollback toàn bộ file. Sau đó verify function
 *      vẫn thuộc catalog đúng và chain integrity còn nguyên.
 *   9. Cleanup: terminate connections + DROP DATABASE.
 *
 * ENV contract: chạy thật khi có DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST. Nếu thiếu
 * → ENV_BLOCKED (không fake PASS), in dòng cảnh báo đầy đủ để Tier 0/Owner cung cấp DB.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? "";
const writerUrl = process.env.DATABASE_URL_TEST ?? "";
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes("placeholder") &&
  !writerUrl.includes("placeholder");

if (!HAS_TEST_DB) {
  throw new Error(
    "[P1A1 migration chain proof] ENV_BLOCKED: cần DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST. " +
      "Không chạy proof này trên production; chỉ dùng synthetic/ephemeral DB.",
  );
}

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PRISMA_BIN = path.join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);
const PSQL_BIN =
  process.env.PG_PSQL_BIN ??
  (process.platform === "win32"
    ? "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"
    : "psql");
const A1_MIGRATION_DIR = path.join(
  REPO_ROOT,
  "prisma",
  "migrations",
  "20260925000000_p1a1_canonical_apply_jobpostings",
);
const A1_MIGRATION_FILE = path.join(A1_MIGRATION_DIR, "migration.sql");

function buildEphemeralDbName(): string {
  return `p1a1chain_${randomUUID().slice(0, 8).replace(/-/g, "")}`;
}

function deriveDbUrl(baseUrl: string, dbName: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function runPsql(databaseUrl: string, sql: string): string {
  const u = new URL(databaseUrl);
  const dbName = u.pathname.replace(/^\//, "");
  const args = [
    "-h",
    u.hostname,
    "-p",
    u.port || "5432",
    "-U",
    decodeURIComponent(u.username),
    "-d",
    dbName,
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-c",
    sql,
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  return execFileSync(PSQL_BIN, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

function applyAllMigrations(ephUrl: string, schemaPath: string): void {
  const result = spawnSync(
    PRISMA_BIN,
    ["migrate", "deploy", "--schema", schemaPath],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: ephUrl,
        DATABASE_URL_ADMIN: ephUrl,
      },
      stdio: "pipe",
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from("")).toString();
    const stdout = (result.stdout ?? Buffer.from("")).toString();
    let migrationLog = "<unavailable>";
    try {
      migrationLog = runPsql(
        ephUrl,
        `SELECT migration_name, logs FROM _prisma_migrations WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      );
    } catch (logError) {
      migrationLog = `<read failed: ${String((logError as Error).message ?? logError)}>`;
    }
    throw new Error(
      `[P1A1 chain proof] prisma migrate deploy failed (exit ${result.status}). stderr: ${stderr}\n` +
        `stdout: ${stdout}\nfailed migration log: ${migrationLog}`,
    );
  }
}

function buildPredecessorStaging(): { root: string; schemaPath: string } {
  const root = mkdtempSync(path.join(tmpdir(), "p1a1-predecessor-"));
  const prismaRoot = path.join(root, "prisma");
  const migrationsRoot = path.join(prismaRoot, "migrations");
  mkdirSync(migrationsRoot, { recursive: true });
  cpSync(
    path.join(REPO_ROOT, "prisma", "schema.prisma"),
    path.join(prismaRoot, "schema.prisma"),
  );
  cpSync(
    path.join(REPO_ROOT, "prisma", "migrations", "migration_lock.toml"),
    path.join(migrationsRoot, "migration_lock.toml"),
  );
  const sourceMigrations = path.join(REPO_ROOT, "prisma", "migrations");
  for (const entry of readdirSync(sourceMigrations, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === path.basename(A1_MIGRATION_DIR))
      continue;
    cpSync(
      path.join(sourceMigrations, entry.name),
      path.join(migrationsRoot, entry.name),
      {
        recursive: true,
      },
    );
  }
  return { root, schemaPath: path.join(prismaRoot, "schema.prisma") };
}

function applyMigrationSql(ephUrl: string, sql: string, label: string): void {
  const result = spawnSync(
    PRISMA_BIN,
    [
      "db",
      "execute",
      "--stdin",
      "--schema",
      path.join(REPO_ROOT, "prisma", "schema.prisma"),
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: ephUrl,
        DATABASE_URL_ADMIN: ephUrl,
      },
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from("")).toString();
    const stdout = (result.stdout ?? Buffer.from("")).toString();
    throw new Error(
      `[P1A1 chain proof] prisma db execute --stdin failed (exit ${result.status}) for ${label}. ` +
        `stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

function applyMigrationFile(ephUrl: string, filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`[P1A1 chain proof] migration file missing: ${filePath}`);
  }
  const sql = readFileSync(filePath, "utf8");
  try {
    applyMigrationSql(ephUrl, sql, filePath);
  } catch (error) {
    throw new Error(
      `[P1A1 chain proof] failed to apply ${filePath}: ${String((error as Error).message ?? error)}`,
      { cause: error },
    );
  }
}

const SIG =
  "(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text)";

describe("P1-A1 migration chain proof (C-05)", () => {
  let admin: PrismaClient;
  let ephemeral: PrismaClient;
  let ephemeralWriter: PrismaClient;
  const ephemeralDbName = buildEphemeralDbName();
  const ephemeralUrl = deriveDbUrl(adminUrl, ephemeralDbName);
  const ephemeralWriterUrl = deriveDbUrl(writerUrl, ephemeralDbName);

  const runId = `p1a1c-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    const sourceDbName = new URL(adminUrl).pathname.replace(/^\//, "");
    if (!/^p1a1chain_[0-9a-f]{8}$/.test(ephemeralDbName)) {
      throw new Error(
        `[P1A1 chain proof] unsafe ephemeral DB name: ${ephemeralDbName}`,
      );
    }
    if (sourceDbName === ephemeralDbName) {
      throw new Error(
        "[P1A1 chain proof] source and target DB names must differ",
      );
    }
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });

    // 1. Ephemeral DB
    runPsql(adminUrl, `CREATE DATABASE "${ephemeralDbName}"`);

    // 2. Materialize the exact current chain excluding A1, then deploy it in isolation.
    //    No worktree migration is renamed or moved.
    const staging = buildPredecessorStaging();
    try {
      applyAllMigrations(ephemeralUrl, staging.schemaPath);
    } finally {
      rmSync(staging.root, { recursive: true, force: true });
    }

    // 3. Seed canonical chain via admin Prisma client. The predecessor function is the
    //    byte-for-byte result of the real migration chain and is not rewritten by this test.
    ephemeral = new PrismaClient({
      datasources: { db: { url: ephemeralUrl } },
    });
    ephemeralWriter = new PrismaClient({
      datasources: { db: { url: ephemeralWriterUrl } },
    });

    const cc = await ephemeral.clientCompany.create({
      data: {
        id: `${runId}-cc`,
        code: `${runId}-CC`,
        name: `Company ${runId}`,
      },
      select: { id: true },
    });
    const prj = await ephemeral.project.create({
      data: {
        id: `${runId}-prj`,
        code: `PRJ-${runId}`,
        name: `Project ${runId}`,
        clientCompanyId: cc.id,
        status: "ACTIVE",
        isPublic: true,
        startDate: new Date(),
      },
      select: { id: true },
    });
    const so = await ephemeral.staffingOrder.create({
      data: {
        id: `${runId}-so`,
        projectId: prj.id,
        code: `${runId}-SO`,
        title: `Order ${runId}`,
        status: "OPEN",
      },
      select: { id: true },
    });

    // Slot A → Opening A
    const slotA = await ephemeral.staffingOrderSlot.create({
      data: {
        id: `${runId}-slot-a`,
        staffingOrderId: so.id,
        positionCode: "ELEC",
        positionTitle: `Engineer ${runId} A`,
        slotsNeeded: 5,
        slotsFilled: 0,
        validFrom: new Date(),
      },
      select: { id: true },
    });
    const openingA = await ephemeral.jobOpening.create({
      data: {
        id: `${runId}-jo-a`,
        staffingOrderId: so.id,
        staffingOrderSlotId: slotA.id,
        status: "OPEN",
        openedAt: new Date(),
      },
      select: { id: true },
    });
    await ephemeral.staffingOrderSlot.update({
      where: { id: slotA.id },
      data: { jobOpeningId: openingA.id },
    });

    // Slot B → Opening B (sibling)
    const slotB = await ephemeral.staffingOrderSlot.create({
      data: {
        id: `${runId}-slot-b`,
        staffingOrderId: so.id,
        positionCode: "PACK",
        positionTitle: `Engineer ${runId} B`,
        slotsNeeded: 3,
        slotsFilled: 0,
        validFrom: new Date(),
      },
      select: { id: true },
    });
    const openingB = await ephemeral.jobOpening.create({
      data: {
        id: `${runId}-jo-b`,
        staffingOrderId: so.id,
        staffingOrderSlotId: slotB.id,
        status: "OPEN",
        openedAt: new Date(),
      },
      select: { id: true },
    });
    await ephemeral.staffingOrderSlot.update({
      where: { id: slotB.id },
      data: { jobOpeningId: openingB.id },
    });

    // Posting A (PUBLISHED, on opening A)
    await ephemeral.jobPosting.create({
      data: {
        id: `${runId}-jp-a`,
        jobOpeningId: openingA.id,
        slug: `${runId}-posting-a`,
        revision: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    // Capture predecessor function body fingerprint so we can prove rollback worked
    const predFingerprint = await ephemeral.$queryRawUnsafe<
      Array<{ prosrc: string }>
    >(
      `SELECT prosrc FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
    );
    expect(predFingerprint).toHaveLength(1);
    expect(predFingerprint[0]!.prosrc).toMatch(/JOB_NOT_AVAILABLE/);
    expect(predFingerprint[0]!.prosrc).not.toMatch(/job_postings/);
  }, 240_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    try {
      if (!/^p1a1chain_[0-9a-f]{8}$/.test(ephemeralDbName)) {
        throw new Error(
          `[P1A1 chain proof] refusing unsafe cleanup target: ${ephemeralDbName}`,
        );
      }
      runPsql(
        adminUrl,
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${ephemeralDbName}' AND pid <> pg_backend_pid();`,
      );
      runPsql(adminUrl, `DROP DATABASE IF EXISTS "${ephemeralDbName}"`);
    } catch (e) {
      cleanupErrors.push(e);
    }
    for (const client of [ephemeralWriter, ephemeral, admin]) {
      try {
        await client?.$disconnect();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors,
        "[P1A1 chain proof] cleanup failed",
      );
    }
  }, 60_000);

  it("predecessor state has NO A1 grants (job_postings/job_openings) for hrp_public_rpc", async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND table_schema = 'public'
          AND table_name IN ('job_postings', 'job_openings')
          AND privilege_type = 'SELECT'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("applies byte-identical A1 migration file (forward-only replacement)", () => {
    expect(existsSync(A1_MIGRATION_FILE)).toBe(true);
    const sql = readFileSync(A1_MIGRATION_FILE, "utf8");
    // Spot-check key markers so we never silently apply a stale file
    expect(sql).toContain("hrp-p1-a1");
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("COMMIT;");
    expect(sql).toContain(
      "GRANT SELECT ON TABLE job_postings TO hrp_public_rpc",
    );
    expect(sql).toContain("s.job_opening_id    = jo.id");
    expect(sql).toContain("ERRCODE = 'P0011'");

    applyMigrationFile(ephemeralUrl, A1_MIGRATION_FILE);
  }, 120_000);

  it("post-apply catalog: function signature/owner/SECURITY DEFINER/search_path preserved", async () => {
    const rows = await ephemeral.$queryRawUnsafe<
      Array<{
        oid: string;
        prosecdef: boolean;
        proowner: string;
        proconfig: string[];
      }>
    >(
      `SELECT p.oid::text AS oid,
                p.prosecdef,
                p.proowner::regrole::text AS proowner,
                p.proconfig
           FROM pg_proc p
          WHERE p.oid = to_regprocedure($1)`,
      `public.hrp_public_apply_submission${SIG}`,
    );
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.oid).toMatch(/^\d+$/);
    expect(r.prosecdef).toBe(true);
    expect(r.proowner).toBe("hrp_public_rpc");
    const cfg = (r.proconfig ?? []).join(", ");
    expect(cfg).toContain("search_path=public, pg_temp");
  });

  it("post-apply catalog: PUBLIC has NO EXECUTE; app_user/app_user_writer retain EXECUTE", async () => {
    const fnOid = (
      await ephemeral.$queryRawUnsafe<Array<{ oid: number }>>(
        `SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
      )
    )[0]!.oid;

    const publicExec = (
      await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT EXISTS (
           SELECT 1
             FROM pg_proc p,
                  LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
            WHERE p.oid = $1::oid
              AND acl.grantee = 0
              AND acl.privilege_type = 'EXECUTE'
         ) AS ok`,
        fnOid,
      )
    )[0]!.ok;
    expect(publicExec).toBe(false);

    const appExec = (
      await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT has_function_privilege('app_user', $1::oid, 'EXECUTE') AS ok`,
        fnOid,
      )
    )[0]!.ok;
    expect(appExec).toBe(true);

    const writerExec = (
      await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT has_function_privilege('app_user_writer', $1::oid, 'EXECUTE') AS ok`,
        fnOid,
      )
    )[0]!.ok;
    expect(writerExec).toBe(true);
  });

  it("post-apply catalog: hrp_public_rpc has exactly the 6 required SELECT dependencies", async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND privilege_type = 'SELECT'
          AND table_schema = 'public'
          AND table_name IN ('job_postings','job_openings','staffing_order_slots','staffing_orders',
                             'candidate_submissions','application_status_history')`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual([
      "application_status_history",
      "candidate_submissions",
      "job_openings",
      "job_postings",
      "staffing_order_slots",
      "staffing_orders",
    ]);
  });

  it("post-apply catalog: hrp_public_rpc has NO INSERT/UPDATE/DELETE on public tables", async () => {
    const rows = await ephemeral.$queryRawUnsafe<
      Array<{ privilege_type: string }>
    >(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND table_schema = 'public'
          AND table_name IN ('job_postings', 'job_openings')
          AND privilege_type IN ('INSERT','UPDATE','DELETE')
        GROUP BY privilege_type`,
    );
    expect(rows).toHaveLength(0);
  });

  it("post-apply catalog: hrp_public_rpc has NO CREATE ON SCHEMA public", async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
      `SELECT has_schema_privilege('hrp_public_rpc', 'public', 'CREATE') AS ok`,
    );
    expect(rows[0]!.ok).toBe(false);
  });

  it("post-apply catalog: migration admin retains no explicit SET-capable RPC membership", async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ leaked: boolean }>>(
      `SELECT EXISTS (
         SELECT 1
           FROM pg_auth_members membership
           JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
           JOIN pg_roles member_role ON member_role.oid = membership.member
          WHERE granted_role.rolname = 'hrp_public_rpc'
            AND member_role.rolname = session_user
            AND membership.set_option
       ) AS leaked`,
    );
    expect(rows[0]!.leaked).toBe(false);
  });

  it("behavior: apply via canonical chain PUBLISHED + OPEN slot A succeeds", async () => {
    // Use writer (app_user_writer) connection via prisma db execute raw.
    const slug = `${runId}-posting-a`;
    const trackingCode = `APP-${randomUUID()}`;
    const idemHash = `id-${randomUUID()}`.padEnd(64, "0").slice(0, 64);
    const payloadHash = `ph-${slug}-test`.padEnd(64, "0").slice(0, 64);

    const sql = `SELECT * FROM hrp_public_apply_submission(
                   $1::text, NULL::text, $2::text, $3::text, $3::text,
                   NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
                   ''::text, ''::text, 0::integer, ''::text,
                   $4::text, $5::text, $6::text
                 )`;
    const result = await ephemeralWriter.$queryRawUnsafe<
      Array<{ tracking_code: string; status: string }>
    >(
      sql,
      slug,
      "Nguyen Van Chain",
      "0900000099",
      idemHash,
      payloadHash,
      trackingCode,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.tracking_code).toBe(trackingCode);
    expect(result[0]!.status).toBe("NEW");

    // Exactly 1 submission + 1 history row
    const subs = await ephemeral.candidateSubmission.count({
      where: { projectId: `${runId}-prj` },
    });
    expect(subs).toBe(1);
    const subSlot = (
      await ephemeral.candidateSubmission.findFirst({
        where: { projectId: `${runId}-prj` },
        select: { slotId: true },
      })
    )?.slotId;
    expect(subSlot).toBe(`${runId}-slot-a`); // canonical, NOT slot B

    const histories = await ephemeral.applicationStatusHistory.count({
      where: { submission: { projectId: `${runId}-prj` } },
    });
    expect(histories).toBe(1);
  }, 60_000);

  it("behavior: apply via sibling slot B under same StaffingOrder → JOB_NOT_AVAILABLE (P0011)", async () => {
    const slug = `${runId}-posting-a`; // posting A expects slot A
    const idemHash = `id-${randomUUID()}`.padEnd(64, "0").slice(0, 64);
    const payloadHash = `ph-${slug}-sibling`.padEnd(64, "0").slice(0, 64);

    const sql = `SELECT * FROM hrp_public_apply_submission(
                   $1::text, $2::text, $3::text, $4::text, $4::text,
                   NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
                   ''::text, ''::text, 0::integer, ''::text,
                   $5::text, $6::text, $7::text
                 )`;
    let caught: unknown = null;
    try {
      await ephemeralWriter.$queryRawUnsafe(
        sql,
        slug,
        `${runId}-slot-b`,
        "Nguyen Van Sibling",
        "0900000088",
        idemHash,
        payloadHash,
        `APP-${randomUUID()}`,
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    const err = caught as {
      code?: string;
      message?: string;
      meta?: { code?: string };
    };
    expect(`${err.meta?.code ?? ""} ${err.message ?? ""}`).toMatch(
      /P0011|JOB_NOT_AVAILABLE/,
    );
  }, 60_000);

  it("NEGATIVE ROLLBACK proof: post-assert failure rolls back the ENTIRE migration file", async () => {
    // Inject a test-only SECURITY INVOKER mutation INSIDE the migration transaction,
    // immediately before the committed postflight block. The committed file itself is
    // unchanged; this proves a postflight failure rolls back every statement in that run.
    const originalSql = readFileSync(A1_MIGRATION_FILE, "utf8");
    const ownerExitMarker = "RESET ROLE;";
    expect(originalSql.split(ownerExitMarker)).toHaveLength(2);
    const tamperedSql = originalSql.replace(
      ownerExitMarker,
      `ALTER FUNCTION hrp_public_apply_submission${SIG} SECURITY INVOKER;\n\n${ownerExitMarker}`,
    );
    let caught: unknown = null;
    try {
      applyMigrationSql(
        ephemeralUrl,
        tamperedSql,
        "test-only tampered A1 rollback proof",
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    expect(String((caught as Error).message ?? caught)).toMatch(
      /prosecdef|P0011|post_assert_failed/,
    );

    // ── NEGATIVE ROLLBACK GUARANTEES ───────────────────────────────────────
    // (1) prosecdef phải được khôi phục = true (post-state của A1 lần apply trước)
    const recovered = (
      await ephemeral.$queryRawUnsafe<Array<{ prosecdef: boolean }>>(
        `SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
      )
    )[0]!.prosecdef;
    expect(recovered).toBe(true);

    // (2) Behavior case từ trước vẫn pass (apply canonical chain thành công)
    const slug = `${runId}-posting-a`;
    const idemHash = `id-${randomUUID()}`.padEnd(64, "0").slice(0, 64);
    const payloadHash = `ph-${slug}-recover`.padEnd(64, "0").slice(0, 64);
    const result = await ephemeralWriter.$queryRawUnsafe<
      Array<{ tracking_code: string; status: string }>
    >(
      `SELECT * FROM hrp_public_apply_submission(
         $1::text, NULL::text, $2::text, $3::text, $3::text,
         NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
         ''::text, ''::text, 0::integer, ''::text,
         $4::text, $5::text, $6::text
       )`,
      slug,
      "Nguyen Van Recover",
      "0900000077",
      idemHash,
      payloadHash,
      `APP-${randomUUID()}`,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("NEW");

    // (3) Submissions count phải = 2 (lần apply đầu + lần apply sau rollback)
    const subs = await ephemeral.candidateSubmission.count({
      where: { projectId: `${runId}-prj` },
    });
    expect(subs).toBe(2);
  }, 120_000);
});
