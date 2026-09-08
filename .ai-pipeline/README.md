# AI Delivery Pipeline — Portable Kit

Đây là **cửa vào duy nhất** của bộ điều hành Agent. Thư mục này được thiết kế để copy nguyên khối vào root của một repository mới.

> Không lưu password, token, connection string, PII hoặc log runtime trong `.ai-pipeline/`.

## 1. Agent mới chỉ đọc ba thứ

1. `.ai-pipeline/README.md` — bản đồ hệ thống.
2. `.ai-pipeline/rules/00-global-rules.md` — luật chung.
3. File đúng vai trò: `tier0.md`, `tier1.md`, `tier2.md` hoặc `tier3.md`.

Sau đó Agent chỉ đọc artifact của công việc hiện tại và skill được file vai trò yêu cầu. **Không đọc toàn bộ thư viện skill.**

## 2. Vị trí, quyền và sản phẩm bàn giao

| Tầng | Vị trí | Quyền quyết định | Artifact sở hữu |
|---|---|---|---|
| Tier 0 — Owner/Chief Architect | Trên toàn bộ pipeline | Chiến lược, ưu tiên, go-live, rủi ro, quyền đặc biệt | Roadmap/quyết sách cấp dự án |
| Tier 1 — Planner | Điều phối delivery | Scope, contract, assurance lane, nghiệm thu | `TASK.md` |
| Tier 2 — Engineer | Thi công | Quyết định kỹ thuật trong contract | Source/test + `HANDOFF.md` |
| Tier 3 — Auditor | Xác minh độc lập | Verdict và finding; không sửa code | `AUDIT.md` |

Luồng mặc định:

```text
Tier 0 định hướng
  → Tier 1 viết TASK
  → Tier 2 thi công và HANDOFF
  → Tier 3 audit khi lane yêu cầu
  → Tier 1 resolve
  → Tier 0 quyết định release/go-live khi cần
```

Mặc định **một worktree chỉ có một Tier 2 đang thi công**. Tier 0 chỉ mở song song khi partition file và dependency thực sự độc lập.

## 3. Assurance lane

| Lane | Dùng cho | Đường đi |
|---|---|---|
| `FAST` | Docs, copy, style hoặc local refactor nhỏ; không đổi data/security/public contract | Tier 2 → Tier 1 review |
| `STANDARD` | Feature/fix cô lập, blast radius hữu hạn | Tier 2 → Tier 3 focused audit → Tier 1 |
| `CRITICAL` | Schema, migration, auth/RLS, permission, PII, money, infra, production, shared config | Tier 2 → Tier 3 deep audit → Tier 1 |

Task lịch sử thiếu lane được coi là `CRITICAL`. Tier 1/Owner có quyền nâng lane; không hạ lane chỉ để đi nhanh.

## 4. Cấu trúc canonical

```text
.ai-pipeline/
  README.md
  PIPELINE-GUIDE.md
  tier0.md
  tier1.md
  tier2.md
  tier3.md
  rules/
  templates/
  scripts/
  skills/
```

Các file `tier0..3.md` là **nguồn sự thật duy nhất về vai trò**. Ba file role-specific trong `rules/` chỉ được giữ để liên kết từ task lịch sử không bị gãy.

## 5. Artifact của từng task

```text
docs/tasks/<slug>/
  TASK.md
  HANDOFF.md
  AUDIT.md       # STANDARD/CRITICAL; FAST chỉ khi escalated
  evidence/      # chỉ cho output lớn, LIVE transcript hoặc ảnh cần lưu
```

Commands quy ước:

```text
/plan <slug>       # Tier 1
/code <slug>       # Tier 2
/audit <slug>      # Tier 3
/resolve <slug>    # Tier 1
```

## 6. Prompt khởi động Agent

```text
Đọc .ai-pipeline/README.md, .ai-pipeline/rules/00-global-rules.md và
.ai-pipeline/<ROLE_FILE>. Tuân thủ đúng quyền của vai trò đó. Sau đó đọc
<WORK_ITEM> và thực hiện phần việc được giao; không tự nhận thêm vai trò.
```

Ví dụ: Tier 2 dùng `<ROLE_FILE> = tier2.md`, `<WORK_ITEM> = docs/tasks/<slug>/TASK.md`.

## 7. Copy sang dự án mới

1. Copy nguyên thư mục `.ai-pipeline/` vào root repository.
2. Không copy `.env*`, secret, evidence hay task của dự án cũ vào trong thư mục này.
3. Bổ sung policy đặc thù dự án vào `rules/00-global-rules.md` hoặc tài liệu dự án; không nhân bản role file.
4. Chạy:

```powershell
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
pwsh .ai-pipeline/scripts/verify-gates.selftest.ps1
```

Chi tiết vòng đời: [PIPELINE-GUIDE.md](PIPELINE-GUIDE.md). Bản đồ skill: [skills/README.md](skills/README.md).
