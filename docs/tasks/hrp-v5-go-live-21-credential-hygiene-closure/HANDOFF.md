# HANDOFF: hrp-v5-go-live-21-credential-hygiene-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-21-credential-hygiene-closure` |
| Work type | `INFRA` |
| Audit mode (phải khớp TASK) | `INFRA_AUDIT` |
| Spec version | `v1.4` CLOSED (TASK.md) — audit round 3 ACCEPTED (CONDITIONAL) |
| Execution round | `3` — `/code` OP execution STEP-07..11 attempt |
| Current audit round | `3` (ACCEPTED CONDITIONAL; AUD-001 carry over) |
| Executor (round này) | Tier 2 — `/code` re-attempt; preflight fail → BLOCKED |
| OP execution | **`OWNER_EXECUTION`** — window 2026-09-08 09:00-09:30 Asia/Bangkok; Owner tự thực hiện STEP-07..11 theo `evidence/op-prep-step{07..11}-template.md`; Tier 2 BLOCKED round 3 |
| Baseline (sếp chỉ định) | `d61ebac` (task 21 HEAD theo commit "docs(task-21): remove duplicate Current audit round row in §0") |
| Worktree HEAD (thực tế) | `a612ae9` — commit `chore(security): untrack check_rls.cjs + sanitize URL — hrp-v6-security-credential-rotation` 2026-09-07 14:55 +07 |
| Pre-flight gate | `verify-task.ps1` exit 0 với `DRAFT-VALID (1 warning)` — A-04 status rỗng |
| Status | **`BLOCKED`** → **`OWNER_EXECUTION`** — sếp chọn Option A §4 HANDOFF; Owner chạy STEP-07..11 trong window 2026-09-08 09:00-09:30 +07 theo `evidence/op-prep-step{07..11}-template.md`; Tier 3 re-audit round 4 sau window |
| Started/updated | `2026-09-07 14:55 Asia/Bangkok` — sếp `/code` yêu cầu OP execution STEP-07..11 trong window 2026-09-08 09:00-09:30 +07 |

> Round này Tier 2 KHÔNG mutate Neon/Vercel/production. Không tạo commit. Không tạo evidence OP nào. Toàn bộ phát hiện dưới đây là preflight evidence để Planner/sếp chốt trước khi mở Owner execution window.

---

## 1. Outcome Summary (round 3 — `/code` re-attempt)

Round 1 + r1-FIX đã đóng Tier 2 prep (`STEP-00..06`). Round 2 OP-prep đã scaffold templates + HANDOFF. Round 3 này nhận `/code` STEP-07..11 OP execution và dừng ở preflight vì **7 blocker cứng** dưới đây.

### 1.1 Tier 2 prep round 1 (carry over, không đổi)
- HEAD task 21 cuối = `d61ebac` (theo lệnh sếp).
- `git ls-files '.env*'` = `.env.example` (1 path) — AC-02 PASS.
- `npx vitest run prisma/seed-portal-demo-password.static.test.ts` = 5/5 GREEN — AC-03 PASS.
- `npx vitest run` (round 3) = 113 files / 1740 tests PASS — AC-10 PASS.
- `npm run build` = exit 0 — AC-10 PASS.
- `node scripts/ops/demo-cleanup.mjs dry-run` × 2 = hash `3fb0d3cc...` (cả 2 lần) — AC-09 dry-run idempotent.
- `node scripts/ops/demo-cleanup.mjs apply` (localhost) = stub exit 0; (Neon non-local) = exit 2 DB gate FAIL — apply fail-closed.

