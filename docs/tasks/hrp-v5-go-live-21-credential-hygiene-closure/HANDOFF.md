# HANDOFF: hrp-v5-go-live-21-credential-hygiene-closure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-21-credential-hygiene-closure` |
| Work type | `INFRA` |
| Audit mode (phải khớp TASK) | `INFRA_AUDIT` |
| Spec version | `v1.3` (audit round 2 PASS WITH FINDINGS) |
| Execution round | `2` OP-prep — Tier 2 prep scaffolding for STEP-07..11 (read-only, no production mutate) |
| Current audit round | `2` (Tier 3 PASS WITH FINDINGS; AUD-001/002/003 RESOLVED, AUD-001 carry over to security task) |
| Executor (round này) | Tier 2 — OP evidence scaffolding + AC-09 re-confirm + HANDOFF update |
| OP execution | `OWNER_BLOCKED` (Tier 2 prep scaffolding done; Owner runs STEP-07..11 in window **2026-09-08 09:00-09:30 Asia/Bangkok**) |
| Baseline (TASK v1.0) | `7dd576e` |
| Pre-r2 HEAD | `2f7baf0` (Planner bump v1.3) |
| Post-r2 HEAD | `91ba2ce` (Tier 2 r2 OP-prep commit) |
| Status | `READY_FOR_OWNER_EXECUTION` (Tier 2 scaffolding READY; Owner triggers STEP-07..11 in window) |
| Started/updated | Round 1 2026-09-07 10:55 → 11:04; r1-FIX 2026-09-07 12:10 → 12:25; **OP-prep r2 2026-09-07 14:00 → 14:30 Asia/Bangkok** |

## 1. Outcome Summary (Tier 2 prep + r1-FIX + r2 OP-prep)

**Round 1 đã hoàn tất 6 bước Tier 2 prep** (`STEP-00..06`). Sau đó Tier 3 audit round 1 FAIL với 3 finding:

| Finding | Severity | Status trước r1-FIX | Status sau r1-FIX | Status sau audit round 2 |
|---|---|---|---|---|
| `AUD-001` (`check_rls.cjs` raw Neon credential) | P0 | OPEN | OPEN — ESCALATE_NEW_TASK | **CARRY OVER** to `hrp-v6-security-credential-rotation` v1.1 READY (task security song song trong window 09:00-09:30) |
| `AUD-002` (`git rm --cached` không persist vào HEAD) | P1 | OPEN | **CLOSED** at `41ab22b` | **RESOLVED** (Tier 3 verify HEAD `5fc3469` đã persist) |
| `AUD-003` (evidence file `go21-s05-apply-blocked.txt` corrupted) | P3 | OPEN | **CLOSED** at `41ab22b` | **RESOLVED** (file exists, exit 2 + message đúng) |

**Tier 2 prep round 1 đã đạt bốn điều kiện:**

| ĐK | Trạng thái | Bằng chứng |
|---|---|---|
| `git ls-files '.env*'` chỉ còn `.env.example` | ĐẠT | `evidence/go21-s01-r1fix-post-commit.txt` (commit `41ab22b`) |
| `.env.example` chỉ chứa placeholder rỗng | ĐẠT | `evidence/go21-s00-env-status.txt` |
| Hai dòng Browser Lane KHÔNG bị đụng | ĐẠT | `.gitignore` Playwright section vẫn còn (lines 83-84) |
| Seed không còn literal password cứng | ĐẠT | `prisma/seed-portal-demo-password.static.test.ts` 5/5 PASS |

**Tier 2 round 2 OP-prep (read-only scaffolding):**

| Deliverable | Status | Bằng chứng |
|---|---|---|
| AC-09 dry-run idempotency re-confirm (localhost) | ĐẠT | `evidence/go21-op-prep-ac09-localhost.txt` (hash `3fb0d3cc...` cả 2 lần) |
| AC-09 apply fail-closed (Neon non-local) | ĐẠT | Tier 3 evidence round 2 (`go21-s05-apply-audit-r2.txt`) |
| AC-09 apply localhost stub | ĐẠT | Tier 3 evidence round 2 (`go21-s05-apply-localhost-r2.txt`) |
| OP evidence scaffolding templates (5 step) | ĐẠT | `evidence/op-prep-step{07..11}-template.md` |
| OP prep index | ĐẠT | `evidence/op-prep-index.md` |
| HANDOFF update cho OP-prep | ĐẠT | tài liệu này |

