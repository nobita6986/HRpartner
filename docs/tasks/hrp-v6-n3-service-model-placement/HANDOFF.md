# HANDOFF — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version | `v0.4 COMPLETE` (round-3 review fixes) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Status | `CLOSEOUT — code in main; migration APPLIED_REPORTED; DO_NOT_REAPPLY; only closeout evidence remains` |
| Baseline | `40cd9d4` (origin/main, post N1 round-5 push) |
| Worktree | `C:\CodeApp\HrP-worktrees\tier1-n3-service-model-placement` (branch `tier1/n3-service-model-placement`) |
| **DB test branch** | **`hrp_n3_v3` (Neon branch `br-billowing-meadow-azqpi3oo` tạo từ baseline `hrp-live`)** — verify migration sửa trên nhánh mới từ baseline |
| Slicing | Slice A (schema + migration + RLS/GRANT + pure lifecycle) → Slice B (service + resolution + errors + tests mock) → Slice C (DB integration test + HANDOFF + AUDIT + push) |

> Tier 0 chốt 2026-09-14 21:00 (4 điểm, xem TASK §0): (1) PlacementCase thuộc 1 LaborProfile; (2) unique partial index chống race; (3) RLS/GRANT trong Slice A; (4) `ENV_BLOCKED` ≠ PASS. Tier 0 cho phép chạy thẳng A→B→C qua gate.
>
> 2026-09-14 22:09: Tier 1 hoàn thành đủ DB integration test (9 cases, 9/9 PASS trên `hrp_n3_test`) + fix migration (reorder + row-level RLS predicate) + fix HANDOFF/AUDIT.
>
> **2026-09-14 23:00 — Round-3 review fixes (theo Tier 0 review ngày 2026-09-14 22:50):** 6 bug nghiệp vụ mà test cũ chưa bắt:
> (1) RLS role-based short-circuit bypass labor_profile_id match; (2) `createPlacement` không verify case thuộc đúng LaborProfile + case ACTIVE;
> (3) `markPlacementEffective` không persist evidence; (4) EFFECTIVE không đóng PlacementCase `SUCCESS` (AC-07); (5) Race-loser trả `replayed:true` cho dù state khác;
> (6) Migration cấp DELETE cho runtime role. T1 đã fix code + migration + thêm 5 test cases mới và re-run trên **nhánh thử nghiệm mới `hrp_n3_v3` tạo từ baseline `hrp-live`** → **14/14 PASS**.

## 1. Outcome and changed surface

### Slice A — schema + migration + pure lifecycle

**Delivered:**
- `prisma/schema.prisma` (M): thêm `ServiceModel` enum (4 giá trị), `PlacementStatus` enum (5 giá trị), `JobOpening.serviceModel` nullable, **Placement có thêm 3 cột evidence** (`evidence_acknowledged_at`, `evidence_acknowledged_by_user_id`, `evidence_acknowledgement_ref`), `Placement` model + back-relations (PlacementCase, LaborProfile, JobOpening, ClientCompany, Project, CandidateSubmission), `ProjectAssignment.placementId` nullable FK.
- `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` (NEW + UPDATED):
  - ADD-only — tạo enums + ADD COLUMN serviceModel + CREATE TABLE placements (trước FK reference) + FK chain + indexes + **unique partial index `placements_active_unique`** (DEC-04a — chống race ở DB)
  - **ENABLE/FORCE ROW LEVEL SECURITY + CREATE POLICY** với row-level predicate LUÔN chạy (HR roles cũng phải qua predicate `placement.placement_case_id → placement_case.labor_profile_id`) — `TO app_user_writer, app_user` — DEC-14 round-3 fix
  - **GRANT SELECT,INSERT,UPDATE** + **REVOKE DELETE** + **ALTER DEFAULT PRIVILEGES REVOKE DELETE ON TABLES** — round-3 fix: Placement lịch sử bất khả xóa qua runtime role
