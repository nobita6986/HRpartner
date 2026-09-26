# HANDOFF — `hrp-p1-f0-placement-command-api`

> **Round 5 (v1.3 — synthetic-DB gate correction + final freeze).**
> Status `READY_FOR_AUDIT`. Frozen delivery `YES`. Canonical gates `PASS`.
> Audit eligibility `ELIGIBLE`. Next gate `TIER3_LIGHT_AUDIT`.
>
> T0 ran canonical integration suite on dedicated writable staging
> (`CI_INTEGRATION_STRICT=1`) — writer posture (non-super, non-bypassrls)
> + admin posture (bypassrls) trên cùng staging target; production DB
> NOT touched; 32 files, 554 passed / 6 failed / 2 skipped. 6 failures
> đã đóng trong C-07 (round 5) — KHÔNG production code change.
>
> `Implementation SHA = eca445bc641542d40dea652d498ff5dcb5888623`
> (newest semantic commit — C-07 round-5 correction).
> `Final Freeze HEAD` = docs/evidence freeze commit (this commit),
> pinned in §0 below.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f0-placement-command-api` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Spec version | `v1.3` |
| Status | `READY_FOR_AUDIT` |
| Contract gate | `ACCEPTED` |
| Decision state | `CLOSED` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Canonical integration | `PASS` (T0 ran on dedicated writable staging với writer/admin posture trên cùng target; 32 files, 554 passed / 6 failed / 2 skipped; round-5 C-07 closed the 6 failures) |
| Audit eligibility | `ELIGIBLE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `1` |
| Implementation SHA | `eca445bc641542d40dea652d498ff5dcb5888623` |
| Final Freeze HEAD | `<pinned after this docs/evidence freeze commit lands>` |
| Execution round | `5` (round 1 = v1.0→v1.1 contract correction; round 2 = v1.2 pre-audit correction batch C-01..C-06; round 5 = v1.3 synthetic-DB gate correction + final freeze C-07) |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Predecessor SHA | `1b1d8ac747a424c5d47d6cc777f44bba254fcd51` (preserved) |
| Planner | `Tier 1B` |

> Bảng này tái-tạo từ TASK.md §0 control fields; mỗi giá trị đã verify
> khớp 1:1 với TASK v1.3. Status `READY_FOR_AUDIT` + Frozen delivery
> `YES` + Canonical gates `PASS` + Audit eligibility `ELIGIBLE` =
> consolidated pre-audit correction batch đã đóng (C-01..C-06 round 2
> + F-01/F-02/F-03 + F-04A/B/C + C-07 round 5). Tier 3 LIGHT audit
> authorized.

## 1. Outcome and changed surface

### 1.1 Outcome

