---
name: codegraph-usage
description: Use when HRP tiers need to query the code-graph (callers, callees, blast radius, trace) before editing or auditing code. Defines which tier invokes which tool and where the result must be recorded.
version: 1.0.0
license: HRP-Internal
---

# CodeGraph Usage

## Planner

Dùng khi cần xác định callers/blast radius. Ghi kết luận cùng source/tool evidence vào `TASK.md`; không dump toàn bộ graph.

## Executor

Dùng để preflight hoặc verify thay đổi symbol. Không tự refactor caller ngoài contract. Ghi result vào `HANDOFF.md`.

## Auditor

Tự chạy impact/caller check khi task có risk tương ứng. Ghi result hoặc tool limitation vào `AUDIT.md`.

## Windows

Chạy PowerShell command phù hợp với CLI thực tế. Nếu CLI không tồn tại, dùng `MCP tool codegraph_search/context/impact` qua `.codegraph/`; không tạo mock evidence.
