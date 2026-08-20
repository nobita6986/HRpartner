# AUDIT: classify-actro-payroll-allowances

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `classify-actro-payroll-allowances` |
| Work/Audit type | `CODE/CODE_AUDIT` |
| Spec version | `v1.3` |
| Execution round | `2` |
| Audit round | `1` |
| Round opened by | `HANDOFF.md` round 2, status `READY_FOR_AUDIT` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 independent audit context` |
| Baseline/diff/artifacts | `appBCC` workspace snapshot 2026-08-20; current worktree diff; `TASK.md`, `HANDOFF.md`, `app.py`, `agent_mapper.py`, `governance.py`, `test_governance.py` |
| Independence | Confirmed: audit reread source and reran commands; no source, TASK, or HANDOFF edits made in this round. |
| Audit time | `2026-08-20 12:22 +07` |

## 1. Findings

### AUD-001 — Shared governance can be bypassed for mapping and does not cover all exports

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-00 / AC-00`
- **Evidence:** `appBCC/agent_mapper.py:140-142` returns cached mapping after an AI exception without invoking `review_callback`; `appBCC/app.py:1793-1823` exports project payroll without `request_governance_event` or blocking-record validation; `appBCC/app.py:1761-1784` exports employee history without a human gate. In contrast, `app.py:1360-1437` gates the preview push path only.
- **Impact:** AI/cache mapping may be applied without human confirmation after an API/parse error. Existing stored payroll/history data can also be exported without the mandatory human gate. This violates the all-plugin, all-export fail-closed policy and creates an untraceable disclosure/side-effect path.
- **Decision needed from Planner:** Return to Tier 2 to make every mapping outcome and every export flow fail closed on a valid human review event, with durable trace appropriate to the action.

### AUD-002 — Required Actro payroll scope has not been implemented or verified

- **Severity:** `P1`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-01`–`RQ-11 / AC-01`–`AC-09`
- **Evidence:** `HANDOFF.md:31-35,43,58-60` explicitly marks STEP-01 through STEP-05 as `BLOCKED/LIMITED` and states no 97-row KS reconciliation, attendance credit, allowance, housing, seniority, deduction import, net-pay, or complete calculation trace implementation. Independent source inspection confirms this audit only found the generic governance additions in `app.py`, `agent_mapper.py`, and `governance.py`.
- **Impact:** The user-facing Actro payroll rules cannot be used or released. No evidence supports preservation of hourly salary or any of the mandatory allowance/payment calculations.
- **Decision needed from Planner:** Split or schedule a Tier 2 implementation round for the remaining Actro deliverables. Do not resolve this task as accepted based on the governance-only change.

### AUD-003 — Governance evidence is not durable for destructive actions and its tests do not cover integrated flows

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-00 / AC-00`
- **Evidence:** `appBCC/governance.py:36-44` stores the event only in the in-memory record and, when available, its `payrollData`; `core_pipeline.py:568-625` persists only the push payload. `app.py:1439` begins the clear-DB workflow, which has no record on which to persist a governance event. `test_governance.py:10-42` has four helper-level tests only and does not test fallback exception behavior, UI gates, exports, clear, persistence, or project/period/employee trace fields.
- **Impact:** A clear action cannot be reconstructed from a durable audit record, and the claimed UI-flow coverage is not demonstrated. The trace also does not itself guarantee the required project/kỳ/nhân viên context for every decision.
- **Decision needed from Planner:** Define the durable audit-event store and required scope fields, then have Tier 2 implement integration tests for every gated workflow.

