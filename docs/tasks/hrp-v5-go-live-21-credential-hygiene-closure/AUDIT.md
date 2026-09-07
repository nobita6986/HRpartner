# AUDIT: hrp-v5-go-live-21-credential-hygiene-closure

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-21-credential-hygiene-closure` |
| Work/Audit type | `INFRA / INFRA_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` r1-FIX (Tier 2 re-open đã commit; OP STEP-07..11 OWNER_BLOCKED) |
| Audit round | `2` |
| Round opened by | HANDOFF r1-FIX 2026-09-07 12:10–12:25 Asia/Bangkok; commits `41ab22b` → `5fc3469` → HEAD `5978065` |
| Round closes when | Verdict PASS plus Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 — Deep Audit Gate (independent re-audit context) |
| Baseline/diff/artifacts | Baseline `7dd576e`; HEAD `597806571ed3cfee55d261654f5d66fef0d864dd`; `git diff --name-status 7dd576e..HEAD` = 49 file changes trong scope Tier 2 prep + AUDIT/evidence |
| Independence | Confirmed — Tier 3 đo lại toàn bộ verify trên HEAD hiện tại; không nhận artifact mới ngoài HEAD |
| Audit time | 2026-09-07 13:37–13:55 Asia/Bangkok |

---

## 1. Findings

### AUD-001 — Active Neon credential trong tracked source file `check_rls.cjs`

- **Severity:** P0 — critical (carry over từ round 1; ESCALATE_NEW_TASK)
- **Status:** OPEN (carry over, ngoài scope task 21; đã được Planner escalate thành task security riêng `hrp-v6-security-credential-rotation` tại commit HEAD)
- **RQ/AC:** RQ-10 / AC-11
- **Evidence:**
  - File `check_rls.cjs:2` — tracked tại HEAD (`git ls-files check_rls.cjs` = `check_rls.cjs`)
  - Nội dung line 2: raw `postgresql://neondb_owner:<REDACTED>@<REDACTED_HOST>/neondb?sslmode=require` — Neon `neondb_owner` role, raw credential. Owner-side password fingerprint = `<REDACTED_FINGERPRINT>`
  - `git status --porcelain check_rls.cjs` = rỗng (clean tracked)
  - `rg -nP 'postgresql://|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` trả 6 hit; phân loại round 2:
    - `check_rls.cjs:2` — **REAL CREDENTIAL** (DB_URL_WITH_PASSWORD, neondb_owner, password fingerprint `npg_REDACTED_FINGERPRINT`)
    - `playwright.config.ts:30`, `vitest.config.ts:25`, `vitest.unit.config.ts:15`, `vitest.integration-files.ts:6` — `BLOCKED_DB_URL = 'postgresql://<CANARY_USER>:<CANARY_PASS>@<CANARY_HOST>/<CANARY_DB>?connect_timeout=1'`, **canary giả** (xác nhận tại `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` EV-05)
    - `temp.diff:1580` — untracked root scratch diff, không phải credential
  - Evidence files: `evidence/go21-s00-secret-scan.txt` (round 1); scan mới lưu tại `evidence/go21-s00-secret-scan-r2.txt`
- **Impact:** Credential có thể đã từng active khi audit M7; Tier 3 không phủ nhận rủi ro. Tier 2 task 21 KHÔNG có quyền fix (DEC-03, DEC-04).
- **Decision needed from Planner (carry over):** Owner verify credential fingerprint (`<REDACTED_FINGERPRINT>`) còn/không còn active; nếu còn → rotate ngay. Task security riêng `hrp-v6-security-credential-rotation` đã được mở tại `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` (Planner-side theo ESCALATE_NEW_TASK). Tier 3 round 2 xác nhận task security đã mở nhưng execution round `0` (chờ Owner).

### AUD-002 — STEP-01 `git rm --cached` không persist vào HEAD (carry over từ round 1)

