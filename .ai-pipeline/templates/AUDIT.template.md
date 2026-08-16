# AUDIT: <task-slug>

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `<task-slug>` |
| Work/Audit type | `<CODE/CODE_AUDIT hoặc DESIGN/DESIGN_AUDIT>` |
| Spec version | `<must match TASK/HANDOFF>` |
| Execution round | `<from HANDOFF>` |
| Audit round | `<1, 2, ...>` |
| Round opened by | `<HANDOFF round mới / Planner Resolution ID>` |
| Round closes when | `<verdict PASS + Planner Resolution ACCEPTED>` |
| Auditor/context | `<independent identity>` |
| Baseline/diff/artifacts | `<references>` |
| Independence | `<Confirmed hoặc limitation>` |
| Audit time | `<YYYY-MM-DD HH:mm TZ>` |

## 1. Findings

Sắp xếp P0 → P3. Nếu không có, ghi `Không có finding`.

### AUD-001 — <Title>

- **Severity:** `<P0/P1/P2/P3>`
- **Status:** `<OPEN/RESOLVED/ACCEPTED_RISK/REJECTED>`
- **RQ/AC:** `<RQ-xx / AC-xx>`
- **Evidence:** `<file:line, command/output, frame/location>`
- **Impact:** `<business/technical/user impact>`
- **Decision needed from Planner:** `<specific decision; no patch>`

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `<command/visual check>` | `<PASS/FAIL/BLOCKED/N/A>` | `<output/reference>` | `<None/AUD-xxx>` |

## 3. Scope và Impact

- **Deliverables in scope:** <result>.
- **Out-of-scope changes:** <None/list>.
- **Blast radius/callers/affected flows:** <evidence hoặc limitation>.
- **Data/security/migration/operations:** <result hoặc N/A + reason>.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `<check>` | `<result>` | `<summary>` | `<reference>` |

## 5. Coverage Gaps

- <Phần chưa kiểm tra được, lý do và tác động tới verdict; hoặc None.>

## 6. Verdict và Planner Questions

- **Verdict:** `<PASS/CONDITIONAL/FAIL/BLOCKED>`.
- **Reason:** <ngắn gọn, dựa trên findings/AC>.
- **Planner decisions required:** <finding IDs hoặc None>.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `<round>` | `AUD-001` | `<status>` | `<status>` | `<evidence>` |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.