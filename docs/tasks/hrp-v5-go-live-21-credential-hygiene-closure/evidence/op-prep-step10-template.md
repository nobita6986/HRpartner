# OP prep — STEP-10 evidence template (Owner fills during window)

> **Audience:** Owner/OP. Tier 2 prep đã tạo CLEANUP-PLAN (`docs/cleanup/CLEANUP-PLAN.md`).
> Owner fill template này trong window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/go21-s10-cleanup.txt` after execution.
> **MUST NOT contain file content, file value, hoặc secret — chỉ path + KEEP/DELETE result.**

## 0. Local `.env*.local` disposition (Q-02 RESOLVED)

| Path | Disposition | Action | Result |
|---|---|---|---|
| `.env.local` | KEEP | giữ nguyên (ignored per `.gitignore:15`) | exists=yes / no |
| `.env.ops06a-test.local` | DELETE | `rm` literal path | exists_before=yes / exists_after=no |
| `.env.production.local` | DELETE | `rm` literal path | exists_before=yes / exists_after=no |

Post-check: `Test-Path` từng DELETE path → FALSE. KEEP path vẫn TRUE.

## 1. Neon branch deletion

```
target_branch:        pre-mp2-remediation-2026-08-28   (RESOLVED via EV-07)
must_keep_branch:     hrp_mp2_test                      (RESOLVED via DEC-05)

action:
  neon branches delete pre-mp2-remediation-2026-08-28 --project <id>
  → ts_utc: __________
  → result: SUCCESS | ERROR

post_check:
  neon branches list | grep pre-mp2-remediation-2026-08-28  →  exit_1 (not found)
  neon branches list | grep hrp_mp2_test                    →  match_found
```

## 2. CLEANUP-PLAN C-14..C-31 untracked cleanup

Tier 2 sở hữu phần này theo CLEANUP-PLAN §4 (chỉ file-by-file, KHÔNG `git clean` blanket).

| # | Path | Action | Result |
|---|---|---|---|
| C-14 | `docs/aff_plan - Copy.md` | `git clean -f` | deleted=yes |
| C-15 | `docs/aff_plan - Copy (2).md` | `git clean -f` | deleted=yes |
| C-16 | `docs/v6-admin-rebuild - Copy.md` | `git clean -f` | deleted=yes |
| C-17 | `docs/v6-admin-rebuild - Copy - Copy.md` | `git clean -f` | deleted=yes |
| C-18 | `fix.patch` | `git clean -f` | deleted=yes |
| C-19 | `temp.diff` | `git clean -f` | deleted=yes |
| C-20 | `rls-probe-insert.txt` | `git clean -f` | deleted=yes |
| C-21 | `rls-probe-output.txt` | `git clean -f` | deleted=yes |
| C-22 | `scratch-tracked.txt` | `git clean -f` | deleted=yes |
| C-23 | `patch_test.ps1` | `git clean -f` | deleted=yes |
| C-24 | `patch_test2.ps1` | `git clean -f` | deleted=yes |
| C-25 | `patch_test3.ps1` | `git clean -f` | deleted=yes |
| C-26 | `update_globals.js` | TIER 1 verify first | decision=KEEP\|DELETE |
| C-27 | `scripts/debug-parser.mjs` | `mv scripts/debug-parser.mjs scratch/debug-parser-2026-09-07.mjs` | moved=yes |
| C-28 | `new-ui/` | `mv new-ui scratch/new-ui-HuongB-ref-2026-09-07` | moved=yes |
| C-29 | `new-ui.md` | `mv new-ui.md scratch/new-ui.md` | moved=yes |
| C-30 | `tests/browser/` | `mv tests/browser scratch/tests-browser-2026-09-07` | moved=yes |
| C-31 | `playwright.config.ts` | `mv playwright.config.ts scratch/playwright.config.ts-2026-09-07` | moved=yes |
| C-49 | `docs/aff_plan.md` | `git rm docs/aff_plan.md` | removed=yes (replaced by `docs/V6/aff_plan.md`) |

## 3. Post-check

```
git status --porcelain | wc -l         →  0 (sạch; hoặc chỉ V6 planning files còn lại)
git ls-files '.env*'                   →  1 (.env.example only)
git ls-files check_rls.cjs             →  empty (sau khi task security STEP-01 commit)
git ls-files docs/aff_plan.md          →  empty (sau C-49)
git ls-files docs/V6/aff_plan.md       →  non-empty (V6 replacement tracked)
neon branches list | grep pre-mp2-...  →  exit_1
neon branches list | grep hrp_mp2_test →  match_found
```

## 4. Stop conditions

- KEEP path bị mất (e.g., `.env.local` bị DELETE do nhầm) → STOP, restore từ backup Owner
- `hrp_mp2_test` branch bị touch → STOP, restore từ PITR
- DELETE path còn tồn tại sau action → STOP, retry
- `git clean` blanket xoá file ngoài allowlist → STOP, restore từ commit

## 5. Evidence format

Save complete path-by-path result matrix + post-check counts + timestamps UTC vào `evidence/go21-s10-cleanup.txt`. Tier 3 sẽ verify trong re-audit round 3.
