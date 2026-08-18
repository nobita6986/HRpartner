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

**Mọi AC của TASK phải có dòng.** Method = lệnh Tier 3 TỰ chạy lại (không chép HANDOFF).

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `<command/visual check>` | `<PASS/FAIL/PARTIAL/BLOCKED/N/A>` | `<output/reference>` | `<None/AUD-xxx>` |

### Mandatory Checks (Deep Audit — C-01..C-10)

Tự chạy/đọc từng check; status `DONE | SKIP(lý do) | FAIL`. Định nghĩa check: xem `.ai-pipeline/tier3.md`.

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` Regression (`npx vitest run`) | `<DONE/SKIP/FAIL>` | `<exit code + số test + so với HANDOFF>` |
| `C-02` Build (`npm run build`) | `<DONE/SKIP/FAIL>` | `<exit code>` |
| `C-03` Route handlers đọc từng dòng | `<DONE/SKIP/FAIL>` | `<file:line đã đọc + kết luận identity/guard>` |
| `C-04` Prisma query vs schema + `prisma validate` | `<DONE/SKIP/FAIL>` | `<kết quả validate + file:line đã đối chiếu>` |
| `C-05` POST/PATCH mới: idempotency + outbox | `<DONE/SKIP/FAIL>` | `<danh sách route + đã bọc?>` |
| `C-06` Migration/RLS verify + policy vs intent | `<DONE/SKIP/FAIL>` | `<command + output>` |
| `C-07` Git hygiene (scope commit, vùng cấm) | `<DONE/SKIP/FAIL>` | `<git show --stat / git status>` |
| `C-08` Test coverage file mới/sửa + route | `<DONE/SKIP/FAIL>` | `<danh sách file ↔ test>` |
| `C-09` `verify-task.ps1` trên TASK | `<DONE/SKIP/FAIL>` | `<RESULT: PASS>` |
| `C-10` Diff scope baseline..HEAD | `<DONE/SKIP/FAIL>` | `<git diff --name-only>` |

## 3. Scope và Impact

- **Deliverables in scope:** <result>.
- **Out-of-scope changes:** <None/list>.
- **Blast radius/callers/affected flows:** <evidence hoặc limitation>.
- **Data/security/migration/operations:** <result hoặc N/A + reason>.

## 4. Independent Evidence

Ít nhất 5 dòng — số liệu do Tier 3 TỰ chạy lại. Dán kết quả `verify-audit.ps1` vào đây.

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `<check>` | `<result>` | `<summary>` | `<reference>` |

## 5. Coverage Gaps

- <Phần chưa kiểm tra được, lý do và tác động tới verdict; hoặc None.>

## 6. Verdict và Planner Questions

- **Verdict:** `<PASS/CONDITIONAL/FAIL/BLOCKED>`. PASS chỉ khi: mọi AC bắt buộc PASS + không P0/P1/P2 mở + mọi C-01..C-10 `DONE` (SKIP có lý do) + `verify-audit.ps1` PASS.
- **Reason:** <ngắn gọn, dựa trên findings/AC>.
- **Planner decisions required:** <finding IDs hoặc None>.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `<round>` | `AUD-001` | `<status>` | `<status>` | `<evidence>` |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
