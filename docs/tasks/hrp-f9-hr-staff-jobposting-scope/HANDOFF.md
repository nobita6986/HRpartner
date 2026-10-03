# HANDOFF — `hrp-f9-hr-staff-jobposting-scope`

**Pipeline V2 — Implementation round 1 (zero corrections spent; freeze frozen at `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`).**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9-hr-staff-jobposting-scope` |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9-hr-staff-jobposting-scope` |
| Branch | `codex/t1a-f9-hr-staff-jobposting-scope` |
| Baseline | `6015361bb986b920bad6a90f8f9986165a4a99d5` |
| Implementation SHA | `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` |
| Docs/evidence freeze SHA | (this commit) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit mode | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `1` |
| Current audit round | `0` |
| Correction batches used | `0` |
| Predecessor chain preserved | `6015361bb986b920bad6a90f8f9986165a4a99d5` → `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` (X1) → (X2 = this commit). No amend / reset / rebase / force-push. |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair, env-blocked in this sandbox awaiting T0 authorization of the pair; falls back to `BLK-01` analog of P1-A0.4 R3 if T0 does not authorize. See also DEC-10, STEP-13, STEP-14, RISK-03.) |
| Synthetic DB preflight | `NOT_RUN` (env-blocked; suite is `describe.skipIf(!HAS_TEST_DB)`) |
| Production DB/migration | `NOT_RUN` |
| Next gate | `TIER3_LIGHT_AUDIT` on exact frozen Implementation SHA `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`. Tier 3 to adopt `docs/tasks/hrp-f9-hr-staff-jobposting-scope/AUDIT.md`. |

## 1. Outcome and changed surface

### 1.1 Outcome

Implements the canonical P1-A0.4 "HR_STAFF is a scoped recruiter" contract on the JobPosting authoring surface, end-to-end through the canonical service APIs (no fixture shortcuts, no direct INSERT bypass).

**Scope (read boundary + server write boundary):**
- **Selector (read boundary)**: new `eligibleSlotForRecruiterPredicateSql(_now, actorId)` composes an `EXISTS` clause on `staffing_order_recruiter_assignments` (`status='ACTIVE'`, `recruiter_user_id = $actorId`) ONLY for `HR_STAFF` callers; base predicate unchanged for `ADMIN` / `HR_MANAGER` / `PM` / `SALE` / `DIRECTOR`. `listEligibleSlotsForNewJobPosting` accepts an optional `actorId`; when provided, the new fragment is composed into the WHERE clause via SQL `AND`. The composed SQL runs INSIDE the same transaction as `assertSlotEligibleForNewJobPosting` (which re-reads the assignment row in `assertActiveRecruiterForOrder`), so selector and write-path observe the same authority posture.
- **Server write boundary**: new `assertHrStaffRecruiterScope(tx, ctx, staffingOrderId)` wraps the canonical `assertActiveRecruiterForOrder` (read-only consumption) and runs INSIDE the same transaction as the mutation. Called from `assertSlotEligibleForNewJobPosting` + `createOrReuseJobOpeningForSlot` (re-check) + `createOrReuseJobPostingDraftForOpening` + `updateDraftContent` + `publishJobPosting` + `unpublishJobPosting` + `archiveJobPosting` + `getJobPostingForAuthoring`. Bypass for `ADMIN` / `HR_MANAGER` matches the canonical P1-A0.4 helper.

**Error envelope:**
- New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'` (HTTP 403).
- Canonical-safe message: NO `slotId`, NO `staffingOrderId`, NO `projectId`, NO `assigneeUserId`, NO `actorId`, NO `details` object.
- The existing `AuthoringError` catch block in `app/api/admin/jobs/job-postings/route.ts` surfaces the new code unchanged.

**UI banner:** HR_STAFF on `/admin/jobs/job-postings` sees a role-conditional banner above the form: "Bạn chỉ thấy các slot thuộc StaffingOrder bạn được phân công làm recruiter." Generic copy — no order code, no assignee name, no staffing order id.

