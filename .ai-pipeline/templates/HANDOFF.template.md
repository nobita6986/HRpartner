# HANDOFF: <task-slug>

## 0. Control

| Field | Value |
|---|---|
| Task slug | `<task-slug>` |
| Work type | `<from TASK>` |
| Audit mode (phải khớp TASK) | `<CODE_AUDIT / DESIGN_AUDIT / DOCS_AUDIT / DATA_AUDIT / INFRA_AUDIT>` |
| Spec version | `<must match TASK>` |
| Execution round | `<1, 2, ...>` |
| Current audit round | `<0 (chưa audit) / 1, 2, ...>` |
| Executor | `<Tier 2 / Figma Owner>` |
| Baseline | `<same baseline + actual start state>` |
| Status | `<IN_PROGRESS / BLOCKED / READY_FOR_AUDIT>` |
| Started/updated | `<timestamps>` |

## 1. Outcome Summary

<Đã tạo/sửa gì và phần nào chưa hoàn thành. Không tự ghi audit verdict.>

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `<path/reference>` | `<DONE/BLOCKED>` | `<None hoặc explanation>` |

## 3. Acceptance Evidence

**Ghi đúng lệnh chính xác đã chạy — Tier 3 sẽ chạy lại từng lệnh này.** Dòng đầu bắt buộc là `verify-task.ps1` PASS (C-09 của Tier 3).

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\<slug>\TASK.md` | `RESULT: PASS` | `<contract hợp lệ>` | `<None>` |
| `AC-01` | `<exact command/manual check>` | `<exit code/PASS/FAIL>` | `<output excerpt hoặc evidence/path>` | `<None/reason>` |

## 4. Changed Deliverables

- **Source/artifact changed:** <list>.
- **Dependency:** <None/list>.
- **Schema/migration:** <None/list>.
- **Environment/config:** <None/list>.
- **Git diff/commit:** <reference hoặc Not created>.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | `<Deviation/Limitation/Blocker>` | `<fact>` | `<impact>` | `<question/action>` |

## 6. Evidence Index

Chỉ liệt kê artifact lớn; output ngắn để ngay ở §3.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `evidence/<file>` | `<AC/fact>` |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `<status>` | `<summary>` |

> Handoff status: `<READY_FOR_AUDIT / BLOCKED>`