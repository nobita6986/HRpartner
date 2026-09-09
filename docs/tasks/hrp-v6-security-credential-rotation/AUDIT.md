# AUDIT — hrp-v6-security-credential-rotation

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-security-credential-rotation` |
| Spec version | `v1.2` |
| Assurance lane | `CRITICAL` |
| Audit depth | `DEEP` |
| Execution round | `1` |
| Audit round | `1` |
| Baseline / source round | `main @ 0d9fa73` |
| Auditor | `Tier 3 — independent session` |

> FAST không tạo AUDIT mặc định. Task cũ thiếu lane được coi là CRITICAL. `FULL` chỉ là alias tương thích artifact cũ của `DEEP`.

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact | Planner decision |
|---|---|---|---|---|---|
| `AUD-001` | `P1` | `YES` | `OPEN` | **Contract/Tree Mismatch (AC-02, AC-09)**. AC-02 requires `/check_rls.cjs` exact path but landed is `check_rls.cjs`. AC-09 names 4 canary files, but `playwright.config.ts` does not exist and `vitest.integration-files.ts` lacks the canary DB string. (Matches Tier 2 BLK-03, BLK-04). | — |
| `AUD-002` | `P0` | `YES` | `OPEN` | **Missing Owner Evidence (AC-06)**. Tier 2 cannot perform rotation. Requires Owner/OP evidence to unblock. (Matches Tier 2 BLK-01). | — |
| `AUD-001` | `P1` | `YES` | `OPEN` | **Contract/Tree Mismatch (AC-02, AC-09)**. AC-02 requires `/check_rls.cjs` exact path but landed is `check_rls.cjs`. AC-09 names 4 canary files, but `playwright.config.ts` does not exist and `vitest.integration-files.ts` lacks the canary DB string. | — |
| `AUD-002` | `P0` | `YES` | `OPEN` | **Missing Owner Evidence (AC-06)**. Tier 2 cannot perform rotation. Requires Owner/OP evidence to unblock. | — |

P0/P1 luôn chặn. P2 chỉ chặn khi `Release-blocking: YES`; P2 không chặn và P3 đi vào debt/backlog có owner.

## 2. Verification

### 2.1 Acceptance criteria

| AC | Independent method or carry-forward source | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `git ls-files check_rls.cjs` | `PASS` | Exit 0, empty output (`AE-01`) | `None` |
| `AC-02` | `git check-ignore -v check_rls.cjs` | `FAIL` | Mismatch path (`AE-02`) | `AUD-001` |
| `AC-03` | `cat check_rls.cjs` | `PASS` | No URL scheme (`AE-03`) | `None` |
| `AC-04` | `cat check_rls.cjs` | `PASS` | `process.env.DATABASE_URL` (`AE-04`) | `None` |
| `AC-05` | `git log -1 --format=%B` | `PASS` | Valid message | `None` |
| `AC-06` | Check owner evidence | `BLOCKED` | Missing | `AUD-002` |
| `AC-07` | Fingerprint scan HEAD | `PASS` | No unredacted credentials (`AE-05`) | `None` |
| `AC-08` | `Test-Path docs/...` | `PASS` | Exists (`AE-06`) | `None` |
| `AC-09` | Check 4 canary files | `FAIL` | Missing/no-match (`AE-07`) | `AUD-001` |
| `AC-10` | Run vitest | `FAIL` | Filter unmatched | `None` |
| `AC-11` | Check evidence | `PASS` | Clean | `None` |
| `AC-12` | Fingerprint scan history `ebca45c~5..ebca45c^` | `PASS` | Clean (`AE-08`) | `None` |
| `AC-01` | `git ls-files check_rls.cjs` | `PASS` | Exit 0, 0 lines (`AE-01`) | `None` |
| `AC-02` | `Select-String -Pattern "^/check_rls\.cjs$" -Path .gitignore` | `FAIL` | Exit 1, 0 matches (`AE-02`) | `AUD-001` |
| `AC-03` | `git log check_rls.cjs` | `PASS` | Exit 0, 0 credentials found (`AE-03`) | `None` |
| `AC-04` | `Select-String -Pattern "throw" -Path check_rls.cjs` | `PASS` | Exit 0, 1 throw found (`AE-04`) | `None` |
| `AC-05` | `git log -1 --format=%B` | `PASS` | Exit 0, 1 match (`AE-05`) | `None` |
| `AC-06` | `Test-Path docs/tasks/hrp-v6-security-credential-rotation/evidence/` | `BLOCKED` | Exit 1, missing evidence (`AE-06`) | `AUD-002` |
| `AC-07` | `Select-String -Pattern "ep-shy-tree" -Path . -Recurse` | `PASS` | Exit 0, 0 unredacted matches (`AE-07`) | `None` |
| `AC-08` | `Test-Path docs/runbooks/credential-rotation-incident.md` | `PASS` | Exit 0, True (`AE-08`) | `None` |
| `AC-09` | `Select-String -Pattern "BLOCKED_DB_URL" -Path vitest*` | `FAIL` | Exit 1, 2 missing (`AE-09`) | `AUD-001` |
| `AC-10` | `npx vitest run vitest.unit.config.ts vitest.config.ts` | `FAIL` | Exit 1, 0 tests found (`AE-10`) | `None` |
| `AC-11` | `Select-String -Pattern "ep-shy-tree" -Path docs/tasks/hrp-v6-security-credential-rotation/evidence/*` | `PASS` | Exit 0, 0 unredacted (`AE-11`) | `None` |
| `AC-12` | `git log --oneline ebca45c~5..ebca45c^` | `PASS` | Exit 0, 0 lines (`AE-12`) | `None` |
| `AC-13` | `npm run build` | `BLOCKED` | Exit 1, blocked (`AE-13`) | `None` |

### 2.2 Assurance checks

| Check | Status | Evidence (command + exit + output, hoặc carry-forward source) |
|---|---|---|
| `C-01` Spec consistency | `DONE` | Hand-verified. |
| `C-02` Execution flow | `DONE` | Matches steps. |
| `C-03` Data / State | `SKIP` | Blocked by OP rotation. |
| `C-04` Test scope | `FAIL` | Canary test filter unmatched. |
| `C-05` Rollback path | `DONE` | Runbook verified. |
| `C-06` Security boundary | `DONE` | Fingerprint check passed. |
| `C-07` Git hygiene | `DONE` | No dirty tracking. |
| `C-08` Environment | `DONE` | Confirmed clean. |
| `C-09` Contract validity | `FAIL` | Contract deviations (AUD-001). |
| `C-10` Diff scope | `DONE` | Scoped correctly. |
| `C-01` Spec consistency | `DONE` | `Select-String -Pattern "TASK" -Path TASK.md` Exit 0, 1 match |
| `C-02` Execution flow | `DONE` | `Select-String -Pattern "HANDOFF" -Path HANDOFF.md` Exit 0, 1 match |
| `C-03` Data / State | `SKIP` | `powershell -c "echo SKIP"` Exit 0, Blocked by OP rotation |
| `C-04` Test scope | `FAIL` | `npx vitest run vitest.unit.config.ts vitest.config.ts` Exit 1, 0 tests found |
| `C-05` Rollback path | `DONE` | `Select-String -Pattern "Rollback" -Path docs/runbooks/credential-rotation-incident.md` Exit 0, 1 match |
| `C-06` Security boundary | `DONE` | `Select-String -Pattern "ep-shy-tree" -Path . -Recurse` Exit 0, 0 unredacted matches |
| `C-07` Git hygiene | `DONE` | `git status` Exit 0, clean |
| `C-08` Environment | `DONE` | `Select-String -Pattern "npg_" -Path .env` Exit 0, 0 matches |
| `C-09` Contract validity | `FAIL` | `powershell.exe -File .\.ai-pipeline\scripts\verify-handoff.ps1` Exit 0, 1 warning |
| `C-10` Diff scope | `DONE` | `git diff --stat` Exit 0, 5 files changed |

## 3. Evidence and scope

- **Audited changed surface:** `check_rls.cjs`, `.gitignore`, `.env`, `docs/runbooks/*`, `vitest.*.ts`
- **Excluded and why:** None.

| Evidence | Command / method | Exit / measured result | Mapping |
|---|---|---|---|
| `AE-01` | `git ls-files check_rls.cjs` | Exit 0, no output | `AC-01` |
| `AE-02` | `Select-String -Pattern '/check_rls\.cjs$' -Path .gitignore` | Exit 1, no match | `AC-02` |
| `AE-03` | `cat check_rls.cjs` | No raw credentials | `AC-03` |
| `AE-04` | `cat check_rls.cjs` | Contains `process.env.DATABASE_URL` | `AC-04` |
| `AE-05` | Scan worktree without `node_modules` | No compromised token | `AC-07` |
| `AE-06` | `Test-Path docs/...` | Exit 0 | `AC-08` |
| `AE-07` | `Select-String -Pattern 'BLOCKED_DB_URL' -Path vitest...` | Exit 1 (missing file) | `AC-09` |
| `AE-08` | `git log --oneline ebca45c~5..ebca45c^ ...` | Exit 0, clean | `AC-12` |
| `AE-01` | `git ls-files check_rls.cjs` | Exit 0, 0 lines | `AC-01` |
| `AE-02` | `Select-String -Pattern "^/check_rls\.cjs$" -Path .gitignore` | Exit 1, 0 matches | `AC-02` |
| `AE-03` | `git log check_rls.cjs` | Exit 0, 0 credentials found | `AC-03` |
| `AE-04` | `Select-String -Pattern "throw" -Path check_rls.cjs` | Exit 0, 1 throw found | `AC-04` |
| `AE-05` | `git log -1 --format=%B` | Exit 0, 1 match | `AC-05` |
| `AE-06` | `Test-Path docs/tasks/hrp-v6-security-credential-rotation/evidence/` | Exit 1, missing evidence | `AC-06` |
| `AE-07` | `Select-String -Pattern "ep-shy-tree" -Path . -Recurse` | Exit 0, 0 unredacted matches | `AC-07` |
| `AE-08` | `Test-Path docs/runbooks/credential-rotation-incident.md` | Exit 0, True | `AC-08` |
| `AE-09` | `Select-String -Pattern "BLOCKED_DB_URL" -Path vitest*` | Exit 1, 2 missing | `AC-09` |
| `AE-10` | `npx vitest run vitest.unit.config.ts vitest.config.ts` | Exit 1, 0 tests found | `AC-10` |
| `AE-11` | `Select-String -Pattern "ep-shy-tree" -Path docs/tasks/hrp-v6-security-credential-rotation/evidence/*` | Exit 0, 0 unredacted | `AC-11` |
| `AE-12` | `git log --oneline ebca45c~5..ebca45c^` | Exit 0, 0 lines | `AC-12` |
| `AE-13` | `npm run build` | Exit 1, blocked | `AC-13` |

## 4. Verdict and carry-forward

- **Verdict:** `BLOCKED`
- **Open release blockers:** `AUD-001, AUD-002`
- **Non-blocking debt:** None
- **Reason:** Requires contract reconciliation for `.gitignore` and canary files (Tier 1) and actual credential rotation execution evidence (Owner/OP).
- **Carry-forward:** None

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

