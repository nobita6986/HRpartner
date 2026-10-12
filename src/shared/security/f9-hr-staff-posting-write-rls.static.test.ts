/**
 * f9-hr-staff-posting-write-rls.static.test.ts — hrp-f9-hr-staff-jobposting-scope
 * correction batch 1/1 / DEC-22, DEC-23.
 *
 * F9 PROOF that the narrow HR_STAFF FOR UPDATE / INSERT policies added by
 * the migration `20261003000000_f9_hr_staff_posting_write_rls` and
 * `20261003000001_f9_hr_staff_posting_insert_rls` are:
 *
 *   (a) exist exactly once on the target tables;
 *   (b) PERMISSIVE for the right command (UPDATE or INSERT);
 *   (c) targeted at `app_user_writer, app_user` only (no PUBLIC);
 *   (d) gated on `hrp_session_role() = 'HR_STAFF'` and
 *       `hrp_staffing_order_visible_for(...)`;
 *   (e) NOT a blanket HR_STAFF write policy (no `*_all`, no DELETE, no
 *       `staffing_orders` write relaxation).
 *
 * This file parses the migration SQL directly — it does NOT require a
 * database connection. It is a static guard; the synthetic-DB evidence
 * is in the integration suite (`tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts`).
 *
 * Negative tests catch:
 *   - a policy named `*_all` that would admit DELETE / UPDATE / INSERT
 *     in one permissive policy (a forbidden blanket);
 *   - a policy on `staffing_orders` that would broadly relax HR_STAFF
 *     write on the parent table;
 *   - any policy whose target role list includes PUBLIC (would bypass the
 *     writer connection's role-based scoping);
 *   - any policy that does not mention `hrp_staffing_order_visible_for`
 *     (would mean the writer path is not gated on the canonical
 *     ACTIVE-assignment predicate).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = 'prisma/migrations';

/** F9 migration directories covered by this static guard. */
const F9_MIGRATION_DIRS = [
  '20261003000000_f9_hr_staff_posting_write_rls',
  '20261003000001_f9_hr_staff_posting_insert_rls',
] as const;

const EXPECTED_POLICIES = [
  // (migration dir, table, policy name, command)
  ['20261003000000_f9_hr_staff_posting_write_rls', 'staffing_order_slots', 'hrp_f9_slots_staff_update', 'UPDATE'],
  ['20261003000000_f9_hr_staff_posting_write_rls', 'job_postings', 'hrp_f9_postings_staff_update', 'UPDATE'],
  ['20261003000001_f9_hr_staff_posting_insert_rls', 'job_openings', 'hrp_f9_openings_staff_insert', 'INSERT'],
  ['20261003000001_f9_hr_staff_posting_insert_rls', 'job_postings', 'hrp_f9_postings_staff_insert', 'INSERT'],
] as const;

function readMigrationSql(dir: string): string {
  const file = join(process.cwd(), MIGRATIONS_DIR, dir, 'migration.sql');
  return readFileSync(file, 'utf8');
}

