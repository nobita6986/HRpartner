---
name: planning
description: Use when Tier 1 researches, analyzes and creates an implementation plan for a feature or phase. Enforces YAGNI/KISS/DRY and pipeline artifacts.
license: Internal
---

# Planning (Tier 1)

Tạo kế hoạch kỹ thuật chi tiết thông qua research, codebase analysis, solution design và documentation.

## When to Use

Tier 1 dùng skill này khi:

- Lên kế hoạch cho TASK mới trong delivery pipeline.
- Đánh giá trade-off giữa nhiều approaches.
- Phân rã yêu cầu mơ hồ thành RQ/STEP/AC.
- Mapping codebase pattern hiện hữu vào plan.

## Output Rules

Luôn tuân thủ **YAGNI**, **KISS**, **DRY**. **Trung thực, thẳng thắn, ngắn gọn.**

- KHÔNG viết code thay Tier 2 — chỉ tạo plan (TASK.md).
- Plan phải tự-contained (một engineer hiểu codebase đọc xong có thể thực thi).
- Có snippet/pseudocode khi cần khóa contract.
- Multi-options + trade-off khi cần.
- Tuân thủ role, global rules và contract trước mọi boilerplate.

## Workflow

1. **Initial Analysis** → đọc yêu cầu, call path và đúng tài liệu nguồn được dẫn; không đọc toàn bộ roadmap theo thói quen.
2. **Research Phase** → spawn `researcher` hoặc dùng `docs-seeker`/`research` skill khi cần fact bên ngoài.
3. **Synthesis** → chốt architecture/approach.
4. **Design Phase** → ghi vào `TASK.md > Plan & Design`.
5. **Documentation** → điền `TASK.md` với RQ/STEP/AC/Evidence.
6. **Review** → dùng `verify-task.ps1` để chắc schema đúng trước khi chuyển Tier 2.

## Plan Directory

Pipeline dùng cấu trúc:

```
docs/tasks/<slug>/
├── TASK.md         # contract duy nhất
├── HANDOFF.md      # Tier 2 viết (sau khi execute)
├── AUDIT.md        # Tier 3 viết cho STANDARD/CRITICAL; FAST không bắt buộc
└── evidence/       # logs, screenshots, repomix output
```

## References

- `references/phases-output.md` — phase output chuẩn
- `templates/TASK.template.md` — schema ép buộc
