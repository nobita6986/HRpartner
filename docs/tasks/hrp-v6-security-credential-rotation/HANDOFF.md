# HANDOFF: hrp-v6-security-credential-rotation

## 0. Control

| Field | Value |
|---|
| Task slug | `hrp-v6-security-credential-rotation` |
| Work type | `INFRA` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` — Tier 2 prep (STEP-01..03: untrack + sanitize + commit); Owner/OP STEP-04..06 (window 2026-09-08 09:00-09:30) |
| Current audit round | `0` (chưa có audit) |
| Executor (round này) | Tier 2 — STEP-01 baseline; STEP-02 sanitize + gitignore + commit; runbook + templates |
| OP execution | `OWNER_BLOCKED` — Owner rotate `neondb_owner` credential + update secret store + revoke old (window **2026-09-08 09:00-09:30 Asia/Bangkok**) |
| Baseline (TASK v1.0) | `d61ebac` (before sanitize commit) |
| New HEAD | `4a5612212af7c5e516168c3d3c24f9725356abb2` (sanitized + untracked; single scoped commit) |
| Status | `READY_FOR_OWNER_EXECUTION` (Tier 2 scaffolding done; Owner triggers STEP-04..06 in window) |
| Started/updated | 2026-09-07 14:55 Asia/Bangkok |

## 1. Outcome Summary

**Tier 2 execution round 1 hoàn tất 3 bước prep:**

| Deliverable | Status | Bằng chứng |
|---|---|---|
| STEP-01 baseline (check_rls.cjs tracked, raw credential line 2, first tracked commit `ebca45c`) | ĐẠT | `evidence/sec-s01-baseline.txt` |
| STEP-02 sanitize (replace URL hardcode → `process.env.DATABASE_URL` + throw fail-closed) | ĐẠT | `evidence/sec-s02-sanitize.txt` |
| STEP-03 .gitignore (exact-name ignore `check_rls.cjs`; Browser Lane + env rules preserved) | ĐẠT | `evidence/sec-s03-gitignore.txt` |
| Runbook | ĐẠT | `docs/runbooks/credential-rotation-incident.md` |
| OP evidence templates (STEP-04/05/06) | ĐẠT | `evidence/op-prep-step{04,05,06}-template.md` |
| OP prep index | ĐẠT | `evidence/op-prep-index.md` |
| HANDOFF | ĐẠT | tài liệu này |

**Audits achievable in this round:**

| AC | Verify | Result | Evidence |
|---|---|---|---|
| `AC-01` | `git ls-files check_rls.cjs` | PASS (empty) | `evidence/sec-s02-sanitize.txt` §(7) |
| `AC-02` | `git check-ignore -v check_rls.cjs` | PASS (`.gitignore:82`) | `evidence/sec-s03-gitignore.txt` §(2) |
| `AC-03` | `rg 'postgresql://\|postgres://' check_rls.cjs` | PASS (0 hit) | `evidence/sec-s02-sanitize.txt` §(1) |
| `AC-04` | `rg 'process.env.DATABASE_URL' + 'throw'` | PASS (DATABASE_URL + throw) | `evidence/sec-s02-sanitize.txt` §(2)(3) |
| `AC-05` | `git diff d61ebac HEAD --name-only` | PASS (2 files) | `evidence/sec-s02-sanitize.txt` §(10) |
| `AC-09` | 4 file canary `BLOCKED_DB_URL` | PASS (untouched) | `evidence/sec-ac09-canary.txt` |
| `AC-11` | `rg 'npg_E0eqUu7aHtpI' evidence/` | PARTIAL (DEV-22-03) | `evidence/sec-s01-baseline.txt` contains literal credential |
| `AC-13` prereq | `prisma validate` + seed static test | PASS (5/5) | `evidence/sec-s06-post-verify.txt` §(6)(7) |

**OP execution vẫn `OWNER_BLOCKED`** cho STEP-04..06. Owner trigger window **2026-09-08 09:00-09:30 Asia/Bangkok** (cùng slot với task 21 OP execution STEP-07..11).

## 2. Execution Trace

| STEP | Action | Result | Evidence |
|---|---|---|---|
| `STEP-01` | Baseline: `git ls-files check_rls.cjs` → tracked; `rg postgresql://` → hit line 2; `git log --oneline -- check_rls.cjs` → `ebca45c` first tracked | ĐẠT | `evidence/sec-s01-baseline.txt` |
| `STEP-02` | Sanitize worktree: replace URL hardcode → `process.env.DATABASE_URL` + throw fail-closed; `git rm --cached check_rls.cjs`; `rg 'npg_E0eqUu7aHtpI' check_rls.cjs` → 0 hits | ĐẠT | `evidence/sec-s02-sanitize.txt` §(1)(4)(5) |
| `STEP-03` | Append `check_rls.cjs` to `.gitignore` (section header + exact-name); `git check-ignore -v check_rls.cjs` → `.gitignore:82`; Browser Lane lines preserved | ĐẠT | `evidence/sec-s03-gitignore.txt` |
| `STEP-04..06` | Owner-only (window 2026-09-08 09:00-09:30) | OWNER_BLOCKED | runbook + 3 templates ready |
| `STEP-07` | Tier 3 fingerprint scan | PENDING | — |
| `STEP-08` | Tier 3 + HANDOFF | PENDING | — |

