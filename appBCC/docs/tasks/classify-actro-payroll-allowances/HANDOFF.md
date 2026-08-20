# HANDOFF: classify-actro-payroll-allowances

## 0. Control

| Field | Value |
|---|---|
| Task slug | `classify-actro-payroll-allowances` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Execution round | `2` |
| Current audit round | `0 (chưa audit)` |
| Executor | `Tier 2 / Engineer` |
| Baseline | `appBCC` workspace snapshot 2026-08-20; Actro workbook `docs/Actro/LCNT7.xlsx`; shared plugin workflow |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-20 12:03 +07` |

## 1. Outcome Summary

Đã triển khai shared AI-in-the-loop/Human-in-the-loop governance ở tầng workflow dùng chung cho mọi plugin. Rule payroll/phụ cấp Actro vẫn giữ trong scope Actro, không được đưa vào plugin khác.

Đã thêm `governance.py` với event trace cho các quyết định human và validator chặn publish khi còn record lỗi. Đã nối governance vào review mapping AI/cache, manual timesheet override, reconciliation override, export Excel, push Database và clear kỳ. Mapping cache không còn được tự dùng im lặng khi có review callback; người dùng được yêu cầu xác nhận lại.

Chưa tuyên bố hoàn tất toàn bộ Actro payroll allowance layer. Các STEP Actro về nhà ở, trừ ứng, `attendance_credit_days`, calculation trace đầy đủ và reconciliation theo LCNT7 vẫn cần phase implementation riêng.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-00` | `RQ-00` | `governance.py`; `app.py`; `agent_mapper.py`; `test_governance.py` | `DONE` | Governance được triển khai shared cho tất cả plugin theo yêu cầu sếp. |
| `STEP-01` | `RQ-01,RQ-02` | `TASK.md` contract scope updated; no full Actro payroll reconciliation | `BLOCKED/LIMITED` | Chưa thực hiện golden 97-row KS reconciliation trong vòng này. |
| `STEP-02` | `RQ-03,RQ-03A,RQ-04,RQ-05` | Existing Actro formula remains unchanged; no full allowance implementation | `BLOCKED/LIMITED` | Chưa triển khai UI/state cho Actro credit và allowances. |
| `STEP-03` | `RQ-06,RQ-07` | No new Actro housing/seniority state implementation | `BLOCKED/LIMITED` | Chưa có schema/state workflow Actro riêng. |
| `STEP-04` | `RQ-08,RQ-09,RQ-10` | No new Actro payment/import implementation | `BLOCKED/LIMITED` | Chưa có import/rounding implementation theo contract Actro. |
| `STEP-05` | `RQ-11` | Shared event trace in `governance.py`; full payroll trace not complete | `DONE/LIMITED` | Governance event trace đã có; calculation trace đầy đủ theo từng Actro component chưa hoàn tất. |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `python -m unittest -v test_governance.py; python -m py_compile app.py agent_mapper.py governance.py test_governance.py; & "C:\\CodeApp\\HrP\\.ai-pipeline\\scripts\\verify-task.ps1" -TaskPath "C:\\CodeApp\\HrP\\appBCC\\docs\\tasks\\classify-actro-payroll-allowances\\TASK.md"` | `Exit code: 0`; 4 tests `OK`; `RESULT: PASS` | Shared governance behavior, syntax and contract validator passed | Không thay thế golden Actro 97-row reconciliation |
| `AC-00` | `python -m unittest -v test_governance.py` | Exit 0; 4 tests passed | Human event actor/reason validation; trace preserves calculation; valid records accepted; blocking records rejected | UI manual interaction chưa được automated end-to-end |
| `AC-01`–`AC-09` | Chưa chạy đầy đủ Actro implementation acceptance | `LIMITED/BLOCKED` | Shared governance không đủ để chứng minh toàn bộ payroll allowances Actro | Cần phase Actro implementation tiếp theo |
| Lint | ReadLints trên `app.py`, `agent_mapper.py`, `governance.py`, `test_governance.py` | `No linter errors found.` | Không có lint mới trên file đã sửa | — |

## 4. Changed Deliverables

- **Source/artifact changed:** `governance.py`, `app.py`, `agent_mapper.py`, `test_governance.py`, `docs/tasks/classify-actro-payroll-allowances/TASK.md`.
- **Dependency:** None added.
- **Schema/migration:** None.
- **Environment/config:** None.
- **Git diff/commit:** Not created.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | `Limitation` | Chỉ shared governance được triển khai trong execution round này. | Chưa đủ bằng chứng cho toàn bộ Actro payroll acceptance. | Planner/Tier 3 đánh giá shared governance độc lập; mở execution round Actro allowance riêng nếu tiếp tục. |
| `LIM-02` | `Limitation` | `attendance_credit_days`, housing, advance/import, formula trace đầy đủ chưa có runtime implementation. | Chưa thể dùng kết quả này để phát hành payroll Actro mới. | Không sử dụng các phần Actro chưa triển khai; tiếp tục theo task implementation riêng. |
| `LIM-03` | `Limitation` | Governance event lưu trong payload hiện tại; chưa có audit event store/schema riêng. | Trace tồn tại trong dữ liệu được push nhưng chưa có lịch sử revision/LOCKED state đầy đủ. | Thiết kế persistence/state/audit schema trong phase tiếp theo. |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `governance.py` | Shared human event validation, trace and blocking validator |
| `E-02` | `app.py` | Shared gates at mapping, override, export, push, reconciliation and clear workflows |
| `E-03` | `agent_mapper.py` | Cached/new mapping requires review callback when available |
| `E-04` | `test_governance.py` | Repeatable governance unit tests |
| `E-05` | `TASK.md` | v1.3 shared governance + Actro-only payroll boundary and traceability |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.1` Control / `v1.2` revision | `BLOCKED` | DATA contract cấm source implementation và version chưa đồng bộ. |
| `2` | `v1.3` | `READY_FOR_AUDIT` | Shared governance implemented for all plugins; Actro payroll layer explicitly limited and not claimed complete. |

> Handoff status: `READY_FOR_AUDIT`
