# HANDOFF: hrp-v5-rf-02-worker-projection

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-02-worker-projection |
| Work type | CODE |
| Audit mode (phải khớp TASK) | CODE_AUDIT |
| Spec version | v1.0 |
| Execution/Audit round | 1/1 |
| Status | READY_FOR_AUDIT |

## 1. Outcome Summary
Worker routes now project list, create and update output using effective permissions. SALE is masked, MKT is denied, and HR visibility follows the permission resolver.

## 2. Execution Trace
| STEP | RQ | Result |
|---|---|---|
| STEP-01 | RQ-01/02 | DONE |
| STEP-02 | RQ-03 | DONE |
| STEP-03 | RQ-04 | DONE |

## 3. Acceptance Evidence
| AC | Result | Evidence |
|---|---|---|
| AC-01 | PASS | Raw CCCD/bank absent from SALE JSON |
| AC-02 | PASS | MKT 403 before findMany |
| AC-03 | PASS | Permission-preserving HR case |
| AC-04 | PASS | PUT response mask |
| AC-05 | PASS | 14 tests, typecheck and scoped lint |

## 4. Changed Deliverables
Two Worker routes, route projection contract test and task evidence.

## 5. Deviations, Limitations và Blockers
No blocker. Existing RLS/data scope remains unchanged; this task closes the response-field boundary.

## 6. Evidence Index
Targeted Vitest, typecheck, scoped lint, diff and verifiers.

## 7. Execution Round History
| Round | Status | Summary |
|---|---|---|
| 1 | READY_FOR_AUDIT | RF-02 route projection PASS. |

> Handoff status: READY_FOR_AUDIT