### 1.2 Round 3 phát hiện (mới)
| ID | Phát hiện | Bằng chứng | Hệ quả |
|---|---|---|---|
| `OBS-21-R3-01` | Worktree HEAD thực tế = `a612ae9` (security task commit), KHÔNG phải `d61ebac` (task 21 commit) | `git rev-parse HEAD` + `git log -1 a612ae9` | Tier 2 không ở đúng baseline để thực thi task 21 |
| `OBS-21-R3-02` | AUDIT round 3 đo trên HEAD `199cdab` — commit này đã KHÔNG còn reachable từ `main`; chỉ thấy qua `git log --all` | `git log --oneline --all` | Tier 3 audit round 3 evidence có nguy cơ lệch baseline |
| `OBS-21-R3-03` | Branch atomic `feature/hrp-v5-go-live-21-OP-r3` (mà lệnh sếp nói STEP-09) **không tồn tại** | `git branch -a` | Không có nơi thực hiện OP execution mà không đụng main |
| `OBS-21-R3-04` | Env vars `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `DEMO_CLEANUP_FORCE_LIVE` đều `absent` trong sandbox | `Test-Path env:NEON_API_KEY` etc. | Tier 2 không có cách gọi Neon API / Vercel API — kể cả muốn cũng không làm được |
| `OBS-21-R3-05` | HANDOFF.md vẫn ở spec `v1.3`; AUDIT.md đã ở `v1.4`; TASK.md §0 control row có `status: ''` (rỗng) | `verify-task.ps1` exit 0 / `DRAFT-VALID (1 warning)` A-04 | Gate FAIL cứng theo tier3.md §READINESS GATE ("spec version không khớp / HANDOFF không phải READY_FOR_AUDIT → BLOCKED") |
| `OBS-21-R3-06` | `go21-s07-rotate.txt` / `s08-vercel.txt` / `s09-pitr.txt` / `s10-apply-final.txt` / `s11-final.txt` (lệnh sếp) chưa tồn tại; repo đã có `op-prep-step{07..11}-template.md` với filename khác | Glob trống | Owner dùng template, đặt tên theo `op-prep-index.md` §1 (`go21-s07-rotation.txt`, `go21-s08-deploy.txt`, `go21-s09-revoke.txt`, `go21-s10-cleanup.txt`, `go21-s11-demo.txt`) — không trùng tên lệnh sếp |
| `OBS-21-R3-07` | AUD-001 (P0) carry over vẫn OPEN — `check_rls.cjs` chứa raw Neon credential; task security `hrp-v6-security-credential-rotation` rotate trong cùng window 09:00-09:30 | AUDIT.md §1 AUD-001; `git ls-files check_rls.cjs` | Nếu task 21 rotate Neon owner password trước khi task security rotate `check_rls.cjs`, race condition — task 21 nghĩ đã xong nhưng `check_rls.cjs` còn trỏ credential cũ (sẽ bị revoke ở STEP-09) |

### 1.3 Trạng thái AC (không thay đổi so với round 2)

| AC | Trạng thái round 2 | Trạng thái round 3 | Lý do |
|---|---|---|---|
| `AC-01` | PASS | PASS | Manifest key/path-only đầy đủ |
| `AC-02` | PASS | PASS | `git ls-files '.env*'` = `.env.example` |
| `AC-03` | PASS | PASS | Static test 5/5 |
| `AC-04` | BLOCKED-by-design (OP execution) | **BLOCKED** (preflight fail) | Round 3 chưa có probe nào |
| `AC-05` | BLOCKED-by-design (OP execution) | **BLOCKED** (preflight fail) | Round 3 chưa có deployment |
| `AC-06` | BLOCKED-by-design (OP execution) | **BLOCKED** (preflight fail) | Round 3 chưa áp KEEP/DELETE |
| `AC-07` | BLOCKED-by-design (OP execution) | **BLOCKED** (preflight fail) | Round 3 chưa có before/after |
| `AC-08` | BLOCKED-by-design (OP execution) | **BLOCKED** (preflight fail) | Round 3 chưa có branch listing |
| `AC-09` | PARTIAL (dry-run × 2 idempotent, apply fail-closed) | PASS (dry-run) / BLOCKED (apply) | dry-run vẫn ổn định; apply stub không thể chạy trên prod nếu không có DB safe-read target |
| `AC-10` | PARTIAL (vitest 1740 PASS, build exit 0) | PASS (không regress) | Tier 3 đã đo trước; round 3 không sửa code |
| `AC-11` | FAIL (AUD-001 carry over) | FAIL (AUD-001 carry over) | Thuộc task security, không thuộc task 21 |

---

## 2. Preflight Trace (round 3 — `/code` re-attempt)

| Step | Action | Result | Evidence |
|---|---|---|---|
| Preflight-01 | `git rev-parse HEAD` | `a612ae9` (security task commit) | inline shell |
| Preflight-02 | `git status --short` | `?? README.md`; `?? check_rls.cjs` (sau baseline `d61ebac` nhưng worktree HEAD `a612ae9` đã có) | inline shell |
| Preflight-03 | `git log --oneline --all` lọc `199cdab`/`a612ae9`/`d61ebac` | `a612ae9` (security), `d61ebac` (task 21), `199cdab` (V6 import — chỉ reachable qua `--all`, không trên `main`) | inline shell |
| Preflight-04 | `git branch -a` | chỉ `main` (current), `codex/hrp-vision-portal-aff`, `integrate-gl20`, `worktree-gl20`, `remotes/origin/main`. KHÔNG có `feature/hrp-v5-go-live-21-OP-r3` | inline shell |
| Preflight-05 | `git worktree list` | 1 worktree duy nhất tại `C:/CodeApp/HrP a612ae9 [main]` | inline shell |
| Preflight-06 | `Test-Path env:NEON_API_KEY/VERCEL_TOKEN/VERCEL_PROJECT_ID/DEMO_CLEANUP_FORCE_LIVE` | tất cả `absent` | inline shell |
| Preflight-07 | `Get-ChildItem scripts/ -ErrorAction SilentlyContinue` | `scripts/ops/demo-cleanup.mjs` 6831 bytes (committed ở `6213788`) | inline shell |
| Preflight-08 | `verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` | exit 0 / `RESULT: DRAFT-VALID (1 warning)` — A-04 status rỗng | inline shell |

---

## 3. Blocker cần Planner/sếp chốt (7 mục)

### 3.1 Role boundary — STEP-07..11 là Owner/OP, Tier 2 không có quyền

- TASK.md §3 `DEC-01`: tách hai lane, **Owner/OP** thực thi STEP-07..11, Tier 2 chỉ prep.
- TASK.md §5 Execution Plan cột "Executor": STEP-07..11 ghi rõ "Owner/OP".
- HANDOFF.md round 2 §1: "OP execution OWNER_BLOCKED".
- tier1.md DEC-01 + tier2.md RANH GIỚI #3 ("Không tự thêm dependency, migration, environment variable hay mở rộng scope").
- CLAUDE.md Iron Rule 2 + 3.

Lệnh sếp yêu cầu Tier 2 trực tiếp:
- Trigger Neon API rotate owner password.
- Update 3 env var Vercel.
- Xoá 2 file `.env*.local` (DELETE theo Q-02).
- `demo-cleanup.mjs apply`.

→ Vi phạm cứng 4 ranh giới. Tier 2 không có thẩm quyền.

### 3.2 Window chưa tới

- Q-04 RESOLVED: `Window: 2026-09-08 09:00-09:30 Asia/Bangkok`.
- Hiện tại: 2026-09-07 14:55 +07.
- 18 giờ trước window.
- Lệnh sếp yêu cầu ghi `Status CLOSED -> EXECUTION_DONE (window 09:00-09:30 complete)` — chưa có evidence window nào chạy.

### 3.3 HEAD worktree ≠ baseline

- Lệnh sếp: `Baseline HEAD: d61ebac`.
- Worktree HEAD: `a612ae9` (security task commit).
- Hai khả năng: (a) sếp muốn revert worktree về `d61ebac`; (b) lệnh nhầm baseline.

### 3.4 Status / spec version mâu thuẫn

- TASK.md §0: `Status = CLOSED`.
- HANDOFF.md §0 (bản hiện hành): `Status = READY_FOR_OWNER_EXECUTION`, spec `v1.3`.
- AUDIT.md §0: spec `1.4`.
- Lệnh sếp đòi HANDOFF §0: `Status CLOSED -> EXECUTION_DONE` — không khớp bất kỳ state machine nào.

### 3.5 Không có credential để gọi API

- `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `DEMO_CLEANUP_FORCE_LIVE` đều absent trong sandbox này.
- Kể cả Tier 2 muốn thử cũng fail tại step auth.

