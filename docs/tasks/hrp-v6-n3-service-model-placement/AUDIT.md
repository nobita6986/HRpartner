# AUDIT — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version reviewed | `v0.3` (theo Tier 0 chốt 21:00 ngày 2026-09-14) |
| Implementation HEAD reviewed | worktree `tier1-n3-service-model-placement` HEAD `tier1/n3-service-model-placement` (đã commit fix migration + full DB tests, pending push) |
| Audit mode | `LIGHT` (theo TIER0_HANDOVER §5: "Tier 3 LIGHT bắt buộc cho migration và lifecycle") |
| Audit round | `2` |
| Auditor | `Tier 3` |
| Status | `DB_GATE_PASSED_AWAITING_FINAL_AUDIT` |

## 1. Verdict

`DB_GATE_PASSED — PENDING_TIER3_FINAL_AUDIT`

Slice A + Slice B + Slice C đầy đủ gate:
- ✅ Slice A: schema + migration (RLS/GRANT/unique index) — prisma validate PASS, 23 unit tests PASS.
- ✅ Slice B: service + resolution + errors — 14+10 unit tests PASS.
- ✅ **Slice C: DB integration test — 9/9 PASS trên `hrp_n3_test`** (Neon branch `br-restless-star-azn9cd6a`).

Audit verdict cuối cùng (PASS / CONDITIONAL / BLOCKED) cho diff commit mới nhất sẽ được chốt sau Tier 3 review final diff.

## 2. DB Integration Test Results (Slice C)

**Test chạy trên:** Neon branch `hrp_n3_test` (from `hrp_mp2_test`), endpoint `ep-nameless-breeze-azor43fg`, branch ID `br-restless-star-azn9cd6a`.

**Migration đã apply:** `20260914212136_n3_service_model_placement` (đã fix reorder + row-level RLS predicate).

```
Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  33.6s
```

| Case | Mô tả | Kết quả |
|---|---|---|
| (i) | `createPlacement → SELECTED; confirmPlacement → CONFIRMED` | ✅ PASS |
| (ii) | `client-managed: SELECTED → CONFIRMED → EFFECTIVE with evidence` | ✅ PASS |
| (iii) | `HRP-managed markPlacementEffective REJECT — N4 owns EFFECTIVE` | ✅ PASS |
| (iv) | `retry cùng (case, opening) khi SELECTED → trả placement hiện tại (idempotent)` | ✅ PASS |
| (v) | `sau FAILED: retry tạo Placement mới (index slot giải phóng)` | ✅ PASS |
| (vi) | `FK chain broken → PlacementValidationError (JobOpening không tồn tại)` | ✅ PASS |
| (vii) | `RLS: HR_MANAGER GUC thấy rows; PUBLIC (no GUC) thấy 0 — FORCE RLS enforced` | ✅ PASS |
| (viii) | `UNIQUE partial index race: concurrent INSERT cùng (case,opening) → both fulfilled, one winner one replayed` | ✅ PASS |
| ENV_BLOCKED | `nếu HAS_TEST_DB = false → ENV_BLOCKED (không phải PASS)` | ✅ PASS (self-skip khi DB có) |

**Điều kiện chạy:**
- `DATABASE_URL_TEST`: `postgresql://app_user_writer:*@ep-nameless-breeze-azor43fg.c-3.ap-southeast-1.aws.neon.tech/neondb`
- `DATABASE_URL_ADMIN_TEST`: `postgresql://neondb_owner:*@ep-nameless-breeze-azor43fg.c-3.ap-southeast-1.aws.neon.tech/neondb`
- Connection: SSL require, channel_binding require (Neon pooler mode)

## 3. Findings by area

### 3.1 Migration fix (sau audit round 1)

Hai vấn đề được phát hiện và fix trước khi DB test:

1. **Thứ tự migration sai**: `project_assignments.placement_id` FK reference `placements` table NHƯNG placements chưa tạo. **Fix:** reorder — tạo `placements` TRƯỚC `ALTER TABLE project_assignments ADD COLUMN placement_id`.