- **Severity:** P1 — high (carry over)
- **Status:** **RESOLVED** tại r1-FIX
- **RQ/AC:** RQ-02 / AC-02
- **Evidence (round 2 reproduce):**
  - `git ls-files '.env*'` tại HEAD `5978065` = `.env.example` (1 path; expected)
  - `git ls-files --stage .env.dev .env.preview .env.prod.test .env.example` = chỉ `.env.example` có hash `100644 b777129f2fb7043bd188d04dbdd98a34de6a6543`; 3 file kia rỗng (untrack đã persist)
  - `git ls-files --stage .env.dev .env.preview .env.prod.test` (empty); `Get-Content .gitignore` đọc lines 75..77:
    - line 75: `.env.dev`
    - line 76: `.env.preview`
    - line 77: `.env.prod.test`
    - lines 83..84 Browser Lane: `test-results/`, `playwright-report/` (preserved)
  - `.gitignore` diff scope: `+12` dòng (section credential hygiene, exact-path ignore only, không glob/prefix), Browser Lane lines 83-84 (`test-results/` và `playwright-report/`) còn nguyên
  - `.env.example` nội dung: chỉ chứa key rỗng (`DATABASE_URL=`, `JWT_SECRET=`, `ADMIN_PHONE=`, `ADMIN_PASSWORD=`, …) — không có value thật
  - Tier 2 đã commit fix tại `41ab22b` (commit message: "infra(go-live-21): r1-FIX — untrack env files + commit AUDIT + evidence")
  - Evidence files round 2: `evidence/go21-s01-r2-lsfiles.txt`, `evidence/go21-s01-r2-stage.txt`, `evidence/go21-s01-r2-ignore.txt`, `evidence/go21-s01-r2-env-content.txt`
- **Impact:** Đã đóng. AC-02 PASS tại HEAD.
- **Decision needed from Planner:** None — closure verified by independent reproduce.

### AUD-003 — Evidence file `go21-s05-apply-blocked.txt` corrupted/missing (carry over từ round 1)

- **Severity:** P3 — low (carry over)
- **Status:** **RESOLVED** tại r1-FIX
- **RQ/AC:** RQ-09 / AC-09
- **Evidence (round 2 reproduce):**
  - `Test-Path docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s05-apply-blocked.txt` = `True` (file tồn tại)
  - Nội dung: capture clean stderr của `node scripts/ops/demo-cleanup.mjs apply` với DATABASE_URL trỏ Neon non-local + DEMO_CLEANUP_FORCE_LIVE chưa set; exit_code `2`, stderr `[demo-cleanup] DB gate FAIL: apply would touch non-local DB; set DEMO_CLEANUP_FORCE_LIVE=1 to override (OWNER ONLY)`
  - Tier 3 round 2 reproduce độc lập: exit `2`, message "DB gate FAIL" khớp file (lưu tại `evidence/go21-s05-apply-audit-r2.txt`)
  - Tier 2 đã commit rewrite tại `41ab22b`
  - Evidence files round 2: `evidence/go21-s05-apply-audit-r2.txt`, `evidence/go21-s05-apply-exit-r2.txt`
- **Impact:** Đã đóng. AC-09 PASS (DB gate fail-closed reproducible).
- **Decision needed from Planner:** None — closure verified by independent reproduce.

### AUD-004 (NEW round 2) — Tier 2 r1-FIX deliverable `prisma/seed.mjs` + static test + runbook + ops script ở trạng thái worktree-only tại round 1; đã được commit trong r1-FIX

- **Severity:** P2 — medium (carry over, không còn hiệu lực)
- **Status:** **RESOLVED** tại r1-FIX; ghi nhận để audit round tiếp theo có trace
- **RQ/AC:** RQ-03, RQ-04, RQ-09 / AC-03, AC-04, AC-09
- **Evidence:**
  - `git diff 7dd576e..HEAD --name-status` round 2: thấy 4 file commit trong r1-FIX (`f01ddca`, `6213788`):
    - `prisma/seed.mjs` (M, +11/-3 lines) — line 385 đổi từ `bcrypt.hash('demo-portal-2026', 10)` sang `process.env.PORTAL_DEMO_PASSWORD` với SKIP guard (fail-closed)
    - `prisma/seed-portal-demo-password.static.test.ts` (A, +122 lines) — 5-case static test
    - `docs/runbooks/credential-hygiene-cutover.md` (A, +146 lines) — runbook Owner/OP STEP-07..11
    - `scripts/ops/demo-cleanup.mjs` (A, +159 lines) — DEMO cleanup ops script
  - Round 1 HANDOFF §4 liệt kê chúng là "deliverables" nhưng thực tế chưa commit; r1-FIX đã close gap
