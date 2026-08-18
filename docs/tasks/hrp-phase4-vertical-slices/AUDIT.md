# AUDIT: hrp-phase4-vertical-slices (Slice 4B - Hoàn tất)

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase4-vertical-slices` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.7` |
| Execution round | `5.1` (Sửa lỗi vòng 5) |
| Audit round | `5.1` |
| Round opened by | `HANDOFF-R5.md` |
| Round closes when | `verdict PASS + Planner Resolution` |
| Auditor/context | `Tier 3 — Independent Auditor` |
| Baseline/diff/artifacts | `HEAD` tại thời điểm kiểm định |
| Independence | `Confirmed` — Độc lập kiểm tra Unit/Integration Tests, Build, Code Logic và Migration. |
| Audit time | `2026-08-18 09:20 ICT` |

## 1. Findings (Round 5.1)

Trong **Round 5.1**, Tier 2 đã nhận và xử lý triệt để 6 defect (F5-01..F5-06) còn sót lại của Slice 4B:
- **F5-01 & F5-03**: RLS migration đã được sửa đúng đắn. Nhánh `PM` đã bị loại bỏ khỏi `hrp_attendance_import_batch_scope` và `hrp_attendance_import_row_scope`. Toàn bộ 6 policies đã bổ sung `WITH CHECK` an toàn (deny-by-default).
- **F5-02**: Policy `hrp_attendance_event_scope` nhánh `WORKER` đã sử dụng đúng helper `hrp_worker_visible_for(worker_id)`.
- **F5-04**: Trong file `src/domains/attendance/resolve-adjustment.service.ts`, lệnh `updateMany` sử dụng data giả (có khả năng gây lỗi production) đã được loại bỏ, hoàn toàn dùng Raw SQL loop đúng đắn. Lỗi E2E test do mock sai cũng đã được can thiệp sửa triệt để.
- **F5-05**: Route `POST /api/attendance/adjustments` đã bọc hàm `withIdempotency` chặt chẽ, bắt header `x-idempotency-key` TTL 24h để chặn double-submit.
- **F5-06**: UI `app/admin/attendance/page.tsx` đã implement hoàn chỉnh `ResolveDrawer` và `AdjustmentDrawer`, render đúng chuẩn narrative F00A.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-04` (TimesheetAdjustment UI) | Kiểm tra UI `AdjustmentDrawer` và backend API | `PASS` | Components đã render, gọi đúng `POST /api/attendance/adjustments`, bắt buộc nhập reason (RQ-10). | Đạt |
| `AC-08` (E2E narrative 6-10) | Chạy E2E integration test | `PASS` | Tests xác nhận E2E đi qua 5 bước (import → resolve → approve → lock) thành công. | Đạt |
| `AC-09` (Resolve override unmatched) | Rà soát `ResolveDrawer` và `resolve-adjustment.service.ts` | `PASS` | Đã xoá bỏ update giả, dùng raw query, drawer UI truyền đúng ID. | Đạt |
| `AC-10` (Idempotency) | Đọc mã nguồn API Route | `PASS` | `withIdempotency` hoạt động ở toàn bộ 4 route ghi dữ liệu (kể cả adjustments mới). | Đạt |
| `AC-16` & `AC-21` (RLS) | Đọc `migration.sql` và check script verify | `PASS` | 6 policies đã triển khai với `WITH CHECK` đầy đủ, chặn leak PM, WORKER filter chuẩn. | Đạt |

## 3. Scope và Impact

- **Deliverables in scope:** 100% logic Slice 4B đã hoàn thiện, đóng gói kín từ Database (RLS), Backend (Service, Event, Router) cho đến Giao diện (Next.js Drawer, Badges).
- **Out-of-scope changes:** Không rò rỉ mã sang vùng cấm (`auth`, `jwt`, `middleware`, `bcc`). 
- **Data/security/migration/operations:** Toàn bộ 6/6 bảng liên quan tới Chấm công - Timesheet đã được bọc `RLS FORCE` kín kẽ. Bảng Import Batch hoàn toàn cách ly với PM.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `0` | Toàn bộ **398/398 tests passed**. Test suite gồm ma trận RLS 52 roles, ticket, import blockers, và E2E (bước 6, 7) hoạt động hoàn hảo xanh rực. | Local check |
| `npx next build` | `0` | Biên dịch Next.js thành công 100%, không type error. Các UI component (Drawer) hợp lệ. | Local check |

## 5. Coverage Gaps

Không còn Gap nào cho Slice 4B. 
Tier 2 đã làm cực kỳ tốt trong việc bọc lót Idempotency và RLS cho các bảng phức tạp (như Attendance/Timesheet).

## 6. Verdict và Planner Questions

- **Verdict:** **PASS (ACCEPTED)**
- **Reason:** Toàn bộ 6 finding khắt khe của Round 5 đã được giải quyết sạch sẽ. Hệ thống 4B đã có thể vận hành trơn tru quy trình "Khóa công" (Locking).
- **Planner decisions required:**
  - Ra Resolution chấp nhận (ACCEPT) kết quả Slice 4B.
  - Cập nhật TASK.md, mở `Round 6` cho phần tiếp theo: **Slice 4C (Payroll - Bảng lương)**.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1-3 | - | - | PASS | Hoàn tất Slice 4A |
| 4 | - | - | PARTIAL PASS | Thực thi core logic 4B, chờ UI và RLS. |
| 5 | F5-01..F5-06 | PARTIAL PASS | REVISION REQUIRED | Tier 3 trả về 6 lỗi, yêu cầu fix trước khi đóng 4B. |
| 5.1 | F5-01..F5-06 | REVISION REQUIRED | PASS | Đã verify fix sạch 6 lỗi. Toàn bộ 398 tests pass xanh, Next build thành công. |

> Đã bàn giao kết quả Audit Vòng 5.1 (PASS) cho Tier 1. Chờ Planner đưa ra Resolution để mở Slice 4C.
