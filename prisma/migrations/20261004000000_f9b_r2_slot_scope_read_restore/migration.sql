-- ============================================================================
-- Migration: f9b_r2_slot_scope_read_restore
-- Task:      hrp-f9b-r2-slot-scope-read-restore (TASK.md v1.0)
-- Baseline:  e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5 (F9-B round-1 final
--            semantic Implementation SHA, per Tier-3 AUDIT §1 / §4.7).
-- Origin:    T0 disposition 2026-10-03 23:30 ICT — CHANGES_REQUIRED_RUNTIME
--            on PR #88. F9-B round-1 corrective migration replaced the canonical
--            `hrp_staffing_order_slot_scope` FOR ALL policy with a narrower
--            `hrp_f9b_slots_manager_select` policy that admitted only ADMIN
--            and HR_MANAGER. CI on a fresh DB then surfaced 17 failures across
--            5 test files: the legitimate read blast radius for MKT (public
--            JobPosting card), CTV (public referral surface), PM / sub-PM
--            (Demand Tree), DIRECTOR, SALE, WORKER, VENDOR_ADMIN, VENDOR_STAFF
--            was lost because the replacement policy did not route through the
--            canonical `hrp_project_visible_for(so.project_id)` predicate.
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Restores the canonical SELECT blast radius on `staffing_order_slots` for
-- every legitimate read role, without undoing any of the F9-B round-1 least-
-- privilege WRITE hardening:
--
--   * The round-1 binding primitive `hrp_f9b_bind_slot_to_opening` is
--     BYTE-UNCHANGED. It remains the only path that mutates
--     `staffing_order_slots.job_opening_id` for HR_STAFF writers. B-01
--     (column-agnostic UPDATE) and B-02 (sequential race) are preserved.
--   * The round-1 narrow INSERT/UPDATE manager policies
--     (`hrp_f9b_slots_manager_insert`, `hrp_f9b_slots_manager_update`) are
--     BYTE-UNCHANGED. They remain the only path that mutates the rest of
--     `staffing_order_slots` for HR_MANAGER / ADMIN.
--   * No DELETE policy is introduced on `staffing_order_slots`.
--   * No broad `staffing_orders_*` write relaxation is introduced.
--   * The narrow HR_STAFF SELECT policy `hrp_sora_order_slots_staff_select`
--     (added in P1-A0.4, gated on `hrp_staffing_order_visible_for`) is
--     BYTE-UNCHANGED and remains in effect.
--   * The F9 narrow INSERT/UPDATE policies on `job_openings` and
--     `job_postings` are BYTE-UNCHANGED. The F9-B round-1 hardening of
--     `hrp_f9_openings_staff_insert` (the cross-order sub-select) is
--     BYTE-UNCHANGED.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- (1) DROPs the over-restrictive F9-B round-1 SELECT policy
--     `hrp_f9b_slots_manager_select` (which admitted only ADMIN /
--     HR_MANAGER and broke the read blast radius for MKT / CTV / PM /
--     DIRECTOR / SALE / WORKER / VENDOR_*). The round-1 INSERT and UPDATE
--     manager policies are NOT dropped; they remain the only mutation path
--     for HR_MANAGER / ADMIN.
-- (2) CREATEs a narrow FOR SELECT policy `hrp_f9b_slots_project_select`
--     that uses the canonical role-mapped predicate
--     `hrp_project_visible_for(so.project_id)`. This is the SAME predicate
--     the original `hrp_staffing_order_slot_scope` (FOR ALL) used, but
--     scoped to SELECT only. Every read role that previously had SELECT
--     access through the canonical project visibility rule regains it:
--     ADMIN, HR_MANAGER, DIRECTOR, SALE, PM (own project), WORKER (public
--     or active assignment), MKT (public), VENDOR_ADMIN / VENDOR_STAFF
--     (public or own submission), CTV (public). HR_STAFF rows that are
--     not anchored to a project visible to the role fall through to the
--     narrower `hrp_sora_order_slots_staff_select` policy (P1-A0.4) for
--     the assigned-order case, or to deny-by-default otherwise.
-- (3) Static guard inside the migration proves the corrective posture at
--     apply time. The guard asserts: (a) the over-restrictive
--     `hrp_f9b_slots_manager_select` policy is gone; (b) the new
--     `hrp_f9b_slots_project_select` policy exists with the canonical
--     `hrp_project_visible_for(so.project_id)` predicate; (c) the F9-B
--     round-1 SECURITY DEFINER primitive `hrp_f9b_bind_slot_to_opening`
--     is still present with `prosecdef=true` and `proconfig` containing
--     `search_path`; (d) the F9-B round-1 hardening clause on
--     `hrp_f9_openings_staff_insert` is still present; (e) no HR_STAFF
--     DELETE policy has been introduced; (f) the F9-B round-1 manager
--     INSERT / UPDATE policies are preserved.
--
-- SCOPE (minimal)
--   - Touched: ONE new migration + ONE DROP POLICY + ONE CREATE POLICY
--     + ONE static-guard block. No other policy, function, or table is
--     modified.
--   - NO DELETE policy introduced.
--   - NO broad `staffing_orders_*` write relaxation.
--   - NO change to `hrp_f9_postings_staff_update`, `hrp_f9_postings_
--     staff_insert`, `hrp_a05_job_openings_staff_update`, `hrp_f9b_slots_
--     manager_insert`, `hrp_f9b_slots_manager_update`, `hrp_sora_order_
--     slots_staff_select`. Those policies remain required for the
--     corrected read+write path.
--   - Public surface (job_postings SELECT path) is UNCHANGED. The
--     `publicSelect` projection continues to read through
--     `staffing_order_slots` via the new canonical predicate; for the
--     MKT public read principal, slots of `is_public = true` projects
--     are visible again.
--   - F9-B round-1 migration (20261003100000_*) is BYTE-UNCHANGED. The
--     DROP of `hrp_f9b_slots_manager_select` is in THIS new migration;
--     the F9-B round-1 policy body is preserved as predecessor evidence.
--   - F9 migrations (20261003000000_*, 20261003000001_*) are BYTE-
--     UNCHANGED.
--
-- IDEMPOTENT
--   - DROP POLICY IF EXISTS guards.
--   - CREATE POLICY (Postgres 14+ tolerates re-creation; the
--     `pg_policies` static guard inside the migration detects duplicate
--     creation and fails closed if a future migration re-introduces
--     `hrp_f9b_slots_manager_select`).
--   - GRANTs / REVOKEs are not needed: the new policy is attached to
--     `app_user_writer, app_user` exactly like the round-1 manager
--     policy it replaces.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier-0 brief. Migration file ships only. T0 runs production
--   preflight and applies via a separate gate. Synthetic Neon
--   `ep-empty-forest-azlhfyo9-*` is used for CI.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- 1. DROP the over-restrictive F9-B round-1 SELECT policy.
--    The application no longer needs a SELECT policy that admits only
--    ADMIN / HR_MANAGER; the canonical role-mapped visibility predicate
--    `hrp_project_visible_for(so.project_id)` already admits both, plus
--    the rest of the read roles. The narrower `hrp_sora_order_slots_
--    staff_select` policy (P1-A0.4) covers the HR_STAFF-on-assigned-
--    order case. The round-1 manager INSERT / UPDATE policies are NOT
--    dropped; they remain the only path that mutates `staffing_order_
--    slots` for HR_MANAGER / ADMIN.
-- ============================================================================
DROP POLICY IF EXISTS hrp_f9b_slots_manager_select ON public.staffing_order_slots;

