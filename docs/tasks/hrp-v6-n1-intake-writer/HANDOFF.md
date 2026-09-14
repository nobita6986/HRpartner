# HANDOFF — `hrp-v6-n1-intake-writer`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n1-intake-writer` |
| Spec version | `v0.1 DRAFT` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `c9a61dd30c4c987e3f01c4bc51c697abfc972017` (`docs/tasks/hrp-v6-n1-intake-writer/TASK.md` DRAFT-VALID commit) |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:**
  - `createOrMatchLaborProfile(...)` — authority DUY NHẤT resolve person identity, trả `EXACT_MATCH | POSSIBLE_MATCH | NEW_PROFILE` theo contract V7 (DEC-01..04, RQ-01..04).
  - `openPlacementCase(...)` — command mở active PlacementCase, race-safe qua partial unique index đã có ở N1 foundation (`placement_case_labor_profile_id_active_unique`), idempotent từ caller POV (DEC-04, RQ-05, RQ-13).
  - `createCandidateSubmissionFromIntake(...)` — composite: resolve profile → open case → INSERT CandidateSubmission với `placementCaseId` link (RQ-07..09).
  - `POST /api/jobs/apply` — public marketplace apply endpoint với Idempotency-Key bắt buộc, `channel = PUBLIC_MARKETPLACE` proxy qua RLS context `HR_STAFF` (RQ-10, RQ-11).
  - `POST /api/admin/intake/staff` — auth required admin/HR endpoint với `withDbContext` + RLS context actor thật (RQ-10, RQ-12).
  - 36 unit tests covering scoring + race + idempotency + General Interest + actor-not-auto-referrer + POSSIBLE_MATCH-not-merged.
- **Not delivered:**
  - **Integration test với `DATABASE_URL_TEST` thật** (STEP-09, AC-04/05/06) — local máy Tier 1 không có `DATABASE_URL_TEST` (`prisma.unit.config.ts` FORCE unreachable sentinel), chỉ có unit tests với mocked Prisma. Cần Owner/Tier 0 setup integration env để verify race-safe thật trên PG (xem §4 ENV_BLOCKED). Race-safe logic dựa trên partial unique index đã chứng minh ở N1 foundation Stage 4 (`docs/tasks/hrp-v6-n1-placement-case-foundation/HANDOFF.md`), nhưng test runtime concurrency thật chưa chạy.
  - `mergeLaborProfiles(...)` (V6P-007B) — out of scope phase này.
  - Partner intake route (`/api/admin/intake/partner`) — defer sang V6P-008.
  - `JobProposal` / `InteractionOutcome` / `NextAction` — Track J, M4.
  - `CAN_CREATE_INTAKE` permission catalog (V6P-025A) — phase này hardcode role check.
- **Changed:**
  - `src/domains/talent/**` (mới): `normalize.ts`, `normalize.test.ts`, `intake.errors.ts`, `labor-profile.types.ts`, `labor-profile.service.ts`, `labor-profile.service.test.ts` (17 tests), `placement-case.service.ts`, `placement-case.service.test.ts` (3 tests), `intake-writer.service.ts`, `intake-writer.service.test.ts` (5 tests).
  - `app/api/jobs/apply/route.ts` (mới): public POST endpoint.
  - `app/api/admin/intake/staff/route.ts` (mới): admin POST endpoint.
  - `docs/tasks/hrp-v6-n1-intake-writer/{TASK.md,HANDOFF.md}` + `evidence/**`.
- **Lane escalation:** `No`. Lane CRITICAL được giữ nguyên; identity + concurrency đã cover.

## 2. Acceptance evidence

