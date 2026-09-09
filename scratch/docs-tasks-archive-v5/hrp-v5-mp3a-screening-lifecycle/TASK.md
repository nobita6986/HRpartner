# TASK: hrp-v5-mp3a-screening-lifecycle

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-mp3a-screening-lifecycle` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | Tier 1 primary agent under explicit Founder waiver |
| Executor | Primary agent under explicit Founder waiver |
| Auditor | Primary agent self-audit under explicit Founder waiver |
| Baseline | `d8ba10d` |
| Modules | `MP-3 / V5-PORTAL-03 / V5-M35-02 / V5-M35-04` |
| ADR references | `UNIFIED_PLAN_v5.md` §4.4, §7.9.4–§7.9.7; MP-2 DEC-05/DEC-06 |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `MP-3B conversion/dedup` |
| Updated | `2026-08-24 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

HR can move an application through explicit screen, qualify and reject commands. Each accepted command is permission-scoped, concurrency-safe and visible in append-only status/audit history.

### Non-goals

- Worker conversion and accepted SourceClaim creation (MP-3B).
- Assignment preview/activation and slot quota (MP-3C).
- Screening UI/drawer and applicant withdrawal command.
- Changes to MP-2 public apply/tracking security boundary.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/UNIFIED_PLAN_v5.md` §7.9.4–§7.9.5 | MP-3 requires screen/qualify/reject endpoints and typed lifecycle. | Implement explicit actions, not an arbitrary status endpoint. |
| `EV-02` | `prisma/schema.prisma` at baseline | CandidateSubmission status was a free-form String and had no optimistic version. | Add enum and version migration. |
| `EV-03` | `src/domains/applications/application-queue.service.ts` | MP-2 queue roles are ADMIN/HR_MANAGER/DIRECTOR/SALE. | Preserve queue boundary; DIRECTOR remains read-only and SALE only screens. |
| `EV-04` | Clean Neon test DB migration | MP-2 partial index stored text casts in predicate. | Migration must rebuild index around enum conversion. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Keep MP-2 generic NEW↔NEEDS_INFO action unchanged; MP-3 actions use separate commands. | Plan §7.9.4 + MP-2 audit | Final |
| `DEC-02` | CHOSEN | Screen roles = ADMIN/HR_MANAGER/SALE; qualify/reject = ADMIN/HR_MANAGER. DIRECTOR remains read-only and HR_STAFF receives no ID-only bypass. | MP-2 DEC-06 boundary | Final for MP-3A |
| `DEC-03` | CHOSEN | Required reason for every command; reject explicitly requires it. | V5-M35-02 and §7.9.5 | Final |
| `DEC-04` | CHOSEN | Same-target replay is no-op; competing state/version update returns `STALE_VERSION` 409. | POST idempotency/concurrency gate | Final |
| `DEC-05` | CHOSEN | Tier independence waived by the Founder for this execution chain. | User authorization | This task only |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | CandidateSubmission status is a DB/Prisma enum including NEEDS_INFO, CONVERTED and MERGED as distinct states. | Must | EV-01/02 | Schema/migration gate fails. |
| `RQ-02` | Screen implements NEW/NEEDS_INFO→SCREENING for ADMIN/HR_MANAGER/SALE. | Must | §7.9.4 | 403 or 409 with stable code. |
| `RQ-03` | Qualify implements SCREENING→QUALIFIED for ADMIN/HR_MANAGER only. | Must | §7.9.4 | 403 or 409 with stable code. |
| `RQ-04` | Reject implements non-terminal pre-conversion→REJECTED for ADMIN/HR_MANAGER and requires reason. | Must | §7.9.4–5 | 400 REASON_REQUIRED, 403 or 409. |
| `RQ-05` | Successful changes write status history and audit in the scoped transaction. | Must | V5-M35-02 | Command fails/transaction rolls back. |
| `RQ-06` | Optimistic version prevents lost updates; repeat target is idempotent. | Must | V5-M35-02/guide | 409 STALE_VERSION; replay no-op. |
| `RQ-07` | MP-2 public apply/tracking, RLS and duplicate index keep working after enum migration. | Must | Marketplace launch gate | LIVE regression blocks acceptance. |

### 4.2 Scope boundaries

**In scope:** schema/migration, typed transition map, screening command service, three API routes, enum-safe list filters, unit/route/LIVE regression evidence.

**Out of scope:** conversion/Worker/SourceClaim, dedup merge workbench, assignment, UI, production deploy and DB cleanup.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** `CandidateSubmissionStatus` is canonical; `version` starts at zero and increments once per real transition.
- **State:** `NEW|NEEDS_INFO → SCREENING → QUALIFIED`; reject allowed before conversion; terminal states do not reopen through these actions.
- **Permission/data scope:** all routes authenticate and execute inside `withDbContext`; role sets follow DEC-02.
- **Interface:** POST action body accepts `reason` or screen-compatible `note`, plus optional non-negative `expectedVersion`.
- **Failure/idempotency/concurrency:** stable 400/403/404/409 errors; same-target replay does not duplicate history/audit.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | Prisma schema/migration | Enum status + optimistic version; rebuild partial index. | Clean test DB | validate + migrate deploy/status | Any cast/index drift. |
| `STEP-02` | `RQ-02` | status map/service/screen route | Explicit screen command. | MP-2 queue boundary | unit + route tests | Role or state mismatch. |
| `STEP-03` | `RQ-03` | qualify route/service | Explicit qualify command. | STEP-02 | unit + route tests | SALE/invalid state succeeds. |
| `STEP-04` | `RQ-04` | reject route/service | Explicit reject with reason. | STEP-02 | unit + route tests | Empty reason or SALE succeeds. |
| `STEP-05` | `RQ-05` | transaction writes | History + audit records. | withDbContext | mock interaction tests | Any residue after race. |
| `STEP-06` | `RQ-06` | optimistic update | Version predicate + replay no-op. | schema version | race/idempotency tests | Lost update possible. |
| `STEP-07` | `RQ-07` | MP-2 boundary | Run LIVE security/apply/tracking regressions. | safe Neon test DB | 23 LIVE tests | Any MP-2 regression. |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Schema validates and migration deploys on clean test DB. | Prisma validate/deploy/status | 21 migrations up to date | Yes |
| `AC-02` | `RQ-02` | Screen role/state matrix and route pass. | Targeted Vitest | PASS | Yes |
| `AC-03` | `RQ-03` | Qualify only accepts SCREENING and denies SALE. | Targeted Vitest | PASS | Yes |
| `AC-04` | `RQ-04` | Reject requires reason and denies SALE. | Targeted Vitest | PASS | Yes |
| `AC-05` | `RQ-05` | Update/history/audit are emitted once; none after race/no-op. | Service tests | PASS | Yes |
| `AC-06` | `RQ-06` | Stale expected/current version returns 409; replay is unchanged. | Service/route tests | PASS | Yes |
| `AC-07` | `RQ-07` | MP-2 LIVE suite remains 23/23 green. | Vitest LIVE | PASS | Yes |
| `AC-08` | `RQ-01` | Full unit, typecheck, scoped lint and production build succeed. | Quality commands | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-08` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Enum conversion conflicts with MP-2 text predicate. | PostgreSQL 42883. | Drop/recreate index inside migration with enum casts. | Resolve failed test migration as rolled back; redeploy fixed SQL. |
| `RISK-02` | New routes bypass queue permissions. | HR_STAFF/DIRECTOR action succeeds. | Explicit action matrices + tests. | Revert scoped command commit. |
| `RISK-03` | Concurrent screen/qualify loses an update. | updateMany count 0. | `(id,status,version)` predicate. | Return STALE_VERSION without history/audit. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None. | — | — | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | None | `ACCEPT` | Audit PASS; all 8 AC green, LIVE MP-2 regression 23/23 and build pass. | None | Tier 1 closed under waiver. |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-24` | Initial and resolved MP-3A screening lifecycle contract. | Founder waiver; audit round 1 PASS. |