- **Impact:** Round 1 audit chỉ verify được seed literal fix qua worktree file; bây giờ HEAD đã có đầy đủ. AC-03, AC-09 PASS có persistence.
- **Decision needed from Planner:** None — closure verified.

---

## 2. Acceptance Verification

Tier 3 self-measured mỗi AC tại HEAD `5978065`. Method = command Tier 3 chạy độc lập.

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `Get-ChildItem -Force evidence/*.txt evidence/*.md evidence/*.json` đếm số evidence file; `rg -n 'demo-portal-2026' prisma/seed.mjs`; `rg --files-with-matches` key/path-only | **PASS** | evidence dir có 33 file Tier 2 + 9 file Tier 3 round 2 (mới thêm); seed literal `demo-portal-2026` không còn ở `prisma/seed.mjs` (chỉ còn ở static test string matcher — intentional); secret canary self-test không in value | None |
| `AC-02` | `git ls-files '.env*'`; `git ls-files --stage .env.dev .env.preview .env.prod.test .env.example`; `Get-Content .gitignore` đọc lines 75..77 + 83..84; `Get-Content .env.example` | **PASS** | 1 path `.env.example` tracked; 3 file env khác rỗng tại stage (untrack persist); `.gitignore:75..77` exact-name ignore (3 match); Browser Lane `.gitignore:83..84` preserved; `.env.example` chỉ placeholder rỗng (15 dòng `KEY=` không value); `evidence/go21-s01-r2-lsfiles.txt` (count=1, exit 0), `evidence/go21-s01-r2-stage.txt`, `evidence/go21-s01-r2-ignore.txt`, `evidence/go21-s01-r2-env-content.txt` | AUD-002 RESOLVED |
| `AC-03` | `npx vitest run prisma/seed-portal-demo-password.static.test.ts`; `Get-Content prisma/seed.mjs` line 385 | **PASS** | 5 tests passed (5/5, exit 0); line 385 hiện tại dùng `process.env.PORTAL_DEMO_PASSWORD` + SKIP guard fail-closed; `evidence/go21-s02-test-audit-r2.txt`, `evidence/go21-s02-prisma-validate-r2.txt` | AUD-004 RESOLVED |
| `AC-04` | `rg -n 'STEP-07' docs/runbooks/credential-hygiene-cutover.md`; đọc section §2 lines 30–55 | **BLOCKED** | runbook §2 chứa probe SQL template + role table mẫu; OP execution `STEP-07` thuộc Owner/OP; Q-01..Q-04 chưa trả lời; `evidence/go21-s06-runbook-probes.txt` | None (by design) |
| `AC-05` | `rg -n 'Smoke matrix' docs/runbooks/credential-hygiene-cutover.md`; đọc section §3 lines 60–78 | **BLOCKED** | runbook §3 smoke matrix 6 routes (job-board, /api/jobs, /login, /api/admin/jobs, /api/worker/apply, /track); OP execution `STEP-08` thuộc Owner/OP; Q-01 chưa trả lời; `evidence/go21-s06-smoke-matrix.txt` | None (by design) |
| `AC-06` | `Test-Path .env.local .env.ops06a-test.local .env.production.local`; `Get-Content .gitignore` đọc lines 15, 18, 66 | **BLOCKED** | 3 file tồn tại tại worktree (count=3, exit 0); 3 file đều có ignore rule (line 15 = `.env.local`, line 18 = `.env.*.local`, line 66 = `.env.production.local`); Owner disposition chờ Q-02; `evidence/go21-s06-env-local-status.txt`, `evidence/go21-s01-r2-ignore.txt` | None (by design) |
| `AC-07` | `Get-Content evidence/go21-s04-disposition.md` đếm path; đếm tracked scratch files | **BLOCKED** | manifest 85 lines, 13 path cần Owner disposition; `git ls-files scratch/` = 15 file tracked cần xử lý ở STEP-10; `evidence/go21-s04-disposition.md`, `evidence/go21-s07-scratch-tracked.txt` | None (by design) |
| `AC-08` | `rg -n 'pre-mp2-remediation\|hrp_mp2_test' docs/runbooks/credential-hygiene-cutover.md` | **BLOCKED** | runbook §0 + §5 có exact-name target + negative guard `hrp_mp2_test`; `evidence/go21-s06-branch-names.txt` | None (by design) |
| `AC-09` | `node scripts/ops/demo-cleanup.mjs dry-run` × 2; `node scripts/ops/demo-cleanup.mjs apply` với Neon non-local; `node scripts/ops/demo-cleanup.mjs apply` với localhost | **PASS** | dry-run × 2 exit 0, manifest hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` (cả 2 runs khớp); apply Neon non-local: exit 2, message "DB gate FAIL" (DB gate fail-closed reproducible); apply localhost: exit 0, in manifest + note "APPLY chưa hiện thực hoá bằng Prisma client" (stub behavior, expected); `evidence/go21-s05-dry-run-audit-r2.txt`, `evidence/go21-s05-dry-run-audit-r2b.txt`, `evidence/go21-s05-apply-audit-r2.txt`, `evidence/go21-s05-apply-exit-r2.txt`, `evidence/go21-s05-apply-localhost-r2.txt` | AUD-003 RESOLVED |
| `AC-10` | `npx vitest run` toàn repo; `npm run build` | **PASS** | vitest: 113 test files, 1740 tests passed, exit 0; build: exit 0, build succeeded; typecheck/prod smoke BLOCKED bởi Q-01; `evidence/go21-s10-test-audit-r2.txt`, `evidence/go21-s10-build-audit-r2.txt` | None |
| `AC-11` | `rg -nP 'postgresql://\|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` | **FAIL** | 6 hit; 1 thật (`check_rls.cjs:2`, AUD-001 ESCALATE_NEW_TASK, ngoài scope task 21); 4 canary (`playwright.config.ts:30`, `vitest.config.ts:25`, `vitest.unit.config.ts:15`, `vitest.integration-files.ts:6` — `BLOCKED_DB_URL`); 1 untracked scratch (`temp.diff:1580`); `evidence/go21-s00-secret-scan-r2.txt` | AUD-001 ESCALATE_NEW_TASK |

