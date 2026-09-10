# AI Delivery Pipeline — Product-speed edition

Bộ điều hành Agent portable này ưu tiên tốc độ giao sản phẩm với ba vai trò duy nhất.

> Không lưu secret, credential, PII hoặc log runtime trong `.ai-pipeline/`.

## Bắt đầu trong 60 giây

Agent chỉ đọc `README.md`, `rules/00-global-rules.md`, một role file (`tier0.md`, `tier1.md` hoặc `tier3.md`), rồi work item và skill được dẫn trực tiếp.

## Ba vai trò

| Vai trò | Sở hữu | Quyền chính |
|---|---|---|
| Tier 0 — Owner/Strategic Advisor | Tầm nhìn, ưu tiên, quyết sách, go-live | Trả lời câu hỏi chiến lược và chấp nhận rủi ro; không code, không lập TASK |
| Tier 1 — Delivery Lead | Plan, TASK, source/test, HANDOFF, resolve | Khảo sát, lập plan vừa đủ, code, test, commit/push khi được ủy quyền; gọi sub-agent song song |
| Tier 3 — Lightweight Auditor | AUDIT và finding độc lập | Chỉ audit task được đánh dấu `Audit mode: LIGHT` |

```text
Tier 0 chốt outcome/boundary khi cần
  → Tier 1 khảo sát + TASK ngắn + triển khai + HANDOFF
  → Audit NONE: Tier 1 tự review và resolve
  → Audit LIGHT: Tier 3 kiểm tra trọng yếu, Tier 1 resolve
  → Tier 1 giao hàng; Tier 0 quyết định go-live/rủi ro cấp dự án
```

## Lane và audit

Lane điều chỉnh độ chặt của contract/gate; audit là quyết định riêng do Tier 1 ghi ngay khi lập TASK.

| Lane | Dùng cho | Audit mặc định |
|---|---|---|
| `FAST` | Docs, copy, UI tweak, fix/refactor nhỏ | `NONE` |
| `STANDARD` | Feature/fix cô lập, blast radius hữu hạn | `NONE`; `LIGHT` khi public contract hoặc integration quan trọng |
| `CRITICAL` | Auth/RLS, permission, PII, money, schema/migration, infra/prod | `LIGHT`; `NONE` cần lý do và risk acceptance |

Tier 3 không audit theo thói quen và không lặp full suite/build đã có evidence hợp lệ.

## Artifact canonical

```text
.ai-pipeline/
  README.md
  PIPELINE-GUIDE.md
  tier0.md
  tier1.md
  tier3.md
  rules/  templates/  scripts/  skills/

docs/tasks/<slug>/
  TASK.md
  HANDOFF.md
  AUDIT.md       # chỉ khi Audit mode = LIGHT
  evidence/      # chỉ khi output lớn hoặc cần tái hiện
```

```text
/deliver <slug>  # Tier 1: plan → code → verify → handoff → resolve
/audit <slug>    # Tier 3: chỉ khi TASK yêu cầu LIGHT
```

`/plan` và `/code` là checkpoint nội bộ tương thích, không còn là hai vai trò khác nhau.

## Song song an toàn

- Analysis/research/test review read-only có thể chạy song song trong scope.
- Mutating agents chỉ chạy song song khi file ownership và dependency tách biệt.
- Một Tier 1 coordinator tích hợp, chạy gate cuối và quản lý Git index.
- Có nguy cơ đụng file thì chạy tuần tự hoặc dùng worktree riêng.
- Không dùng `git add .` hoặc `git add -A` trong worktree có WIP khác.

## Kiểm tra

```powershell
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
pwsh .ai-pipeline/scripts/verify-gates.selftest.ps1
```

Chi tiết: [PIPELINE-GUIDE.md](PIPELINE-GUIDE.md). Skill map: [skills/README.md](skills/README.md).
