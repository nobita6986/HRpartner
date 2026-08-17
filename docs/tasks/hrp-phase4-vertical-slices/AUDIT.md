# AUDIT: hrp-phase4-vertical-slices (Slice 4B - Round 4)

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase4-vertical-slices` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.5` |
| Execution round | `4` (Slice 4B - Attendance Lock) |
| Audit round | `4` |
| Round opened by | `HANDOFF-R4.md` |
| Round closes when | `verdict CONDITIONAL + Planner Resolution` |
| Auditor/context | `Tier 3 — Independent Auditor` |
| Baseline/diff/artifacts | `HEAD` tại thời điểm kiểm định |
| Independence | `Confirmed` — Độc lập kiểm tra Unit Tests, Integration Tests, Build và Git Diff. |
| Audit time | `2026-08-17 15:20 ICT` |

## 1. Findings

Trong **Round 4 (Slice 4B)**, Tier 2 đã hiện thực hoá một lượng lớn logic phức tạp liên quan đến Chấm công:
- **STEP-08 (Import)**: Xây dựng service parse và validate file chấm công, phân loại taxonomy 6 lỗi (G29) chính xác cho KT/HR/PM.
- **STEP-09 (Commit Import)**: Bổ sung rule chặn 3 blocker (UNMATCHED_EMPLOYEE, SOURCE_CONFLICT, WRONG_PROJECT) trước khi commit data, sử dụng `UNIQUE(source, external_event_id)` để đạt tính idempotent an toàn.
- **STEP-10 (Timesheet SM)**: State Machine PENDING → REVIEWED → APPROVED → LOCKED với quy tắc `maker ≠ checker`.
- **STEP-11 (API & UI)**: Đã tạo các route backend đầy đủ và render UI `app/admin/attendance` (chia tab Import, Kỳ công, Ngoại lệ).
- **STEP-12 (Tests)**: Cung cấp 12 test ma trận quyền và 6 test E2E mô phỏng F00A.

Tuy nhiên, Tier 2 đã **DEFERRED (hoãn)** một số tính năng bắt buộc của Slice 4B:
- Giao diện và API xử lý Resolve Override (nhân sự chưa khớp) và `TimesheetAdjustment` (drawer ngoại lệ) thuộc RQ-10.
- RLS policy cho cụm bảng attendance/timesheet chưa được sinh ra.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-03` | Rà soát `import-commit.service.ts` và test chạy `npm run test` | `PASS` | Tests xác nhận 3 blockers chặn commit đúng, re-import cùng data không sinh thêm record trùng lặp (idempotent DB level). | None |
| `AC-04` | Kiểm tra UI/Backend code và Unit test | `PARTIAL` | Maker-checker check hoạt động tốt. Tuy nhiên `TimesheetAdjustment` drawer chưa có code xử lý, bị defer sang round sau. | Cần bổ sung trong Round 5 |
| `AC-10` | Đọc mã nguồn API Route | `PASS` | Đã bọc `withIdempotency` ở route và `enqueueOutbox` events chính xác. | None |
| `AC-16` | Git Diff --name-only | `PASS` | Lõi hệ thống (`app/bcc`, `jwt.ts`, `middleware.ts`) không bị rò rỉ mã. | None |

## 3. Scope và Impact

- **Deliverables in scope:** Hệ thống chấm công với lượng validation logic cực lớn được xây dựng chắc chắn. Phân cấp 6 lỗi (anomaly) và blocker đã chạy đúng như thiết kế G29 và D07.
- **Out-of-scope changes:** Không rò rỉ mã sang vùng cấm. 
- **Data/security/migration/operations:** Dữ liệu an toàn. Chức năng import file đang thiết kế nhận CSV buffer mà chưa tích hợp client-side drag&drop (chờ hoàn thiện sau, hợp lý với MVP backend first).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `0` | Toàn bộ 385/385 tests passed. Các test case ma trận phân quyền 4-role (Attendance) và E2E pass xanh 100%. | Local check |
| `npx next build` | `0` | Hệ thống build NextJS biên dịch UI trang `/admin/attendance` và các Route API liên đới thành công (exit 0). | Local check |
| `git status` | `clean` | Tree clean, chứng tỏ mọi code đợt này không còn dư âm thay đổi dở dang, vùng cấm an toàn tuyệt đối. | Local check |

## 5. Coverage Gaps

Mặc dù khối lượng công việc là rất ấn tượng, Slice 4B chưa thể đóng hoàn toàn do Tier 2 chưa xử lý tính năng Resolve drawer ngoại lệ (`TimesheetAdjustment`) và file upload drag-drop trọn vẹn, cộng thêm RLS policies chưa có file SQL migration. 

## 6. Verdict và Planner Questions

- **Verdict:** `CONDITIONAL` (hoặc `PARTIAL PASS`).
- **Reason:** Core logic của Slice 4B (State Machine, Blockers, CSV Parsing) đã hoàn thiện và bao phủ bằng test rất vững. Tuy nhiên, Slice này đang bị hụt phần Resolve UI/API (RQ-10) và thiếu RLS.
- **Planner decisions required:**
  - Xác nhận (Resolution) cho phép Tier 2 thi công tiếp phần "DEFERRED" của Slice 4B (Adjustment drawer, Resolve override, RLS policy) thông qua lệnh `/code hrp-phase4-vertical-slices` vòng tiếp theo (Round 5).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1-3 | - | - | PASS | Hoàn tất Slice 4A |
| 4 | - | - | PARTIAL PASS | Thực thi xong core logic Slice 4B, chờ phần UI Override và RLS. |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
