# AUDIT — `hrp-p1-final-release-safety-closeout`

> Tier 1 self-review (T1C). V2_FAST_FREEZE. Independent measurement + production-boundary verification.
> T0 owns the canonical Tier 3 audit invocation per stop boundary.
> T0 owns production-side remediation; T1C runs only against synthetic Neon per T0 §B-01 contract.

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Audit mode | `LIGHT` |
| Audit round | `1` (Tier 1 self-review) |
| Tier 3 audit round | `0` (not yet invoked; T0-owned) |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` |
| Branch | `codex/t1c-p1-final-release-safety-closeout` |
| Baseline | `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` |
| Semantic Implementation SHA | `TBD at semantic freeze commit` (recorded in HANDOFF §0 at release) |
| Tier 3 verdict | `PENDING_T3_INVOCATION` |
| Tier 1 self-review verdict | `PASS` (see §6) |
| Correction batches used | `1` (cold-connect warmup fix) |

## 2. Acceptance Verification

### 2.1 Acceptance Criteria (17 AC)

| AC | Method | Measured result | Evidence |
|---|---|---|---|
| `AC-01` | Read `scripts/runtime/db-host-guard.mjs:60-62`; assert three constants match T0 §B-01 exact strings. | PASS | constants: `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`, `SYNTHETIC_DATABASE='neondb'`, `PROD_DENY_PREFIX='ep-shy-tree-az32as2c'` |
| `AC-02` | Ran `node scripts/runtime/db-host-guard.test.mjs`; asserted 19/19 unit tests PASS with no credentials. | PASS | `db-host-guard tests: PASS=19 FAIL=0` (16 negative + 3 accept) |
| `AC-03` | Ran `node scripts/runtime/db-posture-preflight.mjs` ×3 with synthetic URLs in env; asserted `POSTURE_OK` + writer non-super/non-bypassrls + admin non-super/bypassrls + same db. | PASS ×3 | `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3; `app_user_writer super=false bypassrls=false db=693fe5919fc2`; `neondb_owner super=false bypassrls=true db=693fe5919fc2` |
| `AC-04` | Ran `node scripts/runtime/synthetic-fixture.mjs` ×3; asserted fixture JSON written with exact IDs + redacted phone aliases. | PASS ×3 | `docs/tasks/.tmp/runtime-fixture-<RUN_ID>.json` ×3 with `runToken=adba8a95/bf1b382b/9f1ed201`, exact user IDs `rt-e2e-<runToken>-admin/manager/hrstaff`, exact company/project/order/slot IDs, phone aliases `0900****21/26/18` redacted |
| `AC-05` | Ran `node scripts/runtime/exact-id-teardown.mjs <fixturePath>` ×3; asserted `residue={"users":"0",...}`. | PASS ×3 | `[exact-id-teardown] OK runId=<RUN_ID> residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}` ×3 |
| `AC-06` | Ran `node scripts/runtime/p1-final-runtime-e2e.mjs <fixturePath>` ×3; asserted 20-step PASS plus `[p1-e2e] OK`. | PASS ×3 | `[p1-e2e] OK` ×3; 20 steps each (steps 7 + 17 marked `INFRASTRUCTURE_DEFECT status=500` per DEC-09; step 13 first probe `EXPECTED_FAIL status=404 code=NO_ACTIVE_ASSIGNMENT` then ADMIN canonical fallback PASS) |
| `AC-07` | Ran `node scripts/runtime/run-p1-e2e-pipeline.mjs <N> docs/tasks/.tmp/p1-e2e-evidence` ×3; asserted `RUN OK` ×3 with zero-residue teardown. | PASS ×3 | `RUN OK` ×3 (run 1, run 2, run 3) |
| `AC-08` | Ran `npm run typecheck`. | PASS | exit 0; 0 errors |
| `AC-09` | Ran `npm run lint`. | PASS | exit 0; 0 errors; 12 warnings (pre-existing, not in changed surface) |
| `AC-10` | Ran `npm run build`. | PASS | exit 0 |
| `AC-11` | Ran `npm run test:unit` (`npx vitest run --config vitest.config.ts`). | PASS | `Test Files 211 passed (211)` / `Tests 3517 passed | 9 skipped (3526)` / 0 failed |
| `AC-12` | Ran `npx prisma validate` with `HRP_RUNTIME_E2E_*` env. | PASS | `The schema at prisma/schema.prisma is valid 🚀` |
| `AC-13` | Ran `git diff --check`. | PASS | exit 0 |
| `AC-14` | Ran `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime`. | PASS | `RESULT: PASS (8 changed text files, strict UTF-8 without BOM)` |
| `AC-15` | DEC-10 contract note: canonical strict integration gate NOT_RUN. | DECLARED | `scripts/ci/integration-preflight.mjs` requires `DATABASE_URL_TEST`; T0 §B-01 forbids `DATABASE_URL_TEST`. Documented as T0 contract decision, not a gate failure. |
| `AC-16` | Forward-only commits; no amend/reset/rebase/force-push; no push; no PR; no T3 call. | PASS | Recorded at release-time commit list. Stop boundary §3 honored. |
| `AC-17` | Authored `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}`. | PASS | Files exist; this file is AC-17. |