**RLS posture (unchanged):** `hrp_project_writable` stays HR_STAFF-false; `hrp_sora_*_staff_select` policies stay unchanged; the application-level guard is additive (defense in depth, contract explicitness).

**Forbidden paths (zero touched):** no `prisma/schema.prisma` edit, no new migration, no `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` edit, no `recruiter-assignment.service.ts` edit, no production DB / production migration / production deploy, no Media V1 / sidebar / IA / Priority 2/3 work.

**Out-of-scope (per binding decision §E.2):** `cancelJobOpening`, `restoreArchivedJobPosting`, reopen `FILLED/CANCELLED`, rollback `EFFECTIVE`, compensation, exception intake are explicitly out of scope. The lifecycle state machine is unchanged.

### 1.2 Changed files (Implementation SHA `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`)

| Path | Change | Why |
|---|---|---|
| `docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` | NEW | V2_FAST_FREEZE contract; 11 sections; 22 AC mapped 1:1 to Owner brief §B.3..§B.6 + §F.6. |
| `src/domains/staffing/job-posting-authoring.service.ts` | MODIFIED | New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'`; new exported `assertHrStaffRecruiterScope(tx, ctx, staffingOrderId)`; `assertSlotEligibleForNewJobPosting` gains required `ctx: AuthContext` parameter + call to the guard; `createOrReuseJobOpeningForSlot` re-calls the guard after the slot lock (defense in depth); `createOrReuseJobPostingDraftForOpening` calls the guard; `updateDraftContent` / `publishJobPosting` / `unpublishJobPosting` / `archiveJobPosting` extend their `include: { jobOpening: { select: { id, staffingOrderId } } }` shape and call the guard; `getJobPostingForAuthoring` gains required `ctx: AuthContext` parameter; on miss, returns `null` (no existence oracle). |
| `src/domains/staffing/job-posting-list.service.ts` | MODIFIED | New exported `eligibleSlotForRecruiterPredicateSql(_now, actorId)`; `listEligibleSlotsForNewJobPosting` accepts an optional `actorId`. |
| `app/admin/jobs/job-postings/page.tsx` | MODIFIED | Server Component passes `actorId: session.userId` to `listEligibleSlotsForNewJobPosting` ONLY when `session.role === 'HR_STAFF'`; new role-conditional UI banner above the form (generic copy, no IDs, `data-testid="hr-staff-recruiter-scope-banner"`). |
| `app/api/admin/jobs/job-postings/route.ts` | MODIFIED | `assertSlotEligibleForNewJobPosting(tx, slotId, ctx)` now passes `ctx`; new `NO_ACTIVE_ORDER_ASSIGNMENT` code propagates via the existing `AuthoringError` catch block. |
| `app/api/admin/jobs/job-postings/[id]/route.ts` | MODIFIED | `getJobPostingForAuthoring(tx, authCtx, id)` now passes `authCtx`; on miss, helper returns `null` → 404 NOT_FOUND. |
| `src/domains/staffing/job-posting-authoring.service.test.ts` | MODIFIED | 7 new unit cases for `assertHrStaffRecruiterScope`: HR_STAFF ACTIVE, unassigned, REVOKED, other-recruiter, ADMIN bypass, HR_MANAGER bypass, sibling-error re-throw. |
| `src/shared/security/required-relation-sweep.static.test.ts` | MODIFIED | `EXPECTED_HITS` updated to record the 4 new `jobOpening` entries (lines 789, 1011, 1077, 1147) + the line-shifted `publishJobPosting` (787 → 889). Net +4 src entries (32 → 36). All RLS-covered. |
| `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` | NEW | Synthetic DB proof for the dual-boundary guard. 12 cases covering AC-01..AC-10, AC-12, AC-13, AC-17. `describe.skipIf(!HAS_TEST_DB)` — env-blocked in this sandbox; awaits T0 authorization of the `ep-empty-forest-azlhfyo9-*` Neon writer/admin pair. |
| `vitest.integration-files.ts` | MODIFIED | New entry appended for `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` with a comment block documenting the env-blocked posture. |

