/**
 * Static SQL gate for N1 PlacementCase foundation.
 *
 * RQ-08: assert migration SQL files contain:
 *   (i)   CREATE TABLE placement_case with all required columns
 *         (id PK, labor_profile_id NOT NULL, status PlacementCaseStatus enum,
 *          opened_at, closed_at nullable, close_reason TEXT nullable,
 *          created_at, updated_at);
 *   (ii)  CREATE UNIQUE INDEX placement_case_labor_profile_id_active_unique
 *         with WHERE clause restricting to 3 ACTIVE_STATUSES (OPEN, IN_PROGRESS, READY_TO_PLACE);
 *   (iii) FK constraint ON DELETE RESTRICT (DEC-N1-03 override of Prisma default SET NULL);
 *   (iv)  RLS file enables ROW LEVEL SECURITY + >=1 policy HR_MANAGER + >=1 HR_STAFF + >=1 ADMIN.
 *
 * LIMITATION (ghi rõ trong TASK.md AC-07):
 *   This is a STATIC SQL parse — it does NOT prove runtime concurrency of PostgreSQL
 *   (race between 2 transactions SELECT-then-INSERT). True concurrency proof needs
 *   integration test on a real DB with 2 transactions in parallel; Tier 0/Owner decides.
 *   The static gate is sufficient for unit lane (no DB connection).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const MIGRATION_DIR = path.join(REPO_ROOT, 'prisma/migrations');
const FOUNDATION_SLUG = 'n1_placement_case_foundation';
const RLS_SLUG = 'n1_placement_case_rls';

function findMigrationFile(slug: string): { dir: string; sql: string } {
  const entries = fs
    .readdirSync(MIGRATION_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.includes(slug))
    .map((e) => e.name);
  if (entries.length === 0) {
    throw new Error(`No migration directory found with slug "${slug}" under prisma/migrations.`);
  }
  if (entries.length > 1) {
    throw new Error(`Ambiguous: multiple migration directories found with slug "${slug}": ${entries.join(', ')}`);
  }
  const dir = path.join(MIGRATION_DIR, entries[0]);
  const sql = fs.readFileSync(path.join(dir, 'migration.sql'), 'utf8');
  return { dir, sql };
}

describe('N1 PlacementCase foundation — static SQL gate (RQ-08)', () => {
  const foundation = findMigrationFile(FOUNDATION_SLUG);
  const rls = findMigrationFile(RLS_SLUG);

  describe('CREATE TABLE placement_case (RQ-01, RQ-02)', () => {
    it('declares placement_case table', () => {
      expect(foundation.sql).toMatch(/CREATE TABLE\s+"placement_case"\s*\(/i);
    });

    it('has id PRIMARY KEY column', () => {
      expect(foundation.sql).toMatch(/"id"\s+TEXT\s+NOT\s+NULL/i);
      expect(foundation.sql).toMatch(/CONSTRAINT\s+"placement_case_pkey"\s+PRIMARY KEY\s*\("id"\)/i);
    });

    it('has labor_profile_id NOT NULL FK', () => {
      expect(foundation.sql).toMatch(/"labor_profile_id"\s+TEXT\s+NOT\s+NULL/i);
    });

    it('has status PlacementCaseStatus enum NOT NULL DEFAULT OPEN', () => {
      expect(foundation.sql).toMatch(/CREATE TYPE\s+"PlacementCaseStatus"\s+AS\s+ENUM/i);
      expect(foundation.sql).toMatch(/'OPEN'/);
      expect(foundation.sql).toMatch(/'IN_PROGRESS'/);
      expect(foundation.sql).toMatch(/'READY_TO_PLACE'/);
      expect(foundation.sql).toMatch(/'CLOSED'/);
      expect(foundation.sql).toMatch(/"status"\s+"PlacementCaseStatus"\s+NOT\s+NULL\s+DEFAULT\s+'OPEN'/i);
    });

    it('has opened_at, closed_at, close_reason (DEC-N1-05 nullable close_reason)', () => {
      expect(foundation.sql).toMatch(/"opened_at"\s+TIMESTAMP\(3\)\s+NOT\s+NULL/i);
      expect(foundation.sql).toMatch(/"closed_at"\s+TIMESTAMP\(3\)/i);
      // close_reason must be nullable TEXT (DEC-N1-05)
      expect(foundation.sql).toMatch(/"close_reason"\s+TEXT\s*,/i);
    });

    it('has created_at and updated_at timestamps', () => {
      expect(foundation.sql).toMatch(/"created_at"\s+TIMESTAMP\(3\)\s+NOT\s+NULL/i);
      expect(foundation.sql).toMatch(/"updated_at"\s+TIMESTAMP\(3\)\s+NOT\s+NULL/i);
    });
  });

  describe('Partial unique index (RQ-03, DEC-N1-02)', () => {
    it('declares CREATE UNIQUE INDEX placement_case_labor_profile_id_active_unique', () => {
      expect(foundation.sql).toMatch(
        /CREATE\s+UNIQUE\s+INDEX\s+"placement_case_labor_profile_id_active_unique"/i,
      );
    });

    it('index targets labor_profile_id column', () => {
      expect(foundation.sql).toMatch(
        /CREATE\s+UNIQUE\s+INDEX\s+"placement_case_labor_profile_id_active_unique"\s+ON\s+"placement_case"\s*\(\s*"labor_profile_id"\s*\)/i,
      );
    });

    it('WHERE clause restricts to 3 ACTIVE_STATUSES (DEC-N1-02)', () => {
      // The WHERE must contain exactly OPEN, IN_PROGRESS, READY_TO_PLACE — and CLOSED must NOT be in the active set.
      const idx = foundation.sql.indexOf('placement_case_labor_profile_id_active_unique');
      expect(idx).toBeGreaterThan(-1);
      // grab the partial index SQL block (from CREATE UNIQUE INDEX line up to the next standalone semicolon)
      const tail = foundation.sql.slice(idx);
      const semi = tail.indexOf(';');
      const block = tail.slice(0, semi + 1);
      expect(block).toMatch(/WHERE\s+"status"\s+IN\s*\(\s*'OPEN'\s*,\s*'IN_PROGRESS'\s*,\s*'READY_TO_PLACE'\s*\)/i);
      expect(block).not.toMatch(/'CLOSED'/);
    });
  });

  describe('FK constraints (RQ-04, RQ-05, DEC-N1-03, DEC-N1-04)', () => {
    it('FK placement_case.labor_profile_id -> labor_profiles.id ON DELETE RESTRICT (DEC-N1-04)', () => {
      // The FK from placement_case to labor_profiles must be RESTRICT (cannot delete LaborProfile while active cases exist)
      expect(foundation.sql).toMatch(
        /ALTER\s+TABLE\s+"placement_case"\s+ADD\s+CONSTRAINT\s+"placement_case_labor_profile_id_fkey"\s+FOREIGN\s+KEY\s*\(\s*"labor_profile_id"\s*\)\s+REFERENCES\s+"labor_profiles"\s*\(\s*"id"\s*\)/i,
      );
      expect(foundation.sql).toMatch(/ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+CASCADE/i);
    });

    it('FK candidate_submissions.placement_case_id -> placement_case.id ON DELETE RESTRICT (DEC-N1-03)', () => {
      // DEC-N1-03 explicitly rejects SET NULL — must be RESTRICT.
      // The constraint MUST NOT use ON DELETE SET NULL for the submission FK.
      expect(foundation.sql).toMatch(
        /ALTER\s+TABLE\s+"candidate_submissions"\s+ADD\s+CONSTRAINT\s+"candidate_submissions_placement_case_id_fkey"\s+FOREIGN\s+KEY\s*\(\s*"placement_case_id"\s*\)\s+REFERENCES\s+"placement_case"\s*\(\s*"id"\s*\)/i,
      );
      // Must have at least one RESTRICT for the submission FK
      expect(foundation.sql).toMatch(
        /candidate_submissions_placement_case_id_fkey[\s\S]*?ON\s+DELETE\s+RESTRICT/i,
      );
      // Must NOT use SET NULL on the submission FK (guard against accidental regression to default)
      expect(foundation.sql).not.toMatch(
        /candidate_submissions_placement_case_id_fkey[\s\S]*?ON\s+DELETE\s+SET\s+NULL/i,
      );
    });
  });

  describe('ADD-only migration (RQ-05, AC-04)', () => {
    it('contains no DROP TABLE / DROP COLUMN / RENAME / ALTER COLUMN TYPE', () => {
      expect(foundation.sql).not.toMatch(/\bDROP\s+TABLE\b/i);
      expect(foundation.sql).not.toMatch(/\bDROP\s+COLUMN\b/i);
      expect(foundation.sql).not.toMatch(/\bRENAME\s+(?:TO|COLUMN)\b/i);
      expect(foundation.sql).not.toMatch(/\bALTER\s+COLUMN\s+\w+\s+(?:TYPE|USING)/i);
    });

    it('contains ALTER TABLE candidate_submissions ADD COLUMN placement_case_id', () => {
      expect(foundation.sql).toMatch(
        /ALTER\s+TABLE\s+"candidate_submissions"\s+ADD\s+COLUMN\s+"placement_case_id"\s+TEXT/i,
      );
    });
  });

  describe('RLS migration (RQ-06, DEC-N1-06)', () => {
    it('ENABLE ROW LEVEL SECURITY on placement_case', () => {
      expect(rls.sql).toMatch(/ALTER\s+TABLE\s+placement_case\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    });

    it('FORCE ROW LEVEL SECURITY on placement_case (P1 pattern)', () => {
      expect(rls.sql).toMatch(/ALTER\s+TABLE\s+placement_case\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
    });

    it('policy covers HR_MANAGER, HR_STAFF, ADMIN (no public/anon)', () => {
      expect(rls.sql).toMatch(/'HR_MANAGER'/);
      expect(rls.sql).toMatch(/'HR_STAFF'/);
      expect(rls.sql).toMatch(/'ADMIN'/);
      // No PUBLIC / anon role in any policy expression
      expect(rls.sql).not.toMatch(/'PUBLIC'/i);
      expect(rls.sql).not.toMatch(/'ANON'/i);
    });

    it('forward-only: no DROP POLICY', () => {
      expect(rls.sql).not.toMatch(/\bDROP\s+POLICY\b/i);
    });
  });
});
