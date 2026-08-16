# HRP Multi-AI Pipeline — 3 Tầng, 3 Artifact

## Phase 3 — Cleanup & Consolidation (16/08/2026)

Kể từ Phase 3, **chỉ cần copy `.ai-pipeline/` sang dự án mới** là đủ — toàn bộ tier prompt, skill, agent manifest và bootstrap script đã gom trong một thư mục duy nhất.

- 3 file `TIER{1,2,3}_PROMPT.md` ở root đã được move và rename thành `.ai-pipeline/tier{1,2,3}.md` (lowercase).
- Toàn bộ thư mục `.claude/` (legacy) đã được xóa sạch — 0 file tracked, nội dung đã được chuyển sang `.ai-pipeline/` từ Phase 2.
- Wrappers (`GEMINI.md`, `CLAUDE.md`, `OPENCODE.md`, `.cursor/rules/hrp.mdc`, `.github/copilot-instructions.md`) hiện reference đủ cả `agents/*.md` lẫn `tier*.md`.

Cấu trúc cuối cùng:

```text
.ai-pipeline/
├── README.md
├── CHANGELOG.md
├── PIPELINE-GUIDE.md        # workflow 3-tier
├── PIPELINE-BOOTSTRAP.md    # onboard Agent mới
├── SKILL-ECOSYSTEM.md       # skill decision matrix
├── tier1.md                 # Tier 1 prompt (Planner)
├── tier2.md                 # Tier 2 prompt (Engineer)
├── tier3.md                 # Tier 3 prompt (Auditor)
├── rules/                   # Tier 1/2/3 rules + global
├── templates/               # TASK/HANDOFF/AUDIT/DOMAIN-KNOWLEDGE
├── agents/                  # Cursor YAML + CROSS-COMPAT
├── skills/                  # 23 skill folders (SKILL.md + references/)
└── scripts/                 # init-project / verify-task / verify-pipeline / run-codegraph
```

## Phase 2 — Skill Ecosystem & Multi-Agent Bootstrap

Kể từ Phase 2, `.ai-pipeline/` là **source of truth duy nhất** cho mọi CLI Coding Agent (Cursor, Antigravity, Claude Code, VSCode Copilot, OpenCode).

- 23 skill folders dùng chuẩn `SKILL.md` + YAML frontmatter (`agents/*` manifest).
- 3 agent files theo chuẩn Cursor tại `agents/{planner,engineer,auditor}.md`.
- `init-project.ps1` regenerate wrapper cho mọi Agent từ source of truth.

```text
.ai-pipeline/
├── README.md           # file này
├── PIPELINE-GUIDE.md   # workflow 3-tier
├── PIPELINE-BOOTSTRAP.md  # onboard Agent mới
├── SKILL-ECOSYSTEM.md  # skill decision matrix
├── rules/              # Tier 1/2/3 rules + global
├── templates/          # TASK/HANDOFF/AUDIT/DOMAIN-KNOWLEDGE
├── agents/             # Cursor YAML + CROSS-COMPAT
├── skills/             # 23 skill folders (SKILL.md + references/)
└── scripts/            # init-project / verify-task / run-codegraph
```

## Nguyên tắc

Một task chỉ có ba file sống:

```text
docs/tasks/<task-slug>/
  TASK.md
  HANDOFF.md
  AUDIT.md
  evidence/   # optional
```

| Artifact | Owner | Nội dung |
|---|---|---|
| `TASK.md` | Tier 1 | Outcome, evidence, decisions, contract, steps, acceptance, risk, audit resolution |
| `HANDOFF.md` | Tier 2 hoặc Figma Owner | Những gì đã làm, diff/artifact, AC evidence, deviation, blocker |
| `AUDIT.md` | Tier 3 | Findings, independent verification, verdict, re-audit history |

Không tách context, plan, acceptance, skill routing, changelog, evidence, blocker hoặc Planner decision thành file riêng.

## Vai trò

