# CHANGELOG — HRP Pipeline

## Phase 3 — 2026-08-16: Cleanup & Consolidation

### Goal

Một folder `.ai-pipeline/` duy nhất là đủ để onboard sang dự án mới. Gỡ bỏ legacy `.claude/`, gom tier prompts về source of truth.

### Changed

- **Moved + renamed**: `TIER{1,2,3}_PROMPT.md` (root) → `.ai-pipeline/tier{1,2,3}.md` (lowercase, giữ nguyên 100% nội dung).
- **`init-project.ps1`**: mỗi wrapper bây giờ reference đầy đủ cả `agents/{planner,engineer,auditor}.md` lẫn `tier{1,2,3}.md` — không bỏ sót manifest nào.
- **`verify-pipeline.ps1`**: kiểm tra `tier{1,2,3}.md`, `agents/*`, `skills/<name>/SKILL.md`, `init-project.ps1`. Bỏ các check `.claude/commands/*.md` đã lỗi th�i.
- **`PIPELINE-GUIDE.md`**: table Tier 1/2/3 giờ trỏ vào `.ai-pipeline/tier{N}.md` và `skills/<name>/SKILL.md` (folder structure).
- **`PIPELINE-BOOTSTRAP.md`**: cập nhật cây thư mục, bỏ reference `.claude/.mcp.json.example`.
- **`.ai-pipeline/skills/mcp-management/SKILL.md`**: bỏ reference `.claude/.mcp.json.example`.
- **`docs/tasks/hrp-v4-bod-mockup/TASK.md`**: RQ-12 evidence column đổi sang `.ai-pipeline/tier1.md`.
- **`docs/design/TIER1_MOCKUP_DAY1_PROMPT.md`**: 2 chỗ reference TIER1_PROMPT → `.ai-pipeline/tier1.md`.

### Removed

- **Toàn bộ `.claude/`** (legacy): 695 files, 0 file tracked in git trước khi xóa.
  - `.claude/commands/` (kể cả `_archived/`)
  - `.claude/agents/`
  - `.claude/skills/`
  - `.claude/hooks/`, `.claude/scripts/`, `.claude/workflows/`, `.claude/memory/`, v.v.

### Backward compatibility

- Nếu dự án cũ vẫn có `.claude/` (vd. dự án fork trước Phase 3), cần re-run `init-project.ps1` để regenerate wrappers — không tự động dọn.
- Mọi skill rule từng ở `.claude/` đã được port sang `.ai-pipeline/skills/` từ Phase 2.

### Generated wrappers (đã verify)

Sau khi chạy `init-project.ps1` clean:

```
.cursor/rules/hrp.mdc            ✓
GEMINI.md                        ✓
CLAUDE.md                        ✓
.github/copilot-instructions.md  ✓
OPENCODE.md                      ✓
```

Mỗi wrapper reference đầy đủ:

```
.ai-pipeline/agents/{planner,engineer,auditor}.md
.ai-pipeline/agents/CROSS-COMPAT.md
.ai-pipeline/tier{1,2,3}.md
```

---

## Phase 2 — 2026-Q2: Skill Ecosystem & Multi-Agent Bootstrap

### Added

- `agents/{planner,engineer,auditor}.md` — Cursor-compatible agent YAML manifests.
- `agents/CROSS-COMPAT.md` — bản đồ HRP Tier × CLI Coding Agent.
- `PIPELINE-BOOTSTRAP.md` — hướng dẫn onboard mọi Agent.
- 9 skill folders port từ `.claude/`:
  `planning`, `sequential-thinking`, `problem-solving`, `code-review`,
  `research`, `frontend-design`, `databases`, `mcp-management`, `docs-seeker`.
- `scripts/init-project.ps1` regenerate wrappers cho 5 Agent:
  Cursor, Antigravity, Claude Code, VSCode Copilot, OpenCode.

### Changed

- `skills/<name>.md` (flat) → `skills/<name>/SKILL.md` (folder + YAML frontmatter).
  Áp dụng cho cả 14 skill HRP core. Một số skill có thêm `references/`.
- `SKILL-ECOSYSTEM.md` được viết lại theo cấu trúc 23 folder.
- `README.md` thêm section Phase 2 + section Onboard Agent mới.

### Removed

- 14 skill `.md` flat file ở root `skills/` (chuyển vào folder).

### Generated (do init-project.ps1)

Lần chạy đầu:

- `.cursor/rules/hrp.mdc`
- `GEMINI.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `OPENCODE.md`

### Backward Compat

- Các TASK.md / HANDOFF.md / AUDIT.md cũ vẫn dùng được nếu đúng schema template.
- Commands `/plan /code /audit /resolve` không đổi.
- Skills phẳng cũ không còn tồn tại dưới dạng `.md` — phải dùng folder form.

## Phase 1 — 2026-Q1: Standardize Pipeline (đã completed trước)

- Archive 47 legacy Cursor commands sang `.claude/commands/_archived/`.
- Sửa `code.md`, `audit.md` để tự tìm task khi không truyền slug.
- Thêm control fields: `Work type`, `Audit mode`, `Spec version`, `Execution round`, `Audit round`, `Next gate`.
- Đổi table syntax trong template sang Markdown chuẩn.
- Viết `PIPELINE-GUIDE.md` cho workflow chi tiết.