### AUD-004 — Task scope is internally inconsistent and worktree scope cannot be proven from the stated baseline

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-00 / AC-00`; task scope integrity
- **Evidence:** `TASK.md:8-11` declares `CODE` and `READY_FOR_EXECUTION`, while `TASK.md:112-117` retains the DATA-task non-goal “Không sửa mã nguồn hoặc schema trong task DATA này.” Independent `git status --short` and `git diff --name-only HEAD` show a large dirty worktree, including unrelated portal, config, generated, documentation, and asset changes; the baseline is only a dated “workspace snapshot,” not a commit/ref.
- **Impact:** Tier 3 cannot mechanically distinguish this task's allowed changes from pre-existing or concurrent work, and the contract provides contradictory scope guidance.
- **Decision needed from Planner:** Create a new coherent contract revision with a concrete Git baseline/ref and remove the obsolete DATA-only non-goal before the next execution round.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-00` | Read every changed governance path and rerun `python -m unittest -v test_governance.py` | FAIL | 4 helper tests pass, but `agent_mapper.py:140-142` bypasses review on exception and export flows at `app.py:1761-1823` have no human gate. | `AUD-001`, `AUD-003` |
| `AC-01` | Review HANDOFF and source for 97-row KS reconciliation command/result | FAIL | HANDOFF explicitly reports no full reconciliation; no independent mismatch-count-zero evidence exists. | `AUD-002` |
| `AC-02` | Review source/tests for holiday configuration, `attendance_credit_days`, reason trace, and isolation from prorates | FAIL | No implementation or targeted test exists; HANDOFF marks STEP-02 limited. | `AUD-002` |
| `AC-03` | Review source/tests for BCC-only soi kính and đời sống calculation | FAIL | No allowance rule layer or golden test was delivered. | `AUD-002` |
| `AC-04` | Review source/tests for two-period housing proposal workflow | FAIL | No housing state/UI/persistence implementation was delivered. | `AUD-002` |
| `AC-05` | Review source/tests for BCC hiring-date seniority boundaries and proration | FAIL | No seniority rule or boundary tests were delivered. | `AUD-002` |
| `AC-06` | Review source/tests for controlled KS:KX payment recomputation | FAIL | No payment aggregation implementation or full-row reconciliation was delivered. | `AUD-002` |
| `AC-07` | Review source/tests for manual/XLSX deductions, duplicate validation, and period isolation | FAIL | No deduction import/manual state implementation was delivered. | `AUD-002` |
| `AC-08` | Review source/tests for `ROUNDDOWN(payment_total - deduction_total, -3)` and delta | FAIL | No net-pay rounding implementation or boundary tests were delivered. | `AUD-002` |
| `AC-09` | Review source/tests for component-level calculation trace and 97-row reconciliation report | FAIL | Generic governance events do not constitute required component trace; no reconciliation report exists. | `AUD-002`, `AUD-003` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `npx vitest run` at `C:\CodeApp\HrP`; exit `0`; `35` files and `605` tests passed in `81.57s`. |
| `C-02` | DONE | `npm run build` at `C:\CodeApp\HrP`; exit `0`; Next.js production build completed. One pre-existing/generated CSS import-order warning remained. |
| `C-03` | DONE | No Next.js route handler is changed within this task's intended governance files. Read side-effect handlers in `appBCC/app.py:1201-1642,1761-1823`; found missing gates on export paths, recorded as `AUD-001`. |
| `C-04` | SKIP | No Prisma query/schema was added by this governance change. `npx prisma validate` was still rerun at repository root, exit `0`: schema valid. AppBCC persistence uses SQLAlchemy, not Prisma. |
| `C-05` | SKIP | No new or modified HTTP POST/PATCH route is in this task's intended diff; GUI/SQLAlchemy actions are outside the `withIdempotency`/outbox route pattern. GUI governance coverage was independently inspected under C-03. |
| `C-06` | SKIP | No migration, RLS policy, or database schema is delivered by this round. Inventory command found existing `appBCC/migrations` files but no task-scoped diff there. |
| `C-07` | FAIL | `git status --short` and `git diff --name-only HEAD` show a substantially dirty, uncommitted multi-area worktree; no task commit or immutable baseline exists to establish scope hygiene. See `AUD-004`. |
| `C-08` | FAIL | `test_governance.py` covers only four helper cases. It does not cover modified `app.py` gates, mapper exception fallback, persistence, clear, or export actions. See `AUD-003`. |
| `C-09` | DONE | `& "C:\CodeApp\HrP\.ai-pipeline\scripts\verify-task.ps1" -TaskPath "C:\CodeApp\HrP\appBCC\docs\tasks\classify-actro-payroll-allowances\TASK.md"`; exit `0`; `RESULT: PASS`. Contract-validity tool does not detect semantic scope contradiction. |
| `C-10` | FAIL | `git diff --name-only HEAD` reports a broad set of unrelated modified/deleted/untracked files. The stated baseline is not a Git ref, so task-only diff scope cannot be demonstrated. See `AUD-004`. |

