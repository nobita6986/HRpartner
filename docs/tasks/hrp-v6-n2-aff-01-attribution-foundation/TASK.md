# TASK — hrp-v6-n2-aff-01-attribution-foundation

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-n2-aff-01-attribution-foundation |
| Work type | MIXED |
| Assurance lane | CRITICAL |
| Audit mode | LIGHT |
| Audit reason | Modifies DB schema (ReferralAttribution), triggers, RLS, and dedicated engine principal |
| Spec version | v1.2 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 |
| Baseline | df1c89b3bf0270a0bd215eb4e202989cdd010e3c |
| In-scope roots | prisma/schema.prisma, prisma/migrations/**, src/db/**, tests/db/**, vitest.integration.config.ts, vitest.integration-files.ts |
| Forbidden paths | docs/TIER0_SHIFT_HANDOVER.md, application code modifying N2-4 logic |
| Required gates | npx prisma validate; npx prisma migrate diff; npm run test:unit; npm run test:integration; npm run lint |
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
| DEC-06 | Migrate status/apply operations use dedicated test DB only | CHOSEN |

## 4. Contract

### 4.1 Prisma Schema & DB Contract

**Prisma Model: `ReferralAttribution`**
- `id` String @id @default(uuid())
- `referrerUserId` String @map("referrer_user_id")
- `affiliateCodeSnapshot` String @map("affiliate_code_snapshot")
- `firstClickedAt` DateTime @map("first_clicked_at") @db.Timestamptz(3)
- `expiresAt` DateTime @map("expires_at") @db.Timestamptz(3)
- `laborProfileId` String? @map("labor_profile_id")
- `status` String @default("ACTIVE") @map("status")
- `consumedAt` DateTime? @map("consumed_at") @db.Timestamptz(3)
- `createdAt` DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
- `updatedAt` DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

**Enums & DB Constraints:**
- `status` CHECK: IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED', 'SUPERSEDED')
- FK: `labor_profile_id` REFERENCES `labor_profiles(id)` DEFERRABLE INITIALLY DEFERRED
- Indexes: `referrer_user_id`, `status`

### 4.2 Application / Infrastructure

- `HRPARTNER_ENGINE_URL` fail-closed behavior with no writer fallback (path: `src/db/engine-client.ts`).
- Asia/Bangkok exclusive next-day calculation boundary vector from DISCOVERY.md (helper path: `src/shared/utils/date-boundary.ts`).
- E-19 is `DOCUMENTED_DEFERRED_TO_N2_5` only.
- `tests/db/referral-attribution-foundation.integration.test.ts` is registered in `vitest.integration-files.ts`.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| STEP-01 | prisma/schema.prisma | Add ReferralAttribution model | npx prisma validate | Compile error |
| STEP-02 | prisma/migrations/ | Generate empty migration and add schema/trigger/constraint SQL | npx prisma migrate diff | SQL error |
| STEP-03 | src/db/engine-client.ts | Create engine client with HRPARTNER_ENGINE_URL fail-closed | npm run test:unit | Engine fallback |
| STEP-04 | src/shared/utils/date-boundary.ts | Asia/Bangkok date boundary helper | npm run test:unit | Incorrect timezone |
| STEP-05 | DB role/policies | Provision app_engine_writer and RLS (no DELETE) | npm run test:integration | Privilege convergence fail |
| STEP-06 | Tests | Implement LIVE test matrices E-01..E-18 + N2-1 specific | npm run test:integration | Test failures |
| STEP-07 | vitest.integration-files.ts | Register integration test file | npm run test:integration | CI failure |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| AC-01 | ReferralAttribution schema matches contract exactly. | npx prisma validate |
| AC-02 | Layer 1 trigger functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-03 | Layer 1b write-once trigger functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-04 | Layer 1c lifecycle matrix functions correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-05 | CHECK constraints function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-06 | TIMESTAMPTZ(3) UTC clock fields are correct. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-07 | Asia/Bangkok boundary helper matches DISCOVERY.md vector. | npx vitest run --config vitest.unit.config.ts src/shared/utils/date-boundary.test.ts |
| AC-08 | FORCE RLS active; no DELETE allowed. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-09 | SELECT policies (ADMIN/referrer/engine) function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-10 | INSERT/UPDATE policies function correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-11 | Policies function via COALESCE(current_setting(...), ''). | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-12 | Direct LOGIN role created correctly. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-13 | current_user/session_user verified. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-14 | E-01..E-18 tests explicitly implemented and passing. | npx vitest run --config vitest.integration.config.ts tests/db/referral-attribution-foundation.integration.test.ts |
| AC-15 | E-19 is DOCUMENTED_DEFERRED_TO_N2_5, no code attempts to run it. | Code inspection |
| AC-16 | HRPARTNER_ENGINE_URL is fail-closed, no writer fallback. | npx vitest run --config vitest.unit.config.ts src/db/engine-client.test.ts |
| AC-17 | Rollback defined. | Code inspection |
| AC-18 | Full Quality gates pass. | npm run test:unit; npm run lint |
| AC-19 | Migrate status/apply operations use dedicated test DB only. | Code inspection |

### 6.2 E-01 through E-18 Contract Map

| E-Vector | Expected Result | Test File | Target AC |
|---|---|---|---|
| E-01 | rolname='app_engine_writer', rolsuper=false, rolbypassrls=false | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-12 |
| E-02 | has_table_privilege DELETE is false | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-08 |
| E-03 | has_table_privilege INSERT is true | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-10 |
| E-04 | has_table_privilege UPDATE is true | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-10 |
| E-05 | has_table_privilege SELECT is true | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-09 |
| E-06 | Context cleared at COMMIT | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-11 |
| E-07 | Context cleared at ROLLBACK | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-11 |
| E-08 | Link-capture context UPDATE on ACTIVE denied | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-10 |
| E-09 | INSERT without context set denied | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-10 |
| E-10 | INSERT with invalid context denied | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-10 |
| E-11 | set_config(..., false) rejected by lint | `npm run lint` | AC-18 |
| E-12 | Pooled connection context leak denied | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-11 |
| E-13 | COALESCE handles unset GUC correctly | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-11 |
| E-14 | current_user='app_engine_writer' | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-13 |
| E-15 | pg_stat_activity connection separation | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-12 |
| E-16 | HRPARTNER_ENGINE_URL no fallback | `src/db/engine-client.test.ts` | AC-16 |
| E-17 | INSERT ... RETURNING allowed | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-09 |
| E-18 | Canonical JSON 1.0=1 and -0=0 | `tests/db/referral-attribution-foundation.integration.test.ts` | AC-14 |
| E-19 | DOCUMENTED_DEFERRED_TO_N2_5 | `Code inspection` | AC-15 |

### 6.3 Traceability

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
| RISK-02 | RLS bypass or missing policies | Run full E-01..E-18 isolation matrices via dedicated integration tests |
| RISK-03 | Role drift or ownership/membership leakage | Assert exact NOINHERIT/NOSUPERUSER/NOBYPASSRLS and check pg_auth_members/pg_class |
| RISK-04 | RLS lockout from over-restrictive policies | Implement comprehensive SELECT/INSERT/UPDATE matrices for ADMIN/referrer/engine |
| RISK-05 | Engine credential leakage or fallback | Strictly separate HRPARTNER_ENGINE_URL; test fail-closed behavior |
| RISK-06 | Faulty migration / schema rollback failure | Migration must use dedicated test DB only; implement explicit rollback stop conditions |

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
| v1.2 | 2026-09-17 | PR #9 revision 2 | Explicit E-01..E-18 table, expanded risk matrix, exact N2-1 test file |
