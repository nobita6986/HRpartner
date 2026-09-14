# Stage 0 — Contract (Evidence)

**Status**: DRAFT v0.3 — Tier 0 chốt GO Slice A lúc 21:00 ngày 2026-09-14; Tier 1 chạy thẳng A→B→C qua gate từng slice.

## Tier 0 chốt theo thứ tự thời gian

### Chốt 17:15–20:53 (v0.1 → v0.2)

1. WorkClassification độc lập với ServiceModel.
2. Placement mới phải gắn JobOpening có ServiceModel xác định; resolve `clientCompanyId` qua `JobOpening → StaffingOrder → Project → ClientCompany`. Cột nullable cho legacy, bản ghi mới không được thiếu công ty.
3. Intake N1 không tự tạo Placement; SELECTED do command nghiệp vụ riêng.

### Chốt 21:00 (v0.2 → v0.3)

4. **Một PlacementCase thuộc một LaborProfile.** Nhiều Placement trong cùng case = retry lịch sử của cùng người; KHÔNG có ứng viên khác trong cùng case. Ứng viên khác → mở case mới.
5. **DB-level anti-race bằng unique partial index** `(placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')`. Retry cùng idempotency key trong khi SELECTED/CONFIRMED trả kết quả cũ (P2002 path → command layer trả placement hiện tại); sau FAILED/CANCELLED, request mới tạo Placement mới (index giải phóng slot).
6. **RLS + GRANT phải đi trong Slice A**, không để cuối. Bảng `placements` được tạo kèm `ENABLE + FORCE ROW LEVEL SECURITY` + policy theo pattern N1 (`hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')`, `TO app_user_writer, app_user`) + `GRANT SELECT/INSERT/UPDATE/DELETE ON placements TO app_user_writer` (đúng tên role trong codebase hiện có — `app_user_writer` là write role, `app_user` là read-only role). Verify trên DB integration bằng `SET LOCAL ROLE app_user_writer`.
7. **`ENV_BLOCKED` ≠ PASS**. Trước khi xét merge/deploy N3, DB integration test phải PASS trên nhánh thử nghiệm + Tier 3 LIGHT audit phải chấp nhận đúng diff cuối.
8. Tier 1 push branch để review; KHÔNG tự merge main; KHÔNG tự apply migration production.
9. Tier 1 chạy thẳng A→B→C qua gate, không cần xin GO giữa slice.

## TASK v0.3 changes vs v0.2

| Change | From (v0.2) | To (v0.3) | Why |
|---|---|---|---|
| PlacementCase scope | "candidate A fail → chọn candidate B cho cùng case" (ví dụ sai) | Một case thuộc một LaborProfile; nhiều Placement = retry của cùng người; ứng viên khác mở case mới (DEC-04) | Tier 0 chốt #4 — N1 invariant `placement_cases.labor_profile_id` |
| Anti-race | "Schema không enforce unique (case, person, opening); idempotency ở command layer" | Unique partial index `(placement_case_id, job_opening_id) WHERE status IN ('SELECTED','CONFIRMED')`; retry cùng key trong SELECTED/CONFIRMED trả placement hiện tại (P2002 → bắt → trả); retry sau FAILED/CANCELLED tạo Placement mới (DEC-04a + DEC-09) | Tier 0 chốt #5 — DB-level invariant, không read-modify-write |
| RLS trong Slice A | "RLS: Placement cùng policy pattern với PlacementCase" (mơ hồ, để cuối) | Slice A chứa `CREATE POLICY` + `ALTER TABLE … ENABLE/FORCE ROW LEVEL SECURITY` + `GRANT … TO app_runtime`; verify trong DB integration bằng `SET LOCAL ROLE app_runtime` (DEC-14, AC-17a, RQ-14) | Tier 0 chốt #6 — không để cuối |
| ENV_BLOCKED meaning | "ENV_BLOCKED nếu chưa có DB test" (mơ hồ — coi như có thể PASS) | `ENV_BLOCKED` là báo cáo trung thực, KHÔNG đủ điều kiện merge/deploy. Trước khi xét merge/deploy, DB integration phải PASS + Tier 3 LIGHT audit PASS (DEC-13, AC-17) | Tier 0 chốt #7 |
| Tier 1 authority | "Push branch; Tier 1 KHÔNG merge main" | Push branch; Tier 1 KHÔNG tự merge main; KHÔNG tự apply migration production; Tier 1 chạy thẳng A→B→C qua gate, không cần xin GO giữa slice | Tier 0 chốt #8 + #9 |
| AC | 20 | 22 (thêm AC-04a unique partial index + AC-17a RLS/GRANT verify) | Tier 0 chốt #5 + #6 |
| Risk | 9 | 10 (thêm RISK-08 unique index thiếu + RISK-09 RLS leak; RISK-03 update ENV_BLOCKED ≠ PASS) | Tier 0 chốt #5 + #6 + #7 |
| Q-04 | open | **RESOLVED 2026-09-14 21:00** — case thuộc một người; retry cùng người; unique partial index | Tier 0 chốt #4 + #5 |

## Verbatim Tier 0 quote

> "Một PlacementCase thuộc một LaborProfile; bỏ ví dụ 'candidate khác trong cùng case'. Một case có thể có nhiều lần thử Placement của cùng người."

> "Chống race ở DB bằng unique index cho (placement_case_id, job_opening_id) khi Placement còn SELECTED hoặc CONFIRMED. Retry cùng idempotency key trả kết quả cũ; sau FAILED/CANCELLED, request mới được tạo lần thử mới. Sửa DEC-04, DEC-09 và B-04 theo cùng quy tắc."

> "Slice A phải xác định cả RLS/policy và quyền truy cập của runtime role cho bảng mới; không để bảng được tạo rồi mới xử lý ranh giới này ở Slice C."

> "ENV_BLOCKED là báo cáo trung thực, không phải điều kiện PASS để merge hoặc deploy N3. Trước khi xét đưa migration lên hrp-live, DB integration trên nhánh thử nghiệm phải PASS và Tier 3 LIGHT audit phải chấp nhận đúng diff cuối."

## Next steps (Tier 1 đang chạy)

- Slice A: schema + migration (kèm RLS + GRANT + unique partial index) + pure lifecycle + tests.
- Slice B: service layer + idempotency + anti-race + HRP-vs-client guard + tests mock Prisma.
- Slice C: DB integration test trên `DATABASE_URL_TEST` + HANDOFF + AUDIT + push branch `tier1/n3-service-model-placement`.
- Tier 1 KHÔNG merge main; KHÔNG apply migration production.