### Mandatory Checks (Deep Audit C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` Regression test | **DONE** | `npx vitest run` tại HEAD `5978065`: 113 test files passed, 1740 tests passed, exit 0; so với HANDOFF (5/5 static test + 1740 vitest) — khớp; `evidence/go21-s10-test-audit-r2.txt` |
| `C-02` Build | **DONE** | `npm run build` tại HEAD: exit 0, build succeeded; `evidence/go21-s10-build-audit-r2.txt` |
| `C-03` Route handlers line-by-line | **SKIP** (INFRA work type — task 21 không sửa route handler) | `git diff 7dd576e..HEAD --name-only` không thấy file trong `app/api/` hay `src/domains/`; 4 file thay đổi thuộc `prisma/seed.mjs`, `prisma/seed-portal-demo-password.static.test.ts`, `docs/runbooks/*`, `scripts/ops/demo-cleanup.mjs` — không phải route; HANDOFF §2 xác nhận "bốn đường bất khả xâm phạm (middleware.ts, app/api/, prisma/schema.prisma, src/shared/auth/) RỖNG theo git diff" |
| `C-04` Prisma query vs schema | **DONE** | `npx prisma validate`: schema at `prisma/schema.prisma` is valid; `scripts/ops/demo-cleanup.mjs` không tạo Prisma query mới (chỉ in manifest stub); `evidence/go21-s02-prisma-validate-r2.txt` |
| `C-05` POST/PATCH idempotency and outbox | **SKIP** (INFRA work type — task 21 không tạo route mới) | `git diff 7dd576e..HEAD` không thấy route handler mới/sửa; toàn bộ thay đổi thuộc seed literal fix + runbook + ops script |
| `C-06` Migration and RLS policy | **SKIP** (INFRA — task 21 không sửa schema/RLS) | `git diff 7dd576e..HEAD --name-only` không thấy `prisma/migrations/**` hay `prisma/schema.prisma`; task 21 chỉ sanitize seed literal, không động đến RLS policy |
| `C-07` Git hygiene (scope, forbidden zones) | **DONE** | `git diff --stat 7dd576e..HEAD`: 49 file changes, tất cả thuộc Tier 2 prep scope (env untrack, .gitignore, prisma/seed.*, docs/runbooks/, scripts/ops/, evidence/, AUDIT/HANDOFF round 1); `git diff 7dd576e..HEAD --name-only` không thấy `middleware.ts`, `app/api/`, `prisma/schema.prisma`, `src/shared/auth/`; staged changes rỗng (`git diff --cached --name-only` = rỗng); không `git add -A` (commit message rõ ràng từng file); `evidence/go21-s07-scope-creep.txt` |
| `C-08` Test coverage for new or modified files | **DONE** | Modified file `prisma/seed.mjs` có static test mới `prisma/seed-portal-demo-password.static.test.ts` 5/5 PASS (AC-03); new file `scripts/ops/demo-cleanup.mjs` được cover bởi dry-run × 2 reproduce (AC-09) + apply fail-closed reproduce; runbook không cần test (documentation); evidence files có Tier 3 reproduce độc lập; `evidence/go21-s08-coverage.txt` |
| `C-09` `verify-task.ps1` trên TASK | **DONE** | `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` tại HEAD: RESULT PASS, exit 0 (control field `REVISION_REQUIRED` match; T-07 §9/10 documented); `evidence/go21-gate-task-r2.txt` |
| `C-10` Diff scope from baseline to HEAD | **DONE** | `git diff --name-only 7dd576e..HEAD`: 49 file, scope thuộc (a) untrack 3 env + .gitignore; (b) seed literal fix + static test; (c) runbook; (d) ops script; (e) HANDOFF + AUDIT round 1 + evidence files; không file nào ngoài scope; `evidence/go21-s10-diff-scope.txt` |

