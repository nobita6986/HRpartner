# TASK: hrp-v5-rf-02-worker-projection

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-02-worker-projection |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner/Executor/Auditor | Tier 1 under explicit Founder waiver |
| Baseline | 516956a — RF-01 accepted |
| Current execution/audit round | 1/1 |
| Next gate | RF-03 money rounding |

## 1. Outcome
Worker list/create/update responses use the canonical permission-aware projection and do not expose CCCD or bank fields without CAN_VIEW_WORKER_SENSITIVE.

## 2. Evidence và Baseline
The routes authenticated roles but returned raw Prisma Worker rows. The existing projection helper was used only by the self-worker route.

## 3. Decisions
Resolve effective permissions per request, reuse projectWorker/projectWorkerList, retain MKT deny from the 13-role matrix.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| RQ-01 | SALE list response masks CCCD and bank data. | Must | Contract test fails |
| RQ-02 | MKT remains denied and receives no Worker row. | Must | Role matrix test fails |
| RQ-03 | Sensitive values require effective permission. | Must | Permission test fails |
| RQ-04 | Mutation responses use the same projection. | Must | PUT contract test fails |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| STEP-01 | RQ-01/02 | Project GET list and retain matrix gate. | SALE/MKT tests |
| STEP-02 | RQ-03 | Resolve CAN_VIEW_WORKER_SENSITIVE. | HR permission test |
| STEP-03 | RQ-04 | Project POST/PUT responses. | PUT response test |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| AC-01 | SALE payload contains no raw CCCD/bank value. | JSON leak assertion | Yes |
| AC-02 | MKT returns 403 before Worker query. | Mock contract | Yes |
| AC-03 | Effective permission preserves sensitive values. | Contract test | Yes |
| AC-04 | PUT response masks without permission. | Contract test | Yes |
| AC-05 | Projection regression, typecheck and lint pass. | Quality commands | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-02 | AC-03 |
| RQ-04 | STEP-03 | AC-04 |

## 7. Risk và Rollback
Read response shape changes only for fields already defined as sensitive. Rollback the scoped commit if a consumer incorrectly depended on raw PII.

## 8. Open Questions
None.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| 1 | ACCEPTED | 14 projection/route tests plus typecheck pass. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-24 | Close RF-02 Worker projection leak. |