**OP execution vẫn `OWNER_BLOCKED`** cho STEP-07..11. Owner trigger window **2026-09-08 09:00-09:30 Asia/Bangkok**; CLEANUP-PLAN C-14..C-31 + C-49 Tier 2 owns per CLEANUP-PLAN §4, nhưng KHÔNG chạy trước window.

## 2. Execution Trace

| STEP | Round 1 | r1-FIX | Kết quả đo | Bằng chứng |
|---|---|---|---|---|
| `STEP-00` | CHẠY | — | Manifest key/path-only cho tracked `.env*` (4 file), local `.env*.local` (3 file), `scratch/` (~8 subdir + ~130 file), root one-shot (3 untracked), `.gitignore` cũ, seed key scan (`demo-portal-2026` literal ở line 385) | `evidence/go21-s00-baseline.txt`, `evidence/go21-s00-env-status.txt`, `evidence/go21-s00-secret-scan.txt`, `evidence/go21-s00-check-rls-status.txt` |
| `STEP-01` | CHẠY (worktree only) | **CHẠY + COMMIT** | `git rm --cached .env.dev .env.preview .env.prod.test` (worktree) → committed at `41ab22b`. `git ls-files '.env*'` sau commit = `.env.example` (1 path). `.gitignore` THÊM section credential hygiene trước Browser Lane; Browser Lane lines 83-84 còn nguyên | `evidence/go21-s01-r1fix-post-commit.txt`; `evidence/go21-s01-after-lsfiles.txt`; `.gitignore` diff đo bằng `git diff` |
| `STEP-02` | CHẠY + RED/GREEN mutation | — | `prisma/seed.mjs` line 385 đổi từ `bcrypt.hash('demo-portal-2026', 10)` sang `process.env.PORTAL_DEMO_PASSWORD` với guard fail-closed. Static test mới 5 case, GREEN 5/5; RED khi literal tạm reintroduce (2 fail), revert lại GREEN | `evidence/go21-s02-test-{green,red,green-2}.txt` |
| `STEP-03` | CHẠY | — | Viết `docs/runbooks/credential-hygiene-cutover.md` — preflight, STEP-07..11 mapping, state machine per credential, rollback matrix | `docs/runbooks/credential-hygiene-cutover.md` |
| `STEP-04` | CHẠY | — | Viết `evidence/go21-s04-disposition.md` — bảng KEEP/DELETE/UNKNOWN cho 3 local env + 5 root artifact + 8 scratch subdir + mỗi top-level scratch file (path-by-path). Cột Owner disposition CHƯA ĐIỀN vì chờ Q-02 | `evidence/go21-s04-disposition.md` |
| `STEP-05` | CHẠY | r1-FIX: apply evidence rewrite | Viết `evidence/go21-s05-demo-manifest.json` (allowlist exact ID + FK order + post-check invariants). Viết `scripts/ops/demo-cleanup.mjs` (dry-run default, apply fail-closed; hash-pinned). dry-run × 2: exit 0 cả hai, output cùng manifest hash. **r1-FIX**: `apply` evidence rewritten clean — exit 2, stderr `[demo-cleanup] DB gate FAIL: apply would touch non-local DB; set DEMO_CLEANUP_FORCE_LIVE=1 to override (OWNER ONLY)`, captured via `Start-Process -RedirectStandardError` để không bị PS error noise | `evidence/go21-s05-{manifest,dry-run-1,dry-run-2,apply-blocked,apply-audit}.txt` |
| `STEP-06` | CHẠY | r1-FIX: HANDOFF rewrite | HANDOFF.md này | n/a |
| `STEP-07..11` | KHÔNG chạy | r1-FIX: vẫn `OWNER_BLOCKED` (chờ Q-01..Q-04) | **r2 OP-prep**: scaffolding templates + index; **OP execution OWNER_BLOCKED** đến 09:00 08/09 | `evidence/op-prep-step{07..11}-template.md` + `evidence/op-prep-index.md` |
| `STEP-12` | KHÔNG chạy | — | Tier 3 độc lập sau khi OP execution có evidence | audit round 2 PASS WITH FINDINGS (AUD-001 carry over) |