-- ============================================================================
-- 2. NEW narrow FOR SELECT policy with the canonical role-mapped
--    visibility predicate. The predicate is the SAME one the original
--    `hrp_staffing_order_slot_scope` (FOR ALL) used in
--    `prisma/migrations/20260817080000_s1_rls_staffing_order_slots/
--     migration.sql` — but scoped to SELECT only. The SECURITY DEFINER
--    `hrp_project_visible_for(pid text)` helper already routes every
--    legitimate read role (ADMIN, HR_MANAGER, DIRECTOR, SALE, PM, MKT,
--    CTV, WORKER, VENDOR_ADMIN, VENDOR_STAFF) through the canonical
--    project-visibility rule (see `prisma/migrations/20260816211000_s1_
--    rls_project/migration.sql` lines 11-43). HR_STAFF rows that are not
--    anchored to a project visible to the role fall through to
--    `hrp_sora_order_slots_staff_select` (P1-A0.4) for the assigned-
--    order case, or to deny-by-default otherwise.
-- ============================================================================
CREATE POLICY hrp_f9b_slots_project_select ON public.staffing_order_slots
  AS PERMISSIVE FOR SELECT
  TO app_user_writer, app_user
  USING (
    EXISTS (
      SELECT 1
        FROM public.staffing_orders so
       WHERE so.id = public.staffing_order_slots.staffing_order_id
         AND public.hrp_project_visible_for(so.project_id)
    )
  );

-- ============================================================================
-- 3. Static-test guard: prove corrective posture at migration apply time.
-- ============================================================================
DO $$
DECLARE
  v_old_policy_count int;
  v_new_policy_count int;
  v_new_policy_using_text text;
  v_round1_fn_count int;
  v_round1_fn_prosecdef boolean;
  v_round1_fn_proconfig text;
  v_round1_hardening_present boolean;
  v_round1_manager_insert_count int;
  v_round1_manager_update_count int;
  v_hrstaff_delete_count int;
  v_broad_staffing_orders_write_count int;
