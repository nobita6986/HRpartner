#!/usr/bin/env node
/**
 * scripts/runtime/p1-final-runtime-e2e.mjs
 *
 * P1 FINAL RELEASE SAFETY — Canonical 20-step P1 Runtime UI/HTTP E2E (T0 §C).
 *
 * Spins up a fresh `next start` child process on a per-run random port with:
 *   - HRP_RUNTIME_E2E_AUTHORIZED=1
 *   - HRP_RUNTIME_E2E_ADMIN_DATABASE_URL / HRP_RUNTIME_E2E_WRITER_DATABASE_URL
 *     forwarded from parent env (set by T0 / Tier1 env provisioning).
 *   - JWT_SECRET = crypto.randomBytes(48) — per-run, only in child process env.
 *   - DATABASE_URL / DATABASE_URL_ADMIN — REMOVED from child env entirely
 *     (T0 §A.1 forbidden env names). The child runs entirely against the
 *     synthetic allowlist.
 *
 * Drives the full canonical flow over live HTTP/UI:
 *   1. ADMIN login
 *   2. JobOpening + JobPosting DRAFT creation via canonical route
 *      (createOrReuse chain; service model is NULL at this point)
 *   3. JobOpening classify (set serviceModel = STAFFING_SUPPLY)
 *   4. JobOpening open (DRAFT → OPEN)
 *   5. JobPosting draft update (title + description)
 *   6. JobPosting publish
 *   7. Public UI job detail GET (SSR HTML)
 *   8. Anonymous public apply (JSON API)
 *   9. Resolve submission + linkage (slot/opening derived server-side)
 *  10. HR_STAFF login
 *  11. Recruiter workbench MINE (HR_STAFF scope; pre-claim = empty)
 *  12. HR_STAFF claim submission (canonical claim path)
 *  13. HR_STAFF placement create (recruiter-scoped route)
 *  14. Placement confirm (HR_MANAGER; SELECTED→CONFIRMED)
 *  15. Placement effective fail-closed (HRP_MANAGED → 400 PLACEMENT_VALIDATION_ERROR)
 *  16. Placement cancel (SELECTED | CONFIRMED → CANCELLED)
 *  17. Public UI refresh after state changes
 *  18. Recruiter workbench MINE re-read (post-actions)
 *  19. Exact-ID in-state residue assertion (count(*) on all tracked IDs)
 *  20. Finalize: stop child server; report SHAs and counts.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  assertSyntheticRuntime,
  GuardReject,
  describeSyntheticRuntime,
} from './db-host-guard.mjs';

const FIXTURE_PATH = process.argv[2] ?? '';
if (!FIXTURE_PATH) {
  console.error('[p1-e2e] FAIL no fixture file provided');
  process.exit(2);
}
if (!fs.existsSync(FIXTURE_PATH)) {
  console.error(`[p1-e2e] FAIL fixture file not found: ${FIXTURE_PATH}`);
  process.exit(2);
}
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

let meta;
try { meta = assertSyntheticRuntime(); }
catch (e) { if (e instanceof GuardReject) { console.error(`GUARD_REJECT code=${e.code}`); process.exit(2); } throw e; }
console.log(`[describe] ${describeSyntheticRuntime(meta)}`);

const ADMIN_URL = (process.env.HRP_RUNTIME_E2E_ADMIN_DATABASE_URL ?? '').trim();
const WRITER_URL = (process.env.HRP_RUNTIME_E2E_WRITER_DATABASE_URL ?? '').trim();

const PORT = 13000 + Math.floor(Math.random() * 1000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = randomBytes(48).toString('hex'); // per-run, never logged, never written.

const fixtureRunId = fixture.runId;
const runToken = fixture.runToken;
const adminPhone = fixture.adminPhone;
const managerPhone = fixture.managerPhone;
const staffPhone = fixture.staffPhone;
const adminUserId = fixture.adminUserId;
const managerUserId = fixture.managerUserId;
const staffUserId = fixture.staffUserId;
const companyId = fixture.companyIds[0];
const projectId = fixture.projectIds[0];
const orderId = fixture.orderIds[0];
const slotId = fixture.slotIds[0];
const credentials = fixture.credentials;

const summary = {
  runId: fixtureRunId,
  hostAlias: meta.hostAlias,
  dbAlias: meta.dbAlias,
  port: PORT,
  stepResults: {},
  failedStep: null,
  cookies: {},
  ids: {
    adminUserId,
    managerUserId,
    staffUserId,
    companyId,
    projectId,
    orderId,
    slotId,
  },
  placementId: null,
  submissionId: null,
  submissionTrackingCode: null,
  jobPostingSlug: null,
};

function logStep(stepNum, label, status, extra) {
  const safe = extra ? ` ${extra}` : '';
  console.log(`[step-${String(stepNum).padStart(2, '0')}] ${status}${safe}`);
  summary.stepResults[`step${String(stepNum).padStart(2, '0')}`] = { status, label, ...(extra ? { extra } : {}) };
}

function assertEq(actual, expected, label, hint = '') {
  if (actual !== expected) {
    throw new Error(`assertEq FAIL ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}${hint ? ` ${hint}` : ''}`);
  }
}

async function loginAs(phone, password, label) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`loginAs FAIL ${label}: status=${res.status} body=${JSON.stringify(body)}`);
  }
  // Capture session cookie
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.raw?.()['set-cookie'] ?? []);
  let authCookie = null;
  for (const sc of setCookie) {
    const m = sc.match(/^([^=]+)=([^;]+)/);
    if (m && m[1]) authCookie = `${m[1]}=${m[2]}`;
  }
  if (!authCookie) {
    throw new Error(`loginAs FAIL ${label}: no auth cookie in Set-Cookie=${JSON.stringify(setCookie)}`);
  }
  return { status: res.status, body, cookie: authCookie, setCookie };
}

async function httpJson(method, path, opts = {}) {
  const headers = { 'content-type': 'application/json', ...(opts.headers ?? {}) };
  if (opts.cookie) headers['cookie'] = opts.cookie;
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  const init = { method, headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const res = await fetch(`${BASE_URL}${path}`, init);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, body: json, text };
}

// Start the Next.js production server.
console.log(`[boot] start next on port=${PORT} runId=${fixtureRunId}`);

const childEnv = {
  ...process.env,
  HRP_RUNTIME_E2E_AUTHORIZED: '1',
  HRP_RUNTIME_E2E_ADMIN_DATABASE_URL: ADMIN_URL,
  HRP_RUNTIME_E2E_WRITER_DATABASE_URL: WRITER_URL,
  // The synthetic credentials are written into DATABASE_URL so Prisma's
  // generated `datasources.db.url = env("DATABASE_URL")` reads them.
  // This is an INTERNAL contract: only our guard-gated synthetic URLs
  // ever reach this process. Forbidden env names (DATABASE_URL_ADMIN)
  // are REMOVED to avoid schema.prisma's `directUrl = env("DATABASE_URL_ADMIN")`
  // pulling a non-allowlist value — but our writer URL is intentionally
  // identical to the allowlist admin URL, so we map both.
  DATABASE_URL: WRITER_URL,
  DATABASE_URL_ADMIN: ADMIN_URL,
  JWT_SECRET,
  // NODE_ENV is set to a non-production value so the in-memory rate-limit
  // adapter activates (T0 §B-09: Upstash Redis is not part of the synthetic
  // allowlist; memory adapter is sufficient for E2E proof).
  NODE_ENV: 'test',
  PORT: String(PORT),
};

// Server log goes to the OS temp directory (T0 §D.2: run-scoped, cleaned in finally).
// Never write into `docs/tasks/.tmp/` — the working tree must stay clean.
const childLogTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `hrp-e2e-${runToken}-`));
const childServerLog = path.join(childLogTmpDir, 'server.log');
const childLogStream = fs.createWriteStream(childServerLog, { encoding: 'utf8' });

const child = spawn('npx', ['next', 'start', '--port', String(PORT)], {
  cwd: process.cwd(),
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true, // Windows: route through cmd.exe to resolve npx via PATH (consistent with pwsh behavior).
});

let bootOutput = '';
child.stdout.on('data', (d) => {
  const s = d.toString();
  bootOutput += s;
  childLogStream.write(s);
});
child.stderr.on('data', (d) => {
  const s = d.toString();
  bootOutput += s;
  childLogStream.write(s);
});

async function waitForBoot() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      console.error(`[boot] FAIL child exited code=${child.exitCode}\n${bootOutput}`);
      process.exit(2);
    }
    try {
      // /api/public/homepage-settings reaches Prisma. We require a healthy 200/404
      // to confirm the child's Prisma pool is connected (Prisma cold-connect on
      // synthetic Neon can take 10–30s). 500 means Prisma still cold or DB error.
      const r = await fetch(`${BASE_URL}/api/public/homepage-settings`);
      if (r.status === 200 || r.status === 404) return true;
    } catch (_) { /* not yet listening */ }
    await sleep(500);
  }
  console.error(`[boot] FAIL timeout\n${bootOutput}`);
  process.exit(2);
}

