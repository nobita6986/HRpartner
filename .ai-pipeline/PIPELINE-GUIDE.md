# Hướng dẫn vận hành Pipeline 3-Tier HRP (Đợt 1 chuẩn hoá — 16/08/2026)

> Đọc file này trước khi mở task mới. Áp dụng cho **tất cả task từ ngày 16/08/2026**; task cũ (vd `hrp-phase0-foundation`) đã chốt nên giữ nguyên.

---

## 1. Vài trò & Output bắt buộc

| Tier | Vai trò | File sở hữu DUY NHẤT | Đọc file nào trước | Command gọi |
|---|---|---|---|---|
| **1** | Planner — quyết định nghiệp vụ, kiến trúc, scope; KHÔNG sửa source | `TASK.md` | `.ai-pipeline/tier1.md` + `.ai-pipeline/rules/01-planner-rules.md` + `.ai-pipeline/skills/task-authoring/SKILL.md` | `/plan <slug> <yêu-cầu>` |
| **2** | Implementation Engineer — thực thi đúng contract; tự chọn chi tiết cục bộ; KHÔNG tự audit | `HANDOFF.md` | `.ai-pipeline/tier2.md` + `.ai-pipeline/rules/02-engineer-rules.md` + `.ai-pipeline/skills/code/SKILL.md` | `/code <slug>` (tự tìm nếu không truyền slug) |
| **3** | Independent Auditor — hậu kiểm evidence; KHÔNG sửa source; KHÔNG tự fix | `AUDIT.md` | `.ai-pipeline/tier3.md` + `.ai-pipeline/rules/03-auditor-rules.md` + `.ai-pipeline/skills/audit/SKILL.md` | `/audit <slug>` (tự tìm nếu không truyền slug) |

**3 file sống cùng thư mục:**
```text
docs/tasks/<task-slug>/
  TASK.md       # Tier 1 sở hữu
  HANDOFF.md    # Tier 2 sở hữu
  AUDIT.md      # Tier 3 sở hữu
  evidence/     # Optional, chỉ khi có ảnh/log lớn
```

---

## 2. Workflow tối thiểu cho sếp

```text
1. Sếp có yêu cầu mới.
   ↓
2. Sếp gõ: /plan <slug> <yêu-cầu>
   → Tier 1 (Claude chính) tạo docs/tasks/<slug>/TASK.md
   → Tier 1 chạy verify-task.ps1, sửa đến khi PASS
   → Tier 1 set Status = READY_FOR_EXECUTION
   ↓
3. Sếp duyệt nội dung TASK.md (đọc §1 Outcome + §4 Contract + §5 Execution Plan + §6 Acceptance).
   ↓
4. Sếp gõ: /code <slug>   (hoặc /code nếu chỉ có 1 task READY)
   → Tier 2 (sub-agent riêng) đọc TASK.md, thực thi STEP-01..N
   → Tier 2 chạy verify tương ứng AC, ghi HANDOFF.md
   → Tier 2 set Status = READY_FOR_AUDIT, kết thúc bằng dòng "Handoff status: READY_FOR_AUDIT"
   ↓
5. Sếp gõ: /audit <slug>  (hoặc /audit nếu chỉ có 1 HANDOFF READY_FOR_AUDIT)
   → Tier 3 (sub-agent độc lập) đọc TASK.md + HANDOFF.md
   → Tier 3 tự chạy command/visual check quan trọng (không tin bảng AC của HANDOFF)
   → Tier 3 append AUDIT.md round mới, có verdict PASS/CONDITIONAL/FAIL/BLOCKED
   → Tier 3 kết thúc bằng dòng "Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md."
   ↓
6. Sếp gõ: /resolve <slug>
   → Tier 1 đọc AUDIT.md, với từng AUD-xxx append quyết định vào TASK.md §9 Planner Resolution:
        ACCEPT_FIX / REJECT / DEFER / NEED_USER_DECISION
   → Nếu contract đổi: tăng Spec version, update RQ/STEP/AC/traceability, set REVISION_REQUIRED
   → Nếu chỉ lỗi thực thi: giữ Spec version, mở execution round mới
   ↓
7. Quay lại bước 4 nếu REVISION_REQUIRED.
   ↓
8. Khi AUDIT verdict = PASS và không còn finding mở:
   → Tier 1 set Status = ACCEPTED
   → Sếp nghiệm thu
   → Tier 1 chèn <!-- BASELINE_FROZEN: <commit_sha> <date> --> vào TASK.md
```

---

## 3. Quy tắc viết `TASK.md` (Tier 1)

