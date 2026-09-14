# AUDIT — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version reviewed | `v0.3` (theo Tier 0 chốt 21:00 ngày 2026-09-14) |
| Implementation HEAD reviewed | worktree `tier1-n3-service-model-placement` HEAD `40cd9d4 + Slice A + Slice B + Slice C scaffold` (chưa push) |
| Audit mode | `LIGHT` (theo TIER0_HANDOVER §5: "Tier 3 LIGHT bắt buộc cho migration và lifecycle") |
| Audit round | `1` |
| Auditor | `Tier 3` |
| Status | `PENDING_FINAL_DIFF` (Slice C DB integration chưa chạy được — ENV_BLOCKED) |

## 1. Verdict

`PENDING_FINAL_DIFF`

Lý do: Slice A + Slice B PASS đầy đủ gate (typecheck, prisma validate, 47 unit tests PASS). Slice C DB integration test viết đầy đủ 8 case + ENV_BLOCKED honest report, nhưng **chưa thể chạy trên `DATABASE_URL_TEST`** trong môi trường Tier 1. Theo DEC-13: `ENV_BLOCKED` là báo cáo trung thực, KHÔNG phải điều kiện PASS. Audit verdict cuối cùng (PASS / CONDITIONAL / BLOCKED) chỉ chốt khi:
1. `DATABASE_URL_TEST` khả dụng → 8 DB integration cases chạy PASS trên nhánh thử nghiệm.
2. Tier 3 xem lại đúng diff cuối (sau khi commit cuối + push branch) — đảm bảo không có drift so với diff đã review.

## 2. Reviewed findings

### 2.1 Contract (TASK v0.3)

| ID | Item | Status |
|---|---|---|
| C-01 | Spec nhất quán với 4 chốt Tier 0 (2026-09-14 21:00) — DEC-04 (1 LaborProfile per case), DEC-04a (unique partial index), DEC-14 (RLS/GRANT trong Slice A), DEC-13 (ENV_BLOCKED ≠ PASS) | ✅ PASS |
| C-02 | DEC-01..DEC-14 đầy đủ, không có DEC nào bị bỏ sót | ✅ PASS |
| C-03 | RQ-01..RQ-15 đầy đủ, khớp DEC | ✅ PASS |
| C-04 | 22 AC rõ ràng, mỗi AC có verification method | ✅ PASS |
| C-05 | 3 slices A/B/C có stop condition rõ, Tier 0 cho phép chạy thẳng | ✅ PASS |
| C-06 | Q-01..Q-04 RESOLVED | ✅ PASS |
| C-07 | Role names trong DEC-14/RQ-14/AC-17a khớp codebase (`app_user_writer` write, `app_user` read) | ✅ PASS sau khi Tier 1 verify |

### 2.2 Schema (Slice A)

| ID | Item | Status |
|---|---|---|
| S-01 | `ServiceModel` enum 4 giá trị nghiệp vụ, không sentinel | ✅ PASS |
| S-02 | `PlacementStatus` enum 5 giá trị đúng DEC-05 | ✅ PASS |
| S-03 | `JobOpening.serviceModel` nullable, không có default bừa | ✅ PASS |
| S-04 | `Placement` model đầy đủ FK chain theo DEC-03 | ✅ PASS |
| S-05 | Back-relations trên `PlacementCase`, `LaborProfile`, `JobOpening`, `ClientCompany`, `Project`, `CandidateSubmission`, `ProjectAssignment` | ✅ PASS |
| S-06 | `prisma validate` PASS, `prisma generate` PASS | ✅ PASS |

### 2.3 Migration (Slice A)