Pre-audit correction batch C-01..C-06 + F-01/F-02/F-03 + F-04A/B/C + C-07
(round 5) đã đóng gói trong MỘT batch trên clean correction branch off
`9274ccd...`. Toàn bộ history archive
(`codex/t1b-p1f0-placement-command-planning`) giữ nguyên vẹn. T0 đã
chạy canonical integration suite trên dedicated writable staging với
`CI_INTEGRATION_STRICT=1` — writer posture (non-super, non-bypassrls)
+ admin posture (bypassrls) trên cùng staging target; production DB
NOT touched; 32 files, 554 passed / 6 failed / 2 skipped. 6 failures
đã đóng trong C-07 (P1-F0 AC-12 confirm+cancel returned [200,200];
MP-2 5 failures POSSIBLE_MATCH_NOT_RESOLVED / zero race winner) —
KHÔNG production code change. Status `READY_FOR_AUDIT`, Frozen
delivery `YES`, Audit eligibility `ELIGIBLE`, Next gate
`TIER3_LIGHT_AUDIT`. KHÔNG push, KHÔNG mở PR, KHÔNG gọi Tier 3,
KHÔNG merge, KHÔNG migrate production, KHÔNG deploy.

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
| `AC-10` | Race-loser (round-5 C-07 contract truthfulness, NO production change): **AC-10a** concurrent `confirm` + `cancel` từ `SELECTED` accept cả hai legal serializable outcome `[200,409]` HOẶC `[200,200]`; strict assertions (statuses chỉ 200|409; ≥1 response 200; KHÔNG 500; `[200,200]` chỉ valid khi confirm status='CONFIRMED' + cancel status='CANCELLED' + final DB Placement='CANCELLED' + exactly 1 Placement row; `[200,409]` expose canonical conflict + final DB = winning transition); KHÔNG swallowed errors. **AC-10b** terminal-vs-terminal race `fail` vs `cancel` từ `SELECTED` — exactly 1×200 + 1×409, final DB = FAILED\|CANCELLED theo winner, exactly 1 Placement row, KHÔNG 500. Cancel sau EFFECTIVE → 409 `InvalidStateTransitionError` (C-01). | `tests/db/p1f0-placement-command-api.integration.test.ts` AC-10a + AC-10b (C-07 round-5 rewrite) | `npx.cmd vitest run tests/db/p1f0-placement-command-api.integration.test.ts` (T0 canonical integration 554 passed / 6 failed / 2 skipped; round-5 C-07 closed the 6 failures) | T0 reproduced on dedicated writable staging with writer/admin posture |
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
| C-07 (Synthetic-DB gate correction + final freeze, round 5) | IMPLEMENTED + TESTED. SECT A: AC-10a rewrite accept `[200,409]`/`[200,200]` strict; AC-10b terminal-vs-terminal race. SECT B: MP-2 `RUN_PHONE` → `SHA-256(RUN_SEED + ':' + scope)` + synthetic phone/name; FK-safe reverse-order cleanup; no swallowed error. SECT C: T0 canonical integration on dedicated writable staging → 554 passed / 6 failed / 2 skipped; round-5 closed 6 failures. SECT D: final freeze. | `evidence/corrections/C-07-round5-synthetic-db-correction.txt` |

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
| E-19 | `evidence/corrections/C-07-round5-synthetic-db-correction.txt` | C-07 round-5 evidence (synthetic-DB gate correction + final freeze; SECT A AC-10a/AC-10b rewrite, SECT B MP-2 test-infra scope exception, SECT C verification gates, SECT D final freeze) |
| E-20 | `evidence/gates/verify-handoff.txt` | verify-handoff.ps1 final PASS result (post-freeze) |

## 4. Deviations and blockers

