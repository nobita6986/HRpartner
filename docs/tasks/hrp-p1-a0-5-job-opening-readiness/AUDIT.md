# AUDIT — `hrp-p1-a0-5-job-opening-readiness`

> Tier 3 LIGHT audit round 1. V2_FAST_FREEZE.
> Independent measurement on synthetic Neon DB
> (`ep-empty-forest-azlhfyo9-*`). LOCK-08 RLS-policy escape acknowledged.
> T0 runtime evidence carried forward with provenance + posture verified.

## 0. Audit Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-5-job-opening-readiness` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` |
| Audit mode | `LIGHT` |
| Audit round | `1` |
| Audit depth | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0` |
| Baseline | `a64c81e954325091a78ec9fb7f441a094df5dcfc` |
| Implementation SHA | `deb506cd689647bea651dcd862ff834307b84db9` |
| Semantic Implementation SHA | `deb506cd689647bea651dcd862ff834307b84db9` |
| Post-semantic docs reconciliation SHA | `c3b7ec2536ada413e22ccbe3fa5d52e434065754` |
| Prior freeze/control SHA | `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` |
| Audit-target HEAD | `0bdf59cb84f9c83ef28715b4d1327120a60eec6f` |
| Audit worktree | `C:\CodeApp\HrP-t1c-p1a05-job-opening-readiness-impl` |
| Audit branch | `codex/t1c-p1a05-job-opening-readiness-impl` |
| Frozen delivery (HANDOFF) | `YES` |
| Audit eligibility (HANDOFF) | `ELIGIBLE` |
| Status (HANDOFF) | `READY_FOR_AUDIT` |
| LOCK-08 migration | `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (blob SHA-1 `1d93291a90feecb846f7bb0cea9e4e91d5f74c23`, byte-preserved) |
| Production DB / production migration | `NOT_RUN` |
| Verdict | `PASS` |

## 1. Findings

| ID | Severity | Release-blocking | Owner | Description |
| --- | --- | --- | --- | --- |
| AUD-001 | P3 | NO | Tier 1 (TASK) | `HANDOFF.md` §2 AC table maps `AC-01` to `E-01` (`npm run typecheck`) but `TASK.md` §6.1 AC-01 is the **schema posture** AC (`prisma validate`, `prisma generate`, exactly one T0-authorized forward-only RLS-policy migration, byte-preserved). HANDOFF's §3 evidence registry `E-01..E-15` enumerates evidence by gate command rather than by TASK AC id, producing a 1:N mismatch. Not blocking — the verifier reads AC ids from TASK.md (the authoritative source) and Tier 3 measured each TASK AC by its actual evidence (typecheck as AC-09, schema posture as AC-01). Tier 1 may rename HANDOFF AC table to use a `Step / Gate` header rather than AC ids in a future docs round; HANDOFF §3 evidence registry remains authoritative for measured values. |
| AUD-002 | P3 | NO | Tier 1 (TASK) | `verify-task.ps1` returns `RESULT: DRAFT-VALID (2 warning(s))` — T-09 advisory on Contract gate value (which is the long descriptive value `READY_FOR_AUDIT (SEMANTIC IMPLEMENTATION SHA … + POST-SEMANTIC DOCS RECONCILIATION SHA … CLOSED §A–§N; …)` rather than the canonical token `READY_FOR_AUDIT` / `DRAFT` / `READY_TO_CODE`) and A-04 expected advisory on `READY_FOR_AUDIT` status. Both are expected per Tier 3 prior-round precedent (`v1.4` reconciliation round explicitly accepts these advisories; HANDOFF §0 records `READY_FOR_AUDIT` semantically). Not blocking. |
| AUD-003 | P3 | NO | Tier 1 (TASK) | `verify-handoff.ps1` returns `RESULT: PASS WITH WARNINGS (1 warning(s))` — H-15 advisory on `Status` and `Next gate` fields (TASK §0 long descriptive value vs HANDOFF §0 compact value). Expected per v1.4 reconciliation; not blocking. |
| AUD-004 | P3 | NO | Tier 0 | The two global P1 release blockers — `P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION` and `P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY` — advance to `IMPLEMENTED_PENDING_AUDIT` at implementation freeze. Pre-merge AUDIT (this document) advances them to `AUDITED_PENDING_MAIN_MERGE` per v1.2 §I-02 (LOCK-10). Final `RESOLVED_BY_P1_A0_5` is recorded ONLY in post-merge HANDOFF closeout after runtime UI/HTTP E2E PASS on main-compatible deployment. Tier 3 has NOT marked either blocker as `RESOLVED_BY_P1_A0_5` in this round. |
| AUD-005 | P3 | NO | Tier 0 | Historical pre-existing synthetic-DB residue on `idempotency_keys` (169 rows at audit time) is disclosed as a carryover from P1-A0.4 / P1-F0 / P1-F1 prior rounds (same `ep-empty-forest-*` synthetic cluster). Tier 3 confirmed via the integration suite's Checkpoint #3 (post-cleanup exact-ID zero-residue assertions ×3 on `idempotency_keys` scoped to `actorId IN idempotencyActorIds` of the P1-A0.5 run) that the A0.5 round does NOT introduce new idempotency-keys residue. Pre-existing residue is historical synthetic-DB debt left untouched per T0 decision (carryover pattern from P1-A0.4 audit round). |
| AUD-006 | P3 | NO | Tier 1 (TASK) | HANDOFF §0 record `New audit-target HEAD | (pinned at v1.4 docs/control reconciliation commit SHA — see …)` is a self-referential placeholder. T0 externally pins the authoritative audit-target HEAD = `0bdf59cb84f9c83ef28715b4d1327120a60eec6f` (T0 directive). Tier 3 recorded the resolved SHA in AUDIT §0; live `git rev-parse HEAD` returns the same SHA. |
| AUD-007 | P3 | NO | Tier 1 (TASK) | `HANDOFF.md` §3 evidence registry row `E-14` carries a long self-describing value (semantic SHA + post-semantic docs SHA + prior freeze SHA identity mapping). This is a HANDOFF §3 evidence registry style debt, not an AUDIT.md gate failure (the verifier does not require HANDOFF evidence rows to follow a fixed column shape — H-06 accepts this style as long as it is runnable). Not blocking. |
| AUD-008 | P3 | NO | Tier 1 (TASK) | `lint` reports `0 errors, 900 pre-existing warnings` against the v1.5 changed surface; same warning count reproduces on baseline `a64c81e9...`. HANDOFF §2 AC-02 records the warning count and pins baseline reproduction. Pre-existing debt from prior rounds; v1.5 round did not introduce any new warnings. Not blocking. |