| ID | Item | Status |
|---|---|---|
| M-01 | ADD-only: không DROP/RENAME/ALTER data | ✅ PASS |
| M-02 | Enums CREATE TYPE — `ServiceModel`, `PlacementStatus` | ✅ PASS |
| M-03 | ADD COLUMN `service_model` (nullable), `placement_id` (nullable FK) | ✅ PASS |
| M-04 | CREATE TABLE `placements` với FK chain đúng (placement_case_id/labor_profile_id FK RESTRICT; job_opening_id/client_company_id/project_id/source_candidate_submission_id FK SET NULL) | ✅ PASS |
| M-05 | **Unique partial index `placements_active_unique`** với COALESCE để enforce cả NULL | ✅ PASS (DEC-04a) |
| M-06 | **ENABLE + FORCE ROW LEVEL SECURITY** + **CREATE POLICY** (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`, `TO app_user_writer, app_user`) | ✅ PASS (DEC-14) |
| M-07 | **GRANT SELECT/INSERT/UPDATE/DELETE** ON placements TO app_user_writer | ✅ PASS (DEC-14) |
| M-08 | Indexes supporting query patterns (placement_case_id, labor_profile_id, job_opening_id, client_company_id, project_id, status+selected_at, source_candidate_submission_id, project_assignments.placement_id, job_openings.service_model) | ✅ PASS |

### 2.4 Pure state machine (Slice A)

| ID | Item | Status |
|---|---|---|
| L-01 | `computeManagementMode` đúng mapping DEC-02 | ✅ PASS |
| L-02 | `canTransition` reject HRP EFFECTIVE (DEC-07) | ✅ PASS |
| L-03 | `canTransition` reject EFFECTIVE revert (DEC-05 terminal) | ✅ PASS |
| L-04 | `canTransition` reject FAILED/CANCELLED revert (DEC-05 terminal) | ✅ PASS |
| L-05 | Idempotent same-state → ok | ✅ PASS |
| L-06 | 23 unit tests PASS | ✅ PASS |

### 2.5 Service layer (Slice B)

| ID | Item | Status |
|---|---|---|
| SV-01 | `createPlacement` SAVEPOINT/ROLLBACK TO pattern cho P2002 (DEC-04a) | ✅ PASS |
| SV-02 | `createPlacement` resolve `clientCompanyId` qua FK chain (DEC-06) | ✅ PASS |
| SV-03 | `createPlacement` reject JobOpening serviceModel NULL (DEC-10) | ✅ PASS |
| SV-04 | `createPlacement` idempotent replay qua findFirst (DEC-09) | ✅ PASS |
| SV-05 | Transition commands dùng conditional UPDATE `WHERE id = ? AND status = ?` (DEC-12) | ✅ PASS |
| SV-06 | `markPlacementEffective` reject HRP-managed (DEC-07) | ✅ PASS |
| SV-07 | `markPlacementEffective` yêu cầu evidence cho client-managed (DEC-08) | ✅ PASS |
| SV-08 | Idempotent same-state no-op cho transitions (DEC-09) | ✅ PASS |
| SV-09 | 14 unit tests PASS (mock Prisma) | ✅ PASS |

### 2.6 Resolution (Slice B)

| ID | Item | Status |
|---|---|---|
| R-01 | `assertClassifiedJobOpening` reject khi serviceModel NULL | ✅ PASS |
| R-02 | `assertClassifiedJobOpening` reject khi staffingOrderId NULL | ✅ PASS |
| R-03 | `resolveClientCompanyIdForJobOpening` chain happy path | ✅ PASS |
| R-04 | `resolveClientCompanyIdForJobOpening` chain broken reject (5 cases) | ✅ PASS |
| R-05 | 10 unit tests PASS | ✅ PASS |

### 2.7 Errors (Slice B)

| ID | Item | Status |
|---|---|---|
| E-01 | `PlacementValidationError` cho validation/contract lỗi | ✅ PASS |
| E-02 | `InvalidStateTransitionError` cho transition không hợp lệ | ✅ PASS |
| E-03 | `PlacementNotFoundError` cho SELECT không thấy | ✅ PASS |
| E-04 | `PlacementIdempotencyConflictError` cho P2002 path | ✅ PASS |
| E-05 | Tất cả errors có `code` field cho caller | ✅ PASS |

### 2.8 Forbidden paths (AC-13)

| ID | Item | Status |
|---|---|---|
| F-01 | KHÔNG sửa `src/domains/talent/intake-writer.service.ts` (theo chốt Tier 0) | ✅ PASS (chưa có edit) |
| F-02 | KHÔNG sửa `src/domains/staffing/` (MP-3C giữ nguyên) | ✅ PASS |
| F-03 | KHÔNG tạo Worker/EmploymentEpisode | ✅ PASS (out of N3 scope) |
| F-04 | KHÔNG tạo route HTTP mới | ✅ PASS |
| F-05 | KHÔNG apply migration lên `hrp-live` | ✅ PASS |

### 2.9 Test discipline (AC-15, AC-16)

| ID | Item | Status |
|---|---|---|
| T-01 | typecheck 2 errors pre-existing (taxonomy-unit + reconciliation-unit), 0 N3-introduced | ✅ PASS |
| T-02 | Full unit suite không regress — Talent lane 9 files / 103 tests PASS (47 N3 + 56 pre-existing) | ✅ PASS cho Talent lane |
| T-03 | Full unit suite 132 files sẽ chạy trước push | ⏳ Pending push |

### 2.10 DB integration (Slice C — DEC-13)

| ID | Item | Status |
|---|---|---|
| I-01 | `tests/db/placement-lifecycle-integration.test.ts` viết đầy đủ 8 case + ENV_BLOCKED honest report | ✅ PASS (code review) |
| I-02 | `vitest.integration-files.ts` whitelist entry | ✅ PASS |
| I-03 | DB integration test chạy trên `DATABASE_URL_TEST` — PASS trên nhánh thử nghiệm | ⏳ **ENV_BLOCKED** — không có `DATABASE_URL_TEST` trong môi trường Tier 1 |
| I-04 | RLS verify bằng `SET LOCAL ROLE app_user_writer` (case vii + viii) | ⏳ Cùng ENV_BLOCKED với I-03 |

## 3. Outstanding for verdict

- **I-03 + I-04**: cần `DATABASE_URL_TEST` từ Tier 0/Owner. Sau khi 8 DB integration cases PASS trên nhánh thử nghiệm (`hrp_mp2_test` hoặc tương đương), Tier 3 xem lại đúng diff cuối + chốt verdict (PASS / CONDITIONAL / BLOCKED).
- **T-03**: Tier 1 chạy full unit suite 132 files trước push branch — kiểm tra không regress toàn hệ thống (N3 chỉ thêm file mới, không sửa code khác).

## 4. Recommendation

- Tier 1 push branch `tier1/n3-service-model-placement` lên origin để Tier 0/Owner review.
- Tier 1 KHÔNG tự merge main, KHÔNG tự apply migration lên `hrp-live`.
- Tier 0/Owner cung cấp `DATABASE_URL_TEST` → Tier 1 chạy 8 DB integration cases → Tier 3 final verdict.
- N1 production rebuild + admin intake smoke vẫn MỞ độc lập (AC-20).

## 5. Audit round history

| Round | Date | Verdict | Note |
|---|---|---|---|
| 1 | 2026-09-14 21:35 | `PENDING_FINAL_DIFF` | Slice A + Slice B PASS; Slice C DB integration ENV_BLOCKED. Tier 0/Owner cung cấp DB test để chốt final. |
