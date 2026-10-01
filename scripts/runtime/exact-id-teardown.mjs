#!/usr/bin/env node
/**
 * scripts/runtime/exact-id-teardown.mjs
 *
 * P1 FINAL RELEASE SAFETY — Exact-ID zero-residue teardown (T0 §B.06).
 *
 * Sequential FK-safe reverse-order deletion of EXACT IDs only — no LIKE,
 * no `startsWith`, no TRUNCATE. Errors are NOT swallowed; if any delete
 * fails, the process exits non-zero and the residue assertions downstream
 * will surface the leak.
 *
 * Input: a JSON fixture file path (the file produced by synthetic-fixture.mjs).
 *
 * Order (reverse FK):
 *   1. candidate_submissions
 *   2. application_status_history
 *   3. job_postings
 *   4. job_openings
 *   5. staffing_order_slots  (clear reverse FK first: jobOpeningId→null)
 *   6. staffing_orders
 *   7. projects
 *   8. client_companies
 *   9. placements
 *  10. placement_cases
 *  11. labor_profile_handling_assignments
 *  12. labor_profiles
 *  13. idempotency_keys (per-run actor ids)
 *  14. staffing_order_recruiter_assignments
 *  15. users (synthetic exact IDs only)
 *  16. evidence_records
 *
 * After cleanup, ZERO-RESIDUE assertion runs COUNT(*) against each tracked
 * bucket. Any non-zero count is a hard failure.
 */

import { Client } from 'pg';
import {
  assertSyntheticRuntime,
  GuardReject,
  describeSyntheticRuntime,
} from './db-host-guard.mjs';
import fs from 'node:fs';

const ADMIN_URL = (process.env.HRP_RUNTIME_E2E_ADMIN_DATABASE_URL ?? '').trim();

