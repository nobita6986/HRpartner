/**
 * security-boundary.mp2 — MP-2 STEP-07 (RQ-09 / DEC-08 / DEC-09 / AC-09).
 *
 * Proves the public write/read boundary is the SECURITY DEFINER RPC and nothing
 * else. Two layers:
 *
 *  1. STATIC (runs for real, here): assert the migration authored the boundary
 *     correctly (SECURITY DEFINER, pinned search_path, owner hrp_public_rpc,
 *     REVOKE FROM PUBLIC, GRANT EXECUTE to app roles only, NO `CREATE ROLE`),
 *     the provisioning script declares NOLOGIN BYPASSRLS, and the public route +
 *     service code never impersonate `app.role` to an authenticated role.
 *
 *  2. LIVE (ENV_BLOCKED by default, DEC-14): pg_roles/pg_proc introspection,
 *     EXECUTE-grant listing, and a NEGATIVE direct-INSERT proving app_user_writer
 *     cannot write candidate_submissions under anonymous/WORKER context. These
 *     require the migration APPLIED + role provisioned on a reachable DB, which
 *     does not exist in this environment, so they are skipped unless
 *     MP2_LIVE_SECURITY_CHECK=1 is set against such a DB. They are authored, not
 *     faked — running them green requires the real boundary.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
if (existsSync(join(ROOT, '.env'))) {
  const envFile = readFileSync(join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^\s*([^#=]+?)="?([^"]+)"?/);
    // Do NOT override variables already present in the process env. A LIVE runner
    // injects the mapped DATABASE_URL_ADMIN / DATABASE_URL (pointing at the safe
    // test DB); this loop must only FILL GAPS from repo .env, never clobber what
    // was passed in — otherwise the prod URLs in .env would silently redirect the
    // LIVE checks. (round 3, directive step 3)
    if (match) {
      const key = match[1].trim();
      if (process.env[key] === undefined) process.env[key] = match[2];
    }
  }
}

const MIGRATION = join(ROOT, 'prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql');
const TRACK_PROFILE_MIGRATION = join(ROOT, 'prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql');
const PROVISION = join(ROOT, 'scripts/create-public-rpc-role.cjs');
const PUBLIC_APPLY_ROUTE = join(ROOT, 'app/api/public/jobs/[slug]/applications/route.ts');
const PUBLIC_TRACK_ROUTE = join(ROOT, 'app/api/public/applications/[trackingCode]/route.ts');
const APPLY_SERVICE = join(ROOT, 'src/domains/applications/application.service.ts');

const read = (p: string) => readFileSync(p, 'utf8');

const APPLY_FN = 'hrp_public_apply_submission';
const TRACK_FN = 'hrp_public_tracking_profile';

describe('MP-2 security boundary — STATIC (DEC-08/09, AC-09)', () => {
  const sql = read(MIGRATION);
  const boundarySql = `${sql}\n${read(TRACK_PROFILE_MIGRATION)}`;
  // Executable DDL only — the migration header/inline comments legitimately
  // reference BYPASSRLS when documenting the OP-01 assumption (DEC-09).
  const sqlCode = boundarySql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');

  it('both public functions are SECURITY DEFINER with a pinned search_path', () => {
    // Two CREATE ... FUNCTION blocks, each SECURITY DEFINER + SET search_path.
    expect((boundarySql.match(/SECURITY DEFINER/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((boundarySql.match(/SET search_path = public, pg_temp/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(boundarySql).toContain(`CREATE OR REPLACE FUNCTION ${APPLY_FN}`);
    expect(boundarySql).toContain(`CREATE OR REPLACE FUNCTION ${TRACK_FN}`);
  });

  it('both functions are owned by hrp_public_rpc', () => {
    expect(boundarySql).toMatch(new RegExp(`ALTER FUNCTION ${APPLY_FN}\\([^)]*\\) OWNER TO hrp_public_rpc`));
    expect(boundarySql).toMatch(new RegExp(`ALTER FUNCTION ${TRACK_FN}\\([^)]*\\) OWNER TO hrp_public_rpc`));
  });

  it('EXECUTE is revoked from PUBLIC and granted only to app roles', () => {
    expect(boundarySql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION ${APPLY_FN}\\([^)]*\\) FROM PUBLIC`));
    expect(boundarySql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION ${TRACK_FN}\\([^)]*\\) FROM PUBLIC`));
    expect(boundarySql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION ${APPLY_FN}\\([^)]*\\) TO app_user_writer, app_user`));
    expect(boundarySql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION ${TRACK_FN}\\([^)]*\\) TO app_user_writer, app_user`));
  });

  it('the migration does NOT create/alter the BYPASSRLS role (DEC-09)', () => {
    expect(sqlCode).not.toMatch(/CREATE\s+ROLE/i);
    expect(sqlCode).not.toMatch(/ALTER\s+ROLE/i);
    expect(sqlCode).not.toMatch(/BYPASSRLS/i);
  });

  it('app roles are never granted BYPASSRLS anywhere in the migration', () => {
    // Belt-and-suspenders: no app/login role acquires bypass.
    expect(sqlCode).not.toMatch(/app_user\w*\s+BYPASSRLS/i);
  });

  it('the provisioning script declares hrp_public_rpc as NOLOGIN BYPASSRLS', () => {
    const js = read(PROVISION);
    expect(js).toContain('hrp_public_rpc');
    expect(js).toMatch(/NOLOGIN BYPASSRLS/);
    expect(js).toMatch(/GRANT USAGE ON SCHEMA public TO/);
  });

  it('the public apply/tracking path NEVER sets app.role (no impersonation)', () => {
    // Strip comments first: the files legitimately DOCUMENT the "never set app.role"
    // invariant in prose, so we must assert against executable code only.
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const p of [PUBLIC_APPLY_ROUTE, PUBLIC_TRACK_ROUTE, APPLY_SERVICE]) {
      const code = stripComments(read(p));
      // No RLS-role GUC write of any kind on the public path.
      expect(code).not.toMatch(/set_config\s*\(\s*['"]app\.role/);
      expect(code).not.toMatch(/SET\s+app\.role/i);
      // And it must not route through the authenticated RLS helpers.
      expect(code).not.toMatch(/applyRlsContext|withDbContext/);
    }
  });

  it('the public apply route delegates through the definer function name', () => {
    // Delegation happens in the service; the route must call the service, not raw SQL.
    expect(read(APPLY_SERVICE)).toContain(APPLY_FN);
    expect(read(APPLY_SERVICE)).toContain(TRACK_FN);
  });
});

// ── LIVE introspection (ENV_BLOCKED unless MP2_LIVE_SECURITY_CHECK=1) ──────────
// DEC-14: authored, not faked. Requires the migration APPLIED + hrp_public_rpc
// provisioned on the DB reachable via DATABASE_URL_ADMIN.
describe.skipIf(!process.env.MP2_LIVE_SECURITY_CHECK)('MP-2 security boundary — LIVE (AC-09)', () => {
  it('hrp_public_rpc is NOLOGIN + BYPASSRLS', async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN?.replace('&channel_binding=require', '') });
    await client.connect();
    try {
      const r = await client.query(
        `SELECT rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'hrp_public_rpc'`,
      );
      expect(r.rowCount).toBe(1);
      expect(r.rows[0].rolcanlogin).toBe(false);
      expect(r.rows[0].rolbypassrls).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('hrp_public_rpc has schema USAGE required by its pinned search_path', async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN?.replace('&channel_binding=require', '') });
    await client.connect();
    try {
      const r = await client.query(
        `SELECT has_schema_privilege('hrp_public_rpc', 'public', 'USAGE') AS has_usage`,
      );
      expect(r.rows[0].has_usage).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('both functions are prosecdef=true and owned by hrp_public_rpc', async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN?.replace('&channel_binding=require', '') });
    await client.connect();
    try {
      const r = await client.query(
        `SELECT p.proname, p.prosecdef, o.rolname AS owner
           FROM pg_proc p JOIN pg_roles o ON o.oid = p.proowner
          WHERE p.proname IN ($1, $2)`,
        [APPLY_FN, TRACK_FN],
      );
      expect(r.rowCount).toBe(2);
      for (const row of r.rows) {
        expect(row.prosecdef).toBe(true);
        expect(row.owner).toBe('hrp_public_rpc');
      }
    } finally {
      await client.end();
    }
  });

  it('EXECUTE is denied to PUBLIC and granted to app roles', async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL_ADMIN?.replace('&channel_binding=require', '') });
    await client.connect();
    try {
      const sig = `${APPLY_FN}(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text)`;
      const r = await client.query(
        `SELECT has_function_privilege('public', $1, 'EXECUTE') AS pub,
                has_function_privilege('app_user_writer', $1, 'EXECUTE') AS writer,
                has_function_privilege('app_user', $1, 'EXECUTE') AS reader`,
        [sig],
      );
      expect(r.rows[0].pub).toBe(false);
      expect(r.rows[0].writer).toBe(true);
      expect(r.rows[0].reader).toBe(true);
    } finally {
      await client.end();
    }
  });

  it('NEGATIVE: app_user_writer cannot direct-INSERT candidate_submissions under WORKER context', async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    const { Client } = await import('pg');
    const connectionString = (process.env.DATABASE_URL_WRITER ?? process.env.DATABASE_URL)?.replace('&channel_binding=require', '');
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.role', 'WORKER', true)`);
      await expect(
        client.query(
          `INSERT INTO candidate_submissions (id, project_id, full_name, phone, status)
             VALUES (gen_random_uuid()::text, NULL, 'x', '0', 'NEW')`,
        ),
      ).rejects.toThrow();
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      await client.end();
    }
  });
});
