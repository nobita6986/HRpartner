---
name: mcp-management
description: Use when HRP needs to register an MCP server (vd. user-codegraph) into `.mcp.json` or discover available MCP tools/prompts/resources. Curated for the HRP Windows environment.
license: HRP-Internal
---

# MCP Management (HRP)

MCP servers trong HRP được đăng ký tại `.mcp.json` ở root. Hiện HRP có sẵn `user-codegraph` (xem `codegraph-integration/SKILL.md` để biết cách setup).

## When to Use

- Tier 1 cần MCP tool để trace/impact analysis → register `user-codegraph`.
- Tier 2 / Tier 3 cần discover tools → `MCP catalog` ở system message.

## Configuration

```json
// .mcp.json (root)
{
  "mcpServers": {
    "user-codegraph": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@user/codegraph", "serve"]
    }
  }
}
```

## Tier-specific Usage

| Tier | Use |
|---|---|
| Tier 1 | `codegraph_context` → enumerate symbols before drafting TASK.md |
| Tier 2 | `codegraph_search`/`codegraph_node` → preflight before edit |
| Tier 3 | `codegraph_impact` → audit blast radius (BẮT BUỘC cho high-risk task) |

## Tool Selection Cheatsheet

| Intent | Tool |
|---|---|
| "Symbol X là gì?" | `codegraph_search` |
| "Task/feature này là gì?" | `codegraph_context` (primary) |
| "X → Y path?" | `codegraph_trace` |
| "Calls of X?" | `codegraph_callers` |
| "Change X breaks what?" | `codegraph_impact` |

> Chi tiết xem `.ai-pipeline/skills/codegraph-usage/SKILL.md`.

## References

- `references/mcp-registry.md` — danh sách MCP HRP đang dùng
- `scripts/check-mcp.ps1` (planned) — verify `.mcp.json` valid trước khi commit
