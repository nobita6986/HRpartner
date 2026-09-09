# TASK: hrp-v5-g0-03-prisma-connection

## 0. Control
| Field | Value |
|---|---|
| Task slug | hrp-v5-g0-03-prisma-connection |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner/Executor/Auditor | Tier 1 under explicit Founder waiver |
| Baseline | 19100db — accepted G0-02 |
| Current execution/audit round | 1/1 |
| Next gate | G0 phase review / MP-3 |

## 1. Outcome
All application routes and domain services share the canonical Prisma singleton. Runtime uses the pooled URL while migrations use the direct admin URL.

## 2. Evidence và Baseline
src/lib/db.ts was already the only constructor in application runtime, but no executable grep/concurrency gate existed and two domain imports loaded PrismaClient as a runtime value.

## 3. Decisions
Keep the existing global singleton; enforce the architectural boundary with a cross-platform Node gate and a 64-call concurrent unit test. Type-only domain imports remain allowed.

## 4. Contract
| RQ ID | Requirement | Priority | Failure behavior |
|---|---|---|---|
| RQ-01 | No new PrismaClient in app or src/domains. | Must | Connection gate fails |
| RQ-02 | Runtime/migration URLs remain DATABASE_URL/DATABASE_URL_ADMIN. | Must | Connection gate fails |
| RQ-03 | Concurrent callers receive one Prisma instance. | Must | Unit test fails |
| RQ-04 | Domain PrismaClient references are type-only. | Should | Type/diff audit fails |

## 5. Execution Plan
| STEP | RQ | Deliverable | Verify |
|---|---|---|---|
| STEP-01 | RQ-01/02 | Add scripts/ci/prisma-connection-gate.mjs. | npm run test:connection |
| STEP-02 | RQ-03 | Add singleton burst test. | 64 callers, constructor count 1 |
| STEP-03 | RQ-04 | Convert/remove runtime-only domain imports. | typecheck + grep |
| STEP-04 | All | Full regression and scoped commit. | unit/lint/build/diff |

## 6. Acceptance
| AC | Pass condition | Method | Blocking? |
|---|---|---|---|
| AC-01 | Route/domain constructor count is zero. | Cross-platform source gate | Yes |
| AC-02 | Prisma schema keeps pooled runtime and direct migration URLs. | Schema gate | Yes |
| AC-03 | 64 concurrent calls reuse one client. | Mocked unit test | Yes |
| AC-04 | Typecheck, lint, unit and build pass. | NPM quality scripts | Yes |

### Traceability
| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-02 | AC-03 |
| RQ-04 | STEP-03 | AC-04 |

## 7. Risk và Rollback
The gate is read-only and the test mocks Prisma, so neither opens a real connection. Rollback is the scoped commit.

## 8. Open Questions
None.

## 9. Planner Resolution
| Round | Decision | Evidence | Closure |
|---|---|---|---|
| 1 | ACCEPTED | Connection gate, burst test and full quality gate pass. | Closed under waiver |

## 10. Revision Log
| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-24 | Close G0-03 Prisma connection discipline. |