### 3.6 Branch atomic STEP-09 không tồn tại

- Lệnh sếp đòi tạo branch `feature/hrp-v5-go-live-21-OP-r3` cho STEP-09 PITR/atomic branch.
- `git branch -a` cho thấy branch này chưa tồn tại.
- Tạo branch mới là thay đổi topology repo — cần Planner phê duyệt, không thuộc scope round 3.

### 3.7 AUD-001 race

- AUD-001 (P0): `check_rls.cjs` raw Neon credential — escalation to `hrp-v6-security-credential-rotation`.
- Task security rotate credential của `check_rls.cjs` trong cùng window 09:00-09:30.
- Nếu task 21 STEP-07 rotate Neon owner password trước, task security chạy sau → `check_rls.cjs` trỏ vào credential mà STEP-09 của task 21 sẽ revoke → `check_rls.cjs` fail. Ngược lại, nếu task security rotate trước và STEP-07 task 21 tạo credential mới cho cùng role, hai bên không đụng nhau nhưng cần confirm thứ tự.

---

## 4. Ba lựa chọn để sếp chốt

> **Sếp chọn: Option A ✅ — 2026-09-07 15:00 Asia/Bangkok**

Tier 2 giữ BLOCKED. Owner chạy STEP-07..11 theo template. Tier 3 re-audit round 4 sau window.