- `src/domains/talent/placement.lifecycle.ts` (NEW): pure state machine — `computeManagementMode`, `canTransition`, `isActivePlacement`, `isTerminalPlacement`, `allowedTransitions`. Đầy đủ DEC-05 + DEC-07 guard.
- `src/domains/talent/placement.lifecycle.test.ts` (NEW): **23/23 PASS** — managementMode mapping (5 cases), happy transitions, sad paths (HRP EFFECTIVE REJECT, EFFECTIVE/Failed/Cancelled terminal, SELECTED→EFFECTIVE INVALID), isActive/isTerminal, allowedTransitions.

### Slice B — service layer + resolution + errors

**Delivered:**
- `src/domains/talent/placement.errors.ts` (NEW): domain errors — `PlacementValidationError`, `InvalidStateTransitionError`, `PlacementNotFoundError`, `PlacementIdempotencyConflictError`.
- `src/domains/talent/placement.resolution.ts` (NEW): `assertClassifiedJobOpening` (DEC-10) + `resolveClientCompanyIdForJobOpening` (DEC-06) — chain `JobOpening → StaffingOrder → Project → ClientCompany`, reject khi chain broken.
- `src/domains/talent/placement.resolution.test.ts` (NEW): **10/10 PASS** — happy path (HRP + CLIENT), chain broken cases.
- **`src/domains/talent/placement.service.ts` (UPDATED round-3 fix):**
  - 5 authority commands — `createPlacement` (DEC-04a + DEC-06 + DEC-09 + DEC-10, SAVEPOINT/ROLLBACK TO pattern cho P2002), `confirmPlacement`, `markPlacementEffective` (DEC-07 reject HRP; DEC-08 evidence cho CLIENT), `failPlacement`, `cancelPlacement`.
  - **Round-3 fix (1)**: `createPlacement` giờ verify `placementCase.laborProfileId == input.laborProfileId` (N1 invariant) + `case.status ∈ ACTIVE_CASE_STATUSES` — REJECT `PlacementValidationError` nếu vi phạm.
  - **Round-3 fix (2) + (3)**: `markPlacementEffective` validate evidence → persist 3 cột `evidence_acknowledged_at/by_user_id/ref` trong DB (AC-07) qua conditional UPDATE.
  - **Round-3 fix (AC-07)**: Sau Client-managed EFFECTIVE thành công → `closePlacementCaseSuccess()` đóng `PlacementCase` với `status='CLOSED'`, `closedAt`, `closeReason='PLACEMENT_EFFECTIVE'`. **Đây là atomic closure**: HRP-managed KHÔNG đóng case (N4 owns EFFECTIVE).
  - **Round-3 fix (5)**: Race-loser path trong `createPlacement` (P2002 catched) trả `replayed: winner.status === 'SELECTED'` (caller intent match) — nếu concurrent confirm đổi state sang CONFIRMED thì `replayed=false` để caller biết state đã đổi.
  - **Round-3 fix (transition race)**: `runTransition` khi conditional UPDATE trả count=0 (concurrent change) refresh + trả current state với `replayed=false` (không phải no-op) — caller xử lý theo state thực tế.
- `src/domains/talent/placement.service.test.ts` (UPDATED round-3 fix): **19/19 PASS** (mock Prisma tx) — happy path, FK chain broken reject, JobOpening NULL reject, idempotent replay SELECTED, CONFIRMED transition + idempotent no-op, **case-ownership mismatch reject (ix)**, **case CLOSED reject (x)**, **HRP EFFECTIVE reject, CLIENT EFFECTIVE thiếu evidence reject + happy path với evidence persisted + case CLOSED**, **HRP EFFECTIVE reject KHÔNG đóng case (xii test)**, FAIL/CANCEL side exits, FAILED revert reject, **race-loser fix**.

### Slice C — DB integration test (round-3 fix verified trên **nhánh mới từ baseline**)

