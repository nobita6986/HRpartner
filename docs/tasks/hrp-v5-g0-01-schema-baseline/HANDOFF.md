# HANDOFF: hrp-v5-g0-01-schema-baseline

## 0. Control
| Field | Value |
|---|---|
| Task slug | `hrp-v5-g0-01-schema-baseline` |
| Work type | `INFRA` |
| Audit mode (phải khớp TASK) | `INFRA_AUDIT` |
| Spec version | `v1.0` |
| Execution/Audit round | `1/1` |
| Executor | `Tier 1 under Founder waiver` |
| Baseline | `715a58b` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome Summary
Clean và upgraded Neon test DB đều apply đủ 20 migrations, schema diff rỗng. Migration chain đã sửa BOM, out-of-order index rename, canonical schema drift và MP2 ownership transfer trên PostgreSQL 16/Neon. Final `hrp_public_rpc`: NOLOGIN+BYPASSRLS, membership SET=false và không CREATE schema.

## 2. Execution Trace
| STEP | RQ | Result | Artifact |
|---|---|---|---|
| `STEP-01` | `RQ-01/04` | DONE | Three historical migration fixes |
| `STEP-02` | `RQ-02` | DONE | Two forward reconcile migrations |
| `STEP-03` | `RQ-03` | DONE | Structural guard + MP2 GUC fixture |

## 3. Acceptance Evidence
| AC | Command/result | Evidence | Limitation |
|---|---|---|---|
| `AC-01` | Clean `migrate deploy`: 20/20 PASS | DB `hrp_g0_clean_20260824` | Test endpoint only |
| `AC-02` | Upgraded `migrate deploy`: 20/20 PASS | DB `neondb` on test endpoint | No dev/prod write |
| `AC-03` | Both `migrate diff --script` | `This is an empty migration` | None |
| `AC-04` | Vitest integration | 3 files / 135 tests PASS | Neon SSL warning only |

## 4. Changed Deliverables
Migration fixes/reconcile, M13 restore migration, RLS structural guard, MP2 LIVE fixture context, task evidence. No production deploy.

## 5. Deviations, Limitations và Blockers
No blocker. Clean database retained temporarily for G0-02 seed verification.

## 6. Evidence Index
`prisma/migrations/*`, security matrix test, MP2 LIVE tests, exact CLI outputs in execution round.

## 7. Execution Round History
| Round | Status | Summary |
|---|---|---|
| `1` | `READY_FOR_AUDIT` | 20 migrations + empty diffs + 135 LIVE PASS. |

> Handoff status: `READY_FOR_AUDIT`