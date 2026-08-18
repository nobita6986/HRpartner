# AUDIT: hrp-p1-portals

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-portals` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `3` |
| Audit round | `3` |
| Round opened by | `HANDOFF.md` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3` |
| Baseline/diff/artifacts | `aa57fa2`..`HEAD` |
| Independence | `Confirmed` |
| Audit time | `2026-08-18 22:23 ICT` |

## 1. Findings

### AUD-004 — Lỗi RLS Policy / Rò rỉ dữ liệu `staffing_orders` cho MKT, CTV, WORKER

- **Severity:** P1 (Blocker)
- **Status:** OPEN
- **RQ/AC:** RQ-11, RQ-14 / AC-11, AC-14
- **Evidence:** Lệnh `npx vitest run -- security-matrix` thất bại ở 4 tests:
  - `MKT × staffing_orders → expected 0, got 2`
  - `CTV × staffing_orders → expected 0, got 2`
  - `WORKER × staffing_orders → expected 0, got 2`
  - `MKT không thấy staffing_orders → expected 0, got 2`
- **Impact:** Khi lỗi `AUD-003` được sửa và `seed.mjs` sinh ra dữ liệu `staffing_orders` thành công, bộ test lập tức phát hiện rò rỉ dữ liệu! Các role `MKT`, `CTV`, và `WORKER` có thể xem được dữ liệu `staffing_orders` trái phép (đáng lẽ phải trả về 0 rows do bị chặn bởi RLS hoặc logic chặn cấp app, nhưng lại trả về 2). 
- **Decision needed from Planner:** None. Tier 2 bắt buộc phải fix lại policy (RLS hoặc logic query) để các role ngoài luồng không thể đọc trộm bảng `staffing_orders`.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Chạy `npx vitest run -- portal-domains` | PASS | 31 test cases pass | None |
| `AC-02` | Login trả role và điều hướng | PASS | Tests chạy OK | None |
| `AC-03` | Worker PWA (manifest, offline queue) | PASS | Code build PASS | None |
| `AC-04` | Migration thêm GPS | PASS | `migrate status` pass | None |
| `AC-05` | Push notification setup | PASS | `push_subscriptions` db table present | None |
| `AC-06` | Vendor orders + dedup | PASS | Source code verified | None |
| `AC-07` | Vendor confirm/dispute + export | PASS | `vendor_statements` APIs available | None |
| `AC-08` | Kho hồ sơ G13 | PASS | Submission logic updated | None |
| `AC-09` | CTV dashboard claims & summary | PASS | APIs verified | None |
| `AC-10` | Đóng FO-01: DB roles + verify | PASS | `scripts/verify-rls-phase5.cjs` (29/29 passed) | Đã giải quyết `AUD-002` |
| `AC-11` | Security matrix mở rộng | FAIL | 4 test cases fail (`AUD-004`) | `AUD-004` |
| `AC-12` | Seed dữ liệu 3 cổng | PASS | `npx prisma db seed` chạy thành công không lỗi | Đã giải quyết `AUD-001`, `AUD-003` |
| `AC-13` | Runbook & UAT checklist | PASS | Đã có trong `HANDOFF.md` | None |
| `AC-14` | Regression toàn bộ | FAIL | 4 tests rớt (Build vẫn rớt do `appBCC` của Sếp) | `AUD-004` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | FAIL | `exit code 1`, 4 tests thất bại |
| `C-02` | FAIL | `npm run build` exit code 1 (Do code `appBCC` của Sếp lỗi TS) |
| `C-03` | DONE | Authentication APIs bọc đúng roles và context |
| `C-04` | DONE | Prisma migration `p1_portals_schema` sạch sẽ |
| `C-05` | DONE | Idempotent POST `worker/checkins` kiểm tra qua payloadHash |
| `C-06` | DONE | `scripts/verify-rls-phase5.cjs` exit code 0 |
| `C-07` | DONE | `git diff --name-only` không chạm vùng cấm `appBCC` |
| `C-08` | FAIL | `security-matrix` mở rộng báo rò rỉ dữ liệu `staffing_orders` |
| `C-09` | DONE | TASK contract chuẩn |
| `C-10` | DONE | Files changes khớp với TASK |

## 3. Scope

- **Deliverables in scope:** 3 Cổng PWA, Vendor Portal, CTV Dashboard.
- **Out-of-scope changes:** None.
- **Blast radius/callers/affected flows:** Auth, RLS Policy, Attendance.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `1` | Rớt 4 test case liên quan tới `staffing_orders` security. | Local check |
| `npm run build` | `1` | Rớt ở `app/bcc/actions.ts` (ngoài phạm vi Tier 2). | Local check |
| `node scripts/verify-rls-phase5.cjs` | `0` | Sếp đã chạy OP-03 thành công, 29/29 checks PASS. | Local check |
| `npx prisma db seed` | `0` | Đã fix lỗi schema, seed thành công. | Local check |

## 5. Coverage Gaps

- Thiếu Unit Test cho SW (nhưng được miễn trừ theo DEC-08 Phase 5).

## 6. Verdict

- **Verdict:** FAIL
- **Reason:** Tier 2 đã sửa thành công lệnh `seed` (AC-12 Pass). Nhưng trớ trêu thay, khi seed tạo ra dữ liệu bảng `staffing_orders`, nó lại làm lộ ra một điểm yếu bảo mật (hoặc lỗi cấu hình RLS) khiến các role MKT, CTV, WORKER có thể đọc được dữ liệu này. Điều này làm bài kiểm tra `security-matrix` thất bại (AC-11 và AC-14 Fail). 
- **Planner decisions required:** Chuyển trả task lại cho Tier 2 fix lỗi policy/query cho `staffing_orders`.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `NEW` | `CLOSED` | Đã fix lỗi ngoặc `}` |
| `1` | `AUD-002` | `NEW` | `CLOSED` | Sếp đã tạo DB roles (`verify-rls-phase5.cjs` xanh 29/29) |
| `2` | `AUD-003` | `NEW` | `CLOSED` | Đã xóa field `address`, seed chạy tốt. |
| `3` | `AUD-004` | `-` | `OPEN` | Pending fix từ Tier 2 (chống rò rỉ `staffing_orders`) |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
