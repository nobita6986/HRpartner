# HRP Pipeline Bootstrap — Hướng dẫn Onboard CLI Agent

> Phase 3 (16/08/2026): `.ai-pipeline/` đã là **gói duy nhất** cần copy sang dự án mới. Tier prompts (`tier{1,2,3}.md`), agent manifests, skills, rules, templates và bootstrap script đều n�m gọn trong 1 folder.
>
> Phase 2 (2026-Q2) chuẩn hóa cách mọi CLI Coding Agent (Cursor, Antigravity, Claude Code, VSCode Copilot, OpenCode) load nguyên tắc + skill HRP từ một **source of truth duy nhất**: `.ai-pipeline/`.

## Source of Truth — `.ai-pipeline/`

Mọi thay đổi về role, rule, command, skill đều phải vào `.ai-pipeline/` **trước**. Sau đó chạy `init-project.ps1` để tái sinh các wrapper files ở root cho Agent tương ứng.

```text
.ai-pipeline/                        ← source of truth
├── README.md
├── PIPELINE-GUIDE.md                ← workflow 3-tier
├── PIPELINE-BOOTSTRAP.md            ← file này
├── SKILL-ECOSYSTEM.md               ← skill decision matrix
├── CHANGELOG.md
├── tier1.md                          ← Tier 1 prompt (Planner)
├── tier2.md                          ← Tier 2 prompt (Engineer)
├── tier3.md                          ← Tier 3 prompt (Auditor)
├── rules/                           ← global + tier-specific rules
├── templates/                       ← TASK/HANDOFF/AUDIT schema
├── agents/
│   ├── planner.md                   ← Tier 1 YAML manifest
│   ├── engineer.md                  ← Tier 2 YAML manifest
│   ├── auditor.md                   ← Tier 3 YAML manifest
│   └── CROSS-COMPAT.md              ← Tier × Agent mapping
├── skills/<name>/                   ← 23 skill folders
│   ├── SKILL.md                     ← ≤ 100 dòng, YAML frontmatter
│   └── references/                  ← optional, progressive disclosure
└── scripts/
    ├── init-project.ps1             ← generate wrappers
    ├── verify-task.ps1              ← check TASK schema
    └── run-codegraph.ps1            ← init .codegraph/ index

Generated wrappers (root) — KHÔNG sửa trực tiếp:
├── .cursor/rules/hrp.mdc            ← auto-load by Cursor
├── GEMINI.md                        ← auto-load by Antigravity / Gemini CLI
├── CLAUDE.md                        ← auto-load by Claude Code
├── .github/copilot-instructions.md  ← auto-load by VSCode Copilot
└── OPENCODE.md                      ← auto-load by OpenCode
```

## Quick Start — Onboard tất cả Agent

```powershell
# Từ root HRP repo
pwsh .ai-pipeline/scripts/init-project.ps1

# Output:
#   [OK] Cursor         → .cursor/rules/hrp.mdc
#   [OK] Antigravity    → GEMINI.md
#   [OK] Claude Code    → CLAUDE.md
#   [OK] VSCode Copilot → .github/copilot-instructions.md
#   [OK] OpenCode       → OPENCODE.md
```

Idempotent — chạy lại nhiều lần không tạo file thừa, chỉ overwrite.

## Onboard một Agent cụ thể

```powershell
# Chỉ Cursor
pwsh .ai-pipeline/scripts/init-project.ps1 -Agent cursor

# Cursor + Antigravity
pwsh .ai-pipeline/scripts/init-project.ps1 -Agent "cursor,antigravity"

# Available values:
#   cursor, antigravity, claude-code, vscode-copilot, opencode
```

`init-project.ps1` kiểm tra `.ai-pipeline/` tồn tại; nếu thiếu sẽ fail với `[FAIL]`.

## Bản đồ Agent × Tier × Wrapper

| Tier | Cursor subagent | Antigravity / Gemini | Claude Code | VSCode Copilot | OpenCode |
|---|---|---|---|---|---|
| **Tier 1 — Planner** | `agents/planner.md` | `GEMINI.md` Tier 1 section | `CLAUDE.md` planner section | `.github/copilot-instructions.md` planner | `OPENCODE.md` planner |
| **Tier 2 — Engineer** | `agents/engineer.md` | `GEMINI.md` Tier 2 | `CLAUDE.md` engineer section | `.github/...` engineer | `OPENCODE.md` engineer |
| **Tier 3 — Auditor** | `agents/auditor.md` | `GEMINI.md` Tier 3 | `CLAUDE.md` auditor section | `.github/...` auditor | `OPENCODE.md` auditor |

Wrapper files (root) chỉ là **index**. Để agent biết chi tiết role/skill, nó phải đọc các file ở `.ai-pipeline/`. Wrapper tự động trỏ đúng đường dẫn.

## Cách sử dụng đúng

### Tier 1 — Planner

Khởi động Agent nào cũng được (Cursor / Antigravity / Claude Code), sau đó dán prompt:

