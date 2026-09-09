# TIER 2 REPORT → Tier 1 (Planner) — `hrp-phase3-integrity`

> **Tác giả:** Tier 2 (Engineer), session 16/08/2026 22:48 ICT.
> **Mục đích:** Báo cáo mâu thuẫn pipeline phát hiện khi nhận lệnh `/code hrp-phase3-integrity` — nhờ Tier 1 (Planner) xem xét trước khi Tier 2 tiếp tục round execution 1.
> **Scope report:** Chỉ chạm pipeline governance — KHÔNG đề xuất contract change; KHÔNG tự sửa TASK.md (iron rule Tier 2 § "Không được Tier 2: Tự tạo/sửa TASK.md hoặc AUDIT.md").

## TL;DR

Tier 2 phát hiện **3 vấn đề runtime** ảnh hưởng khả năng thực thi TASK `hrp-phase3-integrity` v1.1 `READY_FOR_EXECUTION`. Tất cả đều có căn cứ thực tế (commit, file, lệnh) — **chưa có verdict cuối**; cần Tier 1 confirm.

## Vấn đề 1 — Baseline mismatch (đã GIẢI — ghi nhận làm lịch sử)

**Phát hiện ban đầu:** TASK §0 ghi "Baseline = `e963d82` (tenant-scope ACCEPTED, verdict PASS 10/10 AC)". Tier 2 nghi ngờ baseline sai vì worktree lúc đó chỉ thấy `e99f11f`.

**Sau khi verify (Tier 2 làm):**

- `git cat-file -t e963d82` → `commit` (tồn tại).
- `git log e963d82 -1` → `docs(task): hrp-phase2-tenant-scope ACCEPTED — Planner Resolution round 2 (verdict PASS, 10/10 AC)` (Author: `thuanndbx@gmail.com` Co-author `Claude <noreply@anthropic.com>`).
- Tier 2 đã ghi nhận lịch sử này để Tier 1 đối chiếu với manifest commit gốc (vì author hiển thị `unknown` trong một số trường hợp — không phải blocker).

**Kết luận:** Baseline đúng. Phần này chỉ mang tính kiểm tra Tier 2 — không cần Tier 1 phản hồi.

## Vấn đề 2 — Working tree "sạch" hơn kỳ vọng

**Quan sát:** Sau khi Tier 2 round 2 của `hrp-phase2-tenant-scope` stage `HANDOFF.md + scripts/_t3-dryrun-rollback.mjs` (nhưng Tier 2 không tự commit theo iron rule), expected: working tree còn 2 staged file đó.

**Thực tế quan sát tại session Phase 3:**

```
$ git status --short
 M appBCC/agent_mapper.py                    ← sếp dirty (Phase 2 không đụng)
 M appBCC/app.py                             ← sếp dirty + Tier 2 round 2 sửa 1 dòng env
?? docs/roadmap-hrp-v4 - Copy.html           ← untracked ngoài task
?? docs/tasks/hrp-gitlab-mirror/             ← task khác
?? docs/tasks/hrp-phase1-bcc-fence/AUDIT.md  ← task khác
```

**Hai file đáng lẽ đang staged `M` đã không còn:**

- `docs/tasks/hrp-phase2-tenant-scope/HANDOFF.md` — đáng lẽ Modified (Tier 2 round 2 đã sửa).
- `scripts/_t3-dryrun-rollback.mjs` — đáng lẽ Added (Tier 2 round 2 đã tạo).

→ **Có hai cách giải thích có thể:** (a) sếp hoặc một Tier 2 khác đã commit hai file đó vào `e963d82` (xác minh: trong `git show e963d82 --stat` thấy đúng 2 file đó nằm trong commit ACCEPTED); (b) working tree bị reset bởi một sub-agent khác. Xác minh nhanh: commit `e963d82` có đúng 4 file (`HANDOFF.md`, `AUDIT.md`, `TASK.md`, `_t3-dryrun-rollback.mjs`) → khớp (a).

