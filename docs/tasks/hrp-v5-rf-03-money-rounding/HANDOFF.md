# HANDOFF: hrp-v5-rf-03-money-rounding

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-03-money-rounding |
| Work type | CODE |
| Audit mode (phải khớp TASK) | CODE_AUDIT |
| Spec version | v1.0 |
| Execution/Audit round | 1/1 |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary
Statement hours now remain Decimal and both payable/receivable amounts use exact Decimal × BigInt arithmetic. Rounding occurs only below one VND after multiplication.

## 2. Execution Trace
| STEP | RQ | Result |
|---|---|---|
| STEP-01 | RQ-01 | DONE |
| STEP-02 | RQ-02 | DONE |
| STEP-03 | RQ-03/04 | DONE |
| STEP-04 | All | DONE |

## 3. Acceptance Evidence
| AC | Result | Evidence |
|---|---|---|
| AC-01 | PASS | Defect grep returns zero |
| AC-02 | PASS | Vendor 7.5h = 375,000 |
| AC-03 | PASS | Client 7.5h = 600,000 |
| AC-04 | PASS | Existing total = 12,500,000 |
| AC-05 | PASS | Four helper policy tests |
| AC-06 | PASS | Typecheck/lint/full unit exit 0 |

## 4. Changed Deliverables
Money helper/test, statement service/golden, ADR-010A and task evidence.

## 5. Deviations, Limitations và Blockers
No blocker. Accounting must review the TRUNCATE sub-VND policy before production statement locking; this does not reopen the fixed rule against rounding hours first.

## 6. Evidence Index
20 targeted tests, full unit lane, typecheck, scoped lint, defect grep and verifiers.

## 7. Execution Round History
| Round | Status | Summary |
|---|---|---|
| 1 | READY_FOR_AUDIT | RF-03 decimal money gate PASS. |

> Handoff status: READY_FOR_AUDIT