Dùng đúng template `.ai-pipeline/templates/TASK.template.md`. Bắt buộc có:

1. **Control (§0)**: slug, Work type, Audit mode, Spec version, Status, Baseline, Modules, Current execution round, Current audit round, Next gate.
2. **Outcome (§1)**: user-visible outcome + non-goals.
3. **Evidence (§2)**: chỉ link/file:line; không chép tài liệu nguồn.
4. **Decisions (§3)**: ID `DEC-xx`, type `CHOSEN/ASSUMPTION/NEED_USER_DECISION`.
5. **Contract (§4)**:
   - §4.1 Requirements có ID `RQ-xx`
   - §4.2 Scope boundaries rõ in/out
   - §4.3 Data, State, Permission, Interface rules (hoặc N/A + reason)
6. **Execution Plan (§5)**: STEP có ID `STEP-xx`, target, intent, dependency, verify, stop condition.
7. **Acceptance (§6)**: AC có ID `AC-xx`, pass condition binary/measurable, verification method.
8. **Traceability (§6)**: bảng `RQ-xx → STEP-xx → AC-xx` (đầy đủ).
9. **Risk (§7)**: ID `RISK-xx`, mitigation + rollback.
10. **Open Questions (§8)**: phải rỗng khi `READY_FOR_EXECUTION`.
11. **Planner Resolution (§9)**: Tier 1 append sau mỗi audit round (ACCEPT_FIX/REJECT/DEFER/NEED_USER_DECISION).
12. **Revision Log (§10)**: mỗi lần tăng Spec version → 1 dòng mới.

**Chạy verify:**
```powershell
.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\<slug>\TASK.md
```
Phải ra `RESULT: PASS.` mới được set `READY_FOR_EXECUTION`.

**Không được set `READY_FOR_EXECUTION` khi:**
- Còn `Q-xx` open làm đổi implementation
- Còn `NEED_USER_DECISION` ảnh hưởng scope/state/data/permission/UI/AC
- Có placeholder `<...>` / `TBD` / `TODO` trong contract

---

## 4. Quy tắc viết `HANDOFF.md` (Tier 2)

Dùng đúng template `.ai-pipeline/templates/HANDOFF.template.md`. Bắt buộc có:

1. **Control (§0)**: khớp TASK.md (slug, Work type, Audit mode, Spec version, Execution round, Current audit round).
2. **Outcome Summary (§1)**: ngắn gọn đã làm gì, phần nào chưa xong. **KHÔNG tự ghi audit verdict.**
3. **Execution Trace (§2)**: bảng STEP ↔ file/artifact ↔ kết quả ↔ deviation.
4. **Acceptance Evidence (§3)**: **mỗi AC có command chạy + exit code + evidence path**. Không có = BLOCKED.
5. **Changed Deliverables (§4)**: source/dependency/schema/env/git.
6. **Deviations/Limitations/Blockers (§5)**: ID `BLK-xx`, evidence, impact, decision needed.
7. **Execution Round History (§7)**: ≥ 1 dòng ngay round đầu.

**Kết thúc file bằng dòng cuối:**
```
> Handoff status: READY_FOR_AUDIT
```
hoặc
```
> Handoff status: BLOCKED
```

**Quyền tự chủ của Tier 2:**
- Tự chọn tên private helper, cấu trúc nội bộ, comment.
- Được phép tự sửa lỗi implementation trong scope tối đa 3 vòng cho cùng lỗi.

**Không được Tier 2:**
- Tự thêm dependency/migration/env var mới.
- Tự mở rộng scope ngoài contract.
- Tự tạo/sửa `TASK.md` hoặc `AUDIT.md`.
- Commit/push/merge nếu TASK không yêu cầu.
- Tuyên bố audit pass hoặc task accepted.
- Race condition: nếu HANDOFF round trước đang `BLOCKED` hoặc chưa audit xong → KHÔNG tạo round mới, dừng và hỏi Tier 1.

---

## 5. Quy tắc viết `AUDIT.md` (Tier 3)

Dùng đúng template `.ai-pipeline/templates/AUDIT.template.md`. Bắt buộc có:

1. **Audit Control (§0)**: khớp TASK + HANDOFF.
2. **Findings (§1)**: sắp xếp P0 → P3. Mỗi `AUD-xxx` có severity, status, RQ/AC, evidence, impact, decision needed. **Không viết patch code.**
3. **Acceptance Verification (§2)**: **bảng AC vs kết quả tự kiểm** (PASS/FAIL/BLOCKED/N/A), evidence path, finding liên quan.
4. **Scope/Impact (§3)**: deliverables in scope, out-of-scope changes, blast radius, data/security/migration.
5. **Independent Evidence (§4)**: command/check thật, không kế thừa HANDOFF.
6. **Coverage Gaps (§5)**: phần chưa kiểm tra được, lý do, tác động tới verdict.
7. **Verdict & Questions (§6)**: PASS/CONDITIONAL/FAIL/BLOCKED + reason.
8. **Re-audit Trace (§7)**: bảng round trước → status mới → closure evidence.