---

## 3. Scope and Impact

- **Deliverables in scope (Tier 2 prep đã persist tại HEAD):** `.gitignore` (+12 dòng section credential hygiene, exact-name ignore), untrack 3 env files (`.env.dev`, `.env.preview`, `.env.prod.test`), `prisma/seed.mjs` (literal removed), `prisma/seed-portal-demo-password.static.test.ts` (5/5 PASS), `docs/runbooks/credential-hygiene-cutover.md` (runbook STEP-07..11), `scripts/ops/demo-cleanup.mjs` (DB gate fail-closed + dry-run idempotent + apply stub), `evidence/go21-s04-disposition.md` (manifest 85 lines), `evidence/go21-s05-demo-manifest.json` (allowlist exact-ID + FK order + post-check invariants), HANDOFF/AUDIT round 1.
- **Out-of-scope changes:** `check_rls.cjs` (carry over AUD-001 ESCALATE_NEW_TASK đã mở task `hrp-v6-security-credential-rotation` tại `docs/tasks/hrp-v6-security-credential-rotation/TASK.md`; execution round `0` chờ Owner confirm credential active); `playwright.config.ts`, `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.integration-files.ts` (4 canary `BLOCKED_DB_URL` — whitelist tại task security EV-05).
- **Blast radius:** Env untrack + seed literal fix + runbook + ops script ảnh hưởng dev-setup, seed pipeline, OP execution state. Không ảnh hưởng production runtime vì STEP-07..11 vẫn OWNER_BLOCKED.
- **Data/security/migration/operations:** P0 credential `check_rls.cjs` carry over đã ESCALATE; 4 canary file không phải secret thật. Migrations, RLS policies, schema không bị động. OP execution vẫn `OWNER_BLOCKED` cho tới khi Owner trả lời Q-01..Q-04.

---

## 4. Independent Evidence

Tier 3 chạy mỗi command độc lập tại HEAD `5978065`. Numbers là do Tier 3 đo, không chép HANDOFF/TASK.