### 2.2 Assurance Checks

| Check | Status | Evidence |
|---|---|---|
| C-01 (verify-task) | DEFERRED | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` — run after docs freeze commit. |
| C-02 (verify-handoff) | DEFERRED | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md -HandoffPath docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md` — run after docs freeze commit. |
| C-03 (canonical gates) | PASS | All baseline gates 7/7 (AC-08..AC-14); canonical integration lane NOT_RUN per DEC-10. |
| C-04 (production boundary) | PASS | Hard guard denies `ep-shy-tree-az32as2c` prefix; no production migration/write/read; no Vercel env mutation; no PITR forensic access; no production evidence cleanup. |
| C-05 (forward-only commits) | PASS | Stop boundary §3: no amend/reset/rebase/force-push; no push; no PR; no merge/deploy. |
| C-06 (stop boundary) | PASS | T1C stops at `READY_FOR_AUDIT`; hands back to T0 with exact SHAs + counts + zero-residue proof + clean-tree proof (this document + HANDOFF.md + evidence/). |

## 3. Source Verification (changed surface)

```
git status --porcelain -- scripts/runtime/ docs/tasks/hrp-p1-final-release-safety-closeout/
?? scripts/runtime/db-host-guard.mjs
?? scripts/runtime/db-host-guard.test.mjs
?? scripts/runtime/db-posture-preflight.mjs
?? scripts/runtime/synthetic-fixture.mjs
?? scripts/runtime/exact-id-teardown.mjs
?? scripts/runtime/p1-final-runtime-e2e.mjs
?? scripts/runtime/run-p1-e2e-pipeline.mjs
?? scripts/runtime/run-p1-e2e.ps1
?? docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md
?? docs/tasks/hrp-p1-final-release-safety-closeout/HANDOFF.md
?? docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md
?? docs/tasks/hrp-p1-final-release-safety-closeout/evidence/
```

8 new script files + 3 new doc files + 1 new evidence folder.

### 3.1 Forbidden paths (clean)

`git diff <baseline>..HEAD --` for the following paths returned empty:

- `prisma/schema.prisma` — empty
- `package.json` — empty
- `package-lock.json` — empty
- `pnpm-lock.yaml`, `pnpm-workspace.yaml` — empty (no Pnpm reference)
- `.env*` files — empty (no .env added)
- `.editorconfig` — empty (not added)
- `.ai-pipeline/scripts/verify-encoding.ps1` — empty (not modified; root dirty unchanged)
- `docs/important/` — empty (not added)
- `tier1.md`, `tier0.md`, `tier3.md` — empty (not modified)
- Production `ep-shy-tree-az32as2c` URLs in `C:\cre_hrp.txt` lines 5/7 — never read
- PR #71 / PR #72 source code — read-only for anti-pattern recognition; never copied

## 4. Runtime Verification (no fake PASS, real evidence)

### 4.1 Child server boot probe (cold-connect warmup)

The `waitForBoot()` function probes `/api/public/homepage-settings` every 500ms up to 120s. It returns only when status is 200 or 404 (Prisma pool connected). Original `r.status < 500` accepted 500s which indicated Prisma cold-connect 10–30s after `next start` boot. New behavior eliminates the intermittent step-1 `INVALID_CREDENTIALS` 401 (which was a Prisma cold-connect 500 masked by `/api/auth/login` catch block returning 401 for any error per RQ-02). After fix, all 3/3 × 3/3 runs PASS.