**Severity:**
- **P0** — critical: mất dữ liệu, bypass security, sai tiền nghiêm trọng.
- **P1** — high: sai nghiệp vụ chính, regression lớn, AC bắt buộc fail.
- **P2** — medium: rủi ro vận hành/bảo trì đáng kể hoặc thiếu test quan trọng.
- **P3** — low: cải thiện nhỏ không chặn release.

**Verdict:**
- `PASS` — các AC đạt, không có P0/P1/P2 mở.
- `CONDITIONAL` — không có P0/P1; còn P2/P3 cần Planner quyết.
- `FAIL` — có P0/P1, scope creep hoặc AC bắt buộc fail.
- `BLOCKED` — thiếu baseline/artifact/môi trường để kết luận.

**Kết thúc file bằng dòng cuối:**
```
> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
```

**Khi append round mới:** Round `N+1`, `Round opened by` = HANDOFF round mới hoặc Planner Resolution ID.

---

## 6. Quy tắc chống ảo giác (áp dụng mọi Tier)

1. Mỗi khẳng định "đã chạy", "đã pass", "đã sửa" phải có command + output hoặc evidence path.
2. Không bịa file, symbol, dependency, test result, performance number hoặc CodeGraph output.
3. Khi tool không có, ghi limitation; dùng tool read-only tương đương; **không tuyên bố đã dùng tool khi không có**.
4. Phân biệt rõ: kết quả quan sát được, suy luận, đề xuất.
5. Tier 3 audit phải chạy lại ít nhất 1 AC critical từ đầu; không tin bảng AC của HANDOFF.
6. Tier 1 không được tự viết HANDOFF/AUDIT, kể cả khi Tier 2/3 không làm → pipeline broken, dừng và báo sếp.
7. Tier 2 không được tự audit (kể cả self-check). Self-check tạo evidence, không tạo verdict.
8. Tier 3 không được tự fix lỗi, kể cả lỗi typo. Ghi finding, đợi quyết.

---

## 7. Workflow `/code` và `/audit` khi không truyền slug

`code.md` và `audit.md` (file `.claude/commands/`) đã được sửa để:

- **0 task khớp** → in cảnh báo, dừng (không tự tạo task mới).
- **1 task khớp** → dùng luôn, tiếp tục workflow.
- **≥ 2 task khớp** → in bảng, hỏi sếp chọn bằng `AskQuestion`.

Tiêu chí khớp:
- `/code`: task có `Status` ∈ {`READY_FOR_EXECUTION`, `REVISION_REQUIRED`} trong `TASK.md`.
- `/audit`: task có HANDOFF `Status` = `READY_FOR_AUDIT`.

---

## 8. Checklist mở task mới (Tier 1)

Khi sếp gõ `/plan <slug> <yêu-cầu>`, Tier 1 phải:

- [ ] Tạo `docs/tasks/<slug>/` (chưa có thì `.\.ai-pipeline\scripts\init-project.ps1` đã tạo `docs/tasks/`).
- [ ] Copy `.ai-pipeline/templates/TASK.template.md` → `docs/tasks/<slug>/TASK.md`.
- [ ] Điền đủ 12 mục của template.
- [ ] Traceability `RQ → STEP → AC` đầy đủ trong §6.
- [ ] Open Questions (§8) rỗng trước khi set `READY_FOR_EXECUTION`.
- [ ] Chạy `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\<slug>\TASK.md` → `RESULT: PASS.`.
- [ ] Set `Status: READY_FOR_EXECUTION`.
- [ ] Báo sếp: "Task `<slug>` sẵn sàng. Gõ `/code <slug>` để giao Tier 2."

## 9. Checklist sau audit (Tier 1, khi gõ `/resolve`)

- [ ] Đọc `docs/tasks/<slug>/AUDIT.md` round mới nhất.
- [ ] Với từng `AUD-xxx` OPEN, append 1 dòng vào `TASK.md §9 Planner Resolution`:
  - `ACCEPT_FIX` — nếu contract đổi → tăng Spec version, update contract.
  - `REJECT` — nêu evidence, lý do.
  - `DEFER` — owner, deadline, trigger, hậu quả.
  - `NEED_USER_DECISION` — trình sếp chốt.