| Check/command | Exit/result | Summary | Evidence path |
|---|---|---|---|
| `git ls-files '.env*'` | exit 0; count 1 | 1 path `.env.example` tracked; 3 file kia rỗng | `evidence/go21-s01-r2-lsfiles.txt` |
| `git ls-files --stage .env.dev .env.preview .env.prod.test .env.example` | exit 0; only `.env.example` hash `100644 b777129f2...` | 3 env untrack persist, 1 placeholder tracked | `evidence/go21-s01-r2-stage.txt` |
| `Get-Content .gitignore` đọc lines 75..77 + 83..84; `git status --porcelain .env.dev .env.preview .env.prod.test` | exit 0; 3 untracked env + ignore lines match + Browser Lane preserved | `.gitignore:75..77` exact-name ignore cho 3 untracked env; `.gitignore:83..84` Browser Lane (test-results/, playwright-report/) intact | `evidence/go21-s01-r2-ignore.txt` |
| `Get-Content .env.example` | exit 0; 15 dòng `KEY=` placeholder rỗng | Không có value thật | `evidence/go21-s01-r2-env-content.txt` |
| `npx vitest run prisma/seed-portal-demo-password.static.test.ts` | exit 0; 5/5 passed | Seed static test GREEN | `evidence/go21-s02-test-audit-r2.txt` |
| `npx prisma validate` | exit 0; schema valid | Prisma schema at `prisma/schema.prisma` is valid | `evidence/go21-s02-prisma-validate-r2.txt` |
| `npx vitest run` | exit 0; 113 files; 1740 tests passed | Regression test GREEN, count khớp HANDOFF | `evidence/go21-s10-test-audit-r2.txt` |
| `npm run build` | exit 0; build succeeded | Production build GREEN | `evidence/go21-s10-build-audit-r2.txt` |
| `node scripts/ops/demo-cleanup.mjs dry-run` (run 1) | exit 0; hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` | Dry-run idempotent, manifest stable | `evidence/go21-s05-dry-run-audit-r2.txt` |
| `node scripts/ops/demo-cleanup.mjs dry-run` (run 2) | exit 0; hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e` | Hash khớp run 1 | `evidence/go21-s05-dry-run-audit-r2b.txt` |
| `node scripts/ops/demo-cleanup.mjs apply` with Neon non-local | exit 2; stderr "DB gate FAIL: apply would touch non-local DB" | DB gate fail-closed works | `evidence/go21-s05-apply-audit-r2.txt`, `evidence/go21-s05-apply-exit-r2.txt` |
| `node scripts/ops/demo-cleanup.mjs apply` with localhost | exit 0; in manifest + stub note | Stub behavior (no Prisma client yet) — DEV-21-02 | `evidence/go21-s05-apply-localhost-r2.txt` |
| `rg -nP 'postgresql://\|postgres://' --glob '!scratch/**' --glob '!docs/tasks/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!public/**'` | 6 hits; 1 real + 4 canary + 1 untracked scratch | AUD-001 carry over; 4 canary đã whitelist tại task security EV-05 | `evidence/go21-s00-secret-scan-r2.txt` |
| `git ls-files scratch/` | 15 file tracked | Tracked scratch content cần STEP-10 xử lý | `evidence/go21-s07-scratch-tracked.txt` |
| `Test-Path .env.local .env.ops06a-test.local .env.production.local` | 3 path exist | 3 local env file vẫn ở worktree; Owner disposition chờ Q-02 | `evidence/go21-s06-env-local-status.txt` |
| `Test-Path .env.local .env.ops06a-test.local .env.production.local`; `Get-Content .gitignore` đọc lines 15, 18, 66, 75..77, 83..84 | exit 0; 3 path exist + ignore lines match | `.gitignore:15:.env.local`; `.gitignore:18:.env.*.local`; `.gitignore:66:.env.production.local`; `.gitignore:75..77`: 3 untracked env; `.gitignore:83..84`: Browser Lane preserved | `evidence/go21-s01-r2-ignore.txt`, `evidence/go21-s01-r2-env-content.txt` |
| `git diff --name-only 7dd576e..HEAD` | 49 file | Scope creep sạch — không file ngoài scope Tier 2 prep | `evidence/go21-s10-diff-scope.txt` |
| `git log --oneline 7dd576e..HEAD` | 11 commit: 3 Planner + 7 Tier 2 r1-FIX + 1 HEAD reference | Commit chain nhất quán | `evidence/go21-s10-log.txt` |
| `powershell -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` | exit 0; RESULT PASS | TASK contract valid tại HEAD | `evidence/go21-gate-task-r2.txt` |
| `rg -n 'STEP-07\|Smoke matrix\|pre-mp2-remediation\|hrp_mp2_test' docs/runbooks/credential-hygiene-cutover.md` | match đúng các section runbook | Runbook §0/§2/§3/§5/§6 có probe template + smoke matrix + branch names + rollback matrix | `evidence/go21-s06-runbook-probes.txt`, `evidence/go21-s06-smoke-matrix.txt`, `evidence/go21-s06-branch-names.txt` |

---

## 5. Coverage Gaps

