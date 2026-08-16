# TASK: <task-slug>

## 0. Control

| Field | Value |
|---|---|
| Task slug | `<task-slug>` |
| Work type | `<DESIGN / CODE / DOCS / DATA / INFRA>` |
| Audit mode (Tier 3 đọc) | `<CODE_AUDIT / DESIGN_AUDIT / DOCS_AUDIT / DATA_AUDIT / INFRA_AUDIT>` — Tier 1 set rõ, suy từ Work type |
| Spec version | `<v1.0>` |
| Status | `<DRAFT / READY_FOR_EXECUTION / REVISION_REQUIRED / ACCEPTED / CANCELLED>` |
| Planner | `<Tier 1 identity>` |
| Executor | `<Tier 2 / Figma Owner / named owner>` |
| Auditor | `<Tier 3 independent context>` |
| Baseline | `<commit SHA, approved mockup version hoặc dated snapshot>` |
| Modules | `<M0-M10>` |
| ADR references | `<IDs/sections hoặc None>` |
| Current execution round | `<1, 2, ...>` |
| Current audit round | `<0 (chưa audit) / 1, 2, ...>` |
| Next gate | `<verify-task → /code → /audit → /resolve → ACCEPTED>` |
| Updated | `<YYYY-MM-DD HH:mm TZ>` |

## 1. Outcome

### User-visible outcome

<Kết quả cuối mà người dùng/stakeholder quan sát được.>

### Non-goals

- <Ngoài phạm vi cụ thể.>

## 2. Evidence và Baseline

Chỉ ghi evidence cần để ra quyết định; dùng link/file:line thay vì chép tài liệu.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `<file:line/tool output>` | `<fact>` | `<impact>` |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `<CHOSEN / ASSUMPTION / NEED_USER_DECISION>` | `<content>` | `<source/owner>` | `<status/date>` |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `<measurable requirement>` | `<Must/Should>` | `<EV/DEC/source>` | `<expected rejection/error/state>` |

### 4.2 Scope boundaries

**In scope:**

- `<file/module/frame/artifact>`

**Out of scope:**

- `<explicit exclusion>`

### 4.3 Data, State, Permission và Interface Rules

- **Data:** <type, precision, source of truth, consistency rule hoặc N/A>.
- **State:** <allowed transition/invariant hoặc N/A>.
- **Permission/data scope:** <actor/action/visibility hoặc N/A>.
- **Interface:** <public contract, UI behavior hoặc artifact format>.
- **Failure/idempotency/concurrency:** <rule hoặc N/A + reason>.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `<path/symbol/frame>` | `<specific outcome, không cần full code>` | `<dependency/tool>` | `<command/check>` | `<when executor must stop>` |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | `<binary/measurable condition>` | `<command/manual/visual check>` | `<output/screenshot/diff>` | `<Yes/No>` |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | `<risk>` | `<signal>` | `<preventive action>` | `<concrete rollback>` |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | `<question hoặc None>` | `<owner>` | `<date>` | `<Yes/No>` |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `<round>` | `AUD-001` | `<ACCEPT_FIX/REJECT/DEFER/NEED_USER_DECISION>` | `<reason>` | `<None hoặc section/version>` | `<owner + condition>` |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `<date>` | `<initial contract>` | `<request/source>` |