- [ ] Nếu có `ACCEPT_FIX` làm đổi contract → update §10 Revision Log.
- [ ] Set status:
  - `REVISION_REQUIRED` nếu cần revision.
  - `READY_FOR_EXECUTION` nếu chỉ cần Tier 2 re-run (không đổi contract).
- [ ] Báo sếp: "Đã xử lý audit round N của `<slug>`. Trạng thái: `<status>`. Gõ `/code <slug>` (revision) hoặc nghiệm thu."

## 10. Nghiệm thu (Tier 1 + sếp)

Khi AUDIT verdict = `PASS` và không còn `AUD-xxx` mở:

- [ ] Tier 1 set `Status: ACCEPTED` trong `TASK.md`.
- [ ] Tier 1 chèn comment freeze vào đầu `TASK.md`:
  ```markdown
  <!-- BASELINE_FROZEN: <commit_sha> <YYYY-MM-DD HH:mm TZ> -->
  ```
- [ ] Sếp nghiệm thu (ký tên hoặc ghi nhận trong commit message).

---

## 11. Các file đã thay đổi trong Đợt 1 (16/08/2026)

| File | Thay đổi |
|---|---|
| `.claude/commands/CHANGELOG.md` | MỚI — giải thích archive + đợt 1 |
| `.claude/commands/_archived/*.md` | 47 file cũ được chuyển vào |
| `.claude/commands/code.md` | Sửa — tự tìm task khi `$ARGUMENTS` rỗng |
| `.claude/commands/audit.md` | Sửa — tự tìm HANDOFF READY_FOR_AUDIT khi `$ARGUMENTS` rỗng |
| `.ai-pipeline/templates/TASK.template.md` | Thêm 4 control fields (Audit mode, Current execution round, Current audit round, Next gate); đổi cú pháp bảng sang Markdown chuẩn |
| `.ai-pipeline/templates/HANDOFF.template.md` | Thêm 2 control fields (Audit mode, Current audit round); đổi cú pháp bảng |
| `.ai-pipeline/templates/AUDIT.template.md` | Thêm 2 control fields (Round opened by, Round closes when); đổi cú pháp bảng |
| `.ai-pipeline/PIPELINE-GUIDE.md` | MỚI — file này |

**Chưa đụng (theo kế hoạch):**
- `.ai-pipeline/scripts/verify-task.ps1` — regex vẫn khớp cú pháp bảng mới.
- `.ai-pipeline/rules/*.md` — chưa thêm anti-pattern rule (Đợt 2).
- Các task cũ (`hrp-v4-bod-mockup`, `hrp-phase0-foundation`) — không sửa, đã chốt.

---

## 12. Câu hỏi thường gặp

**Q: Tier 2 không phải là sub-agent riêng, là cùng session với Tier 1 — có OK không?**
A: Theo lý tưởng thì Tier 2 phải là session/context riêng để Tier 3 đọc HANDOFF mà không bị bias. Trong thực tế HRP, task `hrp-phase0-foundation` đã chạy Tier 2 là "sub-agent riêng" theo lệnh founder. Nếu không có sub-agent, Tier 3 phải hiểu đây là self-handoff và giảm tin tưởng vào bảng AC của HANDOFF, tự chạy lại evidence nhiều hơn.

**Q: Tier 3 có được đọc source code để verify không?**
A: Được — đây là phần "Independent Evidence" của audit. Tier 3 KHÔNG được sửa source, nhưng được đọc, grep, chạy command để verify AC.

**Q: AUDIT verdict là CONDITIONAL, có cần revision round không?**
A: Bắt buộc nếu có P0/P1 mở. P2/P3 mở thì Tier 1 quyết: ACCEPT_RISK (giữ) hoặc ACCEPT_FIX (revision).

**Q: Task cũ `hrp-phase0-foundation/TASK.md` không khớp template HRP, có sao không?**
A: Không sao — task đã chốt PASS trước Đợt 1. Từ task tiếp theo trở đi, mọi TASK mới phải khớp template HRP đã chuẩn hoá (file này).

**Q: Khi nào thì `/ship` ra mắt?**
A: Đợt 2 (chờ sếp duyệt Đợt 1). Cùng với `/list`, `verify-handoff.ps1`, `verify-audit.ps1`, `status.ps1`, anti-pattern rules.

---

> Tài liệu này là phần của Đợt 1 chuẩn hoá pipeline. Mọi Tier đọc file này trước khi vào task. Sửa file này khi có Đợt 2 áp dụng.