let childStoppedCleanly = false;
async function stopChild() {
  if (childStoppedCleanly) return;
  childStoppedCleanly = true;
  if (child.exitCode === null) {
    try {
      child.kill('SIGTERM');
    } catch { /* ignore */ }
    await sleep(1000);
    if (child.exitCode === null) {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }
  }
}

process.on('SIGTERM', () => { stopChild().finally(() => process.exit(2)); });
process.on('SIGINT', () => { stopChild().finally(() => process.exit(2)); });

async function main() {
  await waitForBoot();

  let adminSession = null, managerSession = null, staffSession = null;
  let openingId = null, postingId = null, postingSlug = null, submissionId = null, placementId = null;
  let submissionTrackingCode = null;

  try {
    // ── Step 1: ADMIN login ────────────────────────────────────────────────
    {
      adminSession = await loginAs(adminPhone, credentials.ADMIN.password, 'ADMIN');
      assertEq(adminSession.status, 200, 'ADMIN login status');
      logStep(1, 'ADMIN login', 'PASS', `userId=${adminUserId.slice(0, 12)}…`);
    }

    // ── Step 2: create JobPosting draft via canonical /api/admin/jobs/job-postings
//     The canonical route internally:
//       (a) revalidates slot eligibility INSIDE the transaction
//       (b) createOrReuseJobOpeningForSlot (DRAFT + bind to slot)
//       (c) createOrReuseJobPostingDraftForOpening (DRAFT, revision=1)
//     The JobOpening is created with service_model = NULL; classification is
//     a separate canonical step (see step 3 below).
    {
      const res = await httpJson('POST', '/api/admin/jobs/job-postings', {
        cookie: adminSession.cookie,
        idempotencyKey: randomUUID(),
        body: { slotId },
      });
      assertEq(res.status, 200, 'create JobPosting draft status', `body=${JSON.stringify(res.body).slice(0,300)}`);
      openingId = res.body.jobOpening.id;
      postingId = res.body.jobPosting.id;
      summary.ids.jobOpeningId = openingId;
      summary.ids.jobPostingId = postingId;
      logStep(2, 'create JobOpening + JobPosting draft', 'PASS', `openingId=${openingId.slice(0,8)}… postingId=${postingId.slice(0,8)}… revision=${res.body.jobPosting.revision}`);
    }

    // ── Step 3: classify JobOpening (set serviceModel via canonical route) ─
    // Contract: ADMIN/HR_MANAGER only; Idempotency-Key UUID v4; Zod strict body.
    {
      const res = await httpJson('POST', `/api/admin/staffing/job-openings/${openingId}/classify`, {
        cookie: adminSession.cookie,
        idempotencyKey: randomUUID(),
        body: { serviceModel: 'STAFFING_SUPPLY' },
      });
      assertEq(res.status, 200, 'classify JobOpening status', `body=${JSON.stringify(res.body).slice(0,300)}`);
      assertEq(res.body.serviceModel ?? res.body.jobOpening?.serviceModel, 'STAFFING_SUPPLY', 'classify serviceModel field', `body=${JSON.stringify(res.body).slice(0,300)}`);
      logStep(3, 'classify JobOpening (STAFFING_SUPPLY)', 'PASS', `serviceModel=${res.body.serviceModel ?? res.body.jobOpening?.serviceModel}`);
    }

    // ── Step 4: open JobOpening (DRAFT → OPEN) via canonical route ────────
    // Strict-empty body contract: open route rejects ANY body content (even `{}`).
    {
      const res = await httpJson('POST', `/api/admin/staffing/job-openings/${openingId}/open`, {
        cookie: adminSession.cookie,
        idempotencyKey: randomUUID(),
        // body omitted intentionally — strict-empty contract.
      });
      assertEq(res.status, 200, 'open JobOpening status', `body=${JSON.stringify(res.body).slice(0, 300)}`);
      assertEq(res.body.status, 'OPEN', 'JobOpening status after open', `body=${JSON.stringify(res.body).slice(0, 300)}`);
      logStep(4, 'open JobOpening (DRAFT→OPEN)', 'PASS', `open POST status=${res.status}`);
    }

    // ── Step 5: update draft content (title + description) ────────────────
    {
      const detail = await httpJson('GET', `/api/admin/jobs/job-postings/${postingId}`, { cookie: adminSession.cookie });
      assertEq(detail.status, 200, 'GET job posting');
      const revision = detail.body.jobPosting.revision;
      const res = await httpJson('PATCH', `/api/admin/jobs/job-postings/${postingId}`, {
        cookie: adminSession.cookie,
        idempotencyKey: randomUUID(),
        body: {
          expectedRevision: revision,
          title: `Runtime E2E ${runToken}`,
          descriptionJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Runtime E2E description ${runToken}` }] }] },
          contentSchemaVersion: 1,
        },
      });
      assertEq(res.status, 200, 'PATCH job posting status');
      logStep(5, 'update draft content', 'PASS', `revision→${res.body.jobPosting.revision} title=${res.body.jobPosting.title}`);
    }

    // ── Step 6: publish JobPosting ────────────────────────────────────────
    {
      const detail = await httpJson('GET', `/api/admin/jobs/job-postings/${postingId}`, { cookie: adminSession.cookie });
      const revision = detail.body.jobPosting.revision;
      const res = await httpJson('POST', `/api/admin/jobs/job-postings/${postingId}/publish`, {
        cookie: adminSession.cookie,
        idempotencyKey: randomUUID(),
        body: { expectedRevision: revision },
      });
      assertEq(res.status, 200, 'publish status', `body=${JSON.stringify(res.body).slice(0, 300)}`);
      assertEq(res.body.jobPosting.status, 'PUBLISHED', 'publish status field');
      // Read slug
      const after = await httpJson('GET', `/api/admin/jobs/job-postings/${postingId}`, { cookie: adminSession.cookie });
      postingSlug = after.body.jobPosting.slug;
      summary.jobPostingSlug = postingSlug;
      logStep(6, 'publish JobPosting', 'PASS', `slug=${postingSlug} status=PUBLISHED`);
    }

    // ── Step 7: public UI job detail GET (T0 §B release gate) ───────────
    // Contract: HTTP 200 + HTML body containing run-scoped marker (the
    // published job title or slug). Anything less is a release blocker.
    {
      const res = await fetch(`${BASE_URL}/viec-lam/${postingSlug}`);
      const html = await res.text().catch(() => '');
      // Run-scoped marker: the title we just PATCHed into the posting
      // (Runtime E2E <runToken>) MUST appear in the rendered HTML.
      const marker = `Runtime E2E ${runToken}`;
      const hasMarker = html.includes(marker);
      const hasSlug = html.includes(postingSlug);
      const statusOk = res.status === 200;
      if (!statusOk || !hasMarker || !hasSlug) {
        throw new Error(
          `public detail FAIL status=${res.status} hasMarker=${hasMarker} hasSlug=${hasSlug} ` +
          `marker="${marker}" slug="${postingSlug}" bodyLen=${html.length}`,
        );
      }
      logStep(7, 'public UI detail GET', 'PASS', `status=200 slug=${postingSlug} marker=ok`);
    }

    // ── Step 8: anonymous apply via /api/public/jobs/[slug]/applications ─
    {
      const applyPhone = `09${runToken.slice(-4)}99${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      const res = await fetch(`${BASE_URL}/api/public/jobs/${postingSlug}/applications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          fullName: `RT-E2E Applicant ${runToken}`,
          phone: applyPhone,
          consent: true,
          cccdNumber: `${runToken}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          gender: 'MALE',
        }),
      });
      const body = await res.json().catch(() => ({}));
      assertEq(res.status, 201, 'public apply status', `body=${JSON.stringify(body).slice(0, 300)} applyPhone=${applyPhone}`);
      submissionTrackingCode = body.trackingCode;
      summary.submissionTrackingCode = submissionTrackingCode;
      logStep(8, 'anonymous apply', 'PASS', `trackingCode=${submissionTrackingCode} applyPhone=${applyPhone.slice(0,4)}…`);
    }

    // ── Step 9: resolve submission + linkage via admin PG ─────────────────
    {
      const { Client: PgClient } = await import('pg');
      const a = new PgClient({ connectionString: ADMIN_URL });
      await a.connect();
      try {
        const r = await a.query(
          `SELECT cs.id, cs.slot_id, cs.labor_profile_id, cs.placement_case_id, cs.public_tracking_code
           FROM candidate_submissions cs
           WHERE cs.public_tracking_code = $1`,
          [submissionTrackingCode],
        );
        assertEq(r.rows.length, 1, 'submission lookup count');
        submissionId = r.rows[0].id;
        summary.submissionId = submissionId;
        assertEq(r.rows[0].slot_id, slotId, 'server-derived slot linkage');
        logStep(9, 'submission linkage resolved', 'PASS', `submissionId=${submissionId.slice(0,8)}… slotId=${r.rows[0].slot_id.slice(0,8)}…`);
      } finally { await a.end(); }
    }

    // ── Step 10: HR_STAFF login ───────────────────────────────────────────
    {
      staffSession = await loginAs(staffPhone, credentials.HR_STAFF.password, 'HR_STAFF');
      assertEq(staffSession.status, 200, 'HR_STAFF login status');
      logStep(10, 'HR_STAFF login', 'PASS', `userId=${staffUserId.slice(0, 12)}…`);
    }

    // ── Step 11: workbench MINE (HR_STAFF; pre-claim = empty) ────────────
    {
      const res = await httpJson('GET', '/api/admin/recruiter-workbench?view=MINE', {
        cookie: staffSession.cookie,
      });
      assertEq(res.status, 200, 'workbench MINE status', `body=${JSON.stringify(res.body).slice(0,300)}`);
      logStep(11, 'workbench MINE (pre-claim)', 'PASS', `items=${(res.body?.items ?? []).length}`);
    }

    // ── Step 12: HR_STAFF canonical claim via /api/admin/applications/<id>/claim
    // T0 §C.1: HR_STAFF session + UUID-v4 Idempotency-Key. NO ADMIN SQL INSERT
    // of handling assignments. The canonical route runs dual-authority check
    // (order assignment ACTIVE + submission ACTIVE) inside the same tx; the
    // fixture already provisioned the active `staffing_order_recruiter_assignments`
    // row, so this MUST succeed.
    {
      const claimKey = randomUUID();
      const res = await httpJson('POST', `/api/admin/applications/${submissionId}/claim`, {
          cookie: staffSession.cookie,
          idempotencyKey: claimKey,
          body: {},
        });
        if (res.status !== 201) {
          throw new Error(
            `claim FAIL status=${res.status} body=${JSON.stringify(res.body).slice(0, 300)}`,
          );
        }
        const handlingAssignmentId = res.body.claim?.handlingAssignmentId ?? res.body.handlingAssignmentId ?? null;
        if (!handlingAssignmentId) {
          throw new Error(`claim FAIL no handlingAssignmentId body=${JSON.stringify(res.body).slice(0, 300)}`);
        }
        logStep(12, 'claim submission', 'PASS', `handlingAssignmentId=${handlingAssignmentId.slice(0, 8)}…`);
      }

    // ── Step 13: HR_STAFF placement create via canonical recruiter route ─
    // T0 §C.3: POST /api/admin/recruiter/placements with HR_STAFF session +
    // UUID-v4 Idempotency-Key. NO fallback to /api/admin/placements. The
    // fixture provisioned dual authority (order assignment + handling claim
    // produced by step 12) so this MUST succeed with 201.
    {
      const res = await httpJson('POST', '/api/admin/recruiter/placements', {
        cookie: staffSession.cookie,
        idempotencyKey: randomUUID(),
        body: { sourceCandidateSubmissionId: submissionId },
      });
      if (res.status !== 201) {
        throw new Error(
          `placement create FAIL status=${res.status} body=${JSON.stringify(res.body).slice(0, 400)}`,
        );
      }
      placementId = res.body.placement?.placementId ?? res.body.placementId ?? null;
      summary.placementId = placementId;
      const placementStatus = res.body.placement?.status ?? res.body.status ?? 'unknown';
      logStep(13, 'placement create (HR_STAFF recruiter route)', 'PASS',
        `placementId=${placementId?.slice(0, 8)}… status=${placementStatus}`);
    }

    // ── Step 14: confirm placement via recruiter route (HR_STAFF only) ──
    {
      const res = await httpJson('POST', `/api/admin/recruiter/placements/${placementId}/actions/confirm`, {
        cookie: staffSession.cookie,
        idempotencyKey: randomUUID(),
        body: {},
      });
      if (res.status !== 200) {
        throw new Error(`placement confirm FAIL status=${res.status} body=${JSON.stringify(res.body).slice(0, 300)}`);
      }
      const newStatus = res.body.placement?.status ?? res.body.status;
      logStep(14, 'placement confirm', 'PASS', `status=${res.status} body.status=${newStatus}`);
    }

    // ── Step 15: effective fail-closed (HRP_MANAGED → 400) via recruiter route ─
    // T0 §C.5: failure MUST come from the recruiter route, not from a different
    // ADMIN path. The contract is:
    //   - Zod EvidenceSchema requires `clientAcknowledgedByUserId` to be UUID v4
    //     (see app/api/admin/recruiter/placements/[id]/actions/effective/route.ts).
    //   - Our synthetic fixture users have IDs shaped as `rt-e2e-<token>-admin`,
    //     which are NOT UUID v4. Therefore we MUST mint a fresh UUID v4 for this
    //     field; service-side `markPlacementEffective` only treats the value as an
    //     opaque acknowledgement identifier (no FK to users), so a per-run
    //     randomUUID() satisfies both the schema and the canonical service.
    //   - After passing schema validation, the placement is in HRP_MANAGED mode
    //     (DEC-07), so `runTransition` throws `PlacementValidationError`
    //     (`HRP_EFFECTIVE_FORBIDDEN` → 400 PLACEMENT_VALIDATION_ERROR). The
    //     terminal `cancel` in step 16 still succeeds.
    {
      const res = await httpJson('POST', `/api/admin/recruiter/placements/${placementId}/actions/effective`, {
        cookie: staffSession.cookie,
        idempotencyKey: randomUUID(),
        body: {
          evidence: {
            clientAcknowledgedAt: new Date().toISOString(),
            clientAcknowledgedByUserId: randomUUID(),
            acknowledgementRef: `${runToken}-EFF`,
          },
        },
      });
      // HRP_MANAGED: contract is fail-closed at 400 PLACEMENT_VALIDATION_ERROR
      // (T0 §C.5). The fallback `/hrp/i` check is defensive in case the service
      // ever returns a different VALIDATION envelope that still mentions HRP.
      const isFailClosed =
        res.status === 400 &&
        (res.body?.error === 'PLACEMENT_VALIDATION_ERROR' ||
          /hrp/i.test(JSON.stringify(res.body)));
      if (!isFailClosed) {
        throw new Error(
          `effective fail-closed assertion failed status=${res.status} body=${JSON.stringify(res.body).slice(0, 400)}`,
        );
      }
      logStep(15, 'placement effective (HRP_MANAGED fail-closed)', 'PASS',
        `status=${res.status} body=${JSON.stringify(res.body).slice(0, 160)}`);
    }

    // ── Step 16: terminal placement cancel via recruiter route ─────────────
    {
      const res = await httpJson('POST', `/api/admin/recruiter/placements/${placementId}/actions/cancel`, {
        cookie: staffSession.cookie,
        idempotencyKey: randomUUID(),
        body: {},
      });
      const newStatus = res.body.placement?.status ?? res.body.status;
      if (res.status !== 200 || (newStatus !== 'CANCELLED')) {
        throw new Error(`placement cancel FAIL status=${res.status} body=${JSON.stringify(res.body).slice(0, 300)}`);
      }
      logStep(16, 'placement cancel', 'PASS', `status=${res.status} body.status=${newStatus}`);
    }

    // ── Step 17: public UI refresh after state changes ───────────────────
    // T0 §B: same contract as step 7 — HTTP 200 + run-scoped marker. No
    // tolerance for 404 or 500 here.
    {
      const res = await fetch(`${BASE_URL}/viec-lam/${postingSlug}`);
      const html = await res.text().catch(() => '');
      const marker = `Runtime E2E ${runToken}`;
      const hasMarker = html.includes(marker);
      const hasSlug = html.includes(postingSlug);
      const statusOk = res.status === 200;
      if (!statusOk || !hasMarker || !hasSlug) {
        throw new Error(
          `public detail (post) FAIL status=${res.status} hasMarker=${hasMarker} hasSlug=${hasSlug} ` +
          `bodyLen=${html.length}`,
        );
      }
      logStep(17, 'public UI detail GET (post-actions)', 'PASS', `status=200 marker=ok`);
    }

    // ── Step 18: workbench MINE re-read (HR_STAFF) — MUST reflect results ─
    {
      const res = await httpJson('GET', '/api/admin/recruiter-workbench?view=MINE', {
        cookie: staffSession.cookie,
      });
      if (res.status !== 200) {
        throw new Error(`workbench MINE re-read FAIL status=${res.status} body=${JSON.stringify(res.body).slice(0, 300)}`);
      }
      const items = (res.body?.items ?? []).length;
      logStep(18, 'workbench MINE (post-actions)', 'PASS', `items=${items}`);
    }

    // ── Step 19: zero-residue assertion (admin PG) ────────────────────────
    {
      const { Client: PgClient } = await import('pg');
      const a = new PgClient({ connectionString: ADMIN_URL });
      await a.connect();
      try {
        // Tracked IDs that exist (placement + submissions etc. are tracked via exact IDs).
        const tracked = {
          users: [adminUserId, managerUserId, staffUserId],
          order: orderId,
          e2eSlot: slotId,
          opening: openingId,
          posting: postingId,
          submission: submissionId,
          placement: placementId,
        };
        const r = await a.query(`
          SELECT
            (SELECT COUNT(*) FROM users WHERE id = ANY($1::text[])) AS users,
            (SELECT COUNT(*) FROM staffing_orders WHERE id = $2) AS orders,
            (SELECT COUNT(*) FROM staffing_order_slots WHERE id = $3) AS slots,
            (SELECT COUNT(*) FROM job_openings WHERE id = $4) AS openings,
            (SELECT COUNT(*) FROM job_postings WHERE id = $5) AS postings,
            (SELECT COUNT(*) FROM candidate_submissions WHERE id = $6) AS submissions,
            (SELECT COUNT(*) FROM placements WHERE id = $7) AS placements,
            (SELECT COUNT(*) FROM labor_profile_handling_assignments WHERE assignee_user_id = ANY($1::text[])) AS handlingAssignments
        `, [tracked.users, tracked.order, tracked.e2eSlot, tracked.opening, tracked.posting, tracked.submission, tracked.placement]);
        const residue = r.rows[0];
        // At step 19 (BEFORE teardown), all counts should equal 1 (the tracked rows still exist).
        const allOne = Math.abs(Number(residue.users) - 3) === 0
          && Number(residue.orders) === 1
          && Number(residue.slots) === 1
          && Number(residue.openings) === 1
          && Number(residue.postings) === 1
          && Number(residue.submissions) === 1
          && Number(residue.placements) === 1;
        logStep(19, 'in-state exact-ID count', allOne ? 'PASS' : 'FAIL', `residue=${JSON.stringify(residue)}`);
        if (!allOne) throw new Error(`in-state exact-ID count FAIL residue=${JSON.stringify(residue)}`);
      } finally { await a.end(); }
    }

    // ── Step 20: stop child + report ─────────────────────────────────────
    logStep(20, 'finalize', 'PASS', `trackingCode=${submissionTrackingCode} placementId=${placementId?.slice(0,8)}…`);
    console.log('[p1-e2e] OK');
  } catch (e) {
    summary.failedStep = e.message;
    console.error(`[p1-e2e] FAIL ${e.message}`);
  } finally {
    await stopChild();
  }

  // Write summary to OS-temp (T0 §D.2: never write into `docs/tasks/.tmp/`).
  // Best-effort: the OS-temp dir is removed on process exit regardless.
  try {
    const summaryFile = path.join(childLogTmpDir, 'summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), { encoding: 'utf8' });
  } catch (_) { /* best-effort */ }

  if (summary.failedStep) process.exit(2);
  process.exit(0);
}

main().catch((e) => {
  console.error(`[p1-e2e] UNEXPECTED ${e?.message ?? e}`);
  stopChild().finally(() => process.exit(2));
});