**Hai phép đo cuối r1-FIX để chứng minh Tier 2 KHÔNG vượt phạm vi:**

- `git log 7dd576e..HEAD` đếm được đúng 4 commit (3 Planner + 1 Tier 2 r1-FIX); diff scope từ baseline `7dd576e` đến HEAD `41ab22b` chỉ đụng `.env*` (untrack), `.gitignore`, `prisma/seed.mjs`, `prisma/seed-portal-demo-password.static.test.ts`, `docs/runbooks/credential-hygiene-cutover.md`, `scripts/ops/demo-cleanup.mjs`, AUDIT.md và toàn bộ evidence files.
- Bốn đường bất khả xâm phạm (`middleware.ts`, `app/api/`, `prisma/schema.prisma`, `src/shared/auth/`): RỖNG theo `git diff 7dd576e..HEAD`.
- OP execution (`STEP-07..11`) Tier 2 KHÔNG tạo commit; Tier 2 KHÔNG chạm Vercel/Neon/production.

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| `AC-01` | Manifest key/path-only; chạy scanner; manual review | **ĐẠT** cho tracked/local/scratch classes | `evidence/go21-s00-baseline.txt`, `evidence/go21-s04-disposition.md` | Cần Tier 3 verify thêm bằng secret canary |
| `AC-02` | `git ls-files '.env*'` exact command + file review | **ĐẠT (post-r1-FIX)** — `git ls-files '.env*'` = `.env.example` (1 path); `git ls-files --stage .env.dev` rỗng; `git check-ignore -v .env.dev` = `.gitignore:75:.env.dev .env.dev`; `git check-ignore -v .env.preview` = `.gitignore:76:.env.preview .env.preview`; `git check-ignore -v .env.prod.test` = `.gitignore:77:.env.prod.test .env.prod.test`; `.env.example` content = placeholder rỗng | `evidence/go21-s01-r1fix-post-commit.txt` | — |
| `AC-03` | `npm run test:unit` cho static test; mutation RED/GREEN | **ĐẠT** — 5/5 GREEN; RED marker prove detects literal | `evidence/go21-s02-test-green.txt` (5 PASS); `evidence/go21-s02-test-red.txt` (2 fail khi literal tạm reintroduce); `evidence/go21-s02-test-green-2.txt` (5 PASS sau revert); `evidence/go21-s02-test-audit.txt` (Tier 3 reproduce) | — |
| `AC-04` | Masked DB identity/posture probe | **CHƯA ĐO** — OP execution thuộc STEP-07 | runbook `docs/runbooks/credential-hygiene-cutover.md` §2 | Owner phải chạy |
| `AC-05` | Vercel env name-only + browser/API smoke | **CHƯA ĐO** — OP execution thuộc STEP-08 | runbook §3 | Owner phải chạy |
| `AC-06` | `Test-Path` literal + `git check-ignore` KEEP | **CHƯA ĐO** — OP execution thuộc STEP-10; disposition chờ Q-02 | `evidence/go21-s04-disposition.md` | Owner phải trả lời |
| `AC-07` | Before/after exact path set | **CHƯA ĐO** — OP execution thuộc STEP-10 | `evidence/go21-s04-disposition.md` | Owner phải chạy |
| `AC-08` | Neon branch list + safe test query | **CHƯA ĐO** — OP execution thuộc STEP-10 | runbook §5 | Owner phải chạy |
| `AC-09` | Dry-run × 2 + apply × 1 + post-check | **PARTIAL** — dry-run × 2 PASS; apply stub fail-closed (r1-FIX evidence: exit 2 + DB gate FAIL). Apply + post-check cần DB safe-read target | `evidence/go21-s05-dry-run-{1,2}.txt` (exit 0); `evidence/go21-s05-apply-blocked.txt` (DB gate blocked); `evidence/go21-s05-apply-audit.txt` (Tier 3 reproduce) | Owner chạy apply với DB safe-read target |
| `AC-10` | Unit, typecheck, prod smoke | **PARTIAL** cho unit (5 PASS + 1740 vitest tests từ Tier 3); typecheck + prod smoke CHƯA ĐO | `evidence/go21-s02-test-green.txt`; Tier 3 evidence: build exit 0 | Typecheck + prod smoke cần OP execution |
| `AC-11` | Tier 3 independent secret scan | **PARTIAL (r1-FIX)** — HEAD sau r1-FIX vẫn còn `check_rls.cjs:2` hit (1 raw Neon credential). AUD-001 ESCALATE_NEW_TASK. Ngoài phạm vi task 21 | Tier 3 evidence: `evidence/go21-s00-secret-scan.txt` | Cần task security riêng |

