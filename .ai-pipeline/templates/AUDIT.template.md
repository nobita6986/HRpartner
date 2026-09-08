# AUDIT — `<task-slug>`

## 0. Audit Control

| Field | Value |
|---|---|
| Task | `<task-slug>` |
| Spec version | `<must match TASK>` |
| Assurance lane | `STANDARD | CRITICAL` |
| Audit depth | `FULL | DELTA` |
| Execution round | `<N>` |
| Audit round | `<N>` |
| Baseline / source round | `<SHA; DELTA thêm audit round nguồn>` |
| Auditor | `Tier 3 — independent session` |

> FAST không tạo AUDIT mặc định. Task cũ thiếu Assurance lane được coi là CRITICAL.

## 1. Findings

| ID | Severity | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|
| — | — | — | None | — |

Severity: P0 critical, P1 high, P2 medium, P3 low.

## 2. Acceptance Verification

### 2.1 Acceptance criteria

| AC | Independent method or carry-forward source | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `<command>` | `PASS | FAIL | BLOCKED | ENV_BLOCKED | N/A` | `<exit + value + path>` | `None | AUD-001` |
| `AC-02` | `Audit round <N>, baseline <SHA>` | `CARRIED_FORWARD` | `<source evidence + impact proof>` | `None` |

### 2.2 Assurance checks

STANDARD bắt buộc `C-07`, `C-09`, `C-10` và mọi check áp dụng. CRITICAL ghi đủ C-01..C-10; check không áp dụng dùng `SKIP` kèm lý do.

| Check | Status | Evidence (command + exit + output, hoặc carry-forward source) |
|---|---|---|
| `C-01` Regression | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-02` Build/type | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-03` Route/auth | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-04` Prisma/schema | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-05` Idempotency/outbox | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-06` Migration/RLS | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-07` Git hygiene | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence>` |
| `C-08` Changed-behavior coverage | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |
| `C-09` Contract validity | `DONE | FAIL | CARRIED_FORWARD` | `<evidence>` |
| `C-10` Diff scope | `DONE | FAIL | CARRIED_FORWARD` | `<evidence>` |

Các check khác thêm khi áp dụng: C-01 regression, C-02 build/type, C-03 route/auth, C-04 Prisma/schema, C-05 idempotency/outbox, C-06 migration/RLS, C-08 changed-behavior coverage.

## 3. Scope

- **Audited changed surface:** `<files/callers>`
- **Excluded and why:** `<none hoặc reason>`
- **Baseline/diff proof:** `<command + result>`

## 4. Independent Evidence

STANDARD FULL tối thiểu 3 phép đo; CRITICAL FULL tối thiểu 5; DELTA tối thiểu 2. Một phép đo có thể map nhiều AC.

| Evidence ID | Command / method | Exit / measured result | Artifact / mapping |
|---|---|---|---|
| `AE-01` | `<command>` | `<exit + count/value>` | `<path; AC/C mapping>` |

## 5. Coverage Gaps

- `<None hoặc AC/check chưa đo được + lý do>`

## 6. Verdict

- **Verdict:** `PASS | CONDITIONAL | FAIL | BLOCKED`
- **Open P0/P1/P2:** `<None hoặc IDs>`
- **Reason:** `<ngắn, dựa trên evidence>`

## 7. Re-audit Trace

Với DELTA, mỗi `CARRIED_FORWARD` phải có row nêu source round/baseline/evidence và impact proof. FULL round đầu có thể ghi N/A.

| Audit round | AC / Check | Previous status | Current status | Source evidence and impact proof |
|---|---|---|---|---|
| `<N>` | `<AC-xx/C-xx>` | `<PASS/DONE>` | `CARRIED_FORWARD` | `round <N-1>, baseline <SHA>, <path>; <impact command/result>` |

Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
