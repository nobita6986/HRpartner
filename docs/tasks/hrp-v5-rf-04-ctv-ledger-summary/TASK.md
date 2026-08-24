# TASK: hrp-v5-rf-04-ctv-ledger-summary

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-04-ctv-ledger-summary |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner/Executor/Auditor | Tier 1 under explicit Founder waiver |
| Baseline | a79e041 — RF-03 accepted |
| Current execution/audit round | 1/1 |
| Next gate | Wave 0 review / MP-3 |

## 1. Outcome
CTV portal summary reports canonical CommissionLedger balance instead of a hardcoded per-claim estimate and fails closed when no ledger evidence exists.

## 2. Evidence và Baseline
The baseline multiplied accepted claims by a fixed 500,000 VND and labeled the fabricated value as estimated commission.

## 3. Decisions
Use approved/paid CREDIT minus REVERSAL through getCtvBalance, detect evidence with ledger total, preserve the legacy field as a compatibility mirror, and add explicit source metadata.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| RQ-01 | No hardcoded commission estimate remains. | Must | Source gate fails |
| RQ-02 | Existing ledger returns its real net balance. | Must | Route contract fails |
| RQ-03 | Missing ledger returns null plus explanatory note. | Must | Fail-closed test fails |
| RQ-04 | Real zero balance remains distinguishable from missing data. | Must | Zero-state test fails |
| RQ-05 | CTV identity scopes all reads in withDbContext. | Must | Scope audit fails |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| STEP-01 | RQ-01 | Remove fixed estimate. | grep |
| STEP-02 | RQ-02/04 | Reuse ledger balance and page total. | positive/zero tests |
| STEP-03 | RQ-03 | Add null/source/note response contract. | empty-ledger test |
| STEP-04 | RQ-05 | Run reads inside CTV DB context. | route audit |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| AC-01 | Route contains no 500,000 multiplier. | Source grep | Yes |
| AC-02 | Ledger balance 750,000 returns 750000. | Contract test | Yes |
| AC-03 | No ledger returns null and clear note. | Contract test | Yes |
| AC-04 | One ledger row with zero balance returns 0. | Contract test | Yes |
| AC-05 | Non-CTV returns 403 before ledger query. | Role test | Yes |
| AC-06 | Ledger regression, typecheck, lint and full unit pass. | Quality commands | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |
| RQ-04 | STEP-02 | AC-04 |
| RQ-05 | STEP-04 | AC-05 |

## 7. Risk và Rollback
Response keeps estimatedCommission for compatibility but changes it to ledger-backed string or null. Rollback the scoped commit if a client cannot handle null.

## 8. Open Questions
None.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| 1 | ACCEPTED | Route/ledger contracts and full quality gate pass. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-24 | Close RF-04 fabricated commission summary. |