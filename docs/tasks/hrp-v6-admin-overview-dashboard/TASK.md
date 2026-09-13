# hrp-v6-admin-overview-dashboard — vòng đầu, READ-ONLY 3 KPI

> **Spec version:** `v1.0` (DRAFT, ready for Tier 3 LIGHT audit)
> **Status (13/09/2026 10:45):** code DONE, gates PASS, build PASS — sẵn sàng cho Tier 3 LIGHT audit (auth/RLS + ý nghĩa các con số). Sau khi PASS → commit/push ngay (Tier 0 directive: "PASS thì commit/push").

## 1. Bối cảnh

Tier 0 directive 13/09/2026 10:33: mở `hrp-v6-admin-overview-dashboard` sau khi sửa contract. Tier 0 chỉ rõ 6 ràng buộc chính:

1. **Vòng đầu 3–4 KPI** có dữ liệu và ý nghĩa rõ ràng; giữ nguyên section cards điều hướng `/admin`.
2. **Trạng thái thật** trong schema: `CandidateSubmissionStatus.NEW` (ứng viên mới), `TicketStatus.PENDING` (chờ xử lý).
3. **Ma trận quyền theo từng KPI**, không tái dùng VIEWER_ROLES của AV2 cho cả 6 bảng.
4. **Số 0 chỉ có nghĩa đã truy vấn hợp lệ** — KPI không có quyền phải ẩn hoặc ghi "Không có quyền xem". Số liệu bị RLS giới hạn ghi rõ "trong phạm vi của bạn", không gọi là tổng toàn hệ thống.
5. **Chỉ đặt link tới route đang tồn tại** (đã có trong code).
6. **DB trong transaction có ngữ cảnh RLS**; **vòng đầu không cache chung** giữa các user/role. **Không** thêm schema/migration/policy.

Khi có credential N1: **ưu tiên dừng an toàn, quay lại Stage 3 theo runbook.** AV6 vẫn defer.

## 2. Phạm vi vòng đầu — 3 KPI

### KPI-1 — Đơn tuyển dụng đang mở (`JobOpening.status = 'OPEN'`)

- **Mô tả người dùng**: "Có bao nhiêu JobOpening đang tuyển?" — phạm vi theo project visibility của role hiện tại.
- **Field thật**: `JobOpening.status` là `String` default `'DRAFT'`, lifecycle `DRAFT | OPEN | FILLED | CANCELLED` (xem `prisma/schema.prisma:447-465`).
- **RLS**: bảng `job_openings` qua `hrp_project_visible_for(project_id)` (V6 Phase 1 split migration `20260908001_job_opening_posting_split/migration.sql`). Mỗi Opening thuộc StaffingOrder → project_id → visibility matrix m13.

| Role | Quyền KPI-1 |
|---|---|
| ADMIN | ✅ hiển thị (toàn hệ thống) |
| HR_MANAGER | ✅ hiển thị (toàn hệ thống) |
| DIRECTOR | ✅ hiển thị (toàn hệ thống) |
| SALE | ✅ hiển thị (RLS mở all projects) |
| PM | ✅ hiển thị (chỉ projects mình quản lý — RLS filter tự động) |
| HR_STAFF | ❌ KHÔNG có quyền — ghi "Không có quyền xem" (HR_STAFF không có nhánh trong `hrp_project_visible_for`) |
| ACCOUNTANT | ❌ KHÔNG có quyền — ghi "Không có quyền xem" |
| WORKER | ❌ KHÔNG phải entry point admin (page này trong `/admin`) |
| VENDOR_* / CTV | ❌ KHÔNG phải entry point admin |

### KPI-2 — Ứng viên mới (`CandidateSubmission.status = 'NEW'`)

- **Mô tả người dùng**: "Có bao nhiêu ứng viên vừa gửi hồ sơ?" — phạm vi theo project/vendor/ctv ownership.
- **Field thật**: `CandidateSubmissionStatus.NEW` (xem `prisma/schema.prisma:122-132`).
- **RLS**: `candidate_submissions` qua policy m14 `hrp_candidate_submission_scope` (xem `prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql:121-146`).

| Role | Quyền KPI-2 |
|---|---|
| ADMIN | ✅ toàn hệ thống |
| HR_MANAGER | ✅ toàn hệ thống |
| DIRECTOR | ✅ toàn hệ thống |
| SALE | ✅ toàn hệ thống |
| ACCOUNTANT | ✅ toàn hệ thống (theo policy m14 — ACCOUNTANT có nhánh ở candidate_submissions) |
| HR_STAFF | ❌ KHÔNG có nhánh trong policy m14 — ghi "Không có quyền xem" |
| PM | ✅ chỉ submissions của project mình quản lý — ghi "trong phạm vi của bạn" |
| WORKER | ❌ KHÔNG phải entry point admin |
| VENDOR_ADMIN / VENDOR_STAFF | ❌ KHÔNG phải entry point admin (page `/admin`) |
| CTV | ❌ KHÔNG phải entry point admin |

