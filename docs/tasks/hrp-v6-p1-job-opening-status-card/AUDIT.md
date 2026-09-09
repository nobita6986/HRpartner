# AUDIT — hrp-v6-p1-job-opening-status-card

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1-job-opening-status-card` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit depth | `DELTA` |
| Execution round | `2` |
| Audit round | `2` |
| Baseline | `main @ 0ba285a` |

## 1. Findings

| ID | Severity | Release-blocking | Status | Finding / reproduction / impact |
|---|---|---|---|---|
| `AUD-001` | `P1` | `YES` | `RESOLVED` | **Malformed HANDOFF**. `verify-handoff.ps1` returns PASS WITH WARNINGS in Round 2. Tier 2 successfully rewrote HANDOFF.md with legacy sections. |

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `npx prisma generate` | `PASS` | Exit 0 (`E-01`) | `None` |
| `AC-02` | `npm run test:unit -- job-opening-status` | `PASS` | Exit 0 (`E-02`) | `None` |
| `AC-03` | `npx tsc --noEmit` | `PASS` | Exit 0 (`E-03`) | `None` |
| `AC-04` | `git diff --cached --stat` | `PASS` | Exit 0 (`E-04`) | `None` |
| `AC-05` | `git status --porcelain` | `PASS` | Exit 0 (`E-05`) | `None` |
| `AC-06` | `powershell.exe -File .\.ai-pipeline\scripts\verify-task.ps1` | `PASS` | Exit 0 (`E-06`) | `None` |

### Assurance Checks

| Check | Status | Evidence (command + exit + output, hoặc carry-forward source) |
|---|---|---|
| `C-07` Git hygiene | `DONE` | `git status` Exit 0, 0 untracked inside scope |
| `C-09` Contract validity | `DONE` | `powershell.exe -File .\.ai-pipeline\scripts\verify-handoff.ps1` Exit 0, 1 warnings |
| `C-10` Diff scope | `DONE` | `git diff --stat` Exit 0, 6 files changed |

## 3. Scope

- **Audited surface:** `docs/tasks/hrp-v6-p1-job-opening-status-card/HANDOFF.md`
- **Excluded:** None.

## 4. Independent Evidence

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx prisma generate` | Exit 0, schema matched 1 time in 700ms | None |
| `E-02` | `npm run test:unit -- job-opening-status` | Exit 0, 7 tests passed in 1.1s | None |
| `E-03` | `npx tsc --noEmit` | Exit 0, clean 0 | None |
| `E-04` | `git diff --cached --stat` | Exit 0, 496 insertions | None |
| `E-05` | `git status --porcelain` | Exit 0, clean 1 | None |
| `E-06` | `powershell.exe -File .\.ai-pipeline\scripts\verify-task.ps1` | Exit 0, PASS | None |

## 5. Coverage Gaps

- None

## 6. Verdict

- **Verdict:** `PASS`
- **Blockers:** None
- **Debt:** None
- **Reason:** AUD-001 is resolved. HANDOFF.md formatting is now compliant. Functional verification passed.

## 7. Re-audit Trace

| Round | Spec | Depth | Verdict | Reason / Findings |
|---|---|---|---|---|
| 1 | `v1.0` | `FULL` | `FAIL` | Malformed HANDOFF (AUD-001) |
| 2 | `v1.0` | `DELTA` | `PASS` | Resolved AUD-001 |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

