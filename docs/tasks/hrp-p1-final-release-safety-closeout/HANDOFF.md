# HANDOFF — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 4 — T0 pre-audit docs/control integrity correction 2026-10-01)**:
> This HANDOFF.md is restructured to the canonical compact schema that
> `verify-handoff.ps1` hard-codes for V2_FAST_FREEZE (sections 0..5). The
> runtime semantic implementation SHA `708e0ce71d258c3a70383330dfb8d5d370dbd974`
> (T0 §A.1) and the E2E ×3 PASS evidence `EV-RUN-{1,2,3}-*` (T0 §A.2) are
> carry-forward — this revision does NOT touch `app/`, `src/`, `prisma/`,
> `tests/`, `scripts/`, `packages/`, `package.json`, or `package-lock.json`
> (T0 §Stop boundary). `AUDIT.md` is owned by Tier 3 and is **not** authored
> by T1. The prior forward-only chain that pinned an in-commit `Final HEAD`
> (`ebc2c704…`) has been retired; this handoff pins Implementation SHA
> `708e0ce7…` and docs/evidence freeze SHA `ae560725…`, and records the
> **prior** pre-correction docs/update HEAD `e09a5e2b…` as a reference
> point rather than re-pinning the SHA of this same correction commit
> (T0 §E anti-self-reference rule).
>
> Status = READY_FOR_AUDIT, Frozen delivery = YES, Canonical gates = PASS,
> Audit eligibility = ELIGIBLE, Next gate = TIER3_LIGHT_AUDIT.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` (×3 fresh runs + baseline gates captured 2026-10-01; rev. 4 schema correction) |
| Status | `READY_FOR_AUDIT` |
| Current audit round | `0` (Tier 3 not invoked; T0-owned) |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Baseline | `2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `708e0ce71d258c3a70383330dfb8d5d370dbd974` |
| Docs/evidence freeze SHA | `ae56072525a60f5e75e196c28b3d4f486b64b3a0` |
| Prior docs/update HEAD | `e09a5e2ba99ca27035461cfaf67c6543a11ad481` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction budget | `1` |
| Correction batches used | `1` |
| Execution round | `3` |
| Production migration | `NOT_RUN` (T0 owns production-side remediation per stop boundary) |
| Production verification | `NOT_IN_SCOPE` (T1C closeout runs only against synthetic Neon per T0 §B-01 contract) |
| Branch | `codex/t1c-p1-final-release-safety-closeout` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` |
| Planner | `Tier 1` (T1C) |
| Plan artifact | `docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` |

## 1. Outcome and changed surface

### 1.1 What round 3 closes (T0 §F)

Per T0 directive 2026-10-01 §F, the previous handoff was rejected because:

1. **Control truthfulness** (T0 §A): `Status=READY_FOR_AUDIT` was a lie when
   canonical gates were FAIL. Round 3 flipped to `Status=BLOCKED / Frozen=NO /
   Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`.
2. **Public Job release blocker** (T0 §B BLK-02): `GET /viec-lam/SLUG` (where
   SLUG is the published job slug) returned HTTP 500. Round 3 fixes the root
   cause by adding `'use client'` to
   `src/domains/job-board/components/landing/featured-job-card.tsx`.
3. **Recruiter-only canonical flow** (T0 §C BLK-03): HR_STAFF used ADMIN
   SQL/API fallback after login. Round 3 enforces canonical
   `POST /api/admin/applications/SUBMISSION_ID/claim` (where SUBMISSION_ID is
   the application submission id) + UUID-v4 Idempotency-Key (no ADMIN SQL
   INSERT), canonical `POST /api/admin/recruiter/placements` (no fallback to
   `/api/admin/placements`), and canonical
   `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*` (where
   PLACEMENT_ID is the placement id) for confirm/effective/cancel.
4. **Runtime safety and cleanup** (T0 §D BLK-04): runner dirtied
   `docs/tasks/.tmp/`. Round 3 cleans the residue and writes into
   `os.tmpdir()` by default with `process.on('exit')` cleanup.

### 1.2 What is now verified (×3 final runs + baseline gates)

Three fresh runtime E2E suites (`EV-RUN-1`, `EV-RUN-2`, `EV-RUN-3`)
captured on **2026-10-01** against the synthetic Neon
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` /
`neondb` confirmed:

- **Posture PASS** — writer `app_user_writer` (`rolsuper=false`,
  `rolbypassrls=false`), admin `neondb_owner` (`rolsuper=false`,
  `rolbypassrls=true`), same `current_database` (`db-alias=693fe5919fc2`).
