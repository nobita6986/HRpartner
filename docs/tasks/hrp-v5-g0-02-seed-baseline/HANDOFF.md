# HANDOFF: hrp-v5-g0-02-seed-baseline

## 0. Control
| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-02-seed-baseline` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution/Audit round | `1/1` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome Summary
Seed now uses fixed synthetic business keys, one connection and ADMIN GUC. Two consecutive runs succeed without duplicate rows.

## 2. Execution Trace
| STEP | RQ | Result |
|---|---|---|
| `STEP-01` | `RQ-01/03` | DONE |
| `STEP-02` | `RQ-02` | DONE |
| `STEP-03` | All | DONE |

## 3. Acceptance Evidence
| AC | Result | Evidence |
|---|---|---|
| `AC-01` | PASS | 13 roles, 2 clients, 4 projects, 2 vendors, 20 workers, 2 periods |
| `AC-02` | PASS | 11 permissions, 15 role-permissions |
| `AC-03` | PASS | users 13=13 distinct; workers 20=20; projects 4=4 |
| `AC-04` | PASS | Unit/typecheck gate before commit |

## 4. Changed Deliverables
`prisma/seed.mjs` and task evidence only.

## 5. Deviations, Limitations và Blockers
No blocker. Optional real login accounts remain env-controlled and secrets are never logged.

## 6. Evidence Index
Two seed outputs and read-only cardinality query on clean test DB.

## 7. Execution Round History
| Round | Status | Summary |
|---|---|---|
| `1` | `READY_FOR_AUDIT` | Repeatable seed and exact cardinalities PASS. |

> Handoff status: `READY_FOR_AUDIT`