No P0, P1, or P2 release-blocking findings on the P1-A0.5 surface. Tier 3 recommends PASS.

## 2. Acceptance Verification

### 2.1 Acceptance criteria (AC-01..AC-15)

| AC | Method | Result | Evidence |
| --- | --- | --- | --- |
| AC-01 | `npx prisma validate`; `npx prisma generate`; `git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD -- prisma/migrations/`; `git hash-object prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (byte-stability check). | PASS | `npx prisma validate` exit 0; `npx prisma generate` exit 0; `git diff --name-only a64c81e9..HEAD -- prisma/migrations/` returns exactly the one T0-authorized migration path; `git hash-object` returns `1d93291a90feecb846f7bb0cea9e4e91d5f74c23` (matches `git ls-files --stage` recorded blob SHA); no `prisma/schema.prisma` modification. |
| AC-02 | `npx vitest run --config vitest.unit.config.ts app/api/admin/staffing/job-openings/[id]/classify/route.test.ts`. | PASS | `route.test.ts` exit 0; `16/16` PASS covers role gate ADMIN/HR_MANAGER pass + HR_STAFF 403, Idempotency-Key required, Zod validation 4-enum (null/missing/unknown → 400 INVALID_INPUT), unknown openingId → 404, DRAFT + valid 200, OPEN/FILLED/CANCELLED 409, same-key replay 200 + `replayed:true`, same-key different payload 409 IDEMPOTENCY_CONFLICT, typed envelope snapshot. |
| AC-03 | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-opening-activation.service.test.ts -t 'classifyJobOpening'`. | PASS | `job-opening-activation.service.test.ts` exit 0; `classifyJobOpening` service unit tests PASS — DRAFT→set, OPEN/FILLED/CANCELLED reject, NULL/missing/unknown serviceModel → 400 INVALID_INPUT, placement-exists → 409 INVALID_STATE_TRANSITION (defense in depth), atomic + race-safe (last-committed-wins under row lock). |
| AC-04 | `npx vitest run --config vitest.unit.config.ts app/api/admin/staffing/job-openings/[id]/open/route.test.ts`. | PASS | `route.test.ts` exit 0; `20/20` PASS covers role gate ADMIN/HR_MANAGER pass + HR_STAFF 403 NO_ACTIVE_ORDER_ASSIGNMENT (with active assignment pass), Idempotency-Key required, empty body (unexpected payload → 400 INVALID_INPUT), unknown openingId → 404, full 7-precondition set server-side, same-key replay 200, idempotency conflict 409, typed envelope snapshot. |
| AC-05 | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-opening-activation.service.test.ts -t 'openJobOpening'`. | PASS | `job-opening-activation.service.test.ts` exit 0; `openJobOpening` service unit tests PASS — DRAFT + serviceModel + parent OPEN + slot eligible + `StaffingOrder.deadlineDate` not passed + `StaffingOrderSlot.validTo` not passed + slotsFilled < slotsNeeded + authority → OPEN with `opened_at` stamp; NULL serviceModel → 422 SERVICE_MODEL_REQUIRED; parent order not OPEN (CLOSING_SOON or CLOSED) → 409 ORDER_NOT_OPEN; slot ineligible / deadline / over-filled → 409 SLOT_NOT_ELIGIBLE; HR_STAAF without active assignment → 403 NO_ACTIVE_ORDER_ASSIGNMENT; presence of `JobPosting DRAFT` MUST NOT fail `/open`; concurrent race (2 distinct-key callers racing DRAFT→OPEN) → exactly one 200 + one 409 INVALID_STATE_TRANSITION; OPEN/FILLED/CANCELLED opening → 409 INVALID_STATE_TRANSITION; new key against already-OPEN → 409 INVALID_STATE_TRANSITION. |
| AC-06 | `npx vitest run --config vitest.unit.config.ts app/admin/job-openings/[id]/job-opening-actions.test.tsx app/admin/job-openings/[id]/page.test.tsx`. | PASS | `job-opening-actions.test.tsx` (13/13 PASS) + `page.test.tsx` (15/15 PASS, 28 total) cover the HR_STAFF / ADMIN / HR_MANAGER / DIRECTOR / PM / assigned-HR_STAFF / unassigned-HR_STAFF / revoked-HR_STAFF visibility matrix; outer page role admission broadened to include HR_STAFF gated by A0.4 RLS (unassigned HR_STAFF → notFound/fail-closed); ServiceModel selector renders only when Server-derived `canClassify === true`; HR_STAFF never sees ServiceModel selector; OPEN button rendered only when Server-derived `canOpen === true`; HR_STAFF without active assignment: button disabled + reason text; `router.refresh()` on success; inline status text (no new toast framework); Client Component never re-derives authority or lifecycle; admin shell layout/sidebar unchanged. |
| AC-07 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` (×3). | PASS | Run 1: 28/28 PASS in 80.03s; Run 2: 28/28 PASS in 79.08s; Run 3: 28/28 PASS in 76.70s. Aggregate: 84/84 PASS across 3 runs. Full 12-step DB-integration no-developer E2E chain (AC-E2E-01..AC-E2E-12 in §6.2): admin DB used only for fixture-only setup/teardown; writer connection runs all business mutations; inline exact-ID zero-residue Checkpoint #1, #2, #3 PASS. |
| AC-08 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-r3-substantive.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts tests/db/recruiter-workbench.integration.test.ts tests/db/placement-lifecycle-integration.test.ts` (×3). | PASS | Run 1: 5 files / 73 tests / 0 failed (Duration 230.63s); Run 2: 5 files / 73 tests / 0 failed (Duration 234.99s); Run 3: 5 files / 73 tests / 0 failed (Duration 229.42s). Aggregate: 219/219 PASS across 3 runs. Composition: p1a04-canonical-flow (11/11) + p1a04-r3-substantive (7/7) + p1a04-scoped-recruiter-authority (19/19) + recruiter-workbench (20/20) + placement-lifecycle (16/16) = 73/73 each run. |
| AC-09 | `npx tsc --noEmit`; `npx eslint --no-warn-ignored <v1.5 changed surface>`; `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-opening-activation.service.test.ts src/domains/staffing/job-opening-read.service.test.ts src/shared/security/required-relation-sweep.static.test.ts src/shared/toolchain/vitest-default-lane.static.test.ts`. | PASS | `npx tsc --noEmit` exit 0 (0 type errors); `npx eslint --no-warn-ignored` on 10 changed source/test files exit 0 (0 errors / 0 warnings on changed surface; 900 pre-existing warnings on the whole tree matches baseline `a64c81e9`); unit targeted `44/44` PASS (24 + 9 + 11) covers activation.service + read.service + required-relation-sweep. |
| AC-10 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md`. | PASS | `verify-task.ps1` exit 0; `RESULT: DRAFT-VALID (2 warning(s))` (T-09 + A-04 expected advisories on v1.4 reconciliation round); substance gates A-01..A-05 + T-01..T-11 OK. `verify-handoff.ps1` exit 0; `RESULT: PASS WITH WARNINGS (1 warning(s))` (H-15 expected advisory on v1.4 reconciliation round); H-16 frozen-delivery gate closes (Frozen delivery YES, Canonical gates PASS, Correction batches used 1, Audit eligibility ELIGIBLE, Implementation SHA `deb506cd…`, no post-`e0c88565` semantic delta). |
| AC-11 | `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` (×3) — observe Checkpoint #3 `expect(v, 'checkpoint#3 zero-residue.X for p1a05 runId').toBe(0)` assertions in `afterAll` block. | PASS | Checkpoint #3 (post-cleanup exact-ID zero-residue) PASS ×3 on every tracked bucket: openings, orders, slots, users, recruiterAssignments, postings, projects, companies, placementExistsPlacements, placementExistsCases, placementExistsProfiles, idempotencyKeys (scoped to `actorId IN idempotencyActorIds`). `TOTAL_RESIDUE = 0` per run across 12 buckets. Zero-residue lives INLINE in the integration suite as exact-ID assertions per v1.1 §I. |
| AC-12 | `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD`. | PASS | exit 0; `RESULT: PASS. 23/23 text file(s) in range a64c81e9..HEAD; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks`. |
| AC-13 | `git rev-parse --verify deb506cd689647bea651dcd862ff834307b84db9^{commit}` + HANDOFF.md §0 row `Implementation SHA | deb506cd...`. | PASS | `git rev-parse --verify deb506cd…^{commit}` exit 0; SHA resolves; HANDOFF.md §0 records the full 40-character `deb506cd689647bea651dcd862ff834307b84db9`; also disambiguates the `c3b7ec2536ada413e22ccbe3fa5d52e434065754` (post-semantic docs reconciliation SHA) and `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` (prior freeze/control SHA). |
| AC-14 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` (control field cross-check) + `grep -nE "AUDITED_PENDING_MAIN_MERGE"` against TASK.md + read TASK §0 row `P1 release blockers in scope \| …`; cross-check HANDOFF.md does NOT claim `RESOLVED_BY_P1_A0_5` for either blocker pre-merge. | PASS | `verify-task.ps1` exit 0; `grep -nE "AUDITED_PENDING_MAIN_MERGE"` returns multiple matches in TASK §0 row + §6.3 + §7 + §8 (blocker state pinned pre-merge); HANDOFF.md does NOT contain `RESOLVED_BY_P1_A0_5`. Tier 3 records both blockers as `AUDITED_PENDING_MAIN_MERGE` for the pre-merge AUDIT round. |
| AC-15 | `git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD`; count returned paths. | PASS | `git diff --name-only a64c81e9..HEAD` returns exactly 23 paths, all inside the in-scope roots allowlist (1 discovery doc + 2 task/contract files + 1 new migration + 4 route/component files + 4 service + DTO + predicate files + 2 unit test files + 1 new integration test + 3 registry/config files + 1 static test). No path outside the allowlist; static guard confirms. |

### 2.2 Assurance Checks

| Check | Status | Evidence |
| --- | --- | --- |
| C-01 | DONE | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` — exit 0; `RESULT: DRAFT-VALID (2 warning(s))` (T-09 + A-04 expected advisories on v1.4 reconciliation round); A-01..A-05 + T-01..T-11 substance OK. |
| C-02 | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` — exit 0; `RESULT: PASS WITH WARNINGS (1 warning(s))` (H-15 expected advisory); H-16 frozen-delivery gate closes (Frozen delivery YES, Canonical gates PASS, Correction batches used 1, Audit eligibility ELIGIBLE, Implementation SHA `deb506cd…`, no post-`e0c88565` semantic delta). |
| C-03 | DONE | `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD` — exit 0; `RESULT: PASS. 23/23 text file(s) in range a64c81e9..HEAD; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks`. |
| C-04 | DONE | `git diff --check a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD` — exit 0; empty output (no whitespace-only lines / LF-only). |
| C-05 | DONE | `git rev-parse --verify a64c81e9…^{commit}` + `git rev-parse --verify deb506cd…^{commit}` + `git rev-parse --verify c3b7ec25…^{commit}` + `git rev-parse --verify e0c88565…^{commit}` + `git rev-parse --verify 0bdf59cb…^{commit}` — exit 0 all five; all five SHAs resolve; TASK §0 + HANDOFF §0 + Tier 3 prompt audit-target HEAD all match exactly. |
| C-06 | DONE | `git rev-parse HEAD` — exit 0; returns `0bdf59cb84f9c83ef28715b4d1327120a60eec6f` (matches prompt audit-target exactly). |
| C-07 | DONE | `git status --short` — exit 0; empty output (clean working tree at audit-target HEAD). Also `git diff --name-only e0c88565602f4ac00a2a99cc6df983ef38ce7c98 HEAD` returns 2 files (`docs/tasks/hrp-p1-a0-5-job-opening-readiness/{HANDOFF.md, TASK.md}` — the v1.4 docs/control round). Also `git diff e0c88565..HEAD -- app src prisma tests scripts packages` returns only the LOCK-08 migration path (`prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql`) — no other source/test/path delta introduced by the v1.4 round. |
| C-08 | DONE | `npx tsc --noEmit` — exit 0; `tsc --noEmit` clean (0 errors). Also `npx eslint --no-warn-ignored` on 10 changed source/test files — exit 0; 0 errors / 0 warnings on v1.5 changed surface; full-tree `900 pre-existing warnings` reproduces on baseline `a64c81e9...` (same count, pinned in HANDOFF §2 AC-02). |
| C-09 | DONE | `git rev-parse --verify 0bdf59cb…^{commit}` — exit 0; HEAD resolves; `git rev-parse --abbrev-ref HEAD` returns `codex/t1c-p1a05-job-opening-readiness-impl`; HANDOFF §0 + TASK §0 + Tier 3 prompt + audit-target HEAD all match exactly. |
| C-10 | DONE | `git diff --name-only a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD` — exit 0; output limited to 23 paths, all inside the implementation allowlist; no `app/` `src/` `prisma/` `tests/` `scripts/` `packages/` delta outside the allowlist (only the single T0-authorized LOCK-08 migration path is new in `prisma/migrations/`). |

## 3. Scope

Audit surface (independent re-measurement in this round):

- **Baseline**: `a64c81e954325091a78ec9fb7f441a094df5dcfc` (T0 production closeout of P1-A0.4; current `origin/main` after forward-merge).
- **Semantic Implementation SHA**: `deb506cd689647bea651dcd862ff834307b84db9` — closes all §A–§N items (forward-only on top of `3b1898f5af5186f4b14072d3d3da9cd11e381b9b`).
- **Post-semantic docs reconciliation SHA**: `c3b7ec2536ada413e22ccbe3fa5d52e434065754` — docs-only fixup after semantic implementation.
- **Prior freeze/control SHA**: `e0c88565602f4ac00a2a99cc6df983ef38ce7c98` — pinned prior freeze; v1.4 docs/control reconciliation commit is forward-only on top of this SHA.
- **Audit-target HEAD**: `0bdf59cb84f9c83ef28715b4d1327120a60eec6f` — v1.4 docs/control reconciliation commit (forward-only on top of `e0c88565`).
- **Cumulative baseline..HEAD range** `a64c81e9..0bdf59cb`: 23 paths total; 1 new RLS UPDATE policy migration + 4 route/component files + 4 service + DTO + predicate files + 1 new integration test + 2 unit test files + 3 registry/config files + 1 static test + 1 discovery doc + 2 task/contract files. All paths inside the in-scope allowlist.
- **Post-freeze source delta** `e0c88565..HEAD`: only `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (LOCK-08 escape) was added between `e0c88565..HEAD` — no other source/test/path changes.
- **v1.4 docs/control delta** `e0c88565..HEAD -- docs/tasks/`: only `docs/tasks/hrp-p1-a0-5-job-opening-readiness/{HANDOFF.md, TASK.md}`.

