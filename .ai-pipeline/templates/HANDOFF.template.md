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
| Status | `READY_FOR_REVIEW | READY_FOR_AUDIT | BLOCKED` |

## 1. Outcome and changed surface

- **Delivered:** `<observable result>`
- **Not delivered:** `<None hoặc phần còn lại>`
- **Changed:** `<paths/symbols gắn STEP>`
- **Lane escalation:** `<No hoặc lý do>`

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath ...` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `<measured result>` | `None` |

## 3. Evidence registry

Log ngắn để inline; chỉ tạo `evidence/*` cho output dài, LIVE transcript hoặc ảnh cần lưu.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `<runnable command>` | `<exit + count/value>` | `<inline | evidence/file | file:line>` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

Nếu BLOCKED, thay hàng None bằng `BLK-xx`, nêu phần đã xong, blocker cụ thể, đúng đầu vào cần và điều kiện chạy tiếp.

## 5. Final status

- `<một câu: vì sao đủ READY hoặc vì sao BLOCKED>`

> Handoff status: `<FAST: READY_FOR_REVIEW; STANDARD/CRITICAL: READY_FOR_AUDIT; otherwise BLOCKED>`
