---
name: codegraph-integration
description: Use when the HRP repo needs to (re)initialize the code-graph index so MCP tools `codegraph_search/context/trace/impact` are available to Tier 1/2/3.
version: 1.0.0
license: HRP-Internal
---

# CodeGraph Integration

Chỉ thị tích hợp `.codegraph/` để Agent có thể query knowledge graph.

## Khi nào init

- Repo mới / sau khi chạy `init-project`.
- Khi `codegraph_status` báo `Pending sync` quá lớn.
- Khi đổi ngôn ngữ chính (TypeScript ↔ Python).

## Khởi tạo (PowerShell trên Windows)

```powershell
# Từ root repo
codegraph init -i
# hoặc chạy script wrapper
pwsh .ai-pipeline/scripts/run-codegraph.ps1 init
```

Script sẽ tạo `.codegraph/` chứa index SQLite; MCP user-codegraph tự đọc.

## Tier-specific note

- Tier 1: dùng trước khi ghi `TASK.md > Evidence` để có file:line chính xác.
- Tier 2: dùng để preflight symbol cần sửa.
- Tier 3: bắt buộc dùng `codegraph_impact` cho mọi task có risk side-effect.

## References

- `scripts/run-codegraph.ps1` — wrapper PowerShell
- `references/mcp-config.md` — đăng ký MCP user-codegraph vào `.mcp.json`