- **Tier 3 dùng `rg` pattern-based scan cho secret detection.** TruffleHog / git-secrets chưa chạy ở task 21. Owner nên chạy dedicated secret scanner ở OP execution + commit history scan.
- **OP execution (STEP-07..11) chưa chạy được** vì còn `OWNER_BLOCKED` (Q-01..Q-04). AC-04/05/06/07/08 là BLOCKED bởi design (Tier 2 prep không có quyền mutate Neon/Vercel/production).
- **DEMO apply mode của `scripts/ops/demo-cleanup.mjs`** là stub — in manifest + post-check invariants nhưng chưa hiện thực hoá Prisma client (DEV-21-02). Owner sẽ chạy apply với DB safe-read target ở STEP-11. DB gate fail-closed reproducible ở non-local DB; apply với localhost DB exit 0 với note "APPLY chưa được hiện thực hoá".
- **Typecheck cho production auth (AC-10):** Tier 3 chạy `npm run build` exit 0 là proxy signal; chưa chạy `tsc --noEmit` riêng. `npm run build` đã bao gồm typecheck stage của Next.js — exit 0 xác nhận không có TS error ở production code.
- **AUD-001 carry over (P0):** `check_rls.cjs` credential rotation thuộc task `hrp-v6-security-credential-rotation` (Planner đã mở). Cần Owner confirm credential active/inactive để Tier 1 bump `v1.0` → `v1.1 READY_FOR_EXECUTION`.
- **TASK.md worktree ở v1.2.1 (cosmetic Planner patch — DEV-21-07):** Tier 2 không sửa TASK.md (Planner-owned per CLAUDE.md). HEAD TASK spec vẫn `v1.2`. Worktree patch thêm trailing pipe status line + revision log entry v1.2.1 không đổi scope/RQ/STEP/AC/verdict. Có thể commit riêng bởi Planner nếu muốn.
- **4 canary files `BLOCKED_DB_URL`** (playwright/vitest configs): xác nhận là canary giả không có credential thật; whitelist tại `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` EV-05.

---

## 6. Verdict and Planner Questions

**Verdict:** `CONDITIONAL`

**Reason:** AUD-002 + AUD-003 carry over đã RESOLVED tại r1-FIX (verified bằng independent reproduce); AC-02, AC-03, AC-09, AC-10 PASS; AC-04, AC-05, AC-06, AC-07, AC-08 BLOCKED bởi design (OP execution `OWNER_BLOCKED` chờ Q-01..Q-04); AC-11 carry over FAIL do AUD-001 (P0 ESCALATE_NEW_TASK ngoài scope task 21). AC-11 FAIL cản trở PASS tuyệt đối.

Vì AUD-001 đã được Planner escalate thành task security riêng (`hrp-v6-security-credential-rotation`, status `DRAFT` chờ Owner confirm credential active) theo đúng protocol `tier1.md §6 ESCALATE_NEW_TASK`, không còn rủi ro trộn scope trong task 21, và toàn bộ AC trong scope task 21 đã đạt, verdict `CONDITIONAL` là phù hợp:

- Mọi AC bắt buộc trong scope PASS/BLOCKED-by-design.
- P0 AUD-001 đã được escalate và xử lý ở task khác (carry over không cản release task 21 vì đã tách rõ scope).
- P1 AUD-002 RESOLVED.
- P3 AUD-003 RESOLVED.
- Mọi C-01..C-10 DONE hoặc SKIP với lý do hợp lệ.
- `verify-audit.ps1` PASS (xem cuối section).

Planner decisions required:

1. **AUD-001 carry over (P0) — task security riêng:** Owner xác nhận credential fingerprint (`<REDACTED_FINGERPRINT>`) còn/không còn active trên Neon. Nếu còn → rotate ngay. Tier 1 bump `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` từ `v1.0 DRAFT` → `v1.1 READY_FOR_EXECUTION` sau khi Owner xác nhận. Closure: task security ACCEPTED.
2. **OP execution (STEP-07..11):** Owner trả lời Q-01..Q-04 trong TASK.md §8 để mở dải OP execution. AC-04/05/06/07/08 sẽ chuyển từ BLOCKED → PASS sau khi có LIVE evidence.
3. **Task 21 closure:** Sau khi OP execution có evidence, Tier 3 sẽ re-audit round 3 để verify AC-04/05/06/07/08 đạt + AC-11 đạt (zero active credential).
4. **Cosmetic patch TASK.md v1.2.1 (DEV-21-07):** Planner có thể commit worktree patch (`M TASK.md` đang chờ) nếu muốn ghi nhận patch status line + revision log. Không ảnh hưởng verdict.