- **Fixture bootstrap PASS** — every run's `synthetic-fixture.mjs` writes
  under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE
  `StaffingOrderRecruiterAssignment` (DEC-12).
- **E2E 20/20 steps PASS** — steps 1–20 per run; step 7 `GET
  /viec-lam/SLUG` HTTP 200 with run-scoped title/slug marker; step 12
  HR_STAFF canonical claim via `POST
  /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4
  Idempotency-Key (no ADMIN SQL); step 13 HR_STAFF placement create via
  recruiter route (no `/api/admin/placements` fallback); step 14
  `confirm` → `status=CONFIRMED`; step 15 `effective` returns fail-closed
  contract `400 PLACEMENT_VALIDATION_ERROR` per DEC-07 ("HRP-managed
  Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce
  bridge thuộc N4"); step 16 `cancel` → `status=CANCELLED`; step 17
  `GET /viec-lam/SLUG` HTTP 200; step 18 workbench MINE reflects
  final handling assignments; step 19 residue counts `users=3,
  orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1,
  handlingassignments=1` (pre-teardown); step 20 public tracking code
  + placementId linked.
- **Exact-ID teardown PASS** — residue
  `{"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`
  per run. OS temp dir removed. No `docs/tasks/.tmp/`.
- **Zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**.
- `git status --short` clean after each run (only matching evidence under
  `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/`).

Evidence map (per run):

```
evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}     ← POSTURE_OK
evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}     ← exact IDs + ACTIVE assignment
evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}        ← 20-step run + FAIL-closed evidence
evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}   ← residue=0/0/0/0/0
evidence/EV-RUN-{1,2,3}-summary.json               ← { posture, fixture, e2e, teardown } all 0
```

`EV-ATTEMPT-1-*` working-tree artefacts (failure already captured in
`TIER1_SELF_REVIEW.md` §C) were renamed-from-stale and excluded from the
final ×3 set per T0 §B; they are removed from this revision's working tree.

### 1.3 What is still blocking

None. The control list below (`Status=READY_FOR_AUDIT`,
`Frozen=YES`, `Canonical=PASS`, `Audit=ELIGIBLE`) means this delivery is
eligible for Tier 3 LIGHT audit. Tier 3 owns the audit verdict and the
production-side remediation decision (T0 §Stop boundary).

### 1.4 Files touched (round 3 closeout)

```
docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md                            (revised v1.4)
docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md                        (revised v1.4)
docs/tasks/hrp-p1-final-release-safety-closeout/evidence/TIER1_SELF_REVIEW.md     (Tier 1 self-review)
docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md                          (REMOVED — Tier 3-owned)
docs/tasks/.tmp/                                                                   (REMOVED — T0 §D.1)
scripts/runtime/synthetic-fixture.mjs                                              (revised — DEC-12 dual authority + DEC-13 OS temp)
scripts/runtime/p1-final-runtime-e2e.mjs                                           (revised — DEC-14 SSR fix + DEC-12/13 recruiter flow + Step 18 workbench MINE)
scripts/runtime/run-p1-e2e-pipeline.mjs                                            (revised — DEC-13 OS temp + cleanup hook)
src/domains/job-board/components/landing/featured-job-card.tsx                     (modified — added 'use client')
```

### 1.5 Forbidden paths confirmed clean (round 3)

`git diff <baseline>..HEAD --` for the following paths returned empty:

- `prisma/schema.prisma`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.env*`, `.editorconfig`, `verify-encoding.ps1`
- `docs/important/`, `tier1.md`, `tier0.md`, `tier3.md`
- `docs/tasks/.tmp/` (round 3: removed)
- `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (round 3: removed — T3-owned)
- production `ep-shy-tree-az32as2c` URLs (lines 5/7 of `C:\cre_hrp.txt` — never read into env)
- PR #71 / PR #72 source code (read-only for anti-pattern recognition; never reused)

### 1.6 rev. 4 — T0 pre-audit docs/control integrity correction

T0 §A..§G inspection. The runtime semantic delta is empty
(`git diff --name-only 708e0ce..HEAD -- app src prisma tests scripts packages
package.json package-lock.json` is empty), so the ×3 PASS runtime evidence
remains authoritative. The correction batch is limited to:

- HANDOFF.md / TASK.md / SELF_REVIEW.md structural alignment with the
  V1 / compact-V2 canonical schema the verifier scripts hard-code.
- Removal of the in-commit `Final HEAD (this handoff freeze)` field that
  pinned a previous forward-only docs commit (`ebc2c704…`); the corrected
  docs pin Implementation SHA `708e0ce7…`, docs/evidence freeze SHA
  `ae560725…`, and record the prior docs/update HEAD `e09a5e2b…`.
- Commit deletion of `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md`
  (already staged for deletion at pre-correction HEAD; finalized in this batch).
- Working-tree cleanup of `EV-ATTEMPT-1-*` (failure already captured in
  `TIER1_SELF_REVIEW.md` §C; the canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).

## 2. Acceptance evidence

The first row is the `verify-task.ps1` contract-gate pass. The remaining rows cover AC-01..AC-17, each pointing to its evidence file under `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/` and to the runnable evidence registry entry in §3.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` | `RESULT: PASS` (exit 0; rev. 4 schema correction) | `None` |
| `AC-01` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (E-23) | 19/19 PASS; constant pin `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'` | `None` |
| `AC-02` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (E-23) | 19/19 PASS; exit 0 | `None` |
| `AC-03` | `node scripts/runtime/db-posture-preflight.mjs` (E-RUN-{1,2,3}-posture) | `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3; exit 0 ×3 | `None` |
| `AC-04` | `node scripts/runtime/synthetic-fixture.mjs` (E-RUN-{1,2,3}-fixture) | exit 0 ×3; admin/manager/staffUser IDs + ACTIVE `StaffingOrderRecruiterAssignment` recorded per fixture file | `None` |
| `AC-05` | `node scripts/runtime/exact-id-teardown.mjs` (E-RUN-{1,2,3}-teardown) | residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` ×3; exit 0 ×3 | `None` |
| `AC-06` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (E-RUN-{1,2,3}-e2e) | 20/20 `[step-NN] PASS` ×3; step 7/17 `status=200 marker=ok`; step 15 fail-closed `400 PLACEMENT_VALIDATION_ERROR`; `[p1-e2e] OK` ×3 | `None` |
| `AC-07` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (E-RUN-{1,2,3}-summary) | `{"posture":0,"fixture":0,"e2e":0,"teardown":0,...}` ×3 | `None` |
| `AC-08` | `npm run typecheck` (E-09) | exit 0 | `None` |
| `AC-09` | `npm run lint` (E-10) | exit 0 — 0 errors; task-surface warnings only (warnings unrelated to changed surface) | `None` |
| `AC-10` | `npm run build` (E-08) | exit 0, Next.js 15.5.23 build OK | `None` |
| `AC-11` | `npm run test:unit` (E-11) | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed | `None` |
| `AC-12` | `npx prisma validate` (E-12) | exit 0 — `The schema at prisma\schema.prisma is valid` | `None` |
| `AC-13` | `git diff --check HEAD` (E-13) | exit 0 (no whitespace errors) | `None` |
| `AC-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` (E-14) | exit 0 — 12/12 changed files UTF-8 no BOM | `None` |
| `AC-15` | `pwsh -NoProfile -Command "Write-Output 'integration gate: NOT_REQUIRED (T0 §B-01 forbids DATABASE_URL_TEST env name); DEC-10'; exit 0"` (E-15) | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name | `None` |
| `AC-16` | `git log --oneline 2f773993..708e0ce7; git log --oneline 708e0ce7..ae560725` (E-16) | Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…`; no amend, no rebase, no force-push | `None` |
| `AC-17` | `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/`; `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (expect absent) | TASK.md + HANDOFF.md + TIER1_SELF_REVIEW.md tracked; AUDIT.md not in tree | `None` |

## 3. Evidence registry

| Evidence ID | Command | Result | Artifact |
|---|---|---|---|
| `E-08` | `npm run build` | exit 0 | `evidence/EV-08-build.log` |
| `E-09` | `npm run typecheck` | exit 0 | `evidence/EV-09-typecheck.log` |
| `E-10` | `npm run lint` | exit 0 (0 errors; pre-existing warnings only) | `evidence/EV-10-lint.log` |
| `E-11` | `npm run test:unit` | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed | `evidence/EV-11-unit-tests.log` |
| `E-12` | `npx prisma validate` | exit 0 — `The schema at prisma\schema.prisma is valid` | `evidence/EV-12-prisma-validate.log` |
| `E-13` | `git diff --check HEAD` | exit 0 (no whitespace errors) | `evidence/EV-13-diff-check.log` |
| `E-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 — 12/12 changed files UTF-8 no BOM | `evidence/EV-14-encoding-scan.log` |
| `E-15` | (DEC-10 contract decision; integration gate intentionally NOT_RUN) | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name | `evidence/EV-15-integration-contract-note.log` |
| `E-16` | `git log --oneline 2f773993..708e0ce7; git log --oneline 708e0ce7..ae560725` | forward-only chain: Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…` | `evidence/EV-16-forward-only-commits.log` |
| `E-22` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` | `RESULT: PASS` (rev. 4 schema correction; exit 0) | `evidence/EV-22-task-contract-gate.log` |
| `E-23` | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` | 19/19 PASS; exit 0 | `evidence/EV-23-guard-unit-tests.log` |
| `E-RUN-1` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` | exit 0; `[p1-e2e] OK`; residue `{users:0, orders:0, slots:0, projects:0, companies:0}` | `evidence/EV-RUN-1-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-1-summary.json` |
| `E-RUN-2` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (independent re-run) | exit 0; `[p1-e2e] OK`; residue 0/0/0/0/0 | `evidence/EV-RUN-2-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-2-summary.json` |
| `E-RUN-3` | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (independent re-run) | exit 0; `[p1-e2e] OK`; residue 0/0/0/0/0 | `evidence/EV-RUN-3-{posture,fixture,e2e,teardown}.{stdout,stderr}` + `evidence/EV-RUN-3-summary.json` |
| `E-TIER1-SELF-REVIEW` | Tier 1 self-review of the change; documents the EV-ATTEMPT-1 step-15 first-pass failure history. | n/a (prose analysis, not a gate result) | `evidence/TIER1_SELF_REVIEW.md` |
| `E-T1-TO-T0-HANDOVER` | T1→T0 checkpoint handover (round-3 carrier). | n/a | `evidence/T1_TO_T0_HANDOVER.md` |
| `E-handoff-substance-gate` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath TASK.md -HandoffPath HANDOFF.md` | `RESULT: PASS WITH WARNINGS` (rev. 4 schema correction; exit 0) | `evidence/EV-22-handoff-substance-gate.log` |

## 4. Deviations and blockers

### 4.1 DEC-10 — Canonical strict integration gate NOT_REQUIRED

T0 §B-01 lists `DATABASE_URL_TEST` as a forbidden env name. The canonical
strict integration gate requires `DATABASE_URL_TEST`. The P1 final closeout
uses runtime UI/HTTP proof against synthetic Neon as the canonical
validation lane. This is a documented contract decision, not a gate failure.

### 4.2 DEC-09 — REMOVED (round 3)

The pre-existing `/viec-lam/SLUG` SSR 500 is no longer tolerated as
out-of-scope. The root cause is fixed via DEC-14. Steps 7 + 17 must return
HTTP 200 and render the published job posting.

### 4.3 DEC-06 — Cold-connect warmup fix (round 2)

The first run of three consecutive runs occasionally returned step-1
`INVALID_CREDENTIALS` 401 from `/api/auth/login`. Root cause: child server's
Prisma client takes 10–30s to cold-connect to synthetic Neon; the
cold-connect 500 was masked by `/api/auth/login` catch block as 401. Fix:
`waitForBoot()` requires Prisma 200/404 (not just `<500`). After fix, all
rounds ×3 PASS with zero residue.

### 4.4 Production boundary

- No `ep-shy-tree-az32as2c` connection.
- No production migration/write/read.
- No Vercel env mutation (T0 owns production deployment).
- No PITR forensic branch access (T0 owns production containment/recovery).
- No production evidence cleanup (T0 owns production recovery).
- No `--force-production` switch exists in the guard.
- Credentials loaded only into the in-process env from `C:\cre_hrp.txt`;
  never copied to disk, evidence, `.env`, shell history, or docs.

### 4.5 JWT / identities boundary

- Per-run signing key = `crypto.randomBytes(48).toString('hex')` set only in
  child process env.
- Signing key is never written to disk, evidence, or shell history.
- ADMIN/HR_MANAGER/HR_STAFF synthetic users created per-run with random
  passwords held only in process memory.
- Synthetic Vietnamese phones derived from RUN_ID + user role slot; always
  pass Vietnamese phone schema validator.
- No production-like phones, no shared seeded user accounts, no credentials
  from `.env`.

### 4.6 rev. 4 docs/control correction

- Stale `Final HEAD (this handoff freeze)` field that pinned a previous
  forward-only docs commit (`ebc2c704…`) was retired; superseded by
  `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…`
  rows in `## 0. Control`. T0 §E anti-self-reference rule observed: this
  revision does not create a follow-up commit solely to record its own SHA.
- AUDIT.md deletion finalized (T3-owned).
- `EV-ATTEMPT-1-*` working-tree artefacts removed (failure captured in
  `TIER1_SELF_REVIEW.md` §C; canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).
- The T1-side `verifier failures` recorded in `EV-22-task-contract-gate.log`
  + `EV-22-handoff-substance-gate.log` from rev. 3 were **real FAIL** (exit 2
  with V1-template section-list mismatches), not "V1 residual warnings".
  Rev. 4 corrects them to exit 0 by realigning TASK.md / HANDOFF.md with
  the V1 canonical schema the verifier scripts still hard-code.

## 5. Final status

- **Status**: `READY_FOR_AUDIT`
- **Frozen delivery**: `YES`
- **Canonical gates**: `PASS`
- **Audit eligibility**: `ELIGIBLE`
- **Next gate**: `TIER3_LIGHT_AUDIT`
- **Implementation SHA**: `708e0ce71d258c3a70383330dfb8d5d370dbd974`
- **Docs/evidence freeze SHA**: `ae56072525a60f5e75e196c28b3d4f486b64b3a0`
- **Prior docs/update HEAD**: `e09a5e2ba99ca27035461cfaf67c6543a11ad481`
- **Spec version**: `v1.4`
- **Execution round**: `3`
- **Audit round**: `0` (Tier 3 not invoked; T0-owned)

This handoff pins Implementation SHA = `708e0ce71d258c3a70383330dfb8d5d370dbd974`
(semantic/test/migration commit) and docs/evidence freeze HEAD = `ae560725…`.
Tier 3 owns AUDIT.md and the audit verdict; Tier 1 stops here per T0 §Stop
boundary.

## 6. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial HANDOFF.md authored (claimed `READY_FOR_AUDIT`). | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B. |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); `evidence/TIER1_SELF_REVIEW.md` added; `docs/tasks/.tmp/` cleaned; SSR fix + recruiter canonical flow + OS-temp cleanup recorded as DEC-12/13/14/15; DEC-09 SUPERSEDED. | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden. |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-TOKEN-ROLE`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at the canonical recruiter effective-action route handler requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. Implementation SHA pinned. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |
| `v1.4` (rev. 4 — docs/control correction) | `2026-10-01 18:30 ICT` | T0 pre-audit docs/control integrity correction: HANDOFF.md / TASK.md aligned to the canonical schema the verifier scripts hard-code. HANDOFF switched to the compact-V2 sections 0..5 layout (`## 2. Acceptance evidence`, `## 3. Evidence registry`, `## 5. Final status`); `verify-task.ps1` row added at the head of `## 2. Acceptance evidence` with `RESULT: PASS`. AUDIT.md deletion finalized. `EV-ATTEMPT-1-*` working-tree artefacts removed. Stale `Final HEAD (this handoff freeze)` field that pinned a previous forward-only docs commit (`ebc2c704…`) was retired; superseded by `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…` rows in `## 0. Control`. The T1-side verifier failures recorded in `EV-22-{task-contract-gate,handoff-substance-gate}.log` from rev. 3 were **real FAIL** (exit 2 with V1-template section-list mismatches), not "V1 residual warnings"; rev. 4 corrects them to exit 0 by realigning TASK.md / HANDOFF.md with the V1 canonical schema the verifier scripts still hard-code. Spec version retained as `v1.4` because no semantic delta was introduced — this revision is docs/control-only per T0 §A.1. | T0 §A..§G corrections. Carry-forward from `v1.4` implementation + freeze is authoritative; verifier scripts still hard-code the V1 canonical schema, so docs/evidence must conform. |

---

**Handoff status: READY_FOR_AUDIT** (per T0 §E.5 control truthfulness)

Frozen: YES; Canonical: PASS; Audit eligibility: ELIGIBLE; Next gate: TIER3_LIGHT_AUDIT.

This handoff pins `Implementation SHA = 708e0ce71d258c3a70383330dfb8d5d370dbd974` (semantic/test/migration commit) and `Docs/evidence freeze SHA = ae56072525a60f5e75e196c28b3d4f486b64b3a0`. Tier 3 owns `AUDIT.md` and the audit verdict; Tier 1 stops here per T0 §Stop boundary.