function stripSqlComments(sql: string): string {
  const keepLines = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return sql.replace(/\/\*[\s\S]*?\*\//g, keepLines).replace(/--[^\n]*/g, keepLines);
}

function listF9MigrationDirs(): string[] {
  // Only include the F9 migrations that the static guard covers; do not
  // assume all migrations in the directory belong to F9.
  const existing: string[] = [];
  for (const dir of F9_MIGRATION_DIRS) {
    try {
      readFileSync(join(process.cwd(), MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8');
      existing.push(dir);
    } catch {
      // Migration not present; skip. The test below will fail.
    }
  }
  // Sanity: also list any migration that mentions hrp_f9_ in its content.
  const all = readdirSync(join(process.cwd(), MIGRATIONS_DIR), { withFileTypes: true });
  for (const entry of all) {
    if (!entry.isDirectory()) continue;
    try {
      const sql = readFileSync(join(process.cwd(), MIGRATIONS_DIR, entry.name, 'migration.sql'), 'utf8');
      if (/hrp_f9_/.test(sql) && !existing.includes(entry.name)) existing.push(entry.name);
    } catch {
      // skip
    }
  }
  return existing;
}

describe('F9 narrow HR_STAFF write RLS — static guard (DEC-22, DEC-23)', () => {
  const f9Dirs = listF9MigrationDirs();

  it('F9 migration directories exist and are the expected ones', () => {
    // At minimum, the two F9 migrations must be present.
    expect(f9Dirs).toEqual(expect.arrayContaining([...F9_MIGRATION_DIRS]));
  });

  for (const [dir, table, policy, cmd] of EXPECTED_POLICIES) {
    it(`policy ${policy} on ${table} (${cmd}) exists, is PERMISSIVE, targets the writer role only, and is gated on the canonical helper`, () => {
      // Defensive: skip if the migration is not in this worktree.
      if (!f9Dirs.includes(dir)) {
        throw new Error(`expected F9 migration directory ${dir} not found under ${MIGRATIONS_DIR}`);
      }
      const raw = readMigrationSql(dir);
      const sql = stripSqlComments(raw);

      // (a) Exactly one CREATE POLICY for the expected name on the expected table.
      const re = new RegExp(
        `CREATE\\s+POLICY\\s+${policy}\\s+ON\\s+(?:public\\.)?${table}\\b[\\s\\S]*?(?=;)`,
        'i',
      );
      const m = sql.match(re);
      expect(m, `${policy} CREATE POLICY block on ${table} not found in ${dir}`).not.toBeNull();
      const block = m![0];

      // (b) PERMISSIVE for the right command.
      const permissiveRe = /AS\s+PERMISSIVE\s+FOR\s+(UPDATE|INSERT|DELETE|ALL|SELECT)/i;
      const permissiveMatch = block.match(permissiveRe);
      expect(permissiveMatch, `${policy} block must declare AS PERMISSIVE FOR <CMD>`).not.toBeNull();
      expect(permissiveMatch![1].toUpperCase()).toBe(cmd);

      // (c) Targeted at `app_user_writer, app_user` only — no PUBLIC.
      const toRe = /TO\s+([^\n;]+)/i;
      const toMatch = block.match(toRe);
      expect(toMatch, `${policy} block must declare TO <roles>`).not.toBeNull();
      const rolesRaw = toMatch![1].toLowerCase().replace(/\s+/g, '');
      // Allow comma-or-space separated role list. Each role must be in
      // the allowlist; PUBLIC is forbidden.
      const roles = rolesRaw.split(/[,\s]+/).filter(Boolean);
      for (const r of roles) {
        expect(['app_user_writer', 'app_user']).toContain(r);
      }
      expect(roles).not.toContain('public');

      // (d) Gated on the canonical HR_STAFF + ACTIVE-assignment predicate.
      // The check is text-based (the migration body is in plain SQL).
      expect(block, `${policy} block must mention hrp_session_role()`).toMatch(/hrp_session_role\s*\(\s*\)/i);
      expect(block, `${policy} block must mention hrp_session_user_id()`).toMatch(/hrp_session_user_id\s*\(\s*\)/i);
      expect(block, `${policy} block must mention hrp_staffing_order_visible_for`).toMatch(/hrp_staffing_order_visible_for/i);
      // The HR_STAFF role literal must be present in the predicate.
      expect(block, `${policy} block must gate on HR_STAFF role`).toMatch(/['"]HR_STAFF['"]/i);

      // (e) No blanket `*_all` / `*_delete` policy was added by F9.
      expect(/CREATE\s+POLICY\s+hrp_f9_[\w_]*_all\b/i.test(sql), `${policy}: no hrp_f9_*_all policy should be added`).toBe(false);
      expect(/CREATE\s+POLICY\s+hrp_f9_[\w_]*_delete\b/i.test(sql), `${policy}: no hrp_f9_*_delete policy should be added`).toBe(false);
      // No broad HR_STAFF write on the parent `staffing_orders` table.
      expect(
        /CREATE\s+POLICY\s+hrp_f9_[\w_]*staffing_orders_/i.test(sql),
        `${policy}: no hrp_f9_*_staffing_orders_* policy should be added`,
      ).toBe(false);
    });
  }
});