BEGIN
  -- 3.1 The over-restrictive F9-B round-1 SELECT policy must be gone.
  SELECT count(*)
    INTO v_old_policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND policyname = 'hrp_f9b_slots_manager_select';
  IF v_old_policy_count <> 0 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_slots_manager_select policy still exists (count=%)', v_old_policy_count;
  END IF;

  -- 3.2 The new FOR SELECT policy must exist with the canonical
  --     `hrp_project_visible_for(so.project_id)` predicate.
  SELECT count(*), max(qual)
    INTO v_new_policy_count, v_new_policy_using_text
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND policyname = 'hrp_f9b_slots_project_select'
     AND cmd        = 'SELECT'; -- full word form per pg_policies view
  IF v_new_policy_count <> 1 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_slots_project_select policy missing or duplicated (count=%)', v_new_policy_count;
  END IF;
  IF v_new_policy_using_text IS NULL
     OR position('hrp_project_visible_for' in v_new_policy_using_text) = 0
     OR position('staffing_order_slots.staffing_order_id' in v_new_policy_using_text) = 0
     OR position('so.project_id' in v_new_policy_using_text) = 0 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_slots_project_select predicate does not use the canonical hrp_project_visible_for(so.project_id) shape (got qual=%)', coalesce(v_new_policy_using_text, 'NULL');
  END IF;

  -- 3.3 The F9-B round-1 SECURITY DEFINER primitive must still be
  --     present with the expected posture (B-02 / B-01 preserved).
  SELECT count(*), bool_and(prosecdef), max(proconfig::text)
    INTO v_round1_fn_count, v_round1_fn_prosecdef, v_round1_fn_proconfig
    FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname = 'hrp_f9b_bind_slot_to_opening';
  IF v_round1_fn_count <> 1 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_bind_slot_to_opening function count=%, expected 1', v_round1_fn_count;
  END IF;
  IF v_round1_fn_prosecdef IS NOT TRUE THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_bind_slot_to_opening prosecdef=false (must be true)';
  END IF;
  IF v_round1_fn_proconfig IS NULL OR position('search_path' in v_round1_fn_proconfig) = 0 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_bind_slot_to_opening proconfig missing search_path (got %)', coalesce(v_round1_fn_proconfig, 'NULL');
  END IF;

  -- 3.4 The F9-B round-1 hardening clause on
  --     `hrp_f9_openings_staff_insert` (cross-order sub-select) must
  --     still be present.
  SELECT EXISTS (
    SELECT 1
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.tablename  = 'job_openings'
       AND p.policyname = 'hrp_f9_openings_staff_insert'
       AND position('s.staffing_order_id = job_openings.staffing_order_id' in coalesce(p.with_check, '')) > 0
  ) INTO v_round1_hardening_present;
  IF NOT v_round1_hardening_present THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9_openings_staff_insert hardening clause missing (cross-order sub-select)';
  END IF;

  -- 3.5 The F9-B round-1 manager INSERT / UPDATE policies must be
  --     preserved.
  SELECT count(*)
    INTO v_round1_manager_insert_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND policyname = 'hrp_f9b_slots_manager_insert'
     AND cmd        = 'INSERT'; -- full word form per pg_policies view
  IF v_round1_manager_insert_count <> 1 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_slots_manager_insert policy missing (count=%)', v_round1_manager_insert_count;
  END IF;

  SELECT count(*)
    INTO v_round1_manager_update_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND policyname = 'hrp_f9b_slots_manager_update'
     AND cmd        = 'UPDATE'; -- full word form per pg_policies view
  IF v_round1_manager_update_count <> 1 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: hrp_f9b_slots_manager_update policy missing (count=%)', v_round1_manager_update_count;
  END IF;

  -- 3.6 No HR_STAFF DELETE policy on `staffing_order_slots` (the
  --     migration never introduces one; this is a regression guard
  --     against future migrations that try to).
  SELECT count(*)
    INTO v_hrstaff_delete_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_order_slots'
     AND cmd        = 'DELETE' -- full word form per pg_policies view
     AND policyname LIKE 'hrp_%_delete'
     AND (qual LIKE '%HR_STAFF%' OR with_check LIKE '%HR_STAFF%');
  IF v_hrstaff_delete_count <> 0 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: HR_STAFF DELETE policy introduced on staffing_order_slots (count=%)', v_hrstaff_delete_count;
  END IF;

  -- 3.7 No broad `staffing_orders_*` write relaxation. We assert that
  --     there is no policy on `staffing_orders` whose name matches
  --     `hrp_f9b_staffing_orders_*_all` (FOR ALL write relaxation that
  --     the F9-B round-1 corrective explicitly rejected).
  SELECT count(*)
    INTO v_broad_staffing_orders_write_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'staffing_orders'
     AND cmd        = 'ALL' -- full word form per pg_policies view
     AND policyname ~ '^hrp_f9b_staffing_orders_.*_all$';
  IF v_broad_staffing_orders_write_count <> 0 THEN
    RAISE EXCEPTION 'f9b_r2_slot_scope_read_restore: broad staffing_orders_* write relaxation introduced (count=%)', v_broad_staffing_orders_write_count;
  END IF;
END
$$;

COMMIT;