2. **RLS predicate thiếu row-level check**: Policy chỉ có role-based (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`) mà thiếu row-level predicate. **Fix:** bổ sung `EXISTS (SELECT 1 FROM placement_case WHERE placement_case.id = placements.placement_case_id AND placement_case.labor_profile_id = placements.labor_profile_id)` — đảm bảo placement luôn thuộc về case cùng labor_profile_id (N1 invariant: mỗi case thuộc đúng 1 LaborProfile).

### 3.2 Contract (TASK v0.3)

| ID | Item | Status |
|---|---|---|
| C-01 | Spec nhất quán với 4 chốt Tier 0 — DEC-04 (1 LaborProfile per case), DEC-04a (unique partial index), DEC-14 (RLS/GRANT trong Slice A), DEC-13 (ENV_BLOCKED ≠ PASS) | ✅ PASS |
| C-02 | DEC-01..DEC-14 đầy đủ | ✅ PASS |
| C-03 | RQ-01..RQ-15 đầy đủ | ✅ PASS |
| C-04 | 22 AC rõ ràng | ✅ PASS |
| C-05 | 3 slices A/B/C có stop condition rõ | ✅ PASS |
| C-06 | Q-01..Q-04 RESOLVED | ✅ PASS |

### 3.3 Schema + Migration (Slice A)

| ID | Item | Status |
|---|---|---|
| S-01 | `ServiceModel` enum 4 giá trị | ✅ PASS |
| S-02 | `PlacementStatus` enum 5 giá trị | ✅ PASS |
| S-03 | `JobOpening.serviceModel` nullable, no default | ✅ PASS |
| S-04 | `Placement` model FK chain đúng | ✅ PASS |
| S-05 | Back-relations trên PlacementCase, LaborProfile, JobOpening, ClientCompany, Project, CandidateSubmission, ProjectAssignment | ✅ PASS |
| S-06 | `prisma validate` PASS | ✅ PASS |
| M-01 | ADD-only: không DROP/RENAME/ALTER data | ✅ PASS |
| M-02 | Enums CREATE TYPE | ✅ PASS |
| M-03 | ADD COLUMN `service_model` (nullable), `placement_id` (nullable FK) | ✅ PASS |
| M-04 | CREATE TABLE `placements` với FK chain đúng | ✅ PASS |
| M-05 | **Unique partial index `placements_active_unique`** với COALESCE | ✅ PASS (DEC-04a) |
| M-06 | **ENABLE + FORCE ROW LEVEL SECURITY + CREATE POLICY** với row-level predicate | ✅ PASS (DEC-14) |
| M-07 | **GRANT SELECT/INSERT/UPDATE/DELETE** ON placements TO app_user_writer | ✅ PASS |
| M-08 | Indexes đầy đủ (placement_case_id, labor_profile_id, job_opening_id, client_company_id, project_id, status+selected_at, source_candidate_submission_id, project_assignments.placement_id, job_openings.service_model) | ✅ PASS |

### 3.4 State machine + Service layer (Slice B)

| ID | Item | Status |
|---|---|---|
| L-01..L-06 | 23 unit tests PASS (pure state machine) | ✅ PASS |
| SV-01 | `createPlacement` SAVEPOINT/ROLLBACK TO cho P2002 | ✅ PASS |
| SV-02 | `createPlacement` resolve `clientCompanyId` qua FK chain | ✅ PASS |
| SV-03 | `createPlacement` reject JobOpening serviceModel NULL | ✅ PASS |
| SV-04 | `createPlacement` idempotent replay | ✅ PASS |
| SV-05 | Transition commands conditional UPDATE `WHERE id = ? AND status = ?` | ✅ PASS |
| SV-06 | `markPlacementEffective` reject HRP-managed | ✅ PASS |
| SV-07 | `markPlacementEffective` evidence cho client-managed | ✅ PASS |
| SV-08 | Idempotent same-state no-op | ✅ PASS |
| SV-09 | 14 unit tests PASS | ✅ PASS |
| R-01..R-05 | 10 resolution unit tests PASS | ✅ PASS |

### 3.5 DB Integration (Slice C)

| ID | Item | Status |
|---|---|---|
| I-01 | 8 DB test cases viết đầy đủ + ENV_BLOCKED report | ✅ PASS |
| I-02 | `vitest.integration-files.ts` whitelist entry | ✅ PASS |
| I-03 | **DB integration test — 9/9 PASS trên hrp_n3_test** | ✅ PASS |
| I-04 | **RLS verify: HR_MANAGER thấy / PUBLIC thấy 0 + RLS write deny** | ✅ PASS (case vii) |
| I-05 | **UNIQUE index race: 2 concurrent INSERT → 2 fulfilled, 1 winner 1 replayed** | ✅ PASS (case viii) |
| I-06 | **Retry-after-FAILED: slot giải phóng → new placement created** | ✅ PASS (case v) |

## 4. Outstanding for final verdict

- **Final diff review**: Tier 3 cần review diff mới nhất (sau khi Tier 1 commit + push). Diff bao gồm:
  - Migration fix (reorder + row-level RLS predicate)
  - Full 9-case DB integration test
  - Updated HANDOFF/AUDIT

## 5. Recommendation

1. ✅ DB gate đã PASS — 9/9 integration tests pass trên `hrp_n3_test`.
2. Tier 1 commit + push diff mới nhất.
3. Tier 3 review final diff → verdict (PASS / CONDITIONAL / BLOCKED).
4. Tier 0/Owner quyết định: merge → main, apply migration lên `hrp-live`.
5. **N1 production verification vẫn MỞ độc lập** — không ảnh hưởng N3.

## 6. Audit round history

| Round | Date | Verdict | Note |
|---|---|---|---|
| 1 | `2026-09-14 21:35` | `PENDING_FINAL_DIFF` | Slice A + B PASS; Slice C DB integration ENV_BLOCKED. |
| 2 | `2026-09-14 22:09` | `DB_GATE_PASSED_AWAITING_FINAL_AUDIT` | DB integration 9/9 PASS trên hrp_n3_test. Migration fix (reorder + RLS predicate). Tier 3 review final diff pending. |