```
Bạn là HRP Tier 1 (Planner).
Đọc .ai-pipeline/agents/planner.md trước.
Sau đó đọc các file liên quan:
- .ai-pipeline/rules/01-planner-rules.md
- .ai-pipeline/skills/planning/SKILL.md
- .ai-pipeline/skills/task-authoring/SKILL.md
- .ai-pipeline/templates/TASK.template.md

Sếp yêu cầu: <paste requirement ở đây>
```

### Tier 2 — Engineer

```
Bạn là HRP Tier 2 (Engineer).
Đọc .ai-pipeline/agents/engineer.md trước.
Tiếp:
- .ai-pipeline/rules/02-engineer-rules.md
- .ai-pipeline/skills/code/SKILL.md
- .ai-pipeline/skills/implementation-mindset/SKILL.md
- .ai-pipeline/templates/HANDOFF.template.md

Task: /code <slug>  (auto-find nếu bỏ trống)
```

### Tier 3 — Auditor

```
Bạn là HRP Tier 3 (Auditor).
Đọc .ai-pipeline/agents/auditor.md trước.
Tiếp:
- .ai-pipeline/rules/03-auditor-rules.md
- .ai-pipeline/skills/audit/SKILL.md
- .ai-pipeline/skills/code-review/SKILL.md
- .ai-pipeline/templates/AUDIT.template.md

Task: /audit <slug>  (auto-find nếu bỏ trống)
```

## Anti-pattern: KHÔNG LÀM

1. ❌ Sửa trực tiếp `.cursor/rules/hrp.mdc`, `GEMINI.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `OPENCODE.md`. **Luôn sửa `.ai-pipeline/` rồi re-run init.**
2. ❌ Copy `agents/planner.md` rồi edit → tạo agent `planner-v2.md` mà không xóa cái cũ.
3. ❌ Stale wrappers: cập nhật `.ai-pipeline/` xong **không chạy lại init** → wrapper đã sinh từ version cũ vẫn tồn tại ở root.
4. ❌ In một phần plan/code/audit vào wrapper files. Wrapper chỉ là **index/pointer** đến source of truth.

## Validation — Kiểm tra bootstrap

```powershell
# Sau khi chạy init-project.ps1, kiểm tra:
Test-Path .cursor/rules/hrp.mdc
Test-Path GEMINI.md
Test-Path CLAUDE.md
Test-Path .github/copilot-instructions.md
Test-Path OPENCODE.md

# Source of truth phải còn nguyên:
Test-Path .ai-pipeline/agents/planner.md
Test-Path .ai-pipeline/agents/engineer.md
Test-Path .ai-pipeline/agents/auditor.md
Test-Path .ai-pipeline/agents/CROSS-COMPAT.md
```

## Skill Layout (chuẩn Anthropic/Cursor)

Mỗi skill folder:

```text
skills/<name>/
├── SKILL.md         # ≤ 100 dòng
│   ---              # YAML frontmatter bắt buộc
│   name: <name>
│   description: <Use when... ≤ 200 chars>
│   license: HRP-Internal
│   version: 1.0.0
│   ---
└── references/      # optional
    └── *.md          # mỗi file ≤ 100 dòng
```

Quy tắc:

- SKILL.md ngắn gọn, dùng progressive disclosure (link sang `references/`).
- Description (frontmatter) là thứ Agent dùng để **tự-activate** skill — phải specific.
- Luôn viết imperative form ("Do X" không phải "You should do X").

## Workflow thay đổi rule

```text
1. Sếp / sửa rule ở .ai-pipeline/rules/*.md (source of truth)
2. Sửa / agents/*.md nếu role definition đổi
3. Sửa / skills/<name>/SKILL.md nếu skill đổi
4. pwsh .ai-pipeline/scripts/init-project.ps1
5. Verify wrappers sinh ra đúng
6. Commit cả .ai-pipeline/ và wrappers
```

## Tích hợp `.codegraph/`

Sau khi bootstrap Agent, đảm bảo `.codegraph/` được index để Agent nào cũng query được:

```powershell
pwsh .ai-pipeline/scripts/run-codegraph.ps1 init
```

Xem `.mcp.json` ở root hoặc `.ai-pipeline/skills/codegraph-integration/SKILL.md` để biết cách đăng ký MCP `user-codegraph` cho mọi Agent.

## Xử lý Agent mới (OpenCode, Continue.dev, Aider…)

Khi một Agent mới xuất hiện:

1. Agent có auto-load file nào? (vd `.continue/`, `.aider.conf.yml`, `.cody/`)
2. Tạo function `Write-<Agent>` trong `init-project.ps1`.
3. Tạo entry trong `CROSS-COMPAT.md`.
4. Document trong file này (`PIPELINE-BOOTSTRAP.md`).

## Liên kết liên quan

- `README.md` — overview
- `PIPELINE-GUIDE.md` — workflow `/plan /code /audit /resolve`
- `CHANGELOG.md` — lịch sử thay đổi (Phase 1 & 2)
- `SKILL-ECOSYSTEM.md` — 23 skill + decision matrix
- `agents/CROSS-COMPAT.md` — Tier × Agent mapping chi tiết