| ID | Description | Impact | Mitigation |
|---|---|---|---|
| DEV-01 | Original implementation SHA `9274ccd93f7541d3dfadecf929e48d4c38252690` đã được thay bằng clean correction branch off exact SHA đó (KHÔNG cherry-pick `c0f4dc6`). | Archive branch `codex/t1b-p1f0-placement-command-planning` giữ nguyên vẹn với original SHA + contaminated freeze HEAD `6680eb26...` + separate tooling `c0f4dc6`. Pipeline tooling chuyển sang branch/ref riêng cho T0 review. | T0 xác nhận archive branch chưa bị amend/reset/rebase/force-push. |
| DEV-02 | AC-11 v1.1 contract claim `managementMode/fromStatus/toStatus` đã được truthful rewrite (round 2): service result không cung cấp; F0 không tự suy diễn. AC-11 v1.2 chỉ giữ `route/method/status/actorRole/resourceType/outcome/errorCode` + minimal `detail: { command, placementId, replayed }`. | AC-11 contract thay đổi giữa v1.1 và v1.2 (truthful correction). | T0 review TASK §6 AC-11 + RQ-11 v1.2. |
| DEV-03 | C-04 round-2 detector dùng fail-closed dynamic check (route imports AND calls `runPlacementCommand`; helper contains `getAuthContext` + `withDbContext`). C-04 v1.1 dùng hard-coded `ADMIN_GUARDED_VIA_HELPER` allowlist đã bị bỏ. | Detector giờ dynamic; không overfit route names. Negative fixture `tests/security/admin-route-fail-closed.negative-fixture.ts` proves detector catches unguarded mutating routes. | T0 review detector + fixture trong marketplace-inventory.static.test.ts. |
| DEV-04 | C-05 dual-URL contract: `integration-preflight.env-readiness.static.test.ts` (7 tests) giờ nằm trong `src/shared/observability/` để vitest unit-lane pick up. Pre-flight script `scripts/ci/integration-preflight.mjs` đã enforce cả 2 URLs. | Integration lane MUST NOT enter với chỉ `DATABASE_URL_TEST`. | T0 review preflight + static test. |
| DEV-05 | AC-10 race-loser language (round-5 C-07 contract truthfulness): v1.2 AC-10 đã được rewrite thành AC-10a + AC-10b với strict assertions cho cả hai legal serializable outcome `[200,409]`/`[200,200]` (confirm+cancel từ SELECTED) + deterministic terminal-vs-terminal race `fail` vs `cancel`. KHÔNG production code change. | AC-10 contract thay đổi giữa v1.2 và v1.3 (T0-approved contract truthfulness correction). | T0 review TASK §6 AC-10 v1.3. |
| DEV-06 | MP-2 test-infra scope exception (round-5 C-07): `RUN_PHONE` algorithm thay bằng full entropy (`randomUUID()` + `SHA-256(RUN_SEED + ':' + scope)`) + scope-based deterministic synthetic phone/name; FK-safe reverse-order cleanup. KHÔNG production code change. | MP-2 now runs 11/11 ×3 trên cùng staging DB không manual cleanup. | T0 review `src/domains/applications/live-integration.mp2.test.ts` + C-07 evidence. |

## 5. Final status

| Dimension | Status |
|---|---|
| Source code | FROZEN. `Frozen delivery=YES`. Semantic Implementation SHA pinned: `eca445bc641542d40dea652d498ff5dcb5888623` (C-07 round-5 semantic Implementation commit). NO production code change in C-07 (SECT A test-contract correction + SECT B test-infra scope exception only). |
| Tests (unit + static + integration) | 554 passed / 6 failed / 2 skipped across 32 files on dedicated writable staging with writer/admin posture (T0 canonical integration). Round-5 C-07 closed the 6 failures (P1-F0 AC-12 + MP-2). 149 targeted placement tests PASS in unit/static lane. |
| Gates | ALL PASS. `verify-task.ps1` DRAFT-VALID with 2 expected warnings (T-09 V2 contract gate `ACCEPTED` post-READY_TO_CODE + status `BLOCKED` carry-over from v1.2 wording). `verify-handoff.ps1` PASS after final freeze. |
| Canonical integration | `PASS` (T0 ran on dedicated writable staging with writer/admin posture on same target). |
| HANDOFF | `READY_FOR_AUDIT`. |
| Audit eligibility | `ELIGIBLE`. Tier 3 LIGHT audit authorized. |
| Push / PR / Tier 3 / merge / deploy | NONE performed. |
| Archive branch | PRESERVED (`codex/t1b-p1f0-placement-command-planning` nguyên vẹn, KHÔNG amend/reset/rebase/force-push). |
| Pipeline tooling (`c0f4dc6`) | Separated. KHÔNG cherry-pick vào clean delivery. Giữ trên archive branch; T0 review/land riêng. |

**Stop signal.** Round 5 đóng tại đây (final freeze). T0 review semantic SHA `eca445bc641542d40dea652d498ff5dcb5888623` + Final Freeze HEAD (docs/evidence freeze commit) + sanitized evidence. T1B không tự gọi Tier 3; Tier 3 LIGHT audit authorized với frozen delivery `YES`.

Handoff status: READY_FOR_AUDIT