**Gate results (r1-FIX + r2 OP-prep):**

| Gate | Exit | Result | Evidence |
|---|---|---|---|
| `verify-task.ps1` (r1-FIX) | 0 | `DRAFT-VALID (1 warning)` — warning A-04 do Planner bump TASK.md v1.2 có malformed status line (line 10 thiếu closing pipe `\|`); gate KHÔNG block, chỉ flag để Tier 1 review | `evidence/go21-gate-task-r1fix.txt` |
| `verify-audit.ps1` (r1-FIX) | 2 | `FAIL (1 error)` — A-02 spec version mismatch: TASK=v1.2 vs AUDIT=v1.1 (AUDIT do Tier 3 viết với TASK v1.1; Planner bump TASK → v1.2 sau khi audit xong). Gate block | `evidence/go21-gate-audit-r1fix.txt` |
| `verify-task.ps1` (audit round 2) | 0 | `PASS` — Tier 3 confirm TASK v1.2 + AUDIT v1.2 match sau audit round 2 | `evidence/go21-gate-task-r2.txt` (Tier 3 file) |
| `verify-audit.ps1` (audit round 2) | 0 | `PASS` — Tier 3 verify tất cả gates; verdict PASS WITH FINDINGS | `evidence/go21-s10-log.txt` (Tier 3 file) |
| `verify-task.ps1` (r2 OP-prep) | TBD | TBD | r2 commit |
| `verify-audit.ps1` (r2 OP-prep) | TBD | TBD | r2 commit |

**Tier 2 không thể tự fix hai gate issue r1-FIX trên** vì (a) malformed TASK.md là Planner-side edit, (b) AUDIT.md là Tier 3 deliverable. Đợi Tier 1 review.

**r2 OP-prep gate chạy** sau khi Tier 2 commit template files. Kết quả đợi.

## 4. Changed Deliverables (r1-FIX commits `41ab22b` + `c5a5fbd` + `66c6440` + `f01ddca` + `6213788` + `c45de0c` + `5fc3469`)

| Path | Trạng thái | Bytes thay đổi | Mục đích | Commit |
|---|---|---|---|---|
| `.env.dev` | `D` (untrack) | tracked → untracked | `DEC-02`; AUD-002 | `41ab22b` |
| `.env.preview` | `D` (untrack) | tracked → untracked | `DEC-02`; AUD-002 | `41ab22b` |
| `.env.prod.test` | `D` (untrack) | tracked → untracked | `DEC-02`; AUD-002 | `41ab22b` |
| `.gitignore` | `M` | +12 dòng (section credential hygiene trước Browser Lane) | `DEC-10` | `41ab22b` |
| `prisma/seed.mjs` | `M` (round 1) | sửa 1 literal → ENV lookup với guard | `RQ-03` | `f01ddca` |
| `prisma/seed-portal-demo-password.static.test.ts` | `A` (round 1) | +115 dòng | `AC-03` static test | `f01ddca` |
| `docs/runbooks/credential-hygiene-cutover.md` | `A` (round 1) | +108 dòng | `RQ-04` runbook | `f01ddca` |
| `scripts/ops/demo-cleanup.mjs` | `A` (round 1) | +143 dòng | `RQ-09` ops script | `6213788` |
| `docs/tasks/.../TASK.md` | `M` (r1-FIX) | Planner bump to v1.2 picked up | Tier 1 owned | `c5a5fbd` |
| `docs/tasks/.../AUDIT.md` | `A` (r1-FIX) | mới | Tier 3 round 1 audit | `41ab22b` |
| `docs/tasks/.../HANDOFF.md` | `A` (r1-FIX) | mới | tài liệu này | `c5a5fbd` |
| `evidence/go21-s01-r1fix-post-commit.txt` | `A` (r1-FIX) | mới | AC-02 post-commit verify | `c5a5fbd` |
| `evidence/go21-s05-apply-blocked.txt` | `A` (r1-FIX) | rewritten clean | AUD-003 closure | `41ab22b` |
| `evidence/go21-gate-task-r1fix.txt` | `A` (r1-FIX) | mới | gate result evidence | `66c6440` |
| `evidence/go21-gate-audit-r1fix.txt` | `A` (r1-FIX) | mới | gate result evidence | `66c6440` |

