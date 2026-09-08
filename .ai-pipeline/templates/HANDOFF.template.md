# HANDOFF — `<task-slug>`

## 0. Control

| Field | Value |
|---|---|
| Task | `<task-slug>` |
| Spec version | `<must match TASK>` |
| Assurance lane | `FAST | STANDARD | CRITICAL` |
| Audit mode | `<must match TASK>` |
| Execution round | `<N>` |
| Baseline | `<SHA>` |
| Status | `IN_PROGRESS | READY_FOR_REVIEW | READY_FOR_AUDIT | BLOCKED` |

## 1. Outcome Summary

- **Delivered:** `<observable result>`
- **Not delivered:** `<None hoặc phần còn lại>`
- **Lane escalation needed:** `<No hoặc lý do>`

## 2. Execution Trace

Gộp STEP có cùng kết quả. Không ghi nhật ký từng thao tác.

| STEP | Target / outcome | Status | Deviation |
|---|---|---|---|
| `STEP-01` | `<path/symbol + result>` | `DONE | BLOCKED` | `None | DEV-01` |

## 3. Acceptance Evidence

Dòng đầu `verify-task` bắt phải có. Mỗi AC có một hàng, nhưng được tham chiếu cùng `E-xx`; không copy lại command/output.

| AC | Evidence ref or command | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath ...` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `<measured result>` | `None` |

## 4. Changed Deliverables

| File | Change | Why in scope |
|---|---|---|
| `<path>` | `<summary>` | `<RQ/STEP>` |

## 5. Deviations

| ID | Type | Description | Decision needed |
|---|---|---|---|
| — | — | None | No |

Nếu BLOCKED, thay hàng None bằng `BLK-xx` nêu đúng blocker và quyết định cần Tier 1/Owner.

## 6. Evidence Index

Đăng ký mỗi command một lần. Log ngắn để inline; chỉ tạo `evidence/*` cho output dài hoặc cần lưu bền.

| Evidence ID | Command / method | Result | Artifact |
|---|---|---|---|
| `E-01` | `<runnable command>` | `<exit + count/value>` | `<inline | evidence/file | file:line>` |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `<N>` | `<vX.Y>` | `<status>` | `<one line>` |

> Handoff status: `<FAST: READY_FOR_REVIEW; STANDARD/CRITICAL: READY_FOR_AUDIT; otherwise BLOCKED>`