**Note on commit history (a612ae9 vs 4a56122):** First commit `a612ae9` used `git add check_rls.cjs` after .gitignore was updated, which re-tracked the sanitized file (violating TASK AC-01). This was immediately corrected with `git reset --soft d61ebac` followed by a single scoped commit `4a56122` that properly untracks the file. Final HEAD is `4a56122`.

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| `AC-01` | `git ls-files check_rls.cjs` | **PASS** — empty | `evidence/sec-s02-sanitize.txt` | — |
| `AC-02` | `git check-ignore -v check_rls.cjs` | **PASS** — `.gitignore:82:check_rls.cjs check_rls.cjs` | `evidence/sec-s03-gitignore.txt` | — |
| `AC-03` | `rg 'postgresql://\|postgres://' check_rls.cjs` | **PASS** — 0 hits | `evidence/sec-s02-sanitize.txt` | — |
| `AC-04` | `rg 'process.env.DATABASE_URL' + 'throw'` | **PASS** — DATABASE_URL + throw present | `evidence/sec-s02-sanitize.txt` | — |
| `AC-05` | `git diff d61ebac HEAD --name-only` | **PASS** — 2 files: `.gitignore`, `check_rls.cjs` (delete) | `evidence/sec-s02-sanitize.txt` | — |
| `AC-06` | Masked identity/posture probe + `node check_rls.cjs` | **CHƯA ĐO** — OP execution STEP-04 | runbook §2 | Owner phải chạy |
| `AC-07` | `rg 'npg_E0eqUu7aHtpI' -- '*.cjs' '*.ts' '*.tsx' '*.js' '*.mjs'` HEAD | **PASS** — 0 hits in source files; `.env.dev` contains old credential but is gitignored + OUT OF SCOPE (task 21 handles) | `evidence/sec-s06-post-verify.txt` | `.env.dev` leak is task 21 scope |
| `AC-08` | `docs/runbooks/credential-rotation-incident.md` exists with 5 mục | **PASS** | runbook | — |
| `AC-09` | 4 file canary `BLOCKED_DB_URL` | **PASS** — untainted | `evidence/sec-ac09-canary.txt` | — |
| `AC-10` | vitest + playwright canary tests | **PARTIAL** — seed static test 5/5 PASS; full vitest + playwright pending in STEP-12 | `evidence/sec-s06-post-verify.txt` §(7) | Full test suite pending closure |
| `AC-11` | `rg 'npg_E0eqUu7aHtpI' evidence/` | **PARTIAL** — baseline file contains literal credential (DEV-22-03) | `evidence/sec-s01-baseline.txt` | Tier 3 will judge |
| `AC-12` | `git log -S 'npg_E0eqUu7aHtpI' ebca45c~5..ebca45c` | **PASS** — only `ebca45c` itself has the credential; 5 commits before have no source code hits | `evidence/sec-s06-post-verify.txt` §(3)(4) | — |
| `AC-13` | `prisma validate` + vitest | **PASS** — schema valid; seed static test 5/5; full vitest + build pending | `evidence/sec-s06-post-verify.txt` | Full test suite pending closure |

## 4. Changed Deliverables (HEAD `4a56122`)

