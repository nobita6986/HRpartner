---
name: audit
description: Use when Tier 3 writes an AUDIT artifact. Defines evidence, severity, finding IDs and verdict rules.
version: 1.0.0
license: Internal
---

# Audit Skill (Tier 3)

Tier 3 viết `AUDIT.md` chỉ khi TASK chọn `Audit mode: LIGHT`. Task mới dùng `LIGHT | DELTA`; các depth cũ chỉ để tương thích artifact lịch sử.

## Iron Rules

1. Đánh giá chỉ dựa trên evidence thật; không dựa vào lời cam kết.
2. Mỗi `AC-0X` phải có verdict: `PASS | FAIL | PARTIAL | BLOCKED | N/A | CARRIED_FORWARD`.
3. Mỗi finding `AUD-00X` phải có file:line trỏ tới evidence hoặc vào source.
4. Không tự fix lỗi; Tier 1 nhận finding, sửa và resolve.
5. DELTA chỉ rerun changed surface; CARRIED_FORWARD phải có source round/baseline/evidence và impact proof.
6. Chỉ audit exact committed `Implementation SHA` khớp HANDOFF; từ chối audit nếu source/test/migration còn dirty hoặc `Audit eligibility` chưa `ELIGIBLE`.
7. Báo toàn bộ findings quan sát được trên current changed surface trong cùng round; không chia nhỏ để mở thêm round.
8. DELTA không mở lại unchanged surface hoặc tạo finding mới trên unchanged surface nếu không có evidence mới được ghi rõ.
9. P3/documentation debt không chặn release và không tự tạo correction round.

## Severity Grades

| Severity | Ý nghĩa |
|---|---|
| `P0` | Sự cố nghiêm trọng/security/data loss — luôn chặn ACCEPTED |
| `P1` | Acceptance hoặc release safety chưa đạt — luôn chặn ACCEPTED |
| `P2` | Chỉ chặn khi finding ghi `Release-blocking: YES`; nếu không thì đưa debt có owner |
| `P3` | Style/suggestion — không chặn |

## Output

- `docs/tasks/<slug>/AUDIT.md` với metadata giống `templates/AUDIT.template.md`.
- Ghi `Assurance lane`, `Audit depth`, execution/audit round và baseline nguồn.
- Ghi exact `Implementation SHA`, `Finding completeness: COMPLETE_CURRENT_SURFACE` và correction batch `0|1`.
- Long evidence (log, screenshot) đặt trong `evidence/` đính kèm.

## References

- `references/audit-checklist.md` — quick checklist 12 điểm
- `references/severity-rubric.md` — ví dụ grading thực tế
