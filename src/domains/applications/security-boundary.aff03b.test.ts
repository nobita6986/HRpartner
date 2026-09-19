/**
 * security-boundary.aff03b.test.ts — STATIC layer for the AFF-03B anon-write
 * RPC boundary (mirrors MP-2 pattern at security-boundary.mp2.test.ts).
 *
 * Asserts the migration authored the boundary correctly:
 *   - SEC-01 hrp_public_intake_submission is SECURITY DEFINER + pinned search_path
 *   - SEC-02 hrp_score_labor_profile is SECURITY DEFINER + pinned search_path
 *   - SEC-03 Both are owned by hrp_public_rpc
 *   - SEC-04 EXECUTE revoked from PUBLIC; granted only to app_user_writer + app_user
 *   - SEC-05 Normalizers are NOT SECURITY DEFINER (pure helpers, callers apply)
 *   - SEC-06 Migration does NOT create or alter hrp_public_rpc (DEC-09/14)
 *   - SEC-07 Minimal table privileges granted (DEC-15) for the 5 tables touched
 *   - SEC-08 Public anon route + service NEVER set app.role (no impersonation)
 *   - SEC-09 Service delegates through the definer function name
 *   - SEC-10 Token-signing-error is caught at the service entry (DEC-05)
 *
 * No DB. Reads the migration file + service file from the filesystem and
 * asserts their textual content matches the boundary contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
if (existsSync(join(ROOT, '.env'))) {
  const envFile = readFileSync(join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^\s*([^#=]+?)="?([^"]+)"?/);
    if (match) {
      const key = match[1].trim();
      if (process.env[key] === undefined) process.env[key] = match[2];
    }
  }
}

const AFF03B_MIGRATION = join(
  ROOT,
  'prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql',
);
const AFF03_MIGRATION = join(
  ROOT,
  'prisma/migrations/20260918100000_aff03_writer_select_on_referral_attributions/migration.sql',
);
const PROVISION = join(ROOT, 'scripts/create-public-rpc-role.cjs');
const PUBLIC_INTAKE_ROUTE = join(ROOT, 'app/api/public/intake/route.ts');
const AFF03B_SERVICE = join(
  ROOT,
  'src/domains/applications/aff03-public-intake.service.ts',
);

const read = (p: string) => readFileSync(p, 'utf8');

const INTAKE_FN = 'hrp_public_intake_submission';
const SCORE_FN = 'hrp_score_labor_profile';
const NORMALIZE_PHONE_FN = 'hrp_normalize_phone';
const NORMALIZE_NAME_FN = 'hrp_normalize_full_name';

describe('AFF-03B security boundary — STATIC (DEC-14/15, AC-19)', () => {
  const sql = read(AFF03B_MIGRATION);
  const sqlCode = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');

  it('SEC-01: hrp_public_intake_submission is SECURITY DEFINER with a pinned search_path', () => {
    expect(sql).toContain(`CREATE OR REPLACE FUNCTION ${INTAKE_FN}(p_payload jsonb)`);
    // The function body block must contain SECURITY DEFINER + SET search_path.
    const intakeBlock = sql.match(
      new RegExp(`CREATE OR REPLACE FUNCTION ${INTAKE_FN}[\\s\\S]+?\\$\\$;`),
    );
    expect(intakeBlock).not.toBeNull();
    expect(intakeBlock![0]).toContain('SECURITY DEFINER');
    expect(intakeBlock![0]).toContain('SET search_path = public, pg_temp');
  });

  it('SEC-02: hrp_score_labor_profile is SECURITY DEFINER with a pinned search_path', () => {
    const scoreBlock = sql.match(
      new RegExp(`CREATE OR REPLACE FUNCTION ${SCORE_FN}[\\s\\S]+?\\$\\$;`),
    );
    expect(scoreBlock).not.toBeNull();
    expect(scoreBlock![0]).toContain('SECURITY DEFINER');
    expect(scoreBlock![0]).toContain('SET search_path = public, pg_temp');
  });

  it('SEC-03: both definer functions are owned by hrp_public_rpc', () => {
    expect(sql).toMatch(
      new RegExp(`ALTER FUNCTION ${SCORE_FN}\\([^)]*\\) OWNER TO hrp_public_rpc`),
    );
    expect(sql).toMatch(
      new RegExp(`ALTER FUNCTION ${INTAKE_FN}\\([^)]*\\) OWNER TO hrp_public_rpc`),
    );
  });

  it('SEC-04: EXECUTE revoked from PUBLIC, granted only to app roles', () => {
    expect(sql).toMatch(
      new RegExp(`REVOKE ALL ON FUNCTION ${INTAKE_FN}\\([^)]*\\) FROM PUBLIC`),
    );
    expect(sql).toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION ${INTAKE_FN}\\([^)]*\\) TO app_user_writer, app_user`),
    );
    expect(sql).toMatch(
      new RegExp(`REVOKE ALL ON FUNCTION ${SCORE_FN}\\([^)]*\\) FROM PUBLIC`),
    );
    expect(sql).toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION ${SCORE_FN}\\([^)]*\\) TO app_user_writer, app_user`),
    );
  });

  it('SEC-05: normalizers are NOT SECURITY DEFINER (pure helpers)', () => {
    // The normalizers use `$fn$` as the dollar-quote tag; the definer
    // functions use `$$`. Match a bounded block starting at the function
    // signature and ending at the FIRST dollar-quote terminator.
    for (const fn of [NORMALIZE_PHONE_FN, NORMALIZE_NAME_FN]) {
      const headerRe = new RegExp(
        `CREATE OR REPLACE FUNCTION ${fn}\\([^)]*\\)[\\s\\S]+?\\$(fn|)\\$;`,
      );
      const header = sql.match(headerRe);
      expect(header).not.toBeNull();
      expect(header![0]).toContain('IMMUTABLE');
      expect(header![0]).not.toContain('SECURITY DEFINER');
    }
  });

  it('SEC-06: migration does NOT create or alter hrp_public_rpc (DEC-09/14)', () => {
    expect(sqlCode).not.toMatch(/CREATE\s+ROLE/i);
    expect(sqlCode).not.toMatch(/ALTER\s+ROLE/i);
    expect(sqlCode).not.toMatch(/BYPASSRLS/i);
  });

  it('SEC-07: minimal table privileges granted to hrp_public_rpc (DEC-15)', () => {
    // Five tables: labor_profiles (SELECT+INSERT), placement_cases (INSERT),
    // candidate_submissions (INSERT), labor_profile_handling_assignments (INSERT),
    // referral_attributions (SELECT+UPDATE).
    expect(sql).toMatch(/GRANT SELECT, INSERT ON labor_profiles TO hrp_public_rpc/);
    expect(sql).toMatch(/GRANT INSERT ON candidate_submissions TO hrp_public_rpc/);
    expect(sql).toMatch(/GRANT INSERT ON placement_cases TO hrp_public_rpc/);
    expect(sql).toMatch(/GRANT INSERT ON labor_profile_handling_assignments TO hrp_public_rpc/);
    expect(sql).toMatch(/GRANT SELECT, UPDATE ON referral_attributions TO hrp_public_rpc/);
  });

  it('SEC-08: the public anon route + service NEVER set app.role GUC', () => {
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const p of [PUBLIC_INTAKE_ROUTE, AFF03B_SERVICE]) {
      const code = stripComments(read(p));
      expect(code).not.toMatch(/set_config\s*\(\s*['"]app\.role/);
      expect(code).not.toMatch(/SET\s+app\.role/i);
      expect(code).not.toMatch(/applyRlsContext|withDbContext/);
    }
  });

  it('SEC-09: the public anon service delegates through hrp_public_intake_submission', () => {
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const code = stripComments(read(AFF03B_SERVICE));
    expect(code).toContain(INTAKE_FN);
    // The service must NOT call the old Prisma writer for the anon path
    // (DEC-01: Full RPC, writer preserved for non-anon flows only).
    expect(code).not.toContain('createCandidateSubmissionFromIntake');
    // The DTO mapRpcToDto function lives in this service.
    expect(code).toContain('mapRpcToDto');
  });

  it('SEC-10: TOKEN_SIGNING_ERROR caught at the service entry (DEC-05)', () => {
    const service = read(AFF03B_SERVICE);
    expect(service).toContain('TOKEN_SIGNING_ERROR');
    // Verify the try/catch wraps verifyAttributionToken.
    const tryBlock = service.match(/try\s*\{[\s\S]+?\}\s*catch\s*\{[\s\S]+?return null/);
    expect(tryBlock).not.toBeNull();
    expect(tryBlock![0]).toContain('verifyAttributionToken');
  });

  it('SEC-11: the pre-existing AFF-03 writer SELECT/UPDATE policies remain intact (DEC-09)', () => {
    // The original migration 20260918100000_* provides the non-anon policies.
    const aff03sql = read(AFF03_MIGRATION);
    expect(aff03sql).toContain('CREATE POLICY hrp_ra_select_writer');
    expect(aff03sql).toContain('CREATE POLICY hrp_ra_update_writer');
  });

  it('SEC-12: the provisioning script declares hrp_public_rpc as NOLOGIN BYPASSRLS', () => {
    const js = read(PROVISION);
    expect(js).toContain('hrp_public_rpc');
    expect(js).toMatch(/NOLOGIN BYPASSRLS/);
    expect(js).toMatch(/GRANT USAGE ON SCHEMA public TO/);
  });
});
