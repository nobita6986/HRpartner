# TASK: hrp-v6-n2-aff-01-attribution-foundation

**Objective:** Implement the N2-1 Attribution Foundation vertical slice. This includes the `ReferralAttribution` Prisma model/table, immutable + lifecycle triggers, RLS policies scoped to the engine/owner (excluding team concepts), and the `app_engine_writer` system login provisioning.

## 1. Scope & Non-Goals

### In Scope
- **Schema & Migration:** Add `ReferralAttribution` model.
- **Clock Boundaries:** Implement TIMESTAMPTZ UTC storage, Asia/Bangkok day-boundary computation for calendar days, and half-open interval checks.
- **Triggers (DB Authority):**
  - Layer 1: Immutable columns (`referrer_user_id`, `affiliate_code_snapshot`, `first_clicked_at`, `expires_at`, `created_at`).
  - Layer 1b: Write-once transition for `labor_profile_id` (NULL → value).
  - Layer 1c: Strict state transitions (`ACTIVE` to `CONSUMED`/`EXPIRED`/`REVOKED`/`SUPERSEDED`).
- **Constraints:** CHECK constraints for status domain, deferrable foreign keys.
- **Security (RLS):**
  - FORCE ROW LEVEL SECURITY.
  - Default-deny DELETE policy.
  - SELECT policy for ADMIN and referrer own-view.
  - Dedicated `app_engine_writer` principal provisioning (LOGIN, NOINHERIT, NOSUPERUSER).
  - INSERT/UPDATE policies for `app_engine_writer` gated by transaction-local `hrp.engine_context`.
- **Testing:** Immutability trigger tests, write-once logic tests, lifecycle transitions tests, RLS tests, and LIVE matrices (E-01..E-19) applicable to N2-1.

### Out of Scope
- Link capture service (N2-2).
- Candidate application/submission updates (N2-3).
- Team and handling assignments (N2-4).
- Business-day / Holiday calendar logic.
- Schema/Migration outside of `ReferralAttribution`.

## 2. Requirements (RQ) & Acceptance Criteria (AC)

### RQ-01: Schema Foundation
- **STEP-01:** Add `ReferralAttribution` to `schema.prisma`. All clock fields (`firstClickedAt`, `expiresAt`, `consumedAt`) must use `@db.Timestamptz(3)`.
- **STEP-02:** Use calendar days exclusively. Map `expires_at` using Asia/Bangkok next-day boundaries (exclusive, half-open interval).
- **AC-01:** Migration is additive; `prisma validate` passes.
- **AC-02:** Clock helper tests prove boundary computations against `Asia/Bangkok` timezone.

### RQ-02: DB-Level Immutability and Write-Once Triggers
- **STEP-03:** Add Layer 1 trigger denying UPDATE on `referrer_user_id`, `affiliate_code_snapshot`, `first_clicked_at`, `expires_at`, `created_at`.
- **STEP-04:** Add Layer 1b trigger for `labor_profile_id` (allow NULL → value exactly once, deny value → different value, deny value → NULL).
- **STEP-05:** Add Layer 1c trigger enforcing lifecycle transitions (`ACTIVE` → `CONSUMED` | `EXPIRED` | `REVOKED` | `SUPERSEDED`, and NO transitions from terminal states).
- **AC-03:** Write-once LIVE test passes (inserts with NULL, updates to UUID succeeds, subsequent updates fail).
- **AC-04:** Lifecycle LIVE test prevents resurrected terminal states.

### RQ-03: Security and RLS Posture
- **STEP-06:** Apply `FORCE ROW LEVEL SECURITY` to `referral_attributions`.
- **STEP-07:** Implement default-deny DELETE (no policy).
- **STEP-08:** Create SELECT policy for `ADMIN` and the specific referrer (`referrer_user_id`).
- **STEP-09:** Provision `app_engine_writer` role idempotently with proper revocations (NOINHERIT, NOBYPASSRLS) as detailed in DISCOVERY.md Step 1-4.
- **STEP-10:** Create INSERT/UPDATE policies for `app_engine_writer` gated by `current_setting('hrp.engine_context', true)`.
- **AC-05:** LIVE matrices E-01 through E-19 (N2-1 applicable subset) PASS.
- **AC-06:** Engine context tests pass (absent context denied, invalid denied, valid allowed; context cleared on COMMIT/ROLLBACK).

## 3. Execution Directives
- **Migrations:** Output must be a single, additive Prisma migration script without DROP/ALTER TYPE operations.
- **Tests:** Add integration tests utilizing a dedicated Test DB to verify Triggers, RLS, and Constraints properly reject invalid operations independently of application layers.
- **No Dependencies:** Do not assume `labor_profile_handling_assignments` or `hr_team_members` exists. All policies strictly reference self-contained data.
