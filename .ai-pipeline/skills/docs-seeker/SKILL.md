---
name: docs-seeker
description: Use when Tier 1 or Tier 2 needs current authoritative documentation for a library/framework before designing or implementing.
license: Internal
---

# Documentation Discovery

## When to Use

- Tier 1 cần fact về API/library/framework để viết TASK.md chính xác.
- Tier 2 cần check API ref khi implement.
- Tier 3 cần verify behavior từ docs khi audit.

## Primary Workflow

Không giả định helper script hoặc documentation connector tồn tại. Dùng công cụ khả dụng theo thứ tự:

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

- Ưu tiên official documentation, release notes và primary sources.