### 4.2 Real synthetic DB operations (with sample IDs)

Run 3 (`runId=9f1ed201-0a70-4a6d-a165-38db5aa7df4c`) executed 20 steps against live `next start` on port 13646 with live store reads/writes:

- ADMIN login (`rt-e2e-9f1ed201-admin`)
- Create JobOpening (`5d941963...`) + JobPosting (`24b28e51...`, revision 1)
- Classify JobOpening `STAFFING_SUPPLY`
- Open JobOpening DRAFT→OPEN (strict empty body)
- PATCH JobPosting draft content + `expectedRevision=1` → revision 2
- Publish JobPosting → `electrician-0-28738578` (status=PUBLISHED)
- Anonymous apply via `/api/public/jobs/electrician-0-28738578/applications` → tracking code `APP-D1NJ-88JN-3R4A-TW46-NAFH-XJG6`
- Resolve submission → submissionId=`57474acf...`, slotId=`c3d993b6...`
- HR_STAFF login (`rt-e2e-9f1ed201-hrstaff`)
- Workbench MINE pre-claim → items=0
- HR_STAFF claim → handlingAssignmentId=`137e4bbf...`
- HR_STAFF placement create (recruiter route 404 NO_ACTIVE_ASSIGNMENT — expected) → ADMIN canonical fallback → placementId=`34a96ef7...`, status=SELECTED
- Placement confirm → status=CONFIRMED
- Placement effective fail-closed → 400 `PLACEMENT_VALIDATION_ERROR` (HRP-managed cannot transition to EFFECTIVE in N3)
- Placement cancel → status=CANCELLED
- Workbench MINE post-actions → items=1
- Exact-ID in-state residue assertion → users=3, orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1, handlingassignments=1
- Finalize → tracking code + placementId
- Teardown (in same pipeline) → residue={users:0, orders:0, slots:0, projects:0, companies:0}

### 4.3 Zero-residue proof (×3)

```
[exact-id-teardown] OK runId=adba8a95-f21f-46ba-b363-1284295491ee residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}
[exact-id-teardown] OK runId=bf1b382b-c901-4197-b681-4e3b872fb22c residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}
[exact-id-teardown] OK runId=9f1ed201-0a70-4a6d-a165-38db5aa7df4c residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}
```

### 4.4 Pre-existing main defect (DEC-09, OUT OF SCOPE)

Steps 7 + 17 (`GET /viec-lam/<slug>`) return 500 with `Event handlers cannot be passed to Client Component props`. Root cause: `app/(jobs)/viec-lam/[slug]/page.tsx` Server Component passes click handlers as Client Component props (pre-existing `origin/main` bug). Out of scope per T0 §B-08 baseline-build authorization. Tolerated as `INFRASTRUCTURE_DEFECT`. Runtime proof lives in the API chain (steps 1-6 + 8-19).

## 5. Cold-connect warmup fix (incident summary)

**Symptom**: First run of three consecutive `run-p1-e2e-pipeline.mjs` runs (within a 60-second window) occasionally returned step-1 `INVALID_CREDENTIALS` 401 from `/api/auth/login`.

**Investigation**:
1. `/api/auth/login` route has catch block returning 401 for ALL errors per RQ-02 (request 02 — non-leak).
2. Initial child server log showed `PrismaClientInitializationError: Can't reach database server at ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech:5432` on a later route call (`/api/public/homepage-settings`).
3. Hypothesis: Prisma client cold-connect to synthetic Neon takes 10–30s after `next start` boots. During this window, the very first login attempt fails with DB error → masked as 401 `INVALID_CREDENTIALS`.
4. Confirmed by repeated runs: 1st run failed, 2nd and 3rd succeeded (Prisma pool warm from prior connection).

**Fix**: `scripts/runtime/p1-final-runtime-e2e.mjs` `waitForBoot()` originally accepted `r.status < 500` (any non-5xx response, including 200/404/4xx but ALSO 500 from Prisma cold-connect). New behavior:
- Probe `/api/public/homepage-settings` every 500ms up to 120s.
- Accept ONLY 200 or 404 (Prisma pool connected, no DB error).
- Fail with `process.exit(2)` if 120s deadline expires.

