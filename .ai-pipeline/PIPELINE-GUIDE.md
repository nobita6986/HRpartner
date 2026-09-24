# AI Delivery Pipeline — Operating guide

> Ưu tiên giao giá trị nhanh. Chỉ thêm ceremony khi rủi ro thực tế biện minh cho chi phí đó.

## Trách nhiệm

| Tier | Trách nhiệm | Boundary |
|---|---|---|
| Tier 0 | Outcome, ưu tiên, boundary phase, quyết định sản phẩm/go-live/risk acceptance | Không code, không viết TASK/plan chi tiết, không audit thường nhật |
| Tier 1 | Khảo sát, plan vừa đủ, TASK, implementation, test, HANDOFF, resolve và delivery | Không tự đổi quyết sách chiến lược; không tự phát hành verdict Tier 3 |
| Tier 3 | Audit nhẹ, độc lập, theo changed surface quan trọng | Không sửa source/TASK/HANDOFF; không mở rộng scope |

Tier 1 tự quyết kỹ thuật thường nhật. Chỉ hỏi Tier 0 khi thiếu business decision, đổi roadmap/scope lớn, có thao tác khó đảo ngược, cần risk acceptance hoặc go-live authority.

## Một luồng delivery

```text
INTAKE → Tier 1 khảo sát → TASK + lane/audit
       → T0 contract review một lượt → READY_TO_CODE → verify-task
       → Tier 1 implement + self-review + canonical gates
       → commit implementation → freeze exact SHA
       → HANDOFF + verify-handoff
       → NONE: Tier 1 spot-check | LIGHT: Tier 3 audit frozen SHA
       → tối đa 1 correction batch → DELTA recheck nếu cần
       → resolve → commit/push/deploy khi đã được ủy quyền
```

Tier 1 không chờ một Executor riêng. Plan và code thuộc cùng một owner; thay đổi contract vẫn phải ghi Revision Log.

## Ba delivery gate

| Gate | Điều kiện vào | Điều kiện ra |
|---|---|---|
| `READY_TO_CODE` | Decisions đóng, baseline/file ownership/environment rõ | `verify-task` PASS |
| `FROZEN_DELIVERY` | Self-review và canonical gates xong | Exact committed Implementation SHA; không còn semantic delta |
| `AUDIT_COMPLETE` | Tier 3 nhận frozen SHA | Một verdict và toàn bộ findings current surface; tối đa một correction batch |

Không dùng audit để tìm lỗi formatting mà verifier hoặc Tier 1 self-review có thể tìm trước. Không audit working tree chưa freeze.

## Contract theo rủi ro

- `FAST`: outcome, boundary, 1–3 RQ, 1–4 STEP, 1–5 AC, targeted gate.
- `STANDARD`: thêm interface/data/risk thực sự áp dụng.
- `CRITICAL`: thêm permission/state/migration/LIVE/rollback theo changed surface.

Không bắt full suite/build theo thói quen. Một evidence có thể chứng minh nhiều AC. Không tạo AC cho thao tác hành chính.

## BUILD_VS_ADOPT

Mọi task V2 khai `Build vs adopt: N/A | ADOPT | CUSTOM` trước `READY_TO_CODE`.

- Dùng `ADOPT` khi thêm library cho capability phổ thông; ghi license, package/version, runtime compatibility, portability/lock-in, wrapper do repo sở hữu và regression test tại wrapper.
- Dùng `CUSTOM` chỉ với marker `CUSTOM_BUILD_JUSTIFICATION` và evidence candidate hiện có không phù hợp.
- Dùng `N/A` khi không thêm/thay dependency hoặc shared framework và không tự tạo capability kỹ thuật phổ thông.
- T0 chỉ chốt trade-off sản phẩm/license/lock-in lớn; T1 tự chọn routine package trong authority đã giao.

Roadmap dự án có thể đặt default candidate, nhưng package/version cuối cùng luôn được pin trong TASK + lockfile sau compatibility check.

## Chọn audit trong TASK

| Audit mode | Khi dùng | Handoff |
|---|---|---|
| `NONE` | Mặc định cho phần lớn task; Tier 1 tự review | `READY_FOR_REVIEW` |
| `LIGHT` | Auth/data/money/migration/prod, public contract quan trọng, shared foundation hoặc blast radius cao | `READY_FOR_AUDIT` |

Tier 1 ghi `Audit reason` một câu. `CRITICAL + NONE` phải ghi lý do và người chấp nhận rủi ro. Artifact cũ dùng `FOCUSED`, `DEEP`, `DELTA`, `FULL` vẫn được đọc tương thích; task mới chỉ dùng `NONE | LIGHT`.

## Sub-agent concurrency

1. Tier 1 ghi output, input và file ownership của từng nhánh.
2. Research, code-reading và test analysis được chạy song song.
3. Mutating agents chỉ song song khi allowlist không giao nhau và không có dependency thứ tự.
4. Một coordinator tích hợp, chạy gate cuối, viết HANDOFF và stage/commit.
5. Có conflict hoặc shared file thì chuyển tuần tự.

Không cần Tier 0 duyệt từng sub-agent trong boundary đã giao.

WIP mặc định cho một stream là `1 planning + 1 coding + 1 auditing`. Có thể pipeline T1A chuẩn bị task N+1, T1B code task N và T3 audit task N-1 nếu file ownership tách biệt.

## Evidence và blocker

```text
E-01 | command/method | baseline/environment | exit/result | artifact nếu có
```

Mọi PASS dựa trên phép đo thật. `ENV_BLOCKED`, skipped test hoặc fixture giả không phải PASS. Chỉ ghi `BLOCKED` khi thiếu business decision, authority, dependency hoặc environment bắt buộc.

## Audit nhẹ

Tier 3 chỉ hỏi: outcome trọng yếu có đạt, có regression nghiêm trọng, diff có vượt scope/secret/bypass, và còn release blocker không. Audit cần tối thiểu hai phép đo độc lập, gồm một changed-behavior check; luôn có C-07 Git hygiene, C-09 contract validity và C-10 diff scope. Không bắt C-01..C-10 đầy đủ. Auditor phải báo toàn bộ finding hiện thấy trong một lượt; DELTA không mở lại unchanged surface nếu không có evidence mới.

## Round budget

- Contract review: một lượt đầy đủ; correction trước code nếu cần.
- Implementation: Tier 1 tự review trước freeze.
- Audit: một LIGHT round và tối đa một correction batch/DELTA round.
- Nếu vẫn còn blocker sau budget: Tier 0 nhận correction hoặc tách task; không kéo dài chuỗi code/review/code lại.

## Bộ kiểm tra

```powershell
pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
pwsh .ai-pipeline/scripts/verify-gates.selftest.ps1
```
