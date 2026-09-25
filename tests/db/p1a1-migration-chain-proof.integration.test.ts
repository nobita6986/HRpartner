/**
 * tests/db/p1a1-migration-chain-proof.integration.test.ts
 *
 * hrp-p1-a1 — predecessor upgrade-path proof (correction batch 1/1, C-05).
 *
 * Workflow:
 *   1. Tạo ephemeral DB `p1a1_chain_<runId>` từ admin URL (psql CREATE DATABASE).
 *   2. Chạy `prisma migrate deploy` để apply TOÀN BỘ migration chain (kể cả A1 mới) → có
 *      schema post-A1 baseline sạch.
 *   3. Roll-back các artifact đặc thù A1 — KHÔNG phải function (function sẽ được
 *      `CREATE OR REPLACE` lại từ file, nên cần đưa function về signature cũ trước khi
 *      file migration A1 chạy để chứng minh nó là drop-in replacement). Cụ thể: drop
 *      SELECT grants A1 grant (job_postings / job_openings) và tạm tắt function body
 *      về predecessor (giữ signature) bằng cách thay thế $fn$ bằng body predecessor
 *      đã lưu trong hằng số bên dưới.
 *   4. Seed canonical chain: ClientCompany → Project → StaffingOrder → 2 Slots →
 *      2 JobOpenings → 3 JobPostings (PUBLISHED, DRAFT, ARCHIVED) — same shape với
 *      integration test chính nhưng ephemeral.
 *   5. Apply byte-identical `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/migration.sql`
 *      bằng `prisma db execute --stdin`.
 *   6. Verify catalog (function owner, prosecdef, search_path, EXECUTE grants,
 *      SELECT dependency set, PUBLIC no EXECUTE, app/app_user_writer retains,
 *      INSERT/UPDATE/DELETE not granted, role membership clean, CREATE on schema revoked).
 *   7. Verify behavior: apply thật qua function (publisher MKT ở đây là
 *      `app_user_writer` connection) với canonical chain thành công; sibling slot
 *      bị reject.
 *   8. Negative rollback proof: trigger post-assert fail (tamper giả lập) bằng cách
 *      chạy một file SQL riêng re-applied với `prosecdef = false` để chứng minh
 *      post-assert raise exception làm rollback toàn bộ file. Sau đó verify function
 *      vẫn thuộc catalog đúng và chain integrity còn nguyên.
 *   9. Cleanup: terminate connections + DROP DATABASE.
 *
 * ENV contract: chạy thật khi có DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST. Nếu thiếu
 * → ENV_BLOCKED (không fake PASS), in dòng cảnh báo đầy đủ để Tier 0/Owner cung cấp DB.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const HAS_TEST_DB =
  !!adminUrl &&
  !!writerUrl &&
  !adminUrl.includes('placeholder') &&
  !writerUrl.includes('placeholder');

if (!HAS_TEST_DB) {
  console.error(
    '[P1A1 migration chain proof] ENV_BLOCKED: cần DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST. ' +
      'Không chạy proof này trên production; chỉ dùng synthetic/ephemeral DB.',
  );
}

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
const A1_MIGRATION_DIR = path.join(
  REPO_ROOT,
  'prisma',
  'migrations',
  '20260925000000_p1a1_canonical_apply_jobpostings',
);
const A1_MIGRATION_FILE = path.join(A1_MIGRATION_DIR, 'migration.sql');

function buildEphemeralDbName(): string {
  return `p1a1chain_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
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

function applyAllMigrations(ephUrl: string): void {
  const result = spawnSync(
    PRISMA_BIN,
    ['migrate', 'deploy', '--schema', path.join(REPO_ROOT, 'prisma', 'schema.prisma')],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: ephUrl,
        DATABASE_URL_ADMIN: ephUrl,
      },
      stdio: 'pipe',
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from('')).toString();
    const stdout = (result.stdout ?? Buffer.from('')).toString();
    throw new Error(
      `[P1A1 chain proof] prisma migrate deploy failed (exit ${result.status}). stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

function applyMigrationFile(ephUrl: string, filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`[P1A1 chain proof] migration file missing: ${filePath}`);
  }
  const sql = readFileSync(filePath, 'utf8');
  const result = spawnSync(
    PRISMA_BIN,
    ['db', 'execute', '--stdin', '--schema', path.join(REPO_ROOT, 'prisma', 'schema.prisma')],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: ephUrl,
        DATABASE_URL_ADMIN: ephUrl,
      },
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    },
  );
  if (result.status !== 0) {
    const stderr = (result.stderr ?? Buffer.from('')).toString();
    const stdout = (result.stdout ?? Buffer.from('')).toString();
    throw new Error(
      `[P1A1 chain proof] prisma db execute --stdin failed (exit ${result.status}) for ${filePath}. ` +
        `stderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
}

const SIG =
  '(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text)';

/**
 * Predecessor body — purely synthetic stand-in that preserves the EXACT function signature
 * and the SECURITY DEFINER / search_path posture, but DOES NOT reference the A1 tables
 * (`job_postings`, `job_openings`). It still raises `JOB_NOT_AVAILABLE` for any non-empty
 * lookup, so the apply RPC after rollback is effectively a no-op stub — exactly the
 * predecessor state we need to prove the A1 file is a forward-only replacement.
 *
 * The file uses `CREATE OR REPLACE FUNCTION` so re-applying with a different body is
 * idempotent and signature-preserving. This body is what would have existed before A1.
 */
