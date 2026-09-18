/**
 * referral-attribution-aff03-writer-policy.static.test.ts
 *
 * Static contract for the AFF-03 additive migration:
 *   20260918100000_aff03_writer_select_on_referral_attributions
 *
 * Verifies:
 *   - File exists.
 *   - Is additive (no DROP TABLE, no DROP COLUMN).
 *   - Adds exactly two CREATE POLICY statements targeting `app_user_writer`.
 *   - SELECT policy uses status IN ('ACTIVE','CONSUMED') (Tier 0 verdict).
 *   - UPDATE policy gates USING(status='ACTIVE') + WITH CHECK(status='CONSUMED'
 *     AND labor_profile_id IS NOT NULL).
 *   - Does NOT touch schema, N2-1 triggers, engine RLS, or other policies.
 *   - Does NOT contain production secrets.
 *
 * Mirrors the pattern of `referral-attribution-migration.static.test.ts`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('AFF-03 Referral Attribution writer policy migration — Static Review', () => {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const migrationFolder = '20260918100000_aff03_writer_select_on_referral_attributions';
  const migrationPath = path.join(migrationsDir, migrationFolder, 'migration.sql');

  it('must exist as an additive migration', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('migration content constraints', () => {
    let content: string;
    let upper: string;

    beforeEach(() => {
      if (fs.existsSync(migrationPath)) {
        content = fs.readFileSync(migrationPath, 'utf-8');
        upper = content.toUpperCase();
      } else {
        content = '';
        upper = '';
      }
    });

    it('must contain NO DROP TABLE / DROP COLUMN / DROP CONSTRAINT', () => {
      // DROP POLICY IF EXISTS is allowed (idempotent re-create).
      expect(upper).not.toMatch(/\bDROP\s+TABLE\b/);
      expect(upper).not.toMatch(/\bDROP\s+COLUMN\b/);
      expect(upper).not.toMatch(/\bDROP\s+CONSTRAINT\b/);
      expect(upper).not.toMatch(/\bDROP\s+SCHEMA\b/);
    });

    it('must contain NO ALTER TABLE statements', () => {
      expect(upper).not.toMatch(/\bALTER\s+TABLE\b/);
    });

    it('must contain NO production DSN or passwords', () => {
      expect(content).not.toMatch(/PASSWORD/);
      expect(content).not.toMatch(/POSTGRESQL:\/\//);
    });

    it('must NOT redefine N2-1 policies', () => {
      expect(upper).not.toMatch(/hrp_ra_select\s+ON\s+referral_attributions/);
      expect(upper).not.toMatch(/hrp_ra_update\s+ON\s+referral_attributions/);
      expect(upper).not.toMatch(/hrp_ra_select_engine\s+ON\s+referral_attributions/);
      expect(upper).not.toMatch(/hrp_ra_insert_engine\s+ON\s+referral_attributions/);
      expect(upper).not.toMatch(/hrp_ra_update_engine\s+ON\s+referral_attributions/);
    });

    it('must NOT redefine N2-1 triggers or functions', () => {
      expect(upper).not.toMatch(/referral_attributions_immutable_update/);
      expect(upper).not.toMatch(/referral_attributions_lifecycle_transition/);
      expect(upper).not.toMatch(/referral_attributions_block_delete/);
    });

    it('must NOT reference N2-4 / N2-5 / Commission tables', () => {
      expect(upper).not.toMatch(/COMMISSION_BENEFICIARY_DECISIONS/);
      expect(upper).not.toMatch(/LABOR_PROFILE_HANDLING_ASSIGNMENTS/);
      expect(upper).not.toMatch(/HR_TEAM_MEMBERS/);
    });

    it('must add exactly two CREATE POLICY statements targeting app_user_writer', () => {
      const createWriterPolicy = content.match(/CREATE\s+POLICY\s+\w+\s+ON\s+referral_attributions[\s\S]*?TO\s+app_user_writer/gi);
      expect(createWriterPolicy).not.toBeNull();
      expect(createWriterPolicy?.length).toBe(2);

      // Each must be PERMISSIVE (default; explicit for documentation).
      expect(createWriterPolicy?.[0]).toMatch(/PERMISSIVE/i);
      expect(createWriterPolicy?.[1]).toMatch(/PERMISSIVE/i);
    });

    it('SELECT policy uses status IN (\'ACTIVE\',\'CONSUMED\') per Tier 0 verdict', () => {
      // The SELECT policy is the FIRST writer-targeting CREATE POLICY.
      const selectPolicy = content.match(/CREATE\s+POLICY\s+\w+\s+ON\s+referral_attributions[\s\S]*?FOR\s+SELECT\s+TO\s+app_user_writer[\s\S]*?;/i);
      expect(selectPolicy).not.toBeNull();
      expect(selectPolicy?.[0]).toMatch(/status\s+IN\s*\(\s*'ACTIVE'\s*,\s*'CONSUMED'\s*\)/i);
      // Tier 0 explicitly forbade 'NEW'/'CONVERTED' (CandidateSubmission statuses).
      expect(selectPolicy?.[0]).not.toMatch(/'NEW'/);
      expect(selectPolicy?.[0]).not.toMatch(/'CONVERTED'/);
    });

    it('UPDATE policy gates USING(status=\'ACTIVE\') and WITH CHECK(status=\'CONSUMED\' AND labor_profile_id IS NOT NULL)', () => {
      const updatePolicy = content.match(/CREATE\s+POLICY\s+\w+\s+ON\s+referral_attributions[\s\S]*?FOR\s+UPDATE\s+TO\s+app_user_writer[\s\S]*?;/i);
      expect(updatePolicy).not.toBeNull();
      const body = updatePolicy?.[0] ?? '';
      expect(body).toMatch(/USING\s*\(/i);
      expect(body).toMatch(/status\s*=\s*'ACTIVE'/i);
      expect(body).toMatch(/WITH\s+CHECK\s*\(/i);
      expect(body).toMatch(/status\s*=\s*'CONSUMED'/i);
      expect(body).toMatch(/labor_profile_id\s+IS\s+NOT\s+NULL/i);
    });

    it('must be idempotent: DROP POLICY IF EXISTS for both new policies before CREATE', () => {
      expect(content).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+hrp_ra_select_writer\s+ON\s+referral_attributions/i);
      expect(content).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+hrp_ra_update_writer\s+ON\s+referral_attributions/i);
      // Both DROP statements must precede the matching CREATE.
      const dropSelectIdx = content.toUpperCase().indexOf('DROP POLICY IF EXISTS HRP_RA_SELECT_WRITER');
      const createSelectIdx = content.toUpperCase().indexOf('CREATE POLICY HRP_RA_SELECT_WRITER');
      const dropUpdateIdx = content.toUpperCase().indexOf('DROP POLICY IF EXISTS HRP_RA_UPDATE_WRITER');
      const createUpdateIdx = content.toUpperCase().indexOf('CREATE POLICY HRP_RA_UPDATE_WRITER');
      expect(dropSelectIdx).toBeGreaterThanOrEqual(0);
      expect(createSelectIdx).toBeGreaterThanOrEqual(0);
      expect(dropSelectIdx).toBeLessThan(createSelectIdx);
      expect(dropUpdateIdx).toBeGreaterThanOrEqual(0);
      expect(createUpdateIdx).toBeGreaterThanOrEqual(0);
      expect(dropUpdateIdx).toBeLessThan(createUpdateIdx);
    });
  });
});