**Kết luận:** Cách (a). Kết quả là HANDOFF/AUDIT round 2 của Phase 2 đã được đóng sạch trong commit `e963d82` — Tier 2 phase hiện tại (round 1 Phase 3) **không có HANDOFF cũ đang READY_FOR_AUDIT** để vi phạm anti-race rule. Tiếp tục được.

**Câu hỏi cho Tier 1 (nếu có):** Có cần lưu vết "ai đã thực commit round 2 của Phase 2 giữa 2 session" không? (Mình không thấy trace từ pipeline logs.)

## Vấn đề 3 — `verify-task.ps1` FAIL cho TASK Phase 3 (MÂU THUẪN CONTRACT)

**Quan sát (Tier 2 chạy lệnh):**

```powershell
PS> .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-phase3-integrity\TASK.md

TASK CONTRACT CHECK: .\docs\tasks\hrp-phase3-integrity\TASK.md
  [WARN] Task is not READY_FOR_EXECUTION; placeholder checks are non-blocking.
  [FAIL] Requirement RQ-03 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-04 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-05 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-06 has no direct RQ -> STEP -> AC traceability row.

RESULT: FAIL (4 error(s), 1 warning(s)).
```

**Phân tích nguyên nhân từ `verify-task.ps1:96`:**

```powershell
$tracePattern = "\|\s*$([regex]::Escape($rqId))\\s*\|\s*STEP-\d{2,}\s*\|\s*AC-\d{2,}\s*\|"
```

Regex bắt buộc 1 cell chứa **đúng 1 STEP**, không có dấu phẩy giữa các STEP.

**Nhưng TASK Phase 3 §6 Traceability có nhiều RQ multi-STEP:**

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-03` | `STEP-03, STEP-06` | `AC-03` |
| `RQ-04` | `STEP-04, STEP-06` | `AC-04` |
| `RQ-05` | `STEP-05, STEP-06` | `AC-05` |
| `RQ-06` | `STEP-07` | `AC-02, AC-04, AC-05, AC-06` |

→ 4 row vi phạm regex. RQ-06 vi phạm vì cell Acceptance có 4 mục (regex hiểu `AC-02` đầu nhưng regex trace bên TRACE chỉ check 1 token).

**Quan trọng — Phase 2 TASK cũng fail cùng pattern:**

```powershell
PS> .\verify-task.ps1 -TaskPath .\docs\tasks\hrp-phase2-tenant-scope\TASK.md

  [FAIL] Requirement RQ-02 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-04 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-07 has no direct RQ -> STEP -> AC traceability row.
  [FAIL] Requirement RQ-10 has no direct RQ -> STEP -> AC traceability row.