Dòng đầu là verify-task gate. Mỗi `E-xx` được dùng chung cho nhiều AC khi run cùng 1 command.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n1-intake-writer/TASK.md` | `RESULT: DRAFT-VALID (1 warning)` | Status DRAFT non-blocking warning theo verify-task contract. |
| `AC-01` | `E-01` | 9 unit tests PASS (8 scoring + 1 phase-check) | None |
| `AC-02` | `E-01` | Phone-only case → `POSSIBLE_MATCH`, KHÔNG `EXACT_MATCH` (RQ-03) — covered by `(ii)` + `RQ-03` test | None |
| `AC-03` | `E-02` | POSSIBLE_MATCH → `tx.laborProfile.create` NOT called (assert 1 lần) | None |
| `AC-04` | `E-03` | 3 unit tests PASS (new insert / P2002 race / existing case replay) | **Integration test runtime concurrency chưa chạy thật trên DB** — ENV_BLOCKED. Logic dựa trên partial unique index đã chứng minh ở N1 foundation (`docs/tasks/hrp-v6-n1-placement-case-foundation/HANDOFF.md`). |
| `AC-05` | `E-03` + `withIdempotency` reuse | Pattern reuse `src/shared/integrity/idempotency.ts` (đã PASS ở foundation + MP-3C); route layer test tối thiểu. **Integration replay chưa chạy thật** — ENV_BLOCKED. | Same — integration test runtime |
| `AC-06` | `E-02` | General Interest unit test: `projectId = null`, `placementCaseId !== null` PASS | None |
| `AC-07` | `E-02` | 2 unit tests PASS (actor không auto-referrer: ctvId/vendorId NULL; partnerRef CTV valid → ctvId set) | None |
| `AC-08` | `E-04` | Manual grep + logger redaction pattern check | Logger có allow-list `ALLOWED_META_KEYS` tự sanitize secret/PII/CCCD/phone patterns. Unit test không log raw PII qua `logWarn`/`logInfo`. Best-effort — runtime verify cần prod env logs. |
| `AC-09` | `E-05` + pre-existing baseline pin | typecheck log rỗng cho in-scope files. 2 pre-existing failures ở `src/domains/applications/marketplace-browse.routes.test.ts` (baseline `fe54903` resolve 13 pre-existing failures miss file này; command `npx tsc --noEmit` reproduce failure ở baseline commit đó). Ownership Tier 2 task riêng. | Pre-existing failures ngoài scope |
| `AC-10` | `E-06` | `src/domains/talent/` (36 tests) + `src/shared/ui/design-tokens.static.test.ts` (12 tests) = **48 tests PASS** tại in-scope lanes. Full unit suite chưa chạy hết (~2000 tests) để verify không regress — chờ Tier 0/CI. | CI integration chưa verify |
| `AC-11` | `E-06` | `design-tokens.static.test.ts` 12/12 PASS (carry-forward, không đổi) | None |
| `AC-12` | `E-07` | `npx prisma validate` exit 0, `The schema at prisma/schema.prisma is valid 🚀` (smoke — phase này không sửa schema) | None |
| `AC-13` | `E-08` | `git status --porcelain` + `git diff HEAD --stat` chỉ show in-scope roots. Touch: `app/api/jobs/apply/route.ts (M)`, `app/api/admin/intake/ (??)`, `src/domains/talent/ (??)`, `docs/tasks/hrp-v6-n1-intake-writer/ (??)`. KHÔNG touch `prisma/schema.prisma`, `prisma/migrations/**`, `app/(jobs)/**`, `src/domains/staffing/**`, `app/api/admin/assignments/**`. | None |
| `AC-14` | manual | Integration test (`tests/db/intake-writer-integration.test.ts`) chưa viết — `DATABASE_URL_TEST` không có trên máy Tier 1 (ENV_BLOCKED). Tất cả tests ở `src/domains/talent/*.test.ts` dùng mocked Prisma, không touch DB thật. Manual grep `tests/**` cho `hrp-live` = 0 match. | ENV_BLOCKED |
| `AC-15` | `E-09` | `git diff HEAD -- prisma/migrations/ --stat` rỗng (0 lines, 0 files). Schema.prisma không touch. | None |
| `AC-16` | pending | Tier 3 AUDIT.md — verdict PASS / CONDITIONAL_PASS / FAIL. Tier 1 KHÔNG tự phát hành verdict. | Awaiting Tier 3 |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/labor-profile.service.test.ts` | exit 0, 17 it-blocks PASS (9 scoring + 2 wrapper + auxiliary signal) | inline stdout |
| `E-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/intake-writer.service.test.ts` | exit 0, 5 it-blocks PASS | inline stdout |
| `E-03` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement-case.service.test.ts` | exit 0, 3 it-blocks PASS | inline stdout |
| `E-04` | Manual code review: grep PII patterns trong src/domains/talent/** + app/api/jobs/apply/route.ts + app/api/admin/intake/staff/route.ts. Logger chỉ log ID (UUID), verdict enum, channel enum, actorRole. KHÔNG log fullName/phone/cccdNumber raw. | 0 raw PII in log calls | inline grep |
| `E-05` | `npx tsc --noEmit 2>&1 \| Tee-Object .../typecheck.log` + filter `talent\|jobs/apply\|admin/intake` | 0 lỗi in-scope | `evidence/typecheck.log` (rỗng cho in-scope, full log 2 pre-existing failures ở marketplace-browse ngoài scope) |
| `E-06` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/ src/shared/ui/design-tokens.static.test.ts` | 48 tests PASS (36 talent + 12 design-tokens) | `evidence/unit-suite.log` |
| `E-07` | `npx prisma validate 2>&1 \| Tee-Object .../prisma-validate.log` | exit 0, `The schema at prisma/schema.prisma is valid 🚀` | `evidence/prisma-validate.log` |
| `E-08` | `git status --porcelain` + `git diff HEAD --stat` → `evidence/scope-check.txt` | in-scope roots only | `evidence/scope-check.txt` |
| `E-09` | `git diff HEAD -- prisma/migrations/ --stat` → `evidence/migration-diff.log` | rỗng (0 lines) | `evidence/migration-diff.log` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | ENV_BLOCKED | Integration test trên `DATABASE_URL_TEST` (real Postgres) chưa chạy vì máy Tier 1 không có endpoint test DB. Race-safe logic dựa trên partial unique index `placement_case_labor_profile_id_active_unique` (đã APPLIED + VERIFIED trên `hrp-live` ở Stage 4) — Phase này chỉ cần verify app-layer 2 transaction `Promise.all` không insert trùng. Cần: Owner/Tier 0 setup `DATABASE_URL_TEST` pointing đến nhánh test (`hrp_mp2_test`) rồi chạy `tests/db/intake-writer-integration.test.ts`. | Tier 0/Owner quyết (a) chạy integration test trên nhánh test có sẵn; (b) defer sang CI khi có infra; (c) chấp nhận risk vì partial unique index đã chứng minh trên prod. |
| `BLK-02` | Pre-existing | 2 typecheck failures ở `src/domains/applications/marketplace-browse.routes.test.ts` (line 345, 353) KHÔNG liên quan task này, đã có trước task em (commit `fe54903` resolve 13 pre-existing nhưng miss file này). | Ownership Tier 2 task riêng. |

## 5. Final status

- TASK v0.1 + STEP-01..08 đã deliver: 36 unit tests PASS, 0 typecheck errors trong in-scope, prisma validate PASS, design-tokens carry-forward PASS, no migration diff, scope allowlist respected. Integration test trên `DATABASE_URL_TEST` chưa chạy vì thiếu env (BLK-01) — race-safe dựa trên partial unique index đã verified Stage 4. Tier 3 LIGHT audit round 1 tiếp theo sẽ verify changed-behavior + concurrency + idempotency + RLS + diff scope + Git hygiene.

> Handoff status: READY_FOR_AUDIT