async function main() {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error('[exact-id-teardown] FAIL no fixture path provided');
    process.exit(2);
  }
  if (!fs.existsSync(fixturePath)) {
    console.error(`[exact-id-teardown] FAIL file not found ${fixturePath}`);
    process.exit(2);
  }
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  // Hard guard.
  let meta;
  try {
    meta = assertSyntheticRuntime();
  } catch (e) {
    if (e instanceof GuardReject) {
      console.error(`[exact-id-teardown] GUARD_REJECT code=${e.code} reason=${e.message}`);
      process.exit(2);
    }
    throw e;
  }
  console.log(`[describe] ${describeSyntheticRuntime(meta)}`);

  const tracked = {
    runId: fixture.runId,
    companyIds: fixture.companyIds ?? [],
    projectIds: fixture.projectIds ?? [],
    orderIds: fixture.orderIds ?? [],
    slotIds: fixture.slotIds ?? [],
    userIds: [fixture.adminUserId, fixture.managerUserId, fixture.staffUserId].filter(Boolean),
    adminUserId: fixture.adminUserId,
    managerUserId: fixture.managerUserId,
    staffUserId: fixture.staffUserId,
  };

  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();

  try {
    await admin.query('BEGIN');
    // Capture extended buckets that the E2E may have populated.
    const submissions = await admin.query(
      `SELECT id FROM candidate_submissions WHERE project_id = ANY($1::text[])`,
      [tracked.projectIds],
    );
    const submissionIds = submissions.rows.map((r) => r.id);

    const applications = await admin.query(
      `SELECT id FROM application_status_history WHERE submission_id = ANY($1::text[])`,
      [submissionIds],
    );
    const applicationIds = applications.rows.map((r) => r.id);

    const postings = await admin.query(
      `SELECT jp.id AS id FROM job_postings jp
       JOIN job_openings jo ON jo.id = jp.job_opening_id
       WHERE jo.staffing_order_id = ANY($1::text[])`,
      [tracked.orderIds],
    );
    const postingIds = postings.rows.map((r) => r.id);

    const openings = await admin.query(
      `SELECT jo.id AS id FROM job_openings jo WHERE jo.staffing_order_id = ANY($1::text[])`,
      [tracked.orderIds],
    );
    const openingIds = openings.rows.map((r) => r.id);

    const assignments = await admin.query(
      `SELECT id FROM staffing_order_recruiter_assignments WHERE staffing_order_id = ANY($1::text[])`,
      [tracked.orderIds],
    );
    const assignmentIds = assignments.rows.map((r) => r.id);

    const placements = await admin.query(
      `SELECT id FROM placements WHERE project_id = ANY($1::text[]) OR job_opening_id = ANY($2::text[])`,
      [tracked.projectIds, openingIds],
    );
    const placementIds = placements.rows.map((r) => r.id);

    const cases = await admin.query(
      `SELECT id FROM placement_case WHERE id IN
         (SELECT placement_case_id FROM candidate_submissions WHERE project_id = ANY($1::text[]))`,
      [tracked.projectIds],
    );
    const placementCaseIds = cases.rows.map((r) => r.id);

    const handlingAssignments = await admin.query(
      `SELECT id FROM labor_profile_handling_assignments WHERE assignee_user_id = ANY($1::text[])`,
      [tracked.userIds],
    );
    const handlingAssignmentIds = handlingAssignments.rows.map((r) => r.id);

    const laborProfiles = await admin.query(
      `SELECT id FROM labor_profiles WHERE id IN
         (SELECT labor_profile_id FROM candidate_submissions WHERE project_id = ANY($1::text[]))`,
      [tracked.projectIds],
    );
    const laborProfileIds = laborProfiles.rows.map((r) => r.id);

    const evidence = await admin.query(
      `SELECT id FROM evidence_records WHERE owner_id = ANY($1::text[])`,
      [laborProfileIds],
    );
    const evidenceIds = evidence.rows.map((r) => r.id);

    const idemKeys = await admin.query(
      `SELECT id FROM idempotency_keys WHERE actor_id = ANY($1::text[])`,
      [tracked.userIds],
    );
    const idemIds = idemKeys.rows.map((r) => r.id);

    // Reverse-FK deletions — each step is its own statement so failures surface.
    await deleteByIds(admin, 'application_status_history', applicationIds);
    await deleteByIds(admin, 'candidate_submissions', submissionIds);
    await deleteByIds(admin, 'job_postings', postingIds);
    await deleteByIds(admin, 'job_openings', openingIds);
    await deleteByIds(admin, 'staffing_order_recruiter_assignments', assignmentIds);
    await deleteByIds(admin, 'placements', placementIds);
    await deleteByIds(admin, 'evidence_records', evidenceIds);
    await deleteByIds(admin, 'labor_profile_handling_assignments', handlingAssignmentIds);
    await deleteByIds(admin, 'placement_case', placementCaseIds);
    await deleteByIds(admin, 'labor_profiles', laborProfileIds);
    // Clear reverse FK first to avoid cascade-blocking orphans.
    await admin.query(
      `UPDATE staffing_order_slots SET job_opening_id = NULL WHERE id = ANY($1::text[])`,
      [tracked.slotIds],
    );
    await deleteByIds(admin, 'staffing_order_slots', tracked.slotIds);
    await deleteByIds(admin, 'staffing_orders', tracked.orderIds);
    await deleteByIds(admin, 'idempotency_keys', idemIds);
    await deleteByIds(admin, 'users', tracked.userIds);
    await deleteByIds(admin, 'outsourcing_projects', tracked.projectIds);
    await deleteByIds(admin, 'client_companies', tracked.companyIds);

    await admin.query('COMMIT');
  } catch (e) {
    try { await admin.query('ROLLBACK'); } catch (_) { /* best-effort rollback */ }
    console.error(`[exact-id-teardown] FAIL ${e?.message ?? e}`);
    await admin.end();
    process.exit(2);
  }

  // Zero-residue assertions.
  const residue = await admin.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE id = ANY($1::text[])) AS users,
      (SELECT COUNT(*) FROM staffing_orders WHERE id = ANY($2::text[])) AS orders,
      (SELECT COUNT(*) FROM staffing_order_slots WHERE id = ANY($3::text[])) AS slots,
      (SELECT COUNT(*) FROM outsourcing_projects WHERE id = ANY($4::text[])) AS projects,
      (SELECT COUNT(*) FROM client_companies WHERE id = ANY($5::text[])) AS companies
  `, [
    tracked.userIds, tracked.orderIds, tracked.slotIds, tracked.projectIds, tracked.companyIds,
  ]);
  await admin.end();

  const r = residue.rows[0];
  const allZero = ['users','orders','slots','projects','companies'].every(k => Number(r[k]) === 0);
  if (!allZero) {
    console.error(`[exact-id-teardown] RESIDUE_DETECTED ${JSON.stringify(r)}`);
    process.exit(2);
  }
  console.log(`[exact-id-teardown] OK runId=${tracked.runId} residue=${JSON.stringify(r)}`);

  // Delete the fixture file (no credentials linger on disk).
  try { fs.unlinkSync(fixturePath); } catch (_) { /* best-effort cleanup */ }
  process.exit(0);
}

async function deleteByIds(client, table, ids) {
  if (!ids || ids.length === 0) return;
  await client.query(`DELETE FROM ${table} WHERE id = ANY($1::text[])`, [ids]);
}

main().catch((e) => {
  console.error(`[exact-id-teardown] UNEXPECTED ${e?.message ?? e}`);
  process.exit(2);
});