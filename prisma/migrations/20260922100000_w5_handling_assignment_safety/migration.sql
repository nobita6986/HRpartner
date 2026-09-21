-- W5 HandlingAssignment safety closure.
-- Forward-only: policy metadata only; no table rewrite or data backfill.
-- Production apply remains an Owner-controlled gate.

ALTER TABLE labor_profile_handling_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_handling_assignments FORCE ROW LEVEL SECURITY;

REVOKE ALL ON labor_profile_handling_assignments FROM PUBLIC;
REVOKE DELETE ON labor_profile_handling_assignments FROM app_user_writer;
GRANT SELECT, INSERT, UPDATE ON labor_profile_handling_assignments TO app_user_writer;
GRANT SELECT ON labor_profile_handling_assignments TO app_user;

DROP POLICY IF EXISTS hrp_handling_assignment_select ON labor_profile_handling_assignments;
DROP POLICY IF EXISTS hrp_handling_assignment_insert ON labor_profile_handling_assignments;
DROP POLICY IF EXISTS hrp_handling_assignment_update ON labor_profile_handling_assignments;

CREATE POLICY hrp_handling_assignment_select ON labor_profile_handling_assignments
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
    OR (
      hrp_session_role() IN ('HR_STAFF', 'CTV')
      AND assignee_user_id = hrp_session_user_id()
    )
  );

CREATE POLICY hrp_handling_assignment_insert ON labor_profile_handling_assignments
  AS PERMISSIVE FOR INSERT
  TO app_user_writer
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );

CREATE POLICY hrp_handling_assignment_update ON labor_profile_handling_assignments
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER')
  );
