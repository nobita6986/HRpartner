# TASK: hrp-v5-g0-02-seed-baseline

## 0. Control
| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-02-seed-baseline` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner/Executor/Auditor | `Tier 1 under explicit Founder waiver` |
| Baseline | `G0-01 scoped commit` |
| Current execution/audit round | `1/1` |
| Next gate | `G0 phase review / G0-03` |

## 1. Outcome
Idempotent anonymous test seed creates 13 roles, 2 clients, 4 projects, 2 vendors, 20 workers, 2 timesheet periods and canonical permissions.

## 2. Evidence và Baseline
Current seed had 12 roles, 1 client, 5 workers and 1 period; FORCE RLS required ADMIN GUC.

## 3. Decisions
Seed uses fixed IDs/codes, connection_limit=1 and session ADMIN GUC; no real PII; no truncate/delete.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| `RQ-01` | Required cardinalities and permission pool. | Must | Count assertion fails |
| `RQ-02` | Two consecutive runs create no duplicate business keys. | Must | Task not accepted |
| `RQ-03` | Seed runs against FORCE-RLS clean test DB without env fallback to prod. | Must | Host guard/refusal |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| `STEP-01` | `RQ-01/03` | Upgrade `prisma/seed.mjs`. | Seed run 1 |
| `STEP-02` | `RQ-02` | Run same seed again. | Counts/distinct keys |
| `STEP-03` | All | Unit/typecheck/verifiers. | Exit 0 |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| `AC-01` | Counts = 13/2/4/2/20/2. | SQL count | Yes |
| `AC-02` | Permission catalog/matrix populated. | SQL count | Yes |
| `AC-03` | Run 2 totals equal distinct business keys. | Seed twice + SQL | Yes |
| `AC-04` | Unit/typecheck pass. | NPM scripts | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-01` | `AC-04` |

## 7. Risk và Rollback
Upsert only; rollback commit. No destructive seed behavior.

## 8. Open Questions
None.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| `1` | `ACCEPTED` | Seed twice + exact counts/distinct keys. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| `v1.0` | `2026-08-24` | Close G0-02 seed baseline. |