# Quick Start — Onboarding Pipeline vào Dự Án Mới

Tài liệu này ghi lại chính xác cách copy `.ai-pipeline/` vào một dự án mới
và chạy `init-project.ps1` để sinh wrappers. Đây là file best-practice bám
sát — không phải skill đa dụng, không phải rule. Mọi khác-biệt với code
thật ở `scripts/init-project.ps1` đều coi như code là source of truth.

---

## 1. Wrappers là gì — đọc phần này trước khi copy

Mỗi CLI Coding Agent có file auto-load riêng — Agent tự đọc khi bắt đầu
session. Wrapper là file auto-load đó, nội dung chỉ là **index** trỏ về
`.ai-pipeline/`.

| Wrapper | Đường dẫn | Agent đọc |
| --- | --- | --- |
| `.cursor/rules/hrp.mdc` | Cursor IDE/CLI | Cursor |
| `GEMINI.md` | Repo root | Google Antigravity / Gemini CLI |
| `CLAUDE.md` | Repo root | Claude Code CLI |
| `.github/copilot-instructions.md` | `.github/` | GitHub Copilot (VSCode) |
| `OPENCODE.md` | Repo root | OpenCode CLI |

**Tác dụng**:

1. Báo cho Agent biết repo chạy HRP pipeline — phải đọc `.ai-pipeline/`,
   không tự ý làm theo default.
2. Trỏ đúng file cần load — wrapper chỉ chứa index/pointer, không inline
   toàn bộ rule (vì hook/admin chỉ cho phép wrapper ngắn gọn).
3. Ép iron rules: Tier 1 KHÔNG code, Tier 2 KHÔNG tự audit, Tier 3 KHÔNG
   tự fix, evidence phải thật.

**Ai sinh ra?** — `init-project.ps1` chạy 1 lần ở dự án mới sinh ra 5
wrappers; chạy lại mỗi khi `.ai-pipeline/` đổi.

**Quan trọng**: wrappers là **derived** (sinh), không phải source. Sửa
`.ai-pipeline/` rồi chạy lại `init-project.ps1` — wrapper cũ bị overwrite.
**KHÔNG sửa wrapper bằng tay**.

---

## 2. Workflow bootstrap dự án mới

### Bước 1 — Copy `.ai-pipeline/` sang dự án mới

Từ repo HRP (đã có `.ai-pipeline/` hoàn chỉnh):

```powershell
# PowerShell
Copy-Item -Recurse .ai-pipeline C:\CodeApp\<ProjectMoi>\.ai-pipeline
```

```bash
# Bash / zsh / WSL
cp -r .ai-pipeline ../<ProjectMoi>/.ai-pipeline
```

> Có thể copy bằng Explorer/Finder — đó là 1 folder duy nhất, không có
> symlink hay dependency ngoài.

### Bước 2 — Chạy `init-project.ps1` để sinh wrappers

```powershell
cd C:\CodeApp\<ProjectMoi>
pwsh .ai-pipeline/scripts/init-project.ps1
```

Mặc định sinh cả 5 wrappers. Muốn giới hạn:

```powershell
pwsh .ai-pipeline/scripts/init-project.ps1 -Agent "cursor,claude-code"
```

Sau lệnh, repo mới có các file:

- `.cursor/rules/hrp.mdc`
- `GEMINI.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `OPENCODE.md`

### Bước 3 — Verify pipeline nguyên vẹn

```powershell
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
```

Nếu OK, script in `RESULT: PASS`. Nếu FAIL — xem phần "Troubleshooting"
phía dưới.

### Bước 4 — Commit

```powershell
git add .ai-pipeline/ .cursor/ .github/ CLAUDE.md GEMINI.md OPENCODE.md
git commit -m "chore(pipeline): bootstrap HRP pipeline via init-project.ps1"
```

> Commit cả `.ai-pipeline/` lẫn wrappers — các Agent khác mở repo sẽ cần
> đọc wrapper để biết pipeline.

---

## 3. One-liner tiện dụng (tuỳ chọn)

Nếu sếp muốn tự động hoá toàn bộ bootstrap, tạo `bootstrap-new-project.ps1`
ở ngoài repo (không commit):

```powershell
# bootstrap-new-project.ps1 — chạy ở máy sếp
param(
    [Parameter(Mandatory)] [string] $Destination
)
Copy-Item -Recurse .ai-pipeline $Destination
Set-Location $Destination
pwsh .ai-pipeline/scripts/init-project.ps1
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
Write-Host "Done. Next: commit pipeline + wrappers."
```

Dùng:

```powershell
.\bootstrap-new-project.ps1 -Destination C:\CodeApp\<ProjectMoi>
```

---

## 4. Khi nào cần chạy lại `init-project.ps1`?

| Tình huống | Cần chạy lại? |
| --- | --- |
| Sửa rule/agent/skill trong `.ai-pipeline/` | **Có** |
| Onboard thêm agent mới (Continue.dev, Aider, Codex…) | **Có** |
| Thấy wrapper "lệch" với `.ai-pipeline/` | **Có** |
| Mở session mới ở repo HRP hiện tại | Không — wrapper đã có |
| Làm task bình thường theo pipeline | Không — Tier 1/2/3 đã index sẵn |

`init-project.ps1` là **idempotent** — chạy nhiều lần không hỏng. Chỉ
overwrite wrappers từ source, không có side effect khác.

---

## 5. Troubleshooting verify-pipeline.ps1 FAIL

| Lỗi | Nguyên nhân | Sửa |
| --- | --- | --- |
| "Missing: `.ai-pipeline/agents/planner.md`" | Bước 1 copy thiếu | Chạy lại `Copy-Item -Recurse` |
| "Wrapper `.cursor/rules/hrp.mdc` not found" | Bước 2 chạy init lỗi | Chạy lại `pwsh .ai-pipeline/scripts/init-project.ps1` |
| "Wrapper references old path `tier1.md`" | `.ai-pipeline/` mới đổi path | Bước 2 đã chạy → wrapper tự cập nhật; nếu không → chạy lại |
| "PowerShell not found" | Dự án chỉ có bash | Đổi `pwsh` → `bash .ai-pipeline/scripts/init-project.sh` (nếu có) hoặc cài PowerShell 7+ |

---

## 6. First task sau bootstrap

Sau khi wrappers có rồi, mở bất kỳ Agent nào trong repo mới — Agent sẽ
đọc wrapper, tải `.ai-pipeline/tier{1,2,3}.md` + `.ai-pipeline/agents/*`,
rồi sẵn sàng theo pipeline. Bắt đầu task:

```
/plan <slug-task> <yêu-cầu-bằng-tiếng-Việt>
```

Tier 1 (Planner) sẽ tạo `docs/tasks/<slug>/TASK.md` đúng template, chờ
sếp duyệt, chuyển Tier 2 — workflow quen thuộc của HRP.

---

Tác giả: HRP pipeline team. Cập nhật lần cuối: Phase 3 cleanup commit
(`781335e`).