## 3. Scope và Impact

- **Deliverables in scope:** Shared governance helpers and UI integration in `governance.py`, `app.py`, and `agent_mapper.py`; corresponding `test_governance.py`; contract/handoff artifacts.
- **Out-of-scope changes:** Current worktree contains many other modified, deleted, and untracked files. Attribution cannot be proven because the contract baseline is not a commit/ref.
- **Blast radius/callers/affected flows:** Mapping acceptance, manual timesheet edit, reconciliation update, preview export, push, clear, payroll export, and employee-history export. The latter two are ungated and are the highest release risk.
- **Data/security/migration/operations:** No schema/migration change is delivered. Governance trace is serialized with pushed payroll payload where it exists; destructive clear has no durable audit target. `npx prisma validate` passed but does not validate the SQLAlchemy table contract.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run` | `0` | 35 test files, 605 tests passed. | Repository root; tests do not cover Python governance. |
| `npm run build` | `0` | Next.js optimized production build completed; one CSS import-order warning. | Repository root; unrelated portal build. |
| `npx prisma validate` | `0` | `prisma/schema.prisma` valid. | Repository root; no Prisma change in AppBCC governance. |
| `verify-task.ps1 -TaskPath ...TASK.md` | `0` | `RESULT: PASS. TASK contract is ready for execution.` | `appBCC/docs/tasks/classify-actro-payroll-allowances/TASK.md` |
| `python -m unittest -v test_governance.py` | `0` | 4 helper tests passed. | `appBCC/test_governance.py`; integration gaps remain. |
| `python -m py_compile app.py agent_mapper.py governance.py test_governance.py` | `0` | All four Python modules compile. | `appBCC` |
| No-key mapping review probe | `0` | Missing API key path invokes callback and returned reviewed mapping. | `appBCC/agent_mapper.py:68-78`; exception path remains untested and bypasses callback at lines 140-142. |
| `git diff --check; git diff --name-only HEAD; git status --short` | `0` | Found extensive dirty worktree and pre-existing trailing whitespace in AppBCC files; task-only scope cannot be determined. | Repository root; see `AUD-004`. |

## 5. Coverage Gaps

- No automated UI tests for mapping review, manual override, reconciliation update, preview export, push, clear, employee-history export, or project-payroll export.
- No integration test proves governance events survive the relevant database operation or identifies project, payroll period, and employee consistently.
- All Actro allowance/payment acceptance cases are absent; the handoff correctly limits its claim, but the task cannot pass while those mandatory ACs remain unimplemented.
- No immutable baseline commit exists for scope/diff attribution in this audit round.

## 6. Verdict và Planner Questions

- **Verdict:** `FAIL`.
- **Reason:** Mandatory AC-00 and AC-01 through AC-09 fail. C-07, C-08, and C-10 fail. Open P1 findings show governance bypass paths and missing Actro payroll implementation; open P2 findings show non-durable/incompletely tested audit behavior and non-auditable task scope.
- **Planner decisions required:** `AUD-001`, `AUD-002`, `AUD-003`, `AUD-004`.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `N/A` | `OPEN` | Initial independent source inspection. |
| `1` | `AUD-002` | `N/A` | `OPEN` | HANDOFF limitation plus absence of implementation/evidence. |
| `1` | `AUD-003` | `N/A` | `OPEN` | Persistence and test coverage inspection. |
| `1` | `AUD-004` | `N/A` | `OPEN` | TASK/working-tree scope inspection. |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