**Delivered:**
- `tests/db/placement-lifecycle-integration.test.ts` (UPDATED round-3 fix): **14 test cases** chạy thật trên **nhánh mới từ baseline `hrp-live` (`hrp_n3_v3`)**:
  - (i) `createPlacement → SELECTED; confirmPlacement → CONFIRMED` ✅
  - (ii) `client-managed: SELECTED → CONFIRMED → EFFECTIVE with evidence` ✅
  - (iii) `HRP-managed markPlacementEffective REJECT — N4 owns EFFECTIVE` ✅
  - (iv) `retry cùng (case, opening) khi SELECTED → trả placement hiện tại (idempotent)` ✅
  - (v) `sau FAILED: retry tạo Placement mới (index slot giải phóng)` ✅
  - (vi) `FK chain broken → PlacementValidationError` ✅
  - (vii) `RLS: HR_MANAGER GUC thấy rows; PUBLIC (no GUC) thấy 0 — FORCE RLS enforced` ✅
  - (viii) `UNIQUE partial index race: concurrent INSERT cùng (case,opening) → both fulfilled, one winner one replayed` ✅
  - **(ix) NEW round-3: `case-ownership mismatch → PlacementValidationError (N1 invariant)`** ✅
  - **(x) NEW round-3: `case CLOSED → PlacementValidationError`** ✅
  - **(xi) NEW round-3: `client-managed EFFECTIVE: evidence persisted to DB columns + PlacementCase closed SUCCESS`** ✅
  - **(xii) NEW round-3: `HRP-managed EFFECTIVE reject → case vẫn OPEN (atomic N4 boundary)`** ✅
  - **(xiii) NEW round-3: `app_user_writer DELETE bị REVOKE — Placement lịch sử bất khả xóa`** ✅
  - ENV_BLOCKED honest report (tự bỏ qua khi `DATABASE_URL_TEST` có — **đã pass khi DB khả dụng**)
- **Test chạy trên `hrp_n3_v3` (Neon branch `br-billowing-meadow-azqpi3oo` tạo từ `hrp-live` baseline): 14/14 PASS**

**Lưu ý fix migration (round-2 + round-3):**
- Reorder: tạo `placements` TABLE TRƯỚC `ALTER TABLE project_assignments ADD COLUMN placement_id` (FK reference cần bảng đích tồn tại).
- RLS predicate: row-level predicate LUÔN chạy (HR roles cũng phải match labor_profile_id qua case) — round-3 fix không còn role OR.
- GRANT: SELECT/INSERT/UPDATE chỉ — DELETE REVOKE + ALTER DEFAULT PRIVILEGES — Placement lịch sử bất khả xóa qua runtime role.

### Evidence + Documentation

