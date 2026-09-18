# TASK — hrp-v6-n2-aff-05a-handling-assignment

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-05a-handling-assignment |
| Work type | CODE |
| Assurance lane | STANDARD |
| Audit mode | NONE |
| Audit reason | N/A |
| Spec version | v1.1 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 |
| Baseline | 1679c49d23a672dafb498bb757894ed9939b6a86 |
| In-scope roots | prisma/, src/domains/talent/ |
| Forbidden paths | None |
| Required gates | typecheck, lint, test, build, prisma validate, prisma migrate status |
| Current execution round | 2 |
| Current audit round | 2 |
| Next gate | /deliver → /resolve |

## 1. Outcome

### 1.1 User-visible outcome

- Labor profiles can receive an initial handling assignment to affiliate CTVs.
- Active handling assignments accurately reflect server-clock expiration and do not block company pool resolution when expired.
- Race conditions during assignment creation do not violate constraints.

### 1.2 Non-goals

- Implementing the frontend or admin panel UI.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | evidence/prisma-validate.txt | Ensures schema is valid. |
| EV-02 | evidence/prisma-migrate-status.txt | Ensures migration is correctly applied. |
| EV-03 | evidence/test-unit.txt | Proves business logic correctness. |
| EV-04 | evidence/typecheck.txt | Ensures type safety. |
| EV-05 | evidence/lint.txt | Ensures code style compliance. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Add try/catch for P2002 to gracefully handle race conditions. | CHOSEN |
| DEC-02 | Set status='CONSUMED' and consumedAt on intake attribution consumption. | CHOSEN |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Handle P2002 error to allow only one active assignment. |
| RQ-02 | Consume attribution upon creation of handling assignment. |

### 4.2 Scope boundaries

- **In:** prisma schema, handling-assignment service, intake-writer service.
- **Out:** UI changes.
- **Allowed task artifacts:** docs/tasks/hrp-v6-n2-aff-05a-handling-assignment/**

### 4.3 Domain boundaries

- **Data/state:** At-most-one-active assignment per labor profile enforced by partial index.
- **Permission/security:** Attribution consumption ownership checked or deferred to caller.
- **Interface/API:** N/A
- **Migration/rollback:** Additive migration only, respecting existing referral_attributions table.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | prisma/schema.prisma | Define schemas and drop duplicate foreign key. | E-04 | N/A |
| STEP-02 | src/domains/talent/intake-writer.service.ts | Consume attribution properly (status, date). | E-01 | N/A |
| STEP-03 | src/domains/talent/handling-assignment.service.ts | Add try/catch P2002 for race conditions. | E-01 | N/A |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | All typecheck, lint, and unit tests pass. | npm run test |
| AC-02 | Schema validates and migration runs. | npx prisma validate |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-03 | AC-01 |
| RQ-02 | STEP-02 | AC-01 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Race condition during profile creation. | Handled via P2002 catch block. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | REVISION_REQUIRED | Missing template adherence, P2002 handling, attribution consumption status, and schema validation evidence. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-18 | Initial contract | Initial |
| v1.1 | 2026-09-18 | Rewrite to template and fix P1s | Round 1 Audit |