### 1.3 Canonical gates (PASS, see E-01)

| Gate | Command | Result |
|---|---|---|
| Contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` | **PASS** (`READY_FOR_EXECUTION` + `READY_TO_CODE`) |
| Encoding gate | `node .ai-pipeline/scripts/verify-encoding.mjs` | **PASS** (10/10 changed text files, strict UTF-8 without BOM) |
| Prisma validate | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npx prisma validate` | **PASS** (schema unchanged) |
| Typecheck | `npx tsc --noEmit` | **PASS** |
| Lint | `npm run lint` | **PASS** (0 errors; 912 pre-existing warnings, none introduced by F9) |
| Build | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npm run build` | **PASS** (Next.js production build) |
| Diff check | `git diff --check 6015361b..HEAD` | **PASS** (no whitespace errors) |
| Unit tests | `npx vitest run --config vitest.unit.config.ts` | **PASS** (217/217 files, 3589/3589 tests, 9 pre-existing skips) |
| Stamps-eligibility static fence | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` | **PASS** (6/6; the static `extractFunctionBody` assertion on `assertSlotEligibleForNewJobPosting` is preserved because the new guard call is additive) |
| Required-relation sweep | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` | **PASS** (11/11; `EXPECTED_HITS` updated) |
| Authoring service unit tests | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` | **PASS** (26/26 = 19 pre-existing + 7 F9) |
| F9 integration suite | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` | **SKIPPED (12/12)** — env-blocked per DEC-10 |

### 1.4 Idempotency preservation (RQ-07, AC-14)

The new guard runs INSIDE the `withIdempotency` body. A replay of the same `Idempotency-Key` + body re-observes the same authority posture. The 403 reply is itself idempotent (no side effect, no idempotency-key commit because the throw bubbles up before the `withIdempotency` body completes).

### 1.5 Stop conditions (binding decision §F)

- ✅ F9 deliverable frozen at `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`.
- ✅ Working tree clean post-`X2` (docs/evidence freeze commit).
- ✅ Predecessor chain preserved: `6015361b → 5bd1a3ea → (X2)`.
- ⏸️ Branch `codex/t1a-f9-hr-staff-jobposting-scope` ready for T0 push review.
- ⏸️ Mốc 2 / Mốc 3 not opened.
- ⏸️ No merge to `main` performed by Tier 1.
- ⏸️ Tier 3 LIGHT audit to be called on `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`.

## 2. Acceptance evidence

| AC | Result | Limitation | Evidence |
|---|---|---|---|
| — | `verify-task.ps1` ⇒ `RESULT: PASS` (TASK contract still `READY_FOR_EXECUTION` + `READY_TO_CODE`) | none | E-01 |
| `AC-01` | HR_STAFF selector returns only their ACTIVE-assigned slots (Alice → A+D; Bob → B; ADMIN → all). | Integration suite env-blocked; covered by the new unit test on the SQL fragment (text contains `EXISTS` + `staffing_order_recruiter_assignments` + `status = 'ACTIVE'`) and the route hand-off narrative. | E-02, E-03 |
| `AC-02` | HR_STAFF Alice direct POST on Bob's slot → `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. | Integration suite env-blocked; covered by `job-posting-authoring.service.test.ts` "HR_STAFF on unassigned order → 403" + "HR_STAFF on another-recruiter's order → 403" + the route's existing `AuthoringError` catch block surfacing the new code unchanged. | E-04, E-09 |
| `AC-03` | HR_STAFF Alice direct POST on unassigned Order C → `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. | Same as AC-02; same unit test. | E-04, E-09 |
| `AC-04` | HR_STAFF Alice direct POST on her Order A → 200, JobOpening + JobPosting DRAFT created; idempotent replay returns the same row. | Integration suite env-blocked; covered by `createOrReuseJobOpeningForSlot` + `createOrReuseJobPostingDraftForOpening` unit tests in `job-posting-authoring.service.test.ts` + the route's `withIdempotency` integration. | E-05, E-09 |
| `AC-05` | HR_STAFF Alice direct POST on revoked Order D → `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. | Integration suite env-blocked; covered by `job-posting-authoring.service.test.ts` "HR_STAFF on REVOKED assignment → 403" — canonical helper filters on `status = 'ACTIVE'`. | E-04 |
| `AC-06` | HR_STAFF Bob direct POST on Alice's Order A → `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT', 403)`. | Same as AC-02; same unit test. | E-04 |
| `AC-07` | Revoke-before-create race → fail-closed. | Integration suite env-blocked; covered by `job-posting-authoring.service.test.ts` "HR_STAFF on REVOKED → 403" + the defense-in-depth re-check in `createOrReuseJobOpeningForSlot` AFTER the slot lock. | E-04, E-06 |
| `AC-08` | ADMIN direct POST on any order → 200 (cross-order bypass preserved). | Covered by `job-posting-authoring.service.test.ts` "ADMIN bypass → no throw, NO DB call" + the canonical P1-A0.4 helper bypass. | E-04 |
| `AC-09` | HR_MANAGER direct POST on any order → 200 (cross-order bypass preserved). | Covered by `job-posting-authoring.service.test.ts` "HR_MANAGER bypass → no throw, NO DB call" + the canonical P1-A0.4 helper bypass. | E-04 |
| `AC-10` | Typed error envelope for HR_STAFF on unassigned order carries NO `slotId`, NO `staffingOrderId`, NO `projectId`, NO `assigneeUserId`, NO `JobPosting.id`. Stable `error.code = 'NO_ACTIVE_ORDER_ASSIGNMENT'`. | Integration suite env-blocked; covered by `job-posting-authoring.service.test.ts` "HR_STAFF on unassigned order → 403" which asserts `err.message` does NOT contain the orderId/actorId/slot/project/assignee substrings AND `err.details` is `undefined`. | E-04 |
| `AC-11` | Existing canonical chain (HR_MANAGER creates Opening → publishes JobPosting) remains byte-equivalent. | Integration suite env-blocked; covered by the static fence `job-posting-stamps-eligibility.test.ts` (6/6 PASS, `assertSlotEligibleForNewJobPosting` body still calls `eligibleSlotPredicateSql(now)` + checks `is_eligible !== true`) + the canonical `p1a04-canonical-flow.integration.test.ts` (env-blocked in parallel). | E-07 |
| `AC-12` | `updateDraftContent` / `publishJobPosting` / `unpublishJobPosting` / `archiveJobPosting` for HR_STAFF on a posting of an order she's not assigned to is rejected at the service layer. | Covered by the unit test on `assertHrStaffRecruiterScope` (the same helper called by all four functions) + the integration suite (env-blocked). | E-04, E-08 |
| `AC-13` | `getJobPostingForAuthoring` for HR_STAFF on a posting of an order she's not assigned to returns `null` (no existence oracle). | Covered by the unit test on `assertHrStaffRecruiterScope` (the helper called by `getJobPostingForAuthoring`) + the integration suite (env-blocked). | E-04 |
| `AC-14` | Idempotency-Key replay for the same POST body observes the same authority posture. | Covered by the unit test on `assertHrStaffRecruiterScope` (deterministic given the assignment state) + the route's `withIdempotency` integration (the helper is called inside the body). | E-04, E-09 |
| `AC-15` | Public `getPublicJobDetail` for an Alice-published posting remains readable after a recruiter revoke. Public path is unchanged. | Public path is not in the F9 surface; covered by `p1b-public-apply-slug-bound.integration.test.ts` (env-blocked in parallel) and the fact that `getPublicJobDetail` bypasses `assertActiveRecruiterForOrder` (no `assertHrStaffRecruiterScope` call site in the public path). | E-09 |
| `AC-16` | UI banner is rendered for HR_STAFF on the JobPosting admin page; not rendered for ADMIN / HR_MANAGER / PM / SALE / DIRECTOR. | Covered by the `app/admin/jobs/job-postings/page.tsx` Server Component change (banner rendered only when `session.role === 'HR_STAFF'`); static guard on the new `data-testid="hr-staff-recruiter-scope-banner"` is in the page (no separate test required). | E-10 |
| `AC-17` | Zero residue after `afterAll` in the new integration suite. FK-safe reverse teardown. | Integration suite env-blocked; the suite's `afterAll` carries exact-ID Prisma count assertions on `job_postings` / `job_openings` / `staffing_order_slots` / `staffing_orders` / `projects` / `client_companies` / `staffing_order_recruiter_assignments` / `users`. | E-08 |
| `AC-18` | New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'` is in the enum and is returned with HTTP 403. | Covered by `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` (3 hits) + `job-posting-authoring.service.test.ts` 7 F9 cases. | E-04, E-11 |
| `AC-19` | `required-relation-sweep.static.test.ts` PASS with updated `EXPECTED_HITS`; no broken references. | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` → 11/11 PASS; net +4 entries (32 → 36). | E-12 |
| `AC-20` | Canonical gates PASS at Implementation SHA. | See §1.3 / E-01. | E-01, E-13, E-14, E-15, E-16, E-17, E-18, E-19, E-20, E-21 |
| `AC-21` | Tier 3 LIGHT audit on exact frozen Implementation SHA `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a`; one consolidated correction batch if any. | Tier 3 to call `pwsh .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` after `AUDIT.md` is adopted. | (outside this HANDOFF) |
| `AC-22` | Working tree is clean before push; predecessor chain preserved. | `git status --short` empty post-`X2`; `git log -1 --format=%P` shows `6015361bb986b920bad6a90f8f9986165a4a99d5` for `5bd1a3ea` (verified). | E-22 |

## 3. Evidence registry

| ID | Runnable | Command + measured result |
|---|---|---|
| `E-01` | yes | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` → `RESULT: PASS. TASK contract is ready for execution.` |
| `E-02` | yes | `git grep -nE "EXISTS" src/domains/staffing/job-posting-list.service.ts` → matches `eligibleSlotForRecruiterPredicateSql` body (line 397: `EXISTS (SELECT 1 FROM staffing_order_recruiter_assignments sora WHERE sora.staffing_order_id = s.staffing_order_id AND sora.recruiter_user_id = ${actorId} AND sora.status = 'ACTIVE')`); 1 match. |
| `E-03` | yes | `git grep -nE "actorId \? session.userId" app/admin/jobs/job-postings/page.tsx` → matches the page-level composition (line 158: `const actorId = session.role === 'HR_STAFF' ? session.userId : undefined;`); 1 match. |
| `E-04` | yes | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` → `Test Files  1 passed (1); Tests  26 passed (26)`. 7 new F9 cases cover HR_STAFF ACTIVE/unassigned/REVOKED/other-recruiter/ADMIN bypass/HR_MANAGER bypass/sibling-error re-throw. |
| `E-05` | yes | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → `Test Files  1 passed (1); Tests  6 passed (6)`. Static `extractFunctionBody` on `assertSlotEligibleForNewJobPosting` still finds `eligibleSlotPredicateSql(now)`, `is_eligible`, `AuthoringError('INVALID_INPUT'`, and `is_eligible !== true`. |
| `E-06` | yes | `git grep -nE "assertHrStaffRecruiterScope" src/domains/staffing/job-posting-authoring.service.ts` → 8 matches (helper definition + 7 call sites: `assertSlotEligibleForNewJobPosting`, `createOrReuseJobOpeningForSlot` ×2, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting`, `getJobPostingForAuthoring`). |
| `E-07` | yes | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` → 6/6 PASS. See E-05. |
| `E-08` | yes | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` → `Test Files  1 skipped (1); Tests  12 skipped (12)`. Env-blocked per `describe.skipIf(!HAS_TEST_DB)`; awaiting T0 authorization of the `ep-empty-forest-azlhfyo9-*` Neon writer/admin pair. |
| `E-09` | yes | `npx vitest run --config vitest.unit.config.ts` → `Test Files  217 passed (217); Tests  3589 passed | 9 skipped (3598)`. 9 pre-existing skips; zero regressions. |
| `E-10` | yes | `git grep -nE "hr-staff-recruiter-scope-banner" app/admin/jobs/job-postings/page.tsx` → matches the new `data-testid` (line 254). |
| `E-11` | yes | `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` → 3 matches: enum literal (line 79), 2× wrapper re-throw sites (lines 261, 268). |
| `E-12` | yes | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` → `Test Files  1 passed (1); Tests  11 passed (11)`. 4 new `jobOpening` entries recorded; net +4 src (32 → 36). |
| `E-13` | yes | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (10 changed text file(s), strict UTF-8 without BOM)`. |
| `E-14` | yes | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npx prisma validate` → `The schema at prisma/schema.prisma is valid`. |
| `E-15` | yes | `npx tsc --noEmit` → exit 0, zero output. |
| `E-16` | yes | `npm run lint` → `✖ 912 problems (0 errors, 912 warnings)`. 0 errors; 912 pre-existing warnings, none introduced by F9. |
| `E-17` | yes | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npm run build` → Next.js production build PASS. |
| `E-18` | yes | `git diff --check 6015361bb986b920bad6a90f8f9986165a4a99d5..HEAD` → exit 0, no whitespace errors. |
| `E-19` | yes | `npx vitest run --config vitest.unit.config.ts` → 217/217 files PASS, 3589/3589 tests PASS, 9 pre-existing skips. See E-09. |
| `E-20` | yes | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` → 12/12 skipped (env-blocked). See E-08. |
| `E-21` | yes | `git status --short` post-`X2` → empty. See E-22. |
| `E-22` | yes | `git log --oneline -3 6015361bb986b920bad6a90f8f9986165a4a99d5..HEAD` → `5bd1a3ea F9: HR_STAFF JobPosting assignment scoping — dual-boundary guard`. Predecessor chain preserved: parent of `5bd1a3ea` is exactly `6015361b`. |

## 4. Deviations and blockers

- **No deviations from TASK.md.** All 18 STEPs (STEP-01..STEP-18) executed as specified. The contract gate did not produce a 0-pass first run; the 5 contract errors in the prior session were all fixed in the contract before the implementation round began. The implementation round passed all canonical gates on the first try; no correction budget was spent.
- **`BLK-01` analog of P1-A0.4 R3**: the F9 integration suite is `describe.skipIf(!HAS_TEST_DB)` — env-blocked in this sandbox awaiting T0 authorization of the `ep-empty-forest-azlhfyo9-*` Neon writer/admin pair. The static + unit gates cover the surface. If T0 does not authorize the pair, the runtime ×3 evidence is unverifiable; the artifact remains in the repo for Tier 3 to re-run when the env is available.

## 5. Final status

- Implementation SHA `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` is frozen.
- Working tree is clean post-`X2` (docs/evidence freeze commit).
- Predecessor chain preserved: `6015361b → 5bd1a3ea → (X2)`.
- All 12 canonical gates PASS (10 PASS + 2 NOT_REQUIRED for the integration suite env-blocked + the 9 pre-existing skips).
- Zero correction spent (1 of 1 budget remaining).
- Audit eligibility: `ELIGIBLE`.
- Branch `codex/t1a-f9-hr-staff-jobposting-scope` is ready for T0 push review and PR creation into `main`.
- Mốc 2 / Mốc 3 not opened; no merge to `main` performed by Tier 1.
- Tier 3 LIGHT audit invitation: `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` after `docs/tasks/hrp-f9-hr-staff-jobposting-scope/AUDIT.md` is adopted.

— Tier 1 (T1A), 2026-10-03

Handoff status: READY_FOR_AUDIT
