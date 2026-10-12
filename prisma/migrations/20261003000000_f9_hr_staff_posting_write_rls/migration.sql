-- 20261003000000_f9_hr_staff_posting_write_rls
--
-- F9 correction batch 1/1 §F follow-on: HR_STAFF JobPosting authoring now has
-- a narrowly-scoped DB-level write path. The application runtime uses the
-- WRITER connection only — no separate admin/bypass Prisma client is
-- introduced. The writer connection's `SELECT ... FOR UPDATE` of the slot
-- row (and subsequent UPDATE binding the slot to a JobOpening) must succeed
-- for HR_STAFF callers who hold an ACTIVE recruiter assignment on the
-- parent order.
--
-- Pre-existing RLS posture (UNCHANGED):
--   - `hrp_staffing_order_slot_scope` (FOR ALL, USING/WITH CHECK gated on
--     `hrp_project_visible_for` / `hrp_project_writable`). `hrp_project_writable`
--     excludes HR_STAFF, so this policy's `WITH CHECK` denies any HR_STAFF
--     UPDATE. The new policy below is an OR'd narrow HR_STAFF write path.
--   - `hrp_sora_order_slots_staff_select` (FOR SELECT, gated on
--     `hrp_staffing_order_visible_for`). The application runtime relies on
--     this for HR_STAFF read scoping; unchanged.
--   - `hrp_job_openings_update` (FOR UPDATE, gated on
--     `hrp_project_writable`). HR_STAFF was previously blocked at UPDATE
--     time. The precedent migration `20260930090000_p1a05_hr_staff_job_openings_update_rls`
--     added a narrow `hrp_a05_job_openings_staff_update` for the
--     `openJobOpening` activation path. F9 inherits that precedent.
--
-- New policies (this migration):
--   1. `hrp_f9_slots_staff_update` on `staffing_order_slots`:
--      PERMISSIVE FOR UPDATE, TO app_user_writer / app_user, USING + WITH
--      CHECK both gated on `hrp_session_role() = 'HR_STAFF' AND
--      hrp_staffing_order_visible_for(staffing_order_id)`. The
--      `hrp_staffing_order_visible_for` helper is the canonical P1-A0.4
--      ACTIVE-assignment predicate (`SECURITY DEFINER`, search_path pinned,
--      EXECUTE granted to app_user_writer/app_user only).
--   2. `hrp_f9_postings_staff_update` on `job_postings`:
--      PERMISSIVE FOR UPDATE, TO app_user_writer / app_user, USING + WITH
--      CHECK both gated on the same predicate JOINed through the parent
--      JobOpening's `staffing_order_id`. The application code is responsible
--      for the column shape (status / publishedAt / archivedAt / revision /
--      content fields); the policy only gates the row.
--
-- Concurrency: the application runtime acquires the canonical order-scoped
-- `pg_advisory_xact_lock(hashtext('p1a04:order:<id>'))` (re-exported from
-- `recruiter-assignment.service.ts::acquireOrderAdvisoryLock`) BEFORE the
-- `SELECT ... FOR UPDATE`. The lock is shared with all assignment
-- transitions (assign / revoke / claim) so a parallel revoke and a parallel
-- create cannot interleave.
--
-- Idempotent (DROP POLICY IF EXISTS). Applied to synthetic DB only
-- (`ep-empty-forest-azlhfyo9-*`). Production migration applies per Tier 3
-- audit approval — `prisma migrate deploy` against the synthetic host is
-- the only migration invocation authorized by T0 in this session.

BEGIN;

-- (1) Narrow HR_STAFF UPDATE policy on staffing_order_slots.
DROP POLICY IF EXISTS hrp_f9_slots_staff_update ON public.staffing_order_slots;
CREATE POLICY hrp_f9_slots_staff_update ON public.staffing_order_slots
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

-- (2) Narrow HR_STAFF UPDATE policy on job_postings (joined through
--     job_openings.staffing_order_id).
DROP POLICY IF EXISTS hrp_f9_postings_staff_update ON public.job_postings;
CREATE POLICY hrp_f9_postings_staff_update ON public.job_postings
  AS PERMISSIVE FOR UPDATE
  TO app_user_writer, app_user
  USING (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = public.job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  )
  WITH CHECK (
    hrp_session_role() = 'HR_STAFF'
    AND hrp_session_user_id() <> ''
    AND EXISTS (
      SELECT 1
        FROM public.job_openings jo
       WHERE jo.id = public.job_postings.job_opening_id
         AND public.hrp_staffing_order_visible_for(jo.staffing_order_id)
    )
  );

-- Static-test guard: the new policies exist and are PERMISSIVE FOR UPDATE.
DO $$
DECLARE
  v_slots_count int;
  v_postings_count int;
  v_slots_cmd text;
  v_postings_cmd text;
BEGIN
  SELECT count(*), max(cmd)
    INTO v_slots_count, v_slots_cmd
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'staffing_order_slots'
     AND policyname = 'hrp_f9_slots_staff_update';
  IF v_slots_count <> 1 THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_write_rls: hrp_f9_slots_staff_update policy not found (count=%)', v_slots_count;
  END IF;
  IF v_slots_cmd <> 'UPDATE' THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_write_rls: hrp_f9_slots_staff_update expected cmd=UPDATE, got cmd=%', v_slots_cmd;
  END IF;

  SELECT count(*), max(cmd)
    INTO v_postings_count, v_postings_cmd
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'job_postings'
     AND policyname = 'hrp_f9_postings_staff_update';
  IF v_postings_count <> 1 THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_write_rls: hrp_f9_postings_staff_update policy not found (count=%)', v_postings_count;
  END IF;
  IF v_postings_cmd <> 'UPDATE' THEN
    RAISE EXCEPTION 'f9_hr_staff_posting_write_rls: hrp_f9_postings_staff_update expected cmd=UPDATE, got cmd=%', v_postings_cmd;
  END IF;
END
$$;

COMMIT;
