---
name: reviewcode
description: Use when HRP needs a quick read-only code review outside the formal AUDIT round (e.g. Tier 1 sanity-check during planning). This is NOT a replacement for Tier 3 audit.
version: 1.0.0
license: HRP-Internal
---

# Codebase Survey / Review

## Boundaries

- Chỉ đọc/phân tích; không sửa source.
- Giới hạn theo scope được giao.
- Không yêu cầu CodeGraph nếu tool không có.

## Method

1. Dùng `rg --files`/tree để xác định cấu trúc.
2. Đọc manifest/config để xác định stack/toolchain.
3. Dùng `rg`, source inspection và CodeGraph nếu có để tìm entry points, callers, state/data flow.
4. Kiểm tra test, schema/migration và conventions liên quan.
5. Trả findings kèm file:line và limitation.

## Output theo vai trò

- Tier 1: fact cần thiết vào `TASK.md > Evidence`.
- Tier 3: findings/impact vào `AUDIT.md`.
- Khảo sát độc lập không gắn task: trả trực tiếp trong chat, không tự tạo report.

## Skill Boundaries

| | reviewcode (Tier 1/Tier 3 nhanh) | audit (Tier 3 chính thức) |
|---|---|---|
| Trigger | Trong lúc khảo sát | Khi đã có HANDOFF |
| Output | Trả lời chat / ghi Evidence | AUDIT.md |
| Có verdict PASS/FAIL | Không | Có |