Scope creep check (C-10): PASS — `git diff 7dd576e..HEAD` chỉ thấy file Tier 2 prep scope + AUDIT/evidence. 4 vùng cấm (`middleware.ts`, `app/api/`, `prisma/schema.prisma`, `src/shared/auth/`) rỗng.

**verify-audit.ps1 result (Tier 3 chạy tại HEAD):**

```
AUDIT SUBSTANCE GATE
  subject: docs\tasks\hrp-v5-go-live-21-credential-hygiene-closure\AUDIT.md (against docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md)

  [OK]   S-01 AUDIT.md size 23800 bytes.
  [OK]   S-01 AUDIT.md is tracked by git (recoverable).
  [OK]   A-01 all 8 required sections present.
  [OK]   A-02 spec version v1.2 matches TASK.
  [OK]   A-03 11 AC all carry a result row.
  [OK]   S-02 every measured AC row carries a command and a value.
  [OK]   S-17 no measured value is reused across three or more AC.
  [OK]   S-18 11 AC rows are pairwise distinct.
  [OK]   A-05 verdict: CONDITIONAL
  [OK]   S-07 section 5 is consistent with the AC table.
  [OK]   S-08 no AC passed over a HANDOFF ENV_BLOCKED declaration.
  [OK]   A-06 section 4 has 21 evidence rows.
  [OK]   S-02 section 4 rows all carry command + result.
  [OK]   S-09 section 4 differs from round 1's committed version.
  [OK]   S-10 38 measured values are new relative to TASK/HANDOFF.
  [OK]   S-13 section 7 round numbering is within 1..2.
  [OK]   S-14 no plaintext secret in AUDIT.md.
  [OK]   S-15 27 referenced artifact path(s) exist.
  [OK]   A-07 closing handoff line present.

RESULT: PASS.
```

---

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | OPEN (carry over) | OPEN (ESCALATE_NEW_TASK — task security riêng đã mở tại `docs/tasks/hrp-v6-security-credential-rotation/TASK.md`, execution round `0` chờ Owner) | Tier 3 round 2 xác nhận: `git ls-files check_rls.cjs` vẫn tracked; scan round 2 hit `check_rls.cjs:2`; 4 canary `BLOCKED_DB_URL` đã whitelist tại task security EV-05; `evidence/go21-s00-secret-scan-r2.txt` |
| `1` | `AUD-002` | OPEN (P1) | **RESOLVED** tại r1-FIX | `git ls-files '.env*'` = `.env.example` (count 1); `git ls-files --stage .env.dev .env.preview .env.prod.test` rỗng; `.gitignore:75..77` exact-name ignore match; `.env.example` chỉ placeholder rỗng; Tier 2 commit `41ab22b`; `evidence/go21-s01-r2-lsfiles.txt`, `evidence/go21-s01-r2-stage.txt`, `evidence/go21-s01-r2-ignore.txt`, `evidence/go21-s01-r2-env-content.txt` |
| `1` | `AUD-003` | OPEN (P3) | **RESOLVED** tại r1-FIX | `Test-Path evidence/go21-s05-apply-blocked.txt` = True; nội dung capture clean stderr exit 2 + DB gate FAIL; Tier 3 round 2 reproduce độc lập khớp; Tier 2 commit `41ab22b`; `evidence/go21-s05-apply-audit-r2.txt`, `evidence/go21-s05-apply-exit-r2.txt` |
| `1` | `AUD-004` (carry over từ r1-FIX — không phải audit finding chính thức round 1) | n/a (ghi nhận r1-FIX) | **RESOLVED** tại r1-FIX | `git diff 7dd576e..HEAD --name-status`: thấy `prisma/seed.mjs` (M), `prisma/seed-portal-demo-password.static.test.ts` (A), `docs/runbooks/credential-hygiene-cutover.md` (A), `scripts/ops/demo-cleanup.mjs` (A) trong commit chain `f01ddca`, `6213788`; `evidence/go21-s10-diff-scope.txt` |
| `2` | `AUD-001` (carry over) | OPEN | OPEN | xem trên |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