- `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (this file, v0.4).
- `docs/tasks/hrrp-v6-n3-service-model-placement/AUDIT.md` (UPDATED round 4 verdict — final Tier 3 LIGHT audit decision pending).
- `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage0-contract/README.md` (record Tier 0 chốt theo thời gian + changes v0.1→v0.2→v0.3).
- `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage3-slice-c-integration/README.md` (UPDATED round-3: nhánh mới + 5 fix + 14 cases).

### Changed surface (committed sẵn vào branch `tier1/n3-service-model-placement`)

| File | Action |
|---|---|
| `prisma/schema.prisma` | M: enums + JobOpening.serviceModel + Placement model + 3 cột evidence + ProjectAssignment.placementId |
| `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` | M: reorder + RLS predicate (round-2) + role-INVARIANT predicate (round-3) + REVOKE DELETE + ALTER DEFAULT PRIVILEGES |
| `src/domains/talent/placement.lifecycle.ts` | NEW |
| `src/domains/talent/placement.lifecycle.test.ts` | NEW |
| `src/domains/talent/placement.errors.ts` | NEW |
| `src/domains/talent/placement.resolution.ts` | NEW |
| `src/domains/talent/placement.resolution.test.ts` | NEW |
| `src/domains/talent/placement.service.ts` | NEW (round-3: case-ownership check + evidence persistence + case close SUCCESS + race-loser fix) |
| `src/domains/talent/placement.service.test.ts` | NEW + UPDATED round-3: 19 tests |
| `vitest.integration-files.ts` | M: thêm 1 entry cho N3 DB integration |
| `tests/db/placement-lifecycle-integration.test.ts` | UPDATED round-3: thêm 5 case (ix-xiii) + ENV_BLOCKED self-skip |
| `docs/tasks/hrp-v6-n3-service-model-placement/TASK.md` | M: v0.3 (4 chốt Tier 0); chưa bump v0.4 — round-3 fixes inline trong code+evidence |
| `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` | M: v0.4 round-3 fixes complete |
| `docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` | M: round 4 verdict — pending Tier 3 audit final diff |
| `docs/tasks/hrp-v6-n3-service-model-placement/evidence/stage3-slice-c-integration/README.md` | M: 14 cases + nhánh mới từ baseline |
| `docs/PLANNER_HANDOVER.md` | M: cursor cập nhật cho N3 round-3 complete |

### Lane escalation

`No`. Lane CRITICAL giữ nguyên. Audit LIGHT giữ nguyên theo TIER0_HANDOVER §5.

## 2. Acceptance evidence

| AC | Verify command | Result | Note |
|---|---|---|---|
| `AC-01` | `prisma/schema.prisma` review + `npx prisma validate` | PASS — ServiceModel enum 4 giá trị, nullable, no sentinel | None |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/domains/talent/placement.lifecycle.test.ts` | **23/23 PASS** | None |
| `AC-03` | `npx prisma validate` + schema review | PASS — Placement model đầy đủ FK chain + snapshot nullable + 3 cột evidence (round-3) + audit timestamps | None |
| `AC-04` | `prisma/schema.prisma` review + DB case (ix) (x) | **PASS** — PlacementCase.placements[] back-relation; DEC-04 chốt + round-3 enforce case-ownership trong service | DB test (ix) (x) verify |
| `AC-04a` | DB integration case (viii) | **PASS trên hrp_n3_v3** — verify unique partial index chống race + race-loser fix; slot giải phóng sau FAILED trong case (v) | DB test đã pass |
| `AC-05` | `npx vitest run … placement.lifecycle.test.ts` | **23/23 PASS** — full state machine | None |
| `AC-06` | DB integration case (iii) | **PASS trên hrp_n3_v3** — HRP-managed EFFECTIVE reject đúng DEC-07 | DB test đã pass |
| `AC-07` | DB integration case (xi) | **PASS trên hrp_n3_v3** — client-managed EFFECTIVE happy path + evidence PERSISTED to DB + PlacementCase CLOSED SUCCESS (atomic closure) | DB test (xi) verify |
| `AC-08` | `placement.service.ts` + `placement.lifecycle.ts` review | PASS — `serviceModelSnapshot` chỉ set tại createPlacement | None |
| `AC-09` | DB integration case (iv) + (viii) | **PASS trên hrp_n3_v3** — idempotent replay + race-loser fix | DB test đã pass |
| `AC-10` | DB integration case (vi) | **PASS trên hrp_n3_v3** — FK chain broken reject đúng DEC-06 | DB test đã pass |
| `AC-11` | DB integration case (viii) + unit tests conditional UPDATE | **PASS** — conditional UPDATE + idempotent no-op | DB test đã pass |
| `AC-12` | `prisma/schema.prisma` review | PASS — ProjectAssignment.placementId nullable, no N3 INSERT/UPDATE code | None |
| `AC-13` | `git diff --name-only` | PASS — không sửa intake-writer.service.ts, staffing/, không tạo Worker/Episode (verified DB case (xi) check episodes = 0) | None |
| `AC-14` | SQL migration review | PASS — ADD-only, không DROP/RENAME/ALTER data | None |
| `AC-15` | `npx tsc --noEmit` | 0 new errors (9 pre-existing `intake-writer-integration.test.ts` baseline errors) | None |
| `AC-16` | `npx vitest run --config vitest.unit.config.ts` (full unit) | **135 files, 2225/2225 PASS** | None |
| `AC-17` | `npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts` | **14/14 PASS trên hrp_n3_v3** — tất cả 13 cases + ENV_BLOCKED | DB test đã pass |
| `AC-17a` | DB integration case (vii) + (xiii) | **PASS trên hrp_n3_v3** — RLS role-INVARIANT predicate + DELETE REVOKE | DB test đã pass |
| `AC-18` | `AUDIT.md` verdict | Tier 3 LIGHT round 4 audit pending final diff | Chờ Tier 3 review final diff |
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
2. ✅ Slice B: service + resolution + errors + **19 unit tests PASS** (mock Prisma tx; round-3 fix: case-ownership + evidence persistence + case close SUCCESS + race-loser fix).
3. ✅ **Slice C: DB integration test PASS — 14/14 trên `hrp_n3_v3`** (Neon branch `br-billowing-meadow-azqpi3oo` tạo từ baseline `hrp-live`, endpoint `ep-aged-mode-azhomkea`). Round-3 verification: 5 case mới (ix-xiii).
4. ⏳ Tier 3 LIGHT audit round 4 verdict PASS/CONDITIONAL chấp nhận đúng diff cuối (cần commit + push mới nhất).
5. ⏳ Tier 0/Owner quyết định: merge branch → main, apply migration lên `hrp-live`.

