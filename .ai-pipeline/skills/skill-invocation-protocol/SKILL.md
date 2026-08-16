---
name: skill-invocation-protocol
description: Use when authoring or executing HRP TASK contracts to decide which skill/tool to declare and invoke. Prevents over-invoking skills just to look thorough.
version: 1.0.0
license: HRP-Internal
---

# Skill Invocation Protocol

Planner ghi skill/tool thực sự cần trong `TASK.md > Execution Plan`; không tạo SKILL-ROUTING riêng.

## Tier Rules

Tier 2 / Tier 3:

- Chỉ dùng skill liên quan tới step/audit scope.
- Không bắt buộc một skill cho mỗi thao tác cơ học.
- Nếu skill không tồn tại, dùng toolchain repo hoặc ghi blocker khi đó là dependency bắt buộc.
- Ghi skill/tool có ảnh hưởng đáng kể trong HANDOFF/AUDIT metadata; không tạo skill report riêng.

## Goal

Đúng contract và có evidence — không tối đa số skill được gọi.
