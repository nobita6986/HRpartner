# CLEANUP-PLAN — Repo Hygiene cho maintenance window 2026-09-08 09:00-09:30

| Field | Value |
|---|---|
| Plan slug | `hrp-v5-cleanup-2026-09-08` |
| Author | Tier 1 / Codex |
| Created | `2026-09-07 13:48 Asia/Bangkok` |
| Trigger | Owner hỏi "repo đã sạch sẽ chưa?" → Tier 1 soạn checklist file-by-file |
| Executed by | Tier 2 STEP-10 trong `hrp-v5-go-live-21-credential-hygiene-closure` + Tier 1 commit cosmetic |
| Window | 2026-09-08 09:00-09:30 Asia/Bangkok (cùng slot với Neon rotate) |
| Prerequisite | Tier 3 re-audit round 2 task 21 PASS trước 09:00 |
| Iron Rule | Tier 1 chỉ soạn plan; KHÔNG xoá/sửa file; Tier 2 apply trong window |

## 0. Trạng thái repo @ `5978065` 13:46

| Loại | Đếm | Mức |
|---|---|---|
| Modified tracked chưa commit | 12 file | 🟡 |
| Deleted tracked (xoá local chưa commit) | 1 file (`docs/aff_plan.md`) | 🟡 |
| Untracked đáng xử lý | ~30 file | 🟢 / 🔴 |
| Tracked secret (P0) | 1 (`check_rls.cjs:2`) | 🔴 |

## 1. Bảng file-by-file

### 🔴 P0 — Credential còn tracked (URGENT)

| # | Path | Action | Tier 2 step | Bằng chứng |
|---|---|---|---|---|
| C-01 | `check_rls.cjs` (line 2) | UNTRACK + SANITIZE | task `hrp-v6-security-credential-rotation` STEP-01..03 | `git ls-files check_rls.cjs` rỗng sau commit; `rg npg_E0eqUu7aHtpI check_rls.cjs` 0 hit |

Lệnh:
```bash
git rm --cached check_rls.cjs
# edit: xoá literal credential line 2; thay bằng `process.env.CHECK_RLS_DSN`
# verify: rg npg_E0eqUu7aHtpI check_rls.cjs
git add check_rls.cjs
git commit -m "chore(security): untrack + sanitize check_rls.cjs

- git rm --cached (untrack; keep on disk for local debug)
- scrub raw neondb_owner credential from line 2
- read DSN from process.env.CHECK_RLS_DSN

Refs: hrp-v6-security-credential-rotation STEP-02; AUD-001"
```

---

### 🟡 Tier 1 commit (cosmetic, ngay sau audit round 2 PASS)

Cần commit scoped để HEAD sạch trước khi Tier 2 STEP-10 cleanup.

| # | Path | Action | Ghi chú |
|---|---|---|---|
| C-02 | `docs/PLANNER_HANDOVER.md` (M) | COMMIT (Tier 1) | §0 updated_at → 13:42 |
| C-03 | `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` (M) | COMMIT (Tier 1) | §0 Updated 13:42; §8 answers; §10 v1.2.2 |
| C-04 | `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` (M, nếu có) | COMMIT (Tier 1) | §0 v1.1 READY; §8 answers; §10 v1.1 |

Lệnh (gói cùng task 21 r1-FIX):
```bash
git add docs/PLANNER_HANDOVER.md \
        docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md \
        docs/tasks/hrp-v6-security-credential-rotation/TASK.md
git commit -m "docs(planner): apply Owner answers to Q-01..Q-04 (task 21) and Q-01..Q-03 (security)

- task 21: bump v1.2.1 -> v1.2.2 (RESOLVE 4 OP block); Updated 13:42
- task security: bump v1.0 DRAFT -> v1.1 READY_FOR_EXECUTION
- PLANNER_HANDOVER §0 updated_at 13:42; 3 lane song song

Refs: CLEANUP-PLAN C-02..C-04"
```

---

### 🟡 Modified tracked (KHÔNG phải Tier 1 — cần kiểm tra Tier 3 hoặc Tier 5)