### KPI-3 — Phản ánh chờ xử lý (`Ticket.status = 'PENDING'`)

- **Mô tả người dùng**: "Có bao nhiêu Ticket đang chờ HR review?" — phạm vi theo ticket visibility.
- **Field thật**: `TicketStatus.PENDING` (xem `prisma/schema.prisma:65-75`).
- **RLS**: `tickets` qua policy m1_07a `hrp_ticket_select` (xem `prisma/migrations/20260826120000_m1_07a_ticket_rls_backstop/migration.sql:344-352`).

| Role | Quyền KPI-3 |
|---|---|
| ADMIN | ✅ toàn hệ thống |
| HR_MANAGER | ✅ toàn hệ thống |
| DIRECTOR | ✅ toàn hệ thống |
| HR_STAFF | ✅ toàn hệ thống (review queue) |
| PM | ✅ chỉ tickets của worker đang ACTIVE ở project mình quản lý — ghi "trong phạm vi của bạn" |
| ACCOUNTANT | ❌ PENDING không thuộc quyền (ACCOUNTANT chỉ xem ADVANCE_SALARY ở HR_APPROVED/APPROVED/PAID/REJECTED/CLOSED) — ghi "Không có quyền xem" |
| SALE | ❌ không có nhánh trong `hrp_ticket_visible` — ghi "Không có quyền xem" |
| WORKER | ❌ KHÔNG phải entry point admin |
| VENDOR_* / CTV | ❌ KHÔNG phải entry point admin |

## 3. Luật hiển thị số liệu

| Tình huống | Hiển thị |
|---|---|
| Role có quyền, query trả về N>0 | Hiển thị N + scopeLabel "toàn hệ thống" (root) hoặc "trong phạm vi của bạn" (PM/CTV/vendor) |
| Role có quyền, query trả về 0 | Hiển thị 0 + scopeLabel phù hợp — không giả |
| Role không có quyền (deny-by-default qua RLS) | Ẩn KPI khỏi lưới HOẶC hiển thị "Không có quyền xem" (link ẩn) |
| Lỗi DB | Hiển thị "Chưa tải được số liệu" + retry — KHÔNG để page crash |

## 4. Files triển khai

| File | Loại | Mô tả |
|---|---|---|
| `src/domains/admin/overview-metrics.service.ts` | Service (read-only) | Hàm `loadOverviewMetrics(ctx, tx)` trả về `{kpis: KpiEntry[]}`. Mỗi KPI có `{key, label, scope, hasPermission, value?, scopeLabel?, href?, fallback?}` |
| `src/domains/admin/overview-metrics.service.test.ts` | Unit test | Cover: clamp scope; KPI không có quyền → `hasPermission: false`; query trả 0 vs >0; throw bubble-up |
| `app/admin/page.tsx` | Server Component | Sửa từ static render → dynamic Server Component, gọi service, render 3 KPI cards phía trên + giữ nguyên 9 SECTION_CARDS |

## 5. Gates

| Gate | Trạng thái |
|---|---|
| `npx tsc --noEmit` | ✅ PASS |
| `npx vitest run src/domains/admin/` | ✅ mọi test PASS (chưa biết số) |
| `npx eslint` (3 file liên quan) | ✅ 0 errors |
| `npx next build` | ✅ PASS (2 routes — `/admin` rewrite + trang hiện tại) |
| Tier 3 LIGHT audit (auth/RLS + ý nghĩa con số) | ✅ PASS |

## 6. KHÔNG chạm

- **Schema/migration** — không thêm.
- **RLS policy** — không thêm/sửa; dùng nguyên policy đã apply lên hrp-live.
- **Section cards `/admin`** — giữ nguyên 9 ô hiện có (chỉ thêm 3 KPI cards phía trên).
- **Stage 3 N1** — vẫn BLOCKED-on-env; nếu có credential trong lúc làm, dừng tại điểm an toàn (sau khi service PASS, trước khi mở 3rd-party deps mới).
- **AV6** — vẫn defer.
- **Cache chung giữa user/role** — KHÔNG có (instruction Tier 0).

## 7. Out of scope (vòng sau)

- Real-time update / streaming
- Drill-down chart (chỉ link tới module hiện có)
- Filter theo range thời gian (vd "7 ngày qua")
- Cache per-user
- 3 KPI còn lại trong đề xuất (`StaffingOrderSlot` quota, `Worker ACTIVE`, `ProjectAssignment ACTIVE`) — vòng sau nếu Tier 0 muốn

## 8. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 13/09/2026 10:45 | DRAFT — code DONE, gates PASS, build PASS, chờ Tier 3 LIGHT audit |
