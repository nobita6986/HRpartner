# TASK: hrp-v5-rf-03-money-rounding

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-03-money-rounding |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner/Executor/Auditor | Tier 1 under explicit Founder waiver |
| Baseline | 405f913 — RF-02 accepted |
| Current execution/audit round | 1/1 |
| Next gate | RF-04 CTV commission summary |

## 1. Outcome
Vendor and client statements aggregate Decimal hours and multiply by BigInt VND rates before applying the centralized sub-VND policy.

## 2. Evidence và Baseline
The baseline rounded total hours to an integer before multiplication, so 7.5 hours became 8 hours.

## 3. Decisions
ADR-010A interim uses exact scaled Decimal × BigInt arithmetic and truncates only the remainder below 1 VND after multiplication. Accounting must revisit before production statement locking.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| RQ-01 | Hours stay Decimal through aggregation. | Must | Source/type audit fails |
| RQ-02 | Vendor/client amounts use centralized money helper. | Must | Golden test fails |
| RQ-03 | 7.5 hours is never rounded to 8 hours. | Must | Statement golden fails |
| RQ-04 | Existing integer-hour totals do not change. | Must | Regression fails |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| STEP-01 | RQ-01 | Decimal aggregation for all hour tiers. | grep + typecheck |
| STEP-02 | RQ-02 | Add multiplyDecimalByVnd helper. | helper tests |
| STEP-03 | RQ-03/04 | Replace both statement branches. | fractional/integer goldens |
| STEP-04 | All | Record ADR-010A and full regression. | full unit + verifiers |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| AC-01 | No Number-based hour sum or pre-multiply Math.round remains. | Source gate | Yes |
| AC-02 | 7.5 × 50,000 = 375,000 vendor. | Golden test | Yes |
| AC-03 | 7.5 × 80,000 = 600,000 client. | Golden test | Yes |
| AC-04 | Existing integer case remains 12,500,000. | Regression | Yes |
| AC-05 | Sub-VND truncation and input guards are deterministic. | Money helper tests | Yes |
| AC-06 | Typecheck, lint and full unit pass. | Quality commands | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-05 |
| RQ-03 | STEP-03 | AC-02 |
| RQ-04 | STEP-03 | AC-04 |

## 7. Risk và Rollback
Financial behavior changes only for fractional hours. Rollback the scoped commit; do not rewrite already locked statements.

## 8. Open Questions
None for this interim fix. Accounting review is an explicit future decision gate in ADR-010A.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| 1 | ACCEPTED | Decimal helper, 20 targeted tests and full unit pass. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-24 | Close RF-03 pre-multiply hour rounding defect. |