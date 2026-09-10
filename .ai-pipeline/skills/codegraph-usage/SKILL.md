---
name: codegraph-usage
description: Use when a tier needs code-graph callers, callees, blast radius or traces before editing/auditing. Defines invocation and evidence rules.
version: 1.0.0
license: Internal
---

# CodeGraph Usage

## Tier 1

Dùng để xác định callers/blast radius khi plan và để preflight/verify khi implement. Ghi kết luận cần thiết vào TASK/HANDOFF; không dump toàn bộ graph và không tự mở rộng scope.

## Auditor

Tự chạy impact/caller check khi task có risk tương ứng. Ghi result hoặc tool limitation vào `AUDIT.md`.

## Windows

Chạy PowerShell command phù hợp với CLI thực tế. Nếu CLI không tồn tại, dùng `MCP tool codegraph_search/context/impact` qua `.codegraph/`; không tạo mock evidence.
