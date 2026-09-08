---
name: audit
description: Use when Tier 3 writes an AUDIT artifact. Defines evidence, severity, finding IDs and verdict rules.
version: 1.0.0
license: Internal
---

# Audit Skill (Tier 3)

Tier 3 viết `AUDIT.md` cho STANDARD/CRITICAL hoặc FAST được escalation. Audit theo `FULL | DELTA`.

## Iron Rules

1. Đánh giá chỉ dựa trên evidence thật; không dựa vào lời cam kết.
2. Mỗi `AC-0X` phải có verdict: `PASS | FAIL | PARTIAL | BLOCKED | N/A | CARRIED_FORWARD`.
3. Mỗi finding `AUD-00X` phải có file:line trỏ tới evidence hoặc vào source.
4. Không tự fix lỗi; chỉ ghi nhận để Tier 1 resolve và Tier 2 sửa trong round tiếp theo.
5. DELTA chỉ rerun changed surface; CARRIED_FORWARD phải có source round/baseline/evidence và impact proof.

## Severity Grades

| Severity | Ý nghĩa |
|---|---|
| `CRITICAL` | Security/data-loss/breaking — chặn ACCEPTED |
| `HIGH` | Acceptance chưa đạt — chặn ACCEPTED |
| `MEDIUM` | Code smell/scope creep — không chặn |
| `LOW` | Style/suggestion — không chặn |

## Output

- `docs/tasks/<slug>/AUDIT.md` với metadata giống `templates/AUDIT.template.md`.
- Ghi `Assurance lane`, `Audit depth`, execution/audit round và baseline nguồn.
- Long evidence (log, screenshot) đặt trong `evidence/` đính kèm.

## References

- `references/audit-checklist.md` — quick checklist 12 điểm
- `references/severity-rubric.md` — ví dụ grading thực tế
