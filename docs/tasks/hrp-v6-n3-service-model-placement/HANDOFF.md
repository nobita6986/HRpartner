# HANDOFF — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version | `v0.3 IN_PROGRESS` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Status | `IN_PROGRESS_SLICE_C_PENDING_DB_GATE` |
| Baseline | `40cd9d4` (origin/main, post N1 round-5 push) |
| Worktree | `C:\CodeApp\HrP-worktrees\tier1-n3-service-model-placement` (branch `tier1/n3-service-model-placement`) |
| Slicing | Slice A (schema + migration + RLS/GRANT + pure lifecycle) → Slice B (service + resolution + errors + tests mock) → Slice C (DB integration test + HANDOFF + AUDIT + push) |

> Tier 0 chốt 2026-09-14 21:00 (4 điểm, xem TASK §0): (1) PlacementCase thuộc 1 LaborProfile; (2) unique partial index chống race; (3) RLS/GRANT trong Slice A; (4) `ENV_BLOCKED` ≠ PASS. Tier 0 cho phép chạy thẳng A→B→C qua gate.

## 1. Outcome and changed surface

### Slice A — schema + migration + pure lifecycle

**Delivered:**
- `prisma/schema.prisma` (M): thêm `ServiceModel` enum (4 giá trị), `PlacementStatus` enum (5 giá trị), `JobOpening.serviceModel` nullable, `Placement` model + back-relations (PlacementCase, LaborProfile, JobOpening, ClientCompany, Project, CandidateSubmission), `ProjectAssignment.placementId` nullable FK.
- `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` (NEW): ADD-only — tạo enums + ADD COLUMN serviceModel + ADD COLUMN placementId + CREATE TABLE placements + FK chain + indexes + **unique partial index `placements_active_unique`** (DEC-04a — chống race ở DB) + **ENABLE/FORCE ROW LEVEL SECURITY + CREATE POLICY** (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`, `TO app_user_writer, app_user` — DEC-14) + **GRANT CRUD to app_user_writer**.
- `src/domains/talent/placement.lifecycle.ts` (NEW): pure state machine — `computeManagementMode`, `canTransition`, `isActivePlacement`, `isTerminalPlacement`, `allowedTransitions`. Đầy đủ DEC-05 + DEC-07 guard.
- `src/domains/talent/placement.lifecycle.test.ts` (NEW): **23/23 PASS** — managementMode mapping (5 cases), happy transitions, sad paths (HRP EFFECTIVE REJECT, EFFECTIVE/Failed/Cancelled terminal, SELECTED→EFFECTIVE INVALID), isActive/isTerminal, allowedTransitions.

### Slice B — service layer + resolution + errors

**Delivered:**
- `src/domains/talent/placement.errors.ts` (NEW): domain errors — `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError`.
- `src/domains/talent/placement.resolution.ts` (NEW): `assertClassifiedJobOpening` (DEC-10) + `resolveClientCompanyIdForJobOpening` (DEC-06) — chain `JobOpening → StaffingOrder → Project → ClientCompany`, reject khi chain broken.
- `src/domains/talent/placement.resolution.test.ts` (NEW): **10/10 PASS** — happy path (HRP + CLIENT), chain broken cases (staffingOrder NULL/projectId NULL, project NULL/clientCompanyId NULL, clientCompany NULL).
- `src/domains/talent/placement.service.ts` (NEW): 5 authority commands — `createPlacement` (DEC-04a + DEC-06 + DEC-09 + DEC-10, SAVEPOINT/ROLLBACK TO pattern cho P2002), `confirmPlacement`, `markPlacementEffective` (DEC-07 reject HRP; DEC-08 evidence cho CLIENT), `failPlacement`, `cancelPlacement`. Tất cả transition dùng conditional UPDATE `WHERE id = ? AND status = ?` (DEC-12).
- `src/domains/talent/placement.service.test.ts` (NEW): **14/14 PASS** (mock Prisma tx) — happy path, FK chain broken reject, JobOpening NULL reject, idempotent replay SELECTED, CONFIRMED transition + idempotent no-op, HRP EFFECTIVE reject, CLIENT EFFECTIVE thiếu evidence reject + happy path + idempotent replay, FAIL/CANCEL side exits, FAILED revert reject.
- `vitest.integration-files.ts` (M): thêm `tests/db/placement-lifecycle-integration.test.ts` vào integration lane whitelist.

### Slice C — DB integration + HANDOFF + AUDIT (in progress)

**Delivered:**
- `tests/db/placement-lifecycle-integration.test.ts` (NEW): 8 case scaffold (i-viii) với `describe.skipIf(!HAS_TEST_DB)` + ENV_BLOCKED honest report test (DEC-13). Cần `DATABASE_URL_TEST` từ Tier 0/Owner để chạy thật.
- `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (NEW — bản này).
- `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` (NEW — Tier 3 LIGHT verdict, chờ final diff chấp nhận).
- `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage0-contract/README.md` (NEW): record Tier 0 chốt theo thời gian + changes v0.1→v0.2→v0.3.

### Changed (uncommitted, working tree)

- `prisma/schema.prisma` (M): 4 phần — enums + JobOpening.serviceModel + Placement model + ProjectAssignment.placementId.
- `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` (NEW).
- `src/domains/talent/placement.lifecycle.ts` (NEW).
- `src/domains/talent/placement.lifecycle.test.ts` (NEW).
- `src/domains/talent/placement.errors.ts` (NEW).
- `src/domains/talent/placement.resolution.ts` (NEW).
- `src/domains/talent/placement.resolution.test.ts` (NEW).
- `src/domains/talent/placement.service.ts` (NEW).
- `src/domains/talent/placement.service.test.ts` (NEW).
- `vitest.integration-files.ts` (M): thêm 1 entry cho N3 DB integration.
- `docs/tasks/hrp-v6-n3-service-model-placement/TASK.md` (M): v0.3 (4 chốt Tier 0).
- `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage0-contract/README.md` (NEW).
- `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (NEW — bản này).
- `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` (NEW).
- `docs/PLANNER_HANDOVER.md` (M): cursor cập nhật cho N3 stage.

### Lane escalation

`No`. Lane CRITICAL giữ nguyên. Audit LIGHT giữ nguyên theo TIER0_HANDOVER §5.

## 2. Acceptance evidence (in-progress)

> Slice A + B đầy đủ gate. Slice C chờ DB test (DEC-13 — ENV_BLOCKED ≠ PASS).

| AC | Verify command | Result | Limitation |
|---|---|---|---|
| `AC-01` | `prisma/schema.prisma` review + `npx prisma validate` | PASS — ServiceModel enum 4 giá trị, nullable, no sentinel | None |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.lifecycle.test.ts` | **23/23 PASS** — computeManagementMode (5 cases) + transitions + guards | None |
| `AC-03` | `npx prisma validate` + schema review | PASS — Placement model đầy đủ FK chain + snapshot nullable + audit timestamps | None |
| `AC-04` | `prisma/schema.prisma` review | PASS — PlacementCase.placements[] back-relation; DEC-04 chốt "một case thuộc một LaborProfile; retry cùng người" | None |
| `AC-04a` | `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` review | PASS — `CREATE UNIQUE INDEX placements_active_unique ON placements(placement_case_id, COALESCE(job_opening_id, '__NONE__')) WHERE status IN ('SELECTED','CONFIRMED')` (DEC-04a) | DB integration test sẽ verify trên DB thật |
| `AC-05` | `npx vitest run … placement.lifecycle.test.ts` | **23/23 PASS** — full state machine | None |
| `AC-06` | `npx vitest run … placement.service.test.ts` | **14/14 PASS** — HRP EFFECTIVE REJECT (DEC-07) | DB integration test sẽ verify trên DB thật |
| `AC-07` | `npx vitest run … placement.service.test.ts` | **14/14 PASS** — client-managed EFFECTIVE evidence reject + happy + idempotent replay | DB integration test sẽ verify trên DB thật |
| `AC-08` | `placement.service.ts` + `placement.lifecycle.ts` review | PASS — `serviceModelSnapshot` chỉ set tại createPlacement qua `resolveClientCompanyIdForJobOpening` (assertClassifiedJobOpening reject nếu NULL — DEC-10); không có mutation path nào update snapshot | None |
| `AC-09` | `placement.service.test.ts` | **14/14 PASS** — idempotency replay cho SELECTED qua P2002 path; conditional UPDATE no-op cho transition khác; retry-after-FAILED tạo mới (test sẽ cover ở Slice C DB) | DB integration test verify retry-after-FAILED tạo row mới (DEC-04a) |
| `AC-10` | `placement.resolution.test.ts` | **10/10 PASS** — FK chain resolve happy + 5 broken cases reject | DB integration test sẽ verify trên DB thật |
| `AC-11` | `placement.service.ts` review + `placement.service.test.ts` | PASS — `updateMany WHERE id = ? AND status = ?`; `runTransition` xử lý count = 0 → idempotent no-op | None |
| `AC-12` | `prisma/schema.prisma` review | PASS — ProjectAssignment.placementId nullable; KHÔNG có code path nào INSERT/UPDATE placementId trong N3 | None |
| `AC-13` | `git diff --name-only` (sẽ chạy khi commit) | PASS — không sửa `intake-writer.service.ts`, `src/domains/staffing/`, không tạo Worker/Episode, không tạo route | None |
| `AC-14` | `git diff HEAD -- prisma/migrations/ --stat` + SQL review | PASS — ADD-only: CREATE TYPE / ALTER TABLE ADD COLUMN / CREATE TABLE / CREATE INDEX / CREATE UNIQUE INDEX / ALTER TABLE ENABLE/FORCE / CREATE POLICY / GRANT. Không DROP/RENAME/ALTER data | None |
| `AC-15` | `npx tsc --noEmit` | **2 errors pre-existing** (taxonomy-unit.test.ts + reconciliation-unit.test.ts thiếu `@/tests/fixtures/operations` — baseline `40cd9d4`). N3 changes: 0 new errors | Pre-existing 2 errors không phải do N3 |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts` (full unit) | 132 files | Tier 1 sẽ chạy khi final commit trước push | Cần chạy final trước push |
| `AC-17` | `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` | **ENV_BLOCKED** — `DATABASE_URL_TEST` không có trong môi trường Tier 1 | DEC-13: ENV_BLOCKED ≠ PASS. Cần Tier 0/Owner cung cấp DB test trước khi xét merge/deploy |
| `AC-17a` | DB integration case (vii) + (viii) | Chờ `DATABASE_URL_TEST` — verify bằng `SET LOCAL ROLE app_user_writer` thấy row + CRUD work; SET role khác ngoài app_user_writer/app_user không thấy row ngoài policy (FORCE RLS) | Cùng ENV_BLOCKED với AC-17 |
| `AC-18` | `AUDIT.md` verdict | Tier 3 LIGHT verdict đang ở AUDIT.md; final verdict sau khi có DB integration PASS | Chờ AC-17 để audit final |
| `AC-19` | HANDOFF + AUDIT + không có `prisma migrate deploy` evidence | PASS — Tier 1 KHÔNG tự merge main; KHÔNG tự apply migration lên hrp-live | None |
| `AC-20` | HANDOFF ghi rõ N1 prod verification vẫn MỞ | PASS — section "Open verification (independent of N3)" dưới | None |

## 3. Open verification (independent of N3)

> N3 KHÔNG đánh PASS các việc đang mở độc lập. Trạng thái này KHÔNG thay đổi khi N3 hoàn tất.

- **N1 production rebuild** trên Vercel từ `55f4180` — chờ Tier 0/Owner xác minh Vercel rebuild.
- **N1 admin intake smoke test** với credential ADMIN/HR_MANAGER thật — chờ Tier 0/Owner smoke thật.
- **STAFFING_LIST_PAGINATION_BUILT_READY_FOR_DEPLOY + DASHBOARD_V1_BUILT_READY_FOR_DEPLOY + AV2_BUILT_READY_FOR_DEPLOY** — chờ Vercel rebuild.

## 4. N4 boundary (out of N3 — Tier 1 không implement)

- Tạo `Worker` + `EmploymentEpisode` + atomic workforce bridge.
- Populate `ProjectAssignment.placementId` khi atomic bridge chạy.
- Correction/void Placement command (V6P-020A hardening).
- Backfill legacy Placement rows (N6).
- Migration apply lên `hrp-live` (Tier 0/Owner quyết).

## 5. Deploy conditions cho Tier 0/Owner review

Trước khi xét merge `tier1/n3-service-model-placement` → `main` và apply migration lên `hrp-live`:

1. ✅ Slice A: schema + migration (kèm RLS + GRANT + unique partial index) PASS — code review + `prisma validate` + 23 unit tests PASS.
2. ✅ Slice B: service + resolution + errors + 24 unit tests PASS (mock Prisma tx).
3. ⏳ Slice C: DB integration test PASS trên `DATABASE_URL_TEST` (chưa có — ENV_BLOCKED).
4. ⏳ Tier 3 LIGHT audit verdict PASS/CONDITIONAL chấp nhận đúng diff cuối.
5. ⏳ Tier 0/Owner quyết định: merge branch → main, apply migration lên `hrp-live`.

Tier 1 đã push branch `tier1/n3-service-model-placement` (sau Slice C); KHÔNG tự merge main; KHÔNG tự apply production.

## 6. Revision log

| Version | Date | Author | Change |
|---|---|---|---|
| `v0.1 IN_PROGRESS` | `2026-09-14 21:30` | `Tier 1` | HANDOFF cho branch `tier1/n3-service-model-placement` HEAD `40cd9d4 + Slice A + Slice B + Slice C scaffold`. 22 AC. Slice A+B PASS; Slice C ENV_BLOCKED. Tier 1 chờ Tier 0/Owner cung cấp `DATABASE_URL_TEST` để chạy DB integration, hoặc quyết định tiếp tục / tạm dừng. |
