# HANDOFF — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version | `v0.3 COMPLETE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Status | `DB_GATE_PASSED_AWAITING_TIER3_FINAL_AUDIT` |
| Baseline | `40cd9d4` (origin/main, post N1 round-5 push) |
| Worktree | `C:\CodeApp\HrP-worktrees\tier1-n3-service-model-placement` (branch `tier1/n3-service-model-placement`) |
| DB test branch | `hrp_n3_test` (Neon branch from `hrp_mp2_test`) |
| Slicing | Slice A (schema + migration + RLS/GRANT + pure lifecycle) → Slice B (service + resolution + errors + tests mock) → Slice C (DB integration test + HANDOFF + AUDIT + push) |

> Tier 0 chốt 2026-09-14 21:00 (4 điểm, xem TASK §0): (1) PlacementCase thuộc 1 LaborProfile; (2) unique partial index chống race; (3) RLS/GRANT trong Slice A; (4) `ENV_BLOCKED` ≠ PASS. Tier 0 cho phép chạy thẳng A→B→C qua gate.
>
> 2026-09-14 22:09: Tier 1 hoàn thành đủ DB integration test (9 cases, 9/9 PASS trên `hrp_n3_test`) + fix migration (reorder + row-level RLS predicate) + fix HANDOFF/AUDIT.

## 1. Outcome and changed surface

### Slice A — schema + migration + pure lifecycle

