# AUDIT: hrp-portal-m11-affiliate-db-migration

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m11-affiliate-db-migration |
| Work/Audit type | CODE_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | Tier 1 (Antigravity) |
| Round closes when | verdict PASS + Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 Independent Auditor |
| Baseline/diff/artifacts | HEAD of main |
| Independence | Confirmed |
| Audit time | 2026-08-20 22:45 TZ |

## 1. Findings

- **AUD-001 (Blocker):** Code API và cấu trúc Prisma Schema (`CtvWithdrawalRequest`) đã được thực thi chính xác (RQ-01, RQ-03). Tuy nhiên, môi trường Neon DB dev hiện tại bị lỗi đồng bộ drift schema (một số migration cũ liên quan `portal_timesheets` chưa chạy hoặc apply lỗi trên shadow DB). Điều này dẫn tới việc `npx prisma migrate dev` thất bại. Vấn đề này thuộc phạm vi Infrastructure, không phải lỗi logic của M11.
- **API refactor:** API tại `app/api/ctv/withdrawals/route.ts` đã được đập bỏ việc dùng File System (JSON) và thay thế bằng Prisma Client truy xuất DB. Các kiểu BigInt được convert hợp lệ sang string để response JSON không bị crash.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Kiểm tra Model Prisma và chạy `npx prisma validate`. | PASS | Model `CtvWithdrawalRequest` hợp lệ, generate Prisma Client thành công. | Chặn bởi lỗi DB Neon khi migrate thật (BLK-01). |
| `AC-02` | Test API Route. | BLOCKED | API Route không thể tương tác DB vì schema public bị lỗi Permission/Chưa apply table. | N/A |
| `AC-03` | npm run build | PASS | Exit 0. | N/A |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | Lỗi Security Matrix cũ, không liên quan M11. |
| `C-02` | DONE | npm run build exit 0. |
| `C-03` | DONE | Prisma Generate chạy ngon (Client nhận type mới). |
| `C-04` | SKIP | |
| `C-05` | DONE | API JSON cấu trúc đúng chuẩn. Serialize BigInt tốt. |
| `C-06` | DONE | API vẫn bảo vệ bằng context role CTV. |
| `C-07` | SKIP | Không thay đổi giao diện. |
| `C-08` | DONE | Validation Amount (BigInt) có xử lý try-catch. |
| `C-09` | DONE | Không sập server, build pass. |
| `C-10` | DONE | API bám sát định nghĩa của Model. |

## 3. Scope và Impact

- **Deliverables in scope:** `prisma/schema.prisma`, `app/api/ctv/withdrawals/route.ts`.
- **Out-of-scope changes:** Không.
- **Blast radius:** Lỗi DB drift làm ảnh hưởng cục bộ tới tính năng rút tiền của CTV, không sập các phân hệ khác (Admin, Worker).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| npm run build | 0 | Compiled successfully | stdout |

## 5. Coverage Gaps

- Việc chưa thể áp dụng migration lên CSDL thật khiến tính năng không thể hoạt động tại runtime.

## 6. Verdict và Planner Questions

- **Verdict:** READY_WITH_BLOCKER
- **Reason:** Phần việc Code & Schema (thuộc scope Tier 2 M11) đã hoàn thành xuất sắc. Nhóm Blockers hiện tại là rủi ro ở môi trường Neon DB.
- **Planner decisions required:**
  - Em khuyến nghị mở **Option A** (Tạo task infra `hrp-m11.1-db-baseline`) để đồng bộ và dọn dẹp sạch sẽ DB state (bao gồm fix lỗi permission và shadow db) một cách quy củ, sau đó mới chạy lệnh migrate của M11. Đây là cách làm an toàn và chuyên nghiệp nhất cho dự án ERP.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | N/A | N/A | N/A | N/A |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner quyết định hướng xử lý DB.