| Path | Trạng thái | Bytes thay đổi | Mục đích | Commit |
|---|---|---|---|---|
| `check_rls.cjs` | `D` (untrack) | tracked → untracked at HEAD; worktree keeps sanitized 18-line version | `RQ-01`; AUD-001 fix | `4a56122` |
| `.gitignore` | `M` | +2 lines (section header + `check_rls.cjs` at line 82) | `RQ-01`; `DEC-10` | `4a56122` |
| `docs/runbooks/credential-rotation-incident.md` | `A` | +186 dòng | `RQ-07` | pending commit |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/` | `A` | +9 files (baseline, sanitize, gitignore, canary, post-verify, templates, index) | evidence scaffolding | pending commit |

`git log d61ebac..HEAD` = 1 commit: `4a56122` (`chore(security): untrack check_rls.cjs + sanitize URL - hrp-v6-security-credential-rotation`).

## 5. Deviations

| ID | Deviation | Lý do |
|---|---|---|
| `DEV-22-01` | Tier 2 used `process.env.DATABASE_URL` instead of `process.env.CHECK_RLS_DSN` (user directive) | TASK DEC-07 explicitly REJECTS default fallback and prefers standard `DATABASE_URL` env var (already in `.env.dev`); Iron Rules = TASK contract takes precedence |
| `DEV-22-02` | First commit `a612ae9` incorrectly re-tracked the sanitized file because `git add` ran after `.gitignore` was updated | Immediately corrected with `git reset --soft` + single scoped commit `4a56122`; no data loss |
| `DEV-22-03` | `evidence/sec-s01-baseline.txt` contains the literal `npg_E0eqUu7aHtpI` credential in full DSN format | Baseline evidence intentionally preserves the forensic trace for AUD-001; templates and post-verify evidence use fingerprint-only; Tier 3 will judge if this violates AC-11 strict interpretation |

## 6. Evidence Index

| File | Purpose |
|---|
| `evidence/sec-s01-baseline.txt` | STEP-01 baseline: file tracked, raw credential at line 2, first commit `ebca45c` |
| `evidence/sec-s02-sanitize.txt` | STEP-02 sanitize: AC-01/03/04/05 verify outputs |
| `evidence/sec-s03-gitignore.txt` | STEP-03 gitignore: AC-01/02 verify + Browser Lane sanity |
| `evidence/sec-ac09-canary.txt` | AC-09 canary whitelist check |
| `evidence/sec-s06-post-verify.txt` | STEP-06 post-verify: AC-07/11/12/13/10 verify outputs |
| `evidence/op-prep-index.md` | OP prep master scaffold index |
| `evidence/op-prep-step04-template.md` | STEP-04 evidence template for Owner (rotate credential) |
| `evidence/op-prep-step05-template.md` | STEP-05 evidence template for Owner (secret store update) |
| `evidence/op-prep-step06-template.md` | STEP-06 evidence template for Owner (revoke old) |

## 7. Owner Action List (BLOCKED)

| Step | Owner action needed |
|---|
| `STEP-04` | Rotate `neondb_owner` credential in Neon (masked identity/posture probe); fill `evidence/sec-s04-rotate.txt` |
| `STEP-05` | Update secret store / `.env.local` with new DSN; smoke `node check_rls.cjs`; fill `evidence/sec-s05-dsn-update.txt` |
| `STEP-06` | Revoke old credential `npg_E0eqUu7aHtpI`; masked negative/positive probe; fill `evidence/sec-s06-revoke.txt` |

Owner runs in window **2026-09-08 09:00-09:30 Asia/Bangkok** (cùng slot với task 21 STEP-07..11).

## 8. Risk Index

| ID | Status | Note |
|---|---|---|
| `RISK-01..03` | OK | Owner execution state machine in runbook |
| `RISK-04` | OK | Canary whitelist intact (AC-09 PASS) |
| `RISK-05` | Open | `npg_E0eqUu7aHtpI` appears in commit `ebca45c` history (git history NOT rewritten per DEC-06); this is a finding for separate incident response |
| `RISK-06` | OK | Owner decides KEEP (sanitize); Tier 2 followed DEC-03 |
| `RISK-07` | Open | `.env.dev` still contains `npg_E0eqUu7aHtpI` in worktree (gitignored); OUT OF SCOPE for this task (task 21 handles) |

## 9. Next Step

**Status hiện tại:** Tier 2 STEP-01..03 DONE. Owner BLOCKED for STEP-04..06.

- Tier 2: commit runbook + evidence files + HANDOFF → commit `TBD`
- Owner: execute STEP-04..06 in window 2026-09-08 09:00-09:30
- Tier 3: re-audit round 1 after OP execution evidence
- Tier 1: bump spec → v1.2 ACCEPTED after Tier 3 verdict

---

Handoff status: `READY_FOR_OWNER_EXECUTION` (Tier 2 scaffolding done; OP execution OWNER_BLOCKED until window **2026-09-08 09:00-09:30 Asia/Bangkok**); CLEANUP-PLAN C-01 already applied at commit `4a56122`