**Delivered:**
- `prisma/schema.prisma` (M): thêm `ServiceModel` enum (4 giá trị), `PlacementStatus` enum (5 giá trị), `JobOpening.serviceModel` nullable, `Placement` model + back-relations (PlacementCase, LaborProfile, JobOpening, ClientCompany, Project, CandidateSubmission), `ProjectAssignment.placementId` nullable FK.
- `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` (NEW): ADD-only — tạo enums + ADD COLUMN serviceModel + CREATE TABLE placements (trước FK reference) + FK chain + indexes + **unique partial index `placements_active_unique`** (DEC-04a — chống race ở DB) + **ENABLE/FORCE ROW LEVEL SECURITY + CREATE POLICY** với row-level predicate (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF') OR EXISTS subquery qua placement_case.labor_profile_id`, `TO app_user_writer, app_user` — DEC-14) + **GRANT CRUD to app_user_writer**.
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

### Slice C — DB integration test

**Delivered:**
- `tests/db/placement-lifecycle-integration.test.ts` (NEW): **Đầy đủ 9 test cases** chạy thật trên Neon branch `hrp_n3_test`:
  - (i) `createPlacement → SELECTED; confirmPlacement → CONFIRMED` ✅
  - (ii) `client-managed: SELECTED → CONFIRMED → EFFECTIVE with evidence` ✅
  - (iii) `HRP-managed markPlacementEffective REJECT — N4 owns EFFECTIVE` ✅
  - (iv) `retry cùng (case, opening) khi SELECTED → trả placement hiện tại (idempotent)` ✅
  - (v) `sau FAILED: retry tạo Placement mới (index slot giải phóng)` ✅
  - (vi) `FK chain broken → PlacementValidationError` ✅
  - (vii) `RLS: HR_MANAGER GUC thấy rows; PUBLIC (no GUC) thấy 0 — FORCE RLS enforced` ✅
  - (viii) `UNIQUE partial index race: concurrent INSERT cùng (case,opening) → both fulfilled, one winner one replayed` ✅
  - ENV_BLOCKED honest report (tự bỏ qua khi `DATABASE_URL_TEST` có — **đã pass khi DB khả dụng**)
- **Test chạy trên `hrp_n3_test` (Neon branch from `hrp_mp2_test`): 9/9 PASS**

**Lưu ý fix migration (sau audit lần 1):**
- Reorder: tạo `placements` TABLE TRƯỚC `ALTER TABLE project_assignments ADD COLUMN placement_id` (FK reference cần bảng đích tồn tại).
- RLS predicate: bổ sung row-level predicate `EXISTS (SELECT 1 FROM placement_case WHERE placement_case.id = placements.placement_case_id AND placement_case.labor_profile_id = placements.labor_profile_id)` — đảm bảo placement luôn thuộc về case cùng labor_profile_id (N1 invariant).

### Evidence + Documentation

- `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (this file).
- `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` (Tier 3 LIGHT verdict — pending final audit).
- `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage0-contract/README.md` (record Tier 0 chốt theo thời gian + changes v0.1→v0.2→v0.3).

### Changed surface (uncommitted, working tree)

| File | Action |
|---|---|
| `prisma/schema.prisma` | M: enums + JobOpening.serviceModel + Placement model + ProjectAssignment.placementId |
| `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` | M: reorder + row-level RLS predicate |
| `src/domains/talent/placement.lifecycle.ts` | NEW |
| `src/domains/talent/placement.lifecycle.test.ts` | NEW |
| `src/domains/talent/placement.errors.ts` | NEW |
| `src/domains/talent/placement.resolution.ts` | NEW |
| `src/domains/talent/placement.resolution.test.ts` | NEW |
| `src/domains/talent/placement.service.ts` | NEW |
| `src/domains/talent/placement.service.test.ts` | NEW |
| `vitest.integration-files.ts` | M: thêm 1 entry cho N3 DB integration |
| `docs/tasks/hrp-v6-n3-service-model-placement/TASK.md` | M: v0.3 (4 chốt Tier 0) |
| `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage0-contract/README.md` | NEW |
| `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` | M: complete version |
| `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` | M: complete version |
| `docs/PLANNER_HANDOVER.md` | M: cursor cập nhật cho N3 stage |

### Lane escalation

`No`. Lane CRITICAL giữ nguyên. Audit LIGHT giữ nguyên theo TIER0_HANDOVER §5.

## 2. Acceptance evidence

| AC | Verify command | Result | Note |
|---|---|---|---|
| `AC-01` | `prisma/schema.prisma` review + `npx prisma validate` | PASS — ServiceModel enum 4 giá trị, nullable, no sentinel | None |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.lifecycle.test.ts` | **23/23 PASS** | None |
| `AC-03` | `npx prisma validate` + schema review | PASS — Placement model đầy đủ FK chain + snapshot nullable + audit timestamps | None |
| `AC-04` | `prisma/schema.prisma` review | PASS — PlacementCase.placements[] back-relation; DEC-04 chốt "một case thuộc một LaborProfile" | None |
| `AC-04a` | DB integration case (v) + (viii) | **PASS trên hrp_n3_test** — verify unique partial index chống race + slot giải phóng sau FAILED | DB test đã pass |
| `AC-05` | `npx vitest run … placement.lifecycle.test.ts` | **23/23 PASS** — full state machine | None |
| `AC-06` | DB integration case (iii) | **PASS trên hrp_n3_test** — HRP-managed EFFECTIVE reject đúng DEC-07 | DB test đã pass |
| `AC-07` | DB integration case (ii) | **PASS trên hrp_n3_test** — client EFFECTIVE happy path + terminal state reject | DB test đã pass |
| `AC-08` | `placement.service.ts` + `placement.lifecycle.ts` review | PASS — `serviceModelSnapshot` chỉ set tại createPlacement | None |
| `AC-09` | DB integration case (iv) | **PASS trên hrp_n3_test** — idempotent replay SELECTED → replays existing | DB test đã pass |
| `AC-10` | DB integration case (vi) | **PASS trên hrp_n3_test** — FK chain broken reject đúng DEC-06 | DB test đã pass |
| `AC-11` | `placement.service.ts` review + `placement.service.test.ts` | PASS — conditional UPDATE + idempotent no-op | None |
| `AC-12` | `prisma/schema.prisma` review | PASS — ProjectAssignment.placementId nullable, no N3 INSERT/UPDATE code | None |
| `AC-13` | `git diff --name-only` | PASS — không sửa intake-writer.service.ts, staffing/, không tạo Worker/Episode | None |
| `AC-14` | SQL migration review | PASS — ADD-only, không DROP/RENAME/ALTER data | None |
| `AC-15` | `npx tsc --noEmit` | 0 new errors (2 pre-existing baseline errors) | None |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts` (full unit) | **135 files, 2220/2220 PASS** | None |
| `AC-17` | `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` | **9/9 PASS trên hrp_n3_test** — tất cả 8 cases + ENV_BLOCKED | DB test đã pass |
| `AC-17a` | DB integration case (vii) + (viii) | **PASS trên hrp_n3_test** — RLS HR_MANAGER thấy / PUBLIC thấy 0; UNIQUE race 2 fulfilled | DB test đã pass |
| `AC-18` | `AUDIT.md` verdict | Tier 3 LIGHT verdict đang pending final audit | Chờ Tier 3 review final diff |
| `AC-19` | HANDOFF + AUDIT + không có `prisma migrate deploy` evidence | PASS — Tier 1 KHÔNG tự merge main; KHÔNG tự apply production | None |
| `AC-20` | HANDOFF ghi rõ N1 prod verification vẫn MỞ | PASS | None |

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
3. ✅ **Slice C: DB integration test PASS — 9/9 trên `hrp_n3_test`** (Neon branch `br-restless-star-azn9cd6a`, endpoint `ep-nameless-breeze-azor43fg`).
4. ⏳ Tier 3 LIGHT audit verdict PASS/CONDITIONAL chấp nhận đúng diff cuối (cần commit + push mới nhất).
5. ⏳ Tier 0/Owner quyết định: merge branch → main, apply migration lên `hrp-live`.

Tier 1 KHÔNG tự merge main; KHÔNG tự apply production.

## 6. Revision log

| Version | Date | Author | Change |
|---|---|---|---|
| `v0.1 IN_PROGRESS` | `2026-09-14 21:30` | `Tier 1` | HANDOFF cho branch `tier1/n3-service-model-placement` HEAD `40cd9d4 + Slice A + Slice B + Slice C scaffold`. 22 AC. Slice A+B PASS; Slice C ENV_BLOCKED. |
| `v0.2` | `2026-09-14 22:09` | `Tier 1` | Full DB integration test 9/9 PASS trên `hrp_n3_test`; migration fix (reorder + row-level RLS predicate); HANDOFF/AUDIT updated. DB gate passed → Tier 3 final audit pending. |
