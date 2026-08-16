---
name: audit
description: Use when Tier 3 (Auditor) writes the AUDIT artifact for an HRP task. Defines evidence block, severity grading, finding ID convention and verdict rules.
version: 1.0.0
license: HRP-Internal
---

# Audit Skill (Tier 3)

Tier 3 viết `AUDIT.md` đối chiếu với `TASK.md > Acceptance` và `HANDOFF.md > Diff & Evidence`.

## Iron Rules

1. Đánh giá chỉ dựa trên evidence thật; không dựa vào lời cam kết.
2. Mỗi `AC-0X` phải có verdict: `PASS` | `FAIL` | `PARTIAL` | `NA`.
3. Mỗi finding `AUD-00X` phải có file:line trỏ tới evidence hoặc vào source.
4. Không tự fix lỗi; chỉ ghi nhận để Tier 1 resolve và Tier 2 sửa trong round tiếp theo.

## Severity Grades

| Severity | Ý nghĩa |
|---|---|
| `CRITICAL` | Security/data-loss/breaking — chặn ACCEPTED |
| `HIGH` | Acceptance chưa đạt — chặn ACCEPTED |
| `MEDIUM` | Code smell/scope creep — không chặn |
| `LOW` | Style/suggestion — không chặn |

## Output

- `docs/tasks/<slug>/AUDIT.md` với metadata giống `templates/AUDIT.template.md`.
- `Audit round`, `Round opened by` đã được Tier 1 khởi tạo; Tier 3 không đổi `Round opened by`.
- Long evidence (log, screenshot) đặt trong `evidence/` đính kèm.

## References

- `references/audit-checklist.md` — quick checklist 12 điểm
- `references/severity-rubric.md` — ví dụ grading HRP hiện hữu