Forbidden-path audit (cumulative `a64c81e9..0bdf59cb`):

- `src/domains/crm/**`, `src/domains/media/**`, `src/domains/referrals/**`: not in delta.
- `app/api/admin/erp/**`, `app/api/admin/payroll/**`: not created.
- `docs/PLANNER_HANDOVER.md`: not modified.
- Production `.env*` files: not modified.
- Sidebar/navigation/menu/IA routes (`src/shared/ui/role-guard/role-guard-layout.tsx`, `app/admin/layout.tsx`, `src/shared/ui/navigation/**`): not modified.
- n8n integration, new toast framework/dependency: not introduced.
- Zero-residue probe (external helper): not created; zero-residue lives inline in integration suite as exact-ID assertions, per v1.1 §I.
- No path outside the in-scope roots: confirmed by `git diff --name-only a64c81e9..HEAD` returning 23 paths, all inside allowlist.

### DB runtime evidence

Tier 3 independently re-ran the synthetic Neon DB gate (`ep-empty-forest-azlhfyo9-*`)
three times on the writer/admin pair (credentials extracted from `C:\cre_hrp.txt` line 1 = admin, line 3 = writer; never printed, logged, or committed):

- **DB posture**: writer `app_user_writer` non-super + non-bypassrls (`bypassrls=false`, `issuper=false`); admin `neondb_owner` bypassrls (`bypassrls=true`); same host/port/database; synthetic-only cluster.
- **P1-A0.5 integration ×3**: `tests/db/p1a05-job-opening-readiness.integration.test.ts` — 28 tests × 3 = **84/84 PASS** (Run 1: 80.03s, Run 2: 79.08s, Run 3: 76.70s).
- **Predecessor regressions ×3** (5 files): 73 tests × 3 = **219/219 PASS** (Run 1: 230.63s, Run 2: 234.99s, Run 3: 229.42s).
- **Required-relation closed-set guard**: `src/shared/security/required-relation-sweep.static.test.ts` — 11/11 PASS (35 hits).
- **vitest default-lane static guard**: `src/shared/toolchain/vitest-default-lane.static.test.ts` — PASS (lane lock sentinel enforced; cannot reach a live DB through `npx vitest run`).
- **Targeted unit lane**:
  - `job-opening-activation.service.test.ts` — 24/24 PASS.
  - `job-opening-read.service.test.ts` — 9/9 PASS.
  - `recruiter-workbench.read-service` + `recruiter-assignment.routes` + `recruiter-placement.routes` + `recruiter-placement.routes-transitions` + `recruiter-assignment.routes.test` + `recruiter-assignment.ui` + `assignment-placement.routes` + `marketplace-inventory.static` + `recruiter-workbench.derive` etc. — covered by HANDOFF §3 E-06 (`210 files / 3513 passed / 9 skipped / 0 failed`).
