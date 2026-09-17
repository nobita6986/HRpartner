import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Referral Attribution Migration Static Review', () => {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const migrationFolder = '20260917000000_referral_attribution_foundation';
  const migrationPath = path.join(migrationsDir, migrationFolder, 'migration.sql');
  
  it('must exist as an additive migration', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  describe('migration content constraints', () => {
    let content: string;
    
    beforeEach(() => {
      if (fs.existsSync(migrationPath)) {
        content = fs.readFileSync(migrationPath, 'utf-8').toUpperCase();
      } else {
        content = '';
      }
    });

    it('must contain NO DROP statements', () => {
      // Allow DROP POLICY IF EXISTS etc if needed, but strict check here
      expect(content).not.toMatch(/\bDROP\b(?!.*IF EXISTS)/);
    });

    it('must contain NO ALTER TYPE statements', () => {
      expect(content).not.toMatch(/\bALTER TYPE\b/);
    });

    it('must contain NO production DSN or passwords', () => {
      expect(content).not.toMatch(/PASSWORD/);
      expect(content).not.toMatch(/POSTGRESQL:\/\//);
    });

    it('must contain NO blanket ALL TABLES / ALL SEQUENCES', () => {
      expect(content).not.toMatch(/ALL TABLES/);
      expect(content).not.toMatch(/ALL SEQUENCES/);
    });

    it('must NOT reference N2-4 / N2-5 tables', () => {
      expect(content).not.toMatch(/COMMISSION_BENEFICIARY_DECISIONS/);
      expect(content).not.toMatch(/LABOR_PROFILE_HANDLING_ASSIGNMENTS/);
      expect(content).not.toMatch(/HR_TEAM_MEMBERS/);
    });

    it('must define exact named constraints/triggers/policies', () => {
      expect(content).toMatch(/HRP_RA_SELECT/);
      expect(content).toMatch(/HRP_RA_UPDATE/);
      expect(content).toMatch(/HRP_RA_SELECT_ENGINE/);
      expect(content).toMatch(/HRP_RA_INSERT_ENGINE/);
      expect(content).toMatch(/HRP_RA_UPDATE_ENGINE/);
      expect(content).toMatch(/REFERRAL_ATTRIBUTIONS_IMMUTABLE_UPDATE_TRG/);
      expect(content).toMatch(/REFERRAL_ATTRIBUTIONS_LABOR_PROFILE_ID_WRITE_ONCE_TRG/);
      expect(content).toMatch(/REFERRAL_ATTRIBUTIONS_LIFECYCLE_TRANSITION_TRG/);
    });

    it('must have exactly one INSERT policy for app_engine_writer named hrp_ra_insert_engine', () => {
      // The original migration content has it as upper case because we do .toUpperCase()
      const insertMatches = content.match(/CREATE POLICY .* FOR INSERT TO APP_ENGINE_WRITER/g);
      expect(insertMatches).toHaveLength(1);
      expect(insertMatches?.[0]).toMatch(/HRP_RA_INSERT_ENGINE/);
    });

    it('must not use bare current_setting for hrp.engine_context without COALESCE', () => {
      const bareContextMatches = content.match(/(?<!COALESCE\(\s*)CURRENT_SETTING\('HRP\.ENGINE_CONTEXT'/g);
      expect(bareContextMatches).toBeNull();
    });
  });
});