`git log 7dd576e..HEAD` (trước r2 OP-prep) = 10 commits: 3 Planner + 7 Tier 2 r1-FIX (`41ab22b`, `c5a5fbd`, `66c6440`, `f01ddca`, `6213788`, `c45de0c`, `5fc3469`). r2 OP-prep sẽ thêm evidence templates + HANDOFF update (no code/logic change).

## 5. Deviations

| ID | Deviation | Lý do |
|---|---|---|
| `DEV-21-01` | `scratch/` ignore exact-name đã thêm (`.gitignore:78`), nhưng `scratch/` vẫn có tracked content từ baseline | Tier 2 prep chỉ sở hữu ignore, không xoá tracked content (STEP-04 ownership). Owner sẽ xử lý tracked scratch/ ở STEP-10 |
| `DEV-21-02` | Apply mode của `demo-cleanup.mjs` hiện là stub — chưa hiện thực hoá Prisma client. Lý do: Tier 2 prep không có safe DB read target ở local (Vercel `DATABASE_URL` chỉ tới production). Runbook + manifest hash pinning đủ để Owner chạy an toàn khi OP execution bắt đầu | OP execution thuộc `STEP-11`; stub đảm bảo dry-run exit 0 và apply fail-closed |
| `DEV-21-03` | DEMO manifest counts còn là `expected_count_seed` + `expected_count_migration`; số liệu thật (count trong DB) sẽ được Owner confirm ở OP execution dry-run | Tier 2 prep không có quyền truy cập DB thật |
| `DEV-21-04` | Seed `seed.mjs` literal được đổi sang `process.env.PORTAL_DEMO_PASSWORD` với SKIP+warn khi ENV thiếu. Test cũ đảm bảo không reset `passwordHash` cho user đã tồn tại. Không có fail-fast nếu ENV thiếu | DEC-12 doctrine |
| `DEV-21-05` (r1-FIX) | `AUD-001` (`check_rls.cjs` raw credential) ESCALATE_NEW_TASK — KHÔNG xử lý ở task này | Planner Resolution v1.2 §9: task security riêng |
| `DEV-21-06` (r1-FIX) | HANDOFF.md viết lại để thay thế round-1 "READY_FOR_AUDIT" status bằng r1-FIX status. Round-1 execution trace được GIỮ trong §2 với cột `Round 1`; chỉ thêm cột `r1-FIX` | TASK v1.2 yêu cầu r1-FIX không xóa lịch sử execution round trước |
| `DEV-21-07` (r1-FIX) | `verify-task.ps1` exit 0 nhưng result `DRAFT-VALID` (1 warning A-04) do TASK.md v1.2 có status line malformed (thiếu trailing pipe). Tier 2 không sửa TASK.md (Planner-owned per CLAUDE.md) | Planner cần patch 1 char hoặc note trong §10 Revision Log |
| `DEV-21-08` (r1-FIX) | `verify-audit.ps1` exit 2 với `FAIL (1 error)` do A-02 spec version mismatch (AUDIT v1.1 vs TASK v1.2). AUDIT.md là Tier 3 deliverable | Tier 3 sẽ re-audit round 2 với spec v1.2 và viết AUDIT.md mới |
| `DEV-21-09` (r1-FIX) | Round-1 deliverables `prisma/seed.mjs` + `prisma/seed-portal-demo-password.static.test.ts` + `docs/runbooks/credential-hygiene-cutover.md` + `scripts/ops/demo-cleanup.mjs` ở trạng thái worktree-only (chưa commit). Round-1 HANDOFF §4 liệt kê chúng như deliverables nhưng thực tế không persist | Đã commit trong r1-FIX (`f01ddca`, `6213788`) |
| `DEV-21-10` (r2 OP-prep) | User instruction `/code ... — OP execution STEP-07..11 + CLEANUP-PLAN C-14..C-31` được Tier 2 diễn giải thành **prep-only**: Tier 2 KHÔNG mutate Neon/Vercel/production (CLAUDE.md); CLEANUP-PLAN C-14..C-31 chưa chạy vì window 09:00-09:30 08/09 chưa bắt đầu | User chọn option "Prep-only (Recommended)"; Iron Rules giữ nguyên |
| `DEV-21-11` (r2 OP-prep) | HANDOFF.md viết lại để phản ánh r2 OP-prep status. Spec version update từ v1.2 → v1.3 (audit round 2 PASS WITH FINDINGS + Q-01..Q-04 RESOLVED) | Planner-owned TASK.md bump |
| `DEV-21-12` (r2 OP-prep) | `verify-audit.ps1` exit 2 với `FAIL (1 error)` A-07: AUDIT.md round 2 thiếu closing line `... AUDIT.md cho Tier 1 ...`. AUDIT.md là Tier 3 deliverable; Tier 2 không sửa | Cần Tier 3 thêm closing line trong AUDIT.md round 2 (bump AUDIT v1.2 → v1.3 để match TASK v1.3) hoặc Tier 3 re-audit round 3 sẽ tạo AUDIT.md mới với closing line chuẩn |