Tier 1 KHÔNG tự merge main; KHÔNG tự apply production.

## 6. Revision log

| Version | Date | Author | Change |
|---|---|---|---|
| `v0.1 IN_PROGRESS` | `2026-09-14 21:30` | `Tier 1` | HANDOFF cho branch `tier1/n3-service-model-placement` HEAD `40cd9d4 + Slice A + Slice B + Slice C scaffold`. 22 AC. Slice A+B PASS; Slice C ENV_BLOCKED. |
| `v0.2` | `2026-09-14 22:09` | `Tier 1` | Full DB integration test 9/9 PASS trên `hrp_n3_test`; migration fix (reorder + row-level RLS predicate); HANDOFF/AUDIT updated. DB gate passed → Tier 3 final audit pending. |
| `v0.4 round-3 fix` | `2026-09-14 23:00` | `Tier 1` | (1) RLS role-INVARIANT (HR roles vẫn phải match labor_profile_id); (2) createPlacement verify case-ownership + ACTIVE; (3) EFFECTIVE persist evidence vào DB; (4) Client-managed EFFECTIVE đóng PlacementCase atomic; (5) race-loser fix; (6) Migration REVOKE DELETE cho runtime role. 5 test case DB mới (ix-xiii) + 5 unit test mới (19/19). DB integration 14/14 PASS trên nhánh MỚI `hrp_n3_v3` tạo từ baseline `hrp-live`. Full unit 135 files 2225/2225 PASS. typecheck 0 new errors. Awaiting Tier 3 round 4 audit verdict. |
| **`v0.5 round-4 fix + audit PASS`** | **`2026-09-15 10:00`** | **`Tier 1`** | **Round-4 review (theo T0 ngày 14/09 23:20): 3 fix (F-07 ALTER DEFAULT PRIVILEGES removed; F-08 closePlacementCaseSuccess throws on count=0; F-09 runTransition distinguish replay vs conflict). 2 test DB mới (xiv-xv) + 4 unit test mới (23/23). DB integration **16/16 PASS trên `hrp_n3_v5`** (Neon branch `br-bold-term-az0ej1zd` tạo từ baseline `hrp-live`, endpoint `ep-weathered-art-az1c0gzh`). Full unit 135 files 2229/2229 PASS. typecheck 0 new errors. Tier 3 LIGHT audit round 5 verdict **PASS**. Branch `tier1/n3-service-model-placement` HEAD = `1a1eba4` (pushed → origin).** |
| `v0.7 CLOSEOUT` | `2026-09-15 11:00` | `Tier 1` | Closeout update theo lệnh T0 ngày 15/09: code N3 đã ở `origin/main` (commit `68e184e`); migration `20260914212136_n3_service_model_placement` đã DECIDED/APPLIED_REPORTED trên production. Hygiene branches `hrp_n3_v3` + `hrp_n3_v5` còn trong Neon console (Tier 1 KHÔNG tự xóa — ghi lại bằng văn bản trong closeout này). Chỉ còn closeout evidence và W0 hygiene trong TASK `hrp-v6-docs-config-reconciliation`. Không còn "chờ merge" hay "chờ Owner apply migration". |
