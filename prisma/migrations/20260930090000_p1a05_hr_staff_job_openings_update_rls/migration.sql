-- 20260930090000_p1a05_hr_staff_job_openings_update_rls
--
-- Pre-audit correction batch 1/1 §F follow-on: JobOpening activation now has
-- a scoped HR_STAFF path (openJobOpening → /open). The activation service
-- uses `SELECT ... FOR UPDATE OF jo` to lock the row before reading state
-- under the lock and committing the DRAFT → OPEN transition.
--
-- Postgres RLS evaluates ALL applicable policies on the target table for
-- `FOR UPDATE`; the existing `job_openings_update` policy gates UPDATE via
-- `hrp_project_writable` which excludes HR_STAFF. Result: `FOR UPDATE`
-- returns 0 rows for HR_STAFF callers even when the SELECT policy admits
-- them. This prevents the activation service from acquiring the row lock
-- that serializes the DRAFT → OPEN transition.
--
-- Fix (forward-only continuation of pre-audit correction batch 1/1):
-- Add a NARROW PERMISSIVE UPDATE policy for HR_STAFF on `job_openings`,
-- gated on `hrp_staffing_order_visible_for` (ACTIVE-assignment helper).
-- OR'd with the existing admin/manager UPDATE policy.
--
-- Revoked / unassigned HR_STAFF callers are privacy-fail-closed at the
-- SELECT stage (existing `hrp_sora_job_openings_staff_select` policy does
-- not admit them); the activation service surfaces NOT_FOUND 404 for
-- those cases, matching the page-level `notFound()` envelope (pre-audit
-- correction batch 1/1 §G).
--
-- Idempotent (DROP POLICY IF EXISTS). Applied to synthetic DB only;
-- production migration applies per Tier 3 audit approval.

BEGIN;

-- Narrow HR_STAFF UPDATE policy on job_openings, scoped to rows whose
-- parent StaffingOrder the caller has ACTIVE recruiter authority on.
DROP POLICY IF EXISTS hrp_a05_job_openings_staff_update ON public.job_openings;
CREATE POLICY hrp_a05_job_openings_staff_update ON public.job_openings
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer, app_user
  USING (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND public.hrp_staffing_order_visible_for(staffing_order_id)
  )
  WITH CHECK (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND public.hrp_staffing_order_visible_for(staffing_order_id)
  );

-- Static-test guard: the new policy exists and is PERMISSIVE.
DO $$
DECLARE
  v_update_count int;
BEGIN
  SELECT count(*) INTO v_update_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'job_openings'
     AND policyname = 'hrp_a05_job_openings_staff_update';
  IF v_update_count <> 1 THEN
    RAISE EXCEPTION 'p1a05 migration: hrp_a05_job_openings_staff_update policy not found (count=%)', v_update_count;
  END IF;
END
$$;

COMMIT;