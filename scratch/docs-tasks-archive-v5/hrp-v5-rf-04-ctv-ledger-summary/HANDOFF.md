# HANDOFF: hrp-v5-rf-04-ctv-ledger-summary

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-04-ctv-ledger-summary |
| Work type | CODE |
| Audit mode (phải khớp TASK) | CODE_AUDIT |
| Spec version | v1.0 |
| Execution/Audit round | 1/1 |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary
CTV summary now uses canonical approved/paid ledger balance, exposes the source, and returns null rather than a fabricated number when no ledger entries exist.

## 2. Execution Trace
| STEP | RQ | Result |
|---|---|---|
| STEP-01 | RQ-01 | DONE |
| STEP-02 | RQ-02/04 | DONE |
| STEP-03 | RQ-03 | DONE |
| STEP-04 | RQ-05 | DONE |

## 3. Acceptance Evidence
| AC | Result | Evidence |
|---|---|---|
| AC-01 | PASS | Hardcoded estimate grep empty |
| AC-02 | PASS | Real 750,000 balance |
| AC-03 | PASS | Missing ledger null + note |
| AC-04 | PASS | Real zero returns 0 |
| AC-05 | PASS | SALE 403 before ledger |
| AC-06 | PASS | 14 targeted tests and full quality gate |

## 4. Changed Deliverables
CTV summary route, four-case route contract and task evidence.

## 5. Deviations, Limitations và Blockers
No blocker. The broader commission engine remains RF-17; this task only removes the false portal estimate.

## 6. Evidence Index
Route tests, ledger golden regression, source grep, typecheck, scoped lint, full unit and verifiers.

## 7. Execution Round History
| Round | Status | Summary |
|---|---|---|
| 1 | READY_FOR_AUDIT | RF-04 ledger summary PASS. |

> Handoff status: READY_FOR_AUDIT