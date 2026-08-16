---
name: cross-compat-mapping
description: Bản đồ giữa các Agent (Cursor, Claude Code, Antigravity, VSCode Copilot) và HRP 3-tier role. Đọc file này trước khi onboard một Agent mới vào HRP pipeline.
version: 1.0.0
---

# HRP Agent × Platform Cross-Compat Matrix

Mapping giữa **HRP Tier role** và **CLI Coding Agent** hiện có. Mục tiêu: cùng một TASK / HANDOFF / AUDIT schema chạy được trên mọi Agent.

## Tier × Agent mapping

| HRP Tier | Cursor (subagent) | Claude Code | Gemini CLI / Antigravity | VSCode Copilot | OpenCode |
|---|---|---|---|---|---|
| **Tier 1 (Planner)** | `.claude/agents/planner.md` (Cursor YAML) | `CLAUDE.md` + custom instructions | `GEMINI.md` + root prompt | `.github/copilot-instructions.md` | system prompt |
| **Tier 2 (Engineer)** | `.claude/agents/engineer.md` | `CLAUDE.md` engineer section | `GEMINI.md` engineer section | copilot-instructions engineer | system prompt |
| **Tier 3 (Auditor)** | `.claude/agents/auditor.md` | `CLAUDE.md` auditor section | `GEMINI.md` auditor section | copilot-instructions auditor | system prompt |

> Trong repo này, các file Cursor đã có sẵn tại `.ai-pipeline/agents/{planner,engineer,auditor}.md`. Khi onboard Agent khác, dùng `init-project.ps1` để generate các adapter tương ứng.

## Bootstrap file theo từng Agent

| Agent | Bootstrap file | Load mechanism |
|---|---|---|
| **Cursor** | `.cursor/rules/hrp.mdc` (generated) | Cursor auto-load `.cursor/rules/*.mdc` |
| **Antigravity / Gemini CLI** | `GEMINI.md` (generated) | Gemini auto-load root `GEMINI.md` |
| **Claude Code** | `CLAUDE.md` (generated) | Claude Code auto-load root `CLAUDE.md` |
| **VSCode Copilot** | `.github/copilot-instructions.md` (generated) | GitHub Copilot auto-load repo instructions |
| **OpenCode** | `OPENCODE.md` + system prompt | opencode load root `.md` files |

Cả 5 file trên đều là **wrapper** trỏ về `.ai-pipeline/` source of truth; chúng được tái sinh bởi `init-project.ps1`.

## Source of Truth — `.ai-pipeline/`

Mọi thay đổi về role/protocol bắt buộc đi vào `.ai-pipeline/` trước, sau đó `init-project.ps1` regenerate wrapper files. Không sửa trực tiếp `.cursor/rules/hrp.mdc`/`GEMINI.md`/`CLAUDE.md`.

## Command surface (cross-Agent)

HRP commands — `/plan`, `/code`, `/audit`, `/resolve`, `/list`, `/status`, `/ship` — sẽ được mapping:

| HRP Command | Cursor | Claude Code | Antigravity | VSCode Copilot |
|---|---|---|---|---|
| `/plan [slug]` | `.claude/commands/plan.md` | slash cmd (planned) | command mode | slash cmd (planned) |
| `/code [slug]` | `.claude/commands/code.md` | slash cmd (planned) | command mode | slash cmd (planned) |
| `/audit [slug]` | `.claude/commands/audit.md` | slash cmd (planned) | command mode | slash cmd (planned) |
| `/resolve [slug]` | `.claude/commands/resolve.md` | slash cmd (planned) | command mode | slash cmd (planned) |
| `/list` | `.claude/commands/list.md` (planned) | native | command mode | slash cmd (planned) |
| `/status` | `.claude/commands/status.md` (planned) | native | command mode | slash cmd (planned) |
| `/ship` | `.claude/commands/ship.md` (planned) | native | command mode | slash cmd (planned) |

## How to onboard Agent mới

```bash
# 1. Run bootstrap (generate wrapper)
pwsh .ai-pipeline/scripts/init-project.ps1 -Agent <antigravity|claude-code|vscode-copilot|opencode>

# 2. Verify wrapper
cat GEMINI.md           # nếu Antigravity
cat CLAUDE.md           # nếu Claude Code
cat .github/copilot-instructions.md   # nếu VSCode

# 3. Test với Tier 1 prompt đầu tiên
```

## References

- `.ai-pipeline/README.md` — overview
- `.ai-pipeline/PIPELINE-GUIDE.md` — workflow
- `.ai-pipeline/PIPELINE-BOOTSTRAP.md` (planned) — onboarding từng Agent