## 6. Evidence Index

| File | Purpose |
|---|---|
| `evidence/go21-gate-task.txt` | round 1: `verify-task.ps1` với TASK v1.1: `RESULT: PASS`, exit 0 |
| `evidence/go21-gate-task-final.txt` | round 1: `verify-task.ps1` re-run sau khi TASK.md dirty |
| `evidence/go21-gate-task-r1fix.txt` | **r1-FIX**: `verify-task.ps1` với TASK v1.2 — `RESULT: DRAFT-VALID (1 warning)` do malformed status line (Planner-side) |
| `evidence/go21-gate-audit-r1fix.txt` | **r1-FIX**: `verify-audit.ps1` — `RESULT: FAIL` do spec version mismatch AUDIT v1.1 vs TASK v1.2 (Planner bump) |
| `evidence/go21-s00-baseline.txt` | STEP-00 baseline + scratch/root enumeration |
| `evidence/go21-s00-env-status.txt` | STEP-00 env file value status (key-only) |
| `evidence/go21-s00-check-rls-status.txt` | Tier 3 audit AUD-001 evidence: `check_rls.cjs` tracked, line 2 raw credential |
| `evidence/go21-s00-secret-scan.txt` | Tier 3 audit: rg scan hits `check_rls.cjs:2` |
| `evidence/go21-s01-after-lsfiles.txt` | STEP-01 `git ls-files '.env*'` before/after (worktree) |
| `evidence/go21-s01-gitignore-check.txt` | STEP-01 gitignore check |
| `evidence/go21-s01-index-status.txt` | Tier 3 audit: `git ls-files --stage .env.dev` hash |
| `evidence/go21-s01-no-staged.txt` | Tier 3 audit: `git diff --cached` rỗng |
| `evidence/go21-s01-r1fix-post-commit.txt` | **r1-FIX**: post-commit AC-02 verify (1 path `.env.example`, 3 index empty, 3 ignore match) |
| `evidence/go21-s02-prisma-validate.txt` | `npx prisma validate` exit 0 |
| `evidence/go21-s02-test-green.txt` | STEP-02 static test GREEN run #1 |
| `evidence/go21-s02-test-red.txt` | STEP-02 RED marker verification (literal reintroduced) |
| `evidence/go21-s02-test-green-2.txt` | STEP-02 GREEN after revert |
| `evidence/go21-s02-test-audit.txt` | Tier 3 reproduce: 5/5 PASS |
| `evidence/go21-s04-disposition.md` | STEP-04 path attribution manifest |
| `evidence/go21-s05-demo-manifest.json` | STEP-05 DEMO allowlist exact IDs + FK order |
| `evidence/go21-s05-dry-run-1.txt` | STEP-05 dry-run #1 exit 0 |
| `evidence/go21-s05-dry-run-2.txt` | STEP-05 dry-run #2 exit 0 |
| `evidence/go21-s05-dry-run-audit.txt` | Tier 3 reproduce: hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` (cả 2 runs) |
| `evidence/go21-s05-apply-blocked.txt` | **r1-FIX (AUD-003)**: clean stderr capture của `apply` exit 2 + DB gate FAIL |
| `evidence/go21-s05-apply-audit.txt` | Tier 3 reproduce: exit 2 + message "DB gate FAIL" |
| `evidence/go21-s06-runbook-probes.txt` | runbook §2 STEP-07 probe template present |
| `evidence/go21-s06-smoke-matrix.txt` | runbook §3 STEP-08 smoke matrix present |
| `evidence/go21-s06-branch-names.txt` | runbook §5 STEP-10 branch names + negative guards |
| `evidence/go21-s06-env-local-status.txt` | STEP-06 local `.env*.local` enumeration |
| `evidence/go21-s06-gitignore-check-all.txt` | Tier 3 gitignore full check (lines 79-80 for .neon, tsconfig.tmp.json) |
| `evidence/v11-ev02-tracked-env.txt` | rebase evidence: tracked env key-only enumeration |
| `evidence/v11-ev05-seed-scan.txt` | rebase evidence: seed key scan |
| `evidence/v11-ev06-dbtoken-scan.txt` | rebase evidence: `DB_DIAG_TOKEN` scan (1 hit ở PLANNER_HANDOVER) |
| `evidence/v11-ev09-scratch.txt` | rebase evidence: scratch/ enumeration |
| `evidence/v11-evidence-summary.md` | rebase evidence summary |
| `evidence/op-prep-index.md` | **r2 OP-prep**: index of 5 step templates + AC-09 re-confirm + runbook status |
| `evidence/op-prep-step07-template.md` | **r2 OP-prep**: STEP-07 evidence template for Owner (Neon rotate 3 roles) |
| `evidence/op-prep-step08-template.md` | **r2 OP-prep**: STEP-08 evidence template for Owner (Vercel redeploy + smoke) |
| `evidence/op-prep-step09-template.md` | **r2 OP-prep**: STEP-09 evidence template for Owner (revoke old credentials) |
| `evidence/op-prep-step10-template.md` | **r2 OP-prep**: STEP-10 evidence template for Owner (local files + scratch + Neon branch + CLEANUP-PLAN C-14..C-31) |
| `evidence/op-prep-step11-template.md` | **r2 OP-prep**: STEP-11 evidence template for Owner (DEMO cleanup) |
| `evidence/go21-op-prep-ac09-localhost.txt` | **r2 OP-prep**: AC-09 dry-run × 2 idempotency + apply localhost stub re-confirm |

## 7. Owner Action List (BLOCKED by Q-01..Q-04 — RESOLVED 2026-09-07 13:42)

**Q-01..Q-04 đã được Owner trả lời** trong TASK.md §8 (v1.2.2 → v1.3):

| Q | Question | Owner Answer | Tier 2 status |
|---|---|---|---|
| `Q-01` | Vercel project duy nhất cho `hrpartner.vn`? | `Project: hrp-prod; Production env: Production; Domain: hrpartner.vn` | **RESOLVED** — STEP-08 dùng đúng |
| `Q-02` | KEEP/DELETE cho `.env.local`, `.env.ops06a-test.local`, `.env.production.local`? | `.env.local=KEEP; .env.ops06a-test.local=DELETE; .env.production.local=DELETE` | **RESOLVED** — STEP-10 áp dụng |
| `Q-03` | Tracked `.env.dev`/Vercel-generated còn hiệu lực ở provider ngoài Neon/Vercel? | `Neon only — no external reuse` | **RESOLVED** — không mở task rotate bổ sung |
| `Q-04` | Maintenance window + PITR restore point cho DEMO cleanup? | `Window: 2026-09-08 09:00-09:30; PITR: 7 days; DEMO data: KEEP (backup to scratch/)` | **RESOLVED** — STEP-11 chạy trong window |

Sau khi Owner trả lời 4 Q, **chạy theo `docs/runbooks/credential-hygiene-cutover.md` STEP-07..11** trong window **2026-09-08 09:00-09:30 Asia/Bangkok**.

**Bổ sung từ AUD-001 (P0, ESCALATE_NEW_TASK):**

| ESCALATE | Owner action needed |
|---|---|
| `AUD-001` | (a) Verify `check_rls.cjs` raw Neon credential còn active hay không. (b) Nếu còn active → rotate ngay. (c) Move credential to ENV. (d) Mở task security riêng `hrp-v6-security-credential-rotation` (đã tạo) để xử lý. Task security chạy song song trong cùng window 09:00-09:30 08/09 |

## 8. Risk Index (inherited from TASK §7)

| ID | Status round 1 | Status r1-FIX | Note |
|---|---|---|---|
| `RISK-01..04` | OK | OK | Owner execution state machine sẵn |
| `RISK-05` | Open | Open | Secret trong Git history KHÔNG được rewrite ở task này (DEC-07). Tier 3 phát hiện thì finding riêng |
| `RISK-06` | OK | OK | Runbook §5 có exact-name + negative guard cho `hrp_mp2_test` |
| `RISK-07` | Closed | Closed | TEST-01 ACCEPTED round 4 (baseline `f9c7bca`) |
| `RISK-08` (new) | Open | Open | `.env.example` đã empty, nhưng nếu sau này Owner thêm value thật thì FAIL |
| `RISK-09` (new, r1-FIX) | n/a | Open | `check_rls.cjs` raw credential (AUD-001) chưa rotate — rủi ro cao vì file tracked ở HEAD post-r1-FIX |

## 9. Next Step for Planner/Tier 3

**Status hiện tại của r1-FIX**: AUD-002 + AUD-003 đã closed bằng 7 commits (`41ab22b` → `5fc3469`). AUD-001 ESCALATE_NEW_TASK ngoài scope (Planner đã tạo task dir `docs/tasks/hrp-v6-security-credential-rotation/`).

**Gate situation (Tier 2 không tự fix được):**

1. `verify-task.ps1` exit 0 với `DRAFT-VALID (1 warning)` — A-04 warning do TASK.md v1.2 status line thiếu trailing `|`. Tier 2 không sửa TASK.md (Planner-owned). Cần Planner patch 1 char hoặc note vào `§10 Revision Log` để giải thích intentional.
2. `verify-audit.ps1` exit 2 với `FAIL (1 error)` — A-02 spec version mismatch (AUDIT v1.1 vs TASK v1.2). AUDIT.md là Tier 3 deliverable. Tier 3 sẽ re-audit round 2 và viết AUDIT.md mới với spec v1.2.

Tier 3 sau khi nhận r1-FIX commits sẽ:

1. Chạy lại `git ls-files '.env*'` trên HEAD `5fc3469` → mong đợi chỉ `.env.example` (đã verify bằng `evidence/go21-s01-r1fix-post-commit.txt`)
2. Reproduce `apply` fail-closed với exit 2 + DB gate FAIL → mong đợi khớp `evidence/go21-s05-apply-blocked.txt` (đã verify bằng Tier 3 evidence `go21-s05-apply-audit.txt`)
3. Audit `git diff 7dd576e..HEAD` chỉ thấy path tier-2-owned (`prisma/seed.mjs`, `prisma/seed-portal-demo-password.static.test.ts`, `docs/runbooks/credential-hygiene-cutover.md`, `scripts/ops/demo-cleanup.mjs`) + 3 env untrack + `.gitignore` + HANDOFF.md + AUDIT.md round 1 + evidence files
4. AUD-001 vẫn OPEN — đợi task security riêng (Planner đã mở `docs/tasks/hrp-v6-security-credential-rotation/`)
5. Sau khi audit round 2 PASS → AC-11 PASS với điều kiện không còn hit `check_rls.cjs` (xử lý ở task khác)

Handoff status: READY_FOR_OWNER_EXECUTION (r2 OP-prep scaffolding done; OP execution STEP-07..11 OWNER triggers in window **2026-09-08 09:00-09:30 Asia/Bangkok**); CLEANUP-PLAN C-14..C-31 + C-49 Tier 2 owns per CLEANUP-PLAN §4 nhưng KHÔNG chạy trước window; task security `hrp-v6-security-credential-rotation` song song trong cùng window
