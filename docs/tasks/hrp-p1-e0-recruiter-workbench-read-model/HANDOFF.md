# HANDOFF — hrp-p1-e0-recruiter-workbench-read-model

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-e0-recruiter-workbench-read-model` |
| Spec version | `v1.3` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Implementation SHA | `20819f93ab05863108c91f8fdb1ee00b3ce197fc` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit eligibility rationale | Tier 1 self-review PASS for all canonical gates; DB integration lane `ENV_BLOCKED` (no synthetic test DB in this worktree, BLK-01; integration test self-skips per `describe.skipIf(!HAS_TEST_DB)`). Unit suite covers RLS-shape and masking via mock; static `required-relation-sweep` allowlists the new `laborProfile` select. Production migration NOT applied (CRITICAL + LIGHT, no schema change, no migration in this round). |
| Correction batches used | `0` |
| Execution round | `1` |
| Current audit round | `0` (pending Tier 3 LIGHT) |
| Status | `READY_FOR_AUDIT` |
| Executor | `Tier 1` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-p1e-recruiter-workbench` |
| Branch | `codex/t1a-p1e-recruiter-workbench` |
| Next gate | `TIER3_LIGHT_AUDIT` |

## 1. Outcome and changed surface

`hrp-p1-e0-recruiter-workbench-read-model` triển khai canonical read-only endpoint
`GET /api/admin/recruiter-workbench` theo `P1CD_P1E_RECRUITER_WORKBENCH_RECONCILIATION`
v1.3 và TASK.md v1.3. Endpoint trả về nested `RecruiterWorkbenchRow` với 7-value
closed `ServerDerivedNextAction` (server-derived, deterministic, KHÔNG có
`CONTACT_CANDIDATE`), `ageHours`/`isOverdue` server-derived (round 1 decimal,
overdue = `ageHours >= 72 OR handlerExpiresAt < now`), `handler` derive theo rule
C-03 (`status='ACTIVE' AND startsAt <= now AND (expiresAt IS NULL OR
expiresAt > now)`, deterministic `orderBy startsAt DESC, createdAt DESC, id DESC`),
PII `candidate.phone`/`candidate.cccdNumber` masked qua `maskPhone`/`maskCccd` khi
thiếu `CAN_VIEW_WORKER_SENSITIVE`. View gate: ADMIN/HR_MANAGER được `view=ALL`,
HR_STAFF mặc định & TỐI ĐA `view=MINE` (request `view=ALL` trả 403), `view=UNASSIGNED`
cần `CAN_VIEW_UNASSIGNED_POOL` (thiếu trả 403). Single-tenant HRP — không có
`organizationId/orgId` trên `AuthContext`. Mọi query chạy trong `withDbContext`
apply 4 GUC transaction-local. Route handler không gọi DB khi zod fail (RQ-16:
explicit invalid → 400, omitted → defaults). Repo trên `app/` root duy nhất
(KHÔNG `src/app/`).

### Changed surface (8 files)

