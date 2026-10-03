-- 20261003000001_f9_hr_staff_posting_insert_rls
--
-- F9 correction batch 1/1 §F continuation: HR_STAFF JobPosting authoring
-- requires a narrowly-scoped DB-level INSERT path on `job_openings` and
-- `job_postings` (in addition to the UPDATE path added by
-- `20261003000000_f9_hr_staff_posting_write_rls`).
--
-- The application runtime uses the WRITER connection only — no separate
-- admin/bypass Prisma client. The writer connection's `INSERT INTO
-- job_openings` (DRAFT bound to a slot on an assigned order) and
-- `INSERT INTO job_postings` (DRAFT bound to that opening) must succeed
-- for HR_STAFF callers who hold an ACTIVE recruiter assignment on the
-- parent order.
--
-- Pre-existing RLS posture (UNCHANGED):
--   - `job_openings_insert` (FOR INSERT, gated on `hrp_project_writable`,
--     which excludes HR_STAFF). HR_STAFF was previously blocked at INSERT
--     time. The new policy below is an OR'd narrow HR_STAFF INSERT path.
--   - `hrp_a05_job_openings_staff_update` (FOR UPDATE, scoped to
--     `hrp_staffing_order_visible_for`); unchanged. F9 inherits the
--     precedent.
--   - `hrp_f9_postings_staff_update` (FOR UPDATE, scoped through
--     `job_openings.staffing_order_id`); unchanged. (No INSERT policy
--     exists for HR_STAFF on `job_postings` either; this migration adds
--     one.)
--
-- New policies (this migration):
--   1. `hrp_f9_openings_staff_insert` on `job_openings`:
--      PERMISSIVE FOR INSERT, TO app_user_writer / app_user, WITH CHECK
--      gated on `hrp_session_role() = 'HR_STAFF' AND
--      hrp_staffing_order_visible_for(staffing_order_id) AND
--      (status = 'DRAFT')`. The status constraint prevents HR_STAFF from
--      creating an already-OPEN / FILLED / CANCELLED opening in one
--      INSERT (those lifecycle states are OWNER-only per V6-DEC-011).
--   2. `hrp_f9_postings_staff_insert` on `job_postings`:
--      PERMISSIVE FOR INSERT, TO app_user_writer / app_user, WITH CHECK
--      gated on the same predicate JOINed through the parent JobOpening's
--      `staffing_order_id` and `status = 'DRAFT'`.
--
-- Idempotent (DROP POLICY IF EXISTS). Applied to synthetic DB only
-- (`ep-empty-forest-azlhfyo9-*`). Production migration applies per Tier 3
-- audit approval.

BEGIN;

-- (1) Narrow HR_STAFF INSERT policy on job_openings.
DROP POLICY IF EXISTS hrp_f9_openings_staff_insert ON public.job_openings;
CREATE POLICY hrp_f9_openings_staff_insert ON public.job_openings
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND public.hrp_staffing_order_visible_for(staffing_order_id)
    AND status = 'DRAFT'
  );

-- (2) Narrow HR_STAFF INSERT policy on job_postings (joined through
--     job_openings.staffing_order_id).
DROP POLICY IF EXISTS hrp_f9_postings_staff_insert ON public.job_postings;
CREATE POLICY hrp_f9_postings_staff_insert ON public.job_postings
  AS PERMISSIVE FOR INSERT
  TO app_user_writer, app_user
  WITH CHECK (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = public.job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
    AND status = 'DRAFT'
  );

-- Static-test guard: the new INSERT policies exist and are PERMISSIVE FOR
-- INSERT.
DO $$
DECLARE
  v_openings_count int;
  v_openings_cmd text;
  v_postings_count int;
  v_postings_cmd text;
BEGIN
  SELECT count(*), max(cmd)
    INTO v_openings_count, v_openings_cmd
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'job_openings'
     AND policyname = 'hrp_f9_openings_staff_insert';
  IF v_openings_count <> 1 THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_insert_rls: hrp_f9_openings_staff_insert policy not found (count=%)', v_openings_count;
  END IF;
  IF v_openings_cmd <> 'INSERT' THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_insert_rls: hrp_f9_openings_staff_insert expected cmd=INSERT, got cmd=%', v_openings_cmd;
  END IF;

  SELECT count(*), max(cmd)
    INTO v_postings_count, v_postings_cmd
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'job_postings'
     AND policyname = 'hrp_f9_postings_staff_insert';
  IF v_postings_count <> 1 THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_insert_rls: hrp_f9_postings_staff_insert policy not found (count=%)', v_postings_count;
  END IF;
  IF v_postings_cmd <> 'INSERT' THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_insert_rls: hrp_f9_postings_staff_insert expected cmd=INSERT, got cmd=%', v_postings_cmd;
  END IF;
END
$$;

COMMIT;
