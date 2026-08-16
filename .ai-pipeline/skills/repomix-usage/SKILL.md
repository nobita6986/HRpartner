---
name: repomix-usage
description: Use when an HRP tier needs to bundle the codebase as a single AI-friendly file. Defines when it is justified, what to exclude, and where the output must live.
version: 1.0.0
license: HRP-Internal
---

# Repomix Usage

Repomix chỉ dùng khi scope lớn đến mức đọc file chọn lọc không đủ hiệu quả.

## Quy tắc

- Exclude secrets, build output, dependency folders và binary.
- Không bundle toàn repo theo thói quen cho task nhỏ.
- Planner trích các fact cần thiết vào `TASK.md > Evidence`; không tạo CONTEXT report riêng.
- Bundle lớn đặt trong `docs/tasks/<slug>/evidence/` khi thật sự cần audit/reproduce.
- Nếu Repomix không có, dùng `rg --files`, `rg` và đọc file liên quan; không coi là blocker mặc định.

## Command chuẩn

```bash
repomix --include "src/**,app/**,prisma/**,docs/**" --remove-comments \
  --output docs/tasks/<slug>/evidence/repomix-output.md --style markdown
```

## References

- `references/repomix-flags.md` — output formats, --include patterns, .repomixignore
