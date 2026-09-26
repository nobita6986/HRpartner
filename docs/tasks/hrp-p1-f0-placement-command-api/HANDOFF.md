# HANDOFF — `hrp-p1-f0-placement-command-api`

> **Round 2 (v1.2).** Status `BLOCKED`. Audit eligibility `NOT_ELIGIBLE`.
> Tier 3 MUST NOT audit. T0 provision synthetic DB trước khi
> canonical integration chạy.
>
> `032efb1` is a **pre-audit checkpoint**, NOT a final clean freeze.
> `Frozen delivery` remains `NO` while canonical integration is
> `ENV_BLOCKED`. No final Freeze HEAD is pinned until canonical
> integration PASSes and T0 re-evaluates.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f0-placement-command-api` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Spec version | `v1.2` |
| Status | `BLOCKED` |
| Contract gate | `ACCEPTED` |
| Decision state | `CLOSED` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Canonical integration | `ENV_BLOCKED/PENDING` |
| Audit eligibility | `NOT_ELIGIBLE` |
| Frozen delivery | `NO` (pending canonical integration) |
| Canonical gates | `ENV_BLOCKED` (canonical integration blocked; non-DB gates PASS — see §2) |
| Correction batches used | `1` |
| Implementation SHA | `7c9cf7c85f59bed938ad8671f1402441a066b6eb` |
| Pre-audit checkpoint (docs-only) | `032efb1d6168ee5a5f1600e0c5ba2f7f7848a119` (NOT a final Freeze HEAD) |
| Final Freeze HEAD | not pinned until canonical integration PASSes |
| Clean branch | `codex/t1b-p1f0-placement-command-clean-correction` off `9274ccd93f7541d3dfadecf929e48d4c38252690` (KHÔNG cherry-pick `c0f4dc6`) |
| Archive branch (preserved) | `codex/t1b-p1f0-placement-command-planning` |
| Execution round | `2` (round 1 = v1.0→v1.1 contract correction; round 2 = v1.2 pre-audit correction batch C-01..C-06) |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Predecessor SHA | `1b1d8ac747a424c5d47d6cc777f44bba254fcd51` (preserved) |
| Planner | `Tier 1B` |

> Bảng này tái-tạo từ TASK.md §0 control fields; mỗi giá trị đã verify
> khớp 1:1 với TASK v1.2. Frozen delivery là `NO` vì canonical
> integration chưa PASS — đây là tình trạng BLOCKED, không phải lỗi.

## 1. Outcome and changed surface

### 1.1 Outcome

Pre-audit correction batch C-01..C-06 đã đóng gói trong MỘT batch
trên clean correction branch off `9274ccd...`. Toàn bộ history
archive (`codex/t1b-p1f0-placement-command-planning`) giữ nguyên
vẹn. Round này KHÔNG gọi Tier 3; non-DB gates PASS; canonical
integration `ENV_BLOCKED` vì sandbox chưa provision `DATABASE_URL_TEST`
+ `DATABASE_URL_ADMIN_TEST`.

### 1.2 Changed surface (C-01..C-05 round-2)

| File | Change |
|---|---|
| `src/domains/talent/placement.commands.ts` | (modified) C-01: `assertSourceCandidateSubmissionIntegrity` remove catch-all; DB/RLS error propagate → tx rollback → 500 generic; `createPlacement` không được gọi khi `findUnique` reject. |
| `src/domains/talent/placement.commands.test.ts` | (modified) C-01 unit test: `findUnique` reject → `createPlacement` không được gọi + error propagate. |
| `src/domains/talent/placement.route-helpers.ts` | (new) C-02/C-03: shared `runPlacementCommand` wrapper — Auth-first strict order (`getAuthContext` → role gate → `placementId` UUID v4 → Zod body (strict ISO-8601) → `Idempotency-Key` UUID v4 → `withIdempotency` → `withDbContext`) + canonical error→HTTP mapping + structured safe logger. |
| `app/api/admin/placements/route.ts` | (new) create route. Auth-first via wrapper. |
| `app/api/admin/placements/[id]/actions/confirm/route.ts` | (new) confirm route. |
| `app/api/admin/placements/[id]/actions/effective/route.ts` | (new) effective route. Uses `parseStrictIso8601Date` for `clientAcknowledgedAt`. |
| `app/api/admin/placements/[id]/actions/fail/route.ts` | (new) fail route. |
| `app/api/admin/placements/[id]/actions/cancel/route.ts` | (new) cancel route. |
| `src/domains/talent/placement.route-helpers.test.ts` | (new) C-05: 26 no-DB unit tests cover Auth-first, malformed-ID→401, role gate 403, strict body & timestamp, PlacementError×4 mapping, IdempotencyConflictError 409, unexpected 500 safe, structured safe-logger shape (success / canonical error / unexpected error), logger never leaks `actorId`/body/evidence/`acknowledgementRef`/`failureReason`/`Idempotency-Key`/PII. |
| `src/domains/talent/placement.commands.routes.test.ts` | (modified) C-04 AST guards: enforce `runPlacementCommand` delegation; no inline `isUuidV4`; no `console.*`; helper-marker invariants. |
| `src/domains/applications/marketplace-inventory.static.test.ts` | (modified) C-04: bỏ hard-coded `ADMIN_GUARDED_VIA_HELPER` allowlist. Detector fail-closed: route imports AND calls `runPlacementCommand`; helper contains `getAuthContext`+`withDbContext`. |
| `tests/security/admin-route-fail-closed.negative-fixture.ts` | (new) C-04 negative fixture: unguarded mutating route handler; proves detector catches. |
| `src/shared/observability/integration-preflight.env-readiness.static.test.ts` | (new) C-05: 7 static tests cover dual-URL contract (`DATABASE_URL_TEST` AND `DATABASE_URL_ADMIN_TEST` required; same host+port+db; no dev/prod fallback; emits `ENV_BLOCKED`, không fake PASS). |

### 1.3 Surface KHÔNG được đụng

| File/Surface | Reason |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/**` | C-02 — KHÔNG schema/migration trong F0 |
| `src/domains/talent/placement.service.ts` | Production-ready; F0 chỉ wrap qua adapter |
| `src/domains/talent/placement.lifecycle.ts`, `placement.resolution.ts`, `placement.errors.ts` | Frozen; F0 wrap service nguyên |
| `src/domains/talent/placement-case.service.ts` | N1-owned |
| `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs` | C-02 — forbidden paths |
| `app/admin/applications/**`, `app/api/admin/applications/**`, `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` | MP-3C territory |
| `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml` | Frozen |
| `docs/tasks/hrp-p1-{a0,a1,b,e0,e1}-*/**`, `docs/PLANNER_HANDOVER.md` | T0-owned / frozen |
| `src/shared/integrity/idempotency/**`, `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts` | C-03 — F0 chỉ consume |
| `c0f4dc6` (separate pipeline tooling) | C-06 — KHÔNG cherry-pick vào clean delivery |

