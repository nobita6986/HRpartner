-- ============================================================================
-- Migration: hrp-v6-n2-aff-03 writer SELECT/UPDATE policies on referral_attributions
-- Task:      hrp-v6-n2-aff-03-apply-attribution (AFF-03 Public apply attribution)
-- Baseline:  4e6d0c1 (origin/main post AFF-05A merge)
-- Author:    Tier 1 (T1B), under Tier 0 verdict on BLK-01 (round 2, APPROVED with correction)
-- Status:    ADDITIVE — does NOT touch schema, N2-1 triggers, engine RLS, or existing policies.
--            ENABLE/FORCE RLS already on from N2-1 foundation (line 221-222 of
--            20260917000000_referral_attribution_foundation/migration.sql).
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- AFF-03 owns the public anon N1 apply path at POST /api/public/intake.
-- The path reads `hrp_aff` cookie → verifyAttributionToken → looks up the
-- ReferralAttribution row by id → passes the row's referrerUserId to the N1
-- intake writer → writer consumes the attribution (status: ACTIVE -> CONSUMED).
--
-- Under FORCE RLS, the writer role (app_user_writer) needs explicit policies:
--   1. SELECT — to look up the row by id in the service layer.
--   2. UPDATE — to flip status from ACTIVE to CONSUMED in the intake writer.
--
-- The existing policies at N2-1 are:
--   hrp_ra_select         TO app_user            (ADMIN OR own referrer)
--   hrp_ra_update         TO app_user_writer     (ADMIN-gated; hrp_session_role()='ADMIN')
--   hrp_ra_select_engine  TO app_engine_writer   (engine context GUC)
--   hrp_ra_insert_engine  TO app_engine_writer   (engine context GUC)
--   hrp_ra_update_engine  TO app_engine_writer   (engine context GUC)
--
-- There is NO SELECT policy for app_user_writer, and the UPDATE policy is
-- ADMIN-gated. Under anon route (no GUC set), `hrp_session_role()` returns NULL
-- and BOTH `findUnique` and `update` would fail with SQLSTATE 42501.
--
-- Tier 0 verdict on BLK-01 (round 2, APPROVED with correction):
--   - Tier 0 caught a bug in round-1 proposal: 'NEW' and 'CONVERTED' are
--     CandidateSubmission statuses, NOT ReferralAttribution statuses.
--   - Correct ReferralAttribution enum: ('ACTIVE', 'CONSUMED', 'EXPIRED',
--     'REVOKED', 'SUPERSEDED') per `referral_attributions_status_check`.
--   - Tier 0 also required: server-clock guard `expires_at > now()` and
--     `status = 'ACTIVE'` BEFORE consume. (Enforced in service layer; this
--     migration provides the boundary.)
--   - LIM-AFF-03-01/02/03 ACCEPTED per V6/aff_plan.md §14.1 clause 3
--     (recorded, not self-claimed green).
--
-- SCOPE (narrowest possible)
--   SELECT: status IN ('ACTIVE','CONSUMED'). The service reads the row to
--     (a) check the current status before deciding to consume, and (b) read
--     referrerUserId for the handling assignment. A CONSUMED row is also
--     visible (defense in depth: idempotency replay can re-read the row),
--     but the service's status guard (status='ACTIVE') prevents re-consumption.
--   UPDATE: writer can ONLY flip ACTIVE -> CONSUMED. USING ensures the row
--     was ACTIVE; WITH CHECK ensures the new state is exactly CONSUMED with
--     labor_profile_id set. Terminal states (CONSUMED, EXPIRED, REVOKED,
--     SUPERSEDED) and any status other than CONSUMED are denied. The N2-1
--     lifecycle trigger independently enforces the same transition matrix.
--
-- IDEMPOTENT
--   DROP POLICY IF EXISTS ... ON referral_attributions; CREATE POLICY ...
--   Pattern matches the rest of the migration set (m1_07a, m1_07b, etc.).
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief: "KHONG apply migration len production". Tier 1 ships
--   the migration file; T0/Owner applies to production as a separate gate.
-- ============================================================================

-- Idempotent re-create: tier 1 runs this locally to verify; T0/Owner runs
-- in production through the standard migration apply pipeline.

DROP POLICY IF EXISTS hrp_ra_select_writer ON referral_attributions;
DROP POLICY IF EXISTS hrp_ra_update_writer ON referral_attributions;

CREATE POLICY hrp_ra_select_writer ON referral_attributions
  AS PERMISSIVE FOR SELECT TO app_user_writer
  USING (
    status IN ('ACTIVE', 'CONSUMED')
  );

-- UPDATE policy: writer can ONLY flip ACTIVE -> CONSUMED. WITH CHECK enforces
-- the new row shape (consumed + labor_profile_id bound); USING enforces the
-- pre-state (must be ACTIVE). The N2-1 lifecycle trigger independently
-- enforces the transition matrix; this policy is the RLS-level gate.
CREATE POLICY hrp_ra_update_writer ON referral_attributions
  AS PERMISSIVE FOR UPDATE TO app_user_writer
  USING (
    status = 'ACTIVE'
  )
  WITH CHECK (
    status = 'CONSUMED'
    AND labor_profile_id IS NOT NULL
  );