| # | Path | HEAD diff | Action đề xuất |
|---|---|---|---|
| C-05 | `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md` | Tier 3 thường viết tại đây | Tier 3 đã commit round 2 chưa? |
| C-06 | `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md` | Tier 3 | verify |
| C-07 | `docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/TASK.md` | Tier 1/2 | verify |
| C-08 | `docs/tasks/hrp-v5-go-live-13-tracking-pii-mask/AUDIT.md` | Tier 3 | verify |
| C-09 | `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/AUDIT.md` | Tier 3 round 2 | Tier 3 commit khi viết |
| C-10 | `docs/tasks/hrp-v5-test-01-browser-lane/TASK.md` | Tier 1 (TEST-01 ACCEPTED đã commit) | diff có thể do Tier 5 bổ sung |
| C-11 | `package.json` + `package-lock.json` | test scripts có playwright | **CRITICAL**: nếu thêm playwright dep nhưng `tests/browser/` không track → revert |
| C-12 | `public/index.html` | unknown | diff để verify |
| C-13 | `src/shared/ui/role-guard/role-guard-layout.tsx` | +78/-33: thêm `section: 'development'` cho 4 nav item, thêm icon `ChevronDown` + `Construction` | nếu SEP Hướng B đã chọn thì KEEP, Tier 1 thuộc task `hrp-v6-p1c-new-ui-restyling` — nhưng task này chưa mở execution. CẦN Tier 1 kiểm tra quyết định: commit scoped hay revert |

Câu hỏi cho Tier 1/Tier 3:
1. AUD-002/003 của 5 task trên đã được Tier 3 commit round 2 chưa, hay vẫn chờ?
2. `role-guard-layout.tsx` thuộc task nào — `hrp-v6-p1c-new-ui-restyling` DRAFT chưa mở execution, có được phép commit không?
3. `package.json` thêm `test:browser:playwright test` — nếu chưa track `tests/browser/` thì revert 2 file này.

---

### 🟢 Untracked → DELETE (rõ ràng rác)

| # | Path | Lý do | Lệnh |
|---|---|---|---|
| C-14 | `docs/aff_plan - Copy.md` | file copy thừa | `git clean -f "docs/aff_plan - Copy.md"` |
| C-15 | `docs/aff_plan - Copy (2).md` | file copy thừa | `git clean -f "docs/aff_plan - Copy (2).md"` |
| C-16 | `docs/v6-admin-rebuild - Copy.md` | file copy thừa | `git clean -f "docs/v6-admin-rebuild - Copy.md"` |
| C-17 | `docs/v6-admin-rebuild - Copy - Copy.md` | file copy thừa | `git clean -f "docs/v6-admin-rebuild - Copy - Copy.md"` |
| C-18 | `fix.patch` | dev artifact | `git clean -f fix.patch` |
| C-19 | `temp.diff` | dev artifact | `git clean -f temp.diff` |
| C-20 | `rls-probe-insert.txt` | dev probe | `git clean -f rls-probe-insert.txt` |
| C-21 | `rls-probe-output.txt` | dev probe | `git clean -f rls-probe-output.txt` |
| C-22 | `scratch-tracked.txt` | dev artifact | `git clean -f scratch-tracked.txt` |
| C-23 | `patch_test.ps1` | dev test | `git clean -f patch_test.ps1` |
| C-24 | `patch_test2.ps1` | dev test | `git clean -f patch_test2.ps1` |
| C-25 | `patch_test3.ps1` | dev test | `git clean -f patch_test3.ps1` |
| C-26 | `update_globals.js` | dev script (unknown scope) | **TIER 1 verify trước** — nếu test fixture thì move to scratch |
| C-27 | `scripts/debug-parser.mjs` | debug script | move to scratch: `mv scripts/debug-parser.mjs scratch/` |

---

### 🟢 Untracked → MOVE-TO-SCRATCH (giữ reference, không track)