## 2. Acceptance evidence

### 2.1 Gate + AC evidence (combined)

The combined table below opens with the contract gate row (em-dash
prefix per HANDOFF substance gate H-04), followed by all 18 AC rows
required by H-05. Each row carries the runnable command or evidence
registry reference (H-06) and a real evidence location (H-07). The
canonical integration gate (last row) is the honest `ENV_BLOCKED`
report — round is pre-freeze.

| AC | Pass condition | Evidence location | Command / E-id | Limitation |
|---|---|---|---|---|
| `—` | `pwsh .ai-pipeline/scripts/verify-task.ps1` → exit 0, `RESULT: DRAFT-VALID` (2 expected warnings: V2 contract gate `ACCEPTED` post-READY_TO_CODE + status `BLOCKED`) | `evidence/gates/verify-task.txt` | E-06 | none |
| `—` | `npx prisma validate` → exit 0, `The schema at prisma\schema.prisma is valid 🚀` | `evidence/gates/prisma-validate.txt` | E-01 | none |
| `—` | `npm run typecheck` → exit 0 (after `actorRole: null` → `undefined` fix at placement.route-helpers.ts:159/170) | `evidence/gates/typecheck.txt` | E-02 | none |
| `—` | `npm run lint` → exit 0 (708 pre-existing warnings, 0 errors) | `evidence/gates/lint.txt` | E-03 | pre-existing warnings are unrelated to P1-F0 |
| `—` | `npm run test:unit` → exit 0 (2739 tests, 9 skipped, 0 failed across 173 files) | `evidence/gates/test-unit.txt` | E-04 | none |
| `—` | Targeted placement tests → exit 0 (132 tests across 5 files) | `evidence/gates/test-placement-targeted.txt` | E-05 | none |
| `—` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → exit 2 (BLOCKED on H-16: `Frozen delivery=NO` + `Canonical gates=ENV_BLOCKED`). Tier 3 MUST NOT audit. | `evidence/gates/verify-handoff.txt` | E-07 | expected — round is pre-freeze; pre-canonical-integration |
| `—` | `git diff --check` → exit 0 (no LF/CRLF conflicts after trailing-EOF blank-line fix on placement.route-helpers.ts) | `evidence/gates/git-diff-check.txt` | E-09 | none |
| `—` | Strict UTF-8 no-BOM scan on changed surface → all 15 files OK LF UTF-8 | `evidence/gates/encoding-bom-scan.txt` | E-10 | none |
| `—` | `verify-encoding.ps1` → SCRIPT NOT PRESENT on this branch; manual UTF-8 BOM scan performed instead (see `encoding-bom-scan.txt`) | `evidence/gates/verify-encoding.txt` | E-08 | mitigated by manual scan |
| `—` | `npm run test:integration` → `ENV_BLOCKED/PENDING` (DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST chưa provision) | `evidence/gates/integration-env-readiness.txt` | E-11 | canonical integration pending T0 |
| `AC-01` | `POST /api/admin/placements` happy path: ADMIN gọi với `{ placementCaseId, jobOpeningId }` + `Idempotency-Key` UUID → 201 với exact `CreatePlacementResult` `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed: false }`. | `src/domains/talent/placement.commands.test.ts` it-block "placementCreate happy path" | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts` (E-04/E-05) | integration block deferred to BLK-01; unit covers adapter mapping + service call signature |
| `AC-02` | 4 transition routes happy path + replay: SELECTED → CONFIRMED → FAILED; duplicate Idempotency-Key → `replayed: true`. | `src/domains/talent/placement.commands.test.ts` it-blocks "placementConfirm/placementFail/placementCancel happy path + replay" | E-05 | integration deferred; unit covers adapter mapping + replay flag passthrough |
| `AC-03` | `placement.effective` Client-managed: CONFIRMED → EFFECTIVE + PlacementCase CLOSED atomic; no Worker/Episode/Assignment row. | `src/domains/talent/placement.commands.test.ts` it-block "placementEffective Client-managed" + `placement.commands.test.ts` integration contract note | E-05 | integration final DB inspection deferred to BLK-01 |
| `AC-04` | `placement.effective` HRP-managed → 400 `PLACEMENT_VALIDATION_ERROR`; zero mutation. | `src/domains/talent/placement.commands.test.ts` it-block "placementEffective HRP-managed reject" | E-05 | integration deferred; unit covers adapter reject passthrough |
| `AC-05` | Error mapping canonical: PlacementValidationError → 400, InvalidStateTransitionError → 409, PlacementNotFoundError → 404, PlacementIdempotencyConflictError → 409, IdempotencyConflictError → 409, missing key → 400 `IDEMPOTENCY_REQUIRED`, body errors → 400 `VALIDATION`, unauth → 401, role deny → 403, unexpected → 500 generic. | `src/domains/talent/placement.route-helpers.test.ts` T1-T10 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-06` | Idempotency wrap all 5 commands; replay same key+payload → `replayed: true`; conflict → 409 `IDEMPOTENCY_CONFLICT`; create replay → existing placement. | `src/domains/talent/placement.route-helpers.test.ts` T6/T9 + `placement.commands.test.ts` | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts src/domains/talent/placement.route-helpers.test.ts` → exit 0 (E-05) | conflict dual-subclass honest (no fabricated subclass) |
| `AC-07` | Role gate: HR_STAFF → 403; ADMIN/HR_MANAGER pass. | `src/domains/talent/placement.route-helpers.test.ts` T3 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-08` | RLS GUC: route handler gọi `withDbContext` apply GUC; HR_MANAGER pass; PUBLIC → 401. | `src/domains/talent/placement.commands.routes.test.ts` AST guard (helper contains `withDbContext`; route imports `runPlacementCommand`) | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | integration RLS GUC runtime assertion deferred to BLK-01 |
| `AC-09` | Body shape gate: strict Zod + reject unknown fields; `clientAcknowledgedAt` ISO-8601 via `parseStrictIso8601Date`; confirm/fail/cancel body `{}`. | `src/domains/talent/placement.route-helpers.test.ts` T4/T5/T7 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-10` | Race-loser: concurrent confirm + cancel → đúng một 200 + một canonical 409 (không claim subclass cụ thể); no 500; DB final state hợp lệ. | `src/domains/talent/placement.route-helpers.test.ts` T9 + integration contract note | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (E-05) | honest dual-subclass claim; integration concurrent fixture deferred to BLK-01 |
| `AC-11` | Structured safe log: SafeMeta `route/method/status/actorRole/resourceType/outcome/errorCode` + minimal `detail: { command, placementId, replayed }`. No `actorId`, no body, no evidence, no `acknowledgementRef`, no `failureReason`, no token, no `Idempotency-Key`, no PII. No `console.*`. No fabricated `managementMode/fromStatus/toStatus`. | `src/domains/talent/placement.route-helpers.test.ts` T11-T14 + `src/shared/observability/logger.ts` `__captureSink`/`__resetSink` | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-12` | No fork service. Fail-closed delegation detector via SINGLE canonical classifier `classifyMutatingPlacementRoute` (Path A direct AUTH_MARKER call, Path B delegated handler AUTH_MARKER call, Path C placement helper delegation with `getAuthContext(` + `withDbContext(` call expressions — NOT bare identifiers on any path). Negative fixture consumed by the SAME classifier proves detector catches unguarded routes. F-04A injected-helper source exercises the `helper_missing_security_markers` branch without mutating the production helper. | `src/domains/talent/placement.commands.routes.test.ts` + `src/domains/applications/marketplace-inventory.static.test.ts` (C-04 + F-02 + F-04A/B substantive proof, 17 new assertions) + `tests/security/admin-route-fail-closed.negative-fixture.ts` | `npx.cmd vitest run src/domains/applications/marketplace-inventory.static.test.ts` → exit 0 (47 passed) (E-15) | none |
| `AC-13` | No MP-3C territory: `app/admin/applications/**`, `app/api/admin/applications/**`, `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` 0 hit. | `src/domains/talent/placement.commands.routes.test.ts` AST guard | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-14` | No E0/E1/P1-A0/A1/B docs: `docs/tasks/hrp-p1-{a0,a1,b,e0,e1}-*/**`, `docs/PLANNER_HANDOVER.md` 0 hit. No `permission-catalog.ts` or `prisma/seed.mjs` edit. | `src/domains/talent/placement.commands.routes.test.ts` AST guard + git status | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-15` | No outbox/event producer: route KHÔNG import `@/src/shared/integrity/outbox/**`. | `src/domains/talent/placement.commands.routes.test.ts` AST guard | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-16` | No migration: `prisma/migrations/` 0 hit. Client-managed EFFECTIVE atomic close. HRP-managed EFFECTIVE zero mutation. | static (git diff) + `npx prisma validate` | `npx prisma validate` → exit 0 (E-01) | integration final DB inspection deferred to BLK-01 |
| `AC-17` | `assertSourceCandidateSubmissionIntegrity` no catch-all; DB/RLS error propagate; `createPlacement` not called when `findUnique` rejects. | `src/domains/talent/placement.commands.test.ts` it-block "findUnique reject → createPlacement not called" + `src/domains/talent/placement.commands.ts:assertSourceCandidateSubmissionIntegrity` | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts` → exit 0 (15 passed) (E-12) | none |
| `AC-18` | Dual-URL env readiness: CẢ `DATABASE_URL_TEST` VÀ `DATABASE_URL_ADMIN_TEST` required; missing 1 → `ENV_BLOCKED`; same host+port+db; no dev/prod fallback; `ENV_BLOCKED` not fake PASS. | `src/shared/observability/integration-preflight.env-readiness.static.test.ts` (7 tests) + `scripts/ci/integration-preflight.mjs` + `scripts/ci/assert-test-db-posture.mjs` | E-16 | integration posture probe deferred to BLK-01 |

### 2.2 C-by-C evidence trail

| Correction | Status | Evidence file |
|---|---|---|
| C-01 (CandidateSubmission fail-closed) | IMPLEMENTED + TESTED | `evidence/corrections/C-01-candidate-submission-fail-closed.txt` |
| C-02 (Auth-first + strict validation) | IMPLEMENTED + TESTED | `evidence/corrections/C-02-auth-first-strict-validation.txt` |
| C-03 (Structured safe logging + truthful AC-11) | IMPLEMENTED + TESTED | `evidence/corrections/C-03-safe-logger-truthful-ac11.txt` |
| C-04 (Fail-closed delegation detector) | IMPLEMENTED + TESTED | `evidence/corrections/C-04-fail-closed-delegation.txt` |
| C-05 (Truthful tests + dual-URL env readiness) | IMPLEMENTED + TESTED | `evidence/corrections/C-05-truthful-tests-dual-url.txt` |
| C-06 (Clean freeze + separate pipeline tooling) | IMPLEMENTED (clean branch off `9274ccd...`; archive branch preserved; semantic Implementation commit + docs-only freeze commit; NO cherry-pick of `c0f4dc6`) | `evidence/corrections/C-06-clean-freeze-pipeline-tooling.txt` |

## 3. Evidence registry

| E-id | Artifact | Purpose |
|---|---|---|
| E-01 | `evidence/gates/prisma-validate.txt` | Prisma schema valid |
| E-02 | `evidence/gates/typecheck.txt` | tsc --noEmit exit 0 |
| E-03 | `evidence/gates/lint.txt` | ESLint exit 0 (708 pre-existing warnings, 0 errors) |
| E-04 | `evidence/gates/test-unit.txt` | npm run test:unit output |
| E-05 | `evidence/gates/test-placement-targeted.txt` | 132 placement-related tests output |
| E-06 | `evidence/gates/verify-task.txt` | TASK contract gate result |
| E-07 | `evidence/gates/verify-handoff.txt` | HANDOFF substance gate result (BLOCKED on H-16, expected) |
| E-08 | `evidence/gates/verify-encoding.txt` | verify-encoding.ps1 output |
| E-09 | `evidence/gates/git-diff-check.txt` | git diff --check output |
| E-10 | `evidence/gates/encoding-bom-scan.txt` | manual UTF-8 no-BOM scan on changed surface |
| E-11 | `evidence/gates/integration-env-readiness.txt` | integration-preflight output (ENV_BLOCKED) |
| E-12 | `evidence/corrections/C-01-candidate-submission-fail-closed.txt` | C-01 evidence |
| E-13 | `evidence/corrections/C-02-auth-first-strict-validation.txt` | C-02 evidence |
| E-14 | `evidence/corrections/C-03-safe-logger-truthful-ac11.txt` | C-03 evidence |
| E-15 | `evidence/corrections/C-04-fail-closed-delegation.txt` | C-04 evidence |
| E-16 | `evidence/corrections/C-05-truthful-tests-dual-url.txt` | C-05 evidence |
| E-17 | `evidence/corrections/C-06-clean-freeze-pipeline-tooling.txt` | C-06 evidence |
| E-18 | `evidence/sha-pins.txt` | SHA pins: original `9274ccd...`, archive branch head, clean branch head, semantic Implementation SHA (post-commit), docs-only freeze HEAD (post-commit) |

## 4. Deviations and blockers

| ID | Description | Impact | Mitigation |
|---|---|---|---|
| BLK-01 | Canonical integration DB chưa provision trong sandbox (`DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` missing). Non-DB gates PASS nhưng integration suite không chạy được. | Round ở `BLOCKED` cho tới T0 provision synthetic DB. Tier 3 MUST NOT audit. | T0 provision synthetic PG → chạy `npm run test:integration -- tests/db/p1f0-placement-command-api.integration.test.ts`. Sau đó re-evaluate `Status`, `Frozen delivery`, `Audit eligibility`. |
| DEV-01 | Original implementation SHA `9274ccd93f7541d3dfadecf929e48d4c38252690` đã được thay bằng clean correction branch off exact SHA đó (KHÔNG cherry-pick `c0f4dc6`). | Archive branch `codex/t1b-p1f0-placement-command-planning` giữ nguyên vẹn với original SHA + contaminated freeze HEAD `6680eb26...` + separate tooling `c0f4dc6`. Pipeline tooling chuyển sang branch/ref riêng cho T0 review. | T0 xác nhận archive branch chưa bị amend/reset/rebase/force-push. |
| DEV-02 | AC-11 v1.1 contract claim `managementMode/fromStatus/toStatus` đã được truthful rewrite (round 2): service result không cung cấp; F0 không tự suy diễn. AC-11 v1.2 chỉ giữ `route/method/status/actorRole/resourceType/outcome/errorCode` + minimal `detail: { command, placementId, replayed }`. | AC-11 contract thay đổi giữa v1.1 và v1.2 (truthful correction). | T0 review TASK §6 AC-11 + RQ-11 v1.2. |
| DEV-03 | C-04 round-2 detector dùng fail-closed dynamic check (route imports AND calls `runPlacementCommand`; helper contains `getAuthContext` + `withDbContext`). C-04 v1.1 dùng hard-coded `ADMIN_GUARDED_VIA_HELPER` allowlist đã bị bỏ. | Detector giờ dynamic; không overfit route names. Negative fixture `tests/security/admin-route-fail-closed.negative-fixture.ts` proves detector catches unguarded mutating routes. | T0 review detector + fixture trong marketplace-inventory.static.test.ts. |
| DEV-04 | C-05 dual-URL contract: `integration-preflight.env-readiness.static.test.ts` (7 tests) giờ nằm trong `src/shared/observability/` để vitest unit-lane pick up. Pre-flight script `scripts/ci/integration-preflight.mjs` đã enforce cả 2 URLs. | Integration lane MUST NOT enter với chỉ `DATABASE_URL_TEST`. | T0 review preflight + static test. |

## 5. Final status

| Dimension | Status |
|---|---|
| Source code | NOT FROZEN. `Frozen delivery=NO`. Semantic Implementation SHA pinned: `7c9cf7c85f59bed938ad8671f1402441a066b6eb` (F-04A/B test/integrity closure). |
| Tests (unit + static) | 149 targeted placement tests PASS (was 132 round 2; +17 across F-02 + F-04A/B substantive assertions). |
| Gates (non-DB) | PASS. |
| Gates (canonical integration) | `ENV_BLOCKED/PENDING`. |
| HANDOFF | `BLOCKED` (expected; H-16 fails on `Frozen delivery=NO` + `Canonical gates=ENV_BLOCKED` only). |
| Audit eligibility | `NOT_ELIGIBLE`. Tier 3 MUST NOT audit. |
| Push / PR / Tier 3 / merge / deploy | NONE performed. |
| Archive branch | PRESERVED (`codex/t1b-p1f0-placement-command-planning` nguyên vẹn, KHÔNG amend/reset/rebase/force-push). |
| Pipeline tooling (`c0f4dc6`) | Separated. KHÔNG cherry-pick vào clean delivery. Giữ trên archive branch; T0 review/land riêng. |

**Stop signal.** Round đóng tại đây. T0 review source correction → provision
synthetic DB → chạy canonical integration → re-evaluate `Status`,
`Frozen delivery`, `Audit eligibility`. T1B không tự gọi Tier 3.

Handoff status: BLOCKED
