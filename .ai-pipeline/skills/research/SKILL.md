---
name: research
description: Use when Tier 1 (Planner) needs to research external libraries, best practices, or technical solutions before writing a TASK. Enforces multi-source strategy and capped tool calls.
license: HRP-Internal
---

# Research (Tier 1)

## Methodology

YAGNI · KISS · DRY. **Trung thực, thẳng thắn, ngắn gọn.**

## Phase 1: Scope

- Identify key terms/concepts.
- Recency requirements (how current must information be).
- Evaluation criteria for sources.
- Boundaries.

## Phase 2: Information Gathering

1. **WebSearch / WebFetch** (preferred, mặc định cho HRP):
   - Multiple parallel searches.
   - Include terms like "best practices", "2026", "latest", "security", "performance".
   - Official docs / GitHub / authoritative blogs first.
2. **docs-seeker** skill when looking for package-specific docs (skip nếu đã search xong).
3. **Deep Content Analysis**: GitHub repos, official API refs.
4. **Cross-Reference Validation**: multiple independent sources, publication date, consensus.

> **Lưu ý**: HRP không dùng `gemini` bash mặc định vì thiếu CLI trong Windows env. Dùng `WebSearch`/`WebFetch` là primary.

## Phase 3: Analysis & Synthesis

- Common patterns / best practices.
- Pros/cons of approaches.
- Maturity/stability of tech.
- Security/performance implications.
- Compatibility/integration requirements.

## Phase 4: Report

> HRP KHÔNG tạo report riêng; Planner extract fact cần thiết vào `TASK.md > Evidence`.

Output structure (paste vào TASK.md Evidence):

```markdown
### Evidence: <topic>

**Sources**: <list>
**Date range**: <earliest to latest>
**Key findings**:
- <fact 1 — with citation>
- <fact 2>
**Implication for this task**: <1-3 bullets>
```

## Capping

Tối đa **5 searches** (5 tool calls) cho mỗi research topic. Respect user request nếu less.

## References

- `references/output-template.md` — evidence block chuẩn
- `references/checklist-quality.md` — accuracy/currency/completeness/actionability/clarity/attribution
