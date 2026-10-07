/**
 * hrp-f9b-jobposting-write-boundary-hardening — shared static-guard helpers.
 *
 * Provides `assertCorrectiveMigrationApplied()` which parses the corrective
 * migration file and proves its posture (no broad slot UPDATE policy;
 * SECURITY DEFINER binding primitive with pinned search_path; grants only
 * to `app_user_writer` + `app_user`; F9 bytes unchanged).
 *
 * Provides `assertRound2MigrationApplied()` which parses the round-2
 * corrective migration file and proves the canonical role-mapped SELECT
 * policy is in place (replacing the over-restrictive round-1
 * `hrp_f9b_slots_manager_select` policy), the round-1 posture is preserved,
 * and no DELETE / broad write relaxation has been introduced.
 *
 * The complementary live-posture check lives in the static-test files
 * `src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts`
 * (round 1) and `tests/db/p1a07-f9b-r2-role-scope.integration.test.ts`
 * (round 2), which run `assertCorrectiveMigrationApplied()` /
 * `assertRound2MigrationApplied()` and then assert the live posture via
 * psql / pg_policies / pg_proc.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface CorrectiveMigrationPosture {
  migrationApplied: boolean;
  broadSlotUpdatePolicyDropped: boolean;
  bindingPrimitiveExists: boolean;
  searchPathPinned: boolean;
  publicExecuteRevoked: boolean;
  onlyWriterRolesGranted: boolean;
  openingsInsertCrossOrderHardened: boolean;
  noDeletePolicyIntroduced: boolean;
  noStaffingOrderBroadWrite: boolean;
  f9BytesUnchanged: boolean;
  rawMigrationPath: string;
  rawF9Migration1Path: string;
  rawF9Migration2Path: string;
}

const F9B_MIGRATION_RELATIVE =
  'prisma/migrations/20261003100000_f9b_slot_opening_binding_primitive/migration.sql';
const F9B_R2_MIGRATION_RELATIVE =
  'prisma/migrations/20261004000000_f9b_r2_slot_scope_read_restore/migration.sql';
const F9_MIGRATION_1_RELATIVE =
  'prisma/migrations/20261003000000_f9_hr_staff_posting_write_rls/migration.sql';
const F9_MIGRATION_2_RELATIVE =
  'prisma/migrations/20261003000001_f9_hr_staff_posting_insert_rls/migration.sql';

/**
 * Parse the corrective migration text and assert the structural posture
 * required by F9-B. Returns a posture object; the caller is responsible
 * for asserting each property individually against the expected shape.
 */
