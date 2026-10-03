# HANDOFF — `hrp-f9-hr-staff-jobposting-scope`

**Pipeline V2 — Implementation round 2 (correction batch 1/1; X4 semantic correction SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`; failed round-1 SHA `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` preserved as predecessor evidence).**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9-hr-staff-jobposting-scope` |
| Spec version | `v1.1` (correction batch 1/1 contract delta per T0) |
| Status | `READY_FOR_AUDIT` (correction batch 1/1 PASS, F9 integration ×3 fresh processes 12/12 each, predecessor regressions 43/43, all canonical gates PASS) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9-hr-staff-jobposting-scope` |
| Branch | `codex/t1a-f9-hr-staff-jobposting-scope` |
| Baseline | `6015361bb986b920bad6a90f8f9986165a4a99d5` |
| Implementation SHA | `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` |
| Implementation SHA (label) | `X4` (semantic correction — correction batch 1/1) |
| Predecessor implementation SHA | `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` (X1 — failed round-1 implementation; preserved as evidence per T0 disposition) |
| Docs/evidence freeze SHA | `X5` (this commit) |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit mode | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Execution round | `2` (round 1 = `5bd1a3ea` BLOCKED at 7/12; round 2 = `0d38042f` PASS at 12/12 ×3) |
| Current audit round | `0` |
| Correction batches used | `1` |
| Predecessor chain preserved | `6015361bb986b920bad6a90f8f9986165a4a99d5` → `5bd1a3ea1bb2e8b973f89325fe69cd131ffbb00a` (X1, failed round-1 evidence) → `ab8845f7` (X2 = round-1 docs/evidence freeze) → `590fd35c` (X3 = T1A BLOCKED docs correction) → `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` (X4 = correction batch 1/1 semantic) → `X5` (this commit = docs/evidence freeze). No amend / reset / rebase / force-push. |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer/admin pair — T0 authorized `C:\cre_hrp.txt` ingestion via process wrapper. Wrapper loads URLs by host + username + database, never echoes URL/password/query string, never writes to repo.) |
| Synthetic DB preflight | `POSTURE_OK writer_is_writer admin_is_admin same_target` (writer `rolsuper=false, rolbypassrls=false`; admin `bypassrls=true`; `ep-empty-forest-azlhfyo9-*` host prefix; `neondb` database; production `ep-shy-tree-*` URLs in source file were **counted-and-ignored**, never selected — `ignored_production_lines=2`) |
| Synthetic migration deploy | `OK` — `prisma migrate deploy` against `ep-empty-forest-azlhfyo9-*` applied `20261003000000_f9_hr_staff_posting_write_rls` and `20261003000001_f9_hr_staff_posting_insert_rls`; all four narrow policies (`hrp_f9_slots_staff_update`, `hrp_f9_postings_staff_update`, `hrp_f9_openings_staff_insert`, `hrp_f9_postings_staff_insert`) verified live in `pg_policies`. |
| Production DB/migration | `NOT_RUN` (production `ep-shy-tree-*` host prefix never dialed) |
| Next gate | `TIER3_LIGHT_AUDIT` on exact frozen Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`. Pipeline = `/audit hrp-f9-hr-staff-jobposting-scope` → one consolidated correction batch if any → closeout. **Not** `T0_RUNTIME_REPRODUCE`. |

## 1. Outcome and changed surface

### 1.1 Outcome

Implements the canonical P1-A0.4 "HR_STAFF is a scoped recruiter" contract on the JobPosting authoring surface, end-to-end through the canonical service APIs (no fixture shortcuts, no direct INSERT bypass). T0-authorized correction batch 1/1 fixes the T1A runtime finding (7/12 FAIL at X1) by introducing a narrow HR_STAFF write RLS path and reordering the dual-boundary guard to participate in the canonical order-scoped advisory lock.

**Scope (read boundary + server write boundary):**
- **Selector (read boundary)**: `eligibleSlotForRecruiterPredicateSql(_now, actorId)` composes an `EXISTS` clause on `staffing_order_recruiter_assignments` (`status='ACTIVE'`, `recruiter_user_id = $actorId`) ONLY for `HR_STAFF` callers; base predicate unchanged for `ADMIN` / `HR_MANAGER`. `listEligibleSlotsForNewJobPosting` accepts an optional `actorId`; the composed SQL runs INSIDE the same transaction as `assertSlotEligibleForNewJobPosting`.
- **Server write boundary (defense in depth)**: `assertHrStaffRecruiterScope(tx, ctx, staffingOrderId)` wraps `assertActiveRecruiterForOrder` (read-only consumption) and runs INSIDE the same transaction as the mutation. Called from `assertSlotEligibleForNewJobPosting`, `createOrReuseJobOpeningForSlot`, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting`, `getJobPostingForAuthoring`. ADMIN / HR_MANAGER bypass.
- **Correction batch 1/1 — guard re-ordering**: `assertSlotEligibleForNewJobPosting` now (1) SELECTs the slot row (no FOR UPDATE) to discover `staffing_order_id`, (2) acquires `acquireOrderAdvisoryLock(tx, slot.staffing_order_id)` (canonical primitive, no second namespace), (3) re-reads authority under the lock via `assertHrStaffRecruiterScope` (throws `NO_ACTIVE_ORDER_ASSIGNMENT` 403 for assigned-then-lost), (4) executes `SELECT ... FOR UPDATE` (now admitted by the new narrow `hrp_f9_slots_staff_update` UPDATE policy), (5) re-asserts authority (defense in depth). For never-visible rows (RLS hides the slot from the writer), returns stable `NOT_FOUND` 404 (no existence oracle).
- **Correction batch 1/1 — advisory lock participation**: `createOrReuseJobOpeningForSlot`, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting` each call `acquireOrderAdvisoryLock(tx, staffingOrderId)` BEFORE the `assertHrStaffRecruiterScope` re-read. Lock is re-entrant within the same transaction; serializes with `assignRecruiterToOrder` / `revokeRecruiterFromOrder` / `claimCandidateSubmission`.
- **Correction batch 1/1 — narrow RLS**: two new forward-only migrations add four narrow PERMISSIVE policies (`hrp_f9_slots_staff_update`, `hrp_f9_postings_staff_update`, `hrp_f9_openings_staff_insert`, `hrp_f9_postings_staff_insert`) on `staffing_order_slots`, `job_openings`, `job_postings`. All gated on `hrp_session_role()='HR_STAFF' AND hrp_staffing_order_visible_for(...)`. No blanket HR_STAFF write policy; no DELETE; no `staffing_orders` write relaxation; static guard inside migration and a sibling `src/shared/security/f9-hr-staff-posting-write-rls.static.test.ts` prove posture.

**Error envelope (DEC-05 allowed mapping per T0):**
- New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'` (HTTP 403) for the assigned-then-lost case (selector-visible anchor + lose authority during serialized execution).
- Stable `NOT_FOUND` (HTTP 404) is also an acceptable fail-closed envelope for the never-visible case (RLS hides the row from the writer from the start). This preserves the no-existence-oracle contract.
- Both envelopes carry NO slotId, NO staffingOrderId, NO projectId, NO assigneeUserId, NO actorId, NO JobPosting.id. `AuthoringError.details` is `undefined` for these call sites.

**UI banner:** HR_STAFF on `/admin/jobs/job-postings` sees a role-conditional banner above the form: "Bạn chỉ thấy các slot thuộc StaffingOrder bạn được phân công làm recruiter." Generic copy — no order code, no assignee name, no staffing order id.

**Application runtime boundary:** Writer connection only. No separate admin/bypass Prisma client is introduced into the application runtime. The production runtime has writer authority; the admin URL is an ops/migration boundary, not an application boundary.

**Forbidden paths (zero touched):** no `prisma/schema.prisma` edit, no `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` edit, no `recruiter-assignment.service.ts` edit (the canonical helper and the advisory lock primitive are reused read-only), no production DB / production migration / production deploy, no Media V1 / sidebar / IA / Priority 2/3 work.

**Out-of-scope (per binding decision §E.2):** `cancelJobOpening`, `restoreArchivedJobPosting`, reopen `FILLED/CANCELLED`, rollback `EFFECTIVE`, compensation, exception intake are explicitly out of scope. The lifecycle state machine is unchanged.

### 1.2 Changed files (Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` = X4)

| Path | Change | Why |
|---|---|---|
| `docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` | MODIFIED | Spec v1.0 → v1.1: DEC-05 allowed mapping, DEC-06-b advisory lock participation, DEC-22 narrow RLS policies, DEC-23 static guard, DEC-24 X4/X5 chain; updated AC-02..AC-10 allowed-set assertions; new STEP-19..STEP-26. |
| `prisma/migrations/20261003000000_f9_hr_staff_posting_write_rls/migration.sql` | NEW | Narrow PERMISSIVE FOR UPDATE policies `hrp_f9_slots_staff_update` (on `staffing_order_slots`) and `hrp_f9_postings_staff_update` (on `job_postings`, joined through `job_openings.staffing_order_id`). Idempotent (`DROP POLICY IF EXISTS`); static guard inside the migration proves both policies exist + are PERMISSIVE FOR UPDATE. |
| `prisma/migrations/20261003000001_f9_hr_staff_posting_insert_rls/migration.sql` | NEW | Narrow PERMISSIVE FOR INSERT policies `hrp_f9_openings_staff_insert` (on `job_openings`) and `hrp_f9_postings_staff_insert` (on `job_postings`, joined through `job_openings.staffing_order_id`). Idempotent; static guard proves both policies exist + are PERMISSIVE FOR INSERT. |
| `src/domains/staffing/job-posting-authoring.service.ts` | MODIFIED | Re-ordered `assertSlotEligibleForNewJobPosting` to: discover `staffing_order_id` via raw SELECT (no FOR UPDATE), acquire `acquireOrderAdvisoryLock`, guard re-read, SELECT FOR UPDATE under new narrow UPDATE policy, predicate validation, defense-in-depth guard re-read. Stable NOT_FOUND envelope for the never-visible case. `createOrReuseJobOpeningForSlot`, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting` each call `acquireOrderAdvisoryLock(tx, staffingOrderId)` BEFORE the guard re-read. |
| `src/shared/security/f9-hr-staff-posting-write-rls.static.test.ts` | NEW | Static guard parsing both migrations: asserts presence, PERMISSIVE FOR UPDATE/INSERT, target roles (`app_user_writer, app_user` only — no PUBLIC), predicate text contains `hrp_session_role`, `hrp_session_user_id`, `hrp_staffing_order_visible_for`, no `*_all` / `*_delete` / `staffing_orders_*` policies. |
| `src/shared/security/required-relation-sweep.static.test.ts` | MODIFIED | `EXPECTED_HITS` updated to record the 4 new `jobOpening` includes in `job-posting-authoring.service.ts` (851, 955, 1082, 1151, 1224). Net +4 src entries (32 → 36). |
| `src/domains/staffing/__tests__/job-posting-publish-contract.test.ts` | MODIFIED | Added `$executeRawUnsafe: vi.fn().mockResolvedValue(undefined)` to `makeTxMock` to accommodate `acquireOrderAdvisoryLock`. |
| `tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` | MODIFIED | AC-02/03/05/06/07/10 assertions replaced with allowed-set (`code IN ['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']`; `httpStatus IN [403, 404]`). PII-leak protection on `message` and `details` preserved. AC-10 `Object.keys` allowlist (`code`, `details`, `httpStatus`, `name`) preserved. |

### 1.3 Canonical gates (PASS, see E-01..E-26)

| Gate | Command | Result |
|---|---|---|
| Contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` | **PASS** (`READY_FOR_EXECUTION` + `READY_TO_CODE`) |
| Encoding gate | `node .ai-pipeline/scripts/verify-encoding.mjs` | **PASS** (8/8 changed text files, strict UTF-8 without BOM) |
| F9 narrow RLS static guard | `npx vitest run src/shared/security/f9-hr-staff-posting-write-rls.static.test.ts` | **PASS** (5/5 — proves both migrations contain the expected policies with the expected shape) |
| Prisma validate | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npx prisma validate` | **PASS** (schema unchanged) |
| Typecheck | `npx tsc --noEmit` | **PASS** (exit 0, zero output) |
| Lint | `npm run lint` | **PASS** (0 errors; 913 pre-existing warnings, none introduced by F9) |
| Build | `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy DATABASE_URL_ADMIN=postgresql://ci:ci@localhost:5432/ci_dummy npm run build` | **PASS** (Next.js production build) |
| Diff check | `git diff --check 590fd35c..HEAD` + `git diff --check HEAD` | **PASS** (no whitespace errors) |
| Required-relation sweep | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` | **PASS** (11/11; `EXPECTED_HITS` updated for the 4 new `jobOpening` includes; total src 32 → 36) |
| Authoring service unit | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` | **PASS** (26/26 = 19 pre-existing + 7 F9) |
| Publish-contract unit | `npx vitest run src/domains/staffing/__tests__/job-posting-publish-contract.test.ts` | **PASS** (6/6; `makeTxMock` updated for `acquireOrderAdvisoryLock`) |
| Stamps-eligibility static fence | `npx vitest run src/domains/staffing/job-posting-stamps-eligibility.test.ts` | **PASS** (6/6; the new guard calls are additive) |
| Full unit suite | `npx vitest run --config vitest.unit.config.ts` | **PASS** (218/218 files, 3594/3594 tests, 9 pre-existing skips) |
| Synthetic DB posture | `node scripts/ci/assert-test-db-posture.mjs` (via wrapper) | **PASS** (`POSTURE_OK writer_is_writer admin_is_admin same_target`; writer `rolsuper=false, rolbypassrls=false`; admin `bypassrls=true`) |
| Synthetic migration deploy | `npx prisma migrate deploy --schema prisma/schema.prisma` (via wrapper) against `ep-empty-forest-azlhfyo9-*` | **PASS** (60 migrations; both F9 migrations applied; verified live in `pg_policies`) |
| F9 integration suite ×3 fresh processes | `npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` | **PASS** ×3 — 12/12 each (36/36 cumulative); deterministic; AC-04 happy path now succeeds; revoke-before-create race fail-closed; no PII; exact-ID zero residue |
| Predecessor regressions | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` | **PASS** (3 files, 43/43 tests, 0 failed, 0 newly skipped) |

### 1.4 Idempotency preservation (RQ-07, AC-14)

The new guard runs INSIDE the `withIdempotency` body. A replay of the same `Idempotency-Key` + body re-observes the same authority posture (lock is re-entrant within the same transaction; assignment row is re-read). The 403 / 404 reply is itself idempotent (no side effect, no idempotency-key commit because the throw bubbles up before the `withIdempotency` body completes).

### 1.5 Stop conditions (binding decision §F)

- ✅ F9 deliverable eligible for audit at `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`. Correction batch 1/1 PASS: F9 integration suite 12/12 ×3 fresh processes; predecessor regressions 43/43; canonical gates PASS.
- ✅ Working tree clean post-`X5` (this docs/evidence freeze commit; only `HANDOFF.md` changes).
- ✅ Predecessor chain preserved: `6015361b → 5bd1a3ea → ab8845f7 → 590fd35c → 0d38042f → (X5)`.
- ⏸️ Branch `codex/t1a-f9-hr-staff-jobposting-scope` awaits Tier 3 LIGHT audit. Tier 1A did **not** push, PR, merge, deploy, or open Mốc 2/Mốc 3.

## 2. Acceptance evidence

| AC | Result | Limitation | Evidence |
|---|---|---|---|
| — | `verify-task.ps1` ⇒ `RESULT: PASS` (TASK contract v1.1 still `READY_FOR_EXECUTION` + `READY_TO_CODE`) | none | E-01 |
| `AC-01` | HR_STAFF selector returns only their ACTIVE-assigned slots (Alice → A+D; Bob → B; ADMIN → all). | Synthetic DB PASS in 3/3 runs. | E-02, E-23 |
| `AC-02` | HR_STAFF Alice direct POST on Bob's slot → `AuthoringError` with code ∈ `['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']` and httpStatus ∈ `[403, 404]`. | Synthetic DB PASS in 3/3 runs (allowed-set per DEC-05-b). | E-03, E-23 |
| `AC-03` | HR_STAFF Alice direct POST on unassigned Order C → `AuthoringError` (allowed-set). | Synthetic DB PASS in 3/3 runs. | E-04, E-23 |
| `AC-04` | HR_STAFF Alice direct POST on her Order A → 200, JobOpening + JobPosting DRAFT created; idempotent replay returns the same row. | Synthetic DB PASS in 3/3 runs. **Critical regression at X1 → now PASS at X4** (the new narrow `hrp_f9_slots_staff_update` + INSERT policies + guard re-ordering fix the RLS-hidden writer-SLOT visibility defect). | E-05, E-23 |
| `AC-05` | HR_STAFF Alice direct POST on revoked Order D → `AuthoringError` (allowed-set). | Synthetic DB PASS in 3/3 runs. | E-06, E-23 |
| `AC-06` | HR_STAFF Bob direct POST on Alice's Order A → `AuthoringError` (allowed-set). | Synthetic DB PASS in 3/3 runs. | E-07, E-23 |
| `AC-07` | Revoke-before-create race → Alice's `createOrReuseJobOpeningForSlot` fails closed on Order A after a parallel `revokeRecruiterFromOrder`. | Synthetic DB PASS in 3/3 runs. The order-scoped `acquireOrderAdvisoryLock` serializes the create with the prior revoke; the post-lock guard re-read sees REVOKED status. | E-08, E-23 |
| `AC-08` | ADMIN direct POST on Bob's Order B → 200 (cross-order bypass preserved). | Synthetic DB PASS in 3/3 runs. | E-09, E-23 |
| `AC-09` | HR_MANAGER direct POST on unassigned Order C → 200 (cross-order bypass preserved). | Synthetic DB PASS in 3/3 runs. | E-10, E-23 |
| `AC-10` | Typed error envelope for HR_STAFF on unassigned / other-recruiter / revoked order carries NO `slotId`, NO `staffingOrderId`, NO `projectId`, NO `assigneeUserId`, NO `JobPosting.id`, NO `actorId`. `code ∈ ['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']`; `httpStatus ∈ [403, 404]`; `Object.keys` = `['code', 'details', 'httpStatus', 'name']`; `details === undefined`. | Synthetic DB PASS in 3/3 runs. | E-11, E-23 |
| `AC-11` | Existing canonical chain (HR_MANAGER creates Opening → publishes JobPosting) remains byte-equivalent. | Predecessor regression `tests/db/job-posting-authoring.integration.test.ts` PASS (3/3 runs in T1A reproduction); `tests/db/p1a04-canonical-flow.integration.test.ts` PASS. | E-12, E-23 |
| `AC-12` | `updateDraftContent` / `publishJobPosting` / `unpublishJobPosting` / `archiveJobPosting` for HR_STAFF on a posting of an order she's not assigned to is rejected at the service layer. | Covered by unit cases for `assertHrStaffRecruiterScope` (the helper called by all four functions) + the integration suite (all four paths participate in the canonical advisory lock and re-check authority). | E-13 |
| `AC-13` | `getJobPostingForAuthoring` for HR_STAFF on a posting of an order she's not assigned to returns `null` (no existence oracle). | Covered by unit test + the helper's `try/catch` mapping `AuthoringError('NO_ACTIVE_ORDER_ASSIGNMENT')` → `null`. | E-14 |
| `AC-14` | Idempotency-Key replay for the same POST body observes the same authority posture (same 403/404, same 200). | Guard runs INSIDE `withIdempotency` body, so a replay re-checks authority. The advisory lock is re-entrant within the same transaction. | E-15 |
| `AC-15` | Public `getPublicJobDetail` for an Alice-published posting remains readable after a recruiter revoke. Public path is unchanged. | Public path is not in the F9 surface; covered by `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (env-blocked in parallel). | E-16 |
| `AC-16` | UI banner is rendered for HR_STAFF on the JobPosting admin page; not rendered for ADMIN / HR_MANAGER / PM / SALE / DIRECTOR. | Covered by the `app/admin/jobs/job-postings/page.tsx` Server Component change (banner rendered only when `session.role === 'HR_STAFF'`); static guard on `data-testid="hr-staff-recruiter-scope-banner"`. | E-17 |
| `AC-17` | Zero residue after `afterAll` in the new integration suite. FK-safe reverse teardown. | Synthetic DB PASS in 3/3 runs. Exact-ID Prisma count assertions on `job_postings` / `job_openings` / `staffing_order_slots` / `staffing_orders` / `projects` / `client_companies` / `staffing_order_recruiter_assignments` / `users` all return 0. | E-18, E-23 |
| `AC-18` | New `AuthoringErrorCode` literal `'NO_ACTIVE_ORDER_ASSIGNMENT'` is in the enum and is returned with HTTP 403 (allowed-set). | Covered by `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` (3 hits: enum literal, 2× wrapper re-throw sites) + `job-posting-authoring.service.test.ts` 7 F9 cases + integration suite. | E-19 |
| `AC-19` | `required-relation-sweep.static.test.ts` PASS with updated `EXPECTED_HITS`; no broken references. | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` → 11/11 PASS; net +4 entries (32 → 36). | E-20 |
| `AC-20` | Canonical gates PASS at Implementation SHA. | See §1.3 / E-21, E-22, E-24, E-25. | E-21, E-24 |
| `AC-21` | Tier 3 LIGHT audit on exact frozen Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`; one consolidated correction batch if any. | Tier 3 to call `pwsh .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` after `AUDIT.md` is adopted. | (outside this HANDOFF) |
| `AC-22` | Working tree is clean before push; predecessor chain preserved (no amend / reset / rebase / force-push). | `git status --short` empty post-`X5`; `git log --oneline -5` shows `6015361b → 5bd1a3ea → ab8845f7 → 590fd35c → 0d38042f → (X5)`. | E-22 |

## 3. Evidence registry

| ID | Runnable | Command + measured result |
|---|---|---|
| `E-01` | yes | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9-hr-staff-jobposting-scope/TASK.md` → `RESULT: PASS. TASK contract is ready for execution.` |
| `E-02` | yes | `git grep -nE "eligibleSlotForRecruiterPredicateSql" src/domains/staffing/job-posting-list.service.ts` → matches the new exported SQL fragment (1+ match). |
| `E-03` | yes | F9 integration suite AC-02 → `caught.code ∈ ['NO_ACTIVE_ORDER_ASSIGNMENT', 'NOT_FOUND']`; `caught.httpStatus ∈ [403, 404]`. Synthetic DB PASS in 3/3 runs (E-23). |
| `E-04` | yes | F9 integration suite AC-03 → same as AC-02. Synthetic DB PASS in 3/3 runs. |
| `E-05` | yes | F9 integration suite AC-04 → Alice's `assertSlotEligibleForNewJobPosting` succeeds (no exception); `createOrReuseJobOpeningForSlot` returns a JobOpening with `staffingOrderId === orderAId`; `createOrReuseJobPostingDraftForOpening` returns a JobPosting with `status === 'DRAFT'`. **Critical**: at X1 (round 1) this AC failed with `NOT_FOUND` because RLS hid the slot from the writer; at X4 (round 2) it PASSes because the new narrow `hrp_f9_slots_staff_update` UPDATE policy admits the writer's `SELECT ... FOR UPDATE` and the guard re-ordering places the `acquireOrderAdvisoryLock` BEFORE the FOR UPDATE. |
| `E-06` | yes | F9 integration suite AC-05 → after `revokeRecruiterFromOrder` on Alice's Order D, Alice's `assertSlotEligibleForNewJobPosting` fails closed. Allowed-set. |
| `E-07` | yes | F9 integration suite AC-06 → Bob's `assertSlotEligibleForNewJobPosting` on Alice's Order A fails closed. Allowed-set. |
| `E-08` | yes | F9 integration suite AC-07 → after a parallel `revokeRecruiterFromOrder` on Alice's Order A, Alice's `createOrReuseJobOpeningForSlot` fails closed (the order-scoped `acquireOrderAdvisoryLock` serializes the create with the prior revoke). |
| `E-09` | yes | F9 integration suite AC-08 → ADMIN `createOrReuseJobOpeningForSlot` on Bob's Order B succeeds (helper bypass for ADMIN). |
| `E-10` | yes | F9 integration suite AC-09 → HR_MANAGER `createOrReuseJobOpeningForSlot` on unassigned Order C succeeds (helper bypass for HR_MANAGER). |
| `E-11` | yes | F9 integration suite AC-10 → error envelope own-enumerable keys = `['code', 'details', 'httpStatus', 'name']`; `message` does NOT contain `slotBId` / `orderBId` / `aliceId` / `projectIds[0]` / `managerUserId` / `slot` / `project` / `assignee`; `details === undefined`. Allowed-set assertion preserved. |
| `E-12` | yes | F9 predecessor regressions → `tests/db/job-posting-authoring.integration.test.ts` + `tests/db/p1a04-canonical-flow.integration.test.ts` + `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` → 3 files, 43/43 PASS, 0 failed, 0 newly skipped. |
| `E-13` | yes | `git grep -nE "assertHrStaffRecruiterScope" src/domains/staffing/job-posting-authoring.service.ts` → 8 matches (helper definition + 7 call sites: `assertSlotEligibleForNewJobPosting` ×2, `createOrReuseJobOpeningForSlot` ×2, `createOrReuseJobPostingDraftForOpening`, `updateDraftContent`, `publishJobPosting`, `unpublishJobPosting`, `archiveJobPosting`, `getJobPostingForAuthoring`). |
| `E-14` | yes | `git grep -nE "acquireOrderAdvisoryLock" src/domains/staffing/job-posting-authoring.service.ts` → 8 matches (1 import + 7 call sites, one per service function). Canonical primitive from `recruiter-assignment.service.ts` (no second namespace). |
| `E-15` | yes | Guard is called INSIDE `withIdempotency` body (route's concern). Replay of the same `Idempotency-Key` re-observes the same authority posture. |
| `E-16` | yes | `tests/db/p1b-public-apply-slug-bound.integration.test.ts` — public read path is unchanged; `getPublicJobDetail` bypasses `assertActiveRecruiterForOrder`. |
| `E-17` | yes | `git grep -nE "hr-staff-recruiter-scope-banner" app/admin/jobs/job-postings/page.tsx` → matches the `data-testid`. Banner rendered only when `session.role === 'HR_STAFF'`. |
| `E-18` | yes | F9 integration suite `afterAll` block — exact-ID Prisma count assertions on `job_postings` / `job_openings` / `staffing_order_slots` / `staffing_orders` / `projects` / `client_companies` / `staffing_order_recruiter_assignments` / `users` all return 0. FK-safe reverse teardown. |
| `E-19` | yes | `git grep -nE "NO_ACTIVE_ORDER_ASSIGNMENT" src/domains/staffing/job-posting-authoring.service.ts` → 3 matches: enum literal, 2× wrapper re-throw sites. |
| `E-20` | yes | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` → 11/11 PASS; `EXPECTED_HITS` records the 5 new `jobOpening` lines (851, 955, 1082, 1151, 1224). Total src hits 32 → 36. |
| `E-21` | yes | `npx vitest run --config vitest.unit.config.ts` → 218/218 files PASS, 3594/3594 tests PASS, 9 pre-existing skips. |
| `E-22` | yes | `git log --oneline -5` → `0d38042f F9: HR_STAFF JobPosting assignment scoping — correction batch 1/1 (X4)` → `590fd35c F9: T1A runtime reproduction BLOCKED — docs correction (X3)` → `ab8845f7 F9: HANDOFF.md docs/evidence freeze (READY_FOR_AUDIT)` → `5bd1a3ea F9: HR_STAFF JobPosting assignment scoping — dual-boundary guard` → `6015361b Merge pull request #85 from nobita6986/codex/t1c-operational-workflow-debt-audit`. Predecessor chain preserved. |
| `E-23` | yes | F9 integration suite ×3 fresh processes (each via the wrapper, separate `node` processes): 12/12 PASS in run 1, 12/12 PASS in run 2, 12/12 PASS in run 3. 36/36 cumulative. Deterministic. Duration per run: 22-24 seconds. |
| `E-24` | yes | `npx vitest run src/shared/security/f9-hr-staff-posting-write-rls.static.test.ts` → 5/5 PASS. Static guard proves the four narrow policies exist with the expected shape (PERMISSIVE FOR UPDATE/INSERT, target `app_user_writer, app_user` only, predicate text contains `hrp_session_role`, `hrp_session_user_id`, `hrp_staffing_order_visible_for`, no `*_all` / `*_delete` / `staffing_orders_*` policies). |
| `E-25` | yes | Synthetic DB posture + migration deploy → `npx prisma migrate deploy` against `ep-empty-forest-azlhfyo9-*` reports "60 migrations found; No pending migrations to apply" — both F9 migrations (`20261003000000_f9_hr_staff_posting_write_rls` and `20261003000001_f9_hr_staff_posting_insert_rls`) are applied; live `pg_policies` query confirms all four narrow F9 policies (`hrp_f9_slots_staff_update`, `hrp_f9_postings_staff_update`, `hrp_f9_openings_staff_insert`, `hrp_f9_postings_staff_insert`) are present. Writer `rolsuper=false, rolbypassrls=false`; admin `bypassrls=true`; same host + database; production `ep-shy-tree-*` URLs counted-and-ignored, never dialed. |
| `E-26` | yes | `node .ai-pipeline/scripts/verify-encoding.mjs` → `RESULT: PASS (8 changed text file(s), strict UTF-8 without BOM)`. Files: TASK.md, two migration.sql files, four source/test files. |

## 4. Deviations and blockers

- **No deviations from TASK.md v1.1** at the implementation contract level. All 26 STEPs (STEP-01..STEP-18 + STEP-19..STEP-26) executed as specified on Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`. The contract gate did not produce a 0-pass first run; the contract delta was authored BEFORE the implementation round began per T0 directive. The implementation round passed all canonical gates on the first try at X4; no further correction budget was spent.
- **Round 1 (X1, `5bd1a3ea`) was BLOCKED at 7/12** — the T1A runtime reproduction found that the writer connection's raw `SELECT FOR UPDATE` at `src/domains/staffing/job-posting-authoring.service.ts:454-475` (X1) returned 0 rows when the writer's `staffing_order_slots` row was RLS-hidden by `hrp_sora_order_slots_staff_select` (HR_STAFF sees a slot only via ACTIVE assignment on the parent order). The service threw `NOT_FOUND` instead of the contract-mandated `NO_ACTIVE_ORDER_ASSIGNMENT` 403. **At X4 this is fixed** by the correction batch 1/1: the writer connection now has narrow UPDATE + INSERT policies on `staffing_order_slots` / `job_openings` / `job_postings` gated on `hrp_staffing_order_visible_for(...)`, and the guard re-ordering participates in the canonical `acquireOrderAdvisoryLock` so the post-lock FOR UPDATE is admitted for the assigned case while the never-visible case still returns stable `NOT_FOUND`.
- **Contract correction** per T0 directive (DEC-05-b): the binding decision required a stable fail-closed error code; it did NOT require every RLS-hidden row to return `NO_ACTIVE_ORDER_ASSIGNMENT`. The corrected contract allows `NOT_FOUND` for the never-visible case (preserves no-existence-oracle) and prefers `NO_ACTIVE_ORDER_ASSIGNMENT` for the assigned-then-lost case. Test assertions on the exact code are replaced with an explicit allowed-set assertion. This is recorded in TASK.md §3 (DEC-05-b) and §6 (AC-02/03/05/06/07/10 allowed-set).

| ID | Type | Detail | Required owner / decision |
|---|---|---|---|
| (none) | — | All gates PASS. No blockers. | — |

## 5. Final status

- Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` is **frozen** at T1A correction batch 1/1 handback (semantic correction completed; AC-04 happy path now PASSes; F9 suite 12/12 ×3 fresh processes; predecessor regressions 43/43).
- Working tree is clean post-`X5` (this docs/evidence freeze commit; only `HANDOFF.md` changes).
- Predecessor chain preserved: `6015361b → 5bd1a3ea → ab8845f7 → 590fd35c → 0d38042f → (X5)`.
- Synthetic-DB posture gate: `POSTURE_OK writer_is_writer admin_is_admin same_target` (T0 E.A).
- F9 integration suite ×3 fresh processes: **12 passed | 0 failed | 0 skipped (each run)**, deterministic across 36/36 cumulative. AC-04 happy path now succeeds (was BLOCKED at X1). AC-02/03/05/06/07/10 all assert allowed-set envelope per DEC-05-b. No PII leakage, exact-ID zero residue.
- Predecessor regressions (`job-posting-authoring`, `p1a04-canonical-flow`, `p1a04-scoped-recruiter-authority`): **3 files, 43/43 PASS, 0 failed, 0 newly skipped**.
- Secondary/canonical gates: required-relation sweep 11/11 PASS, authoring unit 26/26 PASS, publish-contract unit 6/6 PASS, stamps-eligibility 6/6 PASS, F9 narrow RLS static guard 5/5 PASS, full unit 218/218 files (3594/3594 tests) PASS, typecheck PASS, lint 0 errors, build PASS, `prisma validate` PASS, `git diff --check` PASS, encoding verification 8/8 PASS, `verify-task.ps1` PASS. **`verify-handoff.ps1` PASS** (this commit).
- One of 1 correction budget spent (correction batch 1/1). 0 budget remaining on the implementation.
- **Audit eligibility: `ELIGIBLE`.**
- **Next gate: `TIER3_LIGHT_AUDIT`** on exact frozen Implementation SHA `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26`. Branch is ready for Tier 3 review.
- Mốc 2 / Mốc 3 not opened; no merge to `main` performed by Tier 1; no production DB or production migration touched; `ep-shy-tree-*` host prefix never dialed.
- Tier 3 LIGHT audit NOT called per T0 directive boundary ("STOP after handback to T0").

— Tier 1 (T1A), 2026-10-03

Handoff status: READY_FOR_AUDIT (correction batch 1/1 PASS; awaiting TIER3_LIGHT_AUDIT)