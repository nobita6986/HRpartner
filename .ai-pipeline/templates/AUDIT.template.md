# AUDIT — `<task-slug>`

## 0. Control

| Field | Value |
|---|---|
| Task | `<task-slug>` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `<must match TASK>` |
| Assurance lane | `FAST | STANDARD | CRITICAL` |
| Audit depth | `LIGHT | DELTA` |
| Execution round | `<N>` |
| Audit round | `<N>` |
| Baseline / source round | `<SHA; DELTA thêm audit round nguồn>` |
| Implementation SHA | `<must match HANDOFF exactly>` |
| Finding completeness | `COMPLETE_CURRENT_SURFACE` |
| Correction batch | `0 | 1` |
| Auditor | `Tier 3 — independent session` |

> Chỉ tạo AUDIT khi TASK ghi `Audit mode: LIGHT`. `FOCUSED | DEEP | FULL` chỉ được đọc để tương thích artifact cũ.

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| — | — | — | — | None | — |

P0/P1 luôn chặn. P2 chỉ chặn khi `Release-blocking: YES`; P2 không chặn và P3 đi vào debt/backlog có owner.

Tier 3 phải liệt kê toàn bộ finding quan sát được trên current changed surface trong round này. Không giữ lại finding đã thấy để mở round sau.

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method or carry-forward source | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `<command>` | `PASS | FAIL | BLOCKED | ENV_BLOCKED | N/A` | `<exit + value + path>` | `None | AUD-001` |
| `AC-02` | `Audit round <N>, baseline <SHA>` | `CARRIED_FORWARD` | `<source evidence + impact proof>` | `None` |

### 2.2 Assurance checks

LIGHT bắt buộc `C-07`, `C-09`, `C-10`, ít nhất một changed-behavior check và các check rủi ro thực sự áp dụng.

| Check | Status | Evidence (command + exit + output, hoặc carry-forward source) |
|---|---|---|
| `C-07` Git hygiene | `DONE | FAIL | CARRIED_FORWARD` | `<evidence>` |
| `C-09` Contract validity | `DONE | FAIL | CARRIED_FORWARD` | `<evidence>` |
| `C-10` Diff scope | `DONE | FAIL | CARRIED_FORWARD` | `<evidence>` |
| `<C áp dụng>` | `DONE | SKIP | FAIL | CARRIED_FORWARD` | `<evidence/reason>` |

## 3. Evidence and scope

LIGHT và DELTA cần ít nhất 2 phép đo độc lập, trong đó một phép đo changed behavior. Một phép đo có thể map nhiều AC/check.

- **Audited changed surface:** `<files/callers>`
- **Excluded and why:** `<none hoặc impact proof>`

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `<command>` | `<exit + count/value>` | `<AC/C/path>` |

## 4. Verdict and carry-forward

- **Verdict:** `PASS | CONDITIONAL | FAIL | BLOCKED`
- **Open release blockers:** `<None hoặc P0/P1/P2-release-blocking IDs>`
- **Non-blocking debt:** `<None hoặc P2/P3 + owner>`
- **Reason:** `<ngắn, dựa trên evidence>`
- **Carry-forward:** `<None hoặc source round/baseline/evidence + impact proof>`
- **Surface-completeness statement:** `Đã báo toàn bộ finding quan sát được trên current changed surface; không giữ finding cho round sau.`
- **DELTA boundary:** `<N/A hoặc correction delta + affected callers; unchanged surface không mở lại nếu không có evidence mới>`

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
