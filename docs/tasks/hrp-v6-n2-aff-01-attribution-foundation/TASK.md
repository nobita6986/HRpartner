# TASK — hrp-v6-n2-aff-01-attribution-foundation

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-01-attribution-foundation |
| Work type | MIXED |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Modifies DB schema (ReferralAttribution), triggers, RLS, and dedicated engine principal |
| Spec version | v1.1 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 |
| Baseline | df1c89b3bf0270a0bd215eb4e202989cdd010e3c |
| In-scope roots | prisma/schema.prisma, prisma/migrations/**, src/db/**, tests/db/**, vitest.integration.config.ts, vitest.integration-files.ts |
| Forbidden paths | docs/TIER0_SHIFT_HANDOVER.md, application code modifying N2-4 logic |
| Required gates | npx prisma validate; npx prisma migrate status |
| Current execution round | 0 |
| Current audit round | 0 |
| Next gate | /deliver → /audit → /resolve |

## 1. Outcome

### 1.1 User-visible outcome
- Complete `ReferralAttribution` schema and lifecycle contract implemented entirely in the DB.
- Application engine uses dedicated connection (`app_engine_writer`) with exact transaction-local contexts for insertion.
- Immutable constraints and write-once triggers strictly enforce history integrity.

### 1.2 Non-goals
- No N2-4 team-table references.
- No client-facing UI or application endpoints.
- No production migration or credential mutation by Tier 1.
- No fallback to `app_user_writer` for the engine.
- No DELETE grant and no DELETE policy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| EV-01 | docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md | Exact boundary acceptance vector and policies |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Additive migration only for `ReferralAttribution` schema | CHOSEN |
| DEC-02 | TIMESTAMPTZ(3) UTC storage with Asia/Bangkok exclusive next-day calculation | CHOSEN |
| DEC-03 | Direct LOGIN role for engine (LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOREPLICATION) | CHOSEN |
| DEC-04 | HRPARTNER_ENGINE_URL fail-closed behavior with no writer fallback | CHOSEN |
| DEC-05 | RA-only privilege convergence and ownership/membership assertions | CHOSEN |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| RQ-01 | Complete `ReferralAttribution` schema (referrerUserId, affiliateCodeSnapshot, firstClickedAt, expiresAt, laborProfileId, status, consumedAt, createdAt, updatedAt) with exact Enum, FKs, indexes, and CHECKs. |
| RQ-02 | Immutable Layer 1 trigger on `ReferralAttribution`. |
| RQ-03 | `laborProfileId` Layer 1b NULL→value write-once trigger. |
| RQ-04 | Layer 1c terminal lifecycle matrix. |
| RQ-05 | Current-state CHECK constraints. |
| RQ-06 | TIMESTAMPTZ(3) UTC storage for clock fields. |
| RQ-07 | Asia/Bangkok exclusive next-day calculation boundary vector from DISCOVERY.md (helper path: `src/shared/utils/date-boundary.ts`). |
| RQ-08 | FORCE RLS with no DELETE grant and no DELETE policy. |
| RQ-09 | ADMIN/referrer SELECT, engine SELECT for INSERT ... RETURNING. |
| RQ-10 | Engine INSERT/UPDATE policies and ADMIN UPDATE policy. |
| RQ-11 | Gated by `COALESCE(current_setting('hrp.engine_context', true), '')`. |
| RQ-12 | Direct LOGIN role, RA-only privilege convergence and ownership/membership assertions. |
| RQ-13 | `current_user/session_user` verification. |
| RQ-14 | Explicit E-01..E-18 mapped vectors. |
| RQ-15 | E-19 DOCUMENTED_DEFERRED_TO_N2_5, with no command pretending to run it. |
| RQ-16 | `HRPARTNER_ENGINE_URL` fail-closed behavior with no writer fallback (path: `src/db/engine-client.ts`). |
| RQ-17 | Migration/role/RLS rollback and stop conditions defined. |
| RQ-18 | Full Quality gates and strict dedicated-DB Integration gate (vitest.integration-files.ts in scope). |
| RQ-19 | Test-only engine/admin/writer environment requirements explicitly fulfilled in integration tests. |

### 4.2 Scope boundaries

- **In:** `prisma/schema.prisma`, migration SQL files, `src/db/engine-client.ts`, `src/shared/utils/date-boundary.ts`, `vitest.integration.config.ts`, `vitest.integration-files.ts`, `tests/db/**`
- **Out:** N2-4 team tables, production deployments.
- **Allowed task artifacts:** docs/tasks/hrp-v6-n2-aff-01-attribution-foundation/**

### 4.3 Domain boundaries

- **Data/state:** Exact state machine (ACTIVE, CONSUMED, EXPIRED, REVOKED, SUPERSEDED).
- **Permission/security:** FORCE RLS, NO DELETE. Dedicated `app_engine_writer` role.
- **Migration/rollback:** Additive migration. Dedicated test DB only. Stop condition: `pg_roles` attribute drift.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | prisma/schema.prisma | Add ReferralAttribution model | npx prisma validate | Compile error |
| STEP-02 | prisma/migrations/ | Generate empty migration and add schema/trigger/constraint SQL | npx prisma migrate diff | SQL error |
| STEP-03 | src/db/engine-client.ts | Create engine client with HRPARTNER_ENGINE_URL fail-closed | npx vitest run --config vitest.unit.config.ts tests/db/ | Engine fallback |
| STEP-04 | src/shared/utils/date-boundary.ts | Asia/Bangkok date boundary helper | npx vitest run --config vitest.unit.config.ts tests/db/ | Incorrect timezone |
| STEP-05 | DB role/policies | Provision app_engine_writer and RLS (no DELETE) | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts | Privilege convergence fail |
| STEP-06 | Tests | Implement LIVE test matrices E-01..E-18 + N2-1 specific | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts | Test failures |
| STEP-07 | vitest.integration-files.ts | Add new integration test files | npm run test:integration | CI failure |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | ReferralAttribution schema matches DISCOVERY.md exactly. | npx prisma validate |
| AC-02 | Layer 1 trigger functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-03 | Layer 1b write-once trigger functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-04 | Layer 1c lifecycle matrix functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-05 | CHECK constraints function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-06 | TIMESTAMPTZ(3) UTC clock fields are correct. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-07 | Asia/Bangkok boundary helper matches DISCOVERY.md vector. | npx vitest run --config vitest.unit.config.ts tests/db/boundary.test.ts |
| AC-08 | FORCE RLS active; no DELETE allowed. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-09 | SELECT policies (ADMIN/referrer/engine) function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-10 | INSERT/UPDATE policies function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-11 | Policies function via COALESCE(current_setting(...), ''). | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-12 | Direct LOGIN role created correctly. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-13 | current_user/session_user verified. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-14 | E-01..E-18 tests explicitly implemented and passing. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |
| AC-15 | E-19 is DOCUMENTED_DEFERRED_TO_N2_5, no code attempts to run it. | Code inspection |
| AC-16 | HRPARTNER_ENGINE_URL is fail-closed, no writer fallback. | npx vitest run --config vitest.unit.config.ts tests/db/engine-client.test.ts |
| AC-17 | Rollback defined. | Code inspection |
| AC-18 | Full Quality gates pass. | npm run test:unit; npm run lint |
| AC-19 | Test-only engine/admin/writer environments provided. | npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-02 | AC-03 |
| RQ-04 | STEP-02 | AC-04 |
| RQ-05 | STEP-02 | AC-05 |
| RQ-06 | STEP-02 | AC-06 |
| RQ-07 | STEP-04 | AC-07 |
| RQ-08 | STEP-05 | AC-08 |
| RQ-09 | STEP-05 | AC-09 |
| RQ-10 | STEP-05 | AC-10 |
| RQ-11 | STEP-05 | AC-11 |
| RQ-12 | STEP-05 | AC-12 |
| RQ-13 | STEP-05 | AC-13 |
| RQ-14 | STEP-06 | AC-14 |
| RQ-15 | STEP-06 | AC-15 |
| RQ-16 | STEP-03 | AC-16 |
| RQ-17 | STEP-02 | AC-17 |
| RQ-18 | STEP-07 | AC-18 |
| RQ-19 | STEP-06 | AC-19 |

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
| v1.1 | 2026-09-17 | PR #9 revision | Added exact model fields, engine URL, explicit E-19 deferral, strict integration paths |