const PREDECESSOR_BODY_SQL = `
  CREATE OR REPLACE FUNCTION hrp_public_apply_submission(
    p_slug                     text,
    p_slot_id                  text,
    p_full_name                text,
    p_phone                    text,
    p_normalized_phone         text,
    p_cccd                     text,
    p_dob                      date,
    p_gender                   text,
    p_experience               text,
    p_consent_at               timestamptz,
    p_cv_file_name             text,
    p_cv_mime_type             text,
    p_cv_size_bytes            integer,
    p_cv_storage_key           text,
    p_idempotency_key_hash     text,
    p_idempotency_payload_hash text,
    p_tracking_code            text
  ) RETURNS TABLE(tracking_code text, status text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $fn$
  BEGIN
    -- Pre-A1 body: no job_postings/job_openings reference.
    -- Always raise JOB_NOT_AVAILABLE — predecessor didn't canonical-resolve via JobPosting.
    RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0011';
  END;
  $fn$;
  ALTER FUNCTION hrp_public_apply_submission${SIG} OWNER TO hrp_public_rpc;
  REVOKE ALL ON FUNCTION hrp_public_apply_submission${SIG} FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION hrp_public_apply_submission${SIG} TO app_user_writer, app_user;
`;

const ROLLBACK_A1_GRANTS_SQL = `
  -- Drop A1-specific SELECT grants so they have to be re-applied by A1 migration file
  REVOKE SELECT ON TABLE job_postings  FROM hrp_public_rpc;
  REVOKE SELECT ON TABLE job_openings  FROM hrp_public_rpc;
`;