- **Route + component unit lane** (in-scope roots):
  - `app/api/admin/staffing/job-openings/[id]/classify/route.test.ts` — 16/16 PASS.
  - `app/api/admin/staffing/job-openings/[id]/open/route.test.ts` — 20/20 PASS.
  - `app/admin/job-openings/[id]/page.test.tsx` — 15/15 PASS.
  - `app/admin/job-openings/[id]/job-opening-actions.test.tsx` — 13/13 PASS.
- **Inline exact-ID zero-residue** (Checkpoint #1 + #2 + #3 ×3): `TOTAL_RESIDUE = 0` per run across 12 tracked buckets (openings, orders, slots, users, recruiterAssignments, postings, projects, companies, placementExistsPlacements, placementExistsCases, placementExistsProfiles, idempotencyKeys scoped to `actorId IN idempotencyActorIds`). P1-A0.5 round does NOT introduce new residue. Per v1.1 §I, zero-residue lives INLINE in the integration suite as exact-ID assertions; the non-existent external helper referenced in older planning wording is NOT used.
- **Pre-existing residue** (carryover P1-A0.4 / P1-F0 / P1-F1 rounds, NOT introduced by A0.5): `idempotency_keys` = 169 rows at audit time. Disclosed as AUD-005 P3 documentation debt; not blocking.
- **Production DB / production migration**: NOT_RUN; production hostname (`ep-shy-tree-az32as2c-*`) never opened. Synthetic-only cluster used.
- **LOCK-08 RLS-policy migration**: `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` applied to synthetic DB only at this stage; blob SHA-1 `1d93291a90feecb846f7bb0cea9e4e91d5f74c23` byte-preserved across `deb506cd`, `c3b7ec25`, and `e0c88565..HEAD`; production migration authority belongs only to T0/Owner after Tier 3 LIGHT audit PASS + PR merge + release approval.

### LOCK-08 RLS-policy migration content (synthetic-DB-asserted)

The single T0-authorized forward-only migration adds a NARROW PERMISSIVE UPDATE policy `hrp_a05_job_openings_staff_update` on `public.job_openings`:

- `TO app_user_writer, app_user` (writer roles only; admin uses existing `job_openings_update` policy).
- `USING (hrp_session_role() = 'HR_STAFF' AND hrp_session_user_id() <> '' AND public.hrp_staffing_order_visible_for(staffing_order_id))`.
- `WITH CHECK` symmetric to `USING`.
- Idempotent (`DROP POLICY IF EXISTS`); static-test guard asserts policy count = 1 after apply.

Behavior:

- Scoped HR_STAFF (active `StaffingOrderRecruiterAssignment`) acquires `FOR UPDATE` row lock for `DRAFT → OPEN` transition; `pg_advisory_xact_lock` (or row-level lock) serializes the transition.
- Revoked / unassigned HR_STAFF callers are privacy-fail-closed at the SELECT stage (existing `hrp_sora_job_openings_staff_select` policy does not admit them); `openJobOpening` service surfaces 404 NOT_FOUND for those cases (matches page-level `notFound()` envelope).
- No unscoped cross-order access (predicate pins to `staffing_order_id` via `hrp_staffing_order_visible_for`).
- Existing ADMIN/HR_MANAGER behavior is preserved (existing `job_openings_update` policy via `hrp_project_writable` OR'd with new policy).

## 4. Independent Evidence

| Command | Exit | Result |
| --- | --- | --- |
| `git rev-parse HEAD` | 0 | `0bdf59cb84f9c83ef28715b4d1327120a60eec6f` (matches prompt audit-target) |
| `git rev-parse --abbrev-ref HEAD` | 0 | `codex/t1c-p1a05-job-opening-readiness-impl` |
| `git status --short` | 0 | (empty — clean working tree) |
| `git rev-parse --verify a64c81e9… deb506cd… c3b7ec25… e0c88565… 0bdf59cb…` | 0 | all five SHAs resolve |
| `git diff --name-only a64c81e9..HEAD` | 0 | 23 paths (1 new migration + 22 semantic + docs files), all inside allowlist |
| `git diff --check a64c81e9..HEAD` | 0 | (empty — LF-only, no whitespace-only lines) |
| `git diff e0c88565..HEAD -- app src prisma tests scripts packages` | 0 | only `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` (LOCK-08 escape) — no other source/test/path delta |
| `git hash-object prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/migration.sql` | 0 | `1d93291a90feecb846f7bb0cea9e4e91d5f74c23` (matches `git ls-files --stage` recorded blob SHA) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` | 0 | `RESULT: DRAFT-VALID (2 warning(s))` (T-09 + A-04 expected advisories); substance OK |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-5-job-opening-readiness/TASK.md` | 0 | `RESULT: PASS WITH WARNINGS (1 warning(s))` (H-15 expected advisory); H-16 closes |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs a64c81e954325091a78ec9fb7f441a094df5dcfc HEAD` | 0 | `RESULT: PASS. 23/23 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks` |
| `npx tsc --noEmit` | 0 | `tsc --noEmit` clean (exit 0; 0 errors) |
| `npx eslint --no-warn-ignored <10 v1.5 changed source/test files>` | 0 | 0 errors / 0 warnings on v1.5 changed surface |
| `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-opening-activation.service.test.ts src/domains/staffing/job-opening-read.service.test.ts src/shared/security/required-relation-sweep.static.test.ts` | 0 | 3 files / 44 tests / 0 failed |
| `npx vitest run --config vitest.unit.config.ts app/api/admin/staffing/job-openings/[id]/classify/route.test.ts app/api/admin/staffing/job-openings/[id]/open/route.test.ts app/admin/job-openings/[id]/job-opening-actions.test.tsx app/admin/job-openings/[id]/page.test.tsx` | 0 | 4 files / 64 tests / 0 failed |
| `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` | 0 | 1 file / 28 tests / 0 failed (×3 runs: 28+28+28 = 84/84 aggregate) |
| `CI_INTEGRATION_STRICT=1 npx vitest run --config vitest.integration.config.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-r3-substantive.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts tests/db/recruiter-workbench.integration.test.ts tests/db/placement-lifecycle-integration.test.ts` | 0 | 5 files / 73 tests / 0 failed (×3 runs: 73+73+73 = 219/219 aggregate) |

## 5. Coverage Gaps

No AC are `ENV_BLOCKED` in this round — Tier 3 successfully re-ran every
synthetic-DB-gated AC locally on the synthetic Neon cluster
(`ep-empty-forest-azlhfyo9-*`). DB posture, 3 × P1-A0.5 integration file
(28/28 PASS ×3), 3 × 5-file predecessor regression (73/73 PASS ×3), targeted
unit lane (44/44 + 64/64 PASS), inline exact-ID zero-residue Checkpoint #1+#2+#3
×3 (`TOTAL_RESIDUE = 0`), typecheck, eslint, encoding, and forbidden-path audit
all measured independently at the audit-target HEAD.

The 12-step DB-integration suite (`tests/db/p1a05-job-opening-readiness.integration.test.ts`)
covers AC-E2E-01..AC-E2E-12 (canonical 12-step DB/domain flow per TASK §6.2):
classify → scoped open → JobPosting authoring/publish → public listing/detail →
anonymous apply → Workbench MINE → claim → placement action → valid Placement
outcome. This is DB/service/route integration evidence via canonical
production services/routes only; it is NOT falsely described as final
post-merge browser UI evidence. Per TASK §I-03 (v1.2 §I-03), runtime UI/HTTP
E2E on main-compatible deployment is MANDATORY for final P1 closeout and is
captured separately (post-merge HANDOFF §I-03; only readable after merge).

The two global P1 release blockers (`P1_RELEASE_BLOCKER_JOB_OPENING_ACTIVATION`,
`P1_RELEASE_BLOCKER_SERVICE_MODEL_CLASSIFY`) are recorded in TASK §0 row and
as AUD-004 (P3 documentation debt). Per v1.2 §I-02 / LOCK-10, pre-merge AUDIT
(this document) advances both blockers to `AUDITED_PENDING_MAIN_MERGE` (NOT
`RESOLVED_BY_P1_A0_5`); final `RESOLVED_BY_P1_A0_5` is recorded ONLY in
post-merge HANDOFF closeout after runtime UI/HTTP E2E PASS on main-compatible
deployment.

Historical pre-existing synthetic-DB residue on `idempotency_keys` (169 rows
at audit time) is disclosed as AUD-005 P3 documentation debt — carryover from
P1-A0.4 / P1-F0 / P1-F1 rounds on the same synthetic cluster. The P1-A0.5
integration suite's Checkpoint #3 verifies that the A0.5 round does NOT
introduce new residue (scoped to `actorId IN idempotencyActorIds`).

## 6. Verdict

**Verdict:** PASS

Rationale: 15/15 TASK §6.1 planning AC independently verified (PASS) at the
audit-target HEAD via Tier 3 live re-run on the synthetic Neon DB, code
inspection, and source/spec matching; 12/12 TASK §6.2 E2E AC verified (PASS)
via the canonical 12-step DB-integration no-developer E2E suite re-run 3
times (28/28 ×3 = 84/84 aggregate PASS), plus the 5-file predecessor
regression suite re-run 3 times (73/73 ×3 = 219/219 aggregate PASS), plus the
required-relation closed-set guard (11/11 PASS) and targeted unit lane
(44/44 + 64/64 = 108/108 PASS); 0 AC are ENV_BLOCKED. Frozen delivery
(`Implementation SHA = deb506cd…`); canonical gates (`verify-task.ps1`
DRAFT-VALID with expected T-09 + A-04 advisories; `verify-handoff.ps1` PASS
WITH WARNINGS with expected H-15 advisory; `verify-encoding-range.mjs` 23/23
PASS); tier-3 substance checks (`git diff --check a64c81e9..HEAD` empty;
forbidden-path audit empty; `git diff e0c88565..HEAD -- app src prisma tests
scripts packages` returns only the LOCK-08 migration path; typecheck clean;
eslint clean on 10 changed files; integration suites 28/28 ×3; predecessor
regressions 73/73 ×3; unit lane 108/108; required-relation 11/11; Checkpoint
#1+#2+#3 ×3 zero-residue) all green. LOCK-08 RLS-policy migration applied to
synthetic DB only at this stage (production migration NOT_RUN, T0/Owner
authority). DB posture verified at audit-target HEAD (writer non-super +
non-bypassrls; admin bypassrls; same synthetic target cluster; production DB
NOT touched). No P0/P1/P2 release-blocking findings on the P1-A0.5 surface.
Both P1 release blockers advance to `AUDITED_PENDING_MAIN_MERGE` per
v1.2 §I-02 / LOCK-10 (NOT `RESOLVED_BY_P1_A0_5`); final `RESOLVED_BY_P1_A0_5`
is recorded ONLY in post-merge HANDOFF closeout. Tier 1 may resolve on this
AUDIT.md.

## 7. Re-audit Trace

| Round | Date | Verdict | Note |
| --- | --- | --- | --- |
| 1 | 2026-09-30 | PASS | Initial LIGHT audit round. All 15 TASK §6.1 AC + all 12 TASK §6.2 E2E AC independently verified on synthetic Neon DB. 8 P3 observations recorded (AUD-001 HANDOFF AC table id mismatch; AUD-002 verify-task T-09+A-04 advisories; AUD-003 verify-handoff H-15 advisory; AUD-004 P1 blockers advance only to AUDITED_PENDING_MAIN_MERGE; AUD-005 historical idempotency_keys pre-existing residue 169 rows; AUD-006 HANDOFF self-referential audit-target placeholder; AUD-007 HANDOFF E-14 long self-describing value; AUD-008 lint 900 pre-existing warnings reproduces on baseline). |

AUDIT.md cho Tier 1