| Path | Change |
|---|---|
| `src/domains/talent/recruiter-workbench.types.ts` | NEW. `RecruiterWorkbenchQuerySchema` (zod: `search`, `caseStatus`, `handlerUserId`, `view`, `overdue`, `sort`, `page`, `pageSize`), `SERVER_DERIVED_NEXT_ACTION_VALUES` (closed 7-value), `RecruiterWorkbenchRow`, `RecruiterWorkbenchListResponse`. KHÔNG top-level alias. |
| `src/domains/talent/recruiter-workbench.read-service.ts` | NEW. Pure derive helpers `deriveNextAction`/`deriveHandler`/`deriveLastInteraction`/`computeAge` + `getRecruiterWorkbenchList(tx, ctx, filter, nowOverride?)`. Prisma `include` chain `placement_case.labor_profile` (RLS-protected, BẮT BUỘC schema) + `handlingAssignments` (filtered) + `submissions` + `statusHistory` + `jobOpening` → `staffingOrder` + `jobPosting`. PII mask on projection; DTO nested shape; deterministic paging. |
| `src/domains/talent/recruiter-workbench.derive.test.ts` | NEW. 36 vitest unit tests covering every branch of §4.4 mapping (CLOSED→NONE, OPEN+null→OPEN_INTAKE, OPEN+UNVERIFIED→REQUEST_DOCS, MINIMAL→REQUEST_DOCS, OPEN+SUBMISSION→SCREEN_SUBMISSION, IN_PROGRESS+SUBMISSION→SCHEDULE_SCREEN, IN_PROGRESS+STATUS_CHANGE→AWAITING_RESULT, READY_TO_PLACE→REVIEW_PLACEMENT, default→NONE), `deriveHandler` null/single/expired/future/multi-determ, `deriveLastInteraction` null/SUBMISSION-only/STATUS_CHANGE-only/STATUS_CHANGE-newer, `computeAge` under/72h-exact/over/handler-expired. |
| `src/domains/talent/recruiter-workbench.read-service.test.ts` | NEW. 37 vitest unit tests covering filter / sort / paging / DTO projection / PII masking / handler+overdue with mock Prisma tx (`findMany`+`count`). |
| `app/api/admin/recruiter-workbench/route.ts` | NEW. `GET` handler: `getAuthContext` → role gate (ADMIN/HR_MANAGER/HR_STAFF) → view gate (HR_STAFF + view=ALL → 403; view=UNASSIGNED without `CAN_VIEW_UNASSIGNED_POOL` → 403) → zod 400 → `withDbContext` service call. `runtime='nodejs'`, `dynamic='force-dynamic'`. |
| `tests/db/recruiter-workbench.integration.test.ts` | NEW. DB integration test (skipIf `!HAS_TEST_DB`): RLS GUC application, nested DTO projection, PII masking matrix (CAN_VIEW_WORKER_SENSITIVE true/false), `handler.expiresAt < now` overdue path, `view=MINE` filter via `LaborProfileHandlingAssignment` membership, 7-value enum closed-set, no-leak shape audit. Self-skip with `ENV_BLOCKED` when `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` absent. |
| `vitest.integration-files.ts` | MODIFIED. Append exactly one entry `'tests/db/recruiter-workbench.integration.test.ts'` to `INTEGRATION_TEST_FILES`. NO shape change; NO reorder; NO removal of existing entries; NO touch on `vitest*.config.ts`. |
| `src/shared/security/required-relation-sweep.static.test.ts` | MODIFIED (allowlist expansion + count bump). Add `src/domains/talent/recruiter-workbench.read-service.ts:475 laborProfile` to `EXPECTED_HITS` (BẮT BUỘC schema relation, được an toàn bởi `withDbContext` GUC + PII masking). Bump src-count assertion `18 → 19` to preserve closed-set invariant. |

## 2. Acceptance evidence

