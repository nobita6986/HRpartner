---
name: codegraph-usage
description: Use when a tier needs code-graph callers, callees, blast radius or traces before editing/auditing. Defines invocation and evidence rules.
version: 1.0.0
license: Internal
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
