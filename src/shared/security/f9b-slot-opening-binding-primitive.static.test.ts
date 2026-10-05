/**
 * hrp-f9b-jobposting-write-boundary-hardening — static guard test.
 *
 * Parses the corrective migration file (src/shared/security/f9b-rls-static-guards.ts)
 * and asserts posture:
 *
 *   - `hrp_f9_slots_staff_update` is dropped.
 *   - The new SECURITY DEFINER primitive `hrp_f9b_bind_slot_to_opening`
 *     exists, with `SET search_path = pg_catalog, public`.
 *   - PUBLIC EXECUTE is revoked; only `app_user_writer` + `app_user` are
 *     granted EXECUTE.
 *   - `hrp_f9_openings_staff_insert` is hardened with the cross-order
 *     sub-select clause.
 *   - No new `_delete` policy is introduced.
 *   - No broad `staffing_orders_*` write relaxation is introduced.
 *
 * The live-posture check (psql / pg_policies / pg_proc) lives in the
 * synthetic DB integration suite
 * `tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` and
 * runs on the F9-T0-authorized `ep-empty-forest-azlhfyo9-*` synthetic
 * Neon pair. The static guard runs without a DB connection.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertCorrectiveMigrationApplied,
  assertRound2MigrationApplied,
  parseCorrectiveMigrationPosture,
  parseRound2MigrationPosture,
  F9B_MIGRATION_PATHS,
} from './f9b-rls-static-guards';

describe('f9b-slot-opening-binding-primitive: static posture', () => {
  const repoRoot = process.cwd();

  it('corrective migration file exists at the canonical F9-B path', () => {
    const migrationPath = join(repoRoot, F9B_MIGRATION_PATHS.corrective);
    expect(() => readFileSync(migrationPath, 'utf8')).not.toThrow();
  });

  it('drops the broad hrp_f9_slots_staff_update policy on staffing_order_slots', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.broadSlotUpdatePolicyDropped).toBe(true);
  });

  it('creates the SECURITY DEFINER primitive hrp_f9b_bind_slot_to_opening', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.bindingPrimitiveExists).toBe(true);
  });

  it('pins search_path = pg_catalog, public inside the primitive body', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.searchPathPinned).toBe(true);
  });

  it('revokes PUBLIC EXECUTE on the new primitive', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.publicExecuteRevoked).toBe(true);
  });

  it('grants EXECUTE only to app_user_writer + app_user', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.onlyWriterRolesGranted).toBe(true);
  });

  it('hardens hrp_f9_openings_staff_insert with the cross-order sub-select', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.openingsInsertCrossOrderHardened).toBe(true);
  });

  it('does not introduce a new hrp_f9b_*_delete policy', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.noDeletePolicyIntroduced).toBe(true);
  });

  it('does not introduce a broad staffing_orders_* write relaxation', () => {
    const posture = assertCorrectiveMigrationApplied({ repoRoot });
    expect(posture.noStaffingOrderBroadWrite).toBe(true);
  });

  it('parses the migration text and exposes the migration filename for evidence', () => {
    const migrationPath = join(repoRoot, F9B_MIGRATION_PATHS.corrective);
    const text = readFileSync(migrationPath, 'utf8');
    const posture = parseCorrectiveMigrationPosture(text);
    expect(posture.rawMigrationPath).toBe(F9B_MIGRATION_PATHS.corrective);
    expect(posture.rawF9Migration1Path).toBe(F9B_MIGRATION_PATHS.f9WriteRls);
    expect(posture.rawF9Migration2Path).toBe(F9B_MIGRATION_PATHS.f9InsertRls);
  });
});

describe('f9b-r2-slot-scope-read-restore: static posture', () => {
  const repoRoot = process.cwd();

  it('round-2 corrective migration file exists at the canonical F9-B R2 path', () => {
    const migrationPath = join(repoRoot, F9B_MIGRATION_PATHS.round2);
    expect(() => readFileSync(migrationPath, 'utf8')).not.toThrow();
  });

  it('drops the over-restrictive hrp_f9b_slots_manager_select policy on staffing_order_slots', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.overRestrictiveSelectPolicyDropped).toBe(true);
  });

  it('creates the canonical FOR SELECT policy hrp_f9b_slots_project_select', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.canonicalSelectPolicyCreated).toBe(true);
  });

  it('uses the canonical hrp_project_visible_for(so.project_id) predicate in the new SELECT policy', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.canonicalSelectPolicyUsesHrProjectVisibleFor).toBe(true);
  });

  it('does not redefine the round-1 SECURITY DEFINER primitive (preserved by omission)', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.round1PrimitivePosturePreserved).toBe(true);
  });

  it('does not redefine or drop the round-1 hardening of hrp_f9_openings_staff_insert', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.round1OpeningsInsertHardeningPreserved).toBe(true);
  });

  it('does not redefine or drop the round-1 manager INSERT policy', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.round1ManagerInsertPreserved).toBe(true);
  });

  it('does not redefine or drop the round-1 manager UPDATE policy', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.round1ManagerUpdatePreserved).toBe(true);
  });

  it('does not introduce a new HR_STAFF DELETE policy on staffing_order_slots', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.noDeletePolicyIntroduced).toBe(true);
  });

  it('does not introduce a broad staffing_orders_* write relaxation', () => {
    const posture = assertRound2MigrationApplied({ repoRoot });
    expect(posture.noBroadStaffingOrderWriteRelaxation).toBe(true);
  });

  it('parses the round-2 migration text and exposes the migration filename for evidence', () => {
    const migrationPath = join(repoRoot, F9B_MIGRATION_PATHS.round2);
    const text = readFileSync(migrationPath, 'utf8');
    const posture = parseRound2MigrationPosture(text);
    expect(posture.rawMigrationPath).toBe(F9B_MIGRATION_PATHS.round2);
    expect(posture.rawF9bRound1MigrationPath).toBe(F9B_MIGRATION_PATHS.corrective);
    expect(posture.rawF9Migration1Path).toBe(F9B_MIGRATION_PATHS.f9WriteRls);
    expect(posture.rawF9Migration2Path).toBe(F9B_MIGRATION_PATHS.f9InsertRls);
  });
});