| # | Path | Lý do | Lệnh |
|---|---|---|---|
| C-28 | `new-ui/` (16 file: components/*.tsx, code.html, DESIGN.md, screen.png) | SEP đã chọn Hướng B ngày 07/09 11:15; file là reference mockup Phase 1C DRAFT | `mv new-ui scratch/new-ui-HuongB-ref-2026-09-07` |
| C-29 | `new-ui.md` | ghi chú Hướng B | `mv new-ui.md scratch/new-ui.md` |
| C-30 | `tests/browser/public-home.spec.ts` | Tier 5 test-01 DRAFT spec, chưa track | `mv tests/browser scratch/tests-browser-2026-09-07`; `rmdir tests` nếu rỗng |
| C-31 | `playwright.config.ts` | config cho spec trên | `mv playwright.config.ts scratch/playwright.config.ts-2026-09-07` |

---

### 🟢 Untracked → COMMIT (hợp lệ)

| # | Path | Action | Ghi chú |
|---|---|---|---|
| C-32 | `docs/V6/aff_plan.md` | COMMIT (Tier 1 khi V6 plan freeze) | canonical V6 plan; thay thế `docs/aff_plan.md` |
| C-33 | `docs/V6/v6-admin-rebuild.md` | COMMIT | V6 plan |
| C-34 | `docs/V6/v6-admin-rebuild_ROADMAP.md` | COMMIT | V6 roadmap |
| C-35 | `docs/V6/` rỗng | tạo thư mục | commit cùng 3 file trên |
| C-36 | `docs/tasks/hrp-v6-p1-job-opening-posting-split/` | COMMIT | V6 phase 1A DRAFT |
| C-37 | `docs/tasks/hrp-v6-p1-labor-profile-schema/` | COMMIT | V6 phase 1B DRAFT |
| C-38 | `docs/tasks/hrp-v6-p1c-new-ui-restyling/` | COMMIT | V6 phase 1C DRAFT |
| C-39 | `docs/tasks/hrp-v6-security-credential-rotation/` | COMMIT | task security DRAFT (sẵn sàng cho STEP-01..06) |
| C-40 | `docs/tasks/hrp-v6-security-credential-rotation/evidence/` (nếu có) | COMMIT | evidence security DRAFT |
| C-41 | `docs/tasks/hrp-v5-test-01-browser-lane/AUDIT.md` | COMMIT | Tier 3 TEST-01 audit |
| C-42 | `docs/tasks/hrp-v5-test-01-browser-lane/HANDOFF.md` | COMMIT | Tier 2 TEST-01 HANDOFF |
| C-43 | `docs/tasks/hrp-v5-test-01-browser-lane/evidence/` | COMMIT | evidence |
| C-44 | 21 file `evidence/go21-*-r2*.txt` (task 21) | COMMIT | Tier 2 round 2 evidence |
| C-45 | `evidence/go21-s07-scratch-tracked.txt` | COMMIT | |
| C-46 | `evidence/go21-s08-coverage.txt` | COMMIT | |
| C-47 | `evidence/go21-s10-*.txt` (nhiều file) | COMMIT | |

Commit scope đề xuất:
```bash
# Commit A — V6 DRAFT planning files
git add docs/V6/ docs/tasks/hrp-v6-p1-* docs/tasks/hrp-v6-p1c-* docs/tasks/hrp-v6-security-credential-rotation/
git commit -m "docs(v6): import V6 planning contracts (phase 1A/1B/1C + security rotation)

- docs/V6/aff_plan.md (canonical; replaces docs/aff_plan.md)
- docs/V6/v6-admin-rebuild.md + roadmap
- docs/tasks/hrp-v6-p1-labor-profile-schema (Phase 1A DRAFT)
- docs/tasks/hrp-v6-p1-job-opening-posting-split (Phase 1B DRAFT)
- docs/tasks/hrp-v6-p1c-new-ui-restyling (Phase 1C DRAFT, Huong B)
- docs/tasks/hrp-v6-security-credential-rotation (ESCALATE_NEW_TASK from AUD-001)

Status: all DRAFT; no execution round opened.
Refs: PLANNER_HANDOVER §0; ROADMAP_CURSOR"

# Commit B — TEST-01 audit + HANDOFF
git add docs/tasks/hrp-v5-test-01-browser-lane/
git commit -m "docs(test-01): Tier 3 AUDIT + Tier 2 HANDOFF + evidence (TEST-01 ACCEPTED)"

# Commit C — task 21 round 2 evidence
git add docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/
git commit -m "evidence(go21): round 2 evidence files (scratch-tracked, coverage, apply, build, log)"
```

---

### 🟡 Untracked → VERIFY (Tier 1/Tier 3 cần trả lời)

| # | Path | Câu hỏi |
|---|---|---|
| C-48 | `.claude/` (skills + worktrees) | Có nên gitignore? Hiện KHÔNG có trong `.gitignore`. Nếu KHÔNG track → đề xuất thêm `.claude/` vào `.gitignore` để an toàn. **KHÔNG xoá** vì đã setup skills. |
| C-49 | `docs/aff_plan.md` (D trong worktree) | CẦN `git rm docs/aff_plan.md` (vì đã có V6 replacement ở `docs/V6/aff_plan.md`) |

---

### ✅ Đã sạch (giữ nguyên)

| Loại | Status |
|---|---|
| `.env*` tracked (chỉ `.env.example`) | ✅ |
| `scratch/` (257 file / 2.2 MB, gitignored) | ✅ |
| HEAD 10 commit cuối (task 21 r1-FIX, scoped) | ✅ |
| Branch `main`, không upstream (local-only) | ✅ |
| `evidence/` dir đã được ignore | ✅ |

---

## 2. Lệnh một-shot cho Tier 2 STEP-10

Sau khi Tier 1 commit C-02..C-04 + Tier 3 commit audit round 2 các task trên, Tier 2 chạy:

```bash
# 1. Tier 1 patch (apply first if not yet committed)
# (Tier 1 already commits C-02..C-04 in separate step)

# 2. Tier 3 audit round 2 commits (Tier 3 applies independently)

# 3. V6 planning commit (Commit A)
git add docs/V6/ docs/tasks/hrp-v6-p1-* docs/tasks/hrp-v6-p1c-* docs/tasks/hrp-v6-security-credential-rotation/
git diff --cached --stat  # verify scope
git commit -m "docs(v6): import V6 planning contracts (phase 1A/1B/1C + security rotation)"

# 4. TEST-01 audit/HANDOFF commit (Commit B)
git add docs/tasks/hrp-v5-test-01-browser-lane/
git commit -m "docs(test-01): Tier 3 AUDIT + Tier 2 HANDOFF + evidence"

# 5. Task 21 evidence commit (Commit C)
git add docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/
git commit -m "evidence(go21): round 2 evidence files"

# 6. Cleanup rác (C-14..C-27)
git clean -f "docs/aff_plan - Copy.md" \
           "docs/aff_plan - Copy (2).md" \
           "docs/v6-admin-rebuild - Copy.md" \
           "docs/v6-admin-rebuild - Copy - Copy.md" \
           fix.patch temp.diff \
           rls-probe-insert.txt rls-probe-output.txt scratch-tracked.txt \
           patch_test.ps1 patch_test2.ps1 patch_test3.ps1
# debug-parser.mjs: move to scratch manually
mv scripts/debug-parser.mjs scratch/debug-parser-2026-09-07.mjs

# 7. Move-to-scratch (C-28..C-31)
mv new-ui scratch/new-ui-HuongB-ref-2026-09-07
mv new-ui.md scratch/new-ui.md
mv tests/browser scratch/tests-browser-2026-09-07
mv playwright.config.ts scratch/playwright.config.ts-2026-09-07

# 8. Remove old aff_plan.md (C-49)
git rm docs/aff_plan.md

# 9. (Optional) gitignore .claude
echo ".claude/" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore .claude/ (skills + worktrees)"

# 10. Final verify
git status --porcelain  # expect empty
rg npg_E0eqUu7aHtpI --type-add 'cjs:*.cjs' -tcjs  # expect 0 hit (only allowlisted in task security TASK.md)
```

---

## 3. Verification gate sau cleanup

| Check | Expected | Lệnh |
|---|---|---|
| `git status --porcelain` rỗng | 0 line | `git status --porcelain \| wc -l` = `0` |
| `git ls-files '.env*'` | 1 (chỉ `.env.example`) | `git ls-files '.env*' \| wc -l` = `1` |
| `git ls-files check_rls.cjs` | rỗng | `git ls-files check_rls.cjs` empty |
| `rg npg_E0eqUu7aHtpI` worktree | 0 (ngoài whitelist task security) | `rg npg_E0eqUu7aHtpI` chỉ hit ở `TASK.md` references |
| `scratch/` size | tăng ~ (16 file new-ui + tests + debug + playwright.config) | `du -sh scratch/` |
| HEAD commit | ≥ +5 commit so với `5978065` (C-02..04, A, B, C, gitignore) | `git log --oneline 5978065..HEAD` |
| `docs/V6/aff_plan.md` tracked | yes | `git ls-files docs/V6/aff_plan.md` non-empty |
| `docs/aff_plan.md` tracked | no | `git ls-files docs/aff_plan.md` empty |

---

## 4. Liên kết với task hiện tại

| Task | Owner STEP | CLEANUP-PLAN map |
|---|---|---|
| `hrp-v5-go-live-21-credential-hygiene-closure` | STEP-10 (cleanup branch/artifact) | C-14..C-27 (xóa rác), C-28..C-31 (move-to-scratch), C-49 (`git rm docs/aff_plan.md`) |
| `hrp-v6-security-credential-rotation` | STEP-01..03 (repo hygiene) | C-01 (untrack + sanitize check_rls.cjs) |
| Tier 1 (cosmetic commit) | (independent) | C-02..C-04 |
| V6 DRAFT import | (independent, commit A) | C-32..C-43 |
| TEST-01 audit/HANDOFF | (Tier 3/Tier 2 independent) | C-41..C-43 |
| Task 21 evidence round 2 | (Tier 2 evidence gate) | C-44..C-47 |

## 5. Câu hỏi mở cho Tier 1 (cần trả lời trước 09:00 ngày 08/09)

1. **C-13 `role-guard-layout.tsx`**: thuộc task nào, có commit scoped hay revert?
2. **C-11 `package.json/lock.json`**: nếu đã thêm playwright dep nhưng spec không track thì revert; nếu dùng cho Phase 1C thì giữ và KEEP `tests/browser/` (C-30 đổi từ MOVE sang COMMIT).
3. **C-26 `update_globals.js`**: verify scope — test fixture hay dev hack?
4. **C-48 `.claude/`**: thêm `.claude/` vào `.gitignore` hay giữ untracked?

Trả lời 4 câu này sẽ quyết định cleanup có hoàn chỉnh hay không.
