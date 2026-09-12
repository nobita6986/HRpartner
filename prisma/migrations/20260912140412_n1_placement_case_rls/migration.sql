-- Migration: N1 PlacementCase RLS
-- Forward-only RLS for placement_case (N1 foundation).
-- Pattern: ref P1 labor_profile_rls (`20260908150001_v6_phase1a_labor_profile_rls`).
-- Reuses hrp_session_role() / hrp_session_user_id() helpers.
--
-- Scope: HR_MANAGER + HR_STAFF + ADMIN short-circuit.
-- NOT public / anon (case is internal HR data; only set via intake writer / admin UI).
-- This migration file is forward-only: it does not remove existing policies.
--
-- Note: candidate_submissions.placement_case_id is the back-relation;
--       RLS on candidate_submissions already exists (MP-2 era) and covers the FK column.

-- PLACEMENT_CASE
ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_case FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_placement_case_scope ON placement_case
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
  );
