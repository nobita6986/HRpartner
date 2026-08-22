# HANDOFF: hrp-mp2-apply-tracking

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp2-apply-tracking` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `TASK=e ad9869`; actual start state `5d75011`, worktree already dirty with MP-1/M13 and unrelated `appBCC` deletions, all preserved |
| Status | `BLOCKED` |
| Started/updated | `2026-08-22 +07:00` |

## 1. Outcome Summary

Chưa triển khai source/migration MP-2. Tier 2 dừng trước STEP-01/02 vì contract yêu cầu anonymous public apply ghi `CandidateSubmission`, trong khi canonical RLS hiện chỉ cho phép ghi với role nội bộ/Vendor; TASK đồng thời cấm bypass RLS và cấm public DB user broad access. Không có decision/policy/interface cho anonymous write principal, nên tiếp tục sẽ thay đổi security boundary ngoài thẩm quyền Tier 2.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/schema.prisma`, RLS migrations | `BLOCKED` | Cần Planner quyết định security model trước migration/schema implementation. |
| `STEP-02` | `RQ-02`, `RQ-03` | Public apply domain service | `BLOCKED` | Anonymous write cannot satisfy existing RLS without forbidden bypass/policy expansion. |
| `STEP-03` | `RQ-04`, `RQ-06` | Tracking/status routes | `NOT_STARTED` | Depends on safe submission model. |
| `STEP-04` | `RQ-05` | Admin queue/detail routes | `NOT_STARTED` | Depends on schema/service. |
| `STEP-05` | `RQ-07` | Public/HR UI | `NOT_STARTED` | UI must not report success before safe API exists. |
| `STEP-06` | `RQ-08` | Regression/handoff | `PARTIAL` | Contract verification executed; functional regression suite not run because implementation blocked. |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-mp2-apply-tracking\TASK.md` | Exit `0`; `RESULT: PASS` | TASK contract is executable. | None |
| `AC-01` | `npx prisma validate; npx prisma generate` | Exit `0` | Existing schema was valid and client generation succeeded before work was stopped. | No MP-2 migration created. |
| `AC-02`–`AC-08` | Not run | `BLOCKED` | No implementation was retained. | Requires Planner security resolution. |

## 4. Changed Deliverables

- **Source/artifact changed:** `docs/tasks/hrp-mp2-apply-tracking/HANDOFF.md` only.
- **Dependency:** None.
- **Schema/migration:** None retained.
- **Environment/config:** None.
- **Git diff/commit:** No commit created. Existing dirty worktree and unrelated changes preserved.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | `Blocker` | `prisma/migrations/20260816212000_s1_rls_vendor/migration.sql` defines `candidate_submissions` `WITH CHECK` only for `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `ACCOUNTANT`, `SALE`, scoped Vendor roles, and CTV. Anonymous `PUBLIC/WORKER` is denied. `TASK.md` DEC-01/RQ-02 requires anonymous public apply; non-goals prohibit RLS bypass/public broad DB access. | Cannot safely persist public applications, idempotency, or initial history. | Select and document an approved public-write boundary: e.g. a narrowly scoped `SECURITY DEFINER` database function with validation/ownership, or a dedicated restricted DB role/policy. Define transaction/RLS behavior and required migration scope. |
| `DEV-01` | `Deviation` | TASK baseline `ead9869`; actual HEAD at preflight `5d75011`. Worktree contained pre-existing MP-1/M13 and unrelated changes. | No source changes were retained; baseline mismatch did not alter blocker. | Confirm expected baseline/worktree for next execution round. |
| `LIM-01` | `Limitation` | `npx tsc --noEmit` exited `2` with pre-existing errors in attendance, reconciliation, security, staffing, and `mp1.contract.test.ts`; no MP-2 file appeared in its error output. | Full typecheck cannot be used as passing evidence in this state. | Resolve separately or establish accepted baseline diagnostics before re-execution. |

## 6. Evidence Index

No large evidence artifact created.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Stopped before implementation to preserve RLS/public-write security boundary; all exploratory MP-2 code and migration changes removed. |

> Handoff status: `BLOCKED`