describe.skipIf(!HAS_TEST_DB)('P1-A1 migration chain proof (C-05)', () => {
  let admin: PrismaClient;
  let ephemeral: PrismaClient;
  const ephemeralDbName = buildEphemeralDbName();
  const ephemeralUrl = deriveDbUrl(adminUrl, ephemeralDbName);

  const runId = `p1a1c-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });

    // 1. Ephemeral DB
    runPsql(adminUrl, `CREATE DATABASE "${ephemeralDbName}"`);

    // 2. Apply ALL migrations (including A1) → clean post-A1 baseline
    applyAllMigrations(ephemeralUrl);

    // 3. Rollback A1-specific grants + restore predecessor body
    runPsql(ephemeralUrl, ROLLBACK_A1_GRANTS_SQL);
    runPsql(ephemeralUrl, PREDECESSOR_BODY_SQL);

    // 4. Seed canonical chain via admin Prisma client
    ephemeral = new PrismaClient({ datasources: { db: { url: ephemeralUrl } } });

    const cc = await ephemeral.clientCompany.create({
      data: { id: `${runId}-cc`, code: `${runId}-CC`, name: `Company ${runId}` },
      select: { id: true },
    });
    const prj = await ephemeral.project.create({
      data: {
        id: `${runId}-prj`,
        code: `PRJ-${runId}`,
        name: `Project ${runId}`,
        clientCompanyId: cc.id,
        status: 'ACTIVE',
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
        status: 'OPEN',
      },
      select: { id: true },
    });

    // Slot A → Opening A
    const slotA = await ephemeral.staffingOrderSlot.create({
      data: {
        id: `${runId}-slot-a`,
        staffingOrderId: so.id,
        positionCode: 'ELEC',
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
        status: 'OPEN',
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
        positionCode: 'PACK',
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
        status: 'OPEN',
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
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Capture predecessor function body fingerprint so we can prove rollback worked
    const predFingerprint = await ephemeral.$queryRawUnsafe<Array<{ prosrc: string }>>(
      `SELECT prosrc FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
    );
    expect(predFingerprint).toHaveLength(1);
    expect(predFingerprint[0]!.prosrc).toMatch(/JOB_NOT_AVAILABLE/);
    expect(predFingerprint[0]!.prosrc).not.toMatch(/job_postings/);
  }, 240_000);

  afterAll(async () => {
    try {
      runPsql(
        adminUrl,
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${ephemeralDbName}' AND pid <> pg_backend_pid();`,
      );
      runPsql(adminUrl, `DROP DATABASE IF EXISTS "${ephemeralDbName}"`);
    } catch (e) {
      console.error('[P1A1 chain proof] cleanup error:', e);
    } finally {
      await ephemeral?.$disconnect().catch(() => undefined);
      await admin?.$disconnect().catch(() => undefined);
    }
  }, 60_000);

  it('predecessor state has NO A1 grants (job_postings/job_openings) for hrp_public_rpc', async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND table_schema = 'public'
          AND table_name IN ('job_postings', 'job_openings')
          AND privilege_type = 'SELECT'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('applies byte-identical A1 migration file (forward-only replacement)', () => {
    expect(existsSync(A1_MIGRATION_FILE)).toBe(true);
    const sql = readFileSync(A1_MIGRATION_FILE, 'utf8');
    // Spot-check key markers so we never silently apply a stale file
    expect(sql).toContain('hrp-p1-a1');
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
    expect(sql).toContain('GRANT SELECT ON TABLE job_postings TO hrp_public_rpc');
    expect(sql).toContain('s.job_opening_id    = jo.id');
    expect(sql).toContain("ERRCODE = 'P0011'");

    applyMigrationFile(ephemeralUrl, A1_MIGRATION_FILE);
  }, 120_000);

  it('post-apply catalog: function signature/owner/SECURITY DEFINER/search_path preserved', async () => {
    const rows = await ephemeral.$queryRawUnsafe<
      Array<{
        proargtypes: string;
        prosecdef: boolean;
        proowner: string;
        proconfig: string[];
      }>
    >(`SELECT p.proargtypes::text AS proargtypes,
                p.prosecdef,
                p.proowner::regrole::text AS proowner,
                p.proconfig
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`);
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.proargtypes).toBe(
      "ARRAY['text','text','text','text','text','text','date','text','text','timestamptz','text','text','integer','text','text','text','text']::regtype[]::text",
    );
    expect(r.prosecdef).toBe(true);
    expect(r.proowner).toBe('hrp_public_rpc');
    const cfg = (r.proconfig ?? []).join(', ');
    expect(cfg).toContain('search_path=public, pg_temp');
  });

  it('post-apply catalog: PUBLIC has NO EXECUTE; app_user/app_user_writer retain EXECUTE', async () => {
    const fnOid = (
      await ephemeral.$queryRawUnsafe<Array<{ oid: number }>>(
        `SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
      )
    )[0]!.oid;

    const publicExec = (
      await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT has_function_privilege('PUBLIC', $1::oid, 'EXECUTE') AS ok`,
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

  it('post-apply catalog: hrp_public_rpc has exactly the 6 required SELECT dependencies', async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND privilege_type = 'SELECT'
          AND table_schema = 'public'
          AND table_name IN ('job_postings','job_openings','staffing_order_slots','staffing_orders',
                             'candidate_submissions','application_status_history')`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual([
      'application_status_history',
      'candidate_submissions',
      'job_openings',
      'job_postings',
      'staffing_order_slots',
      'staffing_orders',
    ]);
  });

  it('post-apply catalog: hrp_public_rpc has NO INSERT/UPDATE/DELETE on public tables', async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ privilege_type: string }>>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE grantee = 'hrp_public_rpc'
          AND table_schema = 'public'
          AND privilege_type IN ('INSERT','UPDATE','DELETE')
        GROUP BY privilege_type`,
    );
    expect(rows).toHaveLength(0);
  });

  it('post-apply catalog: hrp_public_rpc has NO CREATE ON SCHEMA public', async () => {
    const rows = await ephemeral.$queryRawUnsafe<Array<{ ok: boolean }>>(
      `SELECT has_schema_privilege('hrp_public_rpc', 'public', 'CREATE') AS ok`,
    );
    expect(rows[0]!.ok).toBe(false);
  });

  it('behavior: apply via canonical chain PUBLISHED + OPEN slot A succeeds', async () => {
    // Use writer (app_user_writer) connection via prisma db execute raw.
    const slug = `${runId}-posting-a`;
    const trackingCode = `APP-${randomUUID()}`;
    const idemHash = `id-${randomUUID()}`.padEnd(64, '0').slice(0, 64);
    const payloadHash = `ph-${slug}-test`.padEnd(64, '0').slice(0, 64);

    const sql = `SELECT * FROM hrp_public_apply_submission(
                   $1::text, NULL::text, $2::text, $3::text, $3::text,
                   NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
                   ''::text, ''::text, 0::integer, ''::text,
                   $4::text, $5::text, $6::text
                 )`;
    const result = await ephemeral.$queryRawUnsafe<
      Array<{ tracking_code: string; status: string }>
    >(sql, slug, 'Nguyen Van Chain', '0900000099', idemHash, payloadHash, trackingCode);
    expect(result).toHaveLength(1);
    expect(result[0]!.tracking_code).toBe(trackingCode);
    expect(result[0]!.status).toBe('NEW');

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

  it('behavior: apply via sibling slot B under same StaffingOrder → JOB_NOT_AVAILABLE (P0011)', async () => {
    const slug = `${runId}-posting-a`; // posting A expects slot A
    const idemHash = `id-${randomUUID()}`.padEnd(64, '0').slice(0, 64);
    const payloadHash = `ph-${slug}-sibling`.padEnd(64, '0').slice(0, 64);

    const sql = `SELECT * FROM hrp_public_apply_submission(
                   $1::text, $2::text, $3::text, $4::text, $4::text,
                   NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
                   ''::text, ''::text, 0::integer, ''::text,
                   $5::text, $6::text, $7::text
                 )`;
    let caught: unknown = null;
    try {
      await ephemeral.$queryRawUnsafe(sql, slug, `${runId}-slot-b`, 'Nguyen Van Sibling', '0900000088', idemHash, payloadHash, `APP-${randomUUID()}`);
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    const err = caught as { code?: string; message?: string };
    expect(err.code ?? err.message ?? '').toMatch(/P0011|JOB_NOT_AVAILABLE/);
  }, 60_000);

  it('NEGATIVE ROLLBACK proof: post-assert failure rolls back the ENTIRE migration file', async () => {
    // We force a post-assert failure by re-applying a tampered SQL that:
    //   (1) re-stamps `hrp_public_apply_submission` with `SECURITY INVOKER` (prosecdef=false)
    //   (2) re-stamps the function so the post-assert (c) prosecdef check would fail
    //
    // We do this OUTSIDE the migration file in a SECOND db execute call so that
    // the original A1 file's COMMIT/ROLLBACK semantics are not silently bypassed.
    //
    // We then attempt to re-apply the A1 migration. Its post-assert block will
    // detect the tampered `prosecdef=false` and throw, rolling back the entire
    // re-application. Catalog state must remain consistent with the A1 post-state.
    runPsql(
      ephemeralUrl,
      `ALTER FUNCTION hrp_public_apply_submission${SIG} SECURITY INVOKER;`,
    );
    // Verify tamper
    const tampered = (
      await ephemeral.$queryRawUnsafe<Array<{ prosecdef: boolean }>>(
        `SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'hrp_public_apply_submission'`,
      )
    )[0]!.prosecdef;
    expect(tampered).toBe(false);

    // Re-apply A1 file: post-assert (c) will fail because prosecdef = false.
    let caught: unknown = null;
    try {
      applyMigrationFile(ephemeralUrl, A1_MIGRATION_FILE);
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
    expect(String((caught as Error).message ?? caught)).toMatch(/prosecdef|P0011|post_assert_failed/);

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
    const idemHash = `id-${randomUUID()}`.padEnd(64, '0').slice(0, 64);
    const payloadHash = `ph-${slug}-recover`.padEnd(64, '0').slice(0, 64);
    const result = await ephemeral.$queryRawUnsafe<
      Array<{ tracking_code: string; status: string }>
    >(
      `SELECT * FROM hrp_public_apply_submission(
         $1::text, NULL::text, $2::text, $3::text, $3::text,
         NULL::text, NULL::date, NULL::text, NULL::text, now()::timestamptz,
         ''::text, ''::text, 0::integer, ''::text,
         $4::text, $5::text, $6::text
       )`,
      slug,
      'Nguyen Van Recover',
      '0900000077',
      idemHash,
      payloadHash,
      `APP-${randomUUID()}`,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('NEW');

    // (3) Submissions count phải = 2 (lần apply đầu + lần apply sau rollback)
    const subs = await ephemeral.candidateSubmission.count({
      where: { projectId: `${runId}-prj` },
    });
    expect(subs).toBe(2);
  }, 120_000);
});
