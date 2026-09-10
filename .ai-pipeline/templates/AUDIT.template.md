# AUDIT — `<task-slug>`

## 0. Control

| Field | Value |
|---|---|
| Task | `<task-slug>` |
| Spec version | `<must match TASK>` |
| Assurance lane | `FAST | STANDARD | CRITICAL` |
| Audit depth | `LIGHT | DELTA` |
| Execution round | `<N>` |
| Audit round | `<N>` |
| Baseline / source round | `<SHA; DELTA thêm audit round nguồn>` |
| Auditor | `Tier 3 — independent session` |

> Chỉ tạo AUDIT khi TASK ghi `Audit mode: LIGHT`. `FOCUSED | DEEP | FULL` chỉ được đọc để tương thích artifact cũ.

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| — | — | — | — | None | — |

P0/P1 luôn chặn. P2 chỉ chặn khi `Release-blocking: YES`; P2 không chặn và P3 đi vào debt/backlog có owner.

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

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