- **Tier 1:** ra quyết định và sở hữu TASK; không code.
- **Tier 2:** implementation engineer; tự chọn chi tiết cục bộ trong contract, self-check và sở hữu HANDOFF; không audit.
- **Tier 3:** auditor read-only; sở hữu AUDIT; không fix và không quyết định thay Planner.
- **Sếp:** điều phối, Figma Owner khi làm mockup và nghiệm thu cuối.

Nếu chỉ có hai AI, dùng Planner AI cho Tier 1. Coding AI chạy Tier 2 và Tier 3 ở hai task/context tách biệt; không audit trong conversation vừa code.

## Lifecycle

```text
Tier 1: TASK DRAFT
  -> resolve decisions
  -> TASK READY_FOR_EXECUTION
  -> Executor creates/updates HANDOFF
  -> HANDOFF READY_FOR_AUDIT
  -> Tier 3 appends AUDIT round
  -> PASS: Tier 1/sếp ACCEPTED
  -> FAIL/CONDITIONAL: Tier 1 appends Planner Resolution in TASK
  -> Executor revision
  -> Tier 3 re-audit
```

Spec version chỉ tăng khi contract thay đổi. Execution round tăng khi executor làm lại. Audit round tăng mỗi lần Tier 3 hậu kiểm.

## Traceability

TASK bắt buộc map:

```text
RQ-01 -> STEP-01 -> AC-01
```

Độ chặt được kiểm soát bằng:

- Baseline và spec version.
- Requirement/state/data/permission rules rõ.
- Scope/out-of-scope.
- Verify + stop condition cho step.
- AC nhị phân hoặc đo được.
- Finding `AUD-xxx` có evidence và Planner Resolution.

Không kiểm soát chất lượng bằng việc tăng số lượng tài liệu hoặc ép Planner viết full code trong plan.

## Work Types

| Work type | Executor | Audit focus |
|---|---|---|
| `DESIGN` | Figma Owner | Flow, hierarchy, states, data, accessibility, viewport |
| `CODE` | Tier 2 | Behavior, data/security, regression, build/test/diff |
| `DOCS/DATA/INFRA` | Owner ghi trong TASK | Acceptance/risk tương ứng |

## Commands

Khởi tạo thư mục task root:

```powershell
.\.ai-pipeline\scripts\init-project.ps1
```

Kiểm tra TASK contract:

```powershell
.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\<task-slug>\TASK.md
```

Giao Tier 2:

```text
/code <task-slug>
```

Giao Tier 3:

```text
/audit <task-slug>
```

Với Figma:

```text
/audit-design <task-slug>
```

Tier 1 xử lý audit findings:

```text
/resolve <task-slug>
```

Tạo task mới với yêu cầu inline hoặc brief file:

```text
/plan <task-slug> <yêu-cầu-hoặc-file-brief>
```

## Templates

- `templates/TASK.template.md`
- `templates/HANDOFF.template.md`
- `templates/AUDIT.template.md`
- `templates/DOMAIN-KNOWLEDGE.template.md` là tài liệu cấp dự án, không tạo lại theo task.

## Onboard một Agent mới (Cursor / Antigravity / Claude Code / VSCode Copilot / OpenCode)

```powershell
# Tất cả (5 wrappers)
pwsh .ai-pipeline/scripts/init-project.ps1

# Một Agent cụ thể
pwsh .ai-pipeline/scripts/init-project.ps1 -Agent "antigravity,claude-code"

# Wrapper files sinh ra (đều auto-load)
#   Cursor           → .cursor/rules/hrp.mdc
#   Antigravity       → GEMINI.md
#   Claude Code       → CLAUDE.md
#   VSCode Copilot    → .github/copilot-instructions.md
#   OpenCode          → OPENCODE.md
```

Wrapper files là derived. **Không sửa trực tiếp** — sửa `.ai-pipeline/` rồi re-run init.

Xem chi tiết tại `PIPELINE-BOOTSTRAP.md`.

## Safety

- Không giả lập CodeGraph output khi CLI không có.
- Không tự cài dependency hoặc tạo commit.
- Không ghi đè thay đổi ngoài task.
- Raw evidence chỉ tách file khi quá dài hoặc là ảnh/binary.
- Mọi source/Figma change sau audit phải re-audit.