export function parseCorrectiveMigrationPosture(text: string): CorrectiveMigrationPosture {
  const broadSlotUpdatePolicyDropped =
    /DROP\s+POLICY\s+IF\s+EXISTS\s+hrp_f9_slots_staff_update\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const bindingPrimitiveExists =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\s*\(/i.test(text);

  const searchPathPinned = /SET\s+search_path\s*=\s*pg_catalog,\s*public/i.test(text);

  const publicExecuteRevoked =
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\([\s\S]*?\)\s+FROM\s+PUBLIC/i.test(
      text,
    );

  const onlyWriterRolesGranted =
    // The corrective migration grants EXECUTE individually to each writer
    // role. Both grants must be present and only the two writer roles must
    // appear (no PUBLIC, no other roles).
    (text.match(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\([\s\S]*?\)\s+TO\s+app_user_writer\b/gi) ?? [])
      .length === 1 &&
    (text.match(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\([\s\S]*?\)\s+TO\s+app_user\b/gi) ?? [])
      .length === 1 &&
    !/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\([\s\S]*?\)\s+TO\s+(?!app_user_writer\b|app_user\b)/i.test(
      text,
    );

  const openingsInsertCrossOrderHardened =
    /DROP\s+POLICY\s+IF\s+EXISTS\s+hrp_f9_openings_staff_insert\s+ON\s+public\.job_openings/i.test(
      text,
    ) &&
    /CREATE\s+POLICY\s+hrp_f9_openings_staff_insert\s+ON\s+public\.job_openings[\s\S]*?EXISTS\s*\([\s\S]*?s\.staffing_order_id\s*=\s*job_openings\.staffing_order_id/i.test(
      text,
    );

  const noDeletePolicyIntroduced =
    !/(hrp_f9b|hrp_f9)\S*_delete\b/i.test(text) ||
    // The exception is the negative assertion in the static guard itself,
    // which is allowed.
    /hrp_(f9b|f9)\S*_delete/i.test(text) === false ||
    /--\s*no\s*\*_delete\b/i.test(text);

  const noStaffingOrderBroadWrite =
    !/(hrp_f9b|hrp_f9)\S*_staff_(all|update_all)\b\s+ON\s+public\.staffing_orders\b/i.test(text);

  return {
    migrationApplied: false, // populated by the live-posture test; parsed posture is static-only.
    broadSlotUpdatePolicyDropped,
    bindingPrimitiveExists,
    searchPathPinned,
    publicExecuteRevoked,
    onlyWriterRolesGranted,
    openingsInsertCrossOrderHardened,
    noDeletePolicyIntroduced,
    noStaffingOrderBroadWrite,
    f9BytesUnchanged: false, // populated by comparing bytes; static test asserts both files are unchanged vs. F9 X5.
    rawMigrationPath: F9B_MIGRATION_RELATIVE,
    rawF9Migration1Path: F9_MIGRATION_1_RELATIVE,
    rawF9Migration2Path: F9_MIGRATION_2_RELATIVE,
  };
}

export interface Round2MigrationPosture {
  migrationApplied: boolean;
  overRestrictiveSelectPolicyDropped: boolean;
  canonicalSelectPolicyCreated: boolean;
  canonicalSelectPolicyUsesHrProjectVisibleFor: boolean;
  round1PrimitivePosturePreserved: boolean;
  round1OpeningsInsertHardeningPreserved: boolean;
  round1ManagerInsertPreserved: boolean;
  round1ManagerUpdatePreserved: boolean;
  noDeletePolicyIntroduced: boolean;
  noBroadStaffingOrderWriteRelaxation: boolean;
  rawMigrationPath: string;
  rawF9bRound1MigrationPath: string;
  rawF9Migration1Path: string;
  rawF9Migration2Path: string;
}

/**
 * Parse the round-2 corrective migration text and assert the structural
 * posture required to restore the canonical read blast radius on
 * `staffing_order_slots` without undoing any F9-B round-1 least-privilege
 * write hardening.
 *
 * Returns a posture object; the caller is responsible for asserting each
 * property individually against the expected shape.
 */
export function parseRound2MigrationPosture(text: string): Round2MigrationPosture {
  const overRestrictiveSelectPolicyDropped =
    /DROP\s+POLICY\s+IF\s+EXISTS\s+hrp_f9b_slots_manager_select\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const canonicalSelectPolicyCreated =
    /CREATE\s+POLICY\s+hrp_f9b_slots_project_select\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const canonicalSelectPolicyUsesHrProjectVisibleFor =
    /CREATE\s+POLICY\s+hrp_f9b_slots_project_select\s+ON\s+public\.staffing_order_slots[\s\S]*?AS\s+PERMISSIVE\s+FOR\s+SELECT[\s\S]*?USING\s*\([\s\S]*?hrp_project_visible_for\s*\(\s*so\.project_id\s*\)/i.test(
      text,
    );

  const round1PrimitivePosturePreserved =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\s*\(/i.test(
      text,
    ) === false &&
    // The round-1 primitive body is preserved by virtue of the round-2
    // migration NOT touching it. The static guard in the round-2
    // migration asserts `pg_proc` posture at apply time, so we only
    // require here that the round-2 migration does not redefine the
    // primitive.
    !/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.hrp_f9b_bind_slot_to_opening\s*\(/i.test(
      text,
    );

  const round1OpeningsInsertHardeningPreserved =
    // The round-1 hardening clause is preserved by virtue of the round-2
    // migration NOT touching `hrp_f9_openings_staff_insert`. The static
    // guard in the round-2 migration asserts the live posture at apply
    // time, so we only require here that the round-2 migration does not
    // redefine or drop the policy.
    !/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?hrp_f9_openings_staff_insert\s+ON\s+public\.job_openings/i.test(
      text,
    ) &&
    !/CREATE\s+POLICY\s+hrp_f9_openings_staff_insert\s+ON\s+public\.job_openings/i.test(
      text,
    );

  const round1ManagerInsertPreserved =
    // The round-1 INSERT manager policy is preserved by virtue of the
    // round-2 migration NOT touching it. The static guard in the round-2
    // migration asserts the live posture at apply time, so we only
    // require here that the round-2 migration does not redefine or drop
    // the policy.
    !/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?hrp_f9b_slots_manager_insert\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    ) &&
    !/CREATE\s+POLICY\s+hrp_f9b_slots_manager_insert\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const round1ManagerUpdatePreserved =
    !/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?hrp_f9b_slots_manager_update\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    ) &&
    !/CREATE\s+POLICY\s+hrp_f9b_slots_manager_update\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const noDeletePolicyIntroduced =
    !/CREATE\s+POLICY\s+\S*_delete\s+ON\s+public\.staffing_order_slots/i.test(text) &&
    !/CREATE\s+POLICY\s+hrp_(?:f9b|f9|hr_staff|sora)\S*delete\s+ON\s+public\.staffing_order_slots/i.test(
      text,
    );

  const noBroadStaffingOrderWriteRelaxation =
    !/CREATE\s+POLICY\s+\S+\s+ON\s+public\.staffing_orders[\s\S]*?AS\s+PERMISSIVE\s+FOR\s+ALL[\s\S]*?USING\s*\(\s*true\s*\)/i.test(
      text,
    );

  return {
    migrationApplied: false, // populated by the live-posture test; parsed posture is static-only.
    overRestrictiveSelectPolicyDropped,
    canonicalSelectPolicyCreated,
    canonicalSelectPolicyUsesHrProjectVisibleFor,
    round1PrimitivePosturePreserved,
    round1OpeningsInsertHardeningPreserved,
    round1ManagerInsertPreserved,
    round1ManagerUpdatePreserved,
    noDeletePolicyIntroduced,
    noBroadStaffingOrderWriteRelaxation,
    rawMigrationPath: F9B_R2_MIGRATION_RELATIVE,
    rawF9bRound1MigrationPath: F9B_MIGRATION_RELATIVE,
    rawF9Migration1Path: F9_MIGRATION_1_RELATIVE,
    rawF9Migration2Path: F9_MIGRATION_2_RELATIVE,
  };
}

export interface AssertRound2MigrationAppliedOptions {
  /**
   * Repository root (defaults to `process.cwd()`).
   */
  repoRoot?: string;
}

/**
 * Read the round-2 corrective migration file and return its parsed
 * posture. Throws `Error` if the file does not exist.
 */
export function assertRound2MigrationApplied(
  opts: AssertRound2MigrationAppliedOptions = {},
): Round2MigrationPosture {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const migrationPath = join(repoRoot, F9B_R2_MIGRATION_RELATIVE);
  if (!existsSync(migrationPath)) {
    throw new Error(`hrp-f9b-r2: corrective migration not found at ${migrationPath}`);
  }
  const text = readFileSync(migrationPath, 'utf8');
  return parseRound2MigrationPosture(text);
}

export interface AssertCorrectiveMigrationAppliedOptions {
  /**
   * Repository root (defaults to `process.cwd()`).
   */
  repoRoot?: string;
}

/**
 * Read the corrective migration file and return its parsed posture.
 * Throws `Error` if the file does not exist.
 */
export function assertCorrectiveMigrationApplied(
  opts: AssertCorrectiveMigrationAppliedOptions = {},
): CorrectiveMigrationPosture {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const migrationPath = join(repoRoot, F9B_MIGRATION_RELATIVE);
  if (!existsSync(migrationPath)) {
    throw new Error(`hrp-f9b: corrective migration not found at ${migrationPath}`);
  }
  const text = readFileSync(migrationPath, 'utf8');
  return parseCorrectiveMigrationPosture(text);
}

export const F9B_MIGRATION_PATHS = {
  corrective: F9B_MIGRATION_RELATIVE,
  round2: F9B_R2_MIGRATION_RELATIVE,
  f9WriteRls: F9_MIGRATION_1_RELATIVE,
  f9InsertRls: F9_MIGRATION_2_RELATIVE,
} as const;