### Option A — RECOMMENDED: Tuân thủ DEC-01 + Owner-trigger (an toàn nhất)

- **Hành động sếp:** giữ nguyên protocol. Sếp (Owner) tự chạy STEP-07..11 trong window 2026-09-08 09:00-09:30 +07 theo `evidence/op-prep-step{07..11}-template.md`. Tier 3 re-audit round 4 sau window.
- **Tier 2 round 3:** giữ BLOCKED. Không tạo commit. Không đụng Neon/Vercel/production. Đợi Owner execution xong rồi nhận evidence từ Owner.
- **Trade-off:** chậm ~18 giờ nhưng đúng pipeline. Không có race với task security. Không scope creep.

### Option B — Sếp override: giao Tier 2 quyền OP execution trong round này

- **Cần trước khi Tier 2 đụng:**
  1. Planner (Tier 1) bump TASK.md spec `v1.4 -> v1.5` với §3 DEC-11 mới: "Round 3 OP execution: Tier 2 được uỷ quyền tạm thời với credential Owner cấp qua channel ngoài repo". Spec version tăng vì contract đổi.
  2. Owner cấp `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `DEMO_CLEANUP_FORCE_LIVE` cho sandbox này (qua channel ngoài repo, KHÔNG commit).
  3. Owner confirm thứ tự với task security để tránh race `check_rls.cjs` (Option B chỉ an toàn nếu task security rotate TRƯỚC task 21 STEP-07).
  4. Sếp reset worktree về baseline `d61ebac` (revert `a612ae9`) hoặc xác nhận worktree hiện tại đang đứng ở task security là intentional.
- **Sau khi đủ 4 điều kiện trên**, Tier 2 sẽ:
  - Tạo branch `feature/hrp-v5-go-live-21-OP-r3` từ baseline đã chốt.
  - Chạy STEP-07..11 theo lệnh sếp, lưu evidence vào `go21-s{07..11}-*.txt` (sếp đặt tên khác với template Owner — chấp nhận nhưng cần Planner chuẩn hoá).
  - Ghi HANDOFF §0 status `EXECUTION_DONE`.
- **Trade-off:** tốn ~30 phút Planner-side + Owner credential provisioning; vi phạm tinh thần DEC-01 nhưng không vi phạm nếu DEC-11 được chốt đúng cách.

### Option C — Defer window: dời OP execution sang window sau

- **Hành động sếp:** giữ nguyên protocol, dời window sang 2026-09-09 hoặc muộn hơn để tách khỏi task security.
- **Tier 2 round 3:** vẫn BLOCKED. Không có gì thay đổi.
- **Trade-off:** mất thêm 1 ngày nhưng giảm rủi ro race.

---

## 5. Deviations (round 3)

| ID | Deviation | Lý do |
|---|---|---|
| `DEV-21-13` (round 3) | Tier 2 KHÔNG thực thi OP execution dù `/code` yêu cầu. 7 blocker cứng ở §3 | Iron Rule + tier2.md §PREFLIGHT + tier2.md §THỰC THI #5 ("kiến trúc / scope creep → dừng") |
| `DEV-21-14` (round 3) | HANDOFF.md viết lại để phản ánh BLOCKED status. Spec vẫn giữ `v1.4` ở TASK.md (Planner-owned); HANDOFF §0 ghi `Spec version v1.4` (khớp AUDIT round 3) thay vì `v1.3` của round 2 | Đồng bộ với AUDIT round 3 |
| `DEV-21-15` (round 3) | Không tạo evidence file `go21-s{07..11}-*.txt` dù lệnh sếp liệt kê. Tên file trong lệnh sếp (`go21-s07-rotate.txt`, `go21-s08-vercel.txt`, `go21-s09-pitr.txt`, `go21-s10-apply-final.txt`, `go21-s11-final.txt`) lệch với `op-prep-index.md` §1 (`go21-s07-rotation.txt`, `go21-s08-deploy.txt`, `go21-s09-revoke.txt`, `go21-s10-cleanup.txt`, `go21-s11-demo.txt`) | Tier 2 không tạo evidence cho Owner; Owner tự đặt tên theo template Owner-side. Nếu sếp muốn tên khác, cần Planner chuẩn hoá |

---

## 6. Evidence Index (round 3 — chỉ preflight)

| File | Purpose |
|---|---|
| (inline shell) | `git rev-parse HEAD`, `git status`, `git log`, `git branch -a`, `git worktree list`, `Test-Path env:*`, `Test-Path scripts/ops/demo-cleanup.mjs`, `verify-task.ps1` |

> Không tạo `evidence/go21-s{07..11}-*.txt` ở round 3. Mọi evidence OP execution thuộc Owner/OP; Tier 3 sẽ đo trong re-audit round 4 sau window.

---

## 7. Owner Action List (carry over, không đổi)

Nhắc lại từ round 2 §7 (chưa có gì thay đổi):

| Q | Question | Owner Answer | Tier 2 status |
|---|---|---|---|
| `Q-01` | Vercel project duy nhất cho `hrpartner.vn`? | `Project: hrp-prod; Production env: Production; Domain: hrpartner.vn` | RESOLVED — STEP-08 dùng đúng |
| `Q-02` | KEEP/DELETE cho `.env.local`, `.env.ops06a-test.local`, `.env.production.local`? | `.env.local=KEEP; .env.ops06a-test.local=DELETE; .env.production.local=DELETE` | RESOLVED — STEP-10 áp dụng |
| `Q-03` | Tracked `.env.dev`/Vercel-generated còn hiệu lực ở provider ngoài Neon/Vercel không? | `Neon only — no external reuse` | RESOLVED — không mở task rotate bổ sung |
| `Q-04` | Maintenance window + PITR restore point cho DEMO cleanup? | `Window: 2026-09-08 09:00-09:30; PITR: 7 days; DEMO data: KEEP (backup to scratch/)` | RESOLVED — STEP-11 chạy trong window |

---

## 8. Risk Index (carry over + round 3 mới)

| ID | Status round 2 | Status round 3 | Note |
|---|---|---|---|
| `RISK-01..04` | OK | OK | Owner execution state machine sẵn |
| `RISK-05` | Open | Open | Secret trong Git history KHÔNG rewrite ở task này (DEC-07) |
| `RISK-06` | OK | OK | Runbook §5 exact-name + negative guard |
| `RISK-07` | Closed | Closed | TEST-01 ACCEPTED |
| `RISK-08` | Open | Open | `.env.example` empty, nhưng tương lai Owner thêm value thật thì FAIL |
| `RISK-09` | Open | Open | AUD-001 `check_rls.cjs` raw credential — task security owns |
| `RISK-10` (new, round 3) | n/a | Open | Nếu Option B được chọn mà thiếu 1 trong 4 điều kiện §4 → race / scope creep / gate FAIL |
| `RISK-11` (new, round 3) | n/a | Open | Worktree HEAD lệch baseline (`a612ae9` vs `d61ebac`); bất kỳ action nào trên worktree hiện tại sẽ ghi vào security task tree, không phải task 21 tree |

---

## 9. Next Step for Planner/Tier 3

1. **Planner/sếp chốt một trong 3 option §4.**
2. Nếu Option A hoặc C: round 3 đóng tại đây. Owner chạy STEP-07..11 theo template. Tier 3 re-audit round 4 sau window.
3. Nếu Option B:
   - Planner bump TASK.md spec `v1.4 -> v1.5` + DEC-11.
   - Owner cấp env vars + reset worktree về baseline + xác nhận thứ tự với task security.
   - Tier 2 mở execution round mới (round 4) với status `READY_FOR_EXECUTION`.
4. Tier 3 sẽ verify `verify-task.ps1` lại sau khi HANDOFF §0 được sửa (`status` không còn rỗng) và `verify-audit.ps1` PASS.

Handoff status: BLOCKED — 7 blocker ở §3 cần Planner/sếp chốt trước khi Tier 2 bắt đầu STEP-07.