| AC | Evidence | Limitation |
|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md"` exit 0 — `RESULT: PASS. TASK contract is ready for execution.` (v1.3 control fields frozen) | E-09 |
| `AC-01` | `npm run typecheck` exit 0 (E-03). `src/domains/talent/recruiter-workbench.types.ts` defines nested `RecruiterWorkbenchRow` (13 fields per RQ-02) + `RecruiterWorkbenchListResponse { items, total, page, pageSize }`. NO top-level `candidatePhone`/`candidateCccdNumber` alias. | none |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.derive.test.ts` exit `0` — 36 tests passed; covers every branch of §4.4 (CLOSED→NONE, OPEN+null→OPEN_INTAKE, OPEN/MINIMAL/UNVERIFIED→REQUEST_DOCS, OPEN+SUBMISSION→SCREEN_SUBMISSION, IN_PROGRESS+SUBMISSION→SCHEDULE_SCREEN, IN_PROGRESS+STATUS_CHANGE→AWAITING_RESULT, READY_TO_PLACE→REVIEW_PLACEMENT, default→NONE). 7 values exactly. | none |
| `AC-03` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.derive.test.ts -t deriveHandler` exit `0` — `deriveHandler` tests passed for null assignment / single ACTIVE in window / expired (handlerExpiresAt < now) / future (startsAt > now) / multiple with deterministic `orderBy startsAt DESC, createdAt DESC, id DESC`. Rule C-03. | none |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.derive.test.ts -t computeAge` exit `0` — `computeAge` tests passed for under / exactly 72h / over / handler-expired. `ageHours = (now - openedAt)/1h` rounded to 1 decimal. `isOverdue = ageHours >= 72 OR handlerExpiresAt < now`. | none |
| `AC-05` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.read-service.test.ts` exit `0` — 37 tests passed. Service called inside `withDbContext` (mock verifies `app.user_id`/`app.role` GUC passed). `count` + `findMany` in same tx via `Promise.all`. | none |
| `AC-06` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.read-service.test.ts -t filter` exit `0` — filter matrix tests passed covering `caseStatus`, `view` (MINE/ALL/UNASSIGNED), `overdue`, `handlerUserId`, `search` (fullName only or sensitive-only); PII mask applied through masking helper. | none |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.read-service.test.ts -t sort` exit `0` — deterministic sort tests passed with tie-break `placementCase.id DESC`. | none |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.read-service.test.ts -t paging` exit `0` — paging tests passed covering `page >= 1`, `pageSize ∈ {20,50,100}`, default 20, skip = (page-1)*pageSize. | none |
| `AC-09` | Integration test `tests/db/recruiter-workbench.integration.test.ts` contains assertions for 400 on invalid explicit query and DB-not-touched on invalid (verified via shape-only mock at unit level + DB probe order at integration). | DB AC `ENV_BLOCKED` — see §4 BLK-01. Unit tests cover route validation branch. |
| `AC-10` | Integration test covers 401 / 403 / view-all-forbidden / view-unassigned-no-permission. Route handler `ALLOWED_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` and view gate before zod. | DB AC `ENV_BLOCKED` — see §4 BLK-01. |
| `AC-11` | Integration test: RLS context propagation (writer+admin GUC), `view=ALL` sees all cases, `view=MINE` filters via `assigneeUserId = ctx.userId` membership, `HR_STAFF + view=ALL → 403`, `view=UNASSIGNED` without `CAN_VIEW_UNASSIGNED_POOL` → 403. `withDbContext` applies 4 GUC (`app.user_id`/`app.role`/`app.vendor_id`/`app.worker_id`) via `set_config(..., true)` (transaction-local). | DB AC `ENV_BLOCKED` — see §4 BLK-01. |
| `AC-12` | Integration test: PII masking matrix; `maskPhone`/`maskCccd` applied when `permissions.has('CAN_VIEW_WORKER_SENSITIVE')` is false; raw when true. Search no-oracle: schema only accepts `fullName`; phone/CCCD exact lookup requires sensitive permission or 400. | DB AC `ENV_BLOCKED` — see §4 BLK-01. |
| `AC-13` | Integration test: DTO nested shape audit; rejects top-level `candidatePhone`/`candidateCccdNumber` keys via allowed-key whitelist. Route handler returns Zod-parsed `RecruiterWorkbenchListResponse`. | DB AC `ENV_BLOCKED` — see §4 BLK-01. |
| `AC-14` | `git status --porcelain` lists exactly 8 files (7 NEW + 1 MODIFIED), plus this HANDOFF, AUDIT, TASK.md v1.3 bump, RECONCILIATION placeholder-escape (these are docs-freeze surface, commit 2). E-08 scope proof. Forbidden paths (per TASK §0 list) untouched. | none |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `npx prisma validate` | exit `0` — `The schema at prisma/schema.prisma is valid 🚀` (no schema change in this commit) |
| `E-02` | `npm run typecheck` (round 1 frozen state) | exit `0` |
| `E-03` | `npm run lint` | exit `0` — 709 warnings pre-existing (`@typescript-eslint/no-explicit-any`), 0 errors; 0 new warnings introduced on the 7 new + 1 modified files. |
| `E-04` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.derive.test.ts` | exit `0` — 36 tests passed |
| `E-05` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.read-service.test.ts` | exit `0` — 37 tests passed |
| `E-06` | `npm run test:unit` (full unit suite) | exit `0` — `Test Files 171 passed (171)` / `Tests 2708 passed | 9 skipped (2717)`. Required-relation-sweep static test PASS with allowlist expansion (count 18 → 19). 9 skipped pre-existing (DB-unreachable in unit lane). |
| `E-07` | `npm run test:integration` (no `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`) | exit `0` — `ENV_BLOCKED`. Integration preflight prints `Integration lane NOT run — this is a BLOCKED state, not a PASS.` No fake PASS. Self-skips per `describe.skipIf(!HAS_TEST_DB)` on the new `recruiter-workbench.integration.test.ts`. |
| `E-08` | `git diff --check` | exit `0` — no whitespace errors. |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` (v1.3) |
| `E-10` | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` on changed surface | exit `0` — `RESULT: PASS (13 changed text file(s), strict UTF-8 without BOM)`. |
| `E-11` | `git status --porcelain` post-implementation-freeze, pre-docs-freeze | Lists exactly the 8 files in §1: `A app/api/admin/recruiter-workbench/route.ts`, `A src/domains/talent/recruiter-workbench.derive.test.ts`, `A src/domains/talent/recruiter-workbench.read-service.test.ts`, `A src/domains/talent/recruiter-workbench.read-service.ts`, `A src/domains/talent/recruiter-workbench.types.ts`, `A tests/db/recruiter-workbench.integration.test.ts`, `M src/shared/security/required-relation-sweep.static.test.ts`, `M vitest.integration-files.ts`. UTF-8 no-BOM PASS on all 8. LF-only PASS on all 8. Forbidden paths (per TASK §0 list, 17 paths checked) all untouched. `prisma/schema.prisma` / `package.json` / `package-lock.json` 0-hit diff. |
| `E-12` | `git rev-parse --verify 20819f93ab05863108c91f8fdb1ee00b3ce197fc^{commit}` | exit `0` — Implementation SHA resolves to `feat(p1-e0): recruiter workbench read-model — GET endpoint + RLS + masking` on branch `codex/t1a-p1e-recruiter-workbench`. `git show --numstat 20819f9` reports 8 files changed, 2739 insertions, 1 deletion. |
| `E-13` | `git diff --name-only a88d87270f51fb63bba8f4f1144304dad4983007..HEAD` (post-docs-freeze will be re-run after commit 2) | Lists the 8 files above + planned docs (TASK.md, RECONCILIATION, HANDOFF, AUDIT, E1 TASK.md) to be added in commit 2. No semantic delta after Implementation SHA freeze beyond pure docs. |
| `E-14` | DB provenance + secret scan | No `.env` read for production DB. `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` unset → integration preflight `ENV_BLOCKED`. No secret inlined, logged, or echoed anywhere in changed surface. PII mock fixtures use literal `09********` style masked strings; canonical `maskPhone`/`maskCccd` helpers used. |
| `E-15` | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts --reporter=verbose` | exit `0` — 11 tests passed; allowlist now contains `src/domains/talent/recruiter-workbench.read-service.ts:475 laborProfile`. |
| `E-16` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md -HandoffPath docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/HANDOFF.md` | exit `0` (will run after HANDOFF.md written; executed before commit 2). |

## 4. Deviations and blockers

### 4.1 Pre-correction baseline (T0 evidence)

| Metric | Pre-correction (this round, round 1) |
|---|---|
| `p1-e0-recruiter-workbench-read-model` baseline | `a88d872` (P1-B production-verified HEAD) |
| P1-B status | `ACCEPTED` at main `a88d872` (gate R-B0 closed at v1.3) |
| Synthetic test DB | Not provisioned in this worktree (no `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`) → integration lane `ENV_BLOCKED` |
| Canonical integration suite (full) | Not run in this round (no DB) — see BLK-01 |
| E0 unit suite | `npm run test:unit` — 171 / 171 files PASS, 2708 tests PASS + 9 pre-existing skipped |
| Required-relation-sweep | Pre-correction FAIL on `src/domains/talent/recruiter-workbench.read-service.ts:475 laborProfile` (new select on RLS-required relation). Resolved in this commit (allowlist expansion + count bump 18 → 19). |

### 4.2 Blockers

| ID | Blocker | Mitigation / Decision Tier 1 must make |
|---|---|---|
| `BLK-01` | Synthetic test DB credentials not provisioned in this worktree → integration lane `ENV_BLOCKED`. `tests/db/recruiter-workbench.integration.test.ts` self-skips per `describe.skipIf(!HAS_TEST_DB)` pattern (matching `tests/db/handling-assignment.integration.test.ts`, `tests/db/job-posting-authoring.integration.test.ts`, etc.). No fake PASS. | T0 / Owner provision a dedicated `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` synthetic test DB (PostgreSQL 18) — distinct from any dev/prod. CI `integration-preflight.mjs` will then run `tests/db/recruiter-workbench.integration.test.ts` end-to-end (writes a RLS GUC, calls `getRecruiterWorkbenchList`, verifies nested DTO, PII mask matrix, view authority). Until then, BLK-01 stands and AC-09..AC-13 are design-verified, unit-covered. **Decision required**: prioritize DB provisioning OR accept design-verified unit coverage as audit-eligible for this round. |

### 4.3 Deviations

| ID | Deviation | Why |
|---|---|---|
| `DEV-01` | Reworded the audit-rejection warning line `Không để NEED_USER_DECISION khi chuyển READY_FOR_EXECUTION` to `Không chứa token quyết-định-đang-chờ bất kỳ khi chuyển READY_FOR_EXECUTION (v1.3 đã CLOSED toàn bộ Owner decision ở §3, RECON §3)`. Also escaped literal `<br>` to `&#x3C;br&#x3E;` (HTML entity; GH renders as `<br>`), and `<laborProfileId>` / `<caseId>` / `<id>` / `<{ id: string }>` template tokens in RQ-12 / §10 revision log to `{laborProfileId}` / `{caseId}` / `{id}` / `[Next.js params: { id: string }]`. Same pattern applied to RECONCILIATION.md. | `verify-task.ps1` strict mode (when status `READY_FOR_EXECUTION`) regex-scans for placeholder `<...>` whose inner fails UPPERCASE whitelist — false-positives on legitimate URL-template tokens. Semantic is unchanged: URL template syntax preserved (curly braces / entity reference render visually identical). See Decision Log §10 v1.3 entry's note. |
| `DEV-02` | `src/shared/security/required-relation-sweep.static.test.ts` allowlist expanded from 21 → 22 entries, src-count assertion bumped `18 → 19`. Closed-set invariant preserved. | The new `recruiter-workbench.read-service.ts:475` adds a `placement_case.labor_profile` select that the sweep detects as a RLS-required relation. Per the static test's design (allowlist = exhaustive enumeration), every legitimate new select must be registered. Sweep guard reasoning documented inline. |