RESULT: FAIL (4 error(s), 1 warning(s)).
```

→ Đây là **known issue từ Phase 2 đã ACCEPTED**. Hai cách giải quyết đã thấy trong ngữ cảnh lịch sử:

1. **Tier 1 sửa TASK để gộp STEP thành 1 cell** (RQ-03 chỉ `STEP-03`, gộp STEP-06 vào STEP-03 trong §5) — vi phạm design Phase 3 (SEQ refactor STEP-06 quan trọng).
2. **Tier 1 / maintainer cập nhật `verify-task.ps1`** để regex chấp nhận multi-STEP cell — fix gốc.

**Câu hỏi cho Tier 1 (BẮT BUỘC):**

- (a) Sửa TASK §6 Traceability để pass verify, giữ logic multi-STEP nhưng rewrite cell theo format verify hiểu? Hay:
- (b) Cập nhật `verify-task.ps1` regex để chấp nhận multi-STEP cells (và cả multi-AC cells)? Hay:
- (c) Mặc kệ verify FAIL vì Phase 2 cũ đã pass, coi như "known issue"? Tier 2 sẽ ghi nhận `[Known Issue]` trong HANDOFF round 1 §2 và để Tier 3 round 1 verdict.

> Tier 2 KHÔNG tự quyết câu này — vi phạm iron rule "không tự sửa TASK.md".

## Vấn đề 4 (Bonus) — Tier 2 nhận được câu lệnh mâu thuẫn từ sếp

**Bối cảnh:** Sau khi Tier 2 trình bày kế hoạch đầy đủ STEP-01..08 cho Phase 3, sếp trả lời AskQuestion với option `strict_1commit` (đổi 1 dòng env + 1 HANDOFF.md). Option này:
- Hợp lệ cho Phase 2 round 2 (1 dòng env swap + 1 HANDOFF update);
- **KHÔNG hợp lệ** cho Phase 3 round 1 — vì TASK contract có 8 RQ/STEP/AC yêu cầu schema delta + 4 helper mới + refactor ticket service + runbook.

Nếu Tier 2 thi hành `strict_1commit` cho Phase 3 round 1, sẽ tự tạo HANDOFF round 1 thiếu evidence cho 7/8 AC → Tier 3 verdict FAIL.

→ Tier 2 chọn **dừng, escalate**, KHÔNG thi hành. Đây là hành vi tuân thủ `tier2.md`:
> "**Không được Tier 2:** Tự mở rộng scope ngoài contract. Tự tạo/sửa TASK.md hoặc AUDIT.md."

**Câu hỏi cho Tier 1 (nếu có):** Có cần thiết kế lại interaction pattern để Tier 2 không nhận lệnh mâu thuẫn với TASK contract? Ví dụ Tier 1 đặt blocker bằng cách REVERT status từ `READY_FOR_EXECUTION` về `IN_REVIEW` trước khi sếp gõ `/code`?

## Trạng thái hiện tại (do Tier 2)

- **KHÔNG tạo file mới ngoài report này.** Đã đọc schema, ticket.service, contract đầy đủ.
- **KHÔNG sửa code.** Không chạm `prisma/schema.prisma`, `ticket.service.ts`, không tạo `src/shared/integrity/*`.
- **KHÔNG tạo HANDOFF round 1** (vì chưa có execute thực sự).
- HANDOFF.md của task `hrp-phase3-integrity` **chưa tồn tại** (`Glob` chỉ thấy `TASK.md`).
- AUDIT.md của task `hrp-phase3-integrity` **chưa tồn tại**.
- Working tree modified: `appBCC/agent_mapper.py` (sếp dirty), `appBCC/app.py` (sếp dirty + Tier 2 round 2 Phase 2 đổi 1 dòng env CHƯA stage), không có thay đổi cho Phase 3.

## Yêu cầu Tier 1 (Planner) phản hồi

**Ưu tiên 1 — Vấn đề 3:** Quyết chọn (a) / (b) / (c). Nếu chọn (a), xin cập nhật TASK §6 rồi Tier 2 chạy verify-task.ps1 PASS rồi mới thi hành. Nếu chọn (b), Tier 1 có thể tự sửa `.ai-pipeline/scripts/verify-task.ps1` (đây là file do Tier 1/maintainer sở hữu).

**Ưu tiên 2 — Vấn đề 4:** Có cần cập nhật `PIPELINE-GUIDE.md` hoặc `tier2.md` để Tier 2 dừng giữa round execution khi phát hiện mâu thuẫn giữa lệnh sếp và TASK contract? Hay coi như đã handle bằng "ask sếp/Planner" rule có sẵn?

**Ưu tiên 3 — Lịch sử commit:** Xác nhận có sếp/agent nào can thiệp giữa 2 session Tier 2 round 2 (Phase 2) và Tier 2 mở round 1 (Phase 3) hay không? Có thể giữ audit trail rõ ràng.

## Phụ lục — Output đầy đủ các lệnh kiểm tra (reproducible)

```powershell
# 1. Baseline
git cat-file -t e963d82
git log e963d82 -1 --format="%h %s%n%an <%ae>"

# 2. Verify-task.ps1 cho cả 2 task
.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-phase3-integrity\TASK.md
.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-phase2-tenant-scope\TASK.md

# 3. Working tree
git status --short
git show e963d82 --stat
```

---

> Hết báo cáo. Tier 2 dừng đợi Tier 1 phản hồi / sếp phát lệnh mới.
