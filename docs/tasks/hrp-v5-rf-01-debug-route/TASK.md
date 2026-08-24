# TASK: hrp-v5-rf-01-debug-route

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-rf-01-debug-route |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner/Executor/Auditor | Tier 1 under explicit Founder waiver |
| Baseline | 1b9ed1d — G0 complete |
| Current execution/audit round | 1/1 |
| Next gate | RF-02 worker projection |

## 1. Outcome
The debug endpoint is absent in production, ADMIN-only elsewhere, and cannot disclose DB URLs, PII or hardcoded account lookups.

## 2. Evidence và Baseline
The baseline route queried a hardcoded phone and returned masked DATABASE_URL plus complete User/Worker rows without authentication.

## 3. Decisions
Return 404 before authentication in production; require authenticated ADMIN in non-production; expose only a fixed health response.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| RQ-01 | Production GET returns 404 without auth or DB work. | Must | Contract test fails |
| RQ-02 | Non-production GET requires ADMIN. | Must | 401/403 contract fails |
| RQ-03 | Response contains no env, PII, phone lookup or DB data. | Must | Source/diff audit fails |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| STEP-01 | RQ-01 | Add production 404 guard. | Production contract test |
| STEP-02 | RQ-02 | Add ADMIN authentication gate. | 401/403/200 tests |
| STEP-03 | RQ-03 | Remove Prisma/env/PII logic. | grep + response assertion |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| AC-01 | Production returns 404 before auth. | Unit contract | Yes |
| AC-02 | Anonymous/non-admin/admin return 401/403/200. | Unit contract | Yes |
| AC-03 | Admin payload is exactly status ok. | JSON assertion | Yes |
| AC-04 | Typecheck and scoped lint pass. | Quality commands | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |

## 7. Risk và Rollback
No data mutation. Rollback the scoped commit if an internal debug dependency is discovered.

## 8. Open Questions
None.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| 1 | ACCEPTED | Four contract tests and typecheck pass. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-24 | Close RF-01 debug exposure. |