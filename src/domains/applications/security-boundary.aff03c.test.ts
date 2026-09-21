import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION = join(
  process.cwd(),
  'prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/migration.sql',
);

const sql = readFileSync(MIGRATION, 'utf8');
const code = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');

describe('AFF-03C candidate-submission profile link — static migration guard', () => {
  it('replaces the existing function as its owner and closes SET/INHERIT capability', () => {
    const grantMembership = code.indexOf(
      "GRANT hrp_public_rpc TO %I WITH SET TRUE",
    );
    const setRole = code.indexOf('SET ROLE hrp_public_rpc');
    const replaceFunction = code.indexOf(
      'CREATE OR REPLACE FUNCTION hrp_public_intake_submission',
    );
    const resetRole = code.indexOf('RESET ROLE');
    const revokeMembership = code.indexOf(
      'REVOKE hrp_public_rpc FROM %I',
    );

    expect(grantMembership).toBeGreaterThanOrEqual(0);
    expect(setRole).toBeGreaterThan(grantMembership);
    expect(replaceFunction).toBeGreaterThan(setRole);
    expect(resetRole).toBeGreaterThan(replaceFunction);
    expect(revokeMembership).toBeGreaterThan(resetRole);
    expect(code).toContain('am.set_option OR am.inherit_option');
    expect(code).toContain('AFF-03C privilege cleanup failed');
  });

  it('preserves the SECURITY DEFINER boundary and pinned search_path', () => {
    const block = code.match(
      /CREATE OR REPLACE FUNCTION hrp_public_intake_submission[\s\S]+?\$fn\$;/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toContain('SECURITY DEFINER');
    expect(block![0]).toContain('SET search_path = public, pg_temp');
    expect(code).toMatch(
      /REVOKE ALL ON FUNCTION hrp_public_intake_submission\(jsonb\) FROM PUBLIC/,
    );
    expect(code).toMatch(
      /GRANT EXECUTE ON FUNCTION hrp_public_intake_submission\(jsonb\) TO app_user_writer, app_user/,
    );
  });

  it('writes both canonical links on every new candidate submission', () => {
    const insert = code.match(
      /INSERT INTO candidate_submissions\s*\([\s\S]+?\)\s*VALUES\s*\([\s\S]+?\)\s*RETURNING id INTO v_cs_id;/,
    );
    expect(insert).not.toBeNull();
    expect(insert![0]).toMatch(
      /placement_case_id\s*,\s*labor_profile_id/,
    );
    expect(insert![0]).toMatch(/v_pc_id\s*,\s*v_lp_id/);
  });

  it('backfills only linked cases whose direct labor-profile link is missing', () => {
    expect(code).toMatch(
      /UPDATE candidate_submissions cs\s+SET labor_profile_id = pc\.labor_profile_id\s+FROM placement_case pc/,
    );
    expect(code).toMatch(/cs\.placement_case_id = pc\.id/);
    expect(code).toMatch(/cs\.labor_profile_id IS NULL/);
    expect(code).toMatch(/pc\.labor_profile_id IS NOT NULL/);
    expect(code).toMatch(/AFF-03C backfill incomplete/);
  });

  it('does not create or alter roles and restores the migration administrator before backfill', () => {
    expect(code).not.toMatch(/CREATE\s+ROLE/i);
    expect(code).not.toMatch(/ALTER\s+ROLE/i);

    const resetRole = code.indexOf('RESET ROLE');
    const backfill = code.indexOf('UPDATE candidate_submissions cs');
    expect(resetRole).toBeGreaterThanOrEqual(0);
    expect(backfill).toBeGreaterThan(resetRole);
  });
});
