# 🛠️ Hệ sinh thái Kỹ năng (HRP Skill Ecosystem)

> **Phase 2 (2026-Q2)**: Toàn bộ skill đã được migrate sang folder `SKILL.md` (chuẩn Cursor/Anthropic), kèm YAML frontmatter để mọi CLI Agent tự discover.

Hệ thống gồm **23 skill folders** chia thành 7 nhóm domain. Mỗi skill có:

```
skills/<name>/
├── SKILL.md           (≤ 100 dòng, YAML frontmatter bắt buộc)
└── references/        (optional, progressive disclosure)
```

## 1. Danh mục 23 skill (sau Phase 2)

**A. Pipeline core (HRP)**

| Skill | Tier gốc | Mục đích |
|---|---|---|
| `anti-hallucination` | All | Iron rule evidence: không bịa claim, evidence phải có command + exit code + output. |
| `skill-invocation-protocol` | All | Tier chỉ invoke skill khớp scope; không tạo skill report riêng. |
| `task-authoring` | Tier 1 | Author TASK.md contract: mức chi tiết, ID convention (RQ/STEP/AC), ready test. |
| `implementation-mindset` | Tier 2 | Tier 2 ranh giới: được tự quyết / phải hỏi Planner. |
| `code` | Tier 2 | Execute TASK → HANDOFF: evidence block, deviation rule, round closure. |
| `audit` | Tier 3 | Verify → AUDIT: verdict PASS/FAIL, severity rubric, finding ID. |
| `code-review` | Tier 3 | Receiving feedback + verification gates (Iron Law). |
| `reviewcode` | Tier 1/3 (nhanh) | Read-only survey, KHÔNG thay audit chính thức. |
| `refactor` | All | Refactor bảo toàn behavior, scope & blast radius. |
| `debugging-protocol` | Tier 2/3 | 7-step debug flow + ownership theo tier. |
| `testing-protocol` | Tier 2/3 | Multi-stack test matrix (Next.js/Prisma/Python). |

**B. Planning & Analysis**

| Skill | Tier | Mục đích |
|---|---|---|
| `planning` | Tier 1 | 5-phase plan workflow, schema chuẩn. |
| `sequential-thinking` | Tier 1/3 | Structured thought N/N + Revision/Branch/Hypothesis. |
| `problem-solving` | Tier 1/3 | 6 dispatchable techniques (Simplification Cascade, Scale Game…). |
| `research` | Tier 1 | Research ngoài codebase, capped 5 searches. |
| `docs-seeker` | All | Tìm docs (Next.js/Prisma/Vitest) qua WebFetch. |
| `repomix-usage` | Tier 1/3 | Bundle codebase khi scope lớn. |

**C. Tech-stack (HRP-specific)**

| Skill | Tier | Mục đích |
|---|---|---|
| `databases` | Tier 2/3 | Postgres + Prisma focus (HRP stack). |
| `frontend-design` | Tier 1/2 (UI) | Chống AI-slop, bold aesthetic direction. |
| `python-project` | Tier 2 (sub-tool) | Python 3.10+, Black/Ruff, sub-tool (không main HRP). |

**D. Integration / Meta**

| Skill | Tier | Mục đích |
|---|---|---|
| `codegraph-usage` | All | Dùng codegraph tool theo tier. |
| `codegraph-integration` | Tier 1 | Init `.codegraph/` và đăng ký MCP. |
| `mcp-management` | Tier 1 | MCP config + tool selection. |

**E. Không port (Phase 2 ngoài scope)**

Lý do bỏ:

- `shopify`, `threejs`, `better-auth`, `payment-integration`, `aesthetic`, `ui-ux-pro-max`, `ui-styling`, `chrome-devtools`, `backend-development`, `frontend-development`, `devops`, `ai-multimodal`, `media-processing`, `document-skills`, `google-adk-python`, `mobile-development`, `mcp-builder`, `common`, `claude-code`, `template-skill` — quá design-oriented, framework-specific không khớp HRP, hoặc đã có skill riêng trong `.ai-pipeline/`.

Có thể port thêm ở Phase 3 nếu dự án mở rộng sang Shopify, mobile, etc.

## 2. Skill Decision Matrix (Task Pattern → Skill)

| Task Pattern | Primary Skill | Reference / Fallback |
|---|---|---|
| Thiết kế schema Prisma | `databases` | `testing-protocol` |
| Viết API endpoint / server action | `code` | `implementation-mindset` |
| Làm mượt UI, thêm hiệu ứng | `frontend-design` | `code` |
| Dựng component Next.js | `code` | `testing-protocol` |
| Tìm lỗi logic / timeout | `debugging-protocol` | `sequential-thinking` |
| Phân tích dependency lớn | `repomix-usage` | `codegraph-usage` |
| Code analysis & impact | `codegraph-usage` (`impact`) | `codegraph-usage` (`explore`) |
| Resolve audit findings | `sequential-thinking` | `problem-solving` |
| Audit code change | `audit` | `code-review` |
| Viết TASK contract | `task-authoring` | `planning` |
| Plan task lớn | `planning` | `sequential-thinking` |
| Research library/best practice | `research` | `docs-seeker` |

## 3. Skill Combos Thông dụng

- **Backend Pro:** `code` + `databases` + `testing-protocol`
- **Frontend Pro Max:** `code` + `frontend-design` + `testing-protocol`
- **Deep Debugging:** `sequential-thinking` + `debugging-protocol` + `code-review`
- **Refactor + CodeGraph:** `codegraph-usage` (`impact`) + `refactor`
- **Audit + CodeGraph (BẮT BUỘC):** `codegraph-usage` (`impact`) + `audit`
- **Planning + Research:** `planning` + `research` + `docs-seeker`

## 4. Ưu tiên Skill theo 3 Tầng

- **Tier 1 (Planner):** `planning`, `task-authoring`, `research`, `docs-seeker`, `sequential-thinking`, `problem-solving`, `codegraph-usage`, `repomix-usage`, `skill-invocation-protocol`.
- **Tier 2 (Engineer):** `code`, `implementation-mindset`, `testing-protocol`, `debugging-protocol`, `refactor`, `codegraph-usage`, `repomix-usage`, `databases`, `frontend-design`, `python-project`.
- **Tier 3 (Auditor):** `audit`, `code-review`, `codegraph-usage`, `repomix-usage`, `debugging-protocol`, `sequential-thinking`, `problem-solving`, `testing-protocol`.

## 5. Cấu trúc 1 skill folder (chuẩn)

```text
skills/<skill-name>/
├── SKILL.md         # ≤ 100 dòng, YAML frontmatter bắt buộc
└── references/      # tùy chọn, mỗi file < 100 dòng
    ├── pattern-a.md
    └── pattern-b.md
```

YAML frontmatter chuẩn:

```yaml
---
name: <skill-name>
description: <Use when... ≤ 200 chars>
license: HRP-Internal
version: 1.0.0
---
```
