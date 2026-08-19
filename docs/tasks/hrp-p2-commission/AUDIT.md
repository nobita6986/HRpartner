# AUDIT: hrp-p2-commission

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-p2-commission` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF round mới` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 - Antigravity` |
| Baseline/diff/artifacts | `HEAD của main` |
| Independence | `Confirmed` |
| Audit time | `2026-08-19 09:40 ICT` |

## 1. Findings

### AUD-001 - Thiếu bảo mật Row-Level Security (RLS) cho các bảng Commission

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-01`
- **Evidence:** `prisma/migrations/20260819083254_p2_commission_schema/migration.sql` không chứa từ khóa `ENABLE ROW LEVEL SECURITY`.
- **Impact:** Lỗ hổng bảo mật nghiêm trọng. Mọi queries qua auth context (như app_user_writer) sẽ bypass RLS vì chưa có chính sách RLS cho 3 bảng này, hoặc fail nếu default deny.
- **Decision needed from Planner:** Cần bổ sung migration hoặc script RLS cho `commission_policies`, `commission_ledger`, `commission_debts`.

### AUD-002 - Thiếu enqueueOutbox trong các hành động thay đổi trạng thái

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `C-05`
- **Evidence:** `grep_search enqueueOutbox` trong `src/domains/commission/` không tìm thấy kết quả. Các API route POST/PATCH cho commission chỉ có `withIdempotency` mà không có `enqueueOutbox`.
- **Impact:** Các event thay đổi trạng thái hoa hồng không được bắn ra ngoài hệ thống (Event-driven architecture đứt gãy).
- **Decision needed from Planner:** Bổ sung việc đẩy sự kiện qua `enqueueOutbox` ở các logic thay đổi state của ledger/policy.

### AUD-003 - Test environment database schema desync (125 tests fail)

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `C-01`
- **Evidence:** `npx vitest run` exit code 1. Lỗi `relation "workers" does not exist` ở các module khác (Phase 2 L2 RLS). Do quá trình tạo schema thủ công nhưng không push đủ cho test database.
- **Impact:** CI test pipeline sẽ fail. Golden test của Commission qua 10/10 nhưng hệ thống bị gãy.
- **Decision needed from Planner:** Cần khôi phục / migrate đủ schema trên test DB để pass toàn bộ vitest.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Đọc migration.sql | FAIL | Thiếu RLS | AUD-001 |
| AC-02 | Code review route | PASS | Logic đúng | None |
| AC-03 | Code review | FAIL | Thiếu outbox | AUD-002 |
| AC-04 | Code review | FAIL | Thiếu outbox | AUD-002 |
| AC-05 | npx vitest golden | PASS | Cover netting | None |
| AC-06 | npm run build | PASS | exit 0 | None |

### Mandatory Checks

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | FAIL | exit code 1 |
| C-02 | DONE | exit code 0 |
| C-03 | DONE | Code review |
| C-04 | DONE | validation exit 0 |
| C-05 | FAIL | Thiếu enqueueOutbox |
| C-06 | FAIL | Không có RLS |
| C-07 | DONE | Untracked files |
| C-08 | DONE | 10 steps cover |
| C-09 | DONE | DRAFT-VALID |
| C-10 | DONE | Scope đúng |

## 3. Scope và Impact

- **Deliverables in scope:** Prisma schema, Commission API.
- **Out-of-scope changes:** None.
- **Blast radius/callers/affected flows:** Lỗi schema DB test.
- **Data/security/migration/operations:** Thiếu RLS.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `1` | Failed 125/605 | log task |
| `npm run build` | `0` | Compiled in 6.1s | log task |
| `npx vitest golden` | `0` | 10 passed | log task |
| `git status` | `0` | Untracked files | log task |
| `verify-task.ps1` | `0` | DRAFT-VALID | log task |

## 5. Coverage Gaps

- Chưa test UI trên trình duyệt.

## 6. Verdict và Planner Questions

- **Verdict:** FAIL
- **Reason:** P1 (AUD-001) thiếu RLS nghiêm trọng, P2 thiếu outbox và lỗi test DB.
- **Planner decisions required:** Fix RLS, fix outbox, update Test DB.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | AUD-001 | OPEN | OPEN | None |
| 1 | AUD-002 | OPEN | OPEN | None |
| 1 | AUD-003 | OPEN | OPEN | None |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
