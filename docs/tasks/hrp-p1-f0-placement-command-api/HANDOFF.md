# HANDOFF — `hrp-p1-f0-placement-command-api`

> **CURRENT — ACCEPTED closeout v1.5.** Tier 3 LIGHT verdict PASS was adopted,
> PR #58 merged to `main`, post-merge CI and Vercel passed, and all five
> production command routes returned 401 to unauthenticated POST requests.
> No production schema or migration action was required. Status `ACCEPTED`;
> next gate `NONE — MERGED_AND_PRODUCTION_VERIFIED`.
>
> **HISTORICAL — Round 5 REVERSAL (v1.3-revoked — T0 verdict CHANGES_REQUIRED /
> NOT_READY_FOR_AUDIT).**
> Status `BLOCKED`. Frozen delivery `NO`. Canonical gates `FAIL/PENDING`.
> Audit eligibility `NOT_ELIGIBLE`. Next gate `T0_CI_SYNTHETIC_DB_GATE`.
>
> T0 re-ran MP-2 (`npx vitest run src/domains/applications/live-integration.mp2.test.ts
> --config vitest.integration.config.ts`) trên dedicated synthetic staging
> writer/admin pair — 10 passed / 1 failed. Failure: AC-03 REAL concurrent
> race; PostgreSQL `column "slot_id" does not exist` at
> `src/domains/applications/live-integration.mp2.test.ts:604`. Root cause:
> cleanup query `SELECT id FROM labor_profiles WHERE normalized_phone = $1
> AND slot_id = $2` — `slot_id` thực tế ở `candidate_submissions`, không
> ở `labor_profiles`. Cleanup FK-safe order chưa đúng (xóa LaborProfile
> trước khi clear `candidate_submissions.labor_profile_id`).
>
> Round-5 final freeze (`READY_FOR_AUDIT`/`ELIGIBLE`, Implementation SHA
> `eca445bc641542d40dea652d498ff5dcb5888623`, Final Freeze HEAD
> `45bc5ec5ad49a6555e3e3c54aa79d409b033cab9`) **đảo ngược** trên branch
> planning này. History eca445bc/45bc5ec/d688b66 PRESERVED — KHÔNG
> amend/reset/rebase/force-push. KHÔNG push/PR/Tier 3/merge/migrate/deploy.
> Đợi directive tiếp theo sau khi T0 verify `live-integration.mp2.test.ts`
> correction runtime PASS.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f0-placement-command-api` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Spec version | `v1.5` |
| Status | `ACCEPTED` |
| Contract gate | `ACCEPTED` |
| Decision state | `CLOSED` |
| Audit mode | `LIGHT` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Canonical integration | `PASS` — MP-2 `11/11 ×3`; P1-F0 `20/20 ×3`; full canonical strict `32/32 files`, `561 passed`, `0 failed`, `2` Redis skips |
| Audit eligibility | `COMPLETED` — Tier 3 LIGHT PASS |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Correction batches used | `1` |
| Implementation SHA | `a91f1bed9ea45a59ae1a734cd2ffbdfa42b7f4d9` |
| Semantic Implementation SHA | `adbd28f711ccf4f53807fb44a9beb98ba5e22ac4` (frozen P1-F0 semantic delivery) |
| Final Freeze HEAD | `1658835c3f220fc79dfe09ab11a0172064d0c1a8` (docs/evidence freeze; current pin-only follow-up contains no semantic delta) |
| Execution round | `6` (C-07 runtime closure and final freeze; correction budget remains one consolidated batch) |
| Baseline | `a88d87270f51fb63bba8f4f1144304dad4983007` |
| Predecessor SHA | `1b1d8ac747a424c5d47d6cc777f44bba254fcd51` (preserved) |
| Planner | `Tier 1B` |

> Control fields đã đồng bộ với TASK v1.4. C-07 closure runtime PASS;
> Tier 3 may open a LIGHT audit round after the docs/evidence freeze SHA
> is pinned.

## 1. Outcome and changed surface

### 1.1 Outcome

Pre-audit correction batch C-01..C-07 đã đóng gói trong một history-preserving
chain trên clean correction branch. T0 reset dedicated synthetic staging,
applied all 53 branch migrations, verified writer/admin posture, then ran
MP-2 `11/11 ×3`, P1-F0 `20/20 ×3`, and full canonical strict with
`32/32 files`, `561 passed`, `0 failed`, `2` Redis skips. Production DB and
production migration were not touched. Semantic Implementation SHA is
`adbd28f711ccf4f53807fb44a9beb98ba5e22ac4`; next gate is Tier 3 LIGHT.

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

The combined table below opens with the contract gate row, followed by all
18 AC rows. Runtime-dependent rows cite the fresh T0 synthetic-staging proof
in E-21; production DB/migration were not run.

| AC | Pass condition | Evidence location | Command / E-id | Limitation |
|---|---|---|---|---|
| `—` | `pwsh .ai-pipeline/scripts/verify-task.ps1` → exit 0, `RESULT: DRAFT-VALID` (2 expected warnings: V2 contract gate `ACCEPTED` post-READY_TO_CODE + status `BLOCKED`) | `evidence/gates/verify-task.txt` | E-06 | none |
| `—` | `npx prisma validate` → exit 0, `The schema at prisma\schema.prisma is valid 🚀` | `evidence/gates/prisma-validate.txt` | E-01 | none |
| `—` | `npm run typecheck` → exit 0 (after `actorRole: null` → `undefined` fix at placement.route-helpers.ts:159/170) | `evidence/gates/typecheck.txt` | E-02 | none |
| `—` | `npm run lint` → exit 0 (708 pre-existing warnings, 0 errors) | `evidence/gates/lint.txt` | E-03 | pre-existing warnings are unrelated to P1-F0 |
| `—` | `npm run test:unit` → exit 0 (2756 passed, 9 skipped, 0 failed across 173 files) | `evidence/gates/test-unit.txt` | E-04 | none |
| `—` | Targeted placement tests → exit 0 (132 tests across 5 files) | `evidence/gates/test-placement-targeted.txt` | E-05 | none |
| `—` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` → PASS after v1.4 freeze | `evidence/gates/verify-handoff.txt` | E-07 | none |
| `—` | `git diff --check` → exit 0 (no LF/CRLF conflicts after trailing-EOF blank-line fix on placement.route-helpers.ts) | `evidence/gates/git-diff-check.txt` | E-09 | none |
| `—` | Strict UTF-8 no-BOM scan on changed surface → all 15 files OK LF UTF-8 | `evidence/gates/encoding-bom-scan.txt` | E-10 | none |
| `—` | `verify-encoding.ps1` → SCRIPT NOT PRESENT on this branch; manual UTF-8 BOM scan performed instead (see `encoding-bom-scan.txt`) | `evidence/gates/verify-encoding.txt` | E-08 | mitigated by manual scan |
| `—` | `CI_INTEGRATION_STRICT=1 npm run test:integration` → 32/32 files, 561 passed, 0 failed, 2 Redis skips | `evidence/gates/live-integration-run-staging.txt` | E-21 | production DB/migration NOT_RUN |
| `AC-01` | `POST /api/admin/placements` happy path: ADMIN gọi với `{ placementCaseId, jobOpeningId }` + `Idempotency-Key` UUID → 201 với exact `CreatePlacementResult` `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId, projectId, replayed: false }`. | `src/domains/talent/placement.commands.test.ts` it-block "placementCreate happy path" | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts` (E-04/E-05) | integration block deferred to BLK-01; unit covers adapter mapping + service call signature |
| `AC-02` | 4 transition routes happy path + replay: SELECTED → CONFIRMED → FAILED; duplicate Idempotency-Key → `replayed: true`. | `src/domains/talent/placement.commands.test.ts` it-blocks "placementConfirm/placementFail/placementCancel happy path + replay" | E-05 | integration deferred; unit covers adapter mapping + replay flag passthrough |
| `AC-03` | `placement.effective` Client-managed: CONFIRMED → EFFECTIVE + PlacementCase CLOSED atomic; no Worker/Episode/Assignment row. | `src/domains/talent/placement.commands.test.ts` it-block "placementEffective Client-managed" + `placement.commands.test.ts` integration contract note | E-05 | integration final DB inspection deferred to BLK-01 |
| `AC-04` | `placement.effective` HRP-managed → 400 `PLACEMENT_VALIDATION_ERROR`; zero mutation. | `src/domains/talent/placement.commands.test.ts` it-block "placementEffective HRP-managed reject" | E-05 | integration deferred; unit covers adapter reject passthrough |
| `AC-05` | Error mapping canonical: PlacementValidationError → 400, InvalidStateTransitionError → 409, PlacementNotFoundError → 404, PlacementIdempotencyConflictError → 409, IdempotencyConflictError → 409, missing key → 400 `IDEMPOTENCY_REQUIRED`, body errors → 400 `VALIDATION`, unauth → 401, role deny → 403, unexpected → 500 generic. | `src/domains/talent/placement.route-helpers.test.ts` T1-T10 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-06` | Idempotency wrap all 5 commands; replay same key+payload → `replayed: true`; conflict → 409 `IDEMPOTENCY_CONFLICT`; create replay → existing placement. | `src/domains/talent/placement.route-helpers.test.ts` T6/T9 + `placement.commands.test.ts` | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts src/domains/talent/placement.route-helpers.test.ts` → exit 0 (E-05) | conflict dual-subclass honest (no fabricated subclass) |
| `AC-07` | Role gate: HR_STAFF → 403; ADMIN/HR_MANAGER pass. | `src/domains/talent/placement.route-helpers.test.ts` T3 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-08` | RLS GUC: route handler gọi `withDbContext` apply GUC; HR_MANAGER pass; PUBLIC → 401. | `src/domains/talent/placement.commands.routes.test.ts` AST guard (helper contains `withDbContext`; route imports `runPlacementCommand`) | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | integration RLS GUC runtime assertion deferred to BLK-01 |
| `AC-09` | Body shape gate: strict Zod + reject unknown fields; `clientAcknowledgedAt` ISO-8601 via `parseStrictIso8601Date`; confirm/fail/cancel body `{}`. | `src/domains/talent/placement.route-helpers.test.ts` T4/T5/T7 | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-10` | Race-loser: AC-10a accepts the two legal confirm/cancel serializable outcomes with strict winner/final-state assertions; AC-10b fail/cancel yields exactly one 200 and one canonical 409. Both FAILED and CANCELLED persist canonical server-built `failureReason`. | `tests/db/p1f0-placement-command-api.integration.test.ts` | P1-F0 targeted `20/20 ×3` + canonical `561 passed / 0 failed / 2 skipped` (E-21) | none |
| `AC-11` | Structured safe log: SafeMeta `route/method/status/actorRole/resourceType/outcome/errorCode` + minimal `detail: { command, placementId, replayed }`. No `actorId`, no body, no evidence, no `acknowledgementRef`, no `failureReason`, no token, no `Idempotency-Key`, no PII. No `console.*`. No fabricated `managementMode/fromStatus/toStatus`. | `src/domains/talent/placement.route-helpers.test.ts` T11-T14 + `src/shared/observability/logger.ts` `__captureSink`/`__resetSink` | `npx.cmd vitest run src/domains/talent/placement.route-helpers.test.ts` → exit 0 (26 passed) (E-05) | none |
| `AC-12` | No fork service. Fail-closed delegation detector via SINGLE canonical classifier `classifyMutatingPlacementRoute` (Path A direct AUTH_MARKER call, Path B delegated handler AUTH_MARKER call, Path C placement helper delegation with `getAuthContext(` + `withDbContext(` call expressions — NOT bare identifiers on any path). Negative fixture consumed by the SAME classifier proves detector catches unguarded routes. F-04A injected-helper source exercises the `helper_missing_security_markers` branch without mutating the production helper. | `src/domains/talent/placement.commands.routes.test.ts` + `src/domains/applications/marketplace-inventory.static.test.ts` (C-04 + F-02 + F-04A/B substantive proof, 17 new assertions) + `tests/security/admin-route-fail-closed.negative-fixture.ts` | `npx.cmd vitest run src/domains/applications/marketplace-inventory.static.test.ts` → exit 0 (47 passed) (E-15) | none |
| `AC-13` | No MP-3C territory: `app/admin/applications/**`, `app/api/admin/applications/**`, `src/domains/applications/placement-ui.ts`, `placement-panel.tsx` 0 hit. | `src/domains/talent/placement.commands.routes.test.ts` AST guard | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-14` | No E0/E1/P1-A0/A1/B docs: `docs/tasks/hrp-p1-{a0,a1,b,e0,e1}-*/**`, `docs/PLANNER_HANDOVER.md` 0 hit. No `permission-catalog.ts` or `prisma/seed.mjs` edit. | `src/domains/talent/placement.commands.routes.test.ts` AST guard + git status | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-15` | No outbox/event producer: route KHÔNG import `@/src/shared/integrity/outbox/**`. | `src/domains/talent/placement.commands.routes.test.ts` AST guard | `npx.cmd vitest run src/domains/talent/placement.commands.routes.test.ts` → exit 0 (54 passed) (E-05) | none |
| `AC-16` | No migration: `prisma/migrations/` 0 hit. Client-managed EFFECTIVE atomic close. HRP-managed EFFECTIVE zero mutation. | static (git diff) + `npx prisma validate` | `npx prisma validate` → exit 0 (E-01) | integration final DB inspection deferred to BLK-01 |
| `AC-17` | `assertSourceCandidateSubmissionIntegrity` no catch-all; DB/RLS error propagate; `createPlacement` not called when `findUnique` rejects. | `src/domains/talent/placement.commands.test.ts` it-block "findUnique reject → createPlacement not called" + `src/domains/talent/placement.commands.ts:assertSourceCandidateSubmissionIntegrity` | `npx.cmd vitest run src/domains/talent/placement.commands.test.ts` → exit 0 (15 passed) (E-12) | none |
| `AC-18` | Dual-URL env readiness and posture fail closed; writer/admin same host+port+db, writer non-super/non-bypassrls, admin bypassrls. | preflight + posture scripts | `CI_INTEGRATION_STRICT=1 npm run test:integration` → `POSTURE_OK writer_is_writer admin_is_admin same_target` (E-21) | none |

### 2.2 C-by-C evidence trail

| Correction | Status | Evidence file |
|---|---|---|
| C-01 (CandidateSubmission fail-closed) | IMPLEMENTED + TESTED | `evidence/corrections/C-01-candidate-submission-fail-closed.txt` |
| C-02 (Auth-first + strict validation) | IMPLEMENTED + TESTED | `evidence/corrections/C-02-auth-first-strict-validation.txt` |
| C-03 (Structured safe logging + truthful AC-11) | IMPLEMENTED + TESTED | `evidence/corrections/C-03-safe-logger-truthful-ac11.txt` |
| C-04 (Fail-closed delegation detector) | IMPLEMENTED + TESTED | `evidence/corrections/C-04-fail-closed-delegation.txt` |
| C-05 (Truthful tests + dual-URL env readiness) | IMPLEMENTED + TESTED | `evidence/corrections/C-05-truthful-tests-dual-url.txt` |
| C-06 (Clean freeze + separate pipeline tooling) | IMPLEMENTED (clean branch off `9274ccd...`; archive branch preserved; semantic Implementation commit + docs-only freeze commit; NO cherry-pick of `c0f4dc6`) | `evidence/corrections/C-06-clean-freeze-pipeline-tooling.txt` |
| C-07 + closure | CLOSED. MP-2 run-scoped identities/FK-safe cleanup plus AC-12b canonical `failureReason` assertion; MP-2 `11/11 ×3`, P1-F0 `20/20 ×3`, canonical `561/0/2`. No production source change. | `evidence/corrections/C-07-closure.txt` + E-21 |

## 3. Evidence registry

| E-id | Artifact | Purpose |
|---|---|---|
| E-01 | `evidence/gates/prisma-validate.txt` | Prisma schema valid |
| E-02 | `evidence/gates/typecheck.txt` | tsc --noEmit exit 0 |
| E-03 | `evidence/gates/lint.txt` | ESLint exit 0 (708 pre-existing warnings, 0 errors) |
| E-04 | `evidence/gates/test-unit.txt` | npm run test:unit output |
| E-05 | `evidence/gates/test-placement-targeted.txt` | 132 placement-related tests output |
| E-06 | `evidence/gates/verify-task.txt` | TASK contract gate result |
| E-07 | `evidence/gates/verify-handoff.txt` | HANDOFF substance gate PASS after v1.4 freeze |
| E-08 | `evidence/gates/verify-encoding.txt` | verify-encoding.ps1 output |
| E-09 | `evidence/gates/git-diff-check.txt` | git diff --check output |
| E-10 | `evidence/gates/encoding-bom-scan.txt` | manual UTF-8 no-BOM scan on changed surface |
| E-11 | `evidence/gates/integration-env-readiness.txt` | historical pre-provision preflight evidence |
| E-12 | `evidence/corrections/C-01-candidate-submission-fail-closed.txt` | C-01 evidence |
| E-13 | `evidence/corrections/C-02-auth-first-strict-validation.txt` | C-02 evidence |
| E-14 | `evidence/corrections/C-03-safe-logger-truthful-ac11.txt` | C-03 evidence |
| E-15 | `evidence/corrections/C-04-fail-closed-delegation.txt` | C-04 evidence |
| E-16 | `evidence/corrections/C-05-truthful-tests-dual-url.txt` | C-05 evidence |
| E-17 | `evidence/corrections/C-06-clean-freeze-pipeline-tooling.txt` | C-06 evidence |
| E-18 | `evidence/sha-pins.txt` | SHA pins: original `9274ccd...`, archive branch head, clean branch head, semantic Implementation SHA (post-commit), docs-only freeze HEAD (post-commit) |
| E-19 | `evidence/corrections/C-07-closure.txt` | C-07 defect closure, runtime posture and exact result summary |
| E-20 | `evidence/gates/verify-handoff.txt` | final verify-handoff PASS |
| E-21 | `evidence/gates/live-integration-run-staging.txt` | fresh MP-2 ×3, P1-F0 ×3 and full canonical strict stdout from T0 synthetic staging |

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
| Source code | FROZEN at semantic Implementation SHA `adbd28f711ccf4f53807fb44a9beb98ba5e22ac4`. Final correction changes test assertions only; production source unchanged. |
| Tests (unit + static + integration) | Unit 2756 passed / 9 skipped; MP-2 `11/11 ×3`; P1-F0 `20/20 ×3`; canonical 561 passed / 0 failed / 2 skipped. |
| Gates | PASS. |
| Canonical integration | PASS on dedicated synthetic staging; production DB/migration NOT_RUN. |
| HANDOFF | `ACCEPTED`. |
| Audit eligibility | `COMPLETED`. Tier 3 LIGHT verdict PASS adopted. |
| Push / PR / Tier 3 / merge / deploy | PR #58 merged; Vercel deployment and read-only/auth-only production smoke verified. No migration required. |
| Archive branch | PRESERVED (`codex/t1b-p1f0-placement-command-planning` nguyên vẹn, KHÔNG amend/reset/rebase/force-push). |
| Pipeline tooling (`c0f4dc6`) | Separated. KHÔNG cherry-pick vào clean delivery. Giữ trên archive branch; T0 review/land riêng. |

## 6. Accepted production closeout

| Gate | Evidence | Result |
|---|---|---|
| Tier 3 audit | `AUDIT.md` SHA-256 `4b48336c7a9403f8f0132c54162db1ae8082c400eb2677b0e10815dcf61636a7`; verdict PASS | PASS |
| Audit adoption | `d7cdd309` preserves `AUDIT.md` byte identity; evidence-only trailing blank lines normalized | PASS |
| Main reconciliation | `fa5d0c043c757df926d30d34f927870a47764cc9` preserves P1-F0 plus accepted main registry entries | PASS |
| PR merge | PR #58 merged at `a91f1bed9ea45a59ae1a734cd2ffbdfa42b7f4d9` | PASS |
| Post-merge CI | GitHub Actions run `36254047212`: Quality and full Integration passed | PASS |
| Deployment | Vercel status for accepted main SHA: deployment completed | PASS |
| Production smoke | Unauthenticated POST to create, confirm, effective, fail, and cancel routes returned HTTP 401 | PASS |
| Database gate | P1-F0 contains no schema/migration delta; production migration was not required or run | NOT_REQUIRED |

No source, test, schema, migration, package, or `AUDIT.md` bytes changed during this docs-only closeout. `AUD-001..AUD-003` remain recorded as non-blocking P3 observations.

Handoff status: ACCEPTED