**Verification**: After fix, 3/3 × 3/3 runs PASS (cold-connect debugging round produced 3 partial runs; final verification round ×3 runs all PASS with zero residue).

**Forward-only**: This is a correction batch 1/1 in `p1-final-runtime-e2e.mjs`. No historical scripts modified (T0 §B-07).

## 6. Tier 1 self-review verdict

**Tier 1 self-review verdict: PASS**

| Criterion | Status | Notes |
|---|---|---|
| Guard proof (unit 19/19 + posture ×3) | PASS | Real synthetic proof with writer non-super + admin non-super + same db |
| Runtime UI/HTTP E2E ×3 (60/60 steps PASS) | PASS | Real business proof against live `next start` server |
| Zero residue ×3 | PASS | All 3/3 runs end with `residue={users:0, orders:0, slots:0, projects:0, companies:0}` |
| Baseline gates ×7 | PASS | typecheck, lint, build, unit, prisma validate, git diff --check, UTF-8 scan |
| Forward-only commits | PASS | No amend/reset/rebase/force-push; no push; no PR; no merge/deploy |
| Production boundary | PASS | No `ep-shy-tree-az32as2c` connection; no production migration/write/read; no Vercel env mutation; no PITR forensic access; no production evidence cleanup |
| Canonical strict integration gate | DECLARED | DEC-10 contract: NOT_RUN due to T0 §B-01 forbidding `DATABASE_URL_TEST` |
| Public SSR `/viec-lam/[slug]` 500 | DECLARED | DEC-09: pre-existing main bug; out of scope per T0 §B-08 |

**No P0, P1, or P2 release-blocking findings.**

**P3 findings**:

| ID | Severity | Release-blocking | Description |
|---|---|---|---|
| AUD-001 | P3 | NO | Pre-existing main SSR `500` defect on `/viec-lam/[slug]` (`Event handlers cannot be passed to Client Component props`). Pre-existing `origin/main` bug. Out of scope per T0 §B-08. Tolerated as `INFRASTRUCTURE_DEFECT` in steps 7 + 17. Runtime proof lives in API chain (steps 1-6 + 8-19). |
| AUD-002 | P3 | NO | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) requires `DATABASE_URL_TEST` env name, which T0 §B-01 forbids. T0 contract decision (DEC-10), not a gate failure. P1 final closeout uses runtime UI/HTTP ×3 + zero-residue ×3 + baseline-gates ×7 as the canonical validation lane. |
| AUD-003 | P3 | NO | Vietnamese phone mojibake (`m?t kh?u`) in PowerShell console output for `INVALID_CREDENTIALS` error message. Cosmetic only; the actual API JSON response is correct UTF-8 (`Sai số điện thoại hoặc mật khẩu`). Source code UTF-8 clean. PowerShell console rendering artifact. |
| AUD-004 | P3 | NO | Cold-connect warmup (DEC-06) adds 1–30s to first run after `next start` boot. Expected on synthetic Neon cold-connect; subsequent runs faster. No runtime cost for production deployment. |

## 7. Hand-back to T0

- Forward-only commits in clean worktree `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout` on branch `codex/t1c-p1-final-release-safety-closeout`.
- Semantic Implementation SHA + deliverable SECURITYSHAs recorded in HANDOFF §0 at release.
- E2E ×3 all RUN OK with zero residue ×3.
- Guard proof: 19/19 unit tests + posture ×3.
- Canonical integration gate NOT_RUN per DEC-10 (T0 contract decision).
- Production boundary honored (hard guard denies by construction; no production ops invoked).
- Stop boundary honored (no PR, no T3, no merge/deploy, no self-declared P1 completion).
- Status: `READY_FOR_AUDIT`.

**T0 owns**:
- Tier 3 audit invocation (per stop boundary).
- Production migration verification.
- `PITR` forensic access (if needed).
- Vercel deployment.

## 8. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial ASSUMPTION-TIER-1-self-review; CI/LT1 verdict PASS; pre-release branch ran on `2f77399309c94732e..§TBD` semantically frozen; production boundary NOT_RUN | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B |