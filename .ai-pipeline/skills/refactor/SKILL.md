---
name: refactor
description: Use when HRP tiers plan or execute a refactor inside the 3-tier pipeline. Refactor preserves behavior — only contract changes go back to Planner.
version: 1.0.0
license: HRP-Internal
---

# Refactor Workflow

## Tier 1

Trong `TASK.md`, bắt buộc ghi:

- Smell/debt có evidence.
- Behavior phải giữ nguyên.
- Scope và blast radius.
- Public contract compatibility.
- Step chuyển đổi và rollback.
- Characterization/regression acceptance.

Không viết implementation đầy đủ thay Tier 2.

## Tier 2

Refactor trong contract, ưu tiên bước nhỏ và test sau mỗi boundary. Ghi diff/deviation/evidence trong `HANDOFF.md`.

## Tier 3

Audit behavior preservation, callers, data migration, performance/security regression và scope creep; ghi trong `AUDIT.md`.