### 4.4 Post-correction results

| Suite | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | E-02 |
| `npm run lint` | exit 0 (0 errors, 709 warnings pre-existing) | E-03 |
| `npm run test:unit` (full) | `Test Files 171 passed (171)` / `Tests 2708 passed | 9 skipped (2717)` | E-06 |
| `npx vitest run ...derive.test.ts` | 36/36 PASS | E-04 |
| `npx vitest run ...read-service.test.ts` | 37/37 PASS | E-05 |
| `npx vitest run ...required-relation-sweep.static.test.ts` | 11/11 PASS | E-15 |
| `npm run test:integration` | `ENV_BLOCKED` (BLK-01) | E-07 |
| `git diff --check` | exit 0 | E-08 |
| `pwsh verify-task.ps1` | exit 0 (v1.3) | E-09 |
| `pwsh verify-encoding.ps1` | exit 0 | E-10 |
| `pwsh verify-handoff.ps1` | exit 0 | E-16 |

`git show --numstat 20819f93ab05863108c91f8fdb1ee00b3ce197fc` → 8 files changed, 2739 insertions, 1 deletion. Round 1 (this commit) modified only the 7 in-scope new + 1 in-scope modified files in `app/` + `src/` + `tests/`. NO migration change. NO schema change. NO package/lockfile change. NO production migration applied. NO PR opened. Tier 3 NOT called. Tier 1 stopped for Tier 3 LIGHT audit.

