# TASK — hrp-v6-n2-aff-01-attribution-foundation

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-01-attribution-foundation |
| Work type | MIXED |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Modifies DB schema (ReferralAttribution), triggers (immutability, state transitions), RLS, and dedicated engine principal. |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 |
| Baseline | df1c89b3bf0270a0bd215eb4e202989cdd010e3c |
| In-scope roots | prisma/schema.prisma, prisma/migrations/**, src/db/** |
| Forbidden paths | docs/TIER0_SHIFT_HANDOVER.md, application code modifying N2-4 logic |
| Required gates | npx prisma validate; npx prisma migrate status |
| Current execution round | 0 |
| Current audit round | 0 |
| Next gate | /deliver → /audit → /resolve |

## 1. Outcome

### 1.1 User-visible outcome
- Complete ReferralAttribution schema and lifecycle contract implemented entirely in the DB.
- Application engine uses dedicated connection (app_engine_writer) with exact transaction-local contexts for insertion.
- Immutable constraints and write-once triggers strictly enforce history integrity.

### 1.2 Non-goals
- No N2-4 team-table references.
- No client-facing UI or application endpoints.
- No production migration or credential mutation by Tier 1.
- No fallback to app_user_writer.
- No DELETE grant and no DELETE policy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md | Exact boundary acceptance vector and policies |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Additive migration only for ReferralAttribution schema | CHOSEN |
| DEC-02 | TIMESTAMPTZ(3) UTC storage with Asia/Bangkok exclusive next-day calculation | CHOSEN |
| DEC-03 | Direct LOGIN role for engine (LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION) | CHOSEN |
| DEC-04 | HRPARTNER_ENGINE_URL and dedicated pool for engine operations | CHOSEN |
| DEC-05 | RA-only privilege convergence and ownership/membership assertions | CHOSEN |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Complete ReferralAttribution schema with immutable Layer 1 trigger. |
| RQ-02 | laborProfileId Layer 1b NULL→value write-once trigger. |
| RQ-03 | Layer 1c terminal lifecycle matrix. |
| RQ-04 | current-state CHECK constraints. |
| RQ-05 | TIMESTAMPTZ(3) UTC storage and Asia/Bangkok exclusive next-day calculation. |
| RQ-06 | FORCE RLS with no DELETE grant and no DELETE policy. |
| RQ-07 | ADMIN/referrer SELECT, engine SELECT for INSERT ... RETURNING. |
| RQ-08 | engine INSERT/UPDATE policies and ADMIN UPDATE policy. |
| RQ-09 | Gated by COALESCE(current_setting('hrp.engine_context', true), ''). |
| RQ-10 | direct LOGIN role, RA-only privilege convergence and ownership/membership assertions. |
| RQ-11 | current_user/session_user verification. |
| RQ-12 | E-19 deferred cross-slice execution condition for N2-5. |
| RQ-13 | Explicit E-01..E-18 mapping. |

### 4.2 Scope boundaries

- **In:** prisma/schema.prisma, migration SQL files for triggers/policies/role.
- **Out:** N2-4 team tables, production deployments.
- **Allowed task artifacts:** docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/**

### 4.3 Domain boundaries

- **Data/state:** Exact state machine (ACTIVE, CONSUMED, EXPIRED, REVOKED, SUPERSEDED).
- **Permission/security:** FORCE RLS, NO DELETE. Dedicated app_engine_writer role.
- **Interface/API:** N/A — DB layer only.
- **Migration/rollback:** Additive migration. Dedicated test DB only.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | prisma/schema.prisma | Add ReferralAttribution model | npx prisma validate | Compile error |
| STEP-02 | prisma/migrations/ | Generate empty migration and add schema/trigger/constraint SQL | npx prisma migrate diff | SQL error |
| STEP-03 | DB role/policies | Provision app_engine_writer and RLS (no DELETE) | npx vitest run tests/db/ | Privilege convergence fail |
| STEP-04 | Tests | Implement LIVE test matrices E-01..E-18 + N2-1 specific | npx vitest run tests/db/ | Test failures |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | ReferralAttribution schema matches DISCOVERY.md with additive migration. | npx prisma validate |
| AC-02 | Layer 1, 1b, 1c triggers function correctly. | npx vitest run tests/db/referral-triggers.test.ts |
| AC-03 | TIMESTAMPTZ(3) UTC and Asia/Bangkok exclusive next-day calculation correct. | npx vitest run tests/db/referral-boundaries.test.ts |
| AC-04 | FORCE RLS is active; no DELETE allowed. | npx vitest run tests/db/referral-rls.test.ts |
| AC-05 | Policies function via COALESCE(current_setting(...), ''). | npx vitest run tests/db/referral-rls.test.ts |
| AC-06 | Direct LOGIN role created correctly. current_user/session_user verified. | npx vitest run tests/db/referral-engine.test.ts |
| AC-07 | Deferred cross-slice execution condition (E-19) explicitly mapped for N2-5. | npx vitest run tests/db/referral-engine.test.ts |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-02 | AC-02 |
| RQ-04 | STEP-02 | AC-02 |
| RQ-05 | STEP-02 | AC-03 |
| RQ-06 | STEP-03 | AC-04 |
| RQ-07 | STEP-03 | AC-05 |
| RQ-08 | STEP-03 | AC-05 |
| RQ-09 | STEP-03 | AC-05 |
| RQ-10 | STEP-03 | AC-06 |
| RQ-11 | STEP-03 | AC-06 |
| RQ-12 | STEP-04 | AC-07 |
| RQ-13 | STEP-04 | AC-06 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| RISK-01 | Trigger definitions leak to other schemas | Scope triggers explicitly to ReferralAttribution |
| RISK-02 | RLS bypass or missing policies | Run full E-01..E-18 isolation matrices via npx vitest |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | READY_FOR_EXECUTION | All requirements satisfied per Owner directive |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.0 | 2026-09-17 | Initial contract | Converted from N2 DISCOVERY.md |
