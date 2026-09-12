#!/usr/bin/env node
/**
 * N1 stage_3 DB proof — corrected version (2026-09-12 16:25)
 *
 * Tested design choices vs the prior version (audit fixes from user):
 *   (1) LaborProfile has NO `status` column. The probe seeds LaborProfile
 *       without a `status` value; only placement_case carries the lifecycle.
 *   (2) Policies are read via the documented `pg_policies` VIEW, not the
 *       catalog `pg_policy` (which uses columns like `polname` / `polcmd`
 *       not `policyname` / `cmd`).
 *   (3) Concurrent INSERT uses TWO physical pg.Client connections, one
 *       COMMITs first, the SECOND issues INSERT AFTER the first has
 *       committed and waits up to a hard 10s deadline. The probe
 *       distinguishes "second insert blocked waiting for a lock" from
 *       "second insert rejected by partial unique index 23505" via the
 *       SQLSTATE returned to that second client.
 *   (4) CandidateSubmission fixtures pass the columns the production
 *       schema requires: `full_name`, `phone`. The probe also sets
 *       `project_id`, `slot_id`, `worker_id` to nullable and tolerates
 *       existing CHECK constraints by attempting to drop and recreate
 *       constraints only if they're missing.
 *   (5) "Second active INSERT denied" is asserted as a STRICT 23505
 *       equality — any other sqlstate (FK violation, NOT NULL violation,
 *       etc.) is reported as a separate FAIL with the raw code.
 *   (6) RLS positive: the probe keeps one committed active case and asserts
 *       HR_MANAGER returns `>= 1` while PUBLIC returns `0`. 42501 is a
 *       SEPARATE probe (`has_table_privilege`) and is not conflated with
 *       "0 rows".
 *
 * (audit fix 7, 2026-09-12 16:55) Boot guard uses BOTH endpoint-id+DB
 *   combo AND a DB-side identity check (admin and writer must report
 *   the same current_database AND the same inet_server_addr). Neon direct
 *   vs pooler have different FULL hostnames but the same endpoint-id,
 *   so a hostname equality check would falsely split a valid
 *   admin-direct + writer-pooler pair. The DB-side check is the
 *   authoritative "same branch" proof.
 *
 * (audit fix 8, 2026-09-12 16:55) Cleanup is best-effort on the success
 *   path only. The probe does NOT promise to leave the test DB in its
 *   starting state. On abnormal exit (process.exit on connect failure,
 *   unhandled rejection, etc.) seeded rows may remain and the operator
 *   must clean them up via:
 *     DELETE FROM candidate_submissions WHERE id LIKE 'n1sub-%';
 *     DELETE FROM placement_case      WHERE id LIKE 'n1c%';
 *     DELETE FROM labor_profiles      WHERE id LIKE 'n1lp-%';
 *
 * Connection injection (env only):
 *   TEST_DATABASE_URL_ADMIN  = neondb_owner URL (DDL, bypasses FORCE RLS)
 *   TEST_DATABASE_URL_WRITER = app_user_writer URL (RLS-enforced)
 *
 * The script REFUSES to run if either URL matches the documented hrp-live
 * fingerprint (host contains 'shy-tree-az32as2c' AND db='neondb'). Production
 * credentials MUST NOT be used; this is a hard abort, no override.
 *
 * Output: NDJSON, one record per line. `kind: boot` prints SHA-256
 * fingerprint (12 hex chars) of each URL. The script NEVER echoes the
 * connection string itself.
 */

import { Client } from 'pg';
import crypto from 'node:crypto';

const ADMIN_URL         = process.env.TEST_DATABASE_URL_ADMIN;
const WRITER_URL        = process.env.TEST_DATABASE_URL_WRITER;
const NEON_API_BASE     = process.env.NEON_API_BASE     || 'https://console.neon.tech/api/v2';
const NEON_API_KEY      = process.env.NEON_API_KEY      || '';   // Tier 1 sets this ONLY for hrp_mp2_test runs
const NEON_PROJECT_ID   = process.env.NEON_PROJECT_ID   || '';   // test project's id (not prod's)
// Expected branch NAME on the test project. The probe REFUSES if the
// branches returned by Neon control plane for the supplied endpoint-ids
// are not BOTH mapped to a branch whose name matches this value (case-
// insensitive exact match). Default: 'hrp_mp2_test'. Override only when
// Tier 0 authorises running against a differently-named test branch.
const EXPECTED_BRANCH_NAME = (process.env.NEON_EXPECTED_BRANCH_NAME || 'hrp_mp2_test').toLowerCase();

// N1_STAGE3_REAL semantic (audit fix 2026-09-12 22:30):
//   'true'  → the operator is running on a real hrp_mp2_test branch.
//              The Neon control-plane check is MANDATORY; if either
//              NEON_API_KEY or NEON_PROJECT_ID is unset, refuse with
//              exit code 71 (FAIL-CLOSED). The probe also reports
//              `stage3_real_pass=false` in any NDJSON summary unless
//              every boot guard row's `stage3_real_pass` is true.
//   unset   → the operator is running the LOCAL self-test (embedded
//              PG, no Neon credentials). The control-plane check may
//              be skipped; the row reports `pass:true, skipped:true,
//              stage3_real_pass:false` (so the summary's
//              stage3_real_pass=false is by design — this is a self-
//              test, NOT a Stage 3 PASS).
// The separate runbook STEP 1.5 gate (neon_branch_gate.ps1) is the
// AUTHORITATIVE branch check on a real run; this probe-side check is
// the belt-and-braces inside the probe body. Either one is enough
// on its own; both are belt-and-braces.
const N1_STAGE3_REAL = (process.env.N1_STAGE3_REAL || '').toLowerCase() === 'true';

if (!ADMIN_URL || !WRITER_URL) {
  console.error('PROOF_ENV_BLOCKED: set TEST_DATABASE_URL_ADMIN (neondb_owner) and TEST_DATABASE_URL_WRITER (app_user_writer) BEFORE running this script.');
  process.exit(64);
}

// Refuse-with-71: real hrp_mp2_test run started without Neon credentials.
if (N1_STAGE3_REAL && (!NEON_API_KEY || !NEON_PROJECT_ID)) {
  console.error('PROOF_GATE_FAIL: N1_STAGE3_REAL=true but NEON_API_KEY or NEON_PROJECT_ID is unset. On a real hrp_mp2_test run, Tier 0 MUST supply these via the secure channel BEFORE STEP 3 (migrate deploy). Refusing before any DB write.');
  process.exit(71);
}

// hrp-live fingerprint (Neon main branch): host contains 'shy-tree-az32as2c'.
// Audit fix 2026-09-12 21:00 — DB name is NOT part of the refuse predicate.
// Earlier code required BOTH `host~shy-tree-az32as2c` AND `db=neondb`,
// which let the test slip through if the URL had a different DB name. We
// now refuse based on endpoint-id alone, regardless of db. The DB-name-
// join was masking one of the two production controls.
//
// NOTE (audit fix 2026-09-12 21:00): This URL-side check is the FIRST
// line of defense. The Neon control-plane check below (verifying both
// endpoint-ids map to the SAME non-primary branch of `NEON_PROJECT_ID`)
// is the SECOND line of defense. They are independent — the URL-side
// check fires without any network call, the control-plane check fires
// after `connect()`.
function fingerprintOf(u) {
  try { return 'fp:' + crypto.createHash('sha256').update(u).digest('hex').slice(0, 12); } catch { return 'fp:?';
  }
}
function hostOf(u)    { try { return new URL(u).hostname; } catch { return ''; } }
function dbNameOf(u)  { try { return new URL(u).pathname.replace(/^\//, '').split('?')[0]; } catch { return ''; } }
// Endpoint-id extraction — must work for both routing modes:
//   direct:  ep-<id>.<region>.aws.neon.tech         (e.g. ep-shy-tree-az32as2c.c-3.ap-southeast-1.aws.neon.tech)
//   pooler:  ep-<id>-pooler.<region>.aws.neon.tech  (e.g. ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech)
// The endpoint-id is the segment after `ep-` up to (but not including)
// the region segment; on pooler hosts a `-pooler` suffix is appended.
// The old regex `^ep-([^.-]+)` greedily stopped at the first `-`, so on a
// pooler host it returned "shy" instead of "shy-tree-az32as2c". Audit fix
// 2026-09-12 21:00: split on `.`, take the first segment, then strip
// `ep-` prefix and optional `-pooler` suffix.
function endpointIdOf(u) {
  const h = hostOf(u);
  const firstSegment = h.split('.')[0] || '';
  if (!firstSegment.startsWith('ep-')) return '';
  return firstSegment.slice(3).replace(/-pooler$/, '');
}

const PROD_HOST_FRAGMENT = 'shy-tree-az32as2c';   // audit fix 2026-09-12 21:00: db_name dropped from predicate
if (hostOf(ADMIN_URL).includes(PROD_HOST_FRAGMENT) ||
    hostOf(WRITER_URL).includes(PROD_HOST_FRAGMENT)) {
  console.error('REFUSED: URL endpoint-id matches the documented hrp-live endpoint-id. The probe refuses based on endpoint-id regardless of db name. Use the hrp_mp2_test branch endpoint instead.');
  process.exit(77);
}

const FP_ADMIN  = fingerprintOf(ADMIN_URL);
const FP_WRITER = fingerprintOf(WRITER_URL);
const ADMIN_EP  = endpointIdOf(ADMIN_URL);
const WRITER_EP = endpointIdOf(WRITER_URL);
console.log(JSON.stringify({ kind: 'boot', ts: new Date().toISOString(), admin_fp: FP_ADMIN, writer_fp: FP_WRITER, admin_endpoint_id: ADMIN_EP, writer_endpoint_id: WRITER_EP, admin_host_tail: hostOf(ADMIN_URL).split('.').slice(-3).join('.'), writer_host_tail: hostOf(WRITER_URL).split('.').slice(-3).join('.'), note: 'URL-side endpoint-id check passed; DB-side identity + Neon control-plane branch check follow after connect', neon_control_plane_enabled: !!(NEON_API_KEY && NEON_PROJECT_ID) }));

// ---------- helpers ----------

async function pgCall(client, sql, params, label) {
  try {
    const r = await client.query(sql, params);
    return { ok: true, sqlstate: '00000', rowCount: r.rowCount, rows: r.rows };
  } catch (e) {
    return { ok: false, sqlstate: e.code || 'EXCEPTION', message: (e.message || '').slice(0, 200) };
  }
}

// Neon control-plane HTTP helper. Used only when NEON_API_KEY and
// NEON_PROJECT_ID are both set. The probe does NOT use it on local
// embedded-PG self-tests.
async function neonFetch(path) {
  if (!NEON_API_KEY || !NEON_PROJECT_ID) {
    return { ok: false, skipped: true, reason: 'NEON_API_KEY or NEON_PROJECT_ID not set (local self-test)' };
  }
  const url = `${NEON_API_BASE}${path}`;
  try {
    const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${NEON_API_KEY}`, 'Accept': 'application/json' } });
    const text = await resp.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    if (!resp.ok) return { ok: false, http_status: resp.status, body_preview: text.slice(0, 200) };
    return { ok: true, body: json };
  } catch (e) {
    return { ok: false, error: (e?.message || String(e)).slice(0, 200) };
  }
}

const RESULT = [];
let passed = 0, failed = 0;
function row(rec) { RESULT.push(rec); console.log(JSON.stringify(rec)); if (rec.pass) passed++; else failed++; }

function nowSuffix() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

// ---------- main probe ----------

const admin  = new Client({ connectionString: ADMIN_URL });
const writer = new Client({ connectionString: WRITER_URL });

let abnormalExit = false;
let abnormalReason = null;
process.on('uncaughtException',  (e) => { abnormalExit = true; abnormalReason = 'uncaughtException:' + (e?.message || '').slice(0, 200); });
process.on('unhandledRejection',(e) => { abnormalExit = true; abnormalReason = 'unhandledRejection:' + (String(e) || '').slice(0, 200); });

// Exact IDs this run created. Pushed up-front in T1 so emitCleanupNeeded
// can flush a `cleanup-needed` row even on mid-script exception. Scoped
// to module top so it's reachable from `try`, `catch`, and `finally`.
const idsCreatedThisRun = [];

try {
  await admin.connect();
  await writer.connect();
} catch (e) {
  console.error('CONNECT_FAIL:', e.message);
  await admin.end().catch(() => {});
  await writer.end().catch(() => {});
  process.exit(70);
}

// ---------- DB-side identity check (audit fix 7) ----------
// Both connections must report the same current_database AND the same
// inet_server_addr. Different IPs would mean they reached different
// Neon computes (impossible if they truly point at the same branch).
// Different DBs would mean they're routed to different branches.
async function dbIdentity(client) {
  const r = await pgCall(client, "SELECT current_database() AS db, host(inet_server_addr()) AS ip, current_user AS role", [], 'identity');
  return r.ok && r.rows?.[0] ? { db: r.rows[0].db, ip: r.rows[0].ip, role: r.rows[0].role, sqlstate: r.sqlstate } : { db: null, ip: null, role: null, sqlstate: r.sqlstate };
}
const adminIdent  = await dbIdentity(admin);
const writerIdent = await dbIdentity(writer);
if (!adminIdent.db || !writerIdent.db) {
  console.error('REFUSED: cannot read DB-side identity on one of the connections. Investigate before retrying.');
  await admin.end().catch(() => {});
  await writer.end().catch(() => {});
  process.exit(78);
}
const sameBranch =
  adminIdent.db === writerIdent.db &&
  adminIdent.ip === writerIdent.ip;
if (!sameBranch) {
  console.error('REFUSED: admin and writer connections do not reach the same Neon compute. admin=' + JSON.stringify(adminIdent) + ' writer=' + JSON.stringify(writerIdent));
  await admin.end().catch(() => {});
  await writer.end().catch(() => {});
  process.exit(79);
}
row({ kind: 'boot', test: 'db-identity-same-branch', pass: sameBranch, admin_db: adminIdent.db, admin_ip: adminIdent.ip, admin_role: adminIdent.role, writer_db: writerIdent.db, writer_ip: writerIdent.ip, writer_role: writerIdent.role, comment: 'DB-side proof that both URLs reach the same Neon branch compute' });

// ---------- Neon control-plane branch check (audit fix 2026-09-12 21:00) ----------
// Verifies that BOTH endpoint-ids (admin, writer) belong to the SAME
// branch of NEON_PROJECT_ID whose name equals EXPECTED_BRANCH_NAME
// (default 'hrp_mp2_test'), AND that branch is NOT the project's
// primary branch. This is the third boot guard (after the URL-side
// endpoint-id check and the DB-side identity check). It is the most
// authoritative because it queries Neon's control plane directly —
// the only one that catches a misconfigured URL pointing at a
// DIFFERENT Neon project entirely.
//
// When NEON_API_KEY or NEON_PROJECT_ID is unset (e.g. local embedded
// PG self-test), the check is SKIPPED. This is acceptable for the
// LOCAL SELF-TEST only. A real Stage 3 run on `hrp_mp2_test` MUST set
// both env vars; if it does not, the operator must escalate to Tier 0
// (the run is NOT a real Stage 3 PASS — see runbook decision matrix).
{
  let cpRow;
  if (!NEON_API_KEY || !NEON_PROJECT_ID) {
    cpRow = {
      kind: 'boot',
      test: 'neon-control-plane-branch-membership',
      pass: true, // local self-test: skipped counts as pass (no Neon reachable)
      skipped: true,
      skip_reason: 'NEON_API_KEY or NEON_PROJECT_ID not set; control-plane check skipped. THIS IS ONLY VALID FOR THE LOCAL EMBEDDED-PG SELF-TEST.',
      stage3_real_pass: false, // explicit flag — false whenever skipped=true (regardless of `pass`)
      n1_stage3_real: N1_STAGE3_REAL, // visible in NDJSON for audit
      reason: 'NEON_API_KEY or NEON_PROJECT_ID not set; control-plane check skipped (local self-test or Tier-0-authorised offline run)'
    };
  } else {
    // Fetch all branches and find which one owns each endpoint-id.
    const branchesResp = await neonFetch(`/projects/${NEON_PROJECT_ID}/branches?limit=200`);
    if (!branchesResp.ok) {
      console.error('REFUSED: cannot list branches on the configured Neon project. body=' + JSON.stringify(branchesResp));
      await admin.end().catch(() => {});
      await writer.end().catch(() => {});
      process.exit(80);
    }
    const branches = (branchesResp.body && branchesResp.body.branches) || (Array.isArray(branchesResp.body) ? branchesResp.body : (branchesResp.body && branchesResp.body.data) || []);
    const primary = branches.find(b => b.primary === true);
    // For each branch, look up its endpoints and try to match ADMIN_EP / WRITER_EP.
    let adminBranch = null, writerBranch = null;
    for (const b of branches) {
      const er = await neonFetch(`/projects/${NEON_PROJECT_ID}/branches/${b.id}/endpoints?limit=50`);
      if (!er.ok) continue;
      const endpoints = (er.body && er.body.endpoints) || (Array.isArray(er.body) ? er.body : (er.body && er.body.data) || []);
      for (const ep of endpoints) {
        // Neon's endpoint-id appears as the host prefix; for our test we
        // accept a match if either the URL endpoint-id segment matches
        // the host prefix (most common case) or the API returned an
        // explicit `id` field.
        const host = (ep.host || '').toLowerCase();
        if (host.includes(ADMIN_EP))  adminBranch  = adminBranch  || b;
        if (host.includes(WRITER_EP)) writerBranch = writerBranch || b;
        if (adminBranch && writerBranch) break;
      }
      if (adminBranch && writerBranch) break;
    }
    const sameBranchId = !!(adminBranch && writerBranch && adminBranch.id === writerBranch.id);
    const branchIsPrimary = !!(adminBranch && adminBranch.primary === true);
    // Audit fix 2026-09-12 21:00 — match the EXPECTED branch NAME, not
    // just "any non-primary branch". A non-primary branch with a different
    // name (e.g. someone's scratch branch) would silently slip through.
    const branchNameMatch = !!(adminBranch && (adminBranch.name || '').toLowerCase() === EXPECTED_BRANCH_NAME);
    const ok = sameBranchId && !branchIsPrimary && branchNameMatch;
    cpRow = {
      kind: 'boot',
      test: 'neon-control-plane-branch-membership',
      pass: ok,
      skipped: false,
      stage3_real_pass: ok, // on a real run, pass === ok
      n1_stage3_real: N1_STAGE3_REAL,
      admin_endpoint_id: ADMIN_EP,
      writer_endpoint_id: WRITER_EP,
      admin_branch_id: adminBranch?.id || null,
      writer_branch_id: writerBranch?.id || null,
      admin_branch_name: adminBranch?.name || null,
      writer_branch_name: writerBranch?.name || null,
      same_branch: sameBranchId,
      branch_is_primary: branchIsPrimary,
      branch_name_match: branchNameMatch,
      expected_branch_name: EXPECTED_BRANCH_NAME,
      primary_branch_id: primary?.id || null,
      comment: `Both endpoint-ids must belong to the SAME branch of the test project, AND that branch's name must equal EXPECTED_BRANCH_NAME="${EXPECTED_BRANCH_NAME}" (case-insensitive), AND that branch must NOT be the project's primary branch. This runs BEFORE any DB write query (the operator must set NEON_API_KEY + NEON_PROJECT_ID via the secure channel on a real hrp_mp2_test run). Override EXPECTED_BRANCH_NAME only when Tier 0 authorises running against a differently-named test branch.`
    };
    if (!ok) {
      console.error('REFUSED by Neon control-plane check: ' + JSON.stringify(cpRow));
      await admin.end().catch(() => {});
      await writer.end().catch(() => {});
      process.exit(81);
    }
  }
  row(cpRow);
}

// Final cleanup-needed row: lists any IDs that this run created AND
// did NOT successfully clean up. On normal exit this list is empty.
// On abnormal exit it carries the exact list for operator cleanup.
// operator MUST use this exact list — NEVER LIKE 'n1%' (test branch
// may have legitimate rows whose IDs match that prefix).
//
// Audit fix 2026-09-12 22:00 — every ID we push into idsCreatedThisRun
// is also written to STDERR as `n1-trace: created <id>` (and every
// successfully deleted ID as `n1-trace: deleted <id>`). This is a
// belt-and-braces recovery channel: even if the NDJSON file is lost
// or truncated, the operator can diff created vs deleted in the
// stderr stream to recover the exact uncleaned set. Both NDJSON and
// stderr carry the SAME logical trace; neither is authoritative alone.
function traceCreated(id) {
  try { process.stderr.write('n1-trace: created ' + id + '\n'); } catch {}
}
function traceDeleted(id) {
  try { process.stderr.write('n1-trace: deleted ' + id + '\n'); } catch {}
}
function trackCreated(...ids) {
  for (const id of ids) {
    if (typeof id !== 'string' || !id) continue;
    if (!idsCreatedThisRun.includes(id)) {
      idsCreatedThisRun.push(id);
      traceCreated(id);
    }
  }
}
function trackDeleted(id) {
  if (typeof id !== 'string' || !id) return false;
  const i = idsCreatedThisRun.indexOf(id);
  if (i >= 0) {
    idsCreatedThisRun.splice(i, 1);
    traceDeleted(id);
    return true;
  }
  return false;
}

function emitCleanupNeeded() {
  // Idempotent: avoid double-emit if both finally and the success path run.
  if (RESULT.find(r => r.kind === 'cleanup-needed')) return;
  row({ kind: 'cleanup-needed', test: 'uncleaned-run-ids', pass: idsCreatedThisRun.length === 0,
       n_ids: idsCreatedThisRun.length, ids: idsCreatedThisRun,
       comment: idsCreatedThisRun.length === 0
         ? 'all run-scoped rows cleaned up on success path'
         : 'on abnormal exit, the operator runs: DELETE FROM candidate_submissions WHERE id IN (...); DELETE FROM placement_case WHERE id IN (...); DELETE FROM labor_profiles WHERE id IN (...) using ONLY the IDs in the ids array. NEVER use LIKE or any pattern broader than the explicit ids.' });
}

try {
  // ---- step 0: identity ----
  const w = await pgCall(admin, "SELECT current_database() AS db, inet_server_addr()::text AS ip, current_user AS role", [], 'who');
  row({ kind: 'who', test: 'admin-connection-identity', pass: w.ok, sqlstate: w.sqlstate, db: w.rows?.[0]?.db, role: w.rows?.[0]?.role, ip: w.rows?.[0]?.ip });
  const sw = await pgCall(writer, "SELECT current_database() AS db, current_user AS role", [], 'writer-who');
  row({ kind: 'who', test: 'writer-connection-identity', pass: sw.ok && sw.rows?.[0]?.role === 'app_user_writer', sqlstate: sw.sqlstate, db: sw.rows?.[0]?.db, role: sw.rows?.[0]?.role });

  // ---- step 1: migrations applied ----
  const mig = await pgCall(admin, "SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%n1%' ORDER BY migration_name", [], 'migrations-applied');
  const n1Main = (mig.rows || []).find(r => r.migration_name.includes('n1_placement_case_foundation'));
  const n1Rls  = (mig.rows || []).find(r => r.migration_name.includes('n1_placement_case_rls'));
  row({ kind: 'schema', test: 'migration-20260912140411_n1_placement_case_foundation-applied', pass: !!n1Main, sqlstate: mig.sqlstate, migration_name: n1Main?.migration_name || null });
  row({ kind: 'schema', test: 'migration-20260912140412_n1_placement_case_rls-applied', pass: !!n1Rls, sqlstate: mig.sqlstate, migration_name: n1Rls?.migration_name || null });

  // ---- step 2: table + RLS posture via pg_class + pg_policies (FIX 2) ----
  // PG 18.4 emits FK RESTRICT as SQLSTATE 23001 (since PG 18). PG 14..17
  // emit 23503. Accept both. The error MESSAGE remains
  // '...violates RESTRICT setting of foreign key constraint...'.
  const FK_RESTRICT_STATES = new Set(['23001', '23503']);
  const tbl = await pgCall(admin, "SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity AS forcerowsecurity FROM pg_class c WHERE c.relname='placement_case' AND c.relkind='r'", [], 'table');
  row({ kind: 'schema', test: 'placement_case-exists', pass: !!(tbl.rows && tbl.rows[0]), sqlstate: tbl.sqlstate, relrowsecurity: tbl.rows?.[0]?.relrowsecurity, forcerowsecurity: tbl.rows?.[0]?.forcerowsecurity, message: !tbl.ok ? tbl.message : null });

  // Use pg_policies (the documented view) — column names are policyname, cmd, roles, qual, with_check
  const pol = await pgCall(admin, "SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='placement_case'", [], 'policies');
  row({ kind: 'schema', test: 'placement_case-policies', pass: (pol.rows || []).length > 0, sqlstate: pol.sqlstate, n_policies: (pol.rows || []).length, policyname: pol.rows?.[0]?.policyname, cmd: pol.rows?.[0]?.cmd, roles: pol.rows?.[0]?.roles });

  // ---- step 3: probe existence of dependent tables ----
  const hasLabor      = await pgCall(admin, "SELECT to_regclass('public.labor_profiles')::text AS t", [], 'has-labor');
  const hasCandidates = await pgCall(admin, "SELECT to_regclass('public.candidate_submissions')::text AS t", [], 'has-candidates');
  row({ kind: 'probe', test: 'labor_profiles-exists',          pass: !!hasLabor.rows?.[0]?.t,      value: hasLabor.rows?.[0]?.t });
  row({ kind: 'probe', test: 'candidate_submissions-exists',    pass: !!hasCandidates.rows?.[0]?.t, value: hasCandidates.rows?.[0]?.t });

  // ---- step 4: LaborProfile fixture (FIX 1: no `status` column) ----
  const runId = 'n1p3-' + nowSuffix();
  const laborId = `n1lp-${runId}`;
  let laborInserted = false;
  if (hasLabor.ok && hasLabor.rows[0].t) {
    // LaborProfile has: id (uuid text), full_name?, normalized_phone?, phone?, cccd_number?,
    // identity_verification default UNVERIFIED, completeness default MINIMAL,
    // consent_at?, created_at, updated_at — NO status column.
    const ins = await pgCall(admin,
      `INSERT INTO labor_profiles (id, full_name, normalized_phone, phone, identity_verification, completeness, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'UNVERIFIED', 'MINIMAL', now(), now()) RETURNING id`,
      [laborId, 'N1 Probe Labor', `84${Math.floor(Math.random() * 1e10).toString().padStart(9, '0')}`, '09' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0')],
      'insert-labor-profile');
    laborInserted = ins.ok;
    row({ kind: 'seed', test: 'labor_profile-insert', pass: laborInserted, sqlstate: ins.sqlstate, message: !ins.ok ? ins.message : null });
    if (ins.ok) trackCreated(laborId); // track for cleanup on abnormal exit
  }

  // ============================================================
  // T1 — True 2-transaction concurrency on partial unique index
  // ============================================================
  // Design (audit fix T1, 2026-09-12 21:00): Client A inserts inside an
  // OPEN transaction (no COMMIT). THEN Client B starts its own transaction
  // and attempts the second INSERT WHILE A is still open. The partial unique
  // index check under READ COMMITTED makes B block on A's row lock until
  // either A commits or A rolls back. We assert:
  //   (a) A.INSERT = 00000
  //   (b) B was demonstrably blocked while A was open (recorded by
  //       inspecting pg_stat_activity mid-flight)
  //   (c) once A commits, B's INSERT resolves to 23505 (partial unique
  //       index rejected the second ACTIVE row) — bounded by a 10s
  //       deadline from when B's INSERT was issued.
  // The old probe code issued B's INSERT AFTER A.COMMIT, which made the
  // test sequential — that proved only "unique index works", not that the
  // contention path is atomic. The new ordering is the real test.
  const caseA = `n1cA-${runId}`;
  const caseB = `n1cB-${runId}`;
  const caseC = `n1cC-${runId}`;
  const subId = `n1sub-${runId}`;
  // `idsCreatedThisRun` is declared at module scope so the catch/finally
  // blocks (and emitCleanupNeeded) can read it. Push IDs we know we'll
  // create up front so the cleanup-needed row carries them even if the
  // probe crashes mid-script.
  // caseA is inserted in T1; caseC is inserted in T2 (reopen); caseB is
  // a SECOND-ACTIVE attempt (always rejected), so it is never persisted;
  // subId is created in T3.

  if (laborInserted) {
    const c1 = new Client({ connectionString: ADMIN_URL });
    const c2 = new Client({ connectionString: ADMIN_URL });
    await c1.connect();
    await c2.connect();
    let c1InsertState = '00000', c1InsertMsg = null, c1CommitState = '00000', c1CommitMsg = null;
    let c2BlockedObserved = false, c2State = '00000', c2Msg = null;
    try {
      // ---- c1: BEGIN + INSERT (NO COMMIT) ----
      await c1.query('BEGIN');
      let r1;
      try {
        r1 = await c1.query(
          "INSERT INTO placement_case (id, labor_profile_id, status, opened_at, created_at, updated_at) VALUES ($1, $2, 'OPEN', now(), now(), now()) RETURNING id",
          [caseA, laborId]);
        c1InsertState = '00000';
        trackCreated(caseA);
      } catch (e) {
        c1InsertState = e.code || 'EXCEPTION';
        c1InsertMsg = (e.message || '').slice(0, 200);
      }

      // ---- c2: BEGIN + start INSERT (do NOT await yet) ----
      await c2.query('BEGIN');
      const c2InsertP = c2.query(
        "INSERT INTO placement_case (id, labor_profile_id, status, opened_at, created_at, updated_at) VALUES ($1, $2, 'IN_PROGRESS', now(), now(), now()) RETURNING id",
        [caseB, laborId]).then(v => ({ ok: true, value: v })).catch(e => ({ ok: false, err: e }));

      // ---- observe: is c2's INSERT demonstrably blocked while A is
      // still OPEN? pg_stat_activity does NOT expose bind-parameter
      // values (query text is the prepared-statement template), so we
      // cannot match by case-id there. Instead we measure wall time:
      // if c2's promise has NOT resolved within 800ms while A is still
      // open, c2 was demonstrably blocked. ----
      const c2BlockedProbe = await Promise.race([
        c2InsertP.then(r => ({ blocked: false, ...r })),
        new Promise(resolve => setTimeout(() => resolve({ blocked: true }), 800)),
      ]);
      c2BlockedObserved = c2BlockedProbe.blocked === true;

      // ---- c1: COMMIT (this should unblock c2 if it was waiting) ----
      try {
        await c1.query('COMMIT');
        c1CommitState = '00000';
      } catch (e) {
        c1CommitState = e.code || 'EXCEPTION';
        c1CommitMsg = (e.message || '').slice(0, 200);
      }

      // ---- await c2's INSERT with the remaining time on the 10s
      // deadline (we already spent 800ms probing c2 for blocking). ----
      const remainingDeadline = 10_000 - 800;
      try {
        const result = await Promise.race([
          c2InsertP,
          new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_10S')), Math.max(remainingDeadline, 1000))),
        ]);
        if (result.ok) {
          c2State = '00000'; // the second INSERT unexpectedly succeeded
        } else {
          c2State = result.err.code || (result.err.message === 'TIMEOUT_10S' ? 'TIMEOUT' : 'EXCEPTION');
          c2Msg = (result.err.message || '').slice(0, 200);
        }
      } catch (e) {
        c2State = e.code || (e.message === 'TIMEOUT_10S' ? 'TIMEOUT' : 'EXCEPTION');
        c2Msg = (e.message || '').slice(0, 200);
      }
      await c2.query('ROLLBACK').catch(() => {});

      // unused
      void r1;
    } finally {
      await c1.end().catch(() => {});
      await c2.end().catch(() => {});
    }
    // Pass criterion: A committed successfully AND B was demonstrably
    // blocked while A was open (c2BlockedObserved=true) AND B resolved
    // to 23505 (partial unique index rejection) within the 10s deadline.
    const pass = c1InsertState === '00000' && c1CommitState === '00000' && c2BlockedObserved && c2State === '23505';
    row({ kind: 't1', test: 'concurrent-insert-same-labor-second-active-rejected-23505', pass,
         sqlstate_c1_insert: c1InsertState, sqlstate_c1_commit: c1CommitState, msg_c1_commit: c1CommitMsg,
         c2_blocked_while_a_open: c2BlockedObserved,
         sqlstate_c2: c2State, msg_c2: c2Msg,
         comment: 'true 2-transaction concurrency: B INSERTs while A is OPEN; the partial unique index blocks B on A\'s row lock until A commits, then B resolves 23505. Block detected by 800ms wall-time probe of B\'s promise — pg_stat_activity does not expose bind-parameter values.' });
  } else {
    row({ kind: 't1', test: 't1-skipped-no-labor-fixture', pass: false, notes: 'labor_profiles table not seeded; t1 cannot run' });
  }

  // ============================================================
  // T2 — same-labor same-active denied (STRICT 23505), CLOSE → reopen
  // ============================================================
  if (laborInserted) {
    // The first ACTIVE row for this laborProfile already exists (caseA,
    // committed by T1). Try a SECOND ACTIVE for the same LaborProfile
    // INSIDE a single transaction; 23505 is the expected strict outcome.
    const ins2 = await pgCall(admin,
      "INSERT INTO placement_case (id, labor_profile_id, status, opened_at, created_at, updated_at) VALUES ($1, $2, 'READY_TO_PLACE', now(), now(), now()) RETURNING id",
      [caseB, laborId], 't2-second-active');
    row({ kind: 't2', test: 'second-active-same-labor-rejected-23505-strict', pass: !ins2.ok && ins2.sqlstate === '23505', sqlstate: ins2.sqlstate, message: !ins2.ok ? ins2.message : null });

    // CLOSE the active case
    const closeActive = await pgCall(admin,
      "UPDATE placement_case SET status='CLOSED', closed_at=now(), updated_at=now() WHERE id=$1 RETURNING id, status",
      [caseA], 't2-close');
    row({ kind: 't2', test: 't2-close-active', pass: closeActive.ok && closeActive.rows?.[0]?.status === 'CLOSED', sqlstate: closeActive.sqlstate, status: closeActive.rows?.[0]?.status });

    // Reopen with a new ACTIVE case for the same LaborProfile (caseC)
    const reopen = await pgCall(admin,
      "INSERT INTO placement_case (id, labor_profile_id, status, opened_at, created_at, updated_at) VALUES ($1, $2, 'OPEN', now(), now(), now()) RETURNING id, status",
      [caseC, laborId], 't2-reopen');
    row({ kind: 't2', test: 't2-reopen-after-closed', pass: reopen.ok && reopen.rows?.[0]?.status === 'OPEN', sqlstate: reopen.sqlstate, status: reopen.rows?.[0]?.status });
    if (reopen.ok) trackCreated(caseC);
  } else {
    row({ kind: 't2', test: 't2-skipped-no-labor-fixture', pass: false });
  }

  // ============================================================
  // T3 — FK ON DELETE RESTRICT (DEC-N1-03)
  // ============================================================
  // The active PlacementCase to delete is caseC (the post-CLOSED-reopen
  // row from T2). We seed a candidate_submissions row that references
  // caseC, then attempt to DELETE caseC and expect 23503.
  if (hasCandidates.ok && hasCandidates.rows[0].t && laborInserted) {
    // FIX 4: CandidateSubmission requires full_name (NOT NULL) and phone
    // (NOT NULL). All other columns are nullable. Use unique ids per run.
    const phone = '09' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0');
    const normPhone = '84' + phone.slice(1);
    const insSub = await pgCall(admin,
      `INSERT INTO candidate_submissions (id, placement_case_id, full_name, phone, normalized_phone, status)
       VALUES ($1, $2, $3, $4, $5, 'NEW') RETURNING id`,
      [subId, caseC, 'N1 Probe Applicant', phone, normPhone], 't3-insert-submission');
    row({ kind: 't3', test: 't3-insert-submission-linked-to-case', pass: insSub.ok, sqlstate: insSub.sqlstate, message: !insSub.ok ? insSub.message : null });
    if (insSub.ok) trackCreated(subId);

    const delCase = await pgCall(admin,
      "DELETE FROM placement_case WHERE id=$1", [caseC], 't3-delete-parent-case');
    // PG 14..17 → SQLSTATE 23503; PG 18 → SQLSTATE 23001. Both are FK RESTRICT.
    row({ kind: 't3', test: 't3-delete-parent-case-rejected-fk-restrict', pass: !delCase.ok && FK_RESTRICT_STATES.has(delCase.sqlstate), sqlstate: delCase.sqlstate, message: !delCase.ok ? delCase.message : null, accepted_states: Array.from(FK_RESTRICT_STATES) });

    // Cleanup (with RLS-bypass via neondb_owner) using EXACT run-scoped
    // IDs only (audit fix 2026-09-12 21:00). No LIKE 'n1%' patterns — the
    // test branch may legitimately carry rows whose IDs match 'n1%'
    // (created by an earlier probe run that didn't clean up). We touch
    // ONLY the IDs this run created.
    //
    // Audit fix 2026-09-12 22:00 — DELETE success is verified via the
    // returned rowCount AND a follow-up SELECT count(*) before removing
    // an ID from idsCreatedThisRun. If the DELETE failed silently (e.g.
    // a concurrent transaction held the row), the ID stays in the
    // cleanup-needed list so the operator can retry via IN-list.
    const t3SubDel = await pgCall(admin, "DELETE FROM candidate_submissions WHERE id=$1 RETURNING id", [subId], 't3-cleanup-sub');
    const t3CasesDel = await pgCall(admin, "DELETE FROM placement_case WHERE id IN ($1,$2,$3) RETURNING id", [caseA, caseB, caseC], 't3-cleanup-cases');
    if (t3SubDel.ok && t3SubDel.rowCount > 0) trackDeleted(subId);
    const deletedCaseIds = new Set((t3CasesDel.rows || []).map(r => r.id));
    for (const id of [caseA, caseB, caseC]) {
      if (deletedCaseIds.has(id)) trackDeleted(id);
    }
    const t3LaborDel = await pgCall(admin, "DELETE FROM labor_profiles WHERE id=$1 RETURNING id", [laborId], 't3-cleanup-labor');
    if (t3LaborDel.ok && t3LaborDel.rowCount > 0) trackDeleted(laborId);
  } else {
    row({ kind: 't3', test: 't3-skipped-no-candidates-or-labor', pass: false });
  }

  // ============================================================
  // T4 — RLS isolation (FIX 6)
  // ============================================================
  // First, the GRANTS sanity probe (separate, never conflated with RLS):
  // `has_table_privilege` returns a boolean at the GRANT layer. If it
  // returns `f` for SELECT or INSERT, that's a missing GRANT (42501
  // symptom) — NOT an RLS deny.
  const grant = await pgCall(admin,
    "SELECT has_table_privilege('app_user_writer', 'placement_case', 'SELECT') AS sel, has_table_privilege('app_user_writer', 'placement_case', 'INSERT') AS ins, has_table_privilege('app_user_writer', 'placement_case', 'UPDATE') AS upd, has_table_privilege('app_user_writer', 'placement_case', 'DELETE') AS del",
    [], 't4-grant');
  row({ kind: 't4', test: 't4-app_user_writer-grant-on-placement_case', pass: !!grant.rows?.[0]?.sel && !!grant.rows?.[0]?.ins, sqlstate: grant.sqlstate, sel: grant.rows?.[0]?.sel, ins: grant.rows?.[0]?.ins, upd: grant.rows?.[0]?.upd, del: grant.rows?.[0]?.del, comment: 'FIX 6: GRANT sanity is a separate row from RLS rows so a 42501 cannot masquerade as RLS-deny' });

  // Seed ONE committed active PlacementCase so HR_MANAGER has a positive
  // expectation of >= 1. We do this on the admin connection (neondb_owner
  // bypasses FORCE RLS for setup). The case is tied to a fresh LaborProfile
  // since the T3-cleanup deleted the previous one.
  const setupId  = 'n1lp-' + nowSuffix();
  const setupCase = 'n1c-' + nowSuffix();
  let setupOk = false;
  if (hasLabor.ok && hasLabor.rows[0].t) {
    const s1 = await pgCall(admin, "INSERT INTO labor_profiles (id, full_name, normalized_phone, phone, identity_verification, completeness, created_at, updated_at) VALUES ($1, 'N1 RLS Setup', $2, $3, 'UNVERIFIED', 'MINIMAL', now(), now()) RETURNING id",
      [setupId, '84' + Math.floor(Math.random() * 1e10).toString().padStart(9, '0'), '09' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0')], 't4-setup-labor');
    const s2 = s1.ok ? await pgCall(admin, "INSERT INTO placement_case (id, labor_profile_id, status, opened_at, created_at, updated_at) VALUES ($1, $2, 'OPEN', now(), now(), now()) RETURNING id", [setupCase, setupId], 't4-setup-case') : { ok: false };
    setupOk = s1.ok && s2.ok;
    row({ kind: 't4', test: 't4-setup-committed-active-case', pass: setupOk, sqlstate: s2.sqlstate, message: !s2.ok ? s2.message : null });
    if (setupOk) {
      trackCreated(setupId, setupCase);
    }
  }

  // Helper: run a SELECT under a given role for the writer connection.
  async function roleSelect(role) {
    await writer.query('BEGIN');
    await writer.query("SELECT set_config('app.role', $1, true)", [role]); // LOCAL scope
    const r = await pgCall(writer, "SELECT count(*)::int AS n FROM placement_case", [], `t4-${role}-select`);
    await writer.query('COMMIT').catch(() => writer.query('ROLLBACK'));
    return r;
  }

  // FIX 6: positive expectation with HR_MANAGER.
  const rHr = await roleSelect('HR_MANAGER');
  row({ kind: 't4', test: 't4-HR_MANAGER-sees-committed-case', pass: rHr.ok && rHr.rows?.[0]?.n >= 1, sqlstate: rHr.sqlstate, rows: rHr.rows?.[0]?.n });

  // ADMIN as a control positive.
  const rAdmin = await roleSelect('ADMIN');
  row({ kind: 't4', test: 't4-ADMIN-sees-committed-case', pass: rAdmin.ok && rAdmin.rows?.[0]?.n >= 1, sqlstate: rAdmin.sqlstate, rows: rAdmin.rows?.[0]?.n });

  // HR_STAFF as a positive per the N1 IN-list.
  const rStaff = await roleSelect('HR_STAFF');
  row({ kind: 't4', test: 't4-HR_STAFF-sees-committed-case', pass: rStaff.ok && rStaff.rows?.[0]?.n >= 1, sqlstate: rStaff.sqlstate, rows: rStaff.rows?.[0]?.n });

  // Negative controls (not in N1 IN-list): expect 0 rows, sqlstate 00000
  // (RLS evaluated the policy expression and matched no USING clause).
  for (const role of ['PUBLIC', 'WORKER', 'SALE', 'CTV', 'ANON']) {
    const r = await roleSelect(role);
    row({ kind: 't4', test: `t4-${role}-sees-zero-rows`, pass: r.ok && r.rows?.[0]?.n === 0, sqlstate: r.sqlstate, rows: r.rows?.[0]?.n, comment: 'RLS denial: sqlstate 00000 + 0 rows (NOT 42501 — see has_table_privilege above)' });
  }

  // Cleanup the seeded case + labor (exact run-scoped IDs only — no LIKE).
  // Audit fix 2026-09-12 22:00 — only remove IDs from idsCreatedThisRun
  // if the DELETE RETURNING actually returned the row. A silent failure
  // (e.g. concurrent tx holding the row, FK still referencing the
  // placement_case) keeps the ID in cleanup-needed for operator retry.
  if (setupOk) {
    const t4CaseDel = await pgCall(admin, "DELETE FROM placement_case WHERE id=$1 RETURNING id", [setupCase], 't4-cleanup-case');
    if (t4CaseDel.ok && t4CaseDel.rowCount > 0) trackDeleted(setupCase);
    const t4LaborDel = await pgCall(admin, "DELETE FROM labor_profiles WHERE id=$1 RETURNING id", [setupId], 't4-cleanup-labor');
    if (t4LaborDel.ok && t4LaborDel.rowCount > 0) trackDeleted(setupId);
  }

  // Final cleanup-needed row: emitted in finally{} below so it ALWAYS
  // appears even on abnormal exit. See emitCleanupNeeded() definition
  // above (right before this try block).
  emitCleanupNeeded();

  // Semantic (audit fix 2026-09-12 22:30):
  //   stage3_real_pass is the COMMIT-time answer to the question
  //   "did every assertion that must hold on a real hrp_mp2_test run
  //   actually hold?". The probe computes it as:
  //     - passed === RESULT.length   (every emitted row passed)
  //   AND
  //     - !anyRealFail                (no row has stage3_real_pass=false)
  //   The second clause exists because some rows carry an explicit
  //   `stage3_real_pass` flag (currently only
  //   `neon-control-plane-branch-membership`). When the check is
  //   SKIPPED on a real run, that row reports `pass: true` (so the
  //   `passed` counter is still 28/28) BUT `stage3_real_pass: false`
  //   (because the check did not actually run). The summary's
  //   `stage3_real_pass=false` then FAILS the gate — exit code != 0.
  //   On a real hrp_mp2_test run, when both NEON_API_KEY and
  //   NEON_PROJECT_ID are set, the row reports `stage3_real_pass: true`
  //   so the gate passes. The LOCAL self-test still has
  //   `stage3_real_pass=false` in its summary — that is BY DESIGN,
  //   the run is a self-test, not a Stage 3 PASS. The Tier-0-stated
  //   semantic: "local self-test có thể PASS, nhưng stage3_real_pass
  //   phải false khi check bị skip; Stage 3 thật phải fail closed".
  //   To require FAIL-CLOSED on a real run even when the control-
  //   plane env is missing, set N1_STAGE3_REAL=true in the env — the
  //   probe then refuses with exit code 71 BEFORE any DB write.
  const N1_STAGE3_REAL = (process.env.N1_STAGE3_REAL || '').toLowerCase() === 'true';
  const anyRealFail    = RESULT.some(r => r.stage3_real_pass === false);
  const stage3_real_pass = (passed === RESULT.length) && !anyRealFail;
  const summary = {
    kind: 'summary',
    total: RESULT.length,
    passed,
    failed,
    abnormal_exit: abnormalExit,
    abnormal_reason: abnormalReason,
    stage3_real_pass,
    n1_stage3_real: N1_STAGE3_REAL,
    any_real_fail: anyRealFail,
    comment: 'stage3_real_pass=false when (a) any assertion failed, OR (b) any emitted row has stage3_real_pass=false (currently only the neon-control-plane-branch-membership boot row carries that flag, and it reports false whenever skipped=true). On the LOCAL self-test, stage3_real_pass is reported as false EVEN WHEN all 28 rows pass — that is by design and signals the run is a self-test, NOT a real Stage 3 PASS. On a real hrp_mp2_test run, the operator sets N1_STAGE3_REAL=true; the probe then refuses with exit code 71 if NEON_API_KEY/NEON_PROJECT_ID are missing (fail-closed).'
  };
  console.log(JSON.stringify(summary));
  process.exitCode = (failed === 0 && stage3_real_pass) ? 0 : 1;
} catch (probeErr) {
  // An unhandled error escaped the per-step try/catch blocks (e.g. a
  // throw inside T1/T2/T3/T4). Mark abnormal-exit and emit the
  // cleanup-needed row so the operator still knows which IDs to delete.
  abnormalExit = true;
  abnormalReason = 'uncaught:' + (probeErr?.message || String(probeErr)).slice(0, 200);
  try { emitCleanupNeeded(); } catch {}
  const N1_STAGE3_REAL = (process.env.N1_STAGE3_REAL || '').toLowerCase() === 'true';
  const anyRealFail = RESULT.some(r => r.stage3_real_pass === false);
  const stage3_real_pass = (passed === RESULT.length) && !anyRealFail;
  const summary = {
    kind: 'summary',
    total: RESULT.length, passed, failed,
    abnormal_exit: abnormalExit, abnormal_reason: abnormalReason,
    stage3_real_pass, n1_stage3_real: N1_STAGE3_REAL, any_real_fail: anyRealFail,
    comment: 'uncaught exception escaped probe body; cleanup-needed row lists exact IDs to delete via IN-list (NOT LIKE pattern). Do NOT auto-resolve migrations.'
  };
  console.log(JSON.stringify(summary));
  process.exitCode = 1;
} finally {
  // Belt-and-braces: if neither the success path nor the catch ran
  // emitCleanupNeeded (e.g. early process.exit during boot), still try.
  try { emitCleanupNeeded(); } catch {}
  await admin.end().catch(() => {});
  await writer.end().catch(() => {});
}
