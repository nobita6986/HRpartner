---
name: docs-seeker
description: Use when Tier 1 (Planner) or Tier 2 needs authoritative documentation for a library/framework used by HRP (Next.js, Prisma, Vitest, etc.) before designing or implementing. Works without context7.com — uses WebFetch as fallback.
license: HRP-Internal
---

# Documentation Discovery (HRP)

## When to Use

- Tier 1 cần fact về API/library/framework để viết TASK.md chính xác.
- Tier 2 cần check API ref khi implement.
- Tier 3 cần verify behavior từ docs khi audit.

## Primary Workflow (HRP — Windows, no local context7)

HRP **không dùng** `node scripts/detect-topic.js` (chỉ dành cho .claude env). HRP dùng:

```text
1. WebSearch   → "Next.js 15 <topic> official docs 2026"
2. WebFetch    → official docs URL (nextjs.org / prisma.io / vitest.dev / etc.)
3. Extract fact có citation, paste vào TASK.md > Evidence
```

## Fallback Chain

| Situation | Path |
|---|---|
| Query trỏ rõ library + topic | WebSearch → WebFetch official docs |
| Library mới / obscure | WebSearch GitHub → đọc README |
| Tài liệu tiếng Việt | KHÔNG dùng; ép tiếng Anh/quote source chuẩn |
| Tool không có (`context7.com` etc.) | `WebSearch` + `WebFetch` là primary |

## Caching Rule

Tier 1 trích fact có citation vào `TASK.md > Evidence`. Không tạo DOCS-REPORT riêng.

## References

- `references/official-docs-index.md` — index docs URL các framework HRP dùng
- `references/websearch-patterns.md` — pattern search hiệu quả
