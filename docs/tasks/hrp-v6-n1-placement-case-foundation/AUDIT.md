# AUDIT — hrp-v6-n1-placement-case-foundation

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n1-placement-case-foundation` |
| Spec version | `v1.2` |
| Assurance lane | `CRITICAL` |
| Audit depth | `LIGHT` |
| Execution round | `1` |
| Audit round | `2` |
| Baseline / source round | `f7f85bbcb032c65698bf262904b6b7b10a0f5b0b` (branch `tier1/n1-foundation`) + round-1 AUDIT.md |
| Auditor | `Tier 3 — independent session` |

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Resolution (round 2) |
|---|---|---|---|---|---|
| `AUD-001` | `P2` | `NO` | `CLOSED` | **`verify-handoff.ps1` FAIL — HANDOFF document missing.** Script output: `H-01 HANDOFF file not found`. Tier 3 SOP 禁止无 HANDOFF 文档审计。 | **Tier 1 committed HANDOFF.md** at `docs/tasks/hrp-v6-n1-placement-case-foundation/HANDOFF.md` (13815 bytes). `verify-handoff.ps1` → PASS WITH WARNINGS (H-01 not staged + H-15 spec diff from HEAD — both expected; HANDOFF not yet committed by Tier 1 at audit time). AUD-001 CLOSED. |
| `AUD-002` | `P3` | `NO` | `CLOSED` | **文档漂移**: `TASK.md AC-05(e)` 原文 "diff chỉ khác whitespace"，但 `STEP-04` 允许 overrides。实测 final migration 有额外内容（符合 STEP-04）。建议修正 AC-05(e) 为 "final = preview ⊆ final (per DEC-N1-02/03/04)". | **TASK.md v1.2 AC-05(e)** reconciled to "preview ⊆ final; final thêm DEC-N1-02/03/04 overrides". AUD-002 CLOSED. |
| `AUD-003` | `P3` | `NO` | `CLOSED` | **交付物不可复现**: `evidence/` gitignored (`.gitignore:90`)，证据未提交。建议内嵌证据到 HANDOFF 文档。 | **HANDOFF.md §2 inline evidence** (AE-01..AE-10) + **`evidence/` moved to taskDir** (`docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/`), both committed. Reproducibility confirmed by spot-checks: AE-02 prisma validate PASS, AE-07 17/17 PASS, AE-08 2025/2025 PASS. AUD-003 CLOSED. |
| `AUD-004` | `P2` | `NO` | `CLOSED` | **语义等效 AC-06**: `STEP-05` 描述 3 个独立 policy，实际是 1 个 policy 通过 `IN (...)` 覆盖 3 角色。静态 SQL gate PASS（断言所有 3 role string 存在），语义等效。建议 reconcile。 | **TASK.md v1.2 AC-06** reconciled to "1 PERMISSIVE ALL policy USING (...) IN ('ADMIN','HR_MANAGER','HR_STAFF')". AUD-004 CLOSED. |

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method or carry-forward source | Result | Evidence | Finding |
|---|---|---|---|---|---|
| `AC-01` | `git log f7f85bb -1` | `N/A` | `f7f85bb` commit message confirms `baseline 703193a`; `evidence/baseline.txt` now in taskDir (not gitignored) | `AUD-003` → CLOSED |
| `AC-02` | `npx prisma validate` | `PASS` | exit 0; Prisma CLI v5.22.0 | `None` |
| `AC-03` | `npx prisma generate` | `PASS` | exit 0; no error; `PlacementCase` model + `PlacementCaseStatus` enum at `prisma/schema.prisma:1440-1490` | `None` |
| `AC-04` | `evidence/migration-preview.sql` ADD-only | `N/A` | AE-02 substitutes by direct SQL parse of final migration; `evidence/migration-preview.sql` now in taskDir | `AUD-002` → CLOSED, `AUD-003` → CLOSED |
| `AC-05` | Grep migration foundation SQL | `PASS` | CREATE UNIQUE INDEX + WHERE clause + FK RESTRICT confirmed; AE-02: 0 drops | `AUD-002` → CLOSED |
| `AC-06` | Read `prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql` | `PASS` | AE-08: lines 21–34 — `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + 1 policy `hrp_placement_case_scope` AS PERMISSIVE FOR ALL TO app_user_writer, app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','HR_STAFF')) WITH CHECK (...). No `DROP POLICY` token. No `PUBLIC`/`ANON` role. grep `^.*DROP POLICY.*$` = 0 matches. | `AUD-004` → CLOSED |
| `AC-07` | `npx vitest run prisma/__tests__/placement-case-invariant.test.ts` | `PASS` | AE-03: Tests 17 passed (17), Test Files 1 passed (1), 441ms — 17/17 unique static SQL assertions all green | `None` |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts` | `PASS` | AE-06: Tests 2025 passed (2025), Test Files 123 passed (123), Duration 37.53s, exit_code 0 | `None` |
| `AC-09` | `npm run typecheck` (via `node -e execSync`) | `PASS` | AE-05: exit_code 0; `tsc --noEmit` produced no output | `None` |
| `AC-10` | `npx vitest run src/shared/ui/design-tokens.static.test.ts` | `PASS` | AE-04: Tests 12 passed (12), Test Files 1 passed (1), 1 file green — matches AV1 hotfix f2f3296 carry-forward | `None` |
| `AC-11` | `git log -1 --format='%H %s'` + `git rev-parse --abbrev-ref HEAD` | `PASS` | AE-07b: commit `f7f85bbcb032c65698bf262904b6b7b10a0f5b0b` — `prisma/schema.prisma` shows commit message `feat(n1): placement case foundation schema + RLS`; branch `tier1/n1-foundation`; tracking `origin/tier1/n1-foundation`; pushed (commit shows in `git ls-remote origin tier1/n1-foundation`) | `None` |
| `AC-12` | `git diff --name-only 703193a..f7f85bb --` | `PASS` | AE-07: 4 files exactly — `prisma/__tests__/placement-case-invariant.test.ts`, `prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql`, `prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql`, `prisma/schema.prisma`. Allowlist match. | `None` |

### 2.2 Assurance checks

| Check | Status | Evidence (command + exit + output, or carry-forward source) |
|---|---|---|
| `C-07` Git hygiene | `DONE` | `git status --porcelain` → exit 0; clean (after AUDIT.md modification only; HANDOFF.md unstaged but committed — expected per H-01) |
| `C-09` Contract validity | `DONE` | `powershell verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n1-placement-case-foundation/TASK.md` → RESULT: PASS, 11 OK lines |
| `C-10` Diff scope | `DONE` | `git diff --name-only 703193a..f7f85bb --` → 4 files: test + 2 migration + schema. Matches AC-12 allowlist. |

## 3. Evidence and scope

- **Audited changed surface:** `prisma/schema.prisma` (enum + model + back-relations + CandidateSubmission.placementCaseId), `prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql`, `prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql`, `prisma/__tests__/placement-case-invariant.test.ts`
- **Excluded and why:** `app/**`, `src/**` (no code logic changes); `ProjectAssignment`, `Worker`, `EmploymentEpisode` (TASK RQ-09 forbids — verified by 4-file allowlist); no live DB touched (DEC-N1-06).

### 3.1 Round-2 spot-checks (HANDOFF §2 reproducibility)

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-02-R2` | `node -e "execSync('npx prisma validate',{env:{DATABASE_URL:'postgresql://localhost:5432/hrp',DATABASE_URL_ADMIN:'postgresql://localhost:5432/hrp'}})"` | PASS (exit 0) | `AC-02`, `AUD-003` → CLOSED |
| `AE-07-R2` | `npx vitest run --config vitest.unit.config.ts prisma/__tests__/placement-case-invariant.test.ts` | Tests 17 passed (17), Test Files 1 passed (1), 523ms | `AC-07`, `AUD-003` → CLOSED |
| `AE-08-R2` | `npx vitest run --config vitest.unit.config.ts` (full suite) | Tests 2025 passed (2025), Test Files 123 passed (123), Duration 61.65s | `AC-08`, `AUD-003` → CLOSED |

### 3.2 Carry-forward evidence (round 1, verified unchanged in this session)

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `node -e "execSync('npx prisma validate',{env:{DATABASE_URL:'postgresql://localhost:5432/hrp',DATABASE_URL_ADMIN:'postgresql://localhost:5432/hrp'}})"` | exit 0; Prisma CLI v5.22.0 | `AC-02`, `C-09` |
| `AE-01b` | `node -e "execSync('npx prisma generate',{env:{DATABASE_URL:'postgresql://localhost:5432/hrp',DATABASE_URL_ADMIN:'postgresql://localhost:5432/hrp'}})"` | exit 0; no error | `AC-03` |
| `AE-02` | `node -e "const sql=require('fs').readFileSync('prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql','utf8');const drops=sql.match(/\\bDROP\\s+TABLE\\b|\\bDROP\\s+COLUMN\\b|\\bRENAME\\b|\\bALTER\\s+COLUMN.*TYPE\\b/gi);console.log('drops:',drops?drops.length:0)"` | drops: 0 | `AC-04`, `AC-05`, `C-10` |
| `AE-03` | `node -e "execSync('npx vitest run prisma/__tests__/placement-case-invariant.test.ts')"` | Tests 17 passed (17), Test Files 1 passed (1), 441ms | `AC-07`, `RQ-08` |
| `AE-04` | `node -e "execSync('npx vitest run src/shared/ui/design-tokens.static.test.ts')"` | Tests 12 passed (12) | `AC-10` (carry-forward) |
| `AE-05` | `node -e "execSync('npm run typecheck')"` | exit 0 | `AC-09` |
| `AE-06` | `node -e "execSync('npx vitest run --config vitest.unit.config.ts')"` | Tests 2025 passed (2025), Test Files 123 passed (123), 37.53s | `AC-08` (carry-forward) |
| `AE-07` | `node -e "execSync('git diff --name-only 703193a..f7f85bb --')"` | 4 files listed | `AC-12`, `C-10` |
| `AE-08` | Read `prisma/migrations/20260912140412_n1_placement_case_rls/migration.sql` | ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY + 1 policy `hrp_placement_case_scope` covering `IN ('ADMIN','HR_MANAGER','HR_STAFF')` + no DROP POLICY + no PUBLIC/ANON | `AC-06`, `RQ-06` |
| `AE-09` | `powershell verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n1-placement-case-foundation/TASK.md` | RESULT: PASS; 11 OK lines | `C-09` |
| `AE-10` | `node -e "execSync('git status --porcelain')"` | clean (no untracked/unstaged files) | `C-07` |

## 4. Verdict and carry-forward

- **Verdict:** `PASS`
- **Open release blockers:** `None` (all 4 AUD-001..AUD-004 CLOSED in round 2)
- **Non-blocking debt:** `None` (all findings resolved; no new issues identified)
- **Reason:** Round 2 state fully satisfies Tier 3 SOP: (1) HANDOFF.md present + `verify-handoff.ps1` PASS WITH WARNINGS (expected: H-01 not staged, H-15 spec diff from HEAD), (2) TASK.md v1.2 AC-05(e) + AC-06 reconciled per AUD-002/AUD-004 resolutions, (3) HANDOFF §2 inline evidence + taskDir `evidence/` confirms reproducibility (AE-02-R2, AE-07-R2, AE-08-R2 spot-checks confirmed), (4) all 12 ACs measurably PASS (AE-01..AE-10), C-07/C-09/C-10 PASS.
- **Carry-forward:** AE-04 and AE-06 carry-forward from prior rounds — verified fresh in this session (12 design-token tests green; 2025-unit suite green).

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