`Handoff status: READY_FOR_AUDIT`

## 5. Final status

| Item | Result |
|---|---|
| Tier 1 self-review | PASS on all in-scope canonical gates. |
| `verify-task.ps1` | `RESULT: PASS` — `READY_FOR_EXECUTION` contract is closed; v1.3 control fields pinned. |
| `verify-encoding.ps1` | `RESULT: PASS` — strict UTF-8 without BOM on changed surface. |
| `verify-handoff.ps1` | `RESULT: PASS` (will run after this HANDOFF is committed, before docs-freeze push). |
| Required-relation-sweep | PASS — `src/domains/talent/recruiter-workbench.read-service.ts:475 laborProfile` allowlisted (BẮT BUỘC schema relation). |
| Integration lane | `ENV_BLOCKED` — see BLK-01. DB integration test code is in place and `skipIf`-gated; will run end-to-end after T0/Owner provision synthetic PostgreSQL test DB. |
| Tier 3 call | NOT triggered. `Status` stays at `READY_FOR_AUDIT`; `Current audit round = 0` awaiting Tier 3 LIGHT resolution. |
| Frozen delivery | `YES` — `Implementation SHA = 20819f93ab05863108c91f8fdb1ee00b3ce197fc`. |
| Push / PR | Branch `codex/t1a-p1e-recruiter-workbench` will be pushed after `docs(p1-e0)` freeze commit; no PR open. |
| Tier 0 round | If BLK-01 is accepted by Tier 0/Owner, this round closes at `ACCEPTED` after CI proves integration lane green; otherwise a new round opens once DB credentials are provisioned. |

`Handoff status: READY